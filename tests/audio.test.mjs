import test from 'node:test';
import assert from 'node:assert/strict';
import {KoreanNarrator,chooseKoreanVoice} from '../narration.js';
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
test('prefer natural Korean voices over desktop voices, without selecting another language',()=>{
  const desktop={name:'Microsoft Heami',lang:'ko-KR',default:true},natural={name:'SunHi Natural',lang:'ko-KR'},english={name:'Natural',lang:'en-US'};
  assert.equal(chooseKoreanVoice([desktop,english,natural]),natural);assert.equal(chooseKoreanVoice([desktop]),desktop);assert.equal(chooseKoreanVoice([english]),null);
});
test('new narration waits for the sentence to finish; mute cancels queued speech',()=>{
  const spoken=[];let cancellations=0;
  const host={document:{hidden:false},SpeechSynthesisUtterance:class{constructor(text){this.text=text}},speechSynthesis:{getVoices:()=>[],speak:u=>spoken.push(u),cancel:()=>cancellations++}};
  const n=new KoreanNarrator(host);n.say('출발!');n.say('흙을 받아요.');n.say('흙을 다 실었어요.');assert.equal(spoken.length,1);assert.equal(cancellations,0);
  spoken[0].onend();assert.equal(spoken[1].text,'흙을 다 실었어요.');assert.equal(spoken[1].rate,1);assert.equal(spoken[1].pitch,1);
  n.say('내려요.');n.setEnabled(false);spoken[1].onend();assert.equal(spoken.length,2);assert.equal(cancellations,1);
});
