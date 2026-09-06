import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '../docs/vendor/three.module.min.js';
import {questHarness} from './quest-harness.js';
import {turnDelta,WebFlight,showVRPanel} from '../docs/traversal.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
test('analog turning: drift dead zone, proportional speed, continuous hold, 72/90/120 Hz consistency',()=>{
  assert.equal(turnDelta(.17,1),0);assert.ok(Math.abs(turnDelta(.95,1))>Math.abs(turnDelta(.35,1)));assert.ok(turnDelta(1,1)<0);assert.ok(turnDelta(-1,1)>0);
  const totals=[72,90,120].map(hz=>Array.from({length:hz*2},()=>turnDelta(.7,1/hz)).reduce((a,b)=>a+b));assert.ok(Math.abs(totals[0]-totals[2])<1e-10);assert.ok(Math.abs(totals[1]-totals[2])<1e-10);
});
test('web flight is visible for short and long shots; release cancels pending attachment',()=>{
  for(const length of [2,50,170]){const f=new WebFlight();f.fire(V(),V(0,0,-length));assert.ok(f.duration>=.075&&f.duration<=.22);assert.equal(f.advance(1/72),false);assert.ok(f.tip.z<0&&f.tip.z>-length);f.cancel();assert.equal(f.advance(1),false);}
});
test('Quest full flow: dual fire, spatial fire audio, flight, impact, pull, release/refire, jump, pause/resume, tracking loss',async()=>{
  const h=await questHarness(),{api,sources,poses}=h;h.tick();assert.equal(api.vrHUD.visible,false);
  const tall=api.city.boxes.find(b=>b.max.y>60&&b.min.z< -20&&b.max.z> -80&&b.min.x<15&&b.max.x> -15);assert.ok(tall);
  const target=V((tall.min.x+tall.max.x)/2,Math.min(55,tall.max.y-1),tall.max.z);
  for(let i=0;i<2;i++){h.aim(i,target.clone().add(V(i?1:-1,0,0)));sources[i].gamepad.buttons[0].pressed=true;}
  const priorAudio=h.audioEvents.length;h.tick();assert.ok(api.flights[0].active&&api.flights[1].active);assert.equal(api.physics.ropes.filter(Boolean).length,0);assert.ok(h.audioEvents.length>=priorAudio+2);assert.notEqual(h.audioEvents.at(-1).destination.positionX.value,h.audioEvents.at(-2).destination.positionX.value);
  for(let n=0;n<18;n++)h.tick();assert.equal(api.physics.ropes.filter(Boolean).length,2);assert.equal(api.vrHUD.visible,false);
  const before=api.physics.v.z;for(let n=0;n<6;n++){poses[0].p.z+=.035;poses[1].p.z+=.035;h.tick();}assert.ok(api.physics.v.z<before);
  // Holding right stick while swinging updates every frame, without inventing hand strokes.
  sources[1].gamepad.axes[2]=.45;let rotations=[];for(let n=0;n<8;n++){h.tick();rotations.push(api.hands[1].quaternion.y);}assert.ok(new Set(rotations).size===8);assert.ok(api.physics.v.toArray().every(Number.isFinite));sources[1].gamepad.axes[2]=0;
  for(let i=0;i<2;i++)sources[i].gamepad.buttons[0].pressed=false;h.tick();assert.equal(api.physics.ropes.filter(Boolean).length,0);
  // Reset facing by ending/re-entering; covers the lifecycle as well as immediate cancellation/refire.
  await h.session.end();await h.element('enterVR').onclick();h.tick();h.aim(0,target);sources[0].gamepad.buttons[0].pressed=true;h.tick();assert.equal(api.flights[0].active,true);sources[0].gamepad.buttons[0].pressed=false;h.tick();assert.equal(api.flights[0].active,false);sources[0].gamepad.buttons[0].pressed=true;h.tick();assert.equal(api.flights[0].active,true);
  sources[0].gamepad.buttons[5].pressed=true;h.tick();assert.equal(api.vrHUD.visible,true);assert.equal(api.flights[0].active,false);const pos=api.physics.p.clone();for(let n=0;n<30;n++)h.tick();assert.ok(api.physics.p.equals(pos));
  sources[0].gamepad.buttons[5].pressed=false;h.tick();sources[0].gamepad.buttons[5].pressed=true;h.tick();assert.equal(api.vrHUD.visible,false);
  sources[0].gamepad.buttons[5].pressed=false;sources[0].gamepad.buttons[0].pressed=false;api.reset();h.tick();sources[1].gamepad.buttons[4].pressed=true;for(let n=0;n<50;n++)h.tick();sources[1].gamepad.buttons[4].pressed=false;h.tick();assert.ok(api.physics.v.y>25);assert.equal(api.vrHUD.visible,false);
  sources[0].gamepad.axes[3]=-1;sources[1].gamepad.axes[2]=-.6;for(let n=0;n<90;n++)h.tick();assert.ok(api.physics.p.toArray().every(Number.isFinite));assert.equal(api.vrHUD.visible,false);
  h.session.visibilityState='hidden';h.tick();assert.equal(api.physics.ropes.filter(Boolean).length,0);assert.equal(api.flights.filter(f=>f.active).length,0);
});
test('gameplay panel never shows from speed, time, reset, or startup',()=>{for(const immersive of [false,true])for(const paused of [false,true])assert.equal(showVRPanel(immersive,paused),immersive&&paused);});
test('real Quest input path turns continuously on a roof, while walking, and while airborne without changing world momentum by itself',async()=>{
  const h=await questHarness(),{api,sources}=h;for(let n=0;n<6;n++)h.tick();sources[1].gamepad.axes[2]=.65;
  let previous=api.hands[1].quaternion.y,changed=0;for(let n=0;n<30;n++){h.tick(1/90);const next=api.hands[1].quaternion.y;if(next!==previous)changed++;previous=next;}
  assert.equal(changed,30);assert.ok(api.physics.grounded);assert.equal(api.vrHUD.visible,false);
  const start=api.physics.p.clone();sources[0].gamepad.axes[3]=-.8;for(let n=0;n<45;n++)h.tick(1/90);assert.ok(api.physics.p.distanceTo(start)>1);
  sources[0].gamepad.axes[3]=0;api.physics.p.set(22,120,22);api.physics.v.set(12,0,-25);const heading=Math.atan2(api.physics.v.x,api.physics.v.z);for(let n=0;n<30;n++)h.tick(1/90);assert.ok(Math.abs(Math.atan2(api.physics.v.x,api.physics.v.z)-heading)<.0001);assert.equal(api.vrHUD.visible,false);
});
