import * as T from './vendor/three.module.min.js';
const V=(...v)=>new T.Vector3(...v);
export const TOWER=Object.freeze({x:252,z:44,floors:10,height:4,base:.2,roof:40.2,resetSeconds:600});
export const towerPoint=(x,y,z)=>V(TOWER.x+x,y,TOWER.z+z);
// All geometry is authored around real passageways. There is no solid building AABB.
export function createQuarantineBuilding(scene){
  const root=new T.Group();root.name='quarantine-residences';scene.add(root);
  const shell=new T.Group();root.add(shell);const floors=[],solids=[],commonBoxes=[],floorBoxes=Array.from({length:11},()=>[]),batches=new Map(),unit=new T.BoxGeometry(1,1,1),dummy=new T.Object3D();
  function texture(kind){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=kind==='wood'?'#65513c':kind==='tile'?'#b7b5aa':'#c3b9a7';ctx.fillRect(0,0,256,256);
    let seed=145;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let n=0;n<1600;n++){ctx.fillStyle=`rgba(${kind==='wood'?'35,20,8':'65,58,49'},${rand()*.12})`;ctx.fillRect(rand()*256,rand()*256,kind==='wood'?20+rand()*65:2,1);}
    ctx.strokeStyle=kind==='wood'?'#382e26':'#8c8e87';ctx.lineWidth=1;
    for(let y=0;y<256;y+=kind==='wood'?32:64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();for(let x=(y%64?32:0);x<256;x+=128){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+(kind==='wood'?32:64));ctx.stroke();}}
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;return map;
  }
  const mats={stone:new T.MeshStandardMaterial({color:0x8c9290,roughness:.85}),plaster:new T.MeshStandardMaterial({color:0xe0d8c8,roughness:.9}),wood:new T.MeshStandardMaterial({map:texture('wood'),roughness:.64}),tile:new T.MeshStandardMaterial({map:texture('tile'),roughness:.45}),metal:new T.MeshStandardMaterial({color:0x687778,metalness:.7,roughness:.3}),gold:new T.MeshStandardMaterial({color:0xc89a47,metalness:.62,roughness:.3}),dark:new T.MeshStandardMaterial({color:0x1b292e,roughness:.64}),cloth:new T.MeshStandardMaterial({color:0x59706c,roughness:.96}),white:new T.MeshStandardMaterial({color:0xe9e3d8,roughness:.63}),light:new T.MeshBasicMaterial({color:0xffdfa2}),red:new T.MeshBasicMaterial({color:0xd9422e}),glass:new T.MeshStandardMaterial({color:0x8cbbc2,metalness:.12,roughness:.12,transparent:true,opacity:.24,depthWrite:false})};
  function box(group,kind,x,y,z,w,h,d,solid=false,floor=-1){
    const key=group.uuid+kind;if(!batches.has(key))batches.set(key,{group,kind,items:[]});batches.get(key).items.push([x,y,z,w,h,d]);
    if(solid){const b=new T.Box3(towerPoint(x-w/2,y-h/2,z-d/2),towerPoint(x+w/2,y+h/2,z+d/2));solids.push(b);if(floor>=0)floorBoxes[floor].push(b);else commonBoxes.push(b);return b;}
  }
  function sign(group,text,x,y,z,w=3,h=.55,rotation=0,color='#e7d8a9'){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#16292e';ctx.fillRect(0,0,1024,256);ctx.strokeStyle=color;ctx.lineWidth=12;ctx.strokeRect(7,7,1010,242);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 70px sans-serif';ctx.fillText(text,512,130,970);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,side:T.DoubleSide}));mesh.position.copy(towerPoint(x,y,z));mesh.rotation.y=rotation;group.add(mesh);return {mesh,ctx,map};
  }
  function doorFrame(g,x,y,z,acrossX=true,f=0){
    if(acrossX){box(g,'wood',x-1,y+1.2,z,.12,2.4,.24);box(g,'wood',x+1,y+1.2,z,.12,2.4,.24);box(g,'wood',x,y+2.4,z,2.12,.12,.24);}
    else {box(g,'wood',x,y+1.2,z-1,.24,2.4,.12);box(g,'wood',x,y+1.2,z+1,.24,2.4,.12);box(g,'wood',x,y+2.4,z,.24,.12,2.12);}
  }
  // A paved extension, flush with the surrounding street; original city is untouched.
  box(shell,'stone',0,.08,0,24,.24,32,true);box(shell,'dark',-11.1,.22,0,1.6,.08,5);
  for(let f=0;f<=10;f++){
    const y=TOWER.base+f*4,g=new T.Group();g.name=f===10?'quarantine-roof':'quarantine-floor-'+(f+1);root.add(g);floors.push(g);
    // Main floor, near stair landing, and lift lobby. Both shafts stay genuinely open.
    box(g,'tile',-2.6,y-.12,0,14.8,.24,28,true,f);
    box(g,'tile',7.4,y-.12,-10.5,5.2,.24,7,true,f);
    box(g,'tile',7.4,y-.12,-5.5,5.2,.24,3,true,f);
    box(g,'tile',7.4,y-.12,8,5.2,.24,2,true,f);
    box(g,'tile',7.4,y-.12,13.5,5.2,.24,1,true,f);
    box(g,'tile',4.9,y-.12,11,.2,.24,4,true,f);box(g,'tile',9.6,y-.12,11,.8,.24,4,true,f);
    if(f===10){
      for(const z of [-13.8,13.8])box(shell,'gold',0,y+.55,z,20,1.1,.25,true,f);
      box(shell,'gold',-9.8,y+.55,0,.25,1.1,28,true,f);box(shell,'gold',9.8,y+.55,0,.25,1.1,28,true,f);
      box(g,'dark',-3,y+.45,0,1.1,.9,1,true,f);box(g,'gold',-3,y+.95,0,1.2,.12,1.1);
      sign(g,'CLEAR EVERY FLOOR · CLAIM REWARD',-3,y+2,-2,7,.7);
      for(const z of [-10,10]){box(g,'metal',-6,y+.7,z,2.5,1.4,2.2,true,f);for(let n=0;n<7;n++)box(g,'dark',-6,y+.3+n*.12,z-1.12,2.1,.045,.04);}
      continue;
    }
    // Detailed window bays: lower wall, lintel, columns and inset glass; no copied roof slabs.
    for(const x of [-10,10]){
      for(let z=-12;z<=12;z+=4){
        if(f===0&&x===-10&&z===0){box(shell,'stone',x,y+3.35,z,.35,1.3,4,true,f);continue;}
        box(shell,'stone',x,y+.5,z,.35,1,4,true,f);box(shell,'stone',x,y+3.4,z,.35,1.2,4,true,f);
        box(shell,'glass',x,y+1.9,z,.08,1.8,3.4,true,f);box(shell,'metal',x,y+1.9,z,.12,1.9,.055);
        box(shell,'stone',x,y+1.9,z+1.85,.45,2,.3,true,f);
        box(shell,'gold',x+(x<0?-.15:.15),y+.94,z,.45,.12,3.55);
      }
    }
    for(const z of [-14,14]){
      box(shell,'stone',0,y+.5,z,20,1,.35,true,f);box(shell,'stone',0,y+3.4,z,20,1.2,.35,true,f);
      for(let x=-8;x<=8;x+=4){box(shell,'glass',x,y+1.9,z,3.5,1.8,.08,true,f);box(shell,'stone',x+1.85,y+1.9,z,.3,2,.45,true,f);box(shell,'metal',x,y+1.9,z,.055,1.9,.12);}
    }
    for(const z of [-14.25,14.25])box(shell,'gold',0,y+3.85,z,20.6,.22,.4);
    box(shell,'gold',-10.22,y+3.85,0,.4,.22,28.6);
    // Corridor and apartment entrances. Both flats have living room, kitchen, bedroom, bathroom.
    for(const s of [-1,1]){
      const z=s*2.15;
      box(g,'plaster',-6,y+1.85,z,8,3.7,.18,true,f);box(g,'plaster',2.5,y+1.85,z,3,3.7,.18,true,f);box(g,'plaster',-1,y+3.05,z,2,1.3,.18,true,f);doorFrame(g,-1,y,z,true,f);
      // Door leaf stands open, with brass handle and apartment number above.
      box(g,'wood',-1.94,y+1.12,z+s*.82,.10,2.24,1.65);box(g,'gold',-1.87,y+1.05,z+s*1.45,.08,.08,.24);
      sign(g,`${f+1}0${s<0?1:2}`,-1,y+2.75,z-s*.12,1,.27,s<0?0:Math.PI);
      const az=s*8;
      box(g,'wood',-3,y+.035,az,12,.05,10.7);
      // Kitchen cabinetry, stone counter, sink, oven, stove, fridge and extractor.
      for(let k=0;k<4;k++){
        const x=-8.5+k*1.35;box(g,k%2?'white':'wood',x,y+.47,s*12.85,1.3,.94,1.3,true,f);box(g,'tile',x,y+.96,s*12.8,1.36,.09,1.5);
        box(g,'white',x,y+2.25,s*13.3,1.28,.8,.62);box(g,'metal',x+.38,y+2.22,s*12.96,.08,.2,.05);
        box(g,'metal',x,y+.7,s*12.14,.45,.05,.04);
      }
      box(g,'metal',-7.15,y+1.025,s*12.8,.88,.03,.72);box(g,'dark',-7.15,y+1.045,s*12.8,.67,.02,.52);box(g,'metal',-7.15,y+1.25,s*13.1,.06,.4,.06);
      box(g,'dark',-5.8,y+.98,s*12.8,1,.06,.9);for(const a of [-.25,.25])for(const b of [-.25,.25])box(g,'metal',-5.8+a,y+1.02,s*12.8+b,.28,.025,.28);
      box(g,'metal',-5.8,y+2.2,s*12.9,1.2,.2,1.1);box(g,'metal',-5.8,y+2.65,s*13.3,.6,.7,.5);
      box(g,'white',-2.2,y+1.03,s*12.8,1.1,2.06,1.35,true,f);box(g,'metal',-2.65,y+1.3,s*12.1,.06,.4,.06);
      // Living area: upholstered sofa, cushions, low table, rug, TV, shelves, dining set.
      box(g,'cloth',-7.5,y+.42,s*6.3,3.3,.65,1.25,true,f);box(g,'cloth',-7.5,y+.9,s*6.9,3.3,.8,.28);
      for(const x of [-8.85,-6.15])box(g,'cloth',x,y+.67,s*6.3,.4,.55,1.25);
      for(let k=0;k<3;k++)box(g,'white',-8.35+k*.85,y+.86,s*6.65,.67,.45,.17);
      box(g,'cloth',-6.8,y+.075,s*4.1,4.8,.055,2.4);box(g,'wood',-6.9,y+.38,s*4.45,1.6,.10,.85,true,f);for(const x of [-7.5,-6.3])box(g,'dark',x,y+.2,s*4.45,.08,.36,.7);
      box(g,'dark',-7.2,y+1.7,s*2.34,2.7,1.45,.08);box(g,'wood',-7.2,y+.42,s*2.6,3,.6,.55,true,f);
      box(g,'wood',-3.3,y+.83,az,1.9,.1,1.4,true,f);for(const x of [-4,-2.6])for(const dz of [-.45,.45])box(g,'metal',x,y+.4,az+dz,.06,.8,.06);
      for(const dz of [-1,1]){box(g,'wood',-3.3,y+.5,az+dz,.62,.08,.62);box(g,'wood',-3.3,y+.84,az+dz*1.27,.62,.7,.07);}
      // Bedroom divider with genuine doorway at z=7.5; bathroom within bedroom.
      box(g,'plaster',.45,y+1.8,s*4.2,.18,3.6,4,true,f);box(g,'plaster',.45,y+1.8,s*11.8,.18,3.6,4.2,true,f);box(g,'plaster',.45,y+3.05,s*8,.18,1.3,3.6,true,f);doorFrame(g,.45,y,s*8,false,f);
      box(g,'wood',2.45,y+.33,s*5.5,2.15,.5,3.4,true,f);box(g,'white',2.45,y+.64,s*5.5,2.1,.27,3.25);box(g,'cloth',2.45,y+.81,s*5.05,2.14,.08,2.2);box(g,'wood',2.45,y+1.05,s*7.23,2.2,1.3,.12);
      for(const x of [1.9,2.95])box(g,'white',x,y+.87,s*6.62,.83,.16,.48);
      box(g,'plaster',2.5,y+1.8,s*9.3,1.4,3.6,.15,true,f);box(g,'plaster',4.3,y+1.8,s*9.3,.4,3.6,.15,true,f);
      box(g,'white',1.5,y+.5,s*12.7,.6,.8,.9,true,f);box(g,'white',1.5,y+.9,s*13.1,.6,.9,.25);
      box(g,'white',3.65,y+.65,s*10.5,1.1,1.2,.6,true,f);box(g,'metal',3.65,y+1.9,s*10.75,1.1,1.1,.025);
      box(g,'tile',3.2,y+.07,s*12.6,1.8,.12,1.7);box(g,'glass',2.35,y+1.05,s*12.6,.025,2,1.7);box(g,'metal',3.2,y+2.3,s*13.4,.1,.5,.1);
      // Frames, skirting and warm ceiling fixtures provide depth at eye level.
      for(const x of [-8,-4,2]){box(g,'dark',x,y+3.62,az,1.1,.09,.48);box(g,'light',x,y+3.55,az,.95,.025,.34);}
      for(const x of [-8.7,-4.3]){box(g,'gold',x,y+1.9,s*2.27,1.2,.85,.07);box(g,f%2?'cloth':'stone',x,y+1.9,s*2.22,1.05,.7,.025);}
    }
    for(const z of [-1.98,1.98])box(g,'wood',-3,y+.07,z,13.5,.14,.05);
    for(const x of [-7,-2,3]){box(g,'metal',x,y+3.68,0,1.15,.08,.5);box(g,'light',x,y+3.62,0,1,.025,.37);}
    box(g,'gold',4.55,y+.025,-2.5,.055,.025,5);
    sign(g,`FLOOR ${f+1}  ·  STAIRS →`,2.8,y+2.7,-1.98,2.9,.35);
    // Stair flights: 12 shallow treads per half-flight. Locomotion uses their continuous support surface.
    for(let step=0;step<12;step++){
      box(g,'stone',6.175,y+(step+1)/6-.08,-4+(step+.5)*2/3,2.15,.16,2/3);
      box(g,'gold',6.175,y+(step+1)/6+.006,-4+step*2/3,2.15,.018,.035);
      box(g,'stone',8.725,y+2+(step+1)/6-.08,4-(step+.5)*2/3,2.15,.16,2/3);
      box(g,'gold',8.725,y+2+(step+1)/6+.006,4-step*2/3,2.15,.018,.035);
    }
    box(g,'stone',7.4,y+1.88,5.5,5.2,.24,3,true,f);
    for(let j=0;j<9;j++)for(const x of [5.02,7.4,9.92]){const z=-4+j;const sy=y+(x===9.92?2+(4-z)/4:(z+4)/4);box(g,'metal',x,sy+.55,z,.045,1.1,.045);}
    // Continuous sloped rails are separate meshes (two per flight).
    for(const [x,reverse] of [[5.02,false],[7.3,false],[7.6,true],[9.92,true]]){const rail=new T.Mesh(new T.BoxGeometry(.06,.06,Math.sqrt(68)),mats.metal);rail.position.copy(towerPoint(x,y+(reverse?3:1)+1.1,0));rail.rotation.x=reverse?Math.atan(.25):-Math.atan(.25);g.add(rail);}
    // Shaft walls and signage; the front doorway has a dynamic safety gate.
    box(g,'metal',5,y+1.8,11,.18,3.6,4,true,f);box(g,'metal',9.3,y+1.8,11,.18,3.6,4,true,f);box(g,'metal',7.15,y+1.8,13,4.5,3.6,.18,true,f);
    sign(g,'LIFT · LEFT ↑  RIGHT ↓',7.15,y+2.9,8.94,3.7,.45);sign(g,'ENTER TO RIDE · STEP OUT TO SELECT AGAIN',7.15,y+2.45,8.94,3.7,.25);
  }
  // Entrance, recognizable signs, gold crown and sky beacon.
  sign(shell,'QUARANTINE',-10.3,6,0,15,2,-Math.PI/2,'#ffc36b');sign(shell,'RESIDENCES · 10 FLOORS',-10.35,3.35,0,7,.6,-Math.PI/2);
  sign(shell,'ARM YOURSELF · CLEAR ALL FLOORS · ROOFTOP REWARD',-10.5,1.1,-6,6,.6,-Math.PI/2);
  for(const z of [-12.6,12.6]){box(shell,'gold',-10.45,22,z,.7,44,.7);box(shell,'light',-10.85,22,z,.06,43,.18);}
  // Crown is an open perimeter, not a roof over the playable rooftop.
  for(const z of [-14.1,14.1])box(shell,'gold',0,43.1,z,20.8,.65,.7);
  for(const x of [-10.1,10.1])box(shell,'gold',x,43.1,0,.7,.65,28);
  box(shell,'metal',0,46,12,.25,9,.25);const beacon=new T.Mesh(new T.SphereGeometry(.55,12,8),mats.red);beacon.position.copy(towerPoint(0,50.5,12));shell.add(beacon);
  const marker=sign(shell,'QUARANTINE · ZOMBIE CHALLENGE',0,130,0,28,2.8);marker.mesh.material.depthWrite=false;
  const beam=new T.Mesh(new T.CylinderGeometry(1.7,.35,78,12,1,true),new T.MeshBasicMaterial({color:0xffce78,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}));beam.position.copy(towerPoint(0,89,12));shell.add(beam);
  sign(shell,'QUARANTINE → EAST WATERFRONT',-248,33.5,-47,5,.5);
  const status=sign(shell,'40 INFECTED · CLEAR TO ROOF',-10.4,4.5,0,9,.75,-Math.PI/2,'#b8ebce');
  // Street arsenal and rooftop reward pedestal.
  box(shell,'dark',-11.25,.65,-5.5,1.2,1.3,4,true);box(shell,'gold',-11.25,1.33,-5.5,1.3,.06,4.1);
  sign(shell,'SUPPLY CACHE · HOLD SIDE GRIP',-11.3,2,-5.5,4,.4,-Math.PI/2);
  // Flush entrance slides open automatically.
  const doors=[];for(const s of [-1,1]){const m=new T.Mesh(new T.BoxGeometry(.08,2.6,1.9),mats.glass);m.position.copy(towerPoint(-10.05,1.5,s));shell.add(m);doors.push(m);}
  const lift=new T.Group();lift.name='quarantine-working-elevator';lift.position.copy(towerPoint(7.15,.2,11));root.add(lift);
  const cabinMat=mats.metal;for(const [size,at] of [[[4,.12,3.7],[0,-.06,0]],[[4,2.8,.08],[0,1.4,1.8]],[[.08,2.8,3.6],[-1.95,1.4,0]],[[.08,2.8,3.6],[1.95,1.4,0]],[[4,.08,3.7],[0,2.85,0]]]){const m=new T.Mesh(new T.BoxGeometry(...size),cabinMat);m.position.fromArray(at);lift.add(m);}
  const lamp=new T.Mesh(new T.BoxGeometry(2,.02,1),mats.light);lamp.position.set(0,2.78,0);lift.add(lamp);
  const liftFloor=new T.Box3(),gates=[],gateMeshes=[];for(let f=0;f<=10;f++){const b=new T.Box3(towerPoint(5,TOWER.base+4*f,8.88),towerPoint(9.3,TOWER.base+4*f+2.8,9.08));gates.push(b);const m=new T.Mesh(new T.BoxGeometry(4.3,2.8,.1),mats.metal);m.position.copy(towerPoint(7.15,TOWER.base+4*f+1.4,8.98));root.add(m);gateMeshes.push(m);}
  // Batches stay per floor so hidden floors cost no draw calls.
  for(const {group,kind,items} of batches.values()){if(!items.length)continue;const mesh=new T.InstancedMesh(unit,mats[kind],items.length);mesh.name='quarantine-'+kind;items.forEach(([x,y,z,w,h,d],i)=>{dummy.position.copy(towerPoint(x,y,z));dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.computeBoundingSphere();mesh.castShadow=kind!=='light'&&kind!=='glass';mesh.receiveShadow=true;group.add(mesh);}
  // Static geometry uses ambient fill and emissive fixtures; only two near-floor fill lights.
  const fills=[new T.PointLight(0xffd9a3,20,16,2),new T.PointLight(0xc4dde1,12,14,2)];for(const l of fills)root.add(l);
  let liftY=.2,destination=.2,riding=false,entryTimer=0,armed=true,lastStatus='',doorOpen=0;
  const near=p=>Math.abs(p.x-TOWER.x)<14&&Math.abs(p.z-TOWER.z)<18;
  const collisionNear=p=>Math.abs(p.x-TOWER.x)<20&&Math.abs(p.z-TOWER.z)<24;
  const inside=p=>Math.abs(p.x-TOWER.x)<9.8&&Math.abs(p.z-TOWER.z)<13.8&&p.y<44;
  function level(p){return Math.max(0,Math.min(10,Math.floor((p.y-.1)/4)));}
  function stairHeight(p){
    const x=p.x-TOWER.x,z=p.z-TOWER.z;if(z< -4.35||z>4.35)return null;
    const first=x>5.02&&x<7.3,second=x>7.6&&x<9.95;if(!first&&!second)return null;
    const base=first?Math.max(0,Math.min(2,(z+4+.34)/4)):2+Math.max(0,Math.min(2,(4-z+.34)/4));
    const f=Math.round((p.y-.2-base)/4);if(f<0||f>=10)return null;return .2+f*4+base;
  }
  function support(player,dt){
    const ex=player.p.x-TOWER.x,ez=player.p.z-TOWER.z;
    if(ex>=-14&&ex<=-9.7&&Math.abs(ez)<3.2&&player.v.y<=.5&&player.p.y<.45){const y=.2*Math.min(1,Math.max(0,(ex+14)/1.4));if(Math.abs(player.p.y-y)<.3){player.p.y=y;player.v.y=0;player.grounded=true;}}
    if(riding){const difference=destination-liftY,step=Math.sign(difference)*Math.min(Math.abs(difference),1.7*dt);liftY+=step;player.p.y=liftY;player.v.set(0,0,0);player.grounded=true;if(Math.abs(difference)<.001){riding=false;armed=false;}syncLift();return;}
    const y=stairHeight(player.p);if(y!==null&&player.v.y<=.5&&Math.abs(player.p.y-y)<.42){player.p.y=y;player.v.y=0;player.grounded=true;}
  }
  function update(dt,viewer,paused=false){
    const f=level(viewer),close=near(viewer);for(let i=0;i<floors.length;i++)floors[i].visible=close&&Math.abs(i-f)<=1||i===10&&(!inside(viewer)||viewer.y>36)&&viewer.distanceToSquared(towerPoint(0,40,0))<100**2;
    fills[0].position.copy(towerPoint(-3,.2+f*4+3,0));fills[1].position.copy(towerPoint(-3,.2+f*4+3,8));for(const l of fills)l.visible=close;
    marker.mesh.lookAt(viewer.x,130,viewer.z);beacon.scale.setScalar(1+Math.sin(performance.now()*.004)*.1);
    if(paused)return;
    const x=viewer.x-TOWER.x,z=viewer.z-TOWER.z,atDoor=Math.abs(x+10)<4&&Math.abs(z)<4&&viewer.y<3;
    doorOpen+=(Number(atDoor)-doorOpen)*(1-Math.exp(-8*dt));doors.forEach((m,i)=>m.position.z=TOWER.z+(i?1:-1)*(1+doorOpen*1.95));
    const inCabin=x>5.2&&x<9.1&&z>9.2&&z<12.7&&Math.abs(viewer.y-liftY)<.5;
    if(!riding){
      if(!inCabin){armed=true;entryTimer=0;const call=.2+f*4;if(close&&z>6&&x>3){destination=call;liftY+=Math.sign(call-liftY)*Math.min(Math.abs(call-liftY),4*dt);}}
      else if(armed){entryTimer+=dt;if(entryTimer>.8){const next=Math.max(0,Math.min(10,f+(x<7.15?1:-1)));destination=.2+next*4;if(Math.abs(destination-liftY)>.1)riding=true;else armed=false;entryTimer=0;}}
    }
    syncLift();
  }
  function syncLift(){lift.position.y=liftY;liftFloor.set(towerPoint(5.15,liftY-.12,9.15),towerPoint(9.15,liftY,12.85));gateMeshes.forEach((m,i)=>m.visible=Math.abs(liftY-(.2+i*4))>.08||riding);}
  function collisionBoxes(p){if(!collisionNear(p))return [];const f=level(p),out=[];for(let i=Math.max(0,f-1);i<=Math.min(10,f+1);i++)out.push(...floorBoxes[i]);out.push(...commonBoxes);out.push(liftFloor);for(let i=0;i<=10;i++)if(Math.abs(liftY-(.2+i*4))>.08||riding)out.push(gates[i]);return out;}
  function setStatus(text){if(text===lastStatus)return;lastStatus=text;const {ctx,map}=status;ctx.fillStyle='#16292e';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#b8ebce';ctx.font='bold 65px sans-serif';ctx.fillText(text,512,130,980);map.needsUpdate=true;}
  update(0,towerPoint(-14,.2,0));
  return {root,shell,floors,solids,floorBoxes,near,collisionNear,inside,level,stairHeight,support,update,collisionBoxes,setStatus,spawn:towerPoint(-12,.2,2.6),reward:towerPoint(-3,41.55,0),lift,gates,get closedGates(){return gates.filter((_,i)=>gateMeshes[i].visible);},get riding(){return riding;},get liftY(){return liftY;},resetLift(){riding=false;armed=false;entryTimer=0;}};
}
