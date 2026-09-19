import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {DUMP_HOME,LOAD_STOP,UNLOAD_STOP,walkable} from '../navigation.js';
function advance(g,until,limit=10000){
  for(let i=0;i<limit&&!until();i++){
    g.update(1/60);
    assert(walkable(g.actor.x,g.actor.z,g.options),'Player entered a solid object');
    assert(g.cargo>=0&&g.cargo<=3);
  }
  assert(until(),JSON.stringify(g.snapshot()));
}
function board(g){assert(g.boardDump());advance(g,()=>g.drivingDump)}
test('dump truck loads three scoops, tips soil, returns to its original bay and repeats',()=>{
  const g=new FireGame();assert(!g.loadDump());assert(!g.unloadDump());board(g);
  assert(!g.fireActive);assert(!g.dispatch());assert(!g.boardTruck());
  assert(g.loadDump());advance(g,()=>g.mode==='loading');assert.equal(g.dump.x,LOAD_STOP.x);
  advance(g,()=>g.cargo===3&&g.mode==='idle');assert(!g.loadDump());assert(g.unloadDump());
  advance(g,()=>g.mode==='unloading');assert.equal(g.dump.z,UNLOAD_STOP.z);
  advance(g,()=>g.mode==='idle');assert.equal(g.cargo,0);assert.equal(g.delivered,3);
  assert(g.exitTruck());const child={...g.child};advance(g,()=>g.dumpPhase==='parked');
  assert.deepEqual(g.child,child);assert.equal(g.dump.x,DUMP_HOME.x);assert.equal(g.dump.z,DUMP_HOME.z);
  board(g);assert(g.loadDump());advance(g,()=>g.mode==='idle'&&g.cargo===3);assert(g.unloadDump());advance(g,()=>g.mode==='idle');assert.equal(g.delivered,6);
});
test('dismount midway through loading keeps the actual loaded amount and cancels the excavator',()=>{
  const g=new FireGame();board(g);g.loadDump();advance(g,()=>g.mode==='loading');advance(g,()=>g.cargo===1);
  assert(g.exitTruck());assert.equal(g.cargo,1);assert.equal(g.mode,'idle');advance(g,()=>g.dumpPhase==='parked');
  board(g);g.loadDump();advance(g,()=>g.mode==='idle'&&g.cargo===3);assert.equal(g.delivered,0);
});
test('interrupting a tip cannot duplicate soil and reset clears both missions',()=>{
  const g=new FireGame();board(g);g.loadDump();advance(g,()=>g.mode==='idle'&&g.cargo===3);g.unloadDump();advance(g,()=>g.mode==='unloading');
  advance(g,()=>g.delivered===3);assert(g.exitTruck());advance(g,()=>g.dumpPhase==='parked');assert.equal(g.delivered,3);assert.equal(g.cargo,0);
  g.reset();assert.equal(g.vehicle,null);assert.equal(g.delivered,0);assert.equal(g.fireActive,false);assert.equal(g.dumpPhase,'parked');
});
test('fire engine can finish returning while the child boards the dump truck',()=>{
  const g=new FireGame();g.boardTruck();advance(g,()=>g.drivingFire);assert(g.exitTruck());assert(g.boardDump());
  advance(g,()=>g.drivingDump&&g.truckPhase==='parked');assert(g.fireActive);assert(!g.dispatch());
  assert(g.exitTruck());advance(g,()=>g.dumpPhase==='parked');assert(g.boardTruck());advance(g,()=>g.drivingFire);assert(g.dispatch());advance(g,()=>g.complete);
});
