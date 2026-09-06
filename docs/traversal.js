import {Vector3} from './vendor/three.module.min.js';
// Continuous analog input, integrated once per rendered XR frame. No timers/latches.
export function turnDelta(axis,dt){
  if(!Number.isFinite(axis)||!Number.isFinite(dt))return 0;
  const magnitude=Math.max(0,Math.min(1,(Math.abs(axis)-.18)/.82));
  if(magnitude===0)return 0;
  return -Math.sign(axis)*magnitude*magnitude*(Math.PI*2/3)*Math.max(0,dt);
}
export const showVRPanel=(immersive,paused)=>!!immersive&&!!paused;
export class WebFlight {
  constructor(){this.active=false;this.elapsed=0;this.duration=0;this.start=new Vector3();this.target=new Vector3();this.tip=new Vector3();}
  fire(start,target){
    this.start.copy(start);this.target.copy(target);this.tip.copy(start);this.elapsed=0;
    // 75–220 ms: visibly quick at nearby surfaces and still responsive at full range.
    this.duration=Math.max(.075,Math.min(.22,start.distanceTo(target)/800));this.active=true;
  }
  cancel(){this.active=false;this.elapsed=0;}
  advance(dt){if(!this.active)return false;this.elapsed=Math.min(this.duration,this.elapsed+dt);this.tip.lerpVectors(this.start,this.target,this.elapsed/this.duration);if(this.elapsed>=this.duration){this.active=false;return true;}return false;}
}
