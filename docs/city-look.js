import * as T from './vendor/three.module.min.js';
import {mergeParts,vehicleModel} from './city-models.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function facadeMaterial(rows,type){
  let seed=103+type*731;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=rows*64;const c=canvas.getContext('2d');
  const spec=document.createElement('canvas');spec.width=512;spec.height=canvas.height;const mask=spec.getContext('2d');mask.fillStyle='#121212';mask.fillRect(0,0,512,canvas.height);
  c.fillStyle=['#8f6954','#c3b9a6','#8c9da0','#738d98'][type];c.fillRect(0,0,512,canvas.height);
  for(let y=0;y<rows;y++){
    if(type===0)for(let row=0;row<8;row++)for(let col=0;col<26;col++){c.fillStyle=random()>.5?'#98755e':'#86634f';c.fillRect(col*20+(row%2)*10,y*64+row*8,19,7);}
    c.fillStyle=type>=2?'#4b626d':'#e2d8c3';c.fillRect(0,y*64+61,512,3);
    for(let x=0;x<8;x++){
      const left=x*64+8,top=y*64+8,w=type>=2?52:44,h=type>=2?50:43;
      c.fillStyle='#37464a';c.fillRect(left-2,top-2,w+4,h+4);
      const grad=c.createLinearGradient(0,top,0,top+h);grad.addColorStop(0,'#91b7c9');grad.addColorStop(.4,'#506f80');grad.addColorStop(1,random()>.83?'#b99c67':'#283d49');c.fillStyle=grad;c.fillRect(left,top,w,h);
      c.fillStyle='rgba(204,224,230,.17)';c.beginPath();c.moveTo(left,top);c.lineTo(left+w*.75,top);c.lineTo(left+w*.25,top+h);c.lineTo(left,top+h);c.fill();
      if(random()>.65){c.fillStyle='#a8aaa0';c.fillRect(left+2,top+1,w-4,8+random()*17);for(let s=0;s<4;s++){c.fillStyle='#858e8c';c.fillRect(left+2,top+3+s*4,w-4,1);}}
      else if(random()>.7){c.fillStyle='#687579';c.fillRect(left+w*.65,top+10,3,h-10);c.fillRect(left+w*.4,top+h-12,w*.5,4);}
      c.fillStyle=type>=2?'#a2b0b1':'#d5c6aa';c.fillRect(left+w/2-1,top,2,h);c.fillRect(left,top+h*.58,w,2);
      c.fillStyle='#343d3b';c.fillRect(left-2,top+h+3,w+4,3);mask.fillStyle='#b0b0b0';mask.fillRect(left,top,w,h);
    }
  }
  const map=new T.CanvasTexture(canvas),specularMap=new T.CanvasTexture(spec);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return new T.MeshPhongMaterial({map,specularMap,specular:0x8a9fa4,shininess:type>=2?65:24});
}
export function upgradeArchitecture(scene,boxes){
  const chunks=new Map(),box=new T.BoxGeometry(1,1,1),round=new T.CylinderGeometry(1,1,1,8),foliage=new T.IcosahedronGeometry(1,1);
  function add(size,at,color,geo=box,rot=[0,0,0]){const key=Math.floor(at[0]/88)+','+Math.floor(at[2]/88);if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push({size,at,color,geo,rot});}
  boxes.forEach((b,index)=>{
    const x=(b.min.x+b.max.x)/2,z=(b.min.z+b.max.z)/2,w=b.max.x-b.min.x,d=b.max.z-b.min.z,h=b.max.y,brick=index%4===0;
    // Four articulated street frontages: glazed storefronts, frames, awnings and lit interiors.
    for(let face=0;face<4;face++){
      const angle=face*Math.PI/2,extent=face%2?d:w;
      const place=(dx,y,dz,size,col)=>{const offset=V(dx,y,dz).applyAxisAngle(V(0,1,0),angle);add(size,[x+offset.x,y,z+offset.z],col,box,[0,angle,0]);};
      const edge=(face%2?w:d)/2;
      for(let n=0;n<3;n++){
        const dx=(n-1)*(extent/3.3);place(dx,1.6,edge+.11,[extent/3.7,2.8,.18],0x263e49);
        place(dx,1.15,edge+.23,[extent/4.2,.09,.09],0xb9aa86);
        place(dx,3.12,edge+.8,[extent/3.4,.17,1.4],[0x617e77,0xa15f46,0xc2ad83][index%3]);
        place(dx-extent/7.4,1.65,edge+.24,[.1,3,.12],0xbab6a8);place(dx+extent/7.4,1.65,edge+.24,[.1,3,.12],0xbab6a8);
        // Warm inset interior goods/shelves; no transparent layers or interior draw pass.
        for(let shelf=0;shelf<3;shelf++)place(dx+(shelf-1)*.6,.7+shelf*.31,edge+.215,[.36,.38,.03],[0xaf915a,0x82918a,0xccb992][shelf]);
      }
      if(brick||index%4===1){
        for(let floor=1;floor<Math.min(9,Math.floor(h/4)-1);floor++)for(const side of [-1,1]){
          const dx=side*extent*.28,y=4+floor*3.7;
          place(dx,y,edge+.65,[3,.16,1.25],0xaaa99b);place(dx,y+.6,edge+1.24,[3,.07,.06],0x42545b);
          for(const rail of [-1,0,1])place(dx+rail*1.35,y+.3,edge+1.24,[.055,.6,.055],0x42545b);
        }
      }else for(const side of [-1,0,1])place(side*extent*.32,h/2,edge+.15,[.16,h-.8,.25],0xb0c1c3);
    }
    // Roof gardens, separate equipment, ducts, skylights, stair towers, aerials.
    add([4.2,.4,3],[x-w*.25,h+.24,z+d*.25],0x5c716c);add([3.6,.5,2.3],[x-w*.25,h+.66,z+d*.25],0x68805a,foliage);
    add([.45,.35,d*.42],[x+w*.25,h+.21,z-d*.08],0x9caaa9);
    for(let n=0;n<2;n++){add([2.1,.65,2.8],[x+w*.23,h+.55,z-d*.26+n*3.3],0xaab2ae);for(let slat=0;slat<4;slat++)add([1.8,.035,.1],[x+w*.23,h+.9,z-d*.26+n*3.3+(slat-1.5)*.5],0x495b61);}
    if(index%4===0){add([2.1,1.1,2.1],[x-w*.25,h+.65,z-d*.24],0x7797a0);add([2.35,.13,2.35],[x-w*.25,h+1.25,z-d*.24],0xc3c7ba);}
    if(index%7===0){add([.07,8,.07],[x+w*.32,h+4,z+d*.28],0x7e8d94);for(const y of [3,5,6])add([2.3,.055,.055],[x+w*.32,h+y,z+d*.28],0x7e8d94);}
  });
  for(let ix=-5;ix<=5;ix++)for(let iz=-5;iz<=5;iz++){
    const x=ix*44,z=iz*44;
    // Curbs, paving seams, bollards, curb gardens, bus shelters and litter baskets.
    for(const sign of [-1,1]){
      add([34,.24,.28],[x,.16,z+sign*16.86],0xd4d0c3);add([.28,.24,34],[x+sign*16.86,.16,z],0xd4d0c3);
      for(const k of [-12,-6,0,6,12]){add([.035,.012,2],[x+k,.171,z+sign*15.7],0x969c97);add([.13,.8,.13],[x+sign*15.2,.57,z+k],0x4a5a60);}
    }
    if((ix+iz)%2===0){
      add([2.2,.5,1.5],[x-12,.42,z+14.5],0xaaa795);add([1.8,.45,1.1],[x-12,.8,z+14.5],0x688559,foliage);
      add([.14,3.4,.14],[x+14,1.9,z-8],0x775d43,round);add([1.3,1.65,1.4],[x+14,4.15,z-8],0x668758,foliage);
      add([.75,1,.75],[x-8,.7,z+14.8],0x536660);add([.85,.08,.85],[x-8,1.25,z+14.8],0x748588);
    }
    if((ix*3+iz)%7===0){
      for(const dx of [-2,2])add([.09,2.5,.09],[x+dx,1.4,z+15.8],0x667b84);
      add([4.7,.16,1.9],[x,2.75,z+15.7],0xb1bcbb);add([4.4,2.2,.08],[x,1.5,z+15],0x809a9d);add([3.3,.17,.55],[x,.7,z+15.45],0x92795d);
      add([.5,2.8,.18],[x+3,1.55,z+15],0x2c5b73);
    }
  }
  const material=new T.MeshPhongMaterial({vertexColors:true,shininess:15,specular:0x303d40}),meshes=[];
  for(const [key,parts] of chunks){const geometry=mergeParts(parts),mesh=new T.Mesh(geometry,material);geometry.computeBoundingBox();mesh.name='architecture-'+key;scene.add(mesh);meshes.push(mesh);}
  return {meshes,update(viewer){for(const mesh of meshes)mesh.visible=mesh.geometry.boundingBox.distanceToPoint(viewer)<65;}};
}
export function atmosphere(scene){
  const clock={value:0};
  const cloudCanvas=document.createElement('canvas');cloudCanvas.width=512;cloudCanvas.height=512;const c=cloudCanvas.getContext('2d');c.clearRect(0,0,512,512);
  let seed=819;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let group=0;group<17;group++){const x=40+rand()*432,y=40+rand()*432;for(let puff=0;puff<12;puff++){const px=x+(rand()-.5)*100,py=y+(rand()-.5)*44,r=10+rand()*26,g=c.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(.55,'rgba(233,239,237,.3)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(px-r,py-r,2*r,2*r);}}
  const clouds=new T.CanvasTexture(cloudCanvas);clouds.wrapS=clouds.wrapT=T.RepeatWrapping;
  const sky=new T.Mesh(new T.SphereGeometry(1000,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{clock,clouds:{value:clouds}},vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`uniform sampler2D clouds;uniform float clock;varying vec3 dir;void main(){vec3 d=normalize(dir);float h=max(0.,d.y);vec3 col=mix(vec3(.73,.79,.79),vec3(.19,.40,.61),pow(h,.55));vec3 sun=normalize(vec3(-.5,.7,.4));float glow=pow(max(0.,dot(d,sun)),12.);col+=vec3(.2,.12,.055)*glow;col+=vec3(.95,.78,.48)*pow(max(0.,dot(d,sun)),1800.);vec2 uv=d.xz/(h+.2)*.16+vec2(clock*.001,0.);float cloud=texture2D(clouds,uv).a*smoothstep(.02,.15,h);col=mix(col,vec3(.92,.93,.9)-texture2D(clouds,uv+vec2(.006)).a*.12,cloud*.92);gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`}));sky.name='sky';sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
  const water=new T.Mesh(new T.PlaneGeometry(2400,2400),new T.ShaderMaterial({uniforms:{clock},vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform float clock;varying vec3 world;void main(){vec2 p=world.xz;vec3 n=normalize(vec3(sin(p.x*.32+clock*1.3)*.055+cos(p.y*.13-clock*.8)*.04,1.,cos(p.y*.29+clock)*.06));vec3 v=normalize(cameraPosition-world);float f=pow(1.-max(0.,dot(v,n)),3.);vec3 col=mix(vec3(.035,.18,.21),vec3(.46,.64,.71),.2+f*.8);float glint=pow(max(0.,dot(reflect(-normalize(vec3(-.5,.7,.4)),n),v)),110.);col+=vec3(.9,.76,.45)*glint*.75;float edge=max(abs(p.x),abs(p.y))-260.;float foam=(1.-smoothstep(0.,3.,abs(edge)))*(.5+.5*sin(p.x*2.+p.y*1.7+clock*2.));col=mix(col,vec3(.69,.78,.74),foam*.32);col=mix(col,vec3(.73,.79,.79),smoothstep(350.,1000.,length(cameraPosition-world)));gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`}));water.rotation.x=-Math.PI/2;water.position.y=-.3;water.name='harbor-water';scene.add(water);
  const parts=[],box=new T.BoxGeometry(1,1,1);const add=(size,at,color,geo=box)=>parts.push({size,at,color,geo});
  // The city becomes a waterfront island, with promenades and piers at its existing edge.
  for(const sign of [-1,1]){
    add([520,.55,10],[0,-.03,sign*255],0xa5aaa2);add([10,.55,500],[sign*255,-.03,0],0xa5aaa2);
    add([520,2,.4],[0,-1,sign*260],0x596b6e);add([.4,2,520],[sign*260,-1,0],0x596b6e);
    for(let k=-220;k<=220;k+=22){add([.15,1,.15],[k,.7,sign*259],0x56666a);add([.15,1,.15],[sign*259,.7,k],0x56666a);}
    add([480,.07,.08],[0,1.17,sign*259],0x788686);add([.08,.07,480],[sign*259,1.17,0],0x788686);
  }
  for(const x of [-180,-80,80,180]){add([7,.5,35],[x,0,276],0x8d7c61);for(const dx of [-2,2])for(const z of [264,280,290])add([.4,3,.4],[x+dx,-.9,z],0x655c4a);}
  const distantGeo=new T.IcosahedronGeometry(1,1);
  for(let i=0;i<16;i++){const angle=i/16*Math.PI*2,x=Math.cos(angle)*850,z=Math.sin(angle)*850;add([150,45+rand()*95,150],[x,10,z],0x839397,distantGeo);}
  for(let i=0;i<80;i++){const x=(rand()-.5)*1100,z=-470-rand()*100,h=12+rand()*58;add([12+rand()*12,h,12+rand()*12],[x,h/2,z],i%2?0x9ca9aa:0x88999e);}
  add([1200,10,220],[0,-6,-510],0x81908a);
  const horizon=new T.Mesh(mergeParts(parts),new T.MeshLambertMaterial({vertexColors:true}));horizon.name='waterfront-and-horizon';scene.add(horizon);
  // Thin, projected afternoon building shadows are baked once onto street level.
  return {sky,water,update(t,viewer){clock.value=t;sky.position.copy(viewer);}};
}
export function bakedShadows(scene,boxes){
  const positions=[];for(const b of boxes){const dx=b.max.y*.42,dz=-b.max.y*.3,y=.004;
    const poly=[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x+dx,b.min.z+dz],[b.min.x+dx,b.min.z+dz],[b.min.x,b.min.z]];
    for(let i=1;i<poly.length-1;i++)positions.push(poly[0][0],y,poly[0][1],poly[i][0],y,poly[i][1],poly[i+1][0],y,poly[i+1][1]);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({color:0x202f3a,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide}));mesh.name='baked-street-shadows';scene.add(mesh);return mesh;
}
