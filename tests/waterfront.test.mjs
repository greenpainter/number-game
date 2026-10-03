import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import layout from '../waterfront-layout.js';
import {riverX,riverHeight,riverBlocked} from '../river-geometry.js';
import {walkable,findPath,WORLD} from '../navigation.js';
import {soundMix} from '../sound.js';
import {CITY_VOICE_LINES,noticeVoice} from '../city-voice.js';
import {NARRATION_CLIPS} from '../audio/ko/catalog.js';
import rail from '../railway-layout.js';
import city from '../city-layout.js';
function until(g,condition,seconds=80){for(let t=0;t<seconds&&!condition();t+=1/30)g.update(1/30);assert(condition(),JSON.stringify(g.transit))}

test('the river blocks water, routes across all three arches and reaches the east district',()=>{
  assert.equal(WORLD.maxX,390);
  for(let z=-170;z<177;z+=2)assert.equal(riverBlocked(riverX(z),z,.32),!layout.bridges.some(b=>Math.abs(z-b.z)<4.43));
  for(const b of layout.bridges){
    const start={x:b.x-42,z:b.z},end={x:b.x+42,z:b.z};assert.equal(riverHeight(b.x,b.z),5.5);
    const route=findPath(start,end,{radius:2.7});assert(route);
    let a=start;for(const q of route){for(let t=0;t<=1;t+=.002)assert(walkable(a.x+(q.x-a.x)*t,a.z+(q.z-a.z)*t,{radius:2.7}));a=q}
  }
  assert(findPath({x:200,z:65},{x:300,z:65},{radius:.32}));
  for(const b of layout.bridges)for(let x=b.x-40;x<340;x+=1)assert(walkable(x,b.z,{radius:2.7}),'Bridge approach '+b.id);
  for(const s of layout.stations){assert(walkable(s.boarding.x,s.boarding.z,{radius:.32}),s.id);assert(walkable(s.exit.x,s.exit.z,{radius:.32}),s.id);assert(findPath({x:-7,z:5.7},s.boarding,{radius:.32}),s.id)}
});

test('all twelve subway journeys descend, run underground and safely dismount at the chosen station',()=>{
  for(const from of layout.stations)for(const to of layout.stations.filter(s=>s!==from)){
    const g=new FireGame();g.child={...from.boarding,angle:0};assert(g.rideSubway(from.id,to.id));
    until(g,()=>g.transit.metro.phase==='running');assert(g.riding);assert.equal(g.vehicle,'metro');assert.equal(g.actor.height,-12);
    const target=g.transit.metro.to;g.moveTo({x:0,z:0});assert.equal(g.transit.metro.to,target);
    assert(!g.callHelicopter({x:0,z:0,name:'test'}));assert(!g.boardFerry());assert(!g.exitTruck());
    until(g,()=>g.transit.metro.phase==='idle');assert(!g.riding);assert.equal(g.mode,'idle');assert.equal(g.child.height,0);assert(Math.hypot(g.child.x-to.exit.x,g.child.z-to.exit.z)<.1);assert(walkable(g.child.x,g.child.z,{radius:.32}));
  }
});

test('metro entrances clear house roofs and children walk down stairs before boarding',()=>{
  const houses=[...rail.houses.map(([x,z])=>({x,z,width:6,depth:6})),...city.houses.map(([x,z])=>({x,z,width:7,depth:7})),...city.residences,...layout.homes];
  for(const s of layout.stations)for(const h of houses)assert(Math.abs(s.x-h.x)>(h.width/2+2)||Math.abs(s.z+2.9-h.z)>(h.depth/2+2.4),s.id+' overlaps a house');
  const g=new FireGame(),from=layout.stations[0];g.child={...from.boarding,angle:0};assert(g.rideSubway(from.id,'riverside'));
  until(g,()=>g.transit.metro.phase==='descending');let stairFrames=0;
  while(g.transit.metro.phase==='descending'){
    const before={...g.child};g.update(1/30);assert(!g.riding);
    const horizontal=Math.hypot(g.child.x-before.x,g.child.z-before.z),drop=before.height-g.child.height;
    assert(Math.hypot(horizontal,drop)<.1,'No free fall or teleport');
    if(drop>.001){assert(horizontal>.001,'Height only changes while walking on a flight');stairFrames++}
  }
  assert(stairFrames>150);assert.equal(g.transit.metro.phase,'platform');assert.equal(g.child.height,-11.4);
  until(g,()=>g.transit.metro.phase==='boarding');assert(!g.riding);assert.equal(g.transit.metro.doors,1);
  until(g,()=>g.transit.metro.phase==='closing');assert(g.riding);
  until(g,()=>g.transit.metro.phase==='ascending');assert(!g.riding);assert.equal(g.child.height,-11.4);
  until(g,()=>g.transit.metro.phase==='idle');assert.equal(g.child.height,0);
});

