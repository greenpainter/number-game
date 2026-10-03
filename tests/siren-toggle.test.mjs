import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {soundMix} from '../sound.js';
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
