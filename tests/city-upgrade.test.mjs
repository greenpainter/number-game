import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import layout from '../city-layout.js';
import {FireGame} from '../game-state.js';
import {findPath,walkable} from '../navigation.js';
import {zooTapTarget} from '../zoo-interaction.js';
import {soundMix} from '../sound.js';
import {NARRATION_CLIPS} from '../audio/ko/catalog.js';
import {trafficRoutes,bridgeRoute} from '../road-layout.js';

test('elephant, fence and sign taps lead to its viewing point; paths retain their target',()=>{
  const h=layout.zoo.habitats.find(h=>h.id==='elephant');
  for(const p of [{x:h.x,z:h.z},{x:h.x,z:h.z+h.depth/2},{x:h.x,z:h.z+15.5}])assert.deepEqual(zooTapTarget(p),{animal:'elephant'});
  const path={x:-124,z:40};assert.deepEqual(zooTapTarget(path),path);
  const g=new FireGame();g.child={...path,angle:0};assert(g.visitZoo('elephant'));assert.deepEqual(g.target,h.view);
  for(let i=0;i<3000&&g.mode!=='idle';i++)g.update(1/30);
  assert.equal(g.mode,'idle');assert(Math.hypot(g.child.x-h.view.x,g.child.z-h.view.z)<.1);
  g.update(1/30); // Idle-facing pose is applied on the following animation frame.
  const animal=layout.zoo.animals.find(a=>a.id==='elephant');assert(Math.abs(g.child.angle-Math.atan2(animal.x-g.child.x,animal.z-g.child.z))<.01);
  assert(!g.visitZoo('unknown'));assert.deepEqual(g.target,null);
});

test('all 36 animals stay in their enclosure and every viewing point is accessible',t=>{
  assert.equal(new Set(layout.zoo.animals.map(a=>a.id)).size,36);
  assert.equal(new Set(layout.zoo.animals.map(a=>a.species)).size,12);
  for(const a of layout.zoo.animals){const h=layout.zoo.habitats.find(h=>h.id===a.habitat);assert(h);assert(Math.abs(a.x-h.x)+4<h.width/2);assert(Math.abs(a.z-h.z)+4<h.depth/2);assert.deepEqual(a.view,h.view)}
  const start=performance.now();
  for(const h of layout.zoo.habitats){
    const path=findPath({x:-7,z:12},h.view,{radius:.32});assert(path,h.name);
    let a={x:-7,z:12};for(const b of path){const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15);for(let i=1;i<=n;i++)assert(walkable(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,{radius:.32}),h.name);a=b}
  }
  t.diagnostic(`12 long zoo routes: ${(performance.now()-start).toFixed(1)} ms`);
});

test('fire engines have sirens and helicopter rotor audio follows flight, pause and mute',()=>{
  const g=new FireGame();g.ready=true;g.sound=true;g.riding=true;
  for(const vehicle of ['firetruck','fire-west','fire-east']){
    g.vehicle=vehicle;g.toggleSiren();assert(soundMix(g,0).sirenGain>0);assert.notEqual(soundMix(g,0).sirenHz,soundMix(g,.3).sirenHz);
    assert(soundMix(g,0,{narrating:true}).sirenGain<soundMix(g,0).sirenGain);
  }
  g.riding=false;g.vehicle=null;
  for(const phase of ['descending','boarding','ascending','cruising','landing','disembarking','departing']){
    g.city.helicopter.phase=phase;assert(soundMix(g,0).rotorGain>0);
    for(const option of [{paused:true},{hidden:true}]){const m=soundMix(g,0,option);assert.equal(m.rotorGain+m.sirenGain+m.engineGain+m.waterGain,0)}
  }
  g.sound=false;assert.equal(soundMix(g,0).rotorGain,0);g.sound=true;
  for(const phase of ['idle','waiting']){g.city.helicopter.phase=phase;assert.equal(soundMix(g,0).rotorGain,0)}
});

test('a capture emits one narration event and ships the Korean recording',()=>{
  const events=[],g=new FireGame(reason=>events.push(reason));
  g.riding=true;g.vehicle='police';g.city.chase=0;Object.assign(g.services.police.car,g.city.thieves[0].car);
  g.update(.01);assert.equal(g.city.caught,1);assert.equal(events.filter(e=>e==='thief-caught').length,1);
  for(let i=0;i<60;i++)g.update(1/30);assert.equal(events.filter(e=>e==='thief-caught').length,1);
  assert(NARRATION_CLIPS['잡았다! 도둑을 잡았어요!']);
});

test('new road surfaces stay clear of house footprints and traffic follows open routes',()=>{
  assert.equal(new Set(layout.residences.map(h=>h.style)).size,6);assert(layout.residences.length>=60);
  for(const h of layout.residences){const c=Math.abs(Math.cos(h.rotation)),s=Math.abs(Math.sin(h.rotation));for(const [x,z] of bridgeRoute())assert(Math.abs(x-h.x)>=c*h.width/2+s*h.depth/2+4.5||Math.abs(z-h.z)>=s*h.width/2+c*h.depth/2+4.5,'House overlaps the elevated road')}
  for(const road of layout.districtRoads)for(const [x,z] of road.points)assert(walkable(x,z,{radius:2.2}),road.name+' '+x+','+z);
  const g=new FireGame();g.child={x:0,z:0,angle:0};
  for(const t of g.city.traffic.filter(t=>t.route>=4)){
    const route=trafficRoutes[t.route];t.distance=1e5;
    g.update(.1);assert(t.car.x>=Math.min(...route.map(p=>p[0]))-2&&t.car.x<=Math.max(...route.map(p=>p[0]))+2);
  }
});
