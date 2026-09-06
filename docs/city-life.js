import * as T from './vendor/three.module.min.js';
// Merge simple parts once. All cars share one geometry/material; likewise people/birds.
function model(parts){
  const positions=[],normals=[],colors=[],limbs=[];const matrix=new T.Matrix4(),rotation=new T.Quaternion(),p=new T.Vector3(),s=new T.Vector3();
  for(const part of parts){const [size,at,color,limb=0]=part;const geo=new T.BoxGeometry(...size).toNonIndexed();matrix.compose(p.fromArray(at),rotation,s.set(1,1,1));geo.applyMatrix4(matrix);const rgb=new T.Color(color);
    for(let i=0;i<geo.attributes.position.count;i++){positions.push(...[geo.attributes.position.getX(i),geo.attributes.position.getY(i),geo.attributes.position.getZ(i)]);normals.push(geo.attributes.normal.getX(i),geo.attributes.normal.getY(i),geo.attributes.normal.getZ(i));colors.push(rgb.r,rgb.g,rgb.b);limbs.push(limb);}geo.dispose();}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('limb',new T.Float32BufferAttribute(limbs,1));return g;
}
export function createCityLife(scene,boxes){
  let seed=8804;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const dummy=new T.Object3D(),color=new T.Color(),timeUniform={value:0},material=new T.MeshLambertMaterial({vertexColors:true});
  const carGeo=model([
    [[1.8,.7,4.1],[0,.7,0],0xffffff],[[1.5,.65,2.1],[0,1.33,-.15],0x304b60],
    [[1.6,.12,2.25],[0,1.7,-.15],0xeeeeee],[[1.7,.18,.18],[0,.65,-2.12],0xdddccf],
    [[.45,.17,.07],[-.57,.93,-2.1],0xfff3c8],[[.45,.17,.07],[.57,.93,-2.1],0xfff3c8],
    [[.45,.16,.07],[-.57,.92,2.1],0xdf302c],[[.45,.16,.07],[.57,.92,2.1],0xdf302c],
    ...[-1,1].flatMap(x=>[-1,1].map(z=>[[.28,.58,.68],[x*.89,.39,z*1.3],0x1b252b]))
  ]);
  const carLOD=model([[[1.8,1,4.1],[0,.7,0],0xffffff],[[1.5,.6,2.1],[0,1.4,0],0x304b60]]);
  const peopleGeo=model([
    [[.42,.6,.24],[0,1.2,0],0xffffff],[[.25,.28,.25],[0,1.69,0],0xc69b7d],[[.27,.1,.27],[0,1.85,0],0x413d36],
    [[.16,.85,.17],[-.13,.5,0],0x374955,1],[[.16,.85,.17],[.13,.5,0],0x374955,2],
    [[.14,.58,.16],[-.29,1.15,0],0xaab7bd,3],[[.14,.58,.16],[.29,1.15,0],0xaab7bd,4]
  ]);
  const peopleLOD=model([[[.45,1.2,.25],[0,.92,0],0xffffff],[[.26,.3,.26],[0,1.67,0],0xc69b7d]]);
  const walkingMaterial=new T.MeshLambertMaterial({vertexColors:true});
  walkingMaterial.onBeforeCompile=shader=>{shader.uniforms.lifeTime=timeUniform;shader.vertexShader='uniform float lifeTime;\nattribute float limb;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      if(limb>0.5){float side=mod(limb,2.0)<0.5?1.0:-1.0;float angle=sin(lifeTime*7.5+instanceMatrix[3].x*.3+instanceMatrix[3].z*.3)*side*.45;float pivot=limb>2.5?1.42:.91;vec2 yz=transformed.yz-vec2(pivot,0.0);transformed.yz=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*yz+vec2(pivot,0.0);}`);
  };walkingMaterial.customProgramCacheKey=()=> 'pedestrian-gait-v1';
  const birdGeo=model([[[.12,.12,.45],[0,0,0],0x344451],[[.54,.045,.22],[-.32,0,0],0x455667,1],[[.54,.045,.22],[.32,0,0],0x455667,2]]);
  const birdMat=new T.MeshLambertMaterial({vertexColors:true});birdMat.onBeforeCompile=shader=>{shader.uniforms.lifeTime=timeUniform;shader.vertexShader='uniform float lifeTime;\nattribute float limb;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nif(limb>0.5)transformed.y+=sin(lifeTime*9.0+instanceMatrix[3].z)*abs(position.x)*.65;');};birdMat.customProgramCacheKey=()=> 'bird-wings-v1';
  function pool(name,geometry,mat,count){const mesh=new T.InstancedMesh(geometry,mat,count);mesh.name=name;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);return mesh;}
  const carsNear=pool('traffic-near',carGeo,material,56),carsFar=pool('traffic-far',carLOD,material,56),peopleNear=pool('people-near',peopleGeo,walkingMaterial,96),peopleFar=pool('people-far',peopleLOD,material,96),birdsMesh=pool('birds',birdGeo,birdMat,18);
  const traffic=[],people=[],birds=[];
  for(let i=0;i<56;i++)traffic.push({horizontal:i%2===0,lane:-5+i%11,sign:i%4<2?1:-1,phase:rand()*528,speed:6+rand()*3.5,color:[0xcc6650,0xe1d6c0,0x6b9daf,0xd4b355,0x8caa93,0xbac2c5][i%6]});
  // Rectangular paths follow each block's sidewalks, never through a building or street.
  for(let i=0;i<96;i++){const ix=(i*7)%11-5,iz=(i*3+Math.floor(i/11))%11-5;people.push({x:ix*44,z:iz*44,phase:rand()*132,speed:.7+rand()*.7,color:[0xc5bca4,0xb06c57,0x638ba6,0x758e73,0xa195ac,0xb19c66][i%6]});}
  for(let i=0;i<18;i++)birds.push({lane:(i%5-2)*44+22,phase:rand()*500,y:48+rand()*75,speed:9+rand()*5});
  const planeGeo=model([[[.65,.65,8],[0,0,0],0xe5e7dc],[[10,.15,1.7],[0,0,.2],0xe5e7dc],[[4,.1,1],[0,.25,3],0x899fac],[[.1,1.5,1.4],[0,.7,3],0x789aad]]);
  const aircraft=new T.Mesh(planeGeo,material);aircraft.name='distant-aircraft';scene.add(aircraft);
  // Gradated sky and a soft sun, without a giant texture or postprocessing pass.
  const sky=new T.Mesh(new T.SphereGeometry(620,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 skyDirection; void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 skyDirection; void main(){vec3 d=normalize(skyDirection);float h=clamp(d.y,0.0,1.0);vec3 color=mix(vec3(.64,.77,.83),vec3(.23,.48,.68),pow(h,.55));float sun=pow(max(0.0,dot(d,normalize(vec3(-.5,.65,.4)))),250.0);color+=vec3(.2,.17,.1)*sun;gl_FragColor=vec4(color,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));sky.name='sky';sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
  let lastUpdate=-1,frozen=0,lastClock=null;const stats={cars:0,pedestrians:0,birds:0,aircraft:0};
  function write(mesh,position,angle,tint,scale=1){dummy.position.copy(position);dummy.rotation.set(0,angle,0);dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(mesh.count,dummy.matrix);mesh.setColorAt(mesh.count,color.set(tint));mesh.count++;}
  const position=new T.Vector3();
  function update(clock,viewer,paused=false){
    if(lastClock===null)lastClock=clock;const dt=Math.max(0,Math.min(.1,clock-lastClock));lastClock=clock;if(!paused)frozen+=dt;
    timeUniform.value=frozen;sky.position.copy(viewer);const t=frozen;
    // Small visible pools update every render frame; no 30 Hz traffic stepping.
    lastUpdate=clock;
    for(const mesh of [carsNear,carsFar,peopleNear,peopleFar,birdsMesh])mesh.count=0;
    for(const car of traffic){const along=((car.phase+t*car.speed)%528)-264,lane=car.lane*44+22+car.sign*2.1;position.set(car.horizontal?along*car.sign:lane,0,car.horizontal?lane:along*car.sign);const distance=position.distanceToSquared(viewer);if(distance>330**2)continue;write(distance<80**2?carsNear:carsFar,position,car.horizontal?-car.sign*Math.PI/2:car.sign>0?Math.PI:0,car.color);}
    for(const person of people){const route=(person.phase+t*person.speed)%132,side=Math.floor(route/33),along=route%33-16.5;position.set(person.x+(side===0?along:side===1?16.5:side===2?-along:-16.5),.18,person.z+(side===0?-16.5:side===1?along:side===2?16.5:-along));const distance=position.distanceToSquared(viewer);if(distance>185**2)continue;write(distance<48**2?peopleNear:peopleFar,position,[-Math.PI/2,Math.PI,Math.PI/2,0][side],person.color);}
    for(const bird of birds){position.set(bird.lane+Math.sin(t*.25+bird.phase)*2,bird.y+Math.sin(t*.18+bird.phase)*3,((bird.phase+t*bird.speed)%500)-250);if(position.distanceToSquared(viewer)<270**2)write(birdsMesh,position,Math.PI,0xffffff);}
    const aircraftPhase=t%105;aircraft.visible=aircraftPhase<36;aircraft.position.set(-450+aircraftPhase*25,185,-180);aircraft.rotation.y=-Math.PI/2;
    for(const mesh of [carsNear,carsFar,peopleNear,peopleFar,birdsMesh]){mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    stats.cars=carsNear.count+carsFar.count;stats.pedestrians=peopleNear.count+peopleFar.count;stats.birds=birdsMesh.count;stats.aircraft=Number(aircraft.visible);
  }
  return {update,stats,pools:{carsNear,carsFar,peopleNear,peopleFar,birdsMesh},traffic,people};
}
