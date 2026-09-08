import test from 'node:test';
import assert from 'node:assert/strict';
import {Movement,V} from '../docs/physics.js';
import {questHarness} from './quest-harness.js';

test('minor hand adjustments after attaching an ahead web preserve fast flight exactly',()=>{
  for(const hz of [72,90,120])for(const hand of [0,1]){
    const p=new Movement([],{gravity:0});p.p.set(0,120,0);p.v.set(0,0,-65);p.attach(hand,V(0,120,-120),V());
    for(let n=0;n<hz/2;n++){
      const before=p.v.clone(),delta=V(0,-.2/hz,.08/hz);p.ropes[hand].hand.add(delta);
      assert.equal(p.pull(hand,delta,1/hz),0);assert.ok(p.v.equals(before),'incidental hand movement must not redirect or erase momentum');p.step(1/hz);
    }
    assert.ok(p.v.z< -64);assert.ok(Math.abs(p.v.y)<.001);
  }
});
test('fast but tiny alternating tracking movements cannot accumulate into a deliberate stroke',()=>{
  const p=new Movement([],{gravity:0});p.v.set(25,10,-65);p.attach(0,V(0,100,-160),V());const before=p.v.clone();
  for(let n=0;n<100;n++)assert.equal(p.pull(0,V(0,(n%2?1:-1)*.009,0),1/120),0);
  assert.ok(p.v.equals(before));
});
test('partial strokes expire and cannot reset momentum after a pause or release/refire',()=>{
  const p=new Movement([],{gravity:0});p.v.z=-60;p.attach(0,V(0,100,-160));
  p.pull(0,V(0,-.015,0),1/90);for(let n=0;n<30;n++)p.step(1/180);const before=p.v.clone();
  p.pull(0,V(0,-.015,0),1/90);assert.ok(p.v.equals(before));
  p.release(0);p.attach(0,V(0,100,-160));p.pull(0,V(0,-.02,0),1/90);assert.ok(p.v.equals(before));
});
test('confirmed pull retains all sampled boost at each Quest refresh rate, then release preserves launch',()=>{
  const speeds=[];
  for(const hz of [72,90,120]){
    const p=new Movement([],{gravity:0});p.p.y=100;p.attach(0,V(0,140,-100));
    for(let n=0;n<hz/2;n++)p.pull(0,V(0,-1/hz,.5/hz),1/hz);
    const launch=p.v.clone();assert.ok(launch.y>8&&launch.z< -4);p.release(0);assert.ok(p.v.equals(launch));speeds.push(launch.length());
  }
  assert.ok(Math.max(...speeds)-Math.min(...speeds)<1e-8);
});
test('an ahead anchor allows passing it and using slack before the stretched web catches from behind',()=>{
  const p=new Movement([],{gravity:0});p.p.set(0,120,0);p.v.z=-40;p.attach(0,V(0,120,-20),V());const rope=p.ropes[0];
  for(let n=0;n<180;n++){p.pull(0,V(0,n%2?.001:-.001,0),1/180);p.step(1/180);assert.ok(p.v.z< -39);}
  assert.ok(p.p.z<rope.anchor.z);let previous=p.v.z;
  for(let n=0;n<135;n++){p.step(1/180);assert.ok(Math.abs(p.v.z-previous)<.8);previous=p.v.z;}
  assert.ok(p.v.z> -10,'elastic tension should eventually arrest outward flight');assert.equal(p.ropes[0],rope);
});
test('Quest flow: fly, attach from either hand, adjust it slightly, then pull down and release to boost',async()=>{
  for(const hand of [0,1]){
    const h=await questHarness(),{api,sources,poses}=h;api.physics.p.set(0,140,0);api.physics.v.set(0,0,-60);h.tick();
    const b=api.city.boxes.find(b=>b.min.z< -70&&b.max.z> -150&&b.min.x<10&&b.max.x> -10);assert.ok(b);
    h.aim(hand,V((b.min.x+b.max.x)/2,b.max.y,(b.min.z+b.max.z)/2));sources[hand].gamepad.buttons[0].pressed=true;h.tick();assert.ok(api.flights[hand].active);
    for(let n=0;n<18;n++)h.tick();assert.ok(api.physics.ropes[hand]);
    for(let n=0;n<18;n++){poses[hand].p.y-=.003;poses[hand].p.z+=.001;h.tick();assert.ok(api.physics.v.z< -58,'small grip adjustment must not stop flight');}
    poses[hand].p.y-=.065;poses[hand].p.z+=.035;h.tick();assert.ok(api.physics.v.z< -58,'even a deliberate pull must preserve flight while held');
    sources[hand].gamepad.buttons[0].pressed=false;h.tick();assert.equal(api.physics.ropes[hand],null);assert.ok(api.physics.v.y>5&&api.physics.v.z< -5,'the release applies the sampled pull');
  }
});
