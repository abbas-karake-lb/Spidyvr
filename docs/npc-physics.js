import * as T from './vendor/three.module.min.js';
import {bodyPoints,bodyLinks} from './city-models.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),UP=V(0,1,0),DT=1/90;
const radii=bodyPoints.map((_,i)=>i===0||i===1?.19:i===2?.16:.085);
const segment=new T.Line3(),scratch=V(),ray=new T.Ray(),sphere=new T.Sphere();
export class NPCPhysics {
  constructor(people,boxes){this.people=people;this.boxes=boxes;this.active=[];this.maxActive=12;this.webs=[null,null];this.grabs=[null,null];this.hands=[V(),V()];this.handVelocity=[V(),V()];this.cooldown=[0,0];this.time=0;this.accumulator=0;this.viewer=V();}
  position(person,node=1){return person.ragdoll?person.ragdoll.nodes[node].p:person.corpsePose?person.corpsePose[node]:person.p.clone().add(V(...bodyPoints[node]).multiplyScalar(person.scale||1).applyAxisAngle(UP,person.yaw||0));}
  activate(person){
    if(person.ragdoll)return person.ragdoll;
    if(this.active.length>=this.maxActive){const old=this.active.find(r=>!this.isHeld(r.person)&&r.age>8&&r.person.p.distanceToSquared(this.viewer)>70**2);if(!old)return null;this.retire(old);}
    const scale=person.scale||1,nodes=bodyPoints.map((point,i)=>({p:this.position(person,i).clone(),before:V(),v:V(),radius:radii[i]*scale}));
    const links=bodyLinks.map(([a,b])=>({a,b,length:nodes[a].p.distanceTo(nodes[b].p)}));
    const r={person,nodes,links,age:0,quiet:0};person.ragdoll=r;this.active.push(r);return r;
  }
  isHeld(person){return this.webs.some(w=>w?.person===person)||this.grabs.some(g=>g?.person===person);}
  retire(r){
    if(this.isHeld(r.person))return;this.active.splice(this.active.indexOf(r),1);const p=r.person;
    if(p.dead){p.corpsePose=r.nodes.map(n=>n.p.clone());p.ragdoll=null;return;}
    p.recoverPose=r.nodes.map(n=>n.p.clone().sub(p.p).divideScalar(p.scale||1));p.ragdoll=null;p.crossing=null;p.wait=0;p.recover=1;p.recoverFrom=p.p.clone();
    p.x=Math.max(-220,Math.min(220,Math.round(p.p.x/44)*44));p.z=Math.max(-220,Math.min(220,Math.round(p.p.z/44)*44));
    const dx=p.p.x-p.x,dz=p.p.z-p.z;
    if(Math.abs(dx)>Math.abs(dz))p.phase=dx>0?33+Math.max(0,Math.min(33,dz+16.5)):99+Math.max(0,Math.min(33,16.5-dz));
    else p.phase=dz>0?66+Math.max(0,Math.min(33,16.5-dx)):Math.max(0,Math.min(33,dx+16.5));
  }
  raycast(origin,direction,max=170){
    ray.set(origin,direction);let best=null,nearest=max;
    for(const p of this.people){if(p.p.distanceToSquared(origin)>(max+3)**2)continue;
      for(const node of (p.ragdoll?[0,1,2,4,5,7,8,10,11,13,14]:[0,1,2])){
        sphere.center.copy(this.position(p,node));sphere.radius=(node<3?.28:.16)*(p.scale||1);
        if(ray.intersectSphere(sphere,scratch)){const distance=scratch.distanceTo(origin);if(distance>.08&&distance<nearest){nearest=distance;best={person:p,node,point:scratch.clone(),distance};}}
      }
    }return best;
  }
  nearest(point,radius=.55){let best=null,dist=radius;for(const p of this.people){if(p.p.distanceToSquared(point)>9)continue;for(const node of [0,1,2,5,8]){const d=this.position(p,node).distanceTo(point);if(d<dist){dist=d;best={person:p,node};}}}return best;}
  impulse(person,node,velocity){const r=this.activate(person);if(!r)return false;for(let i=0;i<r.nodes.length;i++)r.nodes[i].v.addScaledVector(velocity,i===node?1.4:.65).clampLength(0,35);r.age=0;r.quiet=0;person.reactUntil=this.time+5;for(const other of this.people)if(other!==person&&other.p.distanceToSquared(person.p)<7**2)other.reactUntil=this.time+4;return true;}
  kill(person,node,velocity){
    if(!person.ragdoll&&this.active.length>=this.maxActive){const old=this.active.find(r=>r.person.dead&&!this.isHeld(r.person))||this.active.find(r=>!this.isHeld(r.person));if(old)this.retire(old);}
    if(!this.impulse(person,node,velocity))return false;person.dead=true;person.health=0;person.crossing=null;person.wait=1;return true;
  }
  attachWeb(hand,target){if(!this.activate(target.person))return false;this.webs[hand]={person:target.person,node:target.node,length:Math.max(1,this.position(target.person,target.node).distanceTo(this.hands[hand]))};return true;}
  releaseWeb(hand){this.webs[hand]=null;}
  pullWeb(hand,delta,dt){const w=this.webs[hand];if(!w||dt<=0||delta.length()>.3||delta.length()/dt<.18)return;
    const gain=30*Math.min(2,delta.length()/dt*.35+.65);this.impulse(w.person,w.node,delta.clone().multiplyScalar(gain));
    const toward=this.hands[hand].clone().sub(this.position(w.person,w.node)).normalize();w.length=Math.max(1,w.length-Math.max(0,delta.dot(toward))*5);
  }
  releaseGrab(hand,throwing=true){const g=this.grabs[hand];if(!g)return;this.grabs[hand]=null;
    if(throwing){const v=this.handVelocity[hand].clone().clampLength(0,28);for(const n of g.person.ragdoll.nodes)n.v.copy(v);g.person.ragdoll.nodes[g.node].v.multiplyScalar(1.12);}this.cooldown[hand]=this.time+.25;
  }
  handInput(hand,position,delta,bodyVelocity,grabHeld,dt){
    this.hands[hand].copy(position);
    const valid=delta&&delta.length()<=.3&&dt>0;
    if(valid){const velocity=delta.clone().divideScalar(dt).add(bodyVelocity).clampLength(0,35);this.handVelocity[hand].lerp(velocity,1-Math.exp(-35*dt));}
    else this.handVelocity[hand].copy(bodyVelocity);
    if(!grabHeld)this.releaseGrab(hand);
    else if(!this.grabs[hand]){const hit=this.nearest(position);if(hit&&!this.grabs.some(g=>g?.person===hit.person)&&this.activate(hit.person)){this.grabs[hand]=hit;this.releaseWeb(hand);this.cooldown[hand]=this.time+.2;return 'grab';}}
    if(grabHeld||this.grabs[hand]||!valid||this.time<this.cooldown[hand]||delta.length()/dt<1.1)return null;
    segment.set(position.clone().sub(delta),position);let hit=null,nearest=.23;
    for(const person of this.people){if(person.p.distanceToSquared(position)>9)continue;for(const node of [0,1,2,4,7]){const point=this.position(person,node);segment.closestPointToPoint(point,true,scratch);const d=scratch.distanceTo(point);if(d<nearest){nearest=d;hit={person,node};}}}
    if(hit&&this.impulse(hit.person,hit.node,delta.clone().divideScalar(dt).multiplyScalar(2.5).clampLength(0,22))){this.cooldown[hand]=this.time+.28;return 'punch';}return null;
  }
  releaseHand(hand){this.releaseWeb(hand);this.releaseGrab(hand,false);this.handVelocity[hand].set(0,0,0);}
  releaseAll(){for(let i=0;i<2;i++)this.releaseHand(i);}
  collide(n,previous,candidates){
    // Swept sphere against building AABBs; impulses cannot tunnel through roofs/walls.
    for(const b of candidates)for(const axis of ['x','z','y']){
      const others=axis==='x'?['y','z']:axis==='z'?['x','y']:['x','z'];
      if(others.some(a=>n.p[a]<b.min[a]-n.radius||n.p[a]>b.max[a]+n.radius))continue;
      const lo=b.min[axis]-n.radius,hi=b.max[axis]+n.radius;
      if(previous[axis]<=lo&&n.p[axis]>lo){n.p[axis]=lo;n.v[axis]=Math.min(0,n.v[axis]);}
      else if(previous[axis]>=hi&&n.p[axis]<hi){n.p[axis]=hi;n.v[axis]=Math.max(0,n.v[axis]);}
    }
    if(n.p.y<.18+n.radius){n.p.y=.18+n.radius;n.v.y=Math.max(0,n.v.y);n.v.x*=.94;n.v.z*=.94;}
  }
  step(dt,viewer,reels=[false,false]){
    this.viewer.copy(viewer);this.accumulator+=Math.min(.05,Math.max(0,dt));while(this.accumulator>=DT){this.integrate(DT,viewer,reels);this.accumulator-=DT;}
  }
  integrate(dt,viewer,reels){
    this.time+=dt;
    for(let i=0;i<2;i++){const w=this.webs[i];if(!w)continue;const n=w.person.ragdoll.nodes[w.node];if(reels[i])w.length=Math.max(1,w.length-14*dt);const toward=this.hands[i].clone().sub(n.p),distance=toward.length();if(distance>w.length){toward.divideScalar(distance);n.v.addScaledVector(toward,Math.max(0,Math.min(120,(distance-w.length)*18-n.v.dot(toward)*3))*dt);}}
    for(const r of [...this.active]){
      r.age+=dt;const center=r.nodes[0].p,candidates=this.boxes.filter(b=>center.x>b.min.x-4&&center.x<b.max.x+4&&center.z>b.min.z-4&&center.z<b.max.z+4);
      for(const n of r.nodes){n.before.copy(n.p);n.v.y-=14*dt;n.v.multiplyScalar(Math.exp(-.35*dt)).clampLength(0,35);n.p.addScaledVector(n.v,dt);this.collide(n,n.before,candidates);}
      for(let iter=0;iter<5;iter++){
        for(const link of r.links){const a=r.nodes[link.a].p,b=r.nodes[link.b].p,d=scratch.copy(b).sub(a),length=d.length();if(length<.00001)continue;d.multiplyScalar((length-link.length)/length*.5);a.add(d);b.sub(d);}
        for(let hand=0;hand<2;hand++){const g=this.grabs[hand];if(g?.person===r.person){const n=r.nodes[g.node],goal=this.hands[hand];n.p.lerp(goal,.78);}}
        for(const n of r.nodes)this.collide(n,n.before,candidates);
      }
      let energy=0;for(const n of r.nodes){n.v.copy(n.p).sub(n.before).divideScalar(dt).clampLength(0,35);energy+=n.v.lengthSq();}
      r.person.p.copy(r.nodes[0].p).addScaledVector(UP,-.93*(r.person.scale||1));r.quiet=energy<1?r.quiet+dt:0;
      if(!this.isHeld(r.person)&&(r.quiet>2.5&&r.person.p.y<1.3||r.age>20&&r.person.p.distanceToSquared(viewer)>120**2))this.retire(r);
    }
  }
}
