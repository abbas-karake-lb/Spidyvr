import * as T from './vendor/three.module.min.js';
import {personModel,bodyPoints} from './city-models.js?visual=3';
import {NPCPhysics} from './npc-physics.js?combat=2';
import {TOWER,towerPoint} from './quarantine-building.js?perf=2';
import {ZombieHitEffects} from './zombie-hit-effects.js';
const V=(...v)=>new T.Vector3(...v),UP=V(0,1,0),parents=[1,0,1,1,3,4,1,6,7,0,9,10,0,12,13];
export class QuarantineChallenge {
  constructor(scene,building,{respawn=()=>{},hit=()=>{},reward=()=>{},voice=()=>{}}={}){
    this.effects=new ZombieHitEffects(scene);this.building=building;this.respawn=respawn;this.onHit=hit;this.onReward=reward;this.voice=voice;this.voiceAt=0;this.time=0;this.health=100;this.damageFlash=0;this.invulnerableUntil=0;this.deaths=0;this.round=0;this.remaining=40;this.clearedAt=null;this.rewarded=false;this.active=false;this.seed=9381;
    this.people=[];this.npcs=new NPCPhysics(this.people,building.solids);this.npcs.maxActive=4;const ragdollBoxes=[];this.npcs.queryBoxes=p=>building.queryBoxes(p,3,2.5,3,ragdollBoxes);this.graphs=[];this.flow=null;this.flowKey='';this.navAt=0;
    // A compact 0.5 m navigation grid per floor includes actual wall/door/furniture clearance.
    this.cell=.5;this.cols=29;this.rows=54;
    for(let f=0;f<10;f++){
      const y=.2+f*4,blocked=new Uint8Array(this.cols*this.rows),boxes=building.floorBoxes[f];
      for(let z=0;z<this.rows;z++)for(let x=0;x<this.cols;x++){
        const p=towerPoint(-9.5+x*.5,y,-13.25+z*.5);
        blocked[z*this.cols+x]=Number(boxes.some(b=>b.max.y>y+.25&&b.min.y<y+1.85&&p.x>b.min.x-.29&&p.x<b.max.x+.29&&p.z>b.min.z-.29&&p.z<b.max.z+.29));
      }
      this.graphs.push(blocked);
    }
    const geometry=personModel(),count=40,data=new Float32Array(count*32*4),poseTexture=new T.DataTexture(data,32,count,T.RGBAFormat,T.FloatType);poseTexture.minFilter=poseTexture.magFilter=T.NearestFilter;poseTexture.generateMipmaps=false;
    this.poseData=data;this.poseTexture=poseTexture;
    const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0});
    const restFunction='vec3 restPoint(float n){'+bodyPoints.map((v,i)=>`if(n<${i}.5)return vec3(${v.map(x=>Number(x).toFixed(3)).join(',')});`).join('')+'return vec3(0.0); }';
    material.onBeforeCompile=s=>{
      s.uniforms.zombiePose={value:poseTexture};s.vertexShader=`attribute float zombieId;attribute float limb;attribute float detail;uniform sampler2D zombiePose;varying vec3 decayPoint;\n${restFunction}\nvec4 boneData(float x){return texture2D(zombiePose,vec2((x+.5)/32.,(zombieId+.5)/40.));}\nvec3 rotateBone(vec4 q,vec3 v){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}\n`+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed=rotateBone(boneData(limb*2.+1.),position-restPoint(limb))+boneData(limb*2.).xyz;decayPoint=position;\nif(detail>.5)transformed=boneData(limb*2.).xyz;');
      s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=rotateBone(boneData(limb*2.+1.),objectNormal);');
      s.vertexShader=s.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nif(color.r>.9)vColor.rgb=mix(vec3(.16,.21,.19),vec3(.36,.29,.21),mod(zombieId,4.)/3.);else if(color.r>.45&&color.g>.2&&color.b<.3)vColor.rgb=mix(vec3(.34,.39,.26),vec3(.51,.48,.37),mod(zombieId,3.)/2.);');
      s.fragmentShader='varying vec3 decayPoint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat stain=sin(decayPoint.x*83.+sin(decayPoint.y*25.))*sin(decayPoint.y*67.+decayPoint.z*39.);diffuseColor.rgb*=.76+.24*smoothstep(-.4,.6,stain);');
    };material.customProgramCacheKey=()=> 'quarantine-zombie-v1';
    geometry.setAttribute('zombieId',new T.InstancedBufferAttribute(new Float32Array(40),1));
    this.mesh=new T.InstancedMesh(geometry,material,40);this.mesh.name='quarantine-articulated-zombies';this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.receiveShadow=true;scene.add(this.mesh);
    // Analytic joint poses drive both the visible anatomy and the physical corpses.
    this.pose=bodyPoints.map(()=>V());this.qYaw=new T.Quaternion();this.q=new T.Quaternion();this.a=V();this.b=V();this.dummy=new T.Object3D();this.ray=new T.Ray();this.sphere=new T.Sphere();this.hitPoint=V();
    this.resetRound();
  }
  rand(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  resetRound(){
    this.npcs.releaseAll();this.npcs.active.length=0;this.people.length=0;this.round++;this.remaining=40;this.clearedAt=null;this.rewarded=false;this.active=false;this.flowKey='';
    for(let f=0;f<10;f++){
      this.makeFlow(f,towerPoint(-1,.2+f*4,0));const free=[];for(let i=0;i<this.graphs[f].length;i++){const p=this.point(i,f);if(this.flow[i]>=0&&!this.graphs[f][i]&&Math.abs(p.z-TOWER.z)>3.5)free.push(i);}
      for(let j=0;j<4;j++){const index=free.splice(Math.floor(this.rand()*free.length),1)[0];const p=this.point(index,f);this.people.push({id:this.people.length,floor:f,p,home:p.clone(),yaw:this.rand()*6.28,scale:.94+this.rand()*.1,health:100,dead:false,speed:.72+this.rand()*.5,stagger:0,attack:0,nextAttack:0,patrol:index});}
    }
    this.flow=null;this.flowKey='';
  }
  cellAt(p){const x=Math.max(0,Math.min(this.cols-1,Math.round((p.x-TOWER.x+9.5)/this.cell))),z=Math.max(0,Math.min(this.rows-1,Math.round((p.z-TOWER.z+13.25)/this.cell)));return z*this.cols+x;}
  point(i,f){return towerPoint(-9.5+i%this.cols*this.cell,.2+f*4,-13.25+Math.floor(i/this.cols)*this.cell);}
  neighbours(i){const a=[];if(i%this.cols)a.push(i-1);if(i%this.cols<this.cols-1)a.push(i+1);if(i>=this.cols)a.push(i-this.cols);if(i<this.cols*(this.rows-1))a.push(i+this.cols);return a;}
  makeFlow(f,target){
    const blocked=this.graphs[f];let start=this.cellAt(target);
    if(blocked[start]){let best=Infinity;for(let i=0;i<blocked.length;i++)if(!blocked[i]){const d=this.point(i,f).distanceToSquared(target);if(d<best){best=d;start=i;}}}
    const distances=new Int16Array(blocked.length).fill(-1),queue=[start];distances[start]=0;
    for(let head=0;head<queue.length;head++){const i=queue[head];for(const n of this.neighbours(i))if(!blocked[n]&&distances[n]<0){distances[n]=distances[i]+1;queue.push(n);}}
    this.flow=distances;this.flowKey=f+':'+start;this.navAt=this.time+.25;
  }
  lineClear(from,to){const delta=to.clone().sub(from),length=delta.length();if(length<.001)return true;this.ray.set(from,delta.divideScalar(length));for(const b of this.building.floorBoxes[this.building.level(from)]||[])if(this.ray.intersectBox(b,this.hitPoint)&&this.hitPoint.distanceTo(from)<length-.06)return false;return true;}
  raycast(origin,direction,max){
    this.ray.set(origin,direction);let result=null,nearest=max;
    for(const p of this.people)if(!p.dead&&p.p.distanceToSquared(origin)<(max+2)**2)for(const node of [0,1,2]){
      this.sphere.center.copy(this.npcs.position(p,node));this.sphere.radius=(node===2?.19:.28)*p.scale;
      if(this.ray.intersectSphere(this.sphere,this.hitPoint)){const d=this.hitPoint.distanceTo(origin);if(d<nearest&&d>.01){nearest=d;result={person:p,node,distance:d,point:this.hitPoint.clone()};}}
    }return result;
  }
  hit(target,direction,damage=40){
    const p=target.person;if(p.dead)return false;this.effects.hit(target.point||this.npcs.position(p,target.node),direction,.2+p.floor*4);p.health-=damage*(target.node===2?2.5:1);p.stagger=.32;p.nextAttack=Math.max(p.nextAttack,this.time+.45);p.attack=0;
    if(p.health<=0){if(!this.npcs.kill(p,target.node,direction.clone().multiplyScalar(5.5)))return false;this.remaining--;if(this.remaining===0)this.clearedAt=this.time;}
    return true;
  }
  damage(amount){
    if(this.time<this.invulnerableUntil)return;this.health=Math.max(0,this.health-amount);this.damageFlash=1;this.invulnerableUntil=this.time+.7;this.onHit(this.health);
    if(this.health===0){this.deaths++;this.health=100;this.invulnerableUntil=this.time+4;this.building.resetLift();this.respawn(this.building.spawn.clone());}
  }
  upload(p){
    const {pose,qYaw,q,a,b}=this;qYaw.setFromAxisAngle(UP,p.yaw);const phase=this.time*p.speed*5.5+p.id;
    for(let j=0;j<15;j++){
      if(p.ragdoll||p.corpsePose)pose[j].copy(p.ragdoll?p.ragdoll.nodes[j].p:p.corpsePose[j]).sub(p.p).divideScalar(p.scale);
      else {
        pose[j].fromArray(bodyPoints[j]);pose[j].z-=j<3?.08*j:0;
        if([4,5,7,8].includes(j)){pose[j].z-=j===5||j===8?.45:.22;pose[j].y+=j===5||j===8?.4:.1;pose[j].z+=Math.sin(phase+(j<6?0:1))*.07;if(p.attack>0){pose[j].z-=Math.sin(p.attack/.65*Math.PI)*.3;pose[j].y+=.1;}}
        if([10,11,13,14].includes(j)){pose[j].z+=Math.sin(phase+(j<12?0:Math.PI))*.15;pose[j].y+=Math.max(0,Math.sin(phase+(j<12?0:Math.PI)))*.055;}
        pose[j].x+=Math.sin(phase*.5)*.018;pose[j].z+=p.stagger*(j<3?.3:0);pose[j].applyQuaternion(qYaw);
      }
    }
    for(let j=0;j<15;j++){a.fromArray(bodyPoints[j]).sub(b.fromArray(bodyPoints[parents[j]])).normalize().applyQuaternion(qYaw);b.copy(pose[j]).sub(pose[parents[j]]).normalize();q.setFromUnitVectors(a,b).multiply(qYaw);const offset=(p.id*32+j*2)*4;this.poseData.set([pose[j].x,pose[j].y,pose[j].z,1,q.x,q.y,q.z,q.w],offset);}
  }
  update(dt,viewer,paused=false){
    this.effects.update(paused?0:Math.min(.05,Math.max(0,dt)));this.mesh.count=0;const floor=this.building.level(viewer),inside=this.building.inside(viewer),near=this.building.near(viewer);
    if(!paused){
      this.time+=Math.max(0,Math.min(.05,dt));this.damageFlash=Math.max(0,this.damageFlash-dt*2.2);if(inside)this.active=true;
      if(this.clearedAt!==null&&!inside&&this.time-this.clearedAt>=TOWER.resetSeconds)this.resetRound();
      if(this.remaining===0&&viewer.y>=40&&viewer.y<43&&viewer.distanceTo(this.building.reward)<6&&!this.rewarded){this.rewarded=true;this.onReward(this.building.reward.clone());}
      if(this.active&&inside&&floor<10&&(this.time>=this.navAt||!this.flowKey.startsWith(floor+':')))this.makeFlow(floor,viewer);
      for(const p of this.people){
        if(p.dead||p.floor!==floor||!near)continue;p.stagger=Math.max(0,p.stagger-dt);
        const distance=p.p.distanceTo(viewer),engaged=this.active&&inside&&distance<20;
        if(p.attack>0){p.attack-=dt;if(p.attack<=0&&distance<1.45&&Math.abs(viewer.y-p.p.y)<1&&this.lineClear(p.p.clone().add(V(0,1.25,0)),viewer.clone().add(V(0,1.2,0))))this.damage(25);continue;}
        if(engaged&&distance<1.35&&this.time>p.nextAttack&&this.lineClear(p.p.clone().add(V(0,1.2,0)),viewer.clone().add(V(0,1.2,0)))){p.attack=.65;p.nextAttack=this.time+1.8;continue;}
        if(p.stagger>0||engaged&&distance<.95)continue;
        let target=null;
        if(engaged&&this.flow){const cell=this.cellAt(p.p);let next=cell;for(const n of this.neighbours(cell))if(this.flow[n]>=0&&(this.flow[next]<0||this.flow[n]<this.flow[next]))next=n;target=this.point(next,p.floor);if(next===cell&&this.lineClear(p.p.clone().add(V(0,1,0)),viewer.clone().add(V(0,1,0))))target=viewer;}
        else{if(p.p.distanceTo(this.point(p.patrol,p.floor))<.15){const choices=this.neighbours(p.patrol).filter(i=>!this.graphs[p.floor][i]);if(choices.length)p.patrol=choices[Math.floor(this.rand()*choices.length)];}target=this.point(p.patrol,p.floor);}
        if(target){const dx=target.x-p.p.x,dz=target.z-p.p.z,d=Math.hypot(dx,dz),step=Math.min(d,p.speed*dt*(engaged?1:.35));if(d>.02){let next=p.p.clone().add(V(dx/d*step,0,dz/d*step));const blocked=c=>this.graphs[p.floor][this.cellAt(c)]||this.people.some(o=>o!==p&&!o.dead&&o.floor===p.floor&&o.p.distanceToSquared(c)<.36**2);if(blocked(next)){for(const side of [1,-1]){const bypass=p.p.clone().add(V(-dz/d*step*side,0,dx/d*step*side));if(!blocked(bypass)){next=bypass;break;}}}if(!blocked(next)){p.p.copy(next);p.yaw=Math.atan2(-dx,-dz);}}}
      }
      if(inside&&this.time>=this.voiceAt){const close=this.people.find(p=>!p.dead&&p.floor===floor&&p.p.distanceToSquared(viewer)<100);if(close)this.voice(close.p);this.voiceAt=this.time+3.5+this.rand()*2;}
      if(near)this.npcs.step(dt,viewer);
    }
    for(const p of this.people){if(!near||Math.abs(p.floor-floor)>1||p.p.distanceToSquared(viewer)>32**2)continue;this.upload(p);this.dummy.position.copy(p.p);this.dummy.quaternion.identity();this.dummy.scale.setScalar(p.scale);this.dummy.updateMatrix();const i=this.mesh.count++;this.mesh.setMatrixAt(i,this.dummy.matrix);this.mesh.geometry.attributes.zombieId.setX(i,p.id);}
    if(this.mesh.count){this.mesh.instanceMatrix.needsUpdate=true;this.mesh.geometry.attributes.zombieId.needsUpdate=true;this.poseTexture.needsUpdate=true;}
    const text=this.remaining?`${this.remaining} INFECTED · REWARD ON ROOF`:this.rewarded?`CLEARED · RESET ${Math.max(0,Math.ceil((600-this.time+this.clearedAt)/60))} MIN`:'ALL CLEAR · CLAIM ROOFTOP WEAPON';this.building.setStatus(text);
  }
}
