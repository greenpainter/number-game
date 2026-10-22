import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {TAXI_CUSTOMERS,TAXI_DESTINATIONS,TAXI_STAND,TAXI_LINES} from '../taxi-layout.js';
import {walkable,findPath} from '../navigation.js';
import {DeliveryGuide} from '../delivery-guide.js';
import {NARRATION_CLIPS} from '../audio/ko/catalog.js';
import {TAXI_RESPAWN_SECONDS} from '../taxi-state.js';
function until(g,fn){for(let i=0;i<15000&&!fn();i++)g.update(1/20);assert(fn(),JSON.stringify({taxi:g.taxi,mode:g.mode,actor:g.actor}))}
function board(){const g=new FireGame();assert(g.boardService('taxi'));until(g,()=>g.vehicle==='taxi');return g}
test('taxi stand, six roadside customers and destinations have safe vehicle routes',()=>{
  assert(findPath({x:-7,z:12},TAXI_STAND.waiting,{radius:.32}));
  for(const p of TAXI_CUSTOMERS){assert(walkable(p.x,p.z,{radius:.4}));assert(walkable(p.stop.x,p.stop.z,{radius:1}));assert(findPath(TAXI_STAND.home,p.stop,{radius:1}));assert(findPath(p.stop,TAXI_DESTINATIONS[p.destination],{radius:1}))}
  for(const line of TAXI_LINES)assert(NARRATION_CLIPS[line],line);
});
test('pick up and manually drive all six customers; reward only after drop-off',()=>{
  const g=board();assert(!g.hasSiren);assert(!g.toggleSiren());
  for(let id=0;id<TAXI_CUSTOMERS.length;id++){
    assert(g.pickupTaxiCustomer(id));const target={...g.target};assert(g.pickupTaxiCustomer(id));assert.deepEqual(g.target,target);
    until(g,()=>g.taxi.phase==='boarding');assert(!g.moveTo({x:0,z:0}));assert(!g.exitTruck());assert(!g.callHelicopter({x:-7,z:12}));
    until(g,()=>g.taxi.phase==='transporting');assert.equal(g.taxi.customers[id].phase,'aboard');assert.equal(g.taxi.delivered,id);
    const parked={...g.actor};for(let n=0;n<80;n++)g.update(.05);assert.deepEqual(g.actor,parked);assert.equal(g.path.length,0);assert(!g.pickupTaxiCustomer((id+1)%6));assert(!g.exitTruck());assert(!g.startBridgeTour());
    const guide=new DeliveryGuide();guide.update(g,1);assert(guide.points.length>1);assert.deepEqual(g.path,[]);
    assert(g.moveTo(g.taxi.destination));until(g,()=>g.taxi.phase==='unloading');assert(!g.moveTo(TAXI_STAND.home));assert.equal(g.taxi.delivered,id);
    until(g,()=>g.taxi.phase==='idle');assert.equal(g.taxi.delivered,id+1);assert.equal(g.deliveryDestination,null);assert(walkable(g.taxi.customers[id].drop.x,g.taxi.customers[id].drop.z,{radius:.32}));
  }
  assert(g.exitTruck());until(g,()=>g.services.taxi.phase==='parked');assert.equal(g.services.taxi.car.x,TAXI_STAND.home.x);
});
test('taxi approaches can be cancelled, empty taxi exits, and reset clears passengers',()=>{
  const g=new FireGame();assert(!g.pickupTaxiCustomer(0));assert(!g.pickupTaxiCustomer(99));
  g.boardService('taxi');until(g,()=>g.vehicle==='taxi');assert(g.pickupTaxiCustomer(0));assert(g.moveTo({x:-35,z:20}));assert.equal(g.taxi.phase,'idle');assert.equal(g.taxi.customers[0].phase,'waiting');
  assert(g.pickupTaxiCustomer(0));until(g,()=>g.carryingTaxiCustomer);g.reset();assert(!g.carryingTaxiCustomer);assert.equal(g.taxi.delivered,0);assert(g.taxi.customers.every(p=>p.phase==='waiting'));
});
test('customers respawn near the player repeatedly, rotate destinations and remain available for pickup',()=>{
  const g=board(),p=g.taxi.customers[0];
  for(let trip=0;trip<3;trip++){
    assert(g.pickupTaxiCustomer(0));until(g,()=>g.taxi.phase==='transporting');
    assert.equal(g.taxi.destination.name,TAXI_DESTINATIONS[trip].name);
    assert(g.moveTo(g.taxi.destination));until(g,()=>g.taxi.phase==='idle');
    assert.equal(p.phase,'delivered');assert.equal(g.taxi.delivered,trip+1);
    Object.assign(g.actor,p.stop); // Remaining at the pickup spot must never stall respawning.
    g.updateTaxi(TAXI_RESPAWN_SECONDS-.1);assert.equal(p.phase,'delivered');
    g.updateTaxi(.11);assert.equal(p.phase,'waiting');assert.equal(p.time,0);assert.equal(p.drop,undefined);
    assert.equal(g.taxi.customers.length,TAXI_CUSTOMERS.length);
  }
});
test('respawning a previous customer does not interrupt another passenger aboard',()=>{
  const g=board();assert(g.pickupTaxiCustomer(1));until(g,()=>g.taxi.phase==='transporting');
  const previous=g.taxi.customers[0];Object.assign(previous,{phase:'delivered',time:TAXI_RESPAWN_SECONDS-.1,trips:1});
  const destination={...g.taxi.destination};g.updateTaxi(.11);
  assert.equal(previous.phase,'waiting');assert.equal(g.taxi.customer,1);assert.equal(g.taxi.phase,'transporting');
  assert.equal(g.taxi.customers[1].phase,'aboard');assert.deepEqual(g.taxi.destination,destination);
});
