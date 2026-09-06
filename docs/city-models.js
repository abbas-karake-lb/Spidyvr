import * as T from './vendor/three.module.min.js';
// Bake reusable authored primitives into shared vertex-colour meshes, never separate draw calls per part.
export function mergeParts(parts){
  const positions=[],normals=[],colors=[],limbs=[],details=[],surfaces=[],uvs=[];const matrix=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),s=new T.Vector3(),e=new T.Euler();
  for(const part of parts){
    const source=part.geo||box;const g=source.index?source.toNonIndexed():source.clone();
    q.setFromEuler(e.fromArray(part.rot||[0,0,0]));matrix.compose(p.fromArray(part.at||[0,0,0]),q,s.fromArray(part.size||[1,1,1]));g.applyMatrix4(matrix);const c=new T.Color(part.color??0xffffff);
    for(let i=0;i<g.attributes.position.count;i++){positions.push(g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i));normals.push(g.attributes.normal.getX(i),g.attributes.normal.getY(i),g.attributes.normal.getZ(i));colors.push(c.r,c.g,c.b);limbs.push(part.limb||0);details.push(part.detail||0);surfaces.push(part.surface||0);uvs.push(g.attributes.uv?.getX(i)||0,g.attributes.uv?.getY(i)||0);}g.dispose();
  }
  const g=new T.BufferGeometry();for(const [name,array,size] of [['position',positions,3],['normal',normals,3],['color',colors,3],['limb',limbs,1],['detail',details,1],['surface',surfaces,1],['uv',uvs,2]])g.setAttribute(name,new T.Float32BufferAttribute(array,size));g.computeBoundingSphere();return g;
}
const lowRound=new T.IcosahedronGeometry(1,0);
const box=new T.BoxGeometry(1,1,1),round=new T.SphereGeometry(1,12,10),wheel=new T.CylinderGeometry(1,1,1,12);
const part=(size,at,color,geo=box,rot=[0,0,0])=>({size,at,color,geo,rot});
// Lofted cross sections give bonnets, shoulders and glazing curved automotive silhouettes.
function loft(sections){
  const vertices=[],indices=[];
  for(const [z,w,bottom,top] of sections){const bevel=Math.min(.14,(top-bottom)*.2);for(const [x,y] of [[-w*.82,bottom],[w*.82,bottom],[w,bottom+bevel],[w,top-bevel],[w*.8,top],[-w*.8,top],[-w,top-bevel],[-w,bottom+bevel]])vertices.push(x,y,z);}
  for(let n=0;n<sections.length-1;n++)for(let j=0;j<8;j++){const a=n*8+j,b=n*8+(j+1)%8,c=a+8,d=b+8;indices.push(a,b,c,b,d,c);}
  for(let j=1;j<7;j++){indices.push(0,j+1,j);const end=(sections.length-1)*8;indices.push(end,end+j,end+j+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function vehicleModel(type=0,lod=false){
  const van=type===2,bus=type===3,suv=type===1,L=bus?8.2:van?5.2:4.5,H=bus?2.95:van?2.45:suv?1.85:1.52,W=bus?2.35:1.85;
  const parts=[],add=(size,at,color,surface=0,geo=box,rot=[0,0,0])=>parts.push({...part(size,at,color,geo,rot),surface});
  const body=loft([[-L*.5,W*.39,.48,.91],[-L*.43,W*.5,.43,1.02],[-L*.2,W*.5,.43,1.12],[L*.29,W*.5,.43,1.1],[L*.47,W*.47,.5,1.03],[L*.5,W*.4,.58,.94]]);
  add([1,1,1],[0,0,0],0xffffff,0,body);
  const cab=loft(bus||van?[[-L*.4,W*.43,1.03,H-.16],[-L*.33,W*.43,1.03,H],[L*.42,W*.43,1.03,H],[L*.46,W*.4,1.03,H-.12]]:[[-L*.25,W*.44,1.03,1.1],[-L*.12,W*.39,1.03,H],[L*.2,W*.39,1.03,H],[L*.34,W*.44,1.03,1.08]]);
  add([1,1,1],[0,0,0],0x354956,2,cab);
  const roof=loft([[-L*(bus||van?.33:.12),W*.37,H-.055,H+.015],[L*(bus||van?.4:.19),W*.37,H-.055,H+.015]]);
  add([1,1,1],[0,0,0],0xf0f1ed,0,roof);
  for(const side of [-1,1]){
    for(const z of [-L*.3,L*.31]){
      add([.34,.22,.34],[side*W*.49,.42,z],0x171c20,1,lod?wheel:new T.CylinderGeometry(1,1,1,24),[0,0,Math.PI/2]);
      if(!lod){
        add([.24,.235,.24],[side*W*.5,.42,z],0x949b9e,3,wheel,[0,0,Math.PI/2]);
        add([.18,.244,.18],[side*W*.502,.42,z],0x293036,1,wheel,[0,0,Math.PI/2]);
        for(let spoke=0;spoke<5;spoke++)add([.025,.37,.045],[side*W*.565,.42,z],0xd1d4d2,3,box,[spoke*Math.PI/5,0,0]);
        add([.068,.26,.068],[side*W*.505,.42,z],0xc4cacb,3,wheel,[0,0,Math.PI/2]);
      }
    }
    if(!lod){
      // Belt trim, glass pillars, rubber seals, handles, mirrors and rocker panels.
      add([.035,.035,L*.79],[side*W*.494,1.065,0],0xbfc8c9,3);
      add([.045,.09,L*.69],[side*W*.49,.5,0],0x263138,1);
      for(let j=0;j<(bus?7:2);j++)add([.055,H-1.05,.065],[side*W*.425,(H+1.05)/2,-L*.10+j*(bus?.9:L*.23)],0x252c31,1);
      add([.07,.05,.2],[side*W*.5,.98,.2],0xc9cdca,3);
      add([.16,.11,.25],[side*W*.53,1.18,-L*.17],0xe4e7e3,0,round);
      add([.1,.1,.16],[side*W*.564,1.2,-L*.14],0x81969c,2);
      add([.33,.12,.065],[side*W*.31,.92,-L*.49],0xeef6ec,4);
      add([.29,.14,.065],[side*W*.34,.98,L*.486],0xba2018,5);
      // Door seams have width in space; no coplanar panel overlays.
      add([.024,.44,.016],[side*W*.502,.78,L*.18],0x343b3d,1);
    }
  }
  if(!lod){
    add([W*.5,.18,.045],[0,.7,-L*.498],0x1c2429,1);
    for(let i=0;i<4;i++)add([W*.47,.013,.047],[0,.64+i*.04,-L*.499],0x8c9699,3);
    add([.36,.11,.05],[0,.58,-L*.501],0xe2dfca,3);add([.36,.11,.05],[0,.65,L*.503],0xe2dfca,3);
    for(const z of [-L*.475,L*.475])add([W*.85,.08,.13],[0,.49,z],0x627076,3);
    if(type===4)add([.6,.18,.35],[0,H+.1,0],0xf8d568,4);
    if(van)for(const side of [-1,1])add([.05,1.15,L*.52],[side*W*.434,1.61,L*.15],0xeeeeea);
  }
  return mergeParts(parts);
}
export const bodyPoints=[[0,.93,0],[0,1.36,0],[0,1.7,0],[-.23,1.38,0],[-.31,1.08,0],[-.34,.82,-.03],[.23,1.38,0],[.31,1.08,0],[.34,.82,-.03],[-.13,.9,0],[-.14,.5,0],[-.14,.12,-.06],[.13,.9,0],[.14,.5,0],[.14,.12,-.06]];
export const bodyLinks=[[0,1],[1,2],[1,3],[3,4],[4,5],[1,6],[6,7],[7,8],[0,9],[9,10],[10,11],[0,12],[12,13],[13,14],[3,6],[9,12],[3,0],[6,0],[9,1],[12,1]];
export function personModel(lod=false){
  if(lod)return mergeParts([part([.4,.66,.23],[0,1.18,0],0xffffff),part([.14,.76,.17],[-.12,.5,0],0x4b5662),part([.14,.76,.17],[.12,.5,0],0x4b5662),part([.14,.18,.14],[0,1.69,0],0xc59c7b,lowRound)]);
  // Rigid pieces are skinned to the same 15-point pose used by the ragdoll solver.
  const torso=new T.LatheGeometry([new T.Vector2(.15,-.30),new T.Vector2(.19,-.24),new T.Vector2(.20,-.08),new T.Vector2(.24,.12),new T.Vector2(.23,.23),new T.Vector2(.13,.29)],16);
  const head=new T.SphereGeometry(1,20,16);
  const parts=[{...part([1,1,.62],[0,1.25,0],0xffffff,torso),limb:1},{...part([.2,.15,.14],[0,.96,0],0x455365,round),limb:0},{...part([.145,.18,.135],[0,1.7,0],0xc69b7b,head),limb:2},
    {...part([.148,.10,.14],[0,1.82,.015],0x35302d,round),limb:2},{...part([.04,.05,.045],[0,1.69,-.133],0xc69b7b,round),limb:2},
    ...[-1,1].flatMap(x=>[
      {...part([.032,.017,.012],[x*.053,1.735,-.124],0xe5dfd5,round),limb:2},
      {...part([.010,.012,.008],[x*.053,1.735,-.137],0x313d3c,round),limb:2},
      {...part([.036,.019,.06],[x*.138,1.705,.006],0xc69b7b,round),limb:2},
      {...part([.052,.012,.012],[x*.054,1.763,-.12],0x493b32,round),limb:2}])];
  parts.push({...part([.07,.06,.07],[0,1.53,0],0xc69b7b,round),limb:2},
    {...part([.04,.01,.012],[0,1.635,-.122],0x976f5d,round),limb:2},
    {...part([.17,.02,.13],[0,1.54,0],0xe1e0d8,round),limb:1});
  for(const x of [-1,1])parts.push({...part([.034,.30,.018],[x*.12,1.22,.149],0x534940),limb:1,detail:2});
  for(let i=0;i<4;i++)parts.push({...part([.015,.015,.015],[0,1.14+i*.08,-.153],0xb9c4bf,round),limb:1});
  for(const [a,b,r,col] of [[3,4,.085,0xffffff],[4,5,.065,0xc69b7b],[6,7,.085,0xffffff],[7,8,.065,0xc69b7b],[9,10,.105,0x455365],[10,11,.082,0x455365],[12,13,.105,0x455365],[13,14,.082,0x455365]]){
    const from=new T.Vector3(...bodyPoints[a]),to=new T.Vector3(...bodyPoints[b]),at=from.clone().lerp(to,.5),rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize()));
    parts.push({...part([r,from.distanceTo(to)/2+r*.2,r],at.toArray(),col,round,rot.toArray().slice(0,3)),limb:b});
  }
  for(const n of [5,8])parts.push({...part([.07,.09,.06],bodyPoints[n],0xc69b7b,round),limb:n});
  for(const n of [11,14]){
    parts.push({...part([.098,.065,.18],[bodyPoints[n][0],.09,-.12],0x41464a,round),limb:n},
      {...part([.19,.032,.30],[bodyPoints[n][0],.04,-.12],0xc8c4b5),limb:n});
    for(let lace=0;lace<3;lace++)parts.push({...part([.095,.015,.012],[bodyPoints[n][0],.14,-.1-lace*.028],0xcacbc1),limb:n});
  }
  parts.push({...part([.17,.10,.17],[0,1.85,.01],0x4d6975,round),limb:2,detail:1},
    {...part([.26,.04,.22],[0,1.85,-.055],0x4d6975),limb:2,detail:1},
    {...part([.18,.23,.12],[0,1.23,.2],0x76624a,round),limb:1,detail:2},
    {...part([1.08,.98,.68],[0,1.24,0],0xffffff,torso),limb:1,detail:3});
  return mergeParts(parts);
}
export function dogModel(){
  const parts=[part([.23,.23,.46],[0,.57,0],0xffffff,round),part([.16,.18,.19],[0,.75,-.4],0xffffff,round),part([.11,.08,.19],[0,.68,-.55],0xa09b8d,round),part([.065,.06,.05],[0,.7,-.7],0x282c2c,round)];
  for(const x of [-1,1]){parts.push(part([.09,.22,.12],[x*.12,.81,-.36],0x55493d,round));for(const z of [-1,1])parts.push({...part([.07,.22,.07],[x*.17,.3,z*.27],0xffffff,round),limb:z*x>0?1:2});}
  parts.push(part([.06,.31,.06],[0,.73,.47],0x938271,round,[-.7,0,0]));return mergeParts(parts);
}
