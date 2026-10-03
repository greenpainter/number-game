import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundMusic} from '../background-music.js';
import {soundMix} from '../sound.js';
import {FireGame} from '../game-state.js';

function fakeContext(){
  const volumes=[],sources=[];
  return {currentTime:1,destination:{},volumes,sources,
    createGain(){return {gain:{value:0,cancelScheduledValues(){},setValueAtTime(v){volumes.push(v)},setTargetAtTime(v){volumes.push(v)}},connect(){}}},
    async decodeAudioData(){return {duration:30}},
    createBufferSource(){const s={connect(){},start(){this.started=true}};sources.push(s);return s},
  };
}
test('music loads once, loops, and stays muted if switched off while loading',async()=>{
  const ctx=fakeContext();let finish,requests=0;
  const music=createBackgroundMusic(ctx,()=>{requests++;return new Promise(resolve=>{finish=resolve})});
  music.setVolume(.14);const first=music.start(),second=music.start();
  assert.equal(first,second);music.setVolume(0);
  finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});
  assert(await first);assert.equal(requests,1);assert.equal(ctx.sources.length,1);
  assert(ctx.sources[0].loop);assert(ctx.sources[0].started);assert.equal(ctx.volumes.at(-1),0);
  await music.start();assert.equal(requests,1);
  music.setVolume(.14);assert.equal(ctx.volumes.at(-1),.14);
});
test('failed music fetch is harmless and can retry on a later gesture',async()=>{
  let requests=0;const ctx=fakeContext();
  const music=createBackgroundMusic(ctx,async()=>({ok:++requests>1,status:404,arrayBuffer:async()=>new ArrayBuffer(0)}));
  assert.equal(await music.start(),false);assert.equal(ctx.sources.length,0);
  assert.equal(await music.start(),true);assert.equal(ctx.sources.length,1);
});
test('music ducks under narration and emergency sounds and silences when inactive',()=>{
  const g=new FireGame();g.ready=true;g.sound=true;
  const normal=soundMix(g,0).musicGain;assert(normal>0);
  assert(soundMix(g,0,{narrating:true}).musicGain<normal);
  g.riding=true;g.vehicle='firetruck';g.toggleSiren();assert(soundMix(g,0).musicGain<normal);
  g.toggleSiren();g.city.helicopter.phase='boarding';assert(soundMix(g,0).musicGain<normal);
  for(const options of [{paused:true},{hidden:true}])assert.equal(soundMix(g,0,options).musicGain,0);
  g.sound=false;assert.equal(soundMix(g,0).musicGain,0);
  g.sound=true;g.ready=false;assert.equal(soundMix(g,0).musicGain,0);
});
