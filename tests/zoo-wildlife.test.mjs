import test from 'node:test';
import assert from 'node:assert/strict';
import {createZooAnimals,updateZooAnimals,habitatClear} from '../zoo-wildlife.js';
import {ANIMAL_CALLS,animalCallSamples,createZooAudio} from '../zoo-audio.js';
import {FireGame} from '../game-state.js';
test('all 36 animals explore safely around fences, scenery and each other',()=>{
  const animals=createZooAnimals(),origins=animals.map(a=>({...a})),ranges=animals.map(()=>0);
  for(let i=0;i<6000;i++){
    updateZooAnimals(animals,.1);
    for(const [j,a] of animals.entries()){
      assert(habitatClear(a,a.x,a.z),a.id);ranges[j]=Math.max(ranges[j],Math.hypot(a.x-origins[j].x,a.z-origins[j].z));
      for(const b of animals.slice(j+1))if(a.habitat===b.habitat)assert(Math.hypot(a.x-b.x,a.z-b.z)>=a.radius+b.radius+.299,a.id+' overlaps '+b.id);
    }
  }
  ranges.forEach((r,i)=>assert(r>5,animals[i].id+' must explore, not sway in place'));
});
test('each species has a finite, gently bounded original sound effect',()=>{
  assert.equal(Object.keys(ANIMAL_CALLS).length,12);
  for(const species of Object.keys(ANIMAL_CALLS)){
    const samples=animalCallSamples(species);assert(samples.length>10000);let energy=0;
    for(const v of samples){assert(Number.isFinite(v)&&Math.abs(v)<.7);energy+=v*v}
    assert(energy>1);assert(Math.abs(samples[0])<.001);assert(Math.abs(samples.at(-1))<.001);
  }
});
test('zoo sounds stay nearby, never pile up, and stop on mute, pause or hiding',()=>{
  const sources=[],ctx={currentTime:0,destination:{},createGain:()=>({gain:{value:0,setTargetAtTime(){}},connect(){}}),createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>{const s={connect(){},disconnect(){},start(){},stop(){this.stopped=true}};sources.push(s);return s}};
  const audio=createZooAudio(ctx),g=new FireGame();g.ready=true;g.sound=true;audio.update(g);assert.equal(sources.length,0);
  g.child={x:-147,z:30};g.city.viewing='elephant';g.city.animalSoundRequest++;audio.update(g);assert(audio.active);
  for(let i=0;i<20;i++)audio.update(g);assert.equal(sources.length,1);
  g.sound=false;audio.update(g);assert(sources[0].stopped);assert(!audio.active);
  g.sound=true;ctx.currentTime=10;audio.update(g,{narrating:true});assert.equal(sources.length,1);
  audio.update(g);assert(audio.active);audio.update(g,{hidden:true});assert(!audio.active);
  ctx.currentTime=30;audio.update(g);audio.update(g,{paused:true});assert(!audio.active);
});