test('a different activity cancels an approach; reset clears underground and ferry states',()=>{
  const g=new FireGame();assert(g.rideSubway('central','riverside'));assert(g.moveTo({x:-7,z:8}));assert.equal(g.transit.metro.phase,'idle');
  assert(g.boardFerry());assert(g.rideSubway('central','airport'));assert.equal(g.transit.ferry.phase,'idle');
  g.child={...layout.stations[0].boarding,angle:0};g.path=[];g.mode='idle';until(g,()=>g.metroTrip);g.reset();assert(!g.metroTrip);assert.equal(g.transit.metro.phase,'idle');assert.equal(g.mode,'idle');
  assert(!g.rideSubway('central','central'));assert(!g.rideSubway('bad','central'));
  assert(g.rideSubway('central','airport'));assert(g.callHelicopter({x:-7,z:12,name:'중앙 마을'}));assert.equal(g.transit.metro.phase,'idle');
});

test('the ferry stays in the river, passes under a bridge and returns to a safe dock',()=>{
  assert(layout.dock.boat.x+1.7<layout.dock.x-14,'The parked hull stays beside the pier, not on its deck');
  const g=new FireGame();g.child={...layout.dock.boarding,angle:0};assert(g.boardFerry());until(g,()=>g.ferryTrip);
  assert(!g.exitTruck());assert(!g.rideSubway('central','airport'));let crossed=false;
  for(let i=0;i<1200&&g.ferryTrip;i++){
    g.update(1/30);const f=g.transit.ferry;
    if(f.phase==='cruising'){assert(Math.abs(f.car.x-riverX(f.car.z))<12);if(Math.abs(f.car.z-30)<1)crossed=true}
  }
  assert(crossed);assert.equal(g.transit.ferry.phase,'idle');assert(!g.riding);assert.equal(g.mode,'idle');assert(walkable(g.child.x,g.child.z,{radius:.32}));
  assert(g.boardFerry());until(g,()=>g.ferryTrip);g.reset();assert(!g.ferryTrip);
});

test('new activities have recorded Korean prompts and their audio obeys mute, pause and visibility',()=>{
  for(const text of CITY_VOICE_LINES)assert(NARRATION_CLIPS[text],text);
  assert.equal(noticeVoice('슝! 강변 공원으로 날아가요'),'헬리콥터를 타고 목적지로 날아가요.');
  assert.equal(noticeVoice('강변 공원 도착!'),'목적지에 도착했어요. 즐겁게 놀아요!');
  const g=new FireGame();g.ready=true;g.sound=true;g.child={...layout.stations[0].boarding,angle:0};g.rideSubway('central','riverside');until(g,()=>g.transit.metro.phase==='running');
  assert(soundMix(g,1).engineGain>0);assert.equal(soundMix(g,1).sirenGain,0);
  assert(soundMix(g,1,{narrating:true}).engineGain<soundMix(g,1).engineGain);
  for(const opts of [{paused:true},{hidden:true}]){const m=soundMix(g,1,opts);assert.equal(m.engineGain+m.sirenGain+m.waterGain+m.rotorGain,0)}
  g.sound=false;assert.equal(soundMix(g,1).engineGain,0);
});
