import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import layout from '../city-layout.js';
import {routePoint,routeLength} from '../city-state.js';
import {walkable,findPath,SERVICES} from '../navigation.js';
import {trafficRoutes,bridgeRoute} from '../road-layout.js';
function advance(g,until,limit=15000){for(let i=0;i<limit&&!until();i++)g.update(1/30);assert(until(),JSON.stringify({mode:g.mode,child:g.child,vehicle:g.vehicle,plane:g.city.plane,chase:g.city.chase}))}
test('outer destinations, zoo viewing path and open tunnel are reachable',()=>{
  for(const place of [...layout.destinations,...layout.zoo.animals.map(a=>a.view)])assert(findPath({x:-7,z:12},place,{radius:.32}),place.name??'habitat');
  for(let x=-25;x<=25;x+=.5)assert(walkable(x,-85,{radius:2.7}));
  assert(!walkable(0,-94));assert(!walkable(110,-52));
});
test('airport boarding, flight, automatic landing and repeat/reset',()=>{
  const g=new FireGame();assert(g.boardPlane());advance(g,()=>g.drivingPlane);assert(!g.child.height);
  const start=g.city.plane.distance;assert(g.boardPlane());assert.equal(g.city.plane.distance,start);
  advance(g,()=>g.actor.height>15);assert(g.moveTo({x:0,z:0}));assert.equal(g.mode,'flying');assert(g.exitTruck());
  advance(g,()=>!g.riding);assert.deepEqual({x:g.child.x,z:g.child.z},layout.airport.exit);assert.equal(g.city.plane.phase,'parked');
  assert(g.boardPlane());advance(g,()=>g.drivingPlane);g.reset();assert.deepEqual(g.city,new FireGame().city);
});
test('both new fire stations summon, extinguish and return to their own garage',()=>{
  for(const station of layout.fireStations){
    const g=new FireGame();assert(g.boardService(station.id));advance(g,()=>g.riding);assert(g.drivingFire);assert(g.fireActive);assert.equal(g.vehicle,station.id);
    assert(g.dispatch());advance(g,()=>g.complete);assert(g.exitTruck());advance(g,()=>g.services[station.id].phase==='parked');
    assert.deepEqual({x:g.services[station.id].car.x,z:g.services[station.id].car.z},SERVICES[station.id].garage);assert.equal(g.services[station.id].door,0);
  }
});
test('police encounter, pursuit, capture and cancelling pursuit',()=>{
  const g=new FireGame();assert(!g.chaseThief(0));assert(g.boardService('police'));advance(g,()=>g.riding);
  assert(g.chaseThief(0));advance(g,()=>g.city.caught===1);assert.equal(g.city.thieves[0].phase,'boarding');assert.equal(g.city.chase,null);
  assert(!g.moveTo(SERVICES.police.home));assert(!g.exitService());assert(!g.chaseThief(1));assert(!g.callHelicopter(layout.destinations[0]));
  advance(g,()=>g.city.custody.phase==='transporting');const parked={x:g.actor.x,z:g.actor.z};
  for(let i=0;i<90;i++)g.update(1/30);assert.equal(g.city.caught,1);
  assert.deepEqual({x:g.actor.x,z:g.actor.z},parked);assert.equal(g.path.length,0);assert(!g.chaseThief(1));assert(!g.exitTruck());
  assert(g.moveTo(SERVICES.police.home));advance(g,()=>g.city.custody.delivered===1);assert.equal(g.city.thieves[0].phase,'caught');assert.equal(g.deliveryDestination,null);
  assert(g.chaseThief(1));assert(g.moveTo({x:-7,z:-17}));assert.equal(g.city.chase,null);
  g.reset();assert.equal(g.city.caught,0);assert(g.city.thieves.every(t=>t.phase==='wandering'));
});
test('ambient vehicles yield to the player; pedestrian paths remain walkable',()=>{
  const g=new FireGame(),t=g.city.traffic[0];g.child={...t.car};const before=t.distance;g.update(.1);assert.equal(t.distance,before);assert(!t.moving);
  g.child={x:0,z:0,angle:0};g.update(.1);assert(t.distance>before);
  for(const route of layout.walkRoutes)for(let d=0;d<routeLength(route);d+=.5){const p=routePoint(route,d);assert(walkable(p.x,p.z,{radius:.2}),JSON.stringify(p))}
});

