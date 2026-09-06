import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import * as THREE from '../docs/vendor/three.module.min.js';
export const canvasContext=()=>new Proxy({},{get:(target,key)=>target[key]??(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
export async function questHarness(){
  const elements=new Map(),events=new Map(),audioEvents=[];
  function element(id){if(!elements.has(id))elements.set(id,{id,hidden:false,disabled:false,value:22,min:10,max:36,style:{},classList:{toggle(){}},appendChild(){},addEventListener(){},firstElementChild:{style:{}},getContext:canvasContext});return elements.get(id);}
  for(const [id,min,max] of [['pull',10,36],['jump',20,45],['gravity',9,22]])Object.assign(element(id),{min,max});
  const poses=[{p:{x:-.25,y:1.35,z:-.4},q:new THREE.Quaternion()},{p:{x:.25,y:1.35,z:-.4},q:new THREE.Quaternion()}];
  const sources=poses.map((_,i)=>({handedness:i?'right':'left',targetRaySpace:{i},gripSpace:{i},gamepad:{axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false})),hapticActuators:[{pulse:()=>Promise.resolve()}]}}));
  const session={inputSources:sources,visibilityState:'visible',listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},async end(){this.listeners.end?.();}};
  class Renderer {constructor(){this.domElement={addEventListener(){},requestPointerLock(){}};this.xr={enabled:false,setReferenceSpaceType(){},setFramebufferScaleFactor(){},setFoveation(){},async setSession(){},getReferenceSpace:()=>({})};}setPixelRatio(){}setSize(){}setAnimationLoop(fn){this.frame=fn;}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}}
  const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
  class Audio {constructor(){this.sampleRate=24000;this.currentTime=0;this.destination={};this.listener={};for(const family of ['position','forward','up'])for(const axis of ['X','Y','Z'])this.listener[family+axis]=param();}createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}createPanner(){const node=this.node();for(const axis of ['X','Y','Z'])node['position'+axis]=param();return node;}node(){return {connect(dest){this.destination=dest;return dest;},disconnect(){},stop(){},start(){audioEvents.push(this);},frequency:param(),gain:param()};}createBufferSource(){return this.node();}createGain(){return this.node();}createBiquadFilter(){return this.node();}createOscillator(){return this.node();}async resume(){}}
  const context=vm.createContext({console,performance,Math,Float32Array,URL,innerWidth:1280,innerHeight:720,devicePixelRatio:1,AudioContext:Audio,
    localStorage:{getItem:()=>null,setItem(){}},navigator:{xr:{isSessionSupported:async()=>true,requestSession:async()=>session}},
    document:{getElementById:element,body:{classList:{toggle(){}}},createElement:()=>({getContext:canvasContext}),addEventListener(type,fn){events.set(type,fn);}},
    window:{addEventListener(type,fn){events.set(type,fn);}}});
  const exported=Object.keys(THREE),three=new vm.SyntheticModule(exported,function(){for(const key of exported)this.setExport(key,key==='WebGLRenderer'?Renderer:THREE[key]);},{context});
  const cache=new Map();async function load(file){if(cache.has(file))return cache.get(file);const mod=new vm.SourceTextModule(await readFile(file,'utf8'),{context,identifier:file});cache.set(file,mod);await mod.link(async(specifier,parent)=>specifier.includes('/vendor/')?three:load(path.resolve(path.dirname(parent.identifier),specifier.split('?')[0])));return mod;}
  const game=await load(path.resolve('docs/game.js'));await game.evaluate();await element('enterVR').onclick();
  const frame={getViewerPose:()=>({transform:{position:{x:0,y:1.7,z:0},orientation:{x:0,y:0,z:0,w:1}}}),getPose:space=>space?{transform:{position:poses[space.i].p,orientation:poses[space.i].q}}:null};
  let clock=1000;const api=game.namespace;
  function tick(dt=1/72){clock+=dt*1000;api.renderer.frame(clock,frame);}
  function aim(i,target){const from=api.physics.p.clone().add(new THREE.Vector3(poses[i].p.x,poses[i].p.y,poses[i].p.z));poses[i].q.setFromUnitVectors(new THREE.Vector3(0,0,-1),target.clone().sub(from).normalize());}
  return {api,session,sources,poses,tick,aim,element,audioEvents,events};
}
