import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../docs/vendor/three.module.min.js';
import {Movement,V} from '../docs/physics.js';
import {createQuarantineBuilding,towerPoint} from '../docs/quarantine-building.js';
import {QuarantineChallenge} from '../docs/quarantine-zombies.js';
import {canvasContext,questHarness} from './quest-harness.js';
function building(){globalThis.document={createElement:()=>({getContext:canvasContext})};return createQuarantineBuilding(new T.Scene());}
function step(b,p,wish=V(),dt=1/90){b.update(dt,p.p);p.boxes=b.collisionBoxes(p.p);for(let n=0;n<2;n++){b.support(p,dt/2);p.step(dt/2,wish);b.support(p,0);}}
function walk(b,p,x,z){const target=towerPoint(x,0,z);for(let n=0;n<1100;n++){const delta=target.clone().sub(p.p).setY(0);if(delta.length()<.12){p.v.x=p.v.z=0;return;}step(b,p,delta.normalize().multiplyScalar(Math.min(1,delta.length())));}assert.fail(`Cannot walk to ${x},${z}; at ${p.p.toArray()}`);}

test('enter from street and walk the real stairs through all ten floors to the roof',()=>{
  const b=building(),p=new Movement();p.p.copy(towerPoint(-14,0,0));p.grounded=true;
  walk(b,p,3.9,0);assert.ok(Math.abs(p.p.y-.2)<.03);
  walk(b,p,4.5,-5.4);walk(b,p,6.2,-5.4);
  for(let f=0;f<10;f++){
    walk(b,p,6.2,5.4);assert.ok(Math.abs(p.p.y-(2.2+f*4))<.06,`first flight ${f}: ${p.p.y}`);
    walk(b,p,8.7,5.4);walk(b,p,8.7,-5.4);assert.ok(Math.abs(p.p.y-(4.2+f*4))<.06,`second flight ${f}: ${p.p.y}`);
    walk(b,p,6.2,-5.4);
  }
  walk(b,p,4.5,-5.4);walk(b,p,-3,1.6);assert.ok(Math.abs(p.p.y-40.2)<.05);
});

test('both furnished apartments have accessible living areas, bedrooms and bathrooms',()=>{
  const b=building();for(const side of [-1,1]){
    const p=new Movement();p.p.copy(towerPoint(-1,.2,0));p.grounded=true;
    walk(b,p,-1,side*8);walk(b,p,1.2,side*8);walk(b,p,4.1,side*8);walk(b,p,3.6,side*9.8);walk(b,p,2.4,side*11.3);assert.ok(Math.abs(p.p.y-.2)<.04);
  }
});

test('elevator carries the player up and down without falling or replacing world movement',()=>{
  const b=building(),p=new Movement();p.p.copy(towerPoint(6.1,.2,10.5));p.grounded=true;
  for(let n=0;n<400;n++)step(b,p);assert.ok(Math.abs(p.p.y-4.2)<.03);assert.ok(!b.riding);
  p.p.copy(towerPoint(7.2,4.2,8));step(b,p);p.p.copy(towerPoint(8.1,4.2,10.5));
  for(let n=0;n<400;n++)step(b,p);assert.ok(Math.abs(p.p.y-.2)<.03);assert.ok(!b.riding);
  assert.ok(b.closedGates.length===10);
});

test('zombie spawns are randomized, reachable, and culled/simulated by floor',()=>{
  const b=building(),q=new QuarantineChallenge(new T.Scene(),b);assert.equal(q.people.length,40);
  for(let f=0;f<10;f++){q.makeFlow(f,towerPoint(-1,.2+4*f,0));const people=q.people.filter(p=>p.floor===f);assert.equal(people.length,4);for(const p of people)assert.ok(q.flow[q.cellAt(p.p)]>=0);}
  const first=q.people.map(p=>p.p.toArray());q.resetRound();assert.notDeepEqual(q.people.map(p=>p.p.toArray()),first);
  const upstairs=q.people[20].p.clone();for(let n=0;n<120;n++)q.update(1/90,towerPoint(-1,.2,0));assert.ok(q.people[20].p.equals(upstairs));assert.ok(q.mesh.count<=8);q.update(0,V());assert.equal(q.mesh.count,0);
});

