import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {soundMix} from '../sound.js';
import {createEmergencyLights} from '../emergency-lights.js';
import {readFileSync} from 'node:fs';
test('emergency vehicle sirens start silent and toggle independently',()=>{
  const g=new FireGame();g.ready=true;g.sound=true;g.riding=true;
  for(const vehicle of ['firetruck','fire-west','fire-east','police','ambulance']){
    g.vehicle=vehicle;assert(g.hasSiren);assert(!g.sirenOn);assert.equal(soundMix(g,0).sirenGain,0);
    assert(g.toggleSiren());assert(g.sirenOn);assert(soundMix(g,0).sirenGain>0);
    assert.equal(soundMix(g,0,{paused:true}).sirenGain,0);assert.equal(soundMix(g,0,{hidden:true}).sirenGain,0);
    g.sound=false;assert.equal(soundMix(g,0).sirenGain,0);g.sound=true;
    assert(g.toggleSiren());assert.equal(soundMix(g,0).sirenGain,0);
  }
  g.vehicle='firetruck';g.toggleSiren();g.riding=false;assert(!g.hasSiren);assert(!g.toggleSiren());assert.equal(soundMix(g,0).sirenGain,0);
  g.riding=true;g.vehicle='dumptruck';assert(!g.hasSiren);assert(!g.toggleSiren());
  g.reset();g.riding=true;g.vehicle='firetruck';assert(!g.sirenOn);
});

test('all emergency models flash only their own lenses while their siren is on',()=>{
  const g=new FireGame();g.ready=true;g.riding=true;
  function model(name){
    const buffer=readFileSync(new URL(`../models/${name}.glb`,import.meta.url));
    const asset=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)));
    const makeMaterial=name=>({name,color:{},emissive:{copy(){}},emissiveIntensity:0,clone(){return makeMaterial(name)}});
    const meshes=asset.materials.map(m=>({isMesh:true,material:makeMaterial(m.name)}));
    return {meshes,traverse(fn){meshes.forEach(fn)}};
  }
  const vehicles=['firetruck','fire-west','fire-east','police','ambulance'].map(id=>{
    const root=model(id.startsWith('fire')?'firetruck':id==='police'?'policecar':'ambulance');
    const originals=root.meshes.map(o=>o.material);
    const lights=createEmergencyLights(root,id);
    const lenses=root.meshes.filter((o,i)=>o.material!==originals[i]).map(o=>o.material);
    assert(lenses.length>=2,`${id} must have red and blue lenses`);
    assert(lenses.every(m=>m.emissiveIntensity===0));
    return {id,root,lights,lenses,originals};
  });
  const update=time=>vehicles.forEach(v=>v.lights.update(g,time));
  for(const active of vehicles){
    g.vehicle=active.id;g.toggleSiren();
    const lit=new Set();
    for(const time of [0,.21,.41,.61]){
      update(time);
      for(const v of vehicles){
        if(v===active){
          assert(v.lenses.some(m=>m.emissiveIntensity>0));
          v.lenses.filter(m=>m.emissiveIntensity>0).forEach(m=>lit.add(m));
        }else assert(v.lenses.every(m=>m.emissiveIntensity===0));
        assert(v.originals.every(m=>m.emissiveIntensity===0),'shared materials stay untouched');
      }
    }
    assert.equal(lit.size,active.lenses.length,'both colors flash');
    g.toggleSiren();update(.21);assert(active.lenses.every(m=>m.emissiveIntensity===0));
    g.toggleSiren();g.riding=false;update(0);assert(active.lenses.every(m=>m.emissiveIntensity===0));
    g.riding=true;g.toggleSiren();
  }
});
