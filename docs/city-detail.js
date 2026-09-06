import * as T from './vendor/three.module.min.js';
// Extra detail uses a separate seed so decoration cannot alter the established city layout.
export function enrichCity(scene,boxes,add,boxGeo){
  let seed=3918;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const stone=new T.MeshLambertMaterial({color:0xc4c1b6}),dark=new T.MeshLambertMaterial({color:0x34444d}),metal=new T.MeshLambertMaterial({color:0x919e9e}),wood=new T.MeshLambertMaterial({color:0x88664c}),glass=new T.MeshLambertMaterial({color:0x344f60});
  const tube=new T.CylinderGeometry(1,1,1,8),cone=new T.ConeGeometry(1,1,8),lamp=new T.MeshBasicMaterial({color:0xffdf99});
  boxes.forEach((b,index)=>{
    const x=(b.min.x+b.max.x)/2,z=(b.min.z+b.max.z)/2,w=b.max.x-b.min.x,d=b.max.z-b.min.z,h=b.max.y;
    // Four narrow, OUTSIDE perimeter ledges. No second plane covers the roof deck.
    for(const y of [h-.35,h*.33,h*.67]){
      add('cornices',boxGeo,stone,x,y,b.min.z-.14,w+.56,.38,.28);
      add('cornices',boxGeo,stone,x,y,b.max.z+.14,w+.56,.38,.28);
      add('cornices',boxGeo,stone,b.min.x-.14,y,z,.28,.38,d);
      add('cornices',boxGeo,stone,b.max.x+.14,y,z,.28,.38,d);
    }
    // Entrance canopy and a recessed-looking dark lobby. Kept outside collision walls.
    add('lobbies',boxGeo,glass,x,1.55,b.max.z+.08,4.4,3.1,.12);
    add('canopies',boxGeo,dark,x,3.5,b.max.z+.75,6,.25,1.5);
    if(index%3===0){
      for(const side of [-1,1])add('pilasters',boxGeo,stone,x+side*(w/2-1),h/2,b.max.z+.13,.38,h,.24);
    }
    // Vents on the existing utility unit are genuinely separated from its top surface.
    for(const dx of [1.25,2.75])add('vent-fans',tube,dark,x+dx,h+2.09,z+1,.57,.16,.57);
    add('utility-door',boxGeo,dark,x+2,h+.65,z+3.04,.6,1.3,.05);
    if(index%5===1){
      const tx=x-w*.28,tz=z-d*.25;
      for(const a of [-1,1])for(const c of [-1,1])add('tank-legs',boxGeo,metal,tx+a*.95,h+1.2,tz+c*.95,.16,2.4,.16);
      add('water-tanks',tube,wood,tx,h+3.6,tz,1.6,3.4,1.6);
      add('tank-caps',cone,dark,tx,h+5.8,tz,1.85,1,1.85);
      for(const y of [h+2.4,h+4.8])add('tank-bands',tube,metal,tx,y,tz,1.64,.1,1.64);
    }else if(index%5===2){
      add('roof-access',boxGeo,stone,x-w*.25,h+1.7,z-d*.25,4.4,3.4,4);
      add('roof-door',boxGeo,dark,x-w*.25,h+1.2,z-d*.25+2.04,1.1,2.4,.06);
    }else if(index%5===3){
      for(let n=0;n<3;n++)add('solar',boxGeo,glass,x-w*.28+n*2.7,h+.38,z-d*.25,2.3,.18,4);
    }
  });
  // Shared sign atlas: 8 independent signs, one texture/material, true planes off walls.
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');
  const labels=['METRO','MARKET','CENTRAL','HOTEL','COFFEE','PHARMACY','PARKING','GALLERY'];
  for(let i=0;i<8;i++){const x=(i%4)*256,y=Math.floor(i/4)*128;c.fillStyle=['#233e50','#9b5039','#38645c','#324b73'][i%4];c.fillRect(x,y,256,128);c.fillStyle='#f7edd5';c.font='bold 30px sans-serif';c.textAlign='center';c.fillText(labels[i],x+128,y+73);}
  const atlas=new T.CanvasTexture(canvas);atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=4;const signMat=new T.MeshLambertMaterial({map:atlas});
  for(let type=0;type<8;type++){
    const geo=new T.PlaneGeometry(1,1),uv=geo.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setXY(j,(type%4+(uv.getX(j)*.94+.03))/4,(1-Math.floor(type/4)+(uv.getY(j)*.9+.05))/2);
    boxes.forEach((b,i)=>{if(i%8!==type)return;const x=(b.min.x+b.max.x)/2;add('sign-'+type,geo,signMat,x,type===3?b.max.y-4:4.8,b.max.z+.3,type===3?7:5.5,1.7,1);});
  }
  for(let ix=-5;ix<=5;ix++)for(let iz=-5;iz<=5;iz++){
    const x=ix*44,z=iz*44;
    // Streetlamp and traffic signal on alternate corners; road corridors remain clear.
    add('lamp-poles',tube,dark,x+15.5,3.4,z+13.5,.11,6.8,.11);
    add('lamp-arms',boxGeo,dark,x+17,6.75,z+13.5,3,.13,.13);
    add('lamp-heads',boxGeo,lamp,x+18.3,6.65,z+13.5,.8,.12,.42);
    if((ix+iz)%2===0){
      add('signal-poles',tube,dark,x-15,2,z-15,.1,4,.1);
      add('signals',boxGeo,dark,x-15,4.2,z-15,.5,1.4,.45);
      for(let n=0;n<3;n++){add('signal-lights',boxGeo,lamp,x-15,4.62-n*.4,z-14.75,.19,.19,.08);add('signal-lights',boxGeo,lamp,x-14.72,4.62-n*.4,z-15,.08,.19,.19);}
      add('benches',boxGeo,wood,x+11, .65,z+14,2.4,.2,.65);
      add('benches',boxGeo,wood,x+11,1.1,z+14.25,2.4,.7,.12);
      for(const side of [-1,1])add('bench-legs',boxGeo,dark,x+11+side*.85,.3,z+14,.1,.6,.55);
      add('bins',tube,dark,x+8.5,.6,z+14,.38,1.2,.38);
    }
    // Perpendicular crosswalk complement to the existing markings.
    if((ix-iz)%2===0)for(let n=0;n<5;n++)add('new-crosswalks',boxGeo,stone,x+14,.026,z+17+n*2,3,.035,1);
  }
  const timeUniform={value:0};
  // Subtle leaf motion costs no CPU matrix uploads and retains shared instancing.
  return {timeUniform,animateLeaves(material){material.onBeforeCompile=shader=>{shader.uniforms.cityTime=timeUniform;shader.vertexShader='uniform float cityTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(cityTime*1.4+instanceMatrix[3].x*.17+instanceMatrix[3].z*.11)*.045*max(position.y+1.0,0.0);');};material.customProgramCacheKey=()=> 'city-leaf-sway-v1';}};
}
