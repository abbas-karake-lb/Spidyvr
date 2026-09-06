import * as T from './vendor/three.module.min.js';
import {Movement,V,defaults} from './physics.js';
import {createCity} from './city.js';
import {turnDelta,WebFlight,showVRPanel} from './traversal.js';
const $=id=>document.getElementById(id);
const scene=new T.Scene();scene.background=new T.Color(0xa3c3d4);scene.fog=new T.Fog(0xa3c3d4,150,550);
scene.add(new T.HemisphereLight(0xe6f3ff,0x667268,2.2));
const sun=new T.DirectionalLight(0xfff0d8,2.1);sun.position.set(-80,150,60);scene.add(sun);
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(.9);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
$('viewport').appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.08,700);camera.rotation.order='YXZ';
const rig=new T.Group();rig.add(camera);scene.add(rig);
const city=createCity(scene);const physics=new Movement(city.boxes);
const settings={...defaults,vignette:false};try{const saved=JSON.parse(localStorage.getItem('spidyvr-settings')||'{}');for(const key of ['pull','jump','gravity'])if(Number.isFinite(saved[key]))settings[key]=Math.max(+$(key).min,Math.min(+$(key).max,saved[key]));settings.vignette=!!saved.vignette;}catch{}
Object.assign(physics.settings,settings);
function syncSettings(){for(const k of ['pull','jump','gravity']){$(k).value=settings[k];$(k+'Value').value=settings[k];} $('vignette').checked=settings.vignette;Object.assign(physics.settings,settings);try{localStorage.setItem('spidyvr-settings',JSON.stringify(settings));}catch{}}
syncSettings();for(const k of ['pull','jump','gravity'])$(k).oninput=()=>{settings[k]=+$(k).value;syncSettings();};$('vignette').onchange=()=>{settings.vignette=$('vignette').checked;syncSettings();};$('resetSettings').onclick=()=>{Object.assign(settings,defaults,{vignette:false});syncSettings();};
let session=null,active=false,paused=false,desktop=false,lastTime=0,accumulator=0,yaw=0,pitch=-.15,charge=0,jumpHeld=false;
let headLocal=V(),lastHead=null,roomY=0,lastHud=0,overlayTimer=10,audio=null,wind=null;
const keys=new Set(),mouse=[false,false],reels=[false,false],worldUp=V(0,1,0);
const ray=new T.Ray(),hit=V(),origin=V(),direction=V(),handOffset=[V(-.25,1.35,-.4),V(.25,1.35,-.4)];
const previousHand=[null,null],buttonHistory=[[],[]],sources=[null,null],triggerHeld=[false,false],tracked=[false,false];
const hands=[],webs=[],targets=[],aimLines=[],tips=[],impacts=[];
const flights=[new WebFlight(),new WebFlight()],flashTimers=[0,0],impactTimers=[0,0];
const shooterOffset=V(0,.05,-.015),shooterWorld=[V(),V()];
let shotBuffer=null;const shotPanners=[],shotVoices=[];
for(let i=0;i<2;i++){
  const group=new T.Group();
  const glove=new T.Mesh(new T.SphereGeometry(.065,12,8),new T.MeshLambertMaterial({color:i===0?0xd44a49:0x4d91b5}));glove.scale.set(1,.85,1.5);group.add(glove);
  const cuff=new T.Mesh(new T.CylinderGeometry(.055,.06,.09,10),new T.MeshLambertMaterial({color:0x1f3445}));cuff.rotation.x=Math.PI/2;cuff.position.z=.09;group.add(cuff);
  const emitter=new T.Mesh(new T.SphereGeometry(.018,8,6),new T.MeshBasicMaterial({color:0x9effe6}));emitter.position.set(0,.05,-.015);group.add(emitter);
  scene.add(group);group.visible=false;hands.push(group);
  const tip=new T.Mesh(new T.IcosahedronGeometry(.085,0),new T.MeshBasicMaterial({color:0xebfff9}));tip.visible=false;scene.add(tip);tips.push(tip);
  const impact=new T.Mesh(new T.RingGeometry(.15,.23,16),new T.MeshBasicMaterial({color:0xd9fff0,side:T.DoubleSide,transparent:true,depthWrite:false}));impact.visible=false;scene.add(impact);impacts.push(impact);
  const web=new T.Mesh(new T.CylinderGeometry(1,1,1,6),new T.MeshBasicMaterial({color:i===0?0xe0fff5:0xd6eeff}));web.visible=false;web.frustumCulled=false;scene.add(web);webs.push(web);
  const target=new T.Mesh(new T.SphereGeometry(.18,12,8),new T.MeshBasicMaterial({color:0x8cffe2,depthTest:false,transparent:true,opacity:.85}));target.visible=false;target.renderOrder=5;scene.add(target);targets.push(target);
  const beam=new T.Line(new T.BufferGeometry().setFromPoints([V(),V()]),new T.LineBasicMaterial({color:i===0?0x9bffe2:0x99d9ff,transparent:true,opacity:.3}));beam.visible=false;beam.frustumCulled=false;scene.add(beam);aimLines.push(beam);
}
function cast(o,d,max=170){ray.set(o,d);let nearest=max,point=null;for(const box of city.boxes){if(ray.intersectBox(box,hit)){const distance=hit.distanceTo(o);if(distance>.25&&distance<nearest){nearest=distance;point=hit.clone();}}}return point;}
function pulse(i,power=.4,duration=35){try{sources[i]?.gamepad?.hapticActuators?.[0]?.pulse(power,duration)?.catch(()=>{});}catch{}}
function sound(freq=380){if(!audio)return;try{const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.35,audio.currentTime+.12);gain.gain.setValueAtTime(.06,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.14);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.15);}catch{}}
async function startAudio(){try{if(!audio){audio=new AudioContext();const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()-.5)*.3;const noise=audio.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;wind=audio.createGain();wind.gain.value=0;noise.connect(filter).connect(wind).connect(audio.destination);noise.start();}await audio.resume();}catch{}}
// Two reusable spatial panners, and a shared synthesized "thwip" sample.
function fireSound(i,position){
  if(!audio)return;
  try{
    if(!shotBuffer){shotBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.14),audio.sampleRate);const data=shotBuffer.getChannelData(0);let phase=0;for(let n=0;n<data.length;n++){const t=n/audio.sampleRate;phase+=2*Math.PI*(2100*Math.exp(-t*24)+180)/audio.sampleRate;data[n]=(Math.sin(phase)*.45+(Math.random()*2-1)*.35)*Math.exp(-t*36)*Math.min(1,t/.002);}}
    if(!shotPanners[i]){const p=audio.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=1;p.rolloffFactor=.35;p.connect(audio.destination);shotPanners[i]=p;}
    shotVoices[i]?.stop();const source=audio.createBufferSource();source.buffer=shotBuffer;source.connect(shotPanners[i]);shotVoices[i]=source;
    const p=shotPanners[i];p.positionX.value=position.x;p.positionY.value=position.y;p.positionZ.value=position.z;
    source.onended=()=>{source.disconnect();if(shotVoices[i]===source)shotVoices[i]=null;};source.start();
  }catch{}
}
function updateAudioPose(position,quaternion){
  if(!audio)return;const listener=audio.listener,forward=V(0,0,-1).applyQuaternion(quaternion),up=V(0,1,0).applyQuaternion(quaternion);
  if(listener.positionX){for(const axis of ['x','y','z']){const suffix=axis.toUpperCase();listener['position'+suffix].value=position[axis];listener['forward'+suffix].value=forward[axis];listener['up'+suffix].value=up[axis];}}
  else{listener.setPosition(position.x,position.y,position.z);listener.setOrientation(forward.x,forward.y,forward.z,up.x,up.y,up.z);}
  for(let i=0;i<2;i++)if(shotPanners[i]){const p=shotPanners[i],v=shooterWorld[i];p.positionX.value=v.x;p.positionY.value=v.y;p.positionZ.value=v.z;}
}
function surfaceNormal(point){
  for(const box of city.boxes)if(point.x>=box.min.x-.02&&point.x<=box.max.x+.02&&point.y>=box.min.y-.02&&point.y<=box.max.y+.02&&point.z>=box.min.z-.02&&point.z<=box.max.z+.02){for(const axis of ['x','y','z'])for(const side of ['min','max'])if(Math.abs(point[axis]-box[side][axis])<.02){const normal=V();normal[axis]=side==='min'?-1:1;return normal;}}
  return V(0,1,0);
}
function cancelWeb(i){physics.release(i);flights[i].cancel();impactTimers[i]=0;flashTimers[i]=0;}
function advanceFlights(dt){for(let i=0;i<2;i++){
  flashTimers[i]=Math.max(0,flashTimers[i]-dt);impactTimers[i]=Math.max(0,impactTimers[i]-dt);
  if(flights[i].advance(dt)&&triggerHeld[i]&&!paused){
    const from=physics.p.clone().add(handOffset[i]),to=flights[i].target,toward=to.clone().sub(from),block=cast(from,toward.clone().normalize(),toward.length());
    if(block&&block.distanceTo(to)>.8)continue;
    physics.attach(i,to,handOffset[i]);pulse(i,.45,40);
    const normal=surfaceNormal(to);impacts[i].position.copy(to).addScaledVector(normal,.06);impacts[i].quaternion.setFromUnitVectors(V(0,0,1),normal);impactTimers[i]=.18;
  }
}}
function releaseAll(){for(let i=0;i<2;i++){cancelWeb(i);previousHand[i]=null;triggerHeld[i]=false;reels[i]=false;mouse[i]=false;}keys.clear();jumpHeld=false;charge=0;}
function reset(){releaseAll();physics.reset();lastHead=null;overlayTimer=8;sound(280);}
function uiPlaying(playing){document.body.classList.toggle('playing',playing);$('menu').hidden=playing;$('footer').hidden=playing;$('hud').hidden=!playing||!!session;$('hint').hidden=!playing||!!session;$('crosshair').hidden=!playing||!!session;$('menuButton').hidden=!playing||!!session;}
function pause(value){paused=value;vrHUD.visible=showVRPanel(!!session,paused);lastHud=-1;releaseAll();if(wind)wind.gain.value=0;overlayTimer=value?999:6;if(desktop)uiPlaying(!value);}
$('menuButton').onclick=()=>{document.exitPointerLock?.();pause(true);};
$('desktop').onclick=()=>{startAudio();if(session)return;desktop=true;active=true;paused=false;uiPlaying(true);camera.position.set(0,1.7,0);renderer.domElement.requestPointerLock?.();};
$('enterVR').onclick=async()=>{
  $('enterVR').disabled=true;startAudio();
  try{
    // This request is issued directly within the user gesture, before any await.
    const request=navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});
    session=await request;desktop=false;active=true;paused=false;reset();camera.position.set(0,0,0);camera.rotation.set(0,0,0);yaw=0;
    session.addEventListener('end',()=>{session=null;active=false;desktop=false;paused=false;releaseAll();rig.rotation.set(0,0,0);camera.position.set(0,1.7,0);camera.rotation.set(-.15,0,0);uiPlaying(false);$('enterVR').disabled=false;$('enterVR').textContent='Enter VR';if(wind)wind.gain.value=0;});
    session.addEventListener('visibilitychange',()=>{releaseAll();lastHead=null;accumulator=0;lastTime=0;if(wind)wind.gain.value=0;});
    session.addEventListener('inputsourceschange',()=>{previousHand.fill(null);});
    await renderer.xr.setSession(session);renderer.xr.setFoveation(1);uiPlaying(true);
  }catch(error){if(session){try{await session.end();}catch{}}session=null;active=false;$('status').textContent='Could not enter VR: '+error.message;$('enterVR').disabled=false;uiPlaying(false);}
};
if(navigator.xr){navigator.xr.isSessionSupported('immersive-vr').then(ok=>{$('enterVR').disabled=!ok;$('enterVR').textContent=ok?'Enter VR':'Open in Quest Browser';$('status').textContent=ok?'Ready. Put on your headset and enter VR.':'Open this same address in Meta Quest Browser for VR.';}).catch(()=>{$('enterVR').textContent='Open in Quest Browser';$('status').textContent='VR is unavailable in this browser.';});}else{$('enterVR').textContent='Open in Quest Browser';$('status').textContent='For VR, open this link inside your Quest 3 browser.';}
$('desktop').disabled=false;
window.addEventListener('keydown',e=>{if(!desktop||paused)return;if(['Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR')reset();});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{releaseAll();if(desktop)pause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();if(wind)wind.gain.value=0;}lastTime=0;});
document.addEventListener('pointerlockchange',()=>{if(desktop&&!document.pointerLockElement)pause(true);});
renderer.domElement.addEventListener('mousedown',e=>{if(desktop&&!paused){if(e.button===0)mouse[0]=true;if(e.button===2)mouse[1]=true;}});
window.addEventListener('mouseup',e=>{if(e.button===0)mouse[0]=false;if(e.button===2)mouse[1]=false;});
window.addEventListener('contextmenu',e=>{if(desktop)e.preventDefault();});
window.addEventListener('mousemove',e=>{if(desktop&&document.pointerLockElement&&!paused){yaw-=e.movementX*.002;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*.002));}});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
// World-space HUD: DOM is never relied on for immersive controls or feedback.
const hudCanvas=document.createElement('canvas');hudCanvas.width=1024;hudCanvas.height=512;const ctx=hudCanvas.getContext('2d'),hudTexture=new T.CanvasTexture(hudCanvas);hudTexture.colorSpace=T.SRGBColorSpace;
const vrHUD=new T.Mesh(new T.PlaneGeometry(1.1,.55),new T.MeshBasicMaterial({map:hudTexture,transparent:true,depthTest:false}));vrHUD.renderOrder=20;scene.add(vrHUD);vrHUD.visible=false;
const comfortGeo=new T.RingGeometry(.36,3,64);const comfort=new T.Mesh(comfortGeo,new T.MeshBasicMaterial({color:0x091721,transparent:true,opacity:0,depthTest:false,side:T.DoubleSide}));comfort.renderOrder=19;scene.add(comfort);comfort.visible=false;
function updateHud(time,headPos,headQuat){
  const speed=physics.v.length(),ropeCount=physics.ropes.filter(Boolean).length;
  if((!session||paused)&&time-lastHud>.15){lastHud=time;$('speed').textContent=Math.round(speed*3.6);$('altitude').textContent=Math.round(physics.p.y);$('ropeStatus').textContent=ropeCount?`${ropeCount} WEB${ropeCount===2?'S':''} ATTACHED`:'WEBS READY';
    ctx.clearRect(0,0,1024,512);ctx.fillStyle='rgba(9,25,34,.82)';ctx.fillRect(0,0,1024,512);ctx.strokeStyle='#85efd4';ctx.lineWidth=4;ctx.strokeRect(2,2,1020,508);
    ctx.fillStyle='#a0ffe4';ctx.font='bold 43px sans-serif';ctx.fillText(paused?'PAUSED · Y TO RESUME':'SPIDYVR',32,60);
    ctx.fillStyle='white';ctx.font='30px sans-serif';ctx.fillText(`${Math.round(speed*3.6)} km/h     ${Math.round(physics.p.y)} m     ${ropeCount}/2 webs`,32,108);
    ctx.font='28px sans-serif';
    const lines=paused||overlayTimer>0?['TRIGGER hold web · release to fly','PULL hand back → launch forward','PULL hand down → launch upward','GRIP reel in · A hold/release jump','Left stick move · Right stick turn','B reset · X pull power · Y pause']:[`Pull power ${settings.pull}  ·  X to change`,charge>0?`JUMP CHARGING ${Math.round(charge*100)}%`:'Pull fast. Release at the top of your swing.','Y for controls'];
    lines.forEach((line,i)=>ctx.fillText(line,32,165+i*49));hudTexture.needsUpdate=true;
  }
  vrHUD.visible=showVRPanel(!!session,paused);comfort.visible=!!session&&settings.vignette&&!paused;
  if(session){const offset=V(0,paused?-.08:-.36,-1.3).applyQuaternion(headQuat);vrHUD.position.copy(headPos).add(offset);vrHUD.quaternion.copy(headQuat);vrHUD.scale.setScalar(paused||overlayTimer>0?1:.6);comfort.position.copy(headPos).add(V(0,0,-.42).applyQuaternion(headQuat));comfort.quaternion.copy(headQuat);comfort.material.opacity=Math.min(.86,Math.max(0,(speed-7)/24));}
  $('charge').hidden=charge<=0||!!session;$('charge').firstElementChild.style.width=`${charge*100}%`;
}
const yawQuat=new T.Quaternion(),headQuat=new T.Quaternion(),headWorld=V(),moveWish=V();
function processHand(i,o,d,offset,pressed,grip,delta,dt){
  handOffset[i].copy(offset);if(physics.ropes[i])physics.ropes[i].hand.copy(offset);
  const target=cast(o,d);targets[i].visible=!!target;if(target)targets[i].position.copy(target);
  const line=aimLines[i];line.visible=!!session&&!physics.ropes[i]&&!flights[i].active&&!paused;
  const arr=line.geometry.attributes.position;arr.setXYZ(0,o.x,o.y,o.z);const end=target||o.clone().addScaledVector(d,6);arr.setXYZ(1,end.x,end.y,end.z);arr.needsUpdate=true;
  if(pressed&&!triggerHeld[i]&&!paused){
    shooterWorld[i].copy(shooterOffset).applyQuaternion(hands[i].quaternion).add(physics.p).add(offset);
    fireSound(i,shooterWorld[i]);flashTimers[i]=.07;
    if(target){flights[i].fire(shooterWorld[i],target);pulse(i,.22,20);}else pulse(i,.15,18);
  }
  if(!pressed&&triggerHeld[i])cancelWeb(i);
  triggerHeld[i]=pressed;reels[i]=grip&&!paused;
  if(physics.ropes[i]&&delta&&!paused){const power=physics.pull(i,delta,dt);if(power>.22)pulse(i,Math.min(.7,power*.12),18);}
}
function buttonEdge(i,buttons,index){const now=!!buttons[index]?.pressed,edge=now&&!buttonHistory[i][index];buttonHistory[i][index]=now;return edge;}
function updateXR(frame,dt){
  const reference=renderer.xr.getReferenceSpace(),viewer=frame.getViewerPose(reference);if(!viewer){releaseAll();lastHead=null;return false;}
  sources.fill(null);for(const source of session.inputSources){if(source.handedness==='left')sources[0]=source;if(source.handedness==='right')sources[1]=source;}
  const turnPad=sources[1]?.gamepad;
  if(!paused&&turnPad)yaw+=turnDelta(turnPad.axes.length>=4?turnPad.axes[2]:turnPad.axes[0]||0,dt);
  const pose=viewer.transform;headLocal.set(pose.position.x,pose.position.y,pose.position.z);
  yawQuat.setFromAxisAngle(worldUp,yaw);headQuat.set(pose.orientation.x,pose.orientation.y,pose.orientation.z,pose.orientation.w).premultiply(yawQuat);
  if(lastHead&&!paused){const walk=headLocal.clone().sub(lastHead);walk.y=0;if(walk.length()<.3)physics.move(walk.applyQuaternion(yawQuat));}
  lastHead=headLocal.clone();roomY=headLocal.y;physics.height=Math.max(.8,Math.min(2.3,roomY));

  moveWish.set(0,0,0);let wantsJump=false;
  for(let i=0;i<2;i++){
    const source=sources[i],gp=source?.gamepad;
    if(!source||!gp){cancelWeb(i);previousHand[i]=null;hands[i].visible=false;tracked[i]=false;triggerHeld[i]=false;buttonHistory[i]=[];continue;}
    const targetPose=frame.getPose(source.targetRaySpace,reference),gripPose=source.gripSpace?frame.getPose(source.gripSpace,reference):targetPose;
    if(!targetPose||!gripPose){cancelWeb(i);previousHand[i]=null;hands[i].visible=false;tracked[i]=false;triggerHeld[i]=false;continue;}
    tracked[i]=true;
    const p=gripPose.transform.position,orientation=gripPose.transform.orientation;
    const relative=V(p.x-headLocal.x,p.y-headLocal.y,p.z-headLocal.z);
    const delta=previousHand[i]?relative.clone().sub(previousHand[i]).applyQuaternion(yawQuat):null;previousHand[i]=relative.clone();
    const offset=V(p.x-headLocal.x,p.y,p.z-headLocal.z).applyQuaternion(yawQuat);
    hands[i].visible=true;hands[i].position.copy(physics.p).add(offset);hands[i].quaternion.set(orientation.x,orientation.y,orientation.z,orientation.w).premultiply(yawQuat);
    const rp=targetPose.transform.position,rq=targetPose.transform.orientation;
    origin.set(rp.x-headLocal.x,rp.y,rp.z-headLocal.z).applyQuaternion(yawQuat).add(physics.p);
    direction.set(0,0,-1).applyQuaternion(new T.Quaternion(rq.x,rq.y,rq.z,rq.w)).applyQuaternion(yawQuat);
    const buttons=gp.buttons;
    if(i===1){wantsJump=!!buttons[4]?.pressed;if(buttonEdge(i,buttons,5)){reset();}}
    else {if(buttonEdge(i,buttons,4)){settings.pull=settings.pull<20?22:settings.pull<30?34:14;syncSettings();overlayTimer=6;pulse(i);}if(buttonEdge(i,buttons,5))pause(!paused);const x=gp.axes.length>=4?gp.axes[2]:gp.axes[0]||0,z=gp.axes.length>=4?gp.axes[3]:gp.axes[1]||0;moveWish.set(Math.abs(x)>.15?x:0,0,Math.abs(z)>.15?z:0);}
    processHand(i,origin,direction,offset,!!buttons[0]?.pressed,!!buttons[1]?.pressed,delta,dt);
  }
  const forward=V(0,0,-1).applyQuaternion(headQuat);forward.y=0;if(forward.lengthSq()<.01)forward.set(0,0,-1);forward.normalize();const right=forward.clone().cross(worldUp);moveWish.copy(right.multiplyScalar(moveWish.x).addScaledVector(forward,-moveWish.z)).clampLength(0,1);
  updateJump(wantsJump,dt);return true;
}
function updateJump(held,dt){if(paused){charge=0;jumpHeld=false;return;}if(held&&physics.grounded)charge=Math.min(1,charge+dt/0.65);if(!held&&jumpHeld){if(physics.jump(charge)){sound(210);pulse(1,.55,80);}charge=0;}jumpHeld=held;if(!physics.grounded)charge=0;}
function updateDesktop(dt){
  rig.rotation.set(0,0,0);camera.rotation.set(pitch,yaw,0,'YXZ');camera.position.set(0,1.7,0);
  const forward=V(-Math.sin(yaw),0,-Math.cos(yaw)),right=V(Math.cos(yaw),0,-Math.sin(yaw));
  moveWish.copy(forward).multiplyScalar((keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)).addScaledVector(right,(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)).clampLength(0,1);
  const q=camera.quaternion;direction.set(0,0,-1).applyQuaternion(q);origin.copy(physics.p).add(V(0,1.7,0));
  for(let i=0;i<2;i++){const offset=V(i===0?-.25:.25,1.35,-.4).applyAxisAngle(worldUp,yaw);hands[i].visible=true;hands[i].position.copy(physics.p).add(offset);hands[i].quaternion.copy(q);processHand(i,origin,direction,offset,mouse[i],keys.has(i===0?'KeyQ':'KeyE'),null,dt);}
  updateJump(keys.has('Space'),dt);headQuat.copy(q);
}
function drawWebs(){for(let i=0;i<2;i++){
  let r=physics.ropes[i];const mesh=webs[i];
  if(r){const start=physics.p.clone().add(r.hand),toward=r.anchor.clone().sub(start),length=toward.length();const block=cast(start,toward.normalize(),length);if(block&&block.distanceTo(r.anchor)>.8){physics.release(i);pulse(i,.2,25);r=null;}}
  mesh.visible=!!r;
  shooterWorld[i].copy(shooterOffset).applyQuaternion(hands[i].quaternion).add(hands[i].position);
  const flight=flights[i];tips[i].visible=flight.active&&!paused;impacts[i].visible=impactTimers[i]>0&&!paused;
  if(flight.active&&!paused){const vector=flight.tip.clone().sub(shooterWorld[i]),length=vector.length();mesh.visible=true;mesh.position.copy(shooterWorld[i]).addScaledVector(vector,.5);mesh.quaternion.setFromUnitVectors(worldUp,vector.normalize());mesh.scale.set(.03,length,.03);tips[i].position.copy(flight.tip);targets[i].visible=false;aimLines[i].visible=false;}
  if(impactTimers[i]>0){const progress=1-impactTimers[i]/.18;impacts[i].scale.setScalar(1+progress*2);impacts[i].material.opacity=1-progress;}
  hands[i].children[2].scale.setScalar(1+flashTimers[i]*30);
  if(r){const from=shooterWorld[i].clone(),vector=r.anchor.clone().sub(from),length=vector.length();mesh.position.copy(from).addScaledVector(vector,.5);mesh.quaternion.setFromUnitVectors(worldUp,vector.normalize());mesh.scale.set(.018,length,.018);targets[i].position.copy(r.anchor);targets[i].visible=true;}
  if(session&&!tracked[i]){targets[i].visible=false;aimLines[i].visible=false;}
}}
renderer.setAnimationLoop((milliseconds,frame)=>{
  const time=milliseconds/1000,dt=lastTime?Math.min(.05,Math.max(0,time-lastTime)):1/72;lastTime=time;
  let ready=true;
  if(active){if(session&&frame){if(session.visibilityState!=='visible'){releaseAll();ready=false;}else ready=updateXR(frame,dt);}else if(desktop&&!paused)updateDesktop(dt);
    if(!paused&&ready){advanceFlights(dt);accumulator+=dt;while(accumulator>=1/180){physics.step(1/180,moveWish,reels);accumulator-=1/180;}overlayTimer=Math.max(0,overlayTimer-dt);
      if(Math.abs(physics.p.x)>265||Math.abs(physics.p.z)>265||physics.p.y< -10||physics.p.y>400)reset();
    }else accumulator=0;
    if(session){yawQuat.setFromAxisAngle(worldUp,yaw);rig.quaternion.copy(yawQuat);const offset=V(headLocal.x,0,headLocal.z).applyQuaternion(yawQuat);rig.position.copy(physics.p).sub(offset);headWorld.copy(physics.p).add(V(0,roomY,0));}
    else{rig.position.copy(physics.p);headWorld.copy(physics.p).add(V(0,1.7,0));}
    for(let i=0;i<2;i++)if(hands[i].visible)hands[i].position.copy(physics.p).add(handOffset[i]);
    drawWebs();updateHud(time,headWorld,headQuat);updateAudioPose(headWorld,headQuat);
    if(wind)wind.gain.setTargetAtTime(!paused&&ready?Math.min(.18,physics.v.length()/350):0,audio.currentTime,.15);
  }else{
    rig.rotation.set(0,0,0);rig.position.set(65+Math.sin(time*.035)*15,100,100);camera.position.set(0,0,0);camera.lookAt(-10,20,-40);vrHUD.visible=false;comfort.visible=false;
    tips.forEach(h=>h.visible=false);impacts.forEach(h=>h.visible=false);hands.forEach(h=>h.visible=false);webs.forEach(w=>w.visible=false);targets.forEach(t=>t.visible=false);aimLines.forEach(l=>l.visible=false);
  }
  city.update?.(time,active?physics.p:rig.position,paused);
  renderer.render(scene,camera);
});

// Readable module exports also allow the integration harness to drive real input paths.
export {updateXR,processHand,advanceFlights,drawWebs,updateHud,pause,reset,physics,flights,hands,webs,vrHUD,renderer,scene,city};
