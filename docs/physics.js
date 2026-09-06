import {Vector3} from './vendor/three.module.min.js';
export const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export const defaults={gravity:15,pull:22,jump:32,maxSpeed:80,reel:11};
export class Movement {
  constructor(boxes=[],settings={}) {
    this.boxes=boxes; this.settings={...defaults,...settings}; this.p=V(0,32,0); this.v=V();
    this.ropes=[null,null]; this.grounded=false; this.height=1.7; this.radius=.32;
  }
  reset(p=V(0,32,0)){this.p.copy(p);this.v.set(0,0,0);this.ropes=[null,null];this.grounded=false;}
  attach(i,anchor,hand=V(0,1.3,0)) {
    this.ropes[i]={anchor:anchor.clone(),hand:hand.clone(),length:Math.max(1.2,this.p.clone().add(hand).distanceTo(anchor)),pullPayout:false};
  }
  release(i){this.ropes[i]=null;}
  pull(i,delta,dt) {
    const r=this.ropes[i]; if(!r||dt<=0||delta.length()>.3)return 0;
    const toward=r.anchor.clone().sub(this.p).sub(r.hand).normalize();
    const stroke=delta.clone().negate(); const inward=stroke.dot(toward);
    // Vertical strokes work in either direction, regardless of anchor height.
    // A mostly horizontal reach away from the body remains a recovery movement.
    const distance=delta.length(),horizontalHand=r.hand.clone().setY(0);
    if(horizontalHand.lengthSq()<.001)horizontalHand.set(0,0,-1);
    const towardBody=delta.dot(horizontalHand)<0;
    if(distance<=.0006||distance/dt<.12||(!towardBody&&Math.abs(delta.y)<distance*.4))return 0;
    const speed=delta.length()/dt;
    const gain=this.settings.pull*Math.min(1.65,.65+speed*.22);
    this.v.addScaledVector(stroke,gain);
    r.length=Math.max(1.2,r.length-Math.max(0,inward)*5);
    // A directional launch must survive every attached rope, including dual webs.
    // Let out a taut rope while the launch carries the body away from its anchor.
    // Gravity/collisions end the outward leg naturally; grip reeling overrides it.
    for(const rope of this.ropes)if(rope){
      const outward=this.p.clone().add(rope.hand).sub(rope.anchor).normalize();
      if(stroke.dot(outward)>.0006&&this.v.dot(outward)>0)rope.pullPayout=true;
    }
    this.capSpeed(); return distance*gain;
  }
  jump(charge=1){if(!this.grounded)return false;this.v.y=this.settings.jump*(.5+.5*Math.max(0,Math.min(1,charge)));this.grounded=false;return true;}
  capSpeed(){if(this.v.length()>this.settings.maxSpeed)this.v.setLength(this.settings.maxSpeed);}
  move(delta) {
    // Swept axis collisions against the standing body prevent fast wall/roof tunnelling.
    for(const axis of ['x','z','y']) {
      const d=delta[axis]; if(!d)continue;
      const start=this.p[axis]; let end=start+d;
      for(const b of this.boxes) {
        const lo=b.min,hi=b.max,r=this.radius,p=this.p;
        if(axis!=='x'&&(p.x<=lo.x-r+.00001||p.x>=hi.x+r-.00001))continue;
        if(axis!=='z'&&(p.z<=lo.z-r+.00001||p.z>=hi.z+r-.00001))continue;
        if(axis!=='y'&&(p.y<=lo.y-this.height+.00001||p.y>=hi.y-.00001))continue;
        const min=lo[axis]-(axis==='y'?this.height:r),max=hi[axis]+(axis==='y'?0:r);
        if(d>0&&start<=min+.00001&&end>min){end=Math.min(end,min);this.v[axis]=Math.min(0,this.v[axis]);}
        if(d<0&&start>=max-.00001&&end<max){end=Math.max(end,max);this.v[axis]=Math.max(0,this.v[axis]);if(axis==='y')this.grounded=true;}
      }
      if(axis==='y'&&end<0){end=0;this.v.y=Math.max(0,this.v.y);this.grounded=true;}
      this.p[axis]=end;
    }
  }
  step(dt,wish=V(),reels=[false,false]) {
    const onGround=this.grounded;this.grounded=false;
    if(onGround){const blend=1-Math.exp(-10*dt);this.v.x+=(wish.x*7-this.v.x)*blend;this.v.z+=(wish.z*7-this.v.z)*blend;}
    else if(wish.lengthSq()>.01)this.v.addScaledVector(wish,7*dt);
    this.v.y-=this.settings.gravity*dt;
    this.v.multiplyScalar(Math.exp(-.018*dt));
    this.ropes.forEach((r,i)=>{if(r&&reels[i]){
      r.pullPayout=false;
      r.length=Math.max(1.2,r.length-this.settings.reel*dt);
      this.v.addScaledVector(r.anchor.clone().sub(this.p).sub(r.hand).normalize(),18*dt);
    }});
    this.capSpeed();this.move(this.v.clone().multiplyScalar(dt));
    for(const r of this.ropes)if(r&&r.pullPayout){
      const radial=this.p.clone().add(r.hand).sub(r.anchor);
      if(this.v.dot(radial)>0)r.length=Math.max(r.length,radial.length()+.001);
      else r.pullPayout=false;
    }
    for(let iteration=0;iteration<5;iteration++)for(const r of this.ropes)if(r){
      const radial=this.p.clone().add(r.hand).sub(r.anchor),distance=radial.length();
      if(distance<r.length||distance<.001)continue;
      radial.multiplyScalar(1/distance);
      this.move(radial.clone().multiplyScalar(r.length-distance));
      const outward=this.v.dot(radial); if(outward>0)this.v.addScaledVector(radial,-outward);
    }
    this.capSpeed();
  }
}
