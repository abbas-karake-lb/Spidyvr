import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../docs/vendor/three.module.min.js';
import {questHarness} from './quest-harness.js';
import {applyFacadeAtlas,visualQuality} from '../docs/city-quality.js';
import {vehicleModel,personModel} from '../docs/city-models.js';

test('quality preset retains gameplay state, has real shadow receivers and consistent visible/depth character poses',async()=>{
  const h=await questHarness(),{api}=h;h.tick();
  const sun=api.scene.children.find(o=>o.isDirectionalLight);
  assert.ok(sun.castShadow);assert.equal(sun.shadow.mapSize.x,2048);
  assert.equal(api.scene.getObjectByName('baked-street-shadows'),undefined);
  assert.ok(api.scene.getObjectByName('buildings0').castShadow);
  assert.ok(api.scene.getObjectByName('buildings0').receiveShadow);
  assert.ok(api.scene.getObjectByName('leaves').material.alphaTest>.4);
  assert.ok(api.scene.getObjectByName('leaves').customDepthMaterial);
  for(const name of ['people-near','leaves']){
    const mesh=api.scene.getObjectByName(name),visible={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader},depth={uniforms:{},vertexShader:T.ShaderLib.depth.vertexShader,fragmentShader:T.ShaderLib.depth.fragmentShader};
    mesh.material.onBeforeCompile(visible);mesh.customDepthMaterial.onBeforeCompile(depth);
    const key=name==='people-near'?'npcPose':'cityTime';assert.equal(visible.uniforms[key].value,depth.uniforms[key].value);
    assert.ok(depth.vertexShader.includes(name==='people-near'?'rotateBone(boneData':'transformed.x += sin'));
    assert.ok(!depth.vertexShader.includes('vColor.rgb'),'depth shader must not need absent color varyings');
  }
  const lightDirection=sun.position.clone().sub(sun.target.position).normalize();assert.ok(lightDirection.dot(new T.Vector3(-.53,.225,.82).normalize())>.9999);
  const before=api.physics.v.clone();api.quality.update(new T.Vector3(140,160,-60));assert.deepEqual(api.physics.v.toArray(),before.toArray());
  assert.ok(sun.position.toArray().every(Number.isFinite));assert.equal(api.vrHUD.visible,false);
});

test('facade atlas slices distinct styles into isolated repeating mipmapped PBR maps',()=>{
  const calls=[];globalThis.document={createElement:()=>({getContext:()=>({drawImage(...args){calls.push(args.slice(1,5));},fillRect(){},set fillStyle(v){}})})};
  const scene=new T.Scene(),materials=[];
  for(let type=0;type<4;type++){const material=new T.MeshStandardMaterial();material.userData.facade={type,rows:[8,13,20,29][type]};materials.push(material);scene.add(new T.Mesh(new T.BoxGeometry(),material));}
  assert.equal(applyFacadeAtlas(scene,{width:1254,height:1254}),4);
  assert.deepEqual(calls,[[0,0,627,627],[627,0,627,627],[0,627,627,627],[627,627,627,627]]);
  for(const [i,m] of materials.entries()){assert.equal(m.map.repeat.x,2);assert.equal(m.map.repeat.y,[8,13,20,29][i]/4);assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.map.generateMipmaps,true);assert.equal(m.roughnessMap.repeat.y,m.map.repeat.y);assert.equal(m.bumpMap,m.map);}
  assert.equal(new Set(materials.map(m=>m.map.image)).size,4);
});

test('authored vehicle surfaces keep outward normals and semantic material channels; assets are real WebP files',()=>{
  for(let type=0;type<5;type++)for(const lod of [false,true]){
    const g=vehicleModel(type,lod);for(const a of Object.values(g.attributes))assert.ok(a.array.every(Number.isFinite));
    assert.ok(g.attributes.surface.array.includes(0));assert.ok(g.attributes.surface.array.includes(1));assert.ok(g.attributes.surface.array.includes(2));
    // A closed body with outward triangle winding has positive signed volume.
    let volume=0;const p=g.attributes.position,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    for(let i=0;i<276;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);volume+=a.dot(b.cross(c))/6;}
    assert.ok(volume>0,'lofted car body must face outward');
  }
  const human=personModel();assert.ok(human.attributes.position.count>10000);assert.ok(human.attributes.limb.array.every(l=>l>=0&&l<15));
  for(const name of ['facades-real','coastal-sky']){const bytes=readFileSync(new URL('../docs/assets/'+name+'.webp',import.meta.url));assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length>100000);assert.ok(bytes.length<600000);}
  assert.ok(visualQuality.framebufferScale>1);assert.ok(visualQuality.architectureRange>=140);
});
