import * as T from './vendor/three.module.min.js';

// Quality-first preset. These affect rendering only; physics and city generation stay separate.
export const visualQuality=Object.freeze({framebufferScale:1.15,foveation:.35,shadowSize:2048,shadowSpan:210,architectureRange:140,vehicleRange:125,crowdRange:75,crowdCapacity:64,anisotropy:8});

// Layered leaf sprays replace solid low-poly crowns, with a shared alpha-tested material.
export function foliageCrown(){
  const c=canvas(256),ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);
  let seed=218;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let branch=0;branch<5;branch++){
    const bx=60+rand()*136,by=45+rand()*135;ctx.strokeStyle='#6a7350';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(128,236);ctx.lineTo(bx,by);ctx.stroke();
    for(let j=0;j<8;j++){const t=j/8,x=128+(bx-128)*t,y=236+(by-236)*t,angle=rand()*Math.PI*2;ctx.save();ctx.translate(x+(rand()-.5)*25,y);ctx.rotate(angle);ctx.fillStyle=['#9da877','#77875a','#b7bf85','#849866'][Math.floor(rand()*4)];ctx.beginPath();ctx.ellipse(0,0,8+rand()*5,19+rand()*7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(218,222,167,.45)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(0,18);ctx.stroke();ctx.restore();}
  }
  const map=texture(c);map.colorSpace=T.SRGBColorSpace;
  const positions=[],uvs=[],normals=[],matrix=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),point=new T.Vector3(),normal=new T.Vector3();
  for(let i=0;i<38;i++){
    const az=rand()*Math.PI*2,latitude=Math.acos(rand()*2-1),radius=.3+rand()*.6,scale=.5+rand()*.35;
    q.setFromEuler(e.set((rand()-.5)*2,az,(rand()-.5)*2));matrix.compose(new T.Vector3(Math.sin(latitude)*Math.cos(az)*radius,Math.cos(latitude)*radius,Math.sin(latitude)*Math.sin(az)*radius),q,new T.Vector3(scale,scale,scale));normal.set(0,0,1).applyQuaternion(q);
    for(const [x,y,u,v] of [[-.5,-.5,0,0],[.5,-.5,1,0],[.5,.5,1,1],[-.5,-.5,0,0],[.5,.5,1,1],[-.5,.5,0,1]]){point.set(x,y,0).applyMatrix4(matrix);positions.push(...point);normals.push(...normal);uvs.push(u,v);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();
  return {geometry,material:new T.MeshStandardMaterial({map,color:0xb9c49b,alphaTest:.48,side:T.DoubleSide,roughness:.91,metalness:0})};
}

function canvas(size){const c=document.createElement('canvas');c.width=c.height=size;return c;}
function texture(c,repeat=1){const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=8;return t;}
const surfaceCache=new Map();
export function surfaceMaterial(kind){
  if(surfaceCache.has(kind))return surfaceCache.get(kind);
  const c=canvas(512),ctx=c.getContext('2d'),height=canvas(512),h=height.getContext('2d');
  let seed=731;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const base=kind==='asphalt'?[64,66,65]:kind==='roof'?[129,130,121]:[172,166,153];
  ctx.fillStyle=`rgb(${base})`;ctx.fillRect(0,0,512,512);h.fillStyle='#999';h.fillRect(0,0,512,512);
  for(let i=0;i<40000;i++){const x=rand()*512,y=rand()*512,n=(rand()-.5)*42;ctx.fillStyle=`rgb(${base.map(v=>Math.round(v+n))})`;ctx.fillRect(x,y,1+rand()*2,1+rand()*2);h.fillStyle=rand()>.5?'#b9b9b9':'#777';h.fillRect(x,y,1,1);}
  if(kind!=='asphalt'){
    const step=kind==='roof'?128:64;
    for(let y=0;y<512;y+=step){ctx.fillStyle='rgba(44,49,47,.22)';ctx.fillRect(0,y,512,2);h.fillStyle='#222';h.fillRect(0,y,512,2);
      for(let x=0;x<512;x+=step*2){const off=(y/step%2)*step;ctx.fillRect(x+off,y,2,step);h.fillRect(x+off,y,2,step);}}
  }else{
    ctx.strokeStyle='rgba(24,28,28,.4)';ctx.lineWidth=1.4;h.strokeStyle='#333';h.lineWidth=1.4;
    for(let k=0;k<6;k++){let x=rand()*512,y=rand()*512;for(const brush of [ctx,h]){brush.beginPath();brush.moveTo(x,y);}for(let i=0;i<8;i++){x+=(rand()-.5)*25;y+=rand()*12;for(const brush of [ctx,h])brush.lineTo(x,y);}ctx.stroke();h.stroke();}
  }
  const map=texture(c,kind==='asphalt'?64:kind==='roof'?5:5),bump=texture(height,map.repeat.x);map.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshStandardMaterial({map,bumpMap:bump,bumpScale:kind==='asphalt'?.028:.055,roughness:kind==='roof'?.87:.94,metalness:.02});
  material.name='pbr-'+kind;surfaceCache.set(kind,material);return material;
}

// Decode the atlas once. Independent mip chains prevent other facades bleeding across tile edges.
export function applyFacadeAtlas(scene,image){
  const materials=new Set();scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.userData.facade)materials.add(m);});
  for(const m of materials){
    const {type,rows}=m.userData.facade,size=Math.floor(image.width/2),tile=canvas(size),ctx=tile.getContext('2d');
    ctx.drawImage(image,(type%2)*size,Math.floor(type/2)*size,size,size,0,0,size,size);
    const map=texture(tile);map.repeat.set(2,rows/4);map.colorSpace=T.SRGBColorSpace;
    const mask=canvas(size),mc=mask.getContext('2d');mc.fillStyle=type<2?'#ececec':'#555';mc.fillRect(0,0,size,size);
    // Glass has a smooth specular response; masonry keeps a broad rough response.
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){const cell=size/4;mc.fillStyle=type<2?'#454545':'#333';mc.fillRect((x+.2)*cell,(y+.15)*cell,cell*.57,cell*.68);}
    const roughness=texture(mask);roughness.repeat.copy(map.repeat);
    m.map?.dispose();m.map=map;m.roughnessMap=roughness;m.bumpMap=map;m.bumpScale=type<2?.035:.014;m.roughness=1;m.metalness=type<2?.06:.48;m.envMapIntensity=type<2?.7:1.25;m.needsUpdate=true;
  }
  return materials.size;
}

