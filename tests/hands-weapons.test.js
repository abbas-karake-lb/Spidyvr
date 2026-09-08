import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../docs/vendor/three.module.min.js';
import {AnimatedHand} from '../docs/hands.js';
import {WebVisual} from '../docs/web-visual.js';
import {Weapons} from '../docs/weapons.js';
import {NPCPhysics} from '../docs/npc-physics.js';
import {questHarness} from './quest-harness.js';
const V=(...v)=>new T.Vector3(...v),buffer=side=>{const b=readFileSync(new URL('../docs/assets/hands/'+side+'.glb',import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};

test('real hand assets skin correctly, mirror anatomy and form independent web and gun gestures',()=>{
  for(const side of [0,1]){
    const h=new AnimatedHand(side).install(buffer(side?'right':'left')),mesh=h.model.mesh;
    assert.equal(mesh.geometry.attributes.position.count,1360);assert.equal(mesh.skeleton.bones.length,25);
    const points=new Map();for(const hz of [72,90,120]){
      h.curls.fill(0);for(let i=0;i<hz;i++)h.update(1/hz,{web:true,trigger:1});
      const index=h.model.rest.get('index-finger-tip').bone.position,middle=h.model.rest.get('middle-finger-tip').bone.position,pinky=h.model.rest.get('pinky-finger-tip').bone.position;
      assert.ok(index.z<-.15&&pinky.z<-.12);assert.ok(middle.y<-.055&&middle.z>-.09);points.set(hz,middle.clone());
    }
    assert.ok(points.get(72).distanceTo(points.get(120))<1e-7);
    for(let i=0;i<50;i++)h.update(1/90,{gun:true,trigger:1,grip:1});assert.equal(h.pose,'gun');assert.ok(h.curls[0]>.85);
    for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=V().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,p);assert.ok(p.toArray().every(Number.isFinite));assert.ok(p.length()<.5);}
  }
});

test('braided web curves and settles without moving either endpoint or changing source state',()=>{
  const web=new WebVisual(0),from=V(1,4,2),to=V(12,10,-60),copy=to.clone();
  for(const length of [2,50,170]){to.copy(from).add(V(0,0,-length));web.update(from,to,{dt:1/90,flight:true,progress:.4});assert.ok(web.centers[0].equals(from));assert.ok(web.centers.at(-1).equals(to));assert.ok(web.centers.some(p=>Math.abs(p.x-from.x)>.001));assert.ok(web.geometry.attributes.position.array.every(Number.isFinite));}
  to.copy(copy);web.update(from,to,{dt:1/90,restLength:90,impact:true});const middle=web.centers[28];assert.ok(middle.y<(from.y+to.y)/2);assert.ok(web.centers.at(-1).equals(copy));assert.ok(from.equals(V(1,4,2)));
});

function setup(boxes=[]){
  const person={id:0,p:V(0,.18,-5),scale:1,yaw:0,dead:false},npcs=new NPCPhysics([person],boxes),scene=new T.Scene(),weapons=new Weapons(scene,boxes,npcs);
  const item=weapons.items[0];item.p.set(0,1.5,0);item.home.copy(item.p);
  const input={position:item.p.clone(),quaternion:new T.Quaternion(),direction:V(0,0,-1),delta:V(),bodyVelocity:V(),grip:true,trigger:false,dt:1/90};weapons.input(0,input);
  return {weapons,npcs,person,input};
}
test('gun hits kill directionally, corpses stay down, walls occlude bullets and simulation remains bounded',()=>{
  const base=new T.Box3(V(-4,0,20),V(4,3,26)),s=setup([base]);
  assert.equal(s.weapons.held[0],s.weapons.items[0]);s.weapons.input(0,{...s.input,trigger:true});assert.ok(s.person.dead);assert.ok(s.person.ragdoll.nodes[1].v.z<0);
  for(let i=0;i<900;i++)s.npcs.step(1/90,V());if(s.person.ragdoll)s.npcs.retire(s.person.ragdoll);assert.ok(s.person.corpsePose);assert.ok(s.npcs.position(s.person,2).y<1.3);
  const wall=new T.Box3(V(-2,0,-3),V(2,4,-2)),blocked=setup([base,wall]);blocked.weapons.input(0,{...blocked.input,trigger:true});assert.equal(blocked.person.dead,false);
  for(let i=1;i<22;i++){const p={id:i,p:V(i,.18,-5),scale:1,yaw:0};s.npcs.people.push(p);assert.ok(s.npcs.kill(p,1,V(0,0,-4)));assert.ok(s.npcs.active.length<=12);}
});

