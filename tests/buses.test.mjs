import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FireGame} from '../game-state.js';
import {BUS_SPOTS,WORLD,walkable} from '../navigation.js';
function advance(g,until){
  for(let i=0;i<16000&&!until();i++){g.update(1/60);assert(walkable(g.actor.x,g.actor.z,g.options),'Player overlaps a solid object')}
  assert(until(),JSON.stringify(g.snapshot()));
}
for(let index=0;index<3;index++)test(`bus ${index}: board, drive around enlarged town, dismount and return to its own bay`,()=>{
  const g=new FireGame();assert(g.boardBus(index));advance(g,()=>g.riding);assert.equal(g.vehicle,`bus-${index}`);assert(!g.fireActive);assert(!g.boardBus((index+1)%3));
  for(const p of [{x:-34.5,z:20},{x:34.5,z:20},{x:34.5,z:-16.5},{x:-20,z:-16.5}]){assert(g.moveTo(p));advance(g,()=>g.mode==='idle')}
  assert(g.exitTruck());const child={...g.child};advance(g,()=>g.buses[index].phase==='parked');assert.deepEqual(g.child,child);
  assert.equal(g.buses[index].car.x,BUS_SPOTS[index].x);assert.equal(g.buses[index].car.z,BUS_SPOTS[index].z);assert.equal(g.buses[index].car.angle,0);
  assert(g.boardBus(index));advance(g,()=>g.riding);assert.equal(g.vehicle,`bus-${index}`);
});
test('a bus returns independently while the child boards a different color',()=>{
  const g=new FireGame();g.boardBus(0);advance(g,()=>g.riding);g.moveTo({x:-28,z:14});advance(g,()=>g.mode==='idle');assert(g.exitTruck());assert(g.boardBus(2));advance(g,()=>g.vehicle==='bus-2'&&g.buses[0].phase==='parked');
  assert(!g.getIceCream());assert(!g.dispatch());assert(!g.boardService('police'));
});
test('rectangular ground is 1.5 times the previous island union, and full ring is traversable',()=>{
  const report=JSON.parse(readFileSync(new URL('../models/world-layout.json',import.meta.url)));
  assert.deepEqual(report.bounds,{minX:WORLD.minX,maxX:WORLD.maxX,minZ:WORLD.minZ,maxZ:WORLD.maxZ});assert(Math.abs(report.area/report.previousArea-1.5)<.0001);
  for(let x=-34.5;x<=34.5;x+=.5)for(const z of [-16.5,1,20])assert(walkable(x,z,{radius:.32}),`Road blocked at ${x},${z}`);
  for(let z=-16.5;z<=20;z+=.5)for(const x of [-34.5,34.5])assert(walkable(x,z,{radius:2.7}),`Bus ring blocked at ${x},${z}`);
  assert(walkable(-35,-27,{radius:.32}));assert(walkable(35,23,{radius:.32}));assert(!walkable(39,0));assert(!walkable(0,27));
});
