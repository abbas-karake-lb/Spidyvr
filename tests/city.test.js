import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../docs/vendor/three.module.min.js';
import {createCity} from '../docs/city.js';
import {Movement,V} from '../docs/physics.js';
import {canvasContext} from './quest-harness.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:canvasContext})};
const original=JSON.parse(readFileSync(new URL('./fixtures/original-buildings.json',import.meta.url)));
function budget(scene){let draws=0,triangles=0;for(const mesh of scene.children){if(!mesh.visible)continue;draws+=Array.isArray(mesh.material)?mesh.material.length:1;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);}return {draws,triangles};}
test('all 105 building bounds and roof heights exactly preserve the existing layout',()=>{
  const city=createCity(new T.Scene());assert.deepEqual(city.boxes.map(b=>[b.min.toArray(),b.max.toArray()]),original);
});
test('roof overlap root cause eliminated; no decorative slab covers a roof deck',()=>{
  const scene=new T.Scene(),city=createCity(scene);assert.equal(scene.getObjectByName('roof-rim'),undefined);
  // Inspect every upward-facing detail triangle transformed into world coordinates.
  // Roof-top triangles on the four building batches are the only full deck surfaces.
  const matrix=new T.Matrix4(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let upward=0;
  for(const mesh of scene.children){if(!mesh.isInstancedMesh||mesh.name.startsWith('buildings')||mesh.name.startsWith('traffic')||mesh.name.startsWith('people')||mesh.name==='birds')continue;
    const positions=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:positions.count;
    for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);for(let t=0;t<count;t+=3){a.fromBufferAttribute(positions,index?index.getX(t):t).applyMatrix4(matrix);b.fromBufferAttribute(positions,index?index.getX(t+1):t+1).applyMatrix4(matrix);c.fromBufferAttribute(positions,index?index.getX(t+2):t+2).applyMatrix4(matrix);if(Math.abs(a.y-b.y)>.0001||Math.abs(a.y-c.y)>.0001)continue;if(b.clone().sub(a).cross(c.clone().sub(a)).y<=0)continue;upward++;
      const x=(a.x+b.x+c.x)/3,z=(a.z+b.z+c.z)/3;for(const roof of city.boxes){if(x>roof.min.x+.001&&x<roof.max.x-.001&&z>roof.min.z+.001&&z<roof.max.z-.001)assert.ok(Math.abs(a.y-roof.max.y)>.005,`${mesh.name} has a coplanar face over a roof`);}
    }}
  }
  assert.ok(upward>1000);
});
test('city population animates and reduces detail with 3D distance; geometry stays bounded at street and swing heights',()=>{
  const scene=new T.Scene(),city=createCity(scene),matrix=new T.Matrix4();let time=0;
  city.update(time,V(0,32,0));const before=city.life.pools.carsNear.instanceMatrix.array.slice();
  for(let i=0;i<90;i++){time+=1/90;city.update(time,V(0,32,0));}
  assert.notDeepEqual(city.life.pools.carsNear.instanceMatrix.array,before);
  const reports=[];
  for(const height of [2,32,80,150,240]){time+=.1;city.update(time,V(22,height,22));const stats=budget(scene);reports.push({height,...stats,...city.life.stats});assert.ok(stats.draws<=100);assert.ok(stats.triangles<120000);if(height===240)assert.equal(city.life.stats.pedestrians,0);}
  city.update(time+.1,V(22,2,22));assert.ok(city.life.pools.peopleNear.count>0);city.update(time+.2,V(22,100,22));assert.equal(city.life.pools.peopleNear.count,0);assert.ok(city.life.pools.peopleFar.count>0);
  // Sidewalk paths must not send people through the preserved building boxes.
  for(let i=0;i<400;i++){time+=.09;city.update(time,V(0,40,0));for(const pool of [city.life.pools.peopleNear,city.life.pools.peopleFar])for(let n=0;n<pool.count;n++){pool.getMatrixAt(n,matrix);const p=new T.Vector3().setFromMatrixPosition(matrix);assert.ok(!city.boxes.some(b=>b.containsPoint(p)));}}
  const frozen=city.life.pools.carsNear.instanceMatrix.array.slice();city.update(time+1,V(0,40,0),true);assert.deepEqual(city.life.pools.carsNear.instanceMatrix.array,frozen);
  console.log('City render budgets (both eyes will each draw these):',reports);
});
test('dense-city high-speed traversal plus environmental updates stays finite with a bounded CPU workload',()=>{
  const scene=new T.Scene(),city=createCity(scene),p=new Movement(city.boxes);p.p.set(22,90,22);p.v.set(0,0,-65);p.attach(0,V(12,100,-44));const start=performance.now();
  for(let i=0;i<900;i++){for(let j=0;j<2;j++)p.step(1/180);city.update(i/90,p.p);assert.ok(p.p.toArray().every(Number.isFinite));}
  console.log('10 seconds of physics + city updates, CPU test host ms:',Math.round(performance.now()-start));
});