test('zombie attacks require reach and visibility; death respawns safely at the entrance',()=>{
  const b=building();let deaths=0,hits=0;const q=new QuarantineChallenge(new T.Scene(),b,{respawn:p=>{deaths++;assert.ok(p.equals(b.spawn));},hit:()=>hits++});
  const p=q.people[0];p.p.copy(towerPoint(-1,.2,.8));p.floor=0;p.speed=0;
  for(let n=0;n<900;n++)q.update(1/90,towerPoint(-1,.2,0));assert.ok(deaths>=1);assert.ok(hits>=4);assert.ok(q.health>0);
  q.invulnerableUntil=q.time+10;const health=q.health;q.damage(25);assert.equal(q.health,health);
  assert.equal(q.lineClear(towerPoint(-6,1.4,0),towerPoint(-6,1.4,4)),false,'apartment wall prevents attacks');
});

test('all kills plus the rooftop award one reward; reset waits ten minutes and an exit',()=>{
  const b=building();let rewards=0;const q=new QuarantineChallenge(new T.Scene(),b,{reward:()=>rewards++});
  q.update(0,b.reward);assert.equal(rewards,0,'roof shortcut cannot bypass the enemies');
  for(const person of q.people)assert.ok(q.hit({person,node:2},V(0,0,-1),150));assert.equal(q.remaining,0);assert.ok(q.npcs.active.length<=6);
  q.update(0,b.reward);q.update(0,b.reward);assert.equal(rewards,1);
  q.time=q.clearedAt+599;q.update(0,b.spawn);assert.equal(q.remaining,0);
  q.time=q.clearedAt+600;q.update(0,towerPoint(0,.2,0));assert.equal(q.remaining,0,'never spawn a new wave around an indoor player');
  q.update(0,b.spawn);assert.equal(q.remaining,40);assert.equal(q.round,2);assert.equal(q.rewarded,false);
});

test('Quest supply pickup, automatic zombie fire, hit feedback, respawn and preserved web reuse',async()=>{
  const h=await questHarness(),{api,sources,poses}=h;api.physics.p.copy(towerPoint(-1,.2,0));api.physics.settings.gravity=0;h.tick();
  const gun=api.supplies[1];gun.p.copy(api.hands[0].position);sources[0].gamepad.buttons[1].pressed=true;h.tick();assert.equal(api.weapons.held[0],gun);
  const enemy=api.challenge.people[0];enemy.p.copy(towerPoint(-1,.2,-1.2));enemy.speed=0;enemy.floor=0;
  // Align the held barrel and place the target directly on its ray in the corridor.
  poses[0].q.setFromAxisAngle(V(1,0,0),Math.PI/4);h.tick();const muzzle=V(0,.038,-.272).applyQuaternion(gun.mesh.quaternion).add(gun.mesh.position);enemy.p.copy(muzzle).add(V(0,-1.36,-.65));
  sources[0].gamepad.buttons[0].pressed=true;for(let n=0;n<35;n++)h.tick();assert.ok(enemy.dead);assert.ok(api.weapons.shots>=3);
  const before=api.physics.p.clone();api.challenge.invulnerableUntil=0;api.challenge.damage(25);h.tick();assert.ok(api.damageMask.visible);assert.equal(api.challenge.health,75);assert.ok(api.physics.p.distanceTo(before)<.1);
  for(let i=0;i<3;i++){api.challenge.invulnerableUntil=0;api.challenge.damage(25);}h.tick();assert.equal(api.challenge.deaths,1);assert.ok(api.physics.p.distanceTo(api.tower.spawn)<.1);assert.equal(api.weapons.held[0],null);
  sources[0].gamepad.buttons[0].pressed=false;sources[0].gamepad.buttons[1].pressed=false;h.tick();h.aim(0,towerPoint(-10,7,0));sources[0].gamepad.buttons[0].pressed=true;h.tick();assert.ok(api.flights[0].active);assert.equal(api.vrHUD.visible,false);
  api.pause(true);api.pause(false);sources[0].gamepad.buttons[0].pressed=false;h.tick();
  for(const person of api.challenge.people)if(!person.dead)api.challenge.hit({person,node:2},V(0,0,-1),150);
  api.physics.p.copy(towerPoint(-3,40.2,.9));api.physics.v.set(0,0,0);h.tick();
  const reward=api.weapons.items.find(i=>i.name==='WARDEN · GOLD REWARD');assert.ok(reward);assert.equal(reward.damage,150);assert.ok(reward.automatic);
  sources[0].gamepad.buttons[1].pressed=true;h.tick();assert.equal(api.weapons.held[0],reward,'rooftop pedestal permits actual hand pickup');
});
