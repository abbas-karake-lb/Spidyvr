import test from 'node:test';
import assert from 'node:assert/strict';
import {Movement,V} from '../docs/physics.js';
function near(a,b,tolerance=.01){assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);}
function advance(p,seconds){for(let i=0;i<seconds*180;i++)p.step(1/180);}
test('holding an elastic rope swings under gravity with bounded stretch',()=>{const p=new Movement([],{gravity:15});p.p.set(10,30,0);p.attach(0,V(0,40,0),V());const length=p.ropes[0].length;advance(p,1);assert.ok(p.p.x<10);assert.ok(p.v.length()>2);assert.ok(p.p.distanceTo(p.ropes[0].anchor)<=length+8);});
test('release preserves launch velocity exactly',()=>{const p=new Movement();p.v.set(8,14,-21);p.attach(0,V(10,80,-50));const before=p.v.clone();p.release(0);assert.deepEqual(p.v.toArray(),before.toArray());});
test('slack rope never pushes the player away from the anchor',()=>{const p=new Movement([],{gravity:0});p.p.set(10,30,0);p.attach(0,V(0,30,0),V());p.v.set(-5,0,0);advance(p,.2);assert.ok(p.v.x< -4.9);assert.ok(p.p.x<9.1);});
test('hand pull backward launches forward; reaching out does not cancel momentum',()=>{const p=new Movement();p.p.set(0,30,0);p.attach(0,V(0,50,-50));p.pull(0,V(0,0,.08),1/72);assert.ok(p.v.z<0);const z=p.v.z;p.pull(0,V(0,0,-.08),1/72);near(p.v.z,z);});
test('pulling downward adds upward momentum',()=>{const p=new Movement();p.p.set(0,30,0);p.attach(0,V(0,60,-20));p.pull(0,V(0,-.08,.03),1/72);assert.ok(p.v.y>0);assert.ok(p.v.z<0);});
test('two hands provide more launch power than one',()=>{const p=new Movement();p.attach(0,V(-10,60,-40));p.attach(1,V(10,60,-40));p.pull(0,V(0,0,.05),1/72);const first=p.v.length();p.pull(1,V(0,0,.05),1/72);assert.ok(p.v.length()>first*1.8);});
test('same physical pull is consistent at 72, 90, and 120 Hz',()=>{const results=[];for(const hz of [72,90,120]){const p=new Movement();p.attach(0,V(0,60,-80));for(let n=0;n<hz/2;n++)p.pull(0,V(0,0,1/hz),1/hz);results.push(p.v.z);}near(results[0],results[1]);near(results[0],results[2]);});
test('faster stroke produces a stronger launch for the same distance',()=>{function stroke(dt){const p=new Movement();p.attach(0,V(0,60,-80));for(let n=0;n<10;n++)p.pull(0,V(0,0,.04),dt);return p.v.length();}assert.ok(stroke(.01)>stroke(.04));});
test('stationary held controllers do not create extra velocity',()=>{const p=new Movement();p.attach(0,V(0,60,-80));for(let n=0;n<100;n++)p.pull(0,V(),1/72);near(p.v.length(),0);});
test('tracking jumps are rejected',()=>{const p=new Movement();p.attach(0,V(0,60,-80));p.pull(0,V(0,0,2),1/72);near(p.v.length(),0);});
test('fast downward movement lands on roof rather than tunnelling',()=>{const p=new Movement([{min:V(-10,0,-10),max:V(10,32,10)}]);p.p.set(0,40,0);p.v.set(0,-80,0);advance(p,.2);near(p.p.y,32);near(p.v.y,0);assert.ok(p.grounded);});
test('fast lateral movement hits a thin wall',()=>{const p=new Movement([{min:V(5,0,-10),max:V(6,50,10)}]);p.p.set(0,20,0);p.v.set(80,0,0);advance(p,.2);near(p.p.x,4.68);near(p.v.x,0);});
test('elastic tension cannot pull the player through a building',()=>{const p=new Movement([{min:V(3,0,-10),max:V(7,60,10)}]);p.p.set(0,20,0);p.attach(0,V(12,30,0),V());p.ropes[0].length=2;advance(p,2);near(p.p.x,2.68);});
test('charged jump clears a normal building and cannot repeat in midair',()=>{const p=new Movement();p.p.set(0,0,0);advance(p,.02);assert.equal(p.jump(1),true);assert.equal(p.jump(1),false);let peak=0;for(let i=0;i<900;i++){p.step(1/180);peak=Math.max(peak,p.p.y);}assert.ok(peak>30&&peak<36,`peak=${peak}`);});
test('dual anchor simulation remains finite and bounded over extended swinging',()=>{const p=new Movement();p.p.set(0,40,0);p.v.set(20,0,-8);p.attach(0,V(-20,80,0));p.attach(1,V(20,80,0));for(let i=0;i<3600;i++){p.step(1/180);assert.ok(p.p.toArray().every(Number.isFinite));assert.ok(p.v.length()<=80.001);}for(const r of p.ropes)assert.ok(p.p.clone().add(r.hand).distanceTo(r.anchor)<=r.length+8);});
test('identical downward/backward strokes add identical upward/forward boosts above or below the anchor',()=>{
  const velocities=[];for(const anchorY of [20,140]){const p=new Movement();p.p.set(0,80,0);p.attach(0,V(0,anchorY,-35),V(-.25,1.35,-.4));p.pull(0,V(0,-.07,.04),1/72);assert.ok(p.v.y>0&&p.v.z<0);velocities.push(p.v.toArray());}assert.deepEqual(velocities[0],velocities[1]);
});
test('new pulls overcome fast opposing and sideways momentum with the same stroke strength as rest',()=>{
  for(const delta of [V(0,-.06,.035),V(0,.06,.035),V(0,0,.08)]){
    const velocities=[];
    for(const speed of [V(),V(80,0,0),delta.clone().setLength(80)]){
      const p=new Movement();p.p.set(0,80,0);p.v.copy(speed);p.attach(0,V(0,25,-15),V(-.25,1.35,-.4));
      p.pull(0,delta,1/72);velocities.push(p.v.clone());
    }
    for(const v of velocities)assert.ok(v.distanceTo(velocities[0])<1e-9);
  }
});
test('aligned flight speed is preserved when starting another pull',()=>{
  const p=new Movement();p.attach(0,V(0,60,-80));p.v.z=-40;p.pull(0,V(0,0,.05),1/72);assert.ok(p.v.z< -40);
});
test('continuous pulls accumulate across frames, then a reversed gesture redirects immediately',()=>{
  const p=new Movement([],{gravity:0});p.p.set(0,100,0);p.attach(0,V(0,100,-100),V());
  let previous=0;for(let i=0;i<8;i++){p.pull(0,V(0,-.04,.03),1/72);assert.ok(p.v.length()>previous);previous=p.v.length();p.step(1/72);}
  p.pull(0,V(0,.05,-.04),1/72);assert.ok(p.v.y<0&&p.v.z>0);
});
test('returning to a held web after resting the hand starts a fresh direction',()=>{
  const p=new Movement([],{gravity:0});p.attach(0,V(0,100,0));p.pull(0,V(0,-.05,.05),1/72);advance(p,.15);p.v.set(80,0,0);
  p.pull(0,V(0,-.05,.05),1/72);near(p.v.x,0);assert.ok(p.v.y>0&&p.v.z<0);
});
test('downward/backward pulls launch upward/forward within available rope slack',()=>{
  const p=new Movement();p.p.set(0,100,0);p.attach(0,V(0,25,-15),V());const length=p.ropes[0].length;p.p.y=80;p.v.y=-8;
  for(let frame=0;frame<10;frame++){p.pull(0,V(0,-.06,.035),1/72);p.step(1/72);}
  assert.ok(p.v.y>6&&p.v.z<0);near(p.ropes[0].length,length);
});
test('upward/backward strokes launch downward/forward within rope slack',()=>{
  const p=new Movement();p.p.set(0,60,0);p.attach(0,V(0,140,-15),V());p.p.y=80;p.pull(0,V(0,.08,.04),1/72);
  assert.ok(p.v.y<0&&p.v.z<0);advance(p,.15);assert.ok(p.p.y<79.8);
});
test('elastic catches preserve initial speed, stretch, and progressively stop outward flight without breaking',()=>{
  for(const length of [2,20,160])for(const axis of [V(1,0,0),V(0,1,0),V(0,0,1)]){
    const p=new Movement([],{gravity:0}),anchor=V(0,200,0);p.p.copy(anchor).addScaledVector(axis,length);p.v.copy(axis).multiplyScalar(80);
    const before=p.v.clone();p.attach(0,anchor,V());const rope=p.ropes[0];assert.ok(p.v.equals(before),'attaching must not alter velocity');
    p.step(1/180);assert.ok(p.v.dot(axis)>79,'first step must not snap to a stop');
    let previous=p.v.dot(axis),peakStretch=0,stoppedAt=0;
    for(let step=1;step<360;step++){
      p.step(1/180);const speed=p.v.dot(axis);assert.ok(Math.abs(speed-previous)<.8,'passive catch must not contain velocity jumps');
      if(!stoppedAt){assert.ok(speed<=previous+.001);if(speed<=0)stoppedAt=(step+1)/180;}
      previous=speed;peakStretch=Math.max(peakStretch,p.p.distanceTo(anchor)-length);
      assert.equal(p.ropes[0],rope);near(rope.length,length);
    }
    assert.ok(stoppedAt>.4&&stoppedAt<1.2,`catch time ${stoppedAt}`);
    assert.ok(peakStretch>10&&peakStretch<40,`bounded elastic stretch ${peakStretch}`);
  }
});
test('tangential speed is preserved at attachment and feeds an elastic swing',()=>{
  const p=new Movement([],{gravity:0});p.p.set(20,200,0);p.v.z=50;p.attach(0,V(0,200,0),V());
  p.step(1/180);assert.ok(p.v.z>49.9);advance(p,.4);assert.ok(p.v.z>25);assert.ok(p.v.x<0);assert.ok(p.p.z>15);
});
test('a loaded elastic web still obeys a deliberate opposite-hand pull, then resumes a gradual catch',()=>{
  const p=new Movement([],{gravity:0});p.p.set(20,200,0);p.attach(0,V(0,200,0),V());p.v.x=80;advance(p,.3);
  const rope=p.ropes[0],length=rope.length;assert.ok(p.p.distanceTo(rope.anchor)>length+10);
  for(let frame=0;frame<10;frame++){p.pull(0,V(0,-.05,.03),1/72);p.step(1/72);assert.ok(p.v.y>0&&p.v.z<0);near(p.v.x,0);}
  let previous=p.v.clone();for(let i=0;i<180;i++){p.step(1/180);assert.ok(p.v.distanceTo(previous)<.8);previous.copy(p.v);}
  assert.ok(p.v.x<0,'passive tension must resume after the gesture');assert.equal(p.ropes[0],rope);near(rope.length,length);
});
test('releasing a stretched web removes tension and preserves its current flight velocity',()=>{
  const p=new Movement([],{gravity:0});p.p.set(20,200,0);p.attach(0,V(0,200,0),V());p.v.x=80;advance(p,.25);
  const velocity=p.v.clone();p.release(0);assert.ok(p.v.equals(velocity));advance(p,.3);assert.ok(p.v.distanceTo(velocity)<.5);
});
test('dual hand pulls retain unstretched lengths while webs stretch and remain attached',()=>{
  const p=new Movement();p.p.set(0,80,0);p.attach(0,V(-8,20,-10),V());p.attach(1,V(8,20,-10),V());const lengths=p.ropes.map(r=>r.length);
  for(let frame=0;frame<100;frame++){
    for(let hand=0;hand<2;hand++)p.pull(hand,V(0,frame<50?-.04:.04,.025),1/72);
    p.step(1/72);
    p.ropes.forEach((r,i)=>{assert.ok(r);near(r.length,lengths[i]);assert.ok(p.p.distanceTo(r.anchor)<r.length+50);});
  }
});
test('side-grip shortens the rest length and draws the player inward through elastic tension',()=>{
  const p=new Movement();p.p.set(0,80,0);p.attach(0,V(0,20,0),V());const length=p.ropes[0].length;p.pull(0,V(0,-.1,0),1/72);advance(p,.1);near(p.ropes[0].length,length);
  p.step(1/180,V(),[true,false]);assert.ok(p.ropes[0].length<length);for(let i=0;i<180;i++)p.step(1/180,V(),[true,false]);assert.ok(p.v.y<0);
});

test('two passive webs share a smooth catch and remain attached under maximum-speed load',()=>{
  const p=new Movement([],{gravity:0});p.p.set(20,200,0);p.v.x=80;p.attach(0,V(0,200,-1),V());p.attach(1,V(0,200,1),V());
  const ropes=[...p.ropes];p.step(1/180);assert.ok(p.v.x>79);
  let previous=p.v.clone(),stopped=false;for(let i=0;i<360;i++){
    p.step(1/180);assert.ok(p.v.distanceTo(previous)<.8);previous.copy(p.v);if(p.v.x<=0)stopped=true;
    p.ropes.forEach((r,index)=>{assert.equal(r,ropes[index]);assert.ok(p.p.distanceTo(r.anchor)<r.length+40);});
  }
  assert.ok(stopped);
});