export function configureCityRendering(renderer,scene,sun,city){
  const remap=new Map(),hasGraphics=!!renderer.isWebGLRenderer;
  scene.traverse(o=>{
    if(!o.isMesh||!o.material)return;
    const convert=m=>{
      if(!m.isMeshLambertMaterial&&!m.isMeshPhongMaterial)return m;
      if(remap.has(m))return remap.get(m);
      const n=new T.MeshStandardMaterial({color:m.color,map:m.map,vertexColors:m.vertexColors,roughness:.72,metalness:.08,side:m.side,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite,alphaTest:m.alphaTest});
      n.onBeforeCompile=m.onBeforeCompile;n.customProgramCacheKey=m.customProgramCacheKey.bind(m);n.name=m.name;remap.set(m,n);return n;
    };
    o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    const excluded=/^(sky|harbor-water|waterfront-and-horizon|actor-contact|baked-street|people-far|traffic-far|parked-far|birds|dogs|distant-aircraft)/.test(o.name);
    o.receiveShadow=!excluded;
    o.castShadow=!excluded&&!!o.name;
    // Character shadow vertices must follow the same joints as the visible body.
    if(o.name==='people-near'||o.name==='leaves'){
      o.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:o.material.map,alphaTest:o.material.alphaTest,side:o.material.side});
      o.customDepthMaterial.onBeforeCompile=o.material.onBeforeCompile;
      o.customDepthMaterial.customProgramCacheKey=()=> o.name+'-shadow-v2';
    }
  });
  // Replace the old projected polygons with proper depth-tested building shadows.
  const baked=scene.getObjectByName('baked-street-shadows');if(baked){scene.remove(baked);baked.geometry.dispose();baked.material.dispose();}
  sun.castShadow=true;sun.shadow.mapSize.set(visualQuality.shadowSize,visualQuality.shadowSize);
  Object.assign(sun.shadow.camera,{left:-visualQuality.shadowSpan/2,right:visualQuality.shadowSpan/2,top:visualQuality.shadowSpan/2,bottom:-visualQuality.shadowSpan/2,near:1,far:520});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00012;sun.shadow.normalBias=.13;sun.shadow.radius=2;
  scene.add(sun.target);
  if(renderer.shadowMap){renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;}
  const direction=new T.Vector3(-.53,.225,.82).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right).normalize(),target=new T.Vector3(),last=new T.Vector3(Infinity,0,0),step=visualQuality.shadowSpan/visualQuality.shadowSize;
  const status={facades:'pending',sky:'pending'};
  // Node gameplay tests use an explicit non-WebGL renderer; image/network/GPU work belongs to the browser.
  const ready=hasGraphics?Promise.allSettled([
    new T.TextureLoader().loadAsync('./assets/facades-real.webp').then(t=>{applyFacadeAtlas(scene,t.image);t.dispose();status.facades='ready';}).catch(e=>{status.facades='fallback';console.warn('Facade image unavailable; procedural fallback retained.',e);}),
    new T.TextureLoader().loadAsync('./assets/coastal-sky.webp').then(t=>{t.colorSpace=T.SRGBColorSpace;t.mapping=T.EquirectangularReflectionMapping;scene.environment=t;scene.environmentIntensity=.85;city.sky.sky.material.uniforms.skyImage.value=t;city.sky.sky.material.uniforms.hasSkyImage.value=1;city.sky.water.material.uniforms.skyImage.value=t;city.sky.water.material.uniforms.hasSkyImage.value=1;status.sky='ready';}).catch(e=>{status.sky='fallback';console.warn('Sky image unavailable; procedural sky retained.',e);})
  ]):Promise.resolve();
  return {ready,status,update(viewer){
    target.set(viewer.x,Math.max(32,Math.min(120,viewer.y*.6)),viewer.z);
    // Snap in the sun's image plane, not world axes: stable texels while swinging.
    target.addScaledVector(right,Math.round(target.dot(right)/step)*step-target.dot(right));target.addScaledVector(up,Math.round(target.dot(up)/step)*step-target.dot(up));
    if(target.distanceToSquared(last)>.0001){sun.target.position.copy(target);sun.position.copy(target).addScaledVector(direction,250);sun.target.updateMatrixWorld();last.copy(target);}
  }};
}

export function vehicleMaterial(clock){
  const mat=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.28,metalness:.55,clearcoat:.85,clearcoatRoughness:.16,envMapIntensity:1.25});
  mat.onBeforeCompile=s=>{
    s.vertexShader='attribute float surface;varying float vSurface;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nvSurface=surface;if(surface>.5)vColor.rgb=color;');
    s.fragmentShader='varying float vSurface;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nif(vSurface>.5)roughnessFactor=vSurface<1.5?.94:vSurface<2.5?.1:vSurface<3.5?.2:.28;');
    s.fragmentShader=s.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nif(vSurface>.5)metalnessFactor=vSurface<1.5?0.:vSurface<2.5?.38:vSurface<3.5?.85:.05;');
    s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(vSurface>3.5)totalEmissiveRadiance+=vColor.rgb*.65;');
  };mat.customProgramCacheKey=()=> 'car-surfaces-v2';return mat;
}
