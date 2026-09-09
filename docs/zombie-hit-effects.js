import * as T from './vendor/three.module.min.js';
// Fixed GPU/CPU pools: sustained automatic fire never creates new scene objects.
export class ZombieHitEffects {
  constructor(scene){
    this.dummy=new T.Object3D();this.next=0;this.nextStain=0;
    this.drops=Array.from({length:96},()=>({p:new T.Vector3(),v:new T.Vector3(),life:0,floor:0,size:.02}));
    this.stains=Array.from({length:20},()=>({p:new T.Vector3(),life:0,size:0,angle:0}));
    const material=new T.MeshBasicMaterial({color:0x781c1b});
    this.spray=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),material,96);
    this.splat=new T.InstancedMesh(new T.CircleGeometry(1,9).rotateX(-Math.PI/2),material,20);
    this.spray.name='pooled-zombie-blood-spray';this.splat.name='pooled-zombie-blood-stains';
    for(const m of [this.spray,this.splat]){m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(m);}
  }
  hit(point,direction,floor){
    for(let i=0;i<12;i++){const d=this.drops[this.next++%96];d.p.copy(point);d.v.copy(direction).multiplyScalar(.6+Math.random()*1.3);d.v.x+=(Math.random()-.5)*2;d.v.y+=.4+Math.random()*1.6;d.v.z+=(Math.random()-.5)*2;d.life=.3+Math.random()*.3;d.floor=floor;d.size=.009+Math.random()*.016;}
    const stain=this.stains[this.nextStain++%20];stain.p.set(point.x,floor+.012,point.z);stain.life=10;stain.size=.08+Math.random()*.12;stain.angle=Math.random()*Math.PI;
  }
  update(dt){
    const o=this.dummy;this.spray.count=this.splat.count=0;
    for(const d of this.drops){d.life=Math.max(0,d.life-dt);if(!d.life)continue;d.v.y-=9*dt;d.p.addScaledVector(d.v,dt);if(d.p.y<d.floor+.02){d.life=0;continue;}o.position.copy(d.p);o.rotation.set(0,0,0);o.scale.setScalar(d.size*Math.min(1,d.life*10));o.updateMatrix();this.spray.setMatrixAt(this.spray.count++,o.matrix);}
    for(const s of this.stains){s.life=Math.max(0,s.life-dt);if(!s.life)continue;o.position.copy(s.p);o.rotation.set(0,s.angle,0);const size=s.size*Math.min(1,s.life/2);o.scale.set(size,1,size*.65);o.updateMatrix();this.splat.setMatrixAt(this.splat.count++,o.matrix);}
    if(this.spray.count)this.spray.instanceMatrix.needsUpdate=true;if(this.splat.count)this.splat.instanceMatrix.needsUpdate=true;
  }
}