test('Quest flow: grip pickup, trigger fire, other-hand web, throw, immediate web reuse and pause cleanup',async()=>{
  const h=await questHarness(),{api,sources,poses}=h;h.tick();
  const item=api.weapons.items[0];item.p.copy(api.hands[0].position);item.home.copy(item.p);
  sources[0].gamepad.buttons[1].pressed=true;h.tick();assert.equal(api.weapons.held[0],item);assert.equal(api.physics.ropes[0],null);assert.equal(api.hands[0].pose,'gun');
  const victim=api.city.life.people[0];victim.p.set(-.25,32,-5);api.city.npcs.activate(victim);h.aim(0,api.city.npcs.position(victim,1));
  sources[0].gamepad.buttons[0].pressed=true;h.tick();assert.ok(victim.dead);assert.equal(api.weapons.shots,1);assert.equal(api.flights[0].active,false);
  const tall=api.city.boxes.find(b=>b.max.y>60&&b.min.z< -20&&b.max.z> -80&&b.min.x<15&&b.max.x> -15),target=V((tall.min.x+tall.max.x)/2,55,tall.max.z);
  h.aim(1,target);sources[1].gamepad.buttons[0].pressed=true;for(let i=0;i<20;i++)h.tick();assert.ok(api.physics.ropes[1]);assert.equal(api.weapons.shots,1,'holding trigger must not create uncontrolled repeated shots');
  poses[0].p.x+=.08;h.tick();sources[0].gamepad.buttons[1].pressed=false;poses[0].p.x+=.08;h.tick();assert.equal(api.weapons.held[0],null);assert.ok(item.v.x>1);assert.equal(api.flights[0].active,false,'dropping with a held trigger cannot accidentally fire a web');
  sources[0].gamepad.buttons[0].pressed=false;h.tick();h.aim(0,target);sources[0].gamepad.buttons[0].pressed=true;h.tick();assert.ok(api.flights[0].active);assert.equal(api.hands[0].pose,'web');
  api.pause(true);assert.equal(api.weapons.held.filter(Boolean).length,0);assert.ok(api.weapons.effects.every(e=>!e.line.visible&&!e.flash.visible));assert.ok(api.vrHUD.visible);api.pause(false);assert.equal(api.vrHUD.visible,false);
});

test('dual gun ownership, tracking loss and safety releases do not duplicate pickups or invent throws',async()=>{
  const h=await questHarness(),{api,sources}=h;h.tick();for(let i=0;i<2;i++){api.weapons.items[i].p.copy(api.hands[i].position);api.weapons.items[i].home.copy(api.hands[i].position);sources[i].gamepad.buttons[1].pressed=true;}h.tick();assert.ok(api.weapons.held[0]);assert.ok(api.weapons.held[1]);assert.notEqual(api.weapons.held[0],api.weapons.held[1]);
  const first=api.weapons.held[0];api.weapons.velocities[0].set(30,20,10);h.session.inputSources=[sources[1]];h.tick();assert.equal(api.weapons.held[0],null);assert.ok(first.v.length()<1);assert.ok(api.weapons.held[1]);
  h.session.visibilityState='hidden';h.tick();assert.equal(api.weapons.held[1],null);assert.equal(api.weapons.shots,0);
  h.session.visibilityState='visible';h.tick();assert.equal(api.weapons.held[1],null,'resume requires a fresh grip press');
});
