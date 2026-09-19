import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {SERVICES,ICE_STOP,walkable} from '../navigation.js';
function advance(g,until){
  for(let i=0;i<12000&&!until();i++){g.update(1/60);assert(walkable(g.actor.x,g.actor.z,g.options),'Player must avoid solid objects')}
  assert(until(),JSON.stringify(g.snapshot()));
}
for(const id of ['police','ambulance'])test(`${id}: garage exit, boarding, patrol, dismount and autonomous garage return`,()=>{
  const g=new FireGame();assert(g.boardService(id));advance(g,()=>g.riding);
  assert.equal(g.vehicle,id);assert.equal(g.services[id].car.z,SERVICES[id].home.z);assert(!g.fireActive);assert(!g.dispatch());assert(!g.getIceCream());
  assert(g.moveTo({x:0,z:0}));advance(g,()=>g.mode==='idle');assert(g.exitTruck());const child={...g.child};
  advance(g,()=>g.services[id].phase==='parked');assert.deepEqual(g.child,child);assert.equal(g.services[id].door,0);assert.equal(g.services[id].car.z,-24);
  assert(g.boardService(id));advance(g,()=>g.riding);assert.equal(g.vehicle,id);
});
test('switching summons returns the unused car and does not summon the fire engine',()=>{
  const g=new FireGame();g.boardTruck();g.boardService('police');g.boardService('ambulance');advance(g,()=>g.vehicle==='ambulance');
  advance(g,()=>g.services.police.phase==='parked'&&g.truckPhase==='parked');assert(!g.fireActive);
});
test('ice cream walks to the van, faces the viewer, finishes eating, and can repeat',()=>{
  const g=new FireGame();assert(g.getIceCream());advance(g,()=>g.mode==='eating');assert.equal(g.child.x,ICE_STOP.x);assert.equal(g.child.angle,Math.PI/4);
  assert(!g.moveTo({x:0,z:0}));assert(!g.boardService('police'));assert(!g.boardTruck());assert(!g.boardDump());
  advance(g,()=>g.mode==='idle');assert.equal(g.iceCreams,1);assert(g.getIceCream());advance(g,()=>g.iceCreams===2);
  g.reset();assert.equal(g.iceCreams,0);assert(g.getIceCream());assert(g.moveTo({x:-6,z:4}));advance(g,()=>g.mode==='idle');assert.equal(g.iceCreams,0);
});
test('a service vehicle can return while the child boards another one',()=>{
  const g=new FireGame();g.boardService('police');advance(g,()=>g.riding);g.moveTo({x:-14,z:-15});advance(g,()=>g.mode==='idle');
  assert(g.exitTruck());assert(g.boardService('ambulance'));advance(g,()=>g.vehicle==='ambulance'&&g.services.police.phase==='parked');
});
