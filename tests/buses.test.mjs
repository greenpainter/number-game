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

test('crowded bus exit moves a short distance once, lets the child off, then returns',()=>{
  const g=new FireGame();g.riding=true;g.vehicle='bus-0';const b=g.drivingBus;
  Object.assign(b.car,{x:-30.5,z:-16,angle:0});b.phase='occupied';
  Object.assign(g.buses[1].car,{x:-34.5,z:-16,angle:0});Object.assign(g.buses[2].car,{x:-26.5,z:-16,angle:0});Object.assign(g.dump,{x:-30.5,z:-20.5,halfWidth:2.5,halfLength:1.1});
  assert(g.exitTruck());assert.equal(g.mode,'pulling-over');assert(g.riding);assert(Math.hypot(g.target.x+30.5,g.target.z+16)<2);
  const target={...g.target};assert(g.exitTruck());assert.deepEqual(g.target,target);assert(!g.moveTo({x:0,z:0}));
  advance(g,()=>!g.riding);assert(walkable(g.child.x,g.child.z,g.options));const child={...g.child};
  advance(g,()=>b.phase==='parked');assert.deepEqual(g.child,child);
});
test('expanded ground has four times the previous area, and both road rings are traversable',()=>{
  const report=JSON.parse(readFileSync(new URL('../models/world-layout.json',import.meta.url)));
  assert.deepEqual(report.bounds,{minX:WORLD.minX,maxX:WORLD.maxX,minZ:WORLD.minZ,maxZ:WORLD.maxZ});assert(Math.abs(report.area/report.previousArea-4)<.0001);
  for(let x=-34.5;x<=34.5;x+=.5)for(const z of [-16.5,1,20])assert(walkable(x,z,{radius:.32}),`Road blocked at ${x},${z}`);
  for(let z=-16.5;z<=20;z+=.5)for(const x of [-34.5,34.5])assert(walkable(x,z,{radius:2.7}),`Bus ring blocked at ${x},${z}`);
  for(let x=-48;x<=48;x+=.5)for(const z of [-34,31])assert(walkable(x,z,{radius:2.7}),`New bus road blocked at ${x},${z}`);
  for(let z=-34;z<=31;z+=.5)for(const x of [-48,48])assert(walkable(x,z,{radius:2.7}),`New bus road blocked at ${x},${z}`);
  assert(walkable(-35,-27,{radius:.32}));assert(walkable(35,23,{radius:.32}));assert(walkable(39,0));assert(walkable(0,27));assert(!walkable(77,0));assert(!walkable(0,56));
});
