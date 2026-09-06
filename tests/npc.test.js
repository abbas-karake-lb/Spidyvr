import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../docs/vendor/three.module.min.js';
import {NPCPhysics} from '../docs/npc-physics.js';import {questHarness} from './quest-harness.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function setup(count=1,boxes=[]){const people=Array.from({length:count},(_,id)=>({id,p:V(id*2,.18,0),yaw:0,scale:1,ragdoll:null}));return {people,npc:new NPCPhysics(people,boxes)};}
function advance(npc,seconds){for(let i=0;i<seconds*90;i++)npc.step(1/90,V());}
test('swept punches apply directional strength to an articulated body and fall under gravity',()=>{
  for(const sign of [-1,1]){const {npc,people:[p]}=setup();const head=npc.position(p,2).clone(),delta=V(sign*.18,0,0);
    assert.equal(npc.handInput(0,head.clone().addScaledVector(delta,.2),delta,V(),false,1/72),'punch');
    assert.ok(p.ragdoll.nodes[2].v.x*sign>3);advance(npc,.3);assert.ok(p.p.x*sign>.3);assert.ok(p.ragdoll.nodes[2].p.distanceTo(p.ragdoll.nodes[0].p)>.4);
    advance(npc,2);assert.ok(p.ragdoll.nodes[2].p.y<1.5);for(const n of p.ragdoll.nodes)assert.ok(n.p.toArray().every(Number.isFinite));
  }
});
test('slow hands and body locomotion alone do not count as punches',()=>{
  const {npc,people:[p]}=setup(),head=npc.position(p,2).clone();npc.handInput(0,head,V(),V(80,0,0),false,1/72);assert.equal(p.ragdoll,null);
  npc.handInput(0,head,V(.001,0,0),V(),false,1/72);assert.equal(p.ragdoll,null);
});
test('webs attach to moving NPC joints, lift upward, swing sideways and release independently',()=>{
  const {npc,people}=setup(2);npc.hands[0].set(0,1.5,3);npc.hands[1].set(2,1.5,3);
  for(let i=0;i<2;i++)assert.ok(npc.attachWeb(i,{person:people[i],node:1}));
  npc.pullWeb(0,V(0,.12,0),1/72);npc.pullWeb(1,V(-.12,0,.05),1/72);advance(npc,.1);
  assert.ok(npc.position(people[0],1).y>1.6);assert.ok(npc.position(people[1],1).x<2);assert.equal(npc.webs[0].person,people[0]);
  npc.releaseWeb(0);assert.equal(npc.webs[0],null);assert.ok(npc.webs[1]);
});
test('hold-to-grab follows the hand and releasing throws in the measured hand direction',()=>{
  const {npc,people:[p]}=setup();const hand=npc.position(p,1).clone();assert.equal(npc.handInput(0,hand,V(),V(),true,1/72),'grab');
  for(let i=0;i<15;i++){hand.x+=.055;hand.y+=.018;npc.handInput(0,hand,V(.055,.018,0),V(),true,1/72);npc.step(1/72,V());}
  assert.ok(npc.position(p,1).distanceTo(hand)<.15);npc.handInput(0,hand,V(.055,.018,0),V(),false,1/72);
  assert.equal(npc.grabs[0],null);assert.ok(p.ragdoll.nodes[1].v.x>2);const x=p.p.x;advance(npc,.12);assert.ok(p.p.x>x+.15);
});
test('ragdolls collide with roofs and walls; active simulation is bounded',()=>{
  const roof=new T.Box3(V(-5,0,-5),V(5,8,5)),{npc,people}=setup(20,[roof]);people[0].p.set(0,12,0);npc.impulse(people[0],1,V(0,-30,0));advance(npc,.5);
  for(const n of people[0].ragdoll.nodes)assert.ok(n.p.y>=8+n.radius-.01);
  for(const p of people.slice(1))npc.activate(p);assert.equal(npc.active.length,npc.maxActive);
  const {npc:wallNPC,people:[person]}=setup(1,[new T.Box3(V(2,0,-5),V(3,5,5))]);wallNPC.impulse(person,1,V(30,0,0));advance(wallNPC,.5);for(const n of person.ragdoll.nodes)assert.ok(n.p.x<=2-n.radius+.02);
});
test('Quest flow: target NPC, visible web travel, pull body upward, release, grab, throw and pause cleanup',async()=>{
  const h=await questHarness(),{api,sources,poses}=h;api.physics.p.set(16.5,.18,0);h.tick();
  const person=api.city.life.people[0];person.p.set(16.5,.18,-3);api.city.npcs.activate(person);
  h.aim(0,api.city.npcs.position(person,1));sources[0].gamepad.buttons[0].pressed=true;h.tick();assert.ok(api.flights[0].active);assert.equal(api.city.npcs.webs[0],null);
  for(let n=0;n<20;n++)h.tick();assert.ok(api.city.npcs.webs[0]);assert.equal(api.physics.ropes[0],null);assert.ok(api.webs[0].visible);
  const height=api.city.npcs.position(person,1).y;for(let n=0;n<6;n++){poses[0].p.y+=.07;h.tick();}assert.ok(api.city.npcs.position(person,1).y>height+.2);
  sources[0].gamepad.buttons[0].pressed=false;h.tick();assert.equal(api.city.npcs.webs[0],null);
  const node=api.city.npcs.position(person,1),hand=api.physics.p.clone().add(V(poses[1].p.x,poses[1].p.y,poses[1].p.z));const shift=hand.clone().sub(node);for(const n of person.ragdoll.nodes)n.p.add(shift);person.p.add(shift);
  sources[1].gamepad.buttons[3].pressed=true;h.tick();assert.ok(api.city.npcs.grabs[1]);
  for(let n=0;n<6;n++){poses[1].p.x+=.05;h.tick();}sources[1].gamepad.buttons[3].pressed=false;h.tick();assert.equal(api.city.npcs.grabs[1],null);assert.ok(person.ragdoll.nodes[1].v.x>0);
  api.pause(true);assert.equal(api.city.npcs.webs.filter(Boolean).length,0);assert.equal(api.city.npcs.grabs.filter(Boolean).length,0);assert.equal(api.vrHUD.visible,true);
});

test('tracking loss and pause release NPC grabs and webs without inventing a throw',async()=>{
  const h=await questHarness(),{api,sources}=h;api.physics.p.set(16.5,.18,0);h.tick();const npc=api.city.npcs,p=api.city.life.people[0];p.p.copy(api.physics.p).add(V(-.25,0,-.4));npc.activate(p);npc.grabs[0]={person:p,node:1};npc.attachWeb(1,{person:p,node:1});
  h.session.inputSources=[sources[1]];h.tick();assert.equal(npc.grabs[0],null);assert.ok(npc.webs[1]);
  h.session.visibilityState='hidden';h.tick();assert.equal(npc.webs[1],null);assert.ok(p.ragdoll.nodes.every(n=>n.v.length()<10));
});
