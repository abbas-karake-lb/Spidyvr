import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../docs/vendor/three.module.min.js';
import {createCity} from '../docs/city.js';
import {Movement,V} from '../docs/physics.js';
// Canvas paint operations are irrelevant to this geometry/performance test.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){}})})};
test('city provides a solid spawn roof, over 100 buildings, and batched geometry',()=>{
  const scene=new T.Scene(),city=createCity(scene);assert.ok(city.buildingCount>100);assert.ok(scene.children.length<40);
  const spawn=city.boxes.find(b=>b.containsPoint(new T.Vector3(0,31,0)));assert.ok(spawn);assert.equal(spawn.max.y,32);
  let draws=0,triangles=0;for(const mesh of scene.children){assert.ok(mesh.geometry);draws+=Array.isArray(mesh.material)?mesh.material.length:1;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.count||1);}
  assert.ok(draws<65);assert.ok(triangles<150000);console.log({buildings:city.buildingCount,draws,triangles});
  const p=new Movement(city.boxes);p.p.set(22,40,22);p.attach(0,V(12,65,0));p.attach(1,V(44,70,12));const start=performance.now();for(let i=0;i<1800;i++)p.step(1/180);console.log('10 seconds of city physics simulated in',Math.round(performance.now()-start),'ms');
});
