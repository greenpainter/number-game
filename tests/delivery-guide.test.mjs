import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {DeliveryGuide} from '../delivery-guide.js';
import {SERVICES,walkable} from '../navigation.js';

test('guidance reroutes without steering, uses vehicle clearance, and clears on reset',()=>{
  for(const vehicle of ['ambulance','police']){
    const g=new FireGame(),guide=new DeliveryGuide();g.riding=true;g.vehicle=vehicle;Object.assign(g.actor,{x:21,z:12});
    if(vehicle==='ambulance')g.rescue.phase='transporting';else g.city.custody.phase='transporting';
    const actor={...g.actor};guide.update(g,0);assert(guide.points.length>1);assert.deepEqual(g.actor,actor);assert.deepEqual(g.path,[]);assert.equal(g.mode,'idle');
    assert.deepEqual(guide.points.at(-1),SERVICES[vehicle].home);
    for(const p of guide.points)assert(walkable(p.x,p.z,g.options));
    const revision=guide.revision;for(let i=0;i<60;i++)guide.update(g,1/30);assert.equal(guide.revision,revision);
    Object.assign(g.actor,{x:21,z:18});guide.update(g,1);assert(guide.revision>revision);assert.equal(guide.points[0].z,18);assert.deepEqual(g.path,[]);
    g.reset();guide.update(g,0);assert.equal(guide.destination,null);assert.deepEqual(guide.points,[]);
  }
});
