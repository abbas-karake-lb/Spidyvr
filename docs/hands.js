import * as T from './vendor/three.module.min.js';
const V=(...a)=>new T.Vector3(...a),AXIS=V(1,0,0);
// Narrow reader for the bundled, uncompressed MIT generic-hand assets. No runtime CDN.
export function parseHand(buffer,side=0){
  const view=new DataView(buffer),jsonLength=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength))),binary=28+jsonLength;
  const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},types={5121:Uint8Array,5123:Uint16Array,5126:Float32Array};
  function attribute(id){const a=json.accessors[id],b=json.bufferViews[a.bufferView],ArrayType=types[a.componentType];if(!ArrayType||b.byteStride)throw Error('Unsupported hand asset layout');return new T.BufferAttribute(new ArrayType(buffer.slice(binary+(b.byteOffset||0)+(a.byteOffset||0),binary+(b.byteOffset||0)+(a.byteOffset||0)+a.count*sizes[a.type]*ArrayType.BYTES_PER_ELEMENT)),sizes[a.type]);}
  const primitive=json.meshes[0].primitives[0],geometry=new T.BufferGeometry();
  for(const [key,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',JOINTS_0:'skinIndex',WEIGHTS_0:'skinWeight'}))geometry.setAttribute(name,attribute(primitive.attributes[key]));
  geometry.setIndex(attribute(primitive.indices));
  const skin=json.skins[0],wrist=json.nodes.find(n=>n.name==='wrist'),origin=V(...wrist.translation),inverse=new T.Quaternion(...wrist.rotation).invert(),transform=new T.Matrix4().makeRotationFromQuaternion(inverse);transform.setPosition(origin.clone().negate().applyQuaternion(inverse));geometry.applyMatrix4(transform);
  const material=new T.MeshStandardMaterial({color:side?0x39748e:0xb4262d,roughness:.59,metalness:.08});
  // Fine fabric weave and restrained seams, with geometry supplying the actual anatomy.
  material.onBeforeCompile=s=>{s.vertexShader='varying vec3 glovePoint;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nglovePoint=position;');s.fragmentShader='varying vec3 glovePoint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat weave=1.+.04*sin(glovePoint.x*3400.)*sin(glovePoint.z*3400.)*(1.-smoothstep(.6,2.,max(fwidth(glovePoint.x),fwidth(glovePoint.z))*3400.));float seam=pow(abs(sin(glovePoint.z*155.+glovePoint.x*70.)),32.);diffuseColor.rgb*=weave*(1.-seam*.22);');};material.customProgramCacheKey=()=> 'controller-glove-v1';
  const mesh=new T.SkinnedMesh(geometry,material),bones=skin.joints.map(id=>{const n=json.nodes[id],b=new T.Bone();b.name=n.name;b.position.copy(V(...n.translation).sub(origin).applyQuaternion(inverse));b.quaternion.copy(inverse).multiply(new T.Quaternion(...n.rotation));mesh.add(b);return b;});
  mesh.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));mesh.frustumCulled=false;mesh.receiveShadow=true;
  const rest=new Map(bones.map(b=>[b.name,{bone:b,p:b.position.clone(),q:b.quaternion.clone()}]));
  return {mesh,rest};
}
export class AnimatedHand extends T.Group {
  constructor(side){
    super();this.side=side;this.curls=[.14,.2,.24,.28,.12];this.pose='relaxed';this.model=null;
    this.wrist=new T.Group();this.wrist.position.set(0,.035,.06);
    // The asset has its palm along -Y. Controller grips need inward-facing palms:
    // left +X / right -X, with both thumbs up. Roll only the cosmetic model,
    // leaving the tracked root, aim, web emitter and measured hand motion intact.
    this.wrist.rotation.z=side?-Math.PI/2:Math.PI/2;this.add(this.wrist);
    // Anatomical fallback remains usable if a local asset request fails.
    const fallback=new T.Group(),mat=new T.MeshStandardMaterial({color:side?0x39748e:0xb4262d,roughness:.6}),geo=new T.SphereGeometry(1,12,8);
    const part=(size,p)=>{const m=new T.Mesh(geo,mat);m.scale.fromArray(size);m.position.fromArray(p);fallback.add(m);};part([.044,.02,.05],[0,0,-.045]);
    for(let f=0;f<4;f++)part([.009,.01,.039],[(f-1.5)*.021,0,-.118+(f===3?.016:0)]);part([.012,.015,.028],[side?-.054:.054,-.015,-.057]);this.wrist.add(fallback);this.fallback=fallback;
    const cuff=new T.Mesh(new T.CylinderGeometry(.032,.035,.044,16),new T.MeshStandardMaterial({color:0x223747,roughness:.45,metalness:.45}));cuff.rotation.x=Math.PI/2;cuff.position.set(0,.035,.07);this.add(cuff);
    this.emitter=new T.Mesh(new T.SphereGeometry(.009,12,8),new T.MeshStandardMaterial({color:0xd2e1e2,metalness:.85,roughness:.2,emissive:0x244842}));this.emitter.position.set(0,.05,-.015);this.add(this.emitter);
  }
  install(buffer){this.model=parseHand(buffer,this.side);this.wrist.remove(this.fallback);this.wrist.add(this.model.mesh);this.animate(0);return this;}
  async load(){try{const r=await fetch('./assets/hands/'+(this.side?'right':'left')+'.glb');if(!r.ok)throw Error(r.status);this.install(await r.arrayBuffer());}catch(e){console.warn('Hand asset unavailable; anatomical fallback retained.',e);}return this;}
  update(dt,{trigger=0,grip=0,web=false,gun=false,grab=false,touch=false,flash=0}={}){
    this.pose=gun?'gun':web?'web':grip>.5||grab?'fist':touch?'point':'relaxed';
    const target=gun?[.35+trigger*.55,.9,.94,.97,.65]:web?[.02,.99,.99,.04,.15]:[Math.max(.14,trigger*.95,touch?.3:0),.2+grip*.8,.24+grip*.76,.28+grip*.72,.12+grip*.65];
    if(grab&&!gun&&!web)target.fill(.92);const t=1-Math.exp(-28*Math.max(0,dt));for(let i=0;i<5;i++)this.curls[i]+=(target[i]-this.curls[i])*t;
    this.emitter.scale.setScalar(1+flash*14);this.animate(dt);
  }
  animate(){
    if(!this.model)return;const {rest}=this.model;
    for(const r of rest.values()){r.bone.position.copy(r.p);r.bone.quaternion.copy(r.q);}
    const names=['index-finger','middle-finger','ring-finger','pinky-finger','thumb'];
    names.forEach((name,f)=>{
      const labels=f===4?['metacarpal','phalanx-proximal','phalanx-distal','tip']:['metacarpal','phalanx-proximal','phalanx-intermediate','phalanx-distal','tip'];
      const chain=labels.map(l=>rest.get(name+'-'+l)),curl=this.curls[f],q=new T.Quaternion();
      for(let j=1;j<chain.length;j++){
        const r=chain[j],previous=chain[j-1];r.bone.position.copy(previous.bone.position).add(r.p.clone().sub(previous.p).applyQuaternion(q));
        if(f===4){q.setFromEuler(new T.Euler(-curl*.4,curl*(this.side?-.8:.8),curl*(this.side?.2:-.2)));}
        else if(j<chain.length-1)q.multiply(new T.Quaternion().setFromAxisAngle(AXIS,-curl*[0,1.1,1.25,.72][j]));
        r.bone.quaternion.copy(q).multiply(r.q);
      }
    });
    this.model.mesh.updateMatrixWorld(true);this.model.mesh.skeleton.update();
  }
}
