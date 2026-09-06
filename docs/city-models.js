import * as T from './vendor/three.module.min.js';
// Bake reusable authored primitives into shared vertex-colour meshes, never separate draw calls per part.
export function mergeParts(parts){
  const positions=[],normals=[],colors=[],limbs=[],details=[];const matrix=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),s=new T.Vector3(),e=new T.Euler();
  for(const part of parts){
    const source=part.geo||box;const g=source.index?source.toNonIndexed():source.clone();
    q.setFromEuler(e.fromArray(part.rot||[0,0,0]));matrix.compose(p.fromArray(part.at||[0,0,0]),q,s.fromArray(part.size||[1,1,1]));g.applyMatrix4(matrix);const c=new T.Color(part.color??0xffffff);
    for(let i=0;i<g.attributes.position.count;i++){positions.push(g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i));normals.push(g.attributes.normal.getX(i),g.attributes.normal.getY(i),g.attributes.normal.getZ(i));colors.push(c.r,c.g,c.b);limbs.push(part.limb||0);details.push(part.detail||0);}g.dispose();
  }
  const g=new T.BufferGeometry();for(const [name,array,size] of [['position',positions,3],['normal',normals,3],['color',colors,3],['limb',limbs,1],['detail',details,1]])g.setAttribute(name,new T.Float32BufferAttribute(array,size));g.computeBoundingSphere();return g;
}
const lowRound=new T.IcosahedronGeometry(1,0);
const box=new T.BoxGeometry(1,1,1),round=new T.SphereGeometry(1,8,6),wheel=new T.CylinderGeometry(1,1,1,12);
const part=(size,at,color,geo=box,rot=[0,0,0])=>({size,at,color,geo,rot});
export function vehicleModel(type=0,lod=false){
  const van=type===2,bus=type===3,suv=type===1,L=bus?8.2:van?5.2:4.5,H=bus?2.65:van?2.15:suv?1.65:1.35,W=bus?2.35:1.85;
  const parts=[part([W,.65,L],[0,.75,0],0xffffff),part([W*.86,H-.55,L*(bus?.84:van?.72:.5)],[0,1.04+(H-.55)/2,van?.2:0],0x405c6c),part([W*.94,.12,L*(bus?.88:van?.76:.54)],[0,H+.8,van?.2:0],0xf2f0e7)];
  if(lod)return mergeParts(parts);
  parts.push(part([W*.95,.18,L*.28],[0,1.13,-L*.35],0xe2e4df),part([W*.96,.16,.16],[0,.59,-L*.51],0x3d4749),part([W*.96,.16,.16],[0,.59,L*.51],0x3d4749),part([W*.6,.23,.04],[0,.85,-L*.52],0x293237));
  for(const side of [-1,1]){
    parts.push(part([.42,.15,.07],[side*W*.32,1.06,-L*.51],0xffefd0),part([.36,.2,.07],[side*W*.34,1.02,L*.51],0xdc483c),part([.13,.14,.31],[side*(W*.51),1.38,-.68],0xd1d5d0));
    for(const z of [-L*.31,L*.31]){
      parts.push(part([.38,.24,.38],[side*W*.51,.46,z],0x20282b,wheel,[0,0,Math.PI/2]),part([.21,.255,.21],[side*W*.515,.46,z],0xaab4b5,wheel,[0,0,Math.PI/2]));
    }
    for(let j=0;j<(bus?6:2);j++)parts.push(part([.09,H-.5,.07],[side*W*.44,1.04+(H-.55)/2,-L*.2+j*(bus?.95:.9)],0xd0d5d3));
    parts.push(part([.05,.06,.26],[side*W*.505,1.03,.38],0xc5cac6));
  }
  if(type===4){parts.push(part([.65,.25,.48],[0,H+1,0],0xf8d161));}
  return mergeParts(parts);
}
export const bodyPoints=[[0,.93,0],[0,1.36,0],[0,1.7,0],[-.23,1.38,0],[-.31,1.08,0],[-.34,.82,-.03],[.23,1.38,0],[.31,1.08,0],[.34,.82,-.03],[-.13,.9,0],[-.14,.5,0],[-.14,.12,-.06],[.13,.9,0],[.14,.5,0],[.14,.12,-.06]];
export const bodyLinks=[[0,1],[1,2],[1,3],[3,4],[4,5],[1,6],[6,7],[7,8],[0,9],[9,10],[10,11],[0,12],[12,13],[13,14],[3,6],[9,12],[3,0],[6,0],[9,1],[12,1]];
export function personModel(lod=false){
  if(lod)return mergeParts([part([.4,.66,.23],[0,1.18,0],0xffffff),part([.14,.76,.17],[-.12,.5,0],0x4b5662),part([.14,.76,.17],[.12,.5,0],0x4b5662),part([.14,.18,.14],[0,1.69,0],0xc59c7b,lowRound)]);
  // Rigid pieces are skinned to the same 15-point pose used by the ragdoll solver.
  const parts=[{...part([.25,.34,.15],[0,1.25,0],0xffffff,round),limb:1},{...part([.2,.15,.14],[0,.96,0],0x455365,round),limb:0},{...part([.145,.18,.135],[0,1.7,0],0xc69b7b,round),limb:2},
    {...part([.148,.10,.14],[0,1.82,.015],0x35302d,round),limb:2},{...part([.04,.05,.045],[0,1.69,-.133],0xc69b7b,round),limb:2},
    ...[-1,1].map(x=>({...part([.025,.018,.01],[x*.053,1.735,-.124],0x273337),limb:2}))];
  for(const [a,b,r,col] of [[3,4,.085,0xffffff],[4,5,.065,0xc69b7b],[6,7,.085,0xffffff],[7,8,.065,0xc69b7b],[9,10,.105,0x455365],[10,11,.082,0x455365],[12,13,.105,0x455365],[13,14,.082,0x455365]]){
    const from=new T.Vector3(...bodyPoints[a]),to=new T.Vector3(...bodyPoints[b]),at=from.clone().lerp(to,.5),rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize()));
    parts.push({...part([r,from.distanceTo(to)/2+r*.2,r],at.toArray(),col,round,rot.toArray().slice(0,3)),limb:b});
  }
  for(const n of [5,8])parts.push({...part([.07,.09,.06],bodyPoints[n],0xc69b7b,round),limb:n});
  for(const n of [11,14])parts.push({...part([.18,.11,.31],[bodyPoints[n][0],.09,-.12],0x30383d),limb:n});
  parts.push({...part([.17,.10,.17],[0,1.85,.01],0x4d6975,round),limb:2,detail:1},
    {...part([.26,.04,.22],[0,1.85,-.055],0x4d6975),limb:2,detail:1},
    {...part([.31,.42,.18],[0,1.23,.2],0x76624a),limb:1,detail:2},
    {...part([.48,.48,.29],[0,1.2,0],0xffffff),limb:1,detail:3});
  return mergeParts(parts);
}
export function dogModel(){
  const parts=[part([.23,.23,.46],[0,.57,0],0xffffff,round),part([.16,.18,.19],[0,.75,-.4],0xffffff,round),part([.11,.08,.19],[0,.68,-.55],0xa09b8d,round),part([.065,.06,.05],[0,.7,-.7],0x282c2c,round)];
  for(const x of [-1,1]){parts.push(part([.09,.22,.12],[x*.12,.81,-.36],0x55493d,round));for(const z of [-1,1])parts.push({...part([.07,.22,.07],[x*.17,.3,z*.27],0xffffff,round),limb:z*x>0?1:2});}
  parts.push(part([.06,.31,.06],[0,.73,.47],0x938271,round,[-.7,0,0]));return mergeParts(parts);
}
