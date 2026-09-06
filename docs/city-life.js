import * as T from './vendor/three.module.min.js';
import {mergeParts,vehicleModel,personModel,dogModel,bodyPoints} from './city-models.js';
import {NPCPhysics} from './npc-physics.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),UP=V(0,1,0);
export function createCityLife(scene,boxes,parked=[]){
  let seed=8804;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const dummy=new T.Object3D(),color=new T.Color(),timeUniform={value:0};
  const material=new T.MeshPhongMaterial({vertexColors:true,shininess:38,specular:0x45565b});
  function pool(name,geometry,mat,count){const mesh=new T.InstancedMesh(geometry,mat,count);mesh.name=name;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);return mesh;}
  const carsNear=Array.from({length:5},(_,type)=>pool('traffic-near-'+type,vehicleModel(type),material,92));
  const carsFar=Array.from({length:5},(_,type)=>pool('traffic-far-'+type,vehicleModel(type,true),material,92));
  const parkedNear=carsNear.map((m,i)=>pool('parked-near-'+i,m.geometry,material,85)),parkedFar=carsFar.map((m,i)=>pool('parked-far-'+i,m.geometry,material,85));
  const traffic=[],people=[],birds=[];
  for(let i=0;i<92;i++)traffic.push({id:i,horizontal:i%2===0,lane:-5+i%11,sign:i%4<2?1:-1,progress:rand()*460-230,speed:0,cruise:7+rand()*5,type:i%17===0?3:i%9===0?2:i%7===0?4:i%4===0?1:0,p:V(),angle:0,color:[0xb9c6c5,0xe5dbcb,0x456a7d,0xc14935,0xd2a443,0x5b6668,0xeeeeea,0x35494c][i%8]});
  const shirts=[0xc1c8be,0xa95540,0x52768b,0x566449,0x8a7588,0xc6a066,0x303c50,0xe3d7c2],skins=[0xf0c7a8,0xd2a07b,0xa97151,0x714a35,0xc49370];
  for(let i=0;i<288;i++){
    const ix=(i*7)%11-5,iz=(i*3+Math.floor(i/11))%11-5;
    people.push({id:i,x:ix*44,z:iz*44,phase:rand()*132,speed:.65+rand()*.85,p:V(),yaw:0,scale:.9+rand()*.2,width:.88+rand()*.25,color:shirts[i%shirts.length],skin:skins[i%skins.length],style:i%6,ragdoll:null,reactUntil:0,recover:0,wait:0});
  }
  const npcs=new NPCPhysics(people,boxes);
  // One float texture holds poses for the nearby skinned crowd and active ragdolls.
  const poseData=new Float32Array(32*people.length*4),poseTexture=new T.DataTexture(poseData,32,people.length,T.RGBAFormat,T.FloatType);poseTexture.minFilter=poseTexture.magFilter=T.NearestFilter;poseTexture.generateMipmaps=false;
  const humanMaterial=new T.MeshLambertMaterial({vertexColors:true});
  const restFunction='vec3 restPoint(float n){'+bodyPoints.map((v,i)=>`if(n<${i}.5)return vec3(${v.map(x=>Number(x).toFixed(3)).join(',')});`).join('')+'return vec3(0.0); }';
  humanMaterial.onBeforeCompile=shader=>{
    shader.uniforms.npcPose={value:poseTexture};shader.uniforms.npcRows={value:people.length};
    shader.vertexShader=`attribute float detail; attribute float npcIndex; attribute vec3 npcShirt; attribute vec3 npcSkin; attribute float limb; uniform sampler2D npcPose;uniform float npcRows;\n${restFunction}\nvec4 boneData(float x){return texture2D(npcPose,vec2((x+.5)/32.0,(npcIndex+.5)/npcRows));}\nvec3 rotateBone(vec4 q,vec3 v){return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}\n`+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=rotateBone(boneData(limb*2.0+1.0),position-restPoint(limb))+boneData(limb*2.0).xyz;\n      if((detail>.5&&detail<1.5&&mod(npcIndex,6.)>1.)||(detail>1.5&&detail<2.5&&mod(npcIndex,4.)>1.)||(detail>2.5&&mod(npcIndex,6.)<4.))transformed=boneData(limb*2.0).xyz;');
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=rotateBone(boneData(limb*2.0+1.0),objectNormal);');
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nif(color.r>.9)vColor.rgb=npcShirt;else if(color.r>.45&&color.g>.2&&color.b<.3)vColor.rgb=npcSkin;');
  };humanMaterial.customProgramCacheKey=()=> 'npc-articulated-v1';
  const nearGeo=personModel(),peopleNear=pool('people-near',nearGeo,humanMaterial,48),peopleFar=pool('people-far',personModel(true),new T.MeshLambertMaterial({vertexColors:true}),288);
  for(const [name,size] of [['npcIndex',1],['npcShirt',3],['npcSkin',3]])nearGeo.setAttribute(name,new T.InstancedBufferAttribute(new Float32Array(48*size),size).setUsage(T.DynamicDrawUsage));
  const dogMat=new T.MeshLambertMaterial({vertexColors:true});dogMat.onBeforeCompile=shader=>{shader.uniforms.lifeTime=timeUniform;shader.vertexShader='uniform float lifeTime;attribute float limb;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nif(limb>.5)transformed.z+=sin(lifeTime*8.0+limb*3.14+instanceMatrix[3].x)*.12;');};dogMat.customProgramCacheKey=()=> 'dog-gait-v1';
  const dogs=pool('dogs',dogModel(),dogMat,24);
  const birdGeo=mergeParts([{size:[.12,.12,.45],color:0x45535a},{size:[.55,.04,.23],at:[-.32,0,0],color:0x8d9695,limb:1},{size:[.55,.04,.23],at:[.32,0,0],color:0x8d9695,limb:2}]);
  const birdMat=new T.MeshLambertMaterial({vertexColors:true});birdMat.onBeforeCompile=shader=>{shader.uniforms.lifeTime=timeUniform;shader.vertexShader='uniform float lifeTime;attribute float limb;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nif(limb>.5)transformed.y+=sin(lifeTime*9.0+instanceMatrix[3].z)*abs(position.x)*.65;');};birdMat.customProgramCacheKey=()=> 'bird-wings-v2';
  const birdsMesh=pool('birds',birdGeo,birdMat,26);for(let i=0;i<26;i++)birds.push({lane:(i%7-3)*44+22,phase:rand()*500,y:35+rand()*100,speed:8+rand()*6});
  const planeGeo=mergeParts([{size:[.65,.65,8],color:0xe5e7dc},{size:[10,.15,1.7],at:[0,0,.2],color:0xe5e7dc},{size:[4,.1,1],at:[0,.25,3],color:0x899fac},{size:[.1,1.5,1.4],at:[0,.7,3],color:0x789aad}]);
  const aircraft=new T.Mesh(planeGeo,material);aircraft.name='distant-aircraft';scene.add(aircraft);
  const pose=bodyPoints.map(()=>V()),qYaw=new T.Quaternion(),q=new T.Quaternion(),a=V(),b=V();
  const parent=[1,0,1,1,3,4,1,6,7,0,9,10,0,12,13];
  function uploadPose(person,t,viewer){
    const scale=person.scale,yaw=person.yaw;qYaw.setFromAxisAngle(UP,yaw);
    for(let j=0;j<15;j++){
      if(person.ragdoll)pose[j].copy(person.ragdoll.nodes[j].p).sub(person.p).divideScalar(scale);
      else{
        pose[j].fromArray(bodyPoints[j]);const phase=t*person.speed*6+person.id,gait=person.wait?0:1;
        if([4,5,7,8].includes(j))pose[j].z+=Math.sin(phase+(j<6?0:Math.PI))*gait*(j===5||j===8?.19:.1);
        if([10,11,13,14].includes(j)){const swing=Math.sin(phase+(j<12?Math.PI:0))*gait;pose[j].z+=swing*(j===11||j===14?.27:.13);if(j===11||j===14)pose[j].y+=Math.max(0,swing)*.075;}
        pose[j].y+=Math.sin(phase*2)*.016*gait;pose[j].x*=person.width;pose[j].applyQuaternion(qYaw);if(person.recover>0&&person.recoverPose)pose[j].lerp(person.recoverPose[j],person.recover);
      }
    }
    for(let j=0;j<15;j++){
      a.fromArray(bodyPoints[j]).sub(b.fromArray(bodyPoints[parent[j]])).normalize().applyQuaternion(qYaw);
      b.copy(pose[j]).sub(pose[parent[j]]).normalize();q.setFromUnitVectors(a,b).multiply(qYaw);
      if(j===2&&!person.ragdoll&&person.p.distanceToSquared(viewer)<9**2){const look=Math.atan2(person.p.x-viewer.x,person.p.z-viewer.z);const diff=(look-yaw+Math.PI*3)%(Math.PI*2)-Math.PI;q.setFromAxisAngle(UP,yaw+Math.max(-.8,Math.min(.8,diff)));}
      const offset=(person.id*32+j*2)*4;poseData.set([pose[j].x,pose[j].y,pose[j].z,1,q.x,q.y,q.z,q.w],offset);
    }
  }
  function write(mesh,position,angle,tint,scale=1){dummy.position.copy(position);dummy.rotation.set(0,angle,0);dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(mesh.count,dummy.matrix);mesh.setColorAt(mesh.count,color.set(tint));mesh.count++;}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(32,32,3,32,32,30);gradient.addColorStop(0,'rgba(12,24,30,.42)');gradient.addColorStop(1,'rgba(12,24,30,0)');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);
  const shadows=pool('actor-contact-shadows',new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),420);
  function shadow(point,w,d,y){dummy.position.set(point.x,y,point.z);dummy.rotation.set(0,0,0);dummy.scale.set(w,1,d);dummy.updateMatrix();shadows.setMatrixAt(shadows.count++,dummy.matrix);}
  const position=V(),stats={cars:0,pedestrians:0,birds:0,aircraft:0,dogs:0,ragdolls:0};let frozen=0,lastClock=null;
  function update(clock,viewer,paused=false){
    if(lastClock===null)lastClock=clock;const dt=paused?0:Math.max(0,Math.min(.05,clock-lastClock));lastClock=clock;frozen+=dt;const t=frozen;timeUniform.value=t;
    const meshes=[shadows,...carsNear,...carsFar,...parkedNear,...parkedFar,peopleNear,peopleFar,dogs,birdsMesh];for(const mesh of meshes)mesh.count=0;
    const signal=t%18,crossingPeople=people.filter(p=>p.crossing);
    // Stateful acceleration, queues, signals and proximity braking, rather than time-only paths.
    for(const car of traffic){
      if(car.turn){
        const turn=car.turn;car.speed=Math.min(car.cruise,car.speed+2*dt);const blocked=viewer.y<3&&viewer.distanceToSquared(car.p)<5**2||crossingPeople.some(p=>p.p.distanceToSquared(car.p)<3**2);turn.t=Math.min(1,turn.t+(blocked?0:dt)*Math.max(2,car.speed)/turn.length);
        const f=turn.t;car.p.copy(turn.start).multiplyScalar((1-f)*(1-f)).addScaledVector(turn.control,2*(1-f)*f).addScaledVector(turn.end,f*f);
        a.copy(turn.control).sub(turn.start).multiplyScalar(1-f).addScaledVector(b.copy(turn.end).sub(turn.control),f);car.angle=Math.atan2(-a.x,-a.z);
        if(f===1){Object.assign(car,turn.next);car.turn=null;}
        const distance=car.p.distanceToSquared(viewer);if(distance<360**2)write(distance<85**2?carsNear[car.type]:carsFar[car.type],car.p,car.angle,car.type===4?0xe4b64d:car.color);
        continue;
      }
      let gap=Infinity;for(const lead of traffic)if(lead!==car&&!lead.turn&&lead.horizontal===car.horizontal&&lead.lane===car.lane&&lead.sign===car.sign){const d=lead.progress-car.progress;if(d>0)gap=Math.min(gap,d-(lead.type===3?6:4.7));}
      const toCross=(22-((car.progress%44+44)%44)+44)%44,red=car.horizontal?!(signal>=9&&signal<17):!(signal<8),stop=toCross-(car.type===3?10:8);
      if(red&&stop>=0)gap=Math.min(gap,stop);
      if(car.p.distanceToSquared(viewer)<7**2&&viewer.y<3)gap=0;
      for(const r of npcs.active)if(r.person.p.y<2&&r.person.p.distanceToSquared(car.p)<3**2)gap=0;
      for(const p of crossingPeople)if(p.p.distanceToSquared(car.p)<4**2)gap=0;
      const target=Math.min(car.cruise,Math.sqrt(Math.max(0,gap)*7));car.speed+=Math.max(-6*dt,Math.min(2.6*dt,target-car.speed));
      car.progress+=Math.min(Math.max(0,gap),car.speed*dt);
      const lane=car.lane*44+22+car.sign*2.1,along=car.progress*car.sign;car.p.set(car.horizontal?along:lane,0,car.horizontal?lane:along);car.angle=car.horizontal?-car.sign*Math.PI/2:car.sign>0?Math.PI:0;
      const remaining=(22-((car.progress%44+44)%44)+44)%44,cross=car.sign*(car.progress+remaining);
      if(remaining<6.5&&(Math.abs(cross)>=241||((Math.round(cross/44)+car.id)%5===0))){
        const horizontal=!car.horizontal,newLane=Math.round((cross-22)/44),oldCenter=car.lane*44+22;
        let sign=car.horizontal?car.sign:-car.sign;if(oldCenter>=241)sign=-1;if(oldCenter<=-241)sign=1;
        const side=newLane*44+22+sign*2.1,endAlong=oldCenter+sign*7;
        const end=V(horizontal?endAlong:side,0,horizontal?side:endAlong),control=car.horizontal?V(end.x,0,car.p.z):V(car.p.x,0,end.z);
        if(!traffic.some(other=>other!==car&&other.p.distanceToSquared(end)<5**2))car.turn={start:car.p.clone(),control,end,t:0,length:Math.max(5,car.p.distanceTo(control)+control.distanceTo(end)),next:{horizontal,sign,lane:newLane,progress:endAlong*sign}};
        else if(Math.abs(cross)>=241)car.speed=0;
      }
      const distance=car.p.distanceToSquared(viewer);if(distance<360**2)write(distance<85**2?carsNear[car.type]:carsFar[car.type],car.p,car.angle,car.type===4?0xe4b64d:car.color);
    }
    for(const car of parked){const distance=car.p.distanceToSquared(viewer);if(distance<320**2)write(distance<65**2?parkedNear[car.type]:parkedFar[car.type],car.p,car.angle,car.color);}
    const near=[];
    for(const p of people){
      if(!p.ragdoll){
        if(p.crossing){
          p.crossing.progress=Math.min(1,p.crossing.progress+dt/7);p.p.copy(p.crossing.from).lerp(p.crossing.to,p.crossing.progress);p.yaw=Math.PI;
          if(p.crossing.progress===1){p.z+=44;p.phase=30.5;p.crossing=null;p.wait=0;}
        }else{
        const close=p.p.distanceToSquared(viewer)<3.3**2;if(close)p.reactUntil=npcs.time+1.5;
        const reacting=p.reactUntil>npcs.time,walkSpeed=p.speed*(reacting?1.6:1);p.phase=(p.phase+dt*walkSpeed)%132;p.wait=0;
        if(p.id%11===0&&p.z<220&&p.phase>=64.7&&p.phase<66&&!reacting){
          p.phase=65;p.wait=1;
          if(signal<.8){p.crossing={from:p.p.clone(),to:V(p.x+14,.18,p.z+27.5),progress:0};p.wait=0;}
        }
        const side=Math.floor(p.phase/33),along=p.phase%33-16.5;position.set(p.x+(side===0?along:side===1?16.5:side===2?-along:-16.5),.18,p.z+(side===0?-16.5:side===1?along:side===2?16.5:-along));
        if(p.recover>0){p.recover=Math.max(0,p.recover-dt);p.p.copy(p.recoverFrom).lerp(position,1-p.recover);}else p.p.copy(position);
        const desired=[-Math.PI/2,Math.PI,Math.PI/2,0][side];let angle=(desired-p.yaw+Math.PI*3)%(Math.PI*2)-Math.PI;p.yaw+=angle*Math.min(1,dt*7);
        }
      }
      const distance=p.p.distanceToSquared(viewer);
      if(npcs.isHeld(p)||distance<55**2||p.ragdoll&&distance<230**2)near.push({p,distance});
      else if(distance<225**2)write(peopleFar,p.p,p.yaw,p.color,p.scale);
    }
    near.sort((a,b)=>Number(!!b.p.ragdoll)-Number(!!a.p.ragdoll)||a.distance-b.distance);
    for(let i=0;i<near.length;i++){const p=near[i].p;if(peopleNear.count>=48){if(!p.ragdoll)write(peopleFar,p.p,p.yaw,p.color,p.scale);continue;}
      const index=peopleNear.count;uploadPose(p,t,viewer);nearGeo.attributes.npcIndex.setX(index,p.id);color.set(p.color);nearGeo.attributes.npcShirt.setXYZ(index,color.r,color.g,color.b);color.set(p.skin);nearGeo.attributes.npcSkin.setXYZ(index,color.r,color.g,color.b);write(peopleNear,p.p,0,0xffffff,p.scale);
    }
    for(let i=0;i<24;i++){const owner=people[(i*13+26)%people.length];if(owner.ragdoll)continue;position.copy(owner.p).add(V(.55,0,.1).applyAxisAngle(UP,owner.yaw));if(position.distanceToSquared(viewer)<130**2)write(dogs,position,owner.yaw,[0x9d7d53,0xd2cab7,0x57514a,0xb89d7a][i%4],.8+(i%4)*.1);}
    for(const bird of birds){position.set(bird.lane+Math.sin(t*.25+bird.phase)*3,bird.y+Math.sin(t*.18+bird.phase)*4,((bird.phase+t*bird.speed)%500)-250);if(position.distanceToSquared(viewer)<320**2)write(birdsMesh,position,Math.PI,0xffffff);}
    const aircraftPhase=t%105;aircraft.visible=aircraftPhase<36;aircraft.position.set(-480+aircraftPhase*27,210,-210);aircraft.rotation.y=-Math.PI/2;
    for(const car of [...traffic,...parked])if(car.p.distanceToSquared(viewer)<95**2)shadow(car.p,3.5,5.5,.007);
    for(const person of people)if(person.p.y<2&&person.p.distanceToSquared(viewer)<65**2)shadow(person.p,1.1,1.1,.183);
    for(const mesh of meshes){mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    for(const key of ['npcIndex','npcShirt','npcSkin'])nearGeo.attributes[key].needsUpdate=true;poseTexture.needsUpdate=true;
    stats.cars=carsNear.reduce((n,m)=>n+m.count,0)+carsFar.reduce((n,m)=>n+m.count,0);stats.pedestrians=peopleNear.count+peopleFar.count;stats.birds=birdsMesh.count;stats.aircraft=Number(aircraft.visible);stats.dogs=dogs.count;stats.ragdolls=npcs.active.length;
  }
  update(0,V(0,32,0));
  return {update,stats,npcs,pools:{carsNear:carsNear[0],carsFar:carsFar[0],vehicleNear:carsNear,vehicleFar:carsFar,peopleNear,peopleFar,birdsMesh,dogs},traffic,people,signal:()=>frozen%18};
}
