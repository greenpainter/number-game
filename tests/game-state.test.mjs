import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame,GARAGE} from '../game-state.js';
import {CHILD_START,walkable} from '../navigation.js';
function advance(g,until,limit=4000){
  for(let i=0;i<limit&&!until();i++){
    g.update(1/60);
    assert(walkable(g.actor.x,g.actor.z,g.options),'Player entered an obstacle');
    if(['outgoing','entering'].includes(g.truckPhase))assert.equal(g.door,1,'Truck crossed a closed shutter');
  }
  assert(until(),JSON.stringify(g.snapshot()));
}
function board(g){assert(g.boardTruck());advance(g,()=>g.riding)}
test('open shutter, drive outside, board, extinguish, dismount and park inside',()=>{
  const g=new FireGame();assert.deepEqual({x:g.truck.x,z:g.truck.z},GARAGE);assert.equal(g.door,0);assert.equal(g.fireActive,false);
  assert.equal(g.dispatch(),false);g.boardTruck();advance(g,()=>g.truckPhase==='outgoing');assert.equal(g.fireActive,false);advance(g,()=>g.riding);assert.equal(g.fireActive,true);assert.equal(g.truckPhase,'occupied');assert(g.truck.z>0);
  assert(g.dispatch());advance(g,()=>g.complete);assert.equal(g.fireActive,false);assert(g.exitTruck());const child={...g.child};
  advance(g,()=>g.truckPhase==='parked');assert.deepEqual(g.child,child);assert.equal(g.door,0);
  assert.deepEqual({x:g.truck.x,z:g.truck.z},GARAGE);
  board(g);assert(!g.complete);assert(g.fireActive);assert.equal(g.hp,100);assert(g.dispatch());advance(g,()=>g.complete);g.reset();assert.deepEqual({x:g.child.x,z:g.child.z},CHILD_START);
});
test('dismount interrupts water, return finishes and a new summon completes the fire',()=>{
  const g=new FireGame();board(g);g.dispatch();advance(g,()=>g.mode==='extinguishing');
  for(let i=0;i<60;i++)g.update(1/60);
  const hp=g.hp;assert(g.exitTruck());assert(g.boardTruck());advance(g,()=>g.riding);assert.equal(g.hp,hp);
  assert(g.dispatch());advance(g,()=>g.complete);
});
test('cancel boarding while truck exits; it returns and closes the shutter',()=>{
  const g=new FireGame();g.boardTruck();advance(g,()=>g.truckPhase==='outgoing');
  assert(g.moveTo({x:-12,z:1}));advance(g,()=>g.mode==='idle'&&g.truckPhase==='parked');
  assert(!g.riding);assert.equal(g.door,0);assert.equal(g.fireActive,false);
  const before=g.snapshot();assert(!g.moveTo({x:-7,z:-5}));assert(!g.moveTo({x:NaN,z:0}));assert.deepEqual(g.snapshot(),before);
});
test('dismount during driving; child can walk while truck returns independently',()=>{
  const g=new FireGame();board(g);g.dispatch();for(let i=0;i<90;i++)g.update(1/60);
  assert(g.exitTruck());assert(g.moveTo({x:-12,z:1}));advance(g,()=>g.truckPhase==='parked'&&g.mode==='idle');
  assert(Math.abs(g.child.x+12)<.001);assert.equal(g.door,0);board(g);assert(g.goHome());advance(g,()=>!g.riding&&g.truckPhase==='parked');
});
