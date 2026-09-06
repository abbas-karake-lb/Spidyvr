import * as T from './vendor/three.module.min.js';
import {enrichCity} from './city-detail.js?city=2';
import {createCityLife} from './city-life.js?city=2';
import {facadeMaterial,upgradeArchitecture,atmosphere,bakedShadows} from './city-look.js';
export function createCity(scene){
  let seed=7301;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const boxGeo=new T.BoxGeometry(1,1,1),dummy=new T.Object3D(),boxes=[];
  const palette=[0xc4b4a2,0x9baeb4,0xd5caba,0x939aa1,0xc6b9ab,0xadbcbf];
  const batches=new Map();
  function addBatch(key,geo,mat,x,y,z,w,h,d,color=0xffffff,rotation=0){
    if(!batches.has(key))batches.set(key,{geo,mat,items:[]});
    batches.get(key).items.push({x,y,z,w,h,d,color,rotation});
  }
  const solid=c=>new T.MeshLambertMaterial({color:c});
  const roof=solid(0x737d82),sidewalk=solid(0xbcc0bc),asphalt=solid(0x394650),grass=solid(0x66856a),trunk=solid(0x6e5542),leaf=solid(0x547a59);
  const roadCanvas=document.createElement('canvas');roadCanvas.width=roadCanvas.height=256;const roadContext=roadCanvas.getContext('2d');roadContext.fillStyle='#51585a';roadContext.fillRect(0,0,256,256);
  let surfaceSeed=733;for(let i=0;i<4500;i++){surfaceSeed=(surfaceSeed*1664525+1013904223)>>>0;const x=surfaceSeed%256,y=(surfaceSeed>>>8)%256;roadContext.fillStyle=i%2?'#5b6262':'#474f52';roadContext.fillRect(x,y,1,1);}
  const roadTexture=new T.CanvasTexture(roadCanvas);roadTexture.colorSpace=T.SRGBColorSpace;roadTexture.wrapS=roadTexture.wrapT=T.RepeatWrapping;roadTexture.repeat.set(64,64);roadTexture.anisotropy=4;asphalt.map=roadTexture;asphalt.color.set(0xffffff);
  const floor=new T.Mesh(new T.PlaneGeometry(500,500),asphalt);floor.rotation.x=-Math.PI/2;floor.position.y=-.04;scene.add(floor);
  function facade(rows){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=rows*32;
    const c=canvas.getContext('2d'),style=[8,13,20,29].indexOf(rows);
    const base=['#aa8d7b','#d4d1c3','#829da8','#708c9c'][style];c.fillStyle=base;c.fillRect(0,0,256,canvas.height);
    for(let y=0;y<rows;y++){
      c.fillStyle=style===0?'#7b6e64':'#abb8b8';c.fillRect(0,y*32,256,2);
      if(style===0){c.fillStyle='#bb9e8a';for(let brick=0;brick<8;brick++)c.fillRect(brick*32+(y%2)*16,y*32+19,30,1);}
      for(let x=0;x<4;x++){
        const windowColor=rand()>.84?'#e7d9a9':rand()>.5?'#506975':'#67808a';
        const left=10+x*64,top=y*32+5,width=style>=2?49:40;
        c.fillStyle='#45545b';c.fillRect(left-2,top-1,width+4,24);
        c.fillStyle=windowColor;c.fillRect(left,top,width,20);
        c.fillStyle=style>=2?'#8faebc':'#a7b8bb';c.fillRect(left,top,width,4);
        c.fillStyle='#c0c6be';c.fillRect(left+width/2,top,2,20);c.fillRect(left,top+21,width+2,2);
        if((x+y)%4===0){c.fillStyle='#b7bab2';c.fillRect(left+1,top+6,width/2-2,7);}
      }
      if(style===1){c.fillStyle='#eee4cf';for(let x=0;x<4;x++)c.fillRect(x*64,y*32,5,32);}
    }
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
    tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;
    tex.dispose();return facadeMaterial(rows,style);
  }
  const facades=[facade(8),facade(13),facade(20),facade(29)];
  function building(x,z,w,d,h,type){
    const wall=facades[type],color=palette[Math.floor(rand()*palette.length)];
    addBatch('buildings'+type,boxGeo,[wall,wall,roof,roof,wall,wall],x,h/2,z,w,h,d,color);
    boxes.push(new T.Box3(new T.Vector3(x-w/2,0,z-d/2),new T.Vector3(x+w/2,h,z+d/2)));
    // The original full roof-rim slab was coplanar with the building top: removed.
    // This building mesh now supplies the single roof deck; perimeter trim is added outside it.
    addBatch('roof-unit',boxGeo,solidUnit,x+2,h+1,z+1,3,2,4);
    if(h>75)addBatch('antenna',boxGeo,roof,x,h+4,z,.2,8,.2);
  }
  const solidUnit=solid(0xb3b9b8),barkGeo=new T.CylinderGeometry(.3,.4,1,6),leafGeo=new T.IcosahedronGeometry(1,1);
  const roadMark=solid(0xdac990),white=solid(0xe1e3d8);
  for(let ix=-5;ix<=5;ix++)for(let iz=-5;iz<=5;iz++){
    const x=ix*44,z=iz*44;
    addBatch('pavement',boxGeo,sidewalk,x,.08,z,34,.16,34);
    const park=(ix===2&&iz===1)||(ix===-2&&iz===-1)||rand()<.07;
    if(park&&(ix||iz)){
      addBatch('parks',boxGeo,grass,x,.19,z,28,.15,28);
      addBatch('paths',boxGeo,sidewalk,x,.3,z,3,.08,28);
      for(let t=0;t<8;t++){
        const tx=x+(rand()-.5)*24,tz=z+(rand()-.5)*24;
        addBatch('trunks',barkGeo,trunk,tx,1.9,tz,1,3.5,1);
        addBatch('leaves',leafGeo,leaf,tx,5,tz,2.8,3.3,2.8,0xffffff,rand()*6);
      }
    }else if(ix===0&&iz===0)building(0,0,24,24,32,0);
    else {
      const type=Math.floor(rand()*4),h=[26,42,65,94][type]+rand()*7;
      building(x+(rand()-.5)*3,z+(rand()-.5)*3,20+rand()*8,20+rand()*8,h,type);
    }
    for(let k=-1;k<=1;k++){
      addBatch('lanes',boxGeo,roadMark,x+22,.012,z+k*12,.13,.025,5);
      addBatch('lanes',boxGeo,roadMark,x+k*12,.012,z+22,5,.025,.13);
    }
    for(let k=0;k<5;k++)addBatch('crosswalk',boxGeo,white,x+17+k*2,.025,z+14,1,.03,3);
  }
  const parked=[];
  for(let i=0;i<85;i++){
    const vertical=rand()>.5;let x=Math.round((rand()-.5)*10)*44+18,z=(rand()-.5)*470;
    if(!vertical)[x,z]=[z,x];const rotation=vertical?0:Math.PI/2;
    parked.push({p:new T.Vector3(x,0,z),angle:rotation,type:i%19===0?2:i%7===0?4:i%3===0?1:0,color:[0xb85545,0xd7d2ba,0x3f7288,0xe1b75b,0x758078][i%5]});
  }
  const detail=enrichCity(scene,boxes,addBatch,boxGeo);detail.animateLeaves(leaf);
  let signals=null;
  for(const [name,{geo,mat,items}] of batches){
    const mesh=new T.InstancedMesh(geo,mat,items.length);
    items.forEach((o,i)=>{dummy.position.set(o.x,o.y,o.z);dummy.scale.set(o.w,o.h,o.d);dummy.rotation.set(0,o.rotation,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(o.color));});
    mesh.name=name;mesh.computeBoundingSphere();scene.add(mesh);if(name==='signal-lights')signals=mesh;
  }
  // Clearly visible rooftop starting pad.
  const pad=new T.Mesh(new T.RingGeometry(2.8,3,64),new T.MeshBasicMaterial({color:0x69eadc,side:T.DoubleSide}));
  pad.rotation.x=-Math.PI/2;pad.position.set(0,32.02,0);scene.add(pad);
  const life=createCityLife(scene,boxes,parked),architecture=upgradeArchitecture(scene,boxes),sky=atmosphere(scene);bakedShadows(scene,boxes);
  const signalColor=new T.Color();let signalState=-1,cityTime=0,lastClock=null;
  return {boxes,buildingCount:boxes.length,life,architecture,sky,npcs:life.npcs,update(time,position,paused=false){
    if(lastClock===null)lastClock=time;if(!paused)cityTime+=Math.max(0,Math.min(.05,time-lastClock));lastClock=time;
    detail.timeUniform.value=cityTime;life.update(time,position,paused);architecture.update(position);sky.update(cityTime,position);
    const phase=life.signal(),state=phase<8?0:phase<9?1:phase<17?2:3;
    if(signals&&state!==signalState){signalState=state;for(let i=0;i<signals.count;i++){const lamp=Math.floor((i%6)/2),horizontal=i%2===1,lit=horizontal?(state===2?2:state===3?1:0):(state===0?2:state===1?1:0);signals.setColorAt(i,signalColor.set(lamp===lit?[0xee5043,0xffc960,0x8ce0a8][lamp]:0x283c40));}signals.instanceColor.needsUpdate=true;}
  }};
}
