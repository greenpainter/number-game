import test from 'node:test';
import assert from 'node:assert/strict';
import {KoreanNarrator} from '../narration.js';
import {NARRATION_CLIPS} from '../audio/ko/catalog.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {soundMix} from '../sound.js';
import {FireGame} from '../game-state.js';
test('dump and buses have a steady low engine, never an emergency siren; mute stops every channel',()=>{
  const g=new FireGame();g.ready=true;g.sound=true;g.riding=true;g.mode='moving';
  for(const vehicle of ['dumptruck','bus-0','bus-1','bus-2']){
    g.vehicle=vehicle;let low=Infinity,high=-Infinity;
    for(let t=0;t<10;t+=.03){const m=soundMix(g,t);assert.equal(m.sirenGain,0);assert(m.engineGain>0);low=Math.min(low,m.engineHz);high=Math.max(high,m.engineHz)}
    assert(high<100);assert(high-low<=3.01);
  }
  for(const vehicle of ['police','ambulance']){g.vehicle=vehicle;assert(soundMix(g,0).sirenGain>0);assert.equal(soundMix(g,0,{paused:true}).sirenGain,0)}
  g.sound=false;const m=soundMix(g,0);assert.equal(m.sirenGain+m.engineGain+m.waterGain,0);
});
const messages=Object.keys(NARRATION_CLIPS),settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
  const sources=[],requests=[];
  const host={document:{hidden:false},fetch:async url=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}}};
  const context={destination:{},decodeAudioData:async data=>({data}),createBufferSource:()=>{
    const source={connect(){},disconnect(){},start(){this.started=true},stop(){this.stopped=true}};sources.push(source);return source;
  }};
  const narrator=new KoreanNarrator(host);return {narrator,host,context,sources,requests};
}
test('recordings wait for touch and finish before the latest queued sentence; mute cancels playback',async()=>{
  const {narrator:n,context,sources,requests}=setup();
  n.say(messages[0]);assert.equal(n.status,'waiting-for-touch');assert.equal(requests.length,0);
  n.connect(context);await settle();assert.equal(n.status,'speaking');
  n.say(messages[1]);n.say(messages[2]);assert.equal(sources.length,1);
  sources[0].onended();await settle();assert.equal(n.lastMessage,messages[2]);assert.equal(sources.length,2);
  n.say(messages[3]);const staleEnd=sources[1].onended;n.setEnabled(false);staleEnd();await settle();
  assert.equal(sources[1].stopped,true);assert.equal(sources.length,2);assert.equal(n.status,'idle');
  assert.equal(n.snapshot().source,'recorded');assert.match(requests[0].pathname,/number-game\/audio\/ko\/.*\.mp3$/);
});
test('muting during a download prevents late playback; re-enabling reuses the decoded clip',async()=>{
  const {narrator:n,host,context,sources,requests}=setup();let release;
  host.fetch=()=>{requests.push(1);return new Promise(resolve=>{release=resolve})};
  n.connect(context);n.say(messages[0]);n.setEnabled(false);
  release({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await settle();assert.equal(sources.length,0);
  n.setEnabled(true);n.say(messages[0]);await settle();assert.equal(sources.length,1);assert.equal(requests.length,1);
});
test('failed files can retry and hidden pages do not start queued playback',async()=>{
  const {narrator:n,host,context,sources}=setup();const fetchOK=host.fetch;
  n.connect(context);host.fetch=async()=>({ok:false});n.say(messages[0]);await settle();assert.equal(n.status,'audio-unavailable');
  host.fetch=fetchOK;n.say(messages[0]);await settle();n.say(messages[1]);host.document.hidden=true;sources[0].onended();await settle();
  assert.equal(sources.length,1);assert.equal(n.status,'finished');
});
test('all catalog clips match shipped audio checksums, including every bus and service name',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../audio/ko/manifest.json',import.meta.url)));
  assert.equal(manifest.voice,'F1');assert.equal(manifest.clips.length,messages.length);
  for(const clip of manifest.clips){
    assert(clip.durationSeconds>0.4&&clip.durationSeconds<15,clip.text);
    const bytes=readFileSync(new URL('../'+NARRATION_CLIPS[clip.text],import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256);
  }
  for(const color of ['빨간색','파란색','초록색']){
    assert(NARRATION_CLIPS[color+' 버스를 타러 가요!']);assert(NARRATION_CLIPS[color+' 버스에 탔어요! 마을을 한 바퀴 돌아볼까요?']);
  }
  for(const name of ['경찰차','앰뷸런스'])assert(NARRATION_CLIPS[name+'가 나와요. 문 앞에서 기다려 주세요.']);
});
