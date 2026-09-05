import * as T from './vendor/three.module.min.js';
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
  const floor=new T.Mesh(new T.PlaneGeometry(1600,1600),asphalt);floor.rotation.x=-Math.PI/2;floor.position.y=-.04;scene.add(floor);
  function facade(rows){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=rows*24;
    const c=canvas.getContext('2d');c.fillStyle='#d4d7d4';c.fillRect(0,0,128,canvas.height);
    for(let y=0;y<rows;y++){
      c.fillStyle='#a3aead';c.fillRect(0,y*24,128,2);
      for(let x=0;x<4;x++){
        c.fillStyle=rand()>.84?'#e7d9a9':rand()>.5?'#506975':'#67808a';c.fillRect(6+x*32,y*24+5,20,14);
        c.fillStyle='#a7b8bb';c.fillRect(6+x*32,y*24+5,20,2);c.fillRect(15+x*32,y*24+5,1,14);
      }
    }
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
    return new T.MeshLambertMaterial({map:tex});
  }
  const facades=[facade(8),facade(13),facade(20),facade(29)];
  function building(x,z,w,d,h,type){
    const wall=facades[type],color=palette[Math.floor(rand()*palette.length)];
    addBatch('buildings'+type,boxGeo,[wall,wall,roof,roof,wall,wall],x,h/2,z,w,h,d,color);
    boxes.push(new T.Box3(new T.Vector3(x-w/2,0,z-d/2),new T.Vector3(x+w/2,h,z+d/2)));
    addBatch('roof-rim',boxGeo,roof,x,h-.1,z,w+.6,.2,d+.6);
    addBatch('roof-unit',boxGeo,solidUnit,x+2,h+1,z+1,3,2,4);
    if(h>75)addBatch('antenna',boxGeo,roof,x,h+4,z,.2,8,.2);
  }
  const solidUnit=solid(0xb3b9b8),barkGeo=new T.CylinderGeometry(.3,.4,1,6),leafGeo=new T.IcosahedronGeometry(1,1);
  const roadMark=solid(0xdac990),white=solid(0xe1e3d8);
  for(let ix=-5;ix<=5;ix++)for(let iz=-5;iz<=5;iz++){
    const x=ix*44,z=iz*44;
    addBatch('pavement',boxGeo,sidewalk,x,.08,z,32,.16,32);
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
  const carMat=solid(0xffffff),glass=solid(0x354d5d),wheels=solid(0x20282d);
  for(let i=0;i<85;i++){
    const vertical=rand()>.5;let x=Math.round((rand()-.5)*10)*44+18,z=(rand()-.5)*470;
    if(!vertical)[x,z]=[z,x];const rotation=vertical?0:Math.PI/2;
    addBatch('cars',boxGeo,carMat,x,.7,z,1.9,1.1,4,[0xb85545,0xd7d2ba,0x3f7288,0xe1b75b,0x758078][i%5],rotation);
    addBatch('car-windows',boxGeo,glass,x,1.4,z,1.65,.6,2.2,0xffffff,rotation);
    for(const s of [-1,1])for(const t of [-1,1])addBatch('wheels',boxGeo,wheels,x+(vertical?s:1.3*t),.4,z+(vertical?1.3*t:s),.4,.55,.5);
  }
  for(const {geo,mat,items} of batches.values()){
    const mesh=new T.InstancedMesh(geo,mat,items.length);
    items.forEach((o,i)=>{dummy.position.set(o.x,o.y,o.z);dummy.scale.set(o.w,o.h,o.d);dummy.rotation.set(0,o.rotation,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(o.color));});
    mesh.computeBoundingSphere();scene.add(mesh);
  }
  // Clearly visible rooftop starting pad.
  const pad=new T.Mesh(new T.RingGeometry(2.8,3,64),new T.MeshBasicMaterial({color:0x69eadc,side:T.DoubleSide}));
  pad.rotation.x=-Math.PI/2;pad.position.set(0,32.02,0);scene.add(pad);
  return {boxes,buildingCount:boxes.length};
}
