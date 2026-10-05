import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {PATIENT_SPOTS,RESCUE_LINES} from '../rescue-state.js';
import {SERVICES,walkable} from '../navigation.js';
import {NARRATION_CLIPS} from '../audio/ko/catalog.js';
function until(g,fn){for(let i=0;i<9000&&!fn();i++)g.update(1/30);assert(fn(),JSON.stringify(g.rescue))}
test('ambulance picks up each patient, delivers to hospital, and allows another rescue',()=>{
  const g=new FireGame();assert(!g.rescuePatient(0));assert(g.boardService('ambulance'));until(g,()=>g.riding);
  for(let i=0;i<PATIENT_SPOTS.length;i++){
    assert(walkable(PATIENT_SPOTS[i].x,PATIENT_SPOTS[i].z,{radius:.4}));assert(g.rescuePatient(i));
    until(g,()=>g.rescue.phase==='boarding');assert(!g.exitService());assert(!g.callHelicopter({x:-7,z:12}));assert(!g.moveTo({x:-7,z:12}));
    until(g,()=>g.rescue.phase==='transporting');assert.equal(g.patients[i].phase,'aboard');assert(!g.rescuePatient((i+1)%3));
    const parked={x:g.actor.x,z:g.actor.z};for(let n=0;n<150;n++)g.update(1/30);
    assert.deepEqual({x:g.actor.x,z:g.actor.z},parked);assert.equal(g.path.length,0);assert(g.deliveryDestination);
    assert(g.moveTo(SERVICES.ambulance.home));until(g,()=>g.rescue.delivered===i+1);assert.equal(g.patients[i].phase,'recovered');assert(Math.hypot(g.actor.x-SERVICES.ambulance.home.x,g.actor.z-SERVICES.ambulance.home.z)<2.5);assert.equal(g.deliveryDestination,null);
  }
  assert(g.exitService());for(const line of RESCUE_LINES)assert(NARRATION_CLIPS[line],line);
});
test('patient approach can be cancelled and reset clears the entire rescue',()=>{
  const g=new FireGame();g.boardService('ambulance');until(g,()=>g.riding);assert(g.rescuePatient(1));assert(g.moveTo({x:7,z:-17}));assert.equal(g.rescue.phase,'idle');assert.equal(g.patients[1].phase,'waiting');
  g.rescuePatient(0);until(g,()=>g.carryingPatient);g.reset();assert(!g.carryingPatient);assert.equal(g.rescue.delivered,0);assert(g.patients.every(p=>p.phase==='waiting'));
});