test('helicopter visibly descends, carries the child, lands and resets without teleporting',()=>{
  const g=new FireGame(),start={...g.child},destination=layout.destinations.find(p=>p.name==='동물원');
  assert(g.callHelicopter(destination));g.update(.1);assert.equal(g.city.helicopter.phase,'descending');assert(!g.riding);assert.deepEqual(g.child,start);
  const height=g.city.helicopter.car.height;g.update(.1);assert(g.city.helicopter.car.height<height);
  assert(g.callHelicopter(layout.destinations[0]));assert.equal(g.city.helicopter.name,'동물원');
  advance(g,()=>g.ridingHelicopter);advance(g,()=>g.city.helicopter.phase==='cruising');
  assert(g.actor.height>=26);assert(g.moveTo({x:0,z:0}));assert.equal(g.mode,'helicopter');assert(!g.exitTruck());
  advance(g,()=>g.city.helicopter.phase==='departing');assert(!g.riding);assert.equal(g.mode,'idle');assert(walkable(g.child.x,g.child.z,{radius:.32}));assert(Math.hypot(g.child.x-destination.x,g.child.z-destination.z)<5.1);
  advance(g,()=>g.city.helicopter.phase==='idle');assert(g.callHelicopter(layout.destinations[0]));g.reset();assert.deepEqual(g.city,new FireGame().city);
});

test('map helicopter dismounts police and a moving bus before pickup, rejects unsafe destinations',()=>{
  for(const vehicle of ['police','bus']){
    const g=new FireGame();assert(vehicle==='bus'?g.boardBus(0):g.boardService('police'));advance(g,()=>g.riding);
    assert(g.moveTo({x:-34.5,z:20}));g.update(.3);
    assert(g.callHelicopter(layout.destinations[0]));advance(g,()=>g.ridingHelicopter);advance(g,()=>g.city.helicopter.phase==='idle');assert(!g.riding);
  }
  const g=new FireGame();assert(!g.callHelicopter({x:110,z:-52}));assert.equal(g.city.helicopter.phase,'idle');
});

test('curved overpass carries walking and driving actors at deck height and approach can be cancelled',()=>{
  for(const driving of [false,true]){
    const g=new FireGame();if(driving){assert(g.boardService('police'));advance(g,()=>g.riding)}
    assert(g.startBridgeTour());advance(g,()=>g.crossingBridge);advance(g,()=>g.actor.height>5.8);
    assert(g.moveTo({x:0,z:0}));assert(g.crossingBridge);advance(g,()=>g.city.bridge.phase==='idle');
    assert.equal(g.actor.height,0);assert(Math.hypot(g.actor.x-layout.bridge.exit.x,g.actor.z-layout.bridge.exit.z)<1e-6);assert.equal(g.riding,driving);
  }
  const g=new FireGame();assert(g.startBridgeTour());assert(g.moveTo({x:-7,z:12}));advance(g,()=>g.mode==='idle');assert.equal(g.city.bridge.phase,'idle');assert.equal(g.child.x,-7);
  assert(trafficRoutes[0].length>50);assert(Math.max(...bridgeRoute().map(p=>p[2]))>6);
});

test('the east ramp boards nearby and crosses back to the west on foot and by car',()=>{
  for(const driving of [false,true]){
    const g=new FireGame();if(driving){assert(g.boardService('police'));advance(g,()=>g.riding)}
    Object.assign(g.actor,layout.bridge.exit);
    assert(g.startBridgeTour());assert(g.city.bridge.reverse);
    advance(g,()=>g.crossingBridge);assert(Math.hypot(g.actor.x-layout.bridge.exit.x,g.actor.z-layout.bridge.exit.z)<1);
    advance(g,()=>g.actor.height>5.8);advance(g,()=>g.city.bridge.phase==='idle');
    assert.equal(g.actor.height,0);assert(Math.hypot(g.actor.x-layout.bridge.entry.x,g.actor.z-layout.bridge.entry.z)<1e-6);
  }
});
