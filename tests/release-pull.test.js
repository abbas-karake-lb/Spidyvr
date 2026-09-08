import test from 'node:test';
import assert from 'node:assert/strict';
import {Movement,V} from '../docs/physics.js';
import {questHarness} from './quest-harness.js';

function setup(hand=0){const p=new Movement([],{gravity:0});p.p.set(0,140,0);p.v.set(23,-8,-60);p.attach(hand,V(0,80,-100));return p;}
const near=(a,b)=>assert.ok(a.distanceTo(b)<1e-8,`${a.toArray()} != ${b.toArray()}`);

test('held gestures do not alter velocity or passive spring recovery; release retains the original pull strength',()=>{
  for(const hz of [72,90,120])for(const hand of [0,1])for(const initial of [V(),V(0,0,70),V(23,-8,-60)]){
    const p=setup(hand),reference=setup(hand);p.v.copy(initial);reference.v.copy(initial);
    for(let n=0;n<hz/2;n++){
      const delta=V(0,-1/hz,.5/hz);p.pull(hand,delta,1/hz,true);reference.pull(hand,delta,1/hz);
      near(p.v,initial);assert.equal(p.lastPullAt,-Infinity);p.time+=1/hz;reference.time+=1/hz;
    }
    assert.ok(p.release(hand,true)>0);near(p.v,reference.v);assert.equal(p.ropes[hand],null);
    const launch=p.v.clone();assert.equal(p.release(hand,true),0);near(p.v,launch);
  }
});

test('only the latest coherent stroke launches, with independent directions and settings',()=>{
  for(const delta of [V(0,-.07,.04),V(0,.07,.04),V(.06,-.04,0),V(-.06,-.04,0)]){
    const p=setup(),reference=setup();p.settings.pull=reference.settings.pull=34;
    p.pull(0,delta.clone().negate(),1/90,true);p.time+=1/90;
    p.pull(0,delta,1/90,true);reference.pull(0,delta,1/90);
    p.release(0,true);near(p.v,reference.v);
  }
});

test('stale strokes, recovery reaches, incomplete pulls and tracking jumps cannot cause a surprise release launch',()=>{
  for(const finish of [
    p=>{p.time+=.15;},
    p=>{p.pull(0,V(0,0,-.08),1/90,true);},
    p=>{p.pull(0,V(0,.01,0),1/90,true);},
    p=>{p.pull(0,V(0,2,0),1/90,true);},
    p=>{p.release(0);p.attach(0,V(0,80,-100));}
  ]){
    const p=setup(),before=p.v.clone();p.pull(0,V(0,-.07,.04),1/90,true);finish(p);
    assert.equal(p.release(0,true),0);near(p.v,before);
  }
  const recent=setup(),before=recent.v.clone();recent.pull(0,V(0,-.07,.04),1/90,true);
  recent.time+=1/72;recent.pull(0,V(),1/72,true);assert.ok(recent.release(0,true)>0);assert.ok(!recent.v.equals(before));
});

test('dual release combines both strokes once; single release leaves the other web attached',()=>{
  const one=setup(),two=setup();one.v.set(0,0,0);two.v.set(0,0,0);two.attach(1,V(20,80,-100));
  const delta=V(0,-.07,.04);one.pull(0,delta,1/90,true);one.release(0,true);
  for(let i=0;i<2;i++)two.pull(i,delta,1/90,true);
  const other=two.ropes[1];two.release(0,true);assert.equal(two.ropes[1],other);two.release(1,true);near(two.v,one.v.clone().multiplyScalar(2));
});

test('sampling arbitrary hand gestures preserves the existing elastic catch exactly',()=>{
  const sampled=setup(),passive=setup();sampled.v.set(0,0,70);passive.v.copy(sampled.v);
  for(let n=0;n<180;n++){
    const delta=V(0,n%20<10?-.04:.04,.025);
    for(const p of [sampled,passive])p.ropes[0].hand.add(delta);
    sampled.pull(0,delta,1/180,true);sampled.step(1/180);passive.step(1/180);
    near(sampled.v,passive.v);near(sampled.p,passive.p);assert.equal(sampled.ropes[0].length,passive.ropes[0].length);
  }
});

test('Quest release includes the final hand sample and supports immediate re-fire from both hands',async()=>{
  const h=await questHarness(),{api,sources,poses}=h;api.physics.p.set(0,150,0);api.physics.settings.gravity=0;h.tick();
  for(const hand of [0,1]){
    sources[hand].gamepad.buttons[0].pressed=true;h.tick();api.flights[hand].cancel();
    api.physics.attach(hand,V(0,180,-150));api.physics.v.set(0,0,-60);
    // The entire deliberate stroke arrives on the same frame as trigger-up.
    poses[hand].p.y-=.08;poses[hand].p.z+=.04;sources[hand].gamepad.buttons[0].pressed=false;h.tick();
    assert.equal(api.physics.ropes[hand],null);assert.ok(api.physics.v.y>10);assert.ok(api.physics.v.z< -5);
    const y=api.physics.v.y;h.tick();assert.ok(api.physics.v.y<=y,'no repeated release boost');
    h.aim(hand,V(0,32,0));sources[hand].gamepad.buttons[0].pressed=true;h.tick();assert.ok(api.flights[hand].active);
    sources[hand].gamepad.buttons[0].pressed=false;h.tick();assert.equal(api.flights[hand].active,false);
  }
});

test('Quest pause, tracking loss and weapon pickup discard an armed pull without launching',async()=>{
  const h=await questHarness(),{api,sources,poses}=h;api.physics.settings.gravity=0;
  for(const cleanup of ['pause','tracking','weapon']){
    h.session.inputSources=sources;api.pause(false);api.physics.p.set(0,150,0);api.physics.v.set(0,0,-60);
    sources[0].gamepad.buttons[0].pressed=false;sources[0].gamepad.buttons[1].pressed=false;h.tick();
    sources[0].gamepad.buttons[0].pressed=true;h.tick();api.flights[0].cancel();api.physics.attach(0,V(0,180,-150));
    poses[0].p.y-=.08;poses[0].p.z+=.04;h.tick();assert.ok(api.physics.ropes[0].releaseImpulse.length()>0);assert.ok(Math.abs(api.physics.v.y)<1e-8);
    if(cleanup==='pause')api.pause(true);
    if(cleanup==='tracking'){h.session.inputSources=[sources[1]];h.tick();}
    if(cleanup==='weapon'){api.weapons.items[0].p.copy(api.hands[0].position);sources[0].gamepad.buttons[1].pressed=true;h.tick();assert.ok(api.weapons.held[0]);}
    assert.equal(api.physics.ropes[0],null);assert.ok(Math.abs(api.physics.v.y)<1e-8);assert.ok(api.physics.v.z< -59);
  }
});
