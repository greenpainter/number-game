import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {HOME,CHILD_START,walkable,truckContains} from '../navigation.js';

function advance(game,until,limit=2000){
  for(let i=0;i<limit&&!until();i++){
    game.update(1/60);
    assert(walkable(game.actor.x,game.actor.z,game.options),'Actor entered an obstacle');
  }
  assert(until(),'Requested transition did not finish');
}
function board(game){assert(game.boardTruck());advance(game,()=>game.riding)}
test('walk to truck, board, drive, put out fire, exit and board again',()=>{
  const game=new FireGame();assert.equal(game.riding,false);assert.equal(game.dispatch(),false);
  assert(game.moveTo({x:-7,z:7}));advance(game,()=>game.mode==='idle');
  assert.equal(game.truck.x,HOME.x);assert.equal(game.truck.z,HOME.z);
  board(game);assert(game.dispatch());advance(game,()=>game.complete);
  assert.equal(game.hp,0);assert(game.exitTruck());assert.equal(game.riding,false);
  assert(!truckContains(game.child.x,game.child.z,game.truck));
  board(game);assert.equal(game.complete,true);
  game.reset();assert.deepEqual({x:game.child.x,z:game.child.z},CHILD_START);assert.equal(game.riding,false);assert.equal(game.hp,100);
});
test('exiting interrupts spraying and reboarding allows finishing',()=>{
  const game=new FireGame();board(game);game.dispatch();advance(game,()=>game.mode==='extinguishing');
  for(let i=0;i<90;i++)game.update(1/60);
  const hp=game.hp,parked={...game.truck};assert(hp<100&&hp>0);assert(game.exitTruck());
  for(let i=0;i<180;i++)game.update(1/60);
  assert.equal(game.hp,hp);assert.deepEqual(game.truck,parked);
  board(game);assert(game.dispatch());advance(game,()=>game.complete);
});
test('ground movement cancels boarding; invalid targets do not change state',()=>{
  const game=new FireGame();assert(game.boardTruck());game.update(.1);
  assert(game.moveTo({x:-7,z:8}));advance(game,()=>game.mode==='idle');assert.equal(game.riding,false);
  const before=game.snapshot();assert.equal(game.moveTo({x:-7,z:-5}),false);assert.equal(game.moveTo({x:NaN,z:0}),false);assert.equal(game.exitTruck(),false);assert.deepEqual(game.snapshot(),before);
});
test('exit while driving parks the truck and leaves a reachable boarding point',()=>{
  const game=new FireGame();board(game);game.dispatch();for(let i=0;i<60;i++)game.update(1/60);
  assert(game.exitTruck());const parked={...game.truck};
  assert(game.moveTo({x:-7,z:7}));advance(game,()=>game.mode==='idle');assert.deepEqual(game.truck,parked);
  board(game);assert(game.goHome());advance(game,()=>game.mode==='idle');assert(Math.hypot(game.truck.x-HOME.x,game.truck.z-HOME.z)<.01);
});
