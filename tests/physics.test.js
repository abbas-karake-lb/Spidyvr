import test from 'node:test';
import assert from 'node:assert/strict';
import {Movement,V} from '../docs/physics.js';
function near(a,b,tolerance=.01){assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);}
function advance(p,seconds){for(let i=0;i<seconds*180;i++)p.step(1/180);}
test('holding a rope swings under gravity without exceeding its length',()=>{const p=new Movement([],{gravity:15});p.p.set(10,30,0);p.attach(0,V(0,40,0),V());const length=p.ropes[0].length;advance(p,1);assert.ok(p.p.x<10);assert.ok(p.v.length()>2);assert.ok(p.p.distanceTo(p.ropes[0].anchor)<=length+.01);});
test('release preserves launch velocity exactly',()=>{const p=new Movement();p.v.set(8,14,-21);p.attach(0,V(10,80,-50));const before=p.v.clone();p.release(0);assert.deepEqual(p.v.toArray(),before.toArray());});
test('slack rope never pushes the player away from the anchor',()=>{const p=new Movement([],{gravity:0});p.p.set(10,30,0);p.attach(0,V(0,30,0),V());p.v.set(-5,0,0);advance(p,.2);assert.ok(p.v.x< -4.9);assert.ok(p.p.x<9.1);});
test('hand pull backward launches forward; reaching out does not cancel momentum',()=>{const p=new Movement();p.p.set(0,30,0);p.attach(0,V(0,50,-50));p.pull(0,V(0,0,.08),1/72);assert.ok(p.v.z<0);const z=p.v.z;p.pull(0,V(0,0,-.08),1/72);near(p.v.z,z);});
test('pulling downward adds upward momentum',()=>{const p=new Movement();p.p.set(0,30,0);p.attach(0,V(0,60,-20));p.pull(0,V(0,-.08,.03),1/72);assert.ok(p.v.y>0);assert.ok(p.v.z<0);});
test('two hands provide more launch power than one',()=>{const p=new Movement();p.attach(0,V(-10,60,-40));p.attach(1,V(10,60,-40));p.pull(0,V(0,0,.05),1/72);const first=p.v.length();p.pull(1,V(0,0,.05),1/72);assert.ok(p.v.length()>first*1.8);});
test('same physical pull is consistent at 72, 90, and 120 Hz',()=>{const results=[];for(const hz of [72,90,120]){const p=new Movement();p.attach(0,V(0,60,-80));for(let n=0;n<hz/2;n++)p.pull(0,V(0,0,1/hz),1/hz);results.push(p.v.z);}near(results[0],results[1]);near(results[0],results[2]);});
test('faster stroke produces a stronger launch for the same distance',()=>{function stroke(dt){const p=new Movement();p.attach(0,V(0,60,-80));for(let n=0;n<10;n++)p.pull(0,V(0,0,.04),dt);return p.v.length();}assert.ok(stroke(.01)>stroke(.04));});
test('stationary held controllers do not create extra velocity',()=>{const p=new Movement();p.attach(0,V(0,60,-80));for(let n=0;n<100;n++)p.pull(0,V(),1/72);near(p.v.length(),0);});
test('tracking jumps are rejected',()=>{const p=new Movement();p.attach(0,V(0,60,-80));p.pull(0,V(0,0,2),1/72);near(p.v.length(),0);});
test('fast downward movement lands on roof rather than tunnelling',()=>{const p=new Movement([{min:V(-10,0,-10),max:V(10,32,10)}]);p.p.set(0,40,0);p.v.set(0,-80,0);advance(p,.2);near(p.p.y,32);near(p.v.y,0);assert.ok(p.grounded);});
test('fast lateral movement hits a thin wall',()=>{const p=new Movement([{min:V(5,0,-10),max:V(6,50,10)}]);p.p.set(0,20,0);p.v.set(80,0,0);advance(p,.2);near(p.p.x,4.68);near(p.v.x,0);});
test('rope correction cannot teleport player through a building',()=>{const p=new Movement([{min:V(3,0,-10),max:V(7,60,10)}]);p.p.set(0,20,0);p.attach(0,V(12,30,0),V());p.ropes[0].length=2;advance(p,.1);assert.ok(p.p.x<=2.681);});
test('charged jump clears a normal building and cannot repeat in midair',()=>{const p=new Movement();p.p.set(0,0,0);advance(p,.02);assert.equal(p.jump(1),true);assert.equal(p.jump(1),false);let peak=0;for(let i=0;i<900;i++){p.step(1/180);peak=Math.max(peak,p.p.y);}assert.ok(peak>30&&peak<36,`peak=${peak}`);});
test('dual anchor simulation remains finite and bounded over extended swinging',()=>{const p=new Movement();p.p.set(0,40,0);p.v.set(20,0,-8);p.attach(0,V(-20,80,0));p.attach(1,V(20,80,0));for(let i=0;i<3600;i++){p.step(1/180);assert.ok(p.p.toArray().every(Number.isFinite));assert.ok(p.v.length()<=80.001);}for(const r of p.ropes)assert.ok(p.p.clone().add(r.hand).distanceTo(r.anchor)<=r.length+.02);});
