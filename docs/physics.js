import {Vector3} from './vendor/three.module.min.js';
export const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export const defaults={gravity:15,pull:22,jump:32,maxSpeed:80,reel:11};
// Acceleration per metre of stretch, radial damping, and combined catch acceleration.
const WEB_SPRING=7,WEB_DAMPING=3.6,WEB_MAX_ACCELERATION=120;
const PULL_START_DISTANCE=.03,PULL_START_SPEED=.55,PULL_START_WINDOW=.12;
export class Movement {
  constructor(boxes=[],settings={}) {
    this.boxes=boxes; this.settings={...defaults,...settings}; this.p=V(0,32,0); this.v=V();
    this.time=0;this.lastPullAt=-Infinity;this.pullHeading=V();this.webForce=V();this.webRadial=V();
    this.ropes=[null,null]; this.grounded=false; this.height=1.7; this.radius=.32;
  }
  reset(p=V(0,32,0)){this.p.copy(p);this.v.set(0,0,0);this.ropes=[null,null];this.grounded=false;this.lastPullAt=-Infinity;}
  attach(i,anchor,hand=V(0,1.3,0)) {
    if(!this.ropes.some(Boolean))this.lastPullAt=-Infinity;
    this.ropes[i]={anchor:anchor.clone(),hand:hand.clone(),length:Math.max(1.2,this.p.clone().add(hand).distanceTo(anchor)),pullConfirmed:false,pendingStroke:V(),pendingImpulse:V(),pendingTime:0,lastStrokeAt:-Infinity,strokeHeading:V()};
  }
  release(i){this.ropes[i]=null;}
  clearPull(r){r.pullConfirmed=false;r.pendingStroke.set(0,0,0);r.pendingImpulse.set(0,0,0);r.pendingTime=0;r.lastStrokeAt=-Infinity;}
  pull(i,delta,dt) {
    const r=this.ropes[i];if(!r)return 0;
    const distance=delta.length();
    if(dt<=0||distance>.3){this.clearPull(r);return 0;}
    const stroke=delta.clone().negate(),speed=distance/dt;
    // Mostly horizontal reaching out remains a recovery movement.
    const horizontalHand=r.hand.clone().setY(0);
    if(horizontalHand.lengthSq()<.001)horizontalHand.set(0,0,-1);
    const towardBody=delta.dot(horizontalHand)<0;
    if(distance<=.0006||speed<.12||(!towardBody&&Math.abs(delta.y)<distance*.4)){this.clearPull(r);return 0;}
    const gain=this.settings.pull*Math.min(1.65,.65+speed*.22),heading=stroke.clone().multiplyScalar(1/distance);
    const continuing=r.pullConfirmed&&this.time-r.lastStrokeAt<=.1&&heading.dot(r.strokeHeading)>.15;
    let impulse;
    if(!continuing){
      // A few millimetres of tracking noise or hand adjustment must never reset flight.
      // Confirm coherent travel within a short window, retaining its full impulse.
      if(r.pullConfirmed||this.time-r.lastStrokeAt>.1||heading.dot(r.strokeHeading)<.5||r.pendingTime+dt>PULL_START_WINDOW)this.clearPull(r);
      if(speed<PULL_START_SPEED){this.clearPull(r);return 0;}
      r.pendingTime+=dt;r.pendingStroke.add(stroke);r.pendingImpulse.addScaledVector(stroke,gain);
      r.lastStrokeAt=this.time;r.strokeHeading.copy(heading);
      if(r.pendingStroke.length()<PULL_START_DISTANCE)return 0;
      heading.copy(r.pendingStroke).normalize();impulse=r.pendingImpulse.clone();r.pullConfirmed=true;
      r.pendingStroke.set(0,0,0);r.pendingImpulse.set(0,0,0);r.pendingTime=0;
    }else impulse=stroke.multiplyScalar(gain);
    // Momentum redirection is reserved for a confirmed intentional pull.
    // Continuous strokes and simultaneous hands retain their existing launch power.
    if(this.lastPullAt!==this.time&&(!continuing||this.time-this.lastPullAt>.1||heading.dot(this.pullHeading)<.15)){
      const aligned=Math.max(0,this.v.dot(heading));this.v.copy(heading).multiplyScalar(aligned);
    }
    r.lastStrokeAt=this.time;r.strokeHeading.copy(heading);this.lastPullAt=this.time;this.pullHeading.copy(heading);
    this.v.add(impulse);this.capSpeed();return impulse.length();
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
    this.time+=dt;
    const onGround=this.grounded;this.grounded=false;
    if(onGround){const blend=1-Math.exp(-10*dt);this.v.x+=(wish.x*7-this.v.x)*blend;this.v.z+=(wish.z*7-this.v.z)*blend;}
    else if(wish.lengthSq()>.01)this.v.addScaledVector(wish,7*dt);
    this.v.y-=this.settings.gravity*dt;
    this.v.multiplyScalar(Math.exp(-.018*dt));
    this.ropes.forEach((r,i)=>{if(r&&reels[i]){
      r.length=Math.max(1.2,r.length-this.settings.reel*dt);
      this.v.addScaledVector(r.anchor.clone().sub(this.p).sub(r.hand).normalize(),18*dt);
    }});
    // Elastic, tension-only webs: retain the unstretched length, never project the
    // body onto a hard radius or delete radial velocity when a shot attaches.
    // Briefly prioritize deliberate gestures, then smoothly restore passive load.
    const recovery=Math.max(0,Math.min(1,(this.time-this.lastPullAt-.08)/.22));
    const tensionWeight=recovery*recovery*(3-2*recovery);
    this.webForce.set(0,0,0);
    for(const r of this.ropes)if(r){
      const radial=this.webRadial.copy(this.p).add(r.hand).sub(r.anchor),distance=radial.length();
      const stretch=distance-r.length;
      if(stretch<=0||distance<.001)continue;
      radial.multiplyScalar(1/distance);
      // Ease damping in as slack disappears. Inward damping limits rebound;
      // clamping at zero prevents a slack/compressed web from pushing outward.
      const damping=WEB_DAMPING*Math.min(1,stretch/2);
      const tension=Math.max(0,WEB_SPRING*stretch+damping*this.v.dot(radial));
      this.webForce.addScaledVector(radial,-tension);
    }
    // Bound the combined acceleration, including two heavily stretched webs.
    this.webForce.clampLength(0,WEB_MAX_ACCELERATION);
    this.v.addScaledVector(this.webForce,dt*tensionWeight);
    this.capSpeed();this.move(this.v.clone().multiplyScalar(dt));
  }
}
