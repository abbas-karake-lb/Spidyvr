import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../docs/vendor/three.module.min.js';
import {createCityLife} from '../docs/city-life.js';
import {canvasContext} from './quest-harness.js';
test('traffic detours at intersections and never crosses the quarantine footprint',()=>{
  globalThis.document={createElement:()=>({getContext:canvasContext})};
  const boxes=JSON.parse(readFileSync(new URL('./fixtures/original-buildings.json',import.meta.url))).map(([a,b])=>new T.Box3(new T.Vector3(...a),new T.Vector3(...b)));
  const life=createCityLife(new T.Scene(),boxes),site=new T.Box3(new T.Vector3(241.8,-1,29.8),new T.Vector3(262.2,45,58.2));Object.assign(life.traffic[0],{horizontal:false,lane:5,sign:1,progress:8,speed:4});life.setTrafficObstacles([site]);
  const viewer=new T.Vector3(0,100,0);let detours=0;
  for(let n=0;n<12000;n++){life.update(n*.05,viewer);for(const car of life.traffic){
    if(car.turn&&car.p.x>234&&car.p.z>10&&car.p.z<70)detours++;
    if(car.p.x<234||car.p.z<22||car.p.z>66)continue;
    const half=car.type===3?4.1:car.type===2?2.6:2.25;
    for(const end of [-half,0,half]){const x=car.p.x-Math.sin(car.angle)*end,z=car.p.z-Math.cos(car.angle)*end;assert.ok(!(x>240.55&&x<263.45&&z>28.55&&z<59.45),`vehicle ${car.id} overlaps site at ${n}`);}
  }}
  assert.ok(detours>0,'traffic keeps turning and circulating');
});
