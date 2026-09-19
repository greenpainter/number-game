import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayInput,iceCreamZoom} from '../play-input.js';
import {FireGame} from '../game-state.js';

const event=(id,type='touch',extra={})=>({pointerId:id,pointerType:type,button:0,isPrimary:true,timeStamp:1000,clientX:100,clientY:100,width:10,height:10,...extra});
test('holding and drifting never cancels the press; extra fingers cannot erase it',()=>{
  const presses=[],p=new PlayInput(e=>presses.push(e));
  assert(p.down(event(1)));assert.equal(presses.length,1);
  assert(!p.down(event(2,'touch',{isPrimary:false})));p.up(event(2));
  p.up(event(1,'touch',{clientX:145,clientY:150,timeStamp:2400}));assert.equal(presses.length,1);
  assert(p.down(event(3,'touch',{timeStamp:2500})));assert.equal(presses.length,2);
});
test('pen contact takes priority; palm and hover do not create extra commands',()=>{
  const presses=[],p=new PlayInput(e=>presses.push(e));
  assert(!p.down(event(1,'touch',{width:65})));assert(p.down(event(2,'pen')));
  assert(!p.down(event(3,'touch')));p.up(event(3));assert.equal(p.active.id,2);
  p.up(event(2,'pen',{timeStamp:1100}));assert(!p.down(event(4,'touch',{timeStamp:1300})));
  assert(p.down(event(5,'pen',{timeStamp:1301})));assert.equal(presses.length,2);
});
test('ice cream zoom eases in and returns without a camera jump',()=>{
  let zoom=1;zoom=iceCreamZoom(zoom,true,1/60);assert(zoom>1&&zoom<1.04);
  for(let i=0;i<120;i++)zoom=iceCreamZoom(zoom,true,1/60);assert(Math.abs(zoom-1.38)<.001);
  for(let i=0;i<120;i++)zoom=iceCreamZoom(zoom,false,1/60);assert(Math.abs(zoom-1)<.001);
});
test('walk speed is 1.2 times the original and curb taps resolve to nearby ground',()=>{
  const g=new FireGame(),start={...g.child};assert(g.moveTo({x:-7,z:6.7}));g.update(.1);assert(Math.abs(Math.hypot(g.child.x-start.x,g.child.z-start.z)-2.65*1.2*.1)<.00001);
  assert(g.moveNear({x:-3.2,z:7.5}));assert(g.target);assert(!g.moveNear({x:NaN,z:0}));
});
test('fishing walks, catches once, celebrates, unlocks and repeats; another request cancels walking',()=>{
  const g=new FireGame();assert(g.startFishing());
  for(let i=0;i<12000&&g.mode!=='fishing';i++)g.update(1/60);assert.equal(g.mode,'fishing');
  assert(!g.boardTruck());assert(!g.getIceCream());assert(!g.moveTo({x:0,z:0}));
  for(let i=0;i<220;i++)g.update(1/60);assert.equal(g.mode,'fish-celebrate');assert.equal(g.fishCaught,1);
  for(let i=0;i<190;i++)g.update(1/60);assert.equal(g.mode,'idle');assert(g.startFishing());
  for(let i=0;i<450;i++)g.update(1/60);assert.equal(g.fishCaught,2);
  g.reset();g.startFishing();g.getIceCream();assert(!g.fishingMission);assert(g.iceMission);
});
