import * as T from './vendor/three.module.min.js';
import {mergeParts} from './city-models.js?visual=3';
const V=(...v)=>new T.Vector3(...v),FORWARD=V(0,0,-1);
function gunGeometry(){
  const box=new T.BoxGeometry(1,1,1),tube=new T.CylinderGeometry(1,1,1,16),parts=[],slide=[];
  const add=(size,at,color,geo=box,rot=[0,0,0],moving=false)=>(moving?slide:parts).push({size,at,color,geo,rot});
  add([.039,.047,.225],[0,.04,-.13],0x7c8b94,box,[0,0,0],true);add([.046,.027,.2],[0,.008,-.117],0x293943);
  add([.035,.10,.044],[0,-.047,-.015],0x26313a,box,[-.23,0,0]);add([.041,.013,.05],[0,-.094,-.003],0x88969c);
  add([.012,.026,.012],[0,.038,-.252],0x19252c,tube,[Math.PI/2,0,0]);add([.006,.028,.006],[0,.038,-.254],0x03070a,tube,[Math.PI/2,0,0]);
  add([.009,.013,.013],[0,.068,-.23],0xb9d6d7,box,[0,0,0],true);add([.036,.012,.017],[0,.069,-.045],0x253139,box,[0,0,0],true);
  add([.007,.008,.008],[0,.075,-.23],0xe1f3b7,box,[0,0,0],true);
  add([.028,.008,.06],[0,-.044,-.073],0x667780);add([.029,.05,.008],[0,-.017,-.105],0x667780);add([.009,.034,.009],[0,-.013,-.063],0x9eafb5,box,[-.25,0,0]);
  for(const side of [-1,1]){for(let j=0;j<6;j++)add([.0015,.025,.003],[side*.0202,.043,-.054-j*.007],0x344651,box,[0,0,0],true);for(let j=0;j<5;j++)add([.0015,.004,.026],[side*.018,-.025-j*.012,-.012],0x465963);}
  return {frame:mergeParts(parts),slide:mergeParts(slide)};
}
export class Weapons {
  constructor(scene,boxes,npcs,onFire=()=>{}){
    this.scene=scene;this.boxes=boxes;this.npcs=npcs;this.onFire=onFire;this.held=[null,null];this.gripWas=[false,false];this.blocked=[false,false];this.triggerWas=[false,false];this.velocities=[V(),V()];this.aim=[FORWARD.clone(),FORWARD.clone()];this.time=0;this.shots=0;
    this.ray=new T.Ray();this.hit=V();this.muzzle=V();this.sockets=[null,null];this.nextEffect=0;this.items=[];
    const geometry=gunGeometry(),material=new T.MeshStandardMaterial({vertexColors:true,roughness:.32,metalness:.75});
    for(let i=0;i<20;i++){
      const b=boxes[(i*17)%boxes.length],x=(b.min.x+b.max.x)/2,z=(b.min.z+b.max.z)/2;
      const home=i===0?V(1.2,33.25,-2):i===1?V(-1.2,33.25,-2):i%3===0?V(b.max.x+1.7,1.25,z):V(x+1,b.max.y+1.25,z-1);
      const mesh=new T.Mesh(geometry.frame,material);mesh.name='pickup-pistol-'+i;mesh.position.copy(home);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
      const slide=new T.Mesh(geometry.slide,material);slide.castShadow=slide.receiveShadow=true;mesh.add(slide);
      const halo=new T.Mesh(new T.RingGeometry(.2,.215,32),new T.MeshBasicMaterial({color:0xaee4d7,transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false}));halo.rotation.x=-Math.PI/2;scene.add(halo);
      this.items.push({mesh,slide,halo,home,p:home.clone(),v:V(),spin:V(),state:'floating',owner:null,age:0,lastShot:-10,kick:0});
    }
    this.effects=Array.from({length:8},()=>{const line=new T.Line(new T.BufferGeometry().setFromPoints([V(),V()]),new T.LineBasicMaterial({color:0xffe2a0,transparent:true,opacity:0,depthWrite:false}));line.frustumCulled=false;line.visible=false;scene.add(line);const flash=new T.Mesh(new T.SphereGeometry(.025,8,6),new T.MeshBasicMaterial({color:0xffde96}));flash.visible=false;scene.add(flash);return {line,flash,life:0};});
  }
  spawnPickup(position,{name='Supply pistol',damage=40,cooldown=.14,automatic=false,tint=0xffffff}={}){
    const mesh=this.items[0].mesh.clone();mesh.material=mesh.material.clone();mesh.material.color.set(tint);mesh.position.copy(position);mesh.quaternion.identity();mesh.name=name;this.scene.add(mesh);
    const slide=mesh.children[0];slide.material=mesh.material;slide.position.set(0,0,0);
    // Supply variants keep the proven palm socket but have recognizable attachments.
    if(automatic){const optic=new T.Mesh(new T.BoxGeometry(.046,.026,.065),mesh.material);optic.position.set(0,.083,-.095);mesh.add(optic);const lens=new T.Mesh(new T.BoxGeometry(.034,.018,.004),new T.MeshBasicMaterial({color:0x87dfb3}));lens.position.set(0,.086,-.13);mesh.add(lens);}
    if(damage>=90){const shroud=new T.Mesh(new T.CylinderGeometry(.017,.017,.12,12),mesh.material);shroud.rotation.x=Math.PI/2;shroud.position.set(0,.038,-.19);mesh.add(shroud);}
    if(damage>100){const magazine=new T.Mesh(new T.BoxGeometry(.034,.055,.041),mesh.material);magazine.position.set(0,-.115,.002);mesh.add(magazine);}
    const halo=this.items[0].halo.clone();halo.material=halo.material.clone();halo.material.color.set(tint);this.scene.add(halo);
    const item={mesh,slide,halo,home:position.clone(),p:position.clone(),v:V(),spin:V(),state:'floating',owner:null,age:0,lastShot:-10,kick:0,damage,cooldown,automatic,name};this.items.push(item);return item;
  }
  nearest(position){let nearest=null,distance=.65;for(const item of this.items){if(item.owner!==null)continue;const d=item.p.distanceTo(position);if(d<distance){nearest=item;distance=d;}}return nearest;}
  input(hand,{position,quaternion,direction,delta,bodyVelocity,grip,trigger,dt,canGrab=true,socket=null}){
    if(delta&&dt>0&&delta.length()<=.3)this.velocities[hand].lerp(delta.clone().divideScalar(dt).add(bodyVelocity).clampLength(0,35),1-Math.exp(-35*dt));else this.velocities[hand].copy(bodyVelocity);
    if(!grip)this.blocked[hand]=false;
    const gripEdge=grip&&!this.gripWas[hand]&&!this.blocked[hand],triggerEdge=trigger&&!this.triggerWas[hand];this.gripWas[hand]=grip;this.triggerWas[hand]=trigger;
    let grabbed=false,released=false;
    if(!grip&&this.held[hand]){this.release(hand,true);released=true;}
    if(gripEdge&&canGrab&&!this.held[hand]){const item=this.nearest(position);if(item){item.state='held';item.owner=hand;item.age=0;this.held[hand]=item;grabbed=true;}}
    this.sockets[hand]=socket;this.aim[hand].copy(direction);this.sync(hand,position,quaternion);
    if(this.held[hand]&&(triggerEdge||trigger&&this.held[hand].automatic)&&!grabbed)this.fire(hand);
    return {equipped:!!this.held[hand],grabbed,released};
  }
  sync(hand,position,quaternion){
    const item=this.held[hand];if(!item)return;
    // Never aim the model independently with lookAt(targetRay, gripUp): those
    // are different spaces, and that reconstruction twists near vertical poses.
    const socket=this.sockets[hand];
    if(socket){socket.getWorldPosition(item.mesh.position);socket.getWorldQuaternion(item.mesh.quaternion);}
    else {item.mesh.position.copy(position);item.mesh.quaternion.copy(quaternion);}
    item.p.copy(item.mesh.position);item.halo.visible=false;
  }
  fire(hand){
    const item=this.held[hand];if(!item||this.time-item.lastShot<(item.cooldown??.14))return false;item.lastShot=this.time;item.kick=1;this.shots++;
    this.muzzle.set(0,.038,-.272).applyQuaternion(item.mesh.quaternion).add(item.mesh.position);
    const direction=FORWARD.clone().applyQuaternion(item.mesh.quaternion).normalize();this.ray.set(this.muzzle,direction);let distance=250;
    for(const b of this.boxes){if(b.containsPoint(this.muzzle)){distance=0;break;}if(this.ray.intersectBox(b,this.hit))distance=Math.min(distance,this.hit.distanceTo(this.muzzle));}
    let npc=distance>.01?this.npcs.raycast(this.muzzle,direction,distance):null;
    const hostile=distance>.01?this.combat?.raycast(this.muzzle,direction,npc?npc.distance:distance):null;
    if(hostile){distance=hostile.distance;this.combat.hit(hostile,direction,item.damage??40);npc=null;}
    if(npc){distance=npc.distance;this.npcs.kill(npc.person,npc.node,direction.clone().multiplyScalar(9));}
    for(const p of this.npcs.people)if(!p.dead&&p.p.distanceToSquared(this.muzzle)<30**2)p.reactUntil=this.npcs.time+5;
    const effect=this.effects[this.nextEffect++%this.effects.length],end=this.muzzle.clone().addScaledVector(direction,distance),positions=effect.line.geometry.attributes.position;positions.setXYZ(0,...this.muzzle);positions.setXYZ(1,...end);positions.needsUpdate=true;effect.line.visible=true;effect.line.material.opacity=.8;effect.flash.position.copy(this.muzzle);effect.flash.visible=true;effect.life=.065;
    this.onFire(hand,this.muzzle.clone(),!!npc||!!hostile);return true;
  }
  release(hand,throwing=false){const item=this.held[hand];if(!item)return;item.owner=null;item.state='dropped';item.age=0;item.p.copy(item.mesh.position);item.v.copy(throwing?this.velocities[hand]:V());item.spin.set(throwing?this.velocities[hand].z*2:0,throwing?this.velocities[hand].x:0,throwing?this.velocities[hand].y:0).clampLength(0,15);this.held[hand]=null;}
  releaseHand(hand){if(this.held[hand]||this.gripWas[hand])this.blocked[hand]=true;this.release(hand,false);this.gripWas[hand]=false;this.triggerWas[hand]=false;this.velocities[hand].set(0,0,0);}
  releaseAll(){for(let i=0;i<2;i++)this.releaseHand(i);for(const e of this.effects){e.life=0;e.line.visible=e.flash.visible=false;}}
  update(dt,viewer,paused=false){
    if(paused)return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;
    for(const item of this.items){item.age+=dt;item.kick*=Math.exp(-28*dt);item.slide.position.z=item.kick*.018;
      if(item.state==='floating'){item.p.copy(item.home);item.p.y+=Math.sin(this.time*1.7+this.items.indexOf(item))*.07;item.mesh.rotation.set(.12,this.time*.5+this.items.indexOf(item),0);}
      if(item.state==='dropped'){
        const steps=Math.max(1,Math.ceil(dt*90)),step=dt/steps;for(let i=0;i<steps;i++){const before=item.p.clone();item.v.y-=18*step;item.p.addScaledVector(item.v,step);this.npcs.collide({p:item.p,v:item.v,radius:.12},before,this.boxes);}item.mesh.rotation.x+=item.spin.x*dt;item.mesh.rotation.y+=item.spin.y*dt;item.mesh.rotation.z+=item.spin.z*dt;item.spin.multiplyScalar(Math.exp(-2*dt));
        if((Math.abs(item.p.x)>260||Math.abs(item.p.z)>260)&&item.age>5){item.state='floating';item.p.copy(item.home);item.v.set(0,0,0);}
      }
      if(item.owner===null)item.mesh.position.copy(item.p);item.mesh.visible=item.owner!==null||viewer.distanceToSquared(item.p)<100**2;
      item.halo.visible=item.owner===null&&viewer.distanceToSquared(item.p)<12**2;item.halo.position.copy(item.p);item.halo.position.y-=.15;
    }
    for(const e of this.effects){e.life=Math.max(0,e.life-dt);e.line.visible=e.life>0;e.flash.visible=e.life>.035;e.line.material.opacity=e.life/.065*.8;}
  }
}
