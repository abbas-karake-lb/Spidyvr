import * as T from './vendor/three.module.min.js';
const SEGMENTS=56,SIDES=8,V=()=>new T.Vector3();
export class WebVisual extends T.Mesh {
  constructor(side){
    const geometry=new T.BufferGeometry(),positions=new Float32Array((SEGMENTS+1)*(SIDES+1)*3),normals=positions.slice(),uvs=new Float32Array((SEGMENTS+1)*(SIDES+1)*2),indices=[];
    for(let j=0;j<SEGMENTS;j++)for(let k=0;k<SIDES;k++){const a=j*(SIDES+1)+k,b=a+SIDES+1;indices.push(a,a+1,b,a+1,b+1,b);}
    geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('uv',new T.BufferAttribute(uvs,2).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);
    const material=new T.MeshStandardMaterial({color:side?0xe4edf0:0xf1eee0,roughness:.7,metalness:.03});
    material.onBeforeCompile=s=>{s.vertexShader='varying vec2 strandUV;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstrandUV=uv;');s.fragmentShader='varying vec2 strandUV;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat phase=strandUV.x*100.-strandUV.y*18.8496;float braid=.9+.1*cos(phase)*(1.-smoothstep(1.,3.,fwidth(phase)));float fine=strandUV.x*630.+strandUV.y*100.;float fiber=.98+.02*cos(fine)*(1.-smoothstep(1.,3.,fwidth(fine)));diffuseColor.rgb*=braid*fiber;');};material.customProgramCacheKey=()=> 'braided-web-v1';
    super(geometry,material);this.frustumCulled=false;this.visible=false;this.centers=Array.from({length:SEGMENTS+1},V);this.direction=V();this.right=V();this.up=V();this.tangent=V();this.normal=V();this.clock=0;this.settle=0;
  }
  update(from,to,{dt=0,flight=false,progress=1,restLength=0,impact=false}={}){
    this.clock+=dt;if(impact)this.settle=.32;this.settle=Math.max(0,this.settle-dt);
    const length=from.distanceTo(to);this.direction.copy(to).sub(from).normalize();this.right.set(0,1,0);if(Math.abs(this.direction.y)>.95)this.right.set(1,0,0);this.right.cross(this.direction).normalize();this.up.crossVectors(this.direction,this.right).normalize();
    const slack=flight?0:Math.max(0,restLength-length),sag=Math.min(2.4,slack*.12),wave=flight?Math.min(.38,length*.024)*(1-progress*.7):Math.min(.035,length*.003)+this.settle*.4;
    for(let j=0;j<=SEGMENTS;j++){const t=j/SEGMENTS,envelope=j===0||j===SEGMENTS?0:Math.sin(Math.PI*t),phase=t*Math.min(20,length*.7)-this.clock*22;this.centers[j].lerpVectors(from,to,t).addScaledVector(this.right,Math.sin(phase)*wave*envelope).addScaledVector(this.up,Math.cos(phase*.83)*wave*envelope);this.centers[j].y-=4*t*(1-t)*sag;}
    const p=this.geometry.attributes.position,n=this.geometry.attributes.normal,uv=this.geometry.attributes.uv;
    for(let j=0;j<=SEGMENTS;j++){
      this.tangent.copy(this.centers[Math.min(SEGMENTS,j+1)]).sub(this.centers[Math.max(0,j-1)]).normalize();this.right.set(Math.abs(this.tangent.y)>.95?1:0,Math.abs(this.tangent.y)>.95?0:1,0).cross(this.tangent).normalize();this.up.crossVectors(this.tangent,this.right).normalize();
      for(let k=0;k<=SIDES;k++){const theta=k/SIDES*Math.PI*2,index=j*(SIDES+1)+k,radius=(flight?.013:.01)*(1+.13*Math.cos(theta*3-j/SEGMENTS*length*18));this.normal.copy(this.right).multiplyScalar(Math.cos(theta)).addScaledVector(this.up,Math.sin(theta));const c=this.centers[j];p.setXYZ(index,c.x+this.normal.x*radius,c.y+this.normal.y*radius,c.z+this.normal.z*radius);n.setXYZ(index,...this.normal);uv.setXY(index,j/SEGMENTS*length,k/SIDES);}
    }
    p.needsUpdate=n.needsUpdate=uv.needsUpdate=true;this.visible=length>.001;
  }
}

export function webImpact(){
  const points=[];for(let ray=0;ray<7;ray++){const angle=ray/7*Math.PI*2,next=(ray+1)/7*Math.PI*2;points.push(new T.Vector3(),new T.Vector3(Math.cos(angle)*.25,Math.sin(angle)*.25,0));for(const radius of [.09,.17]){points.push(new T.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,0),new T.Vector3(Math.cos(next)*radius,Math.sin(next)*radius,0));}}
  return new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xeff8f5,transparent:true,opacity:0,depthWrite:false}));
}
