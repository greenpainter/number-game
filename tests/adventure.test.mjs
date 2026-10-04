import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {FireGame} from '../game-state.js';
import {VILLAGE_EVENTS,FOREST,ADVENTURE_LINES,EVENT_HUBS} from '../adventure-layout.js';
import city from '../city-layout.js';
import railway from '../railway-layout.js';
import waterfront from '../waterfront-layout.js';
import {ringRoad} from '../road-layout.js';
import townRoads from '../town-roads.js';
import roadConnectors from '../road-connectors.js';
import {forestClear} from '../adventure-state.js';
import {findPath,walkable} from '../navigation.js';
import {noticeVoice} from '../city-voice.js';
import {NARRATION_CLIPS} from '../audio/ko/catalog.js';
const tick=(g,until,limit=1200)=>{for(let i=0;i<limit&&!until();i++)g.update(1/30);assert.ok(until(),g.adventure.id+' '+g.adventure.phase)};

test('twenty distinct events complete by walking to three picture targets and can replay',()=>{
  assert.equal(VILLAGE_EVENTS.length,20);assert.equal(new Set(VILLAGE_EVENTS.map(e=>e.id)).size,20);
  const g=new FireGame();
  for(const e of VILLAGE_EVENTS){
    assert.ok(findPath(g.child,e.entry,{radius:.32}),e.id+' connected');
    g.child={...e.entry,angle:0};assert.ok(g.startEvent(e.id));tick(g,()=>g.adventure.phase==='ready');
    for(let step=0;step<3;step++){
      assert.equal(g.eventTarget(e.id,(step+1)%3),false);
      assert.ok(g.eventTarget(e.id,step));assert.equal(g.eventTarget(e.id,step),false);
      tick(g,()=>g.adventure.phase==='action');assert.ok(g.adventureBusy);
      assert.equal(g.boardService('ambulance'),false);assert.equal(g.callHelicopter(FOREST.entry),false);assert.equal(g.moveTo(FOREST.entry),false);
      tick(g,()=>g.adventure.step===step+1);assert.ok(walkable(g.child.x,g.child.z,{radius:.32}));
    }
    assert.equal(g.city.notice,e.done);tick(g,()=>g.adventure.phase==='idle');
  }
  assert.equal(g.adventure.finished.length,20);assert.equal(g.adventure.completed,20);
  const e=VILLAGE_EVENTS[0];g.child={...e.entry,angle:0};assert.ok(g.startEvent(e.id));tick(g,()=>g.adventure.phase==='ready');assert.equal(g.adventure.step,0);assert.equal(g.adventure.finished.length,20);
});
test('repeated approach is stable, moving cancels, and map flight starts the selected event on arrival',()=>{
  const g=new FireGame(),e=VILLAGE_EVENTS[0];g.child={x:e.entry.x,z:e.entry.z+2,angle:0};g.startEvent(e.id);const path=g.path;g.startEvent(e.id);assert.equal(g.path,path);
  assert.ok(g.moveTo({x:e.entry.x,z:e.entry.z+4}));assert.equal(g.adventure.phase,'idle');
  assert.ok(g.callHelicopter({...e.entry,name:e.name}));g.pendingEvent=e.id;
  tick(g,()=>g.adventure.phase==='ready',3000);assert.equal(g.adventure.id,e.id);
  assert.ok(g.cancelAdventure());assert.equal(g.adventure.id,null);
  g.reset();assert.equal(g.forest.met.length,0);assert.equal(g.adventure.completed,0);
});
test('forest animals roam within the woodland without entering trees or one another',()=>{
  const g=new FireGame(),start=g.forest.animals.map(a=>({...a})),range=start.map(()=>0);
  for(let i=0;i<1800;i++){
    g.updateAdventure(.1);
    for(const [j,a] of g.forest.animals.entries()){
      assert.ok(forestClear(a.x,a.z,a.radius),a.id);range[j]=Math.max(range[j],Math.hypot(a.x-start[j].x,a.z-start[j].z));
      for(const b of g.forest.animals.slice(j+1))assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=a.radius+b.radius+.14,a.id+' collision');
    }
  }
  range.forEach((r,i)=>assert.ok(r>2,start[i].id+' explores'));
});
test('all eight species can be greeted from reachable positions and resume after greeting',()=>{
  const g=new FireGame();
  for(const a of g.forest.animals.slice(0,8)){
    g.child={x:a.x,z:a.z+3.5,angle:0};assert.ok(g.meetForestAnimal(a.id));
    tick(g,()=>g.forest.phase==='greet');assert.ok(g.adventureBusy);tick(g,()=>g.forest.phase==='idle');assert.equal(g.mode,'idle');
  }
  assert.equal(g.forest.met.length,8);assert.equal(g.forest.soundRequest,8);
});
test('shipped event GLB has all targets, rewards and shared woodland geometry; every instruction has recorded Korean audio',()=>{
  const b=readFileSync(new URL('../models/forest-events.glb',import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  for(const e of VILLAGE_EVENTS){
    const root=j.nodes.find(n=>n.name==='Event_'+e.id);assert.ok(root);assert.ok(Math.abs(root.translation[0]-e.x)<.001);assert.ok(Math.abs(root.translation[2]-e.z)<.001);
    for(let i=0;i<3;i++){assert.ok(j.nodes.find(n=>n.name==='Target_'+e.id+'_'+i));assert.ok(j.nodes.find(n=>n.name==='Reward_'+e.id+'_'+i))}
  }
  assert.equal(j.nodes.filter(n=>/^ForestTree\d+$/.test(n.name)).length,64);
  for(const line of ADVENTURE_LINES){assert.equal(noticeVoice(line),line);assert.ok(NARRATION_CLIPS[line],line);assert.ok(existsSync(new URL('../'+NARRATION_CLIPS[line],import.meta.url)))}
});
test('larger play clearings do not overlap one another, roads, railways, homes or the map edge',()=>{
  for(const [i,e] of VILLAGE_EVENTS.entries()){
    for(const other of VILLAGE_EVENTS.slice(i+1))assert.ok(Math.abs(e.x-other.x)>12||Math.abs(e.z-other.z)>12,e.id+' '+other.id);
    for(const [j,p] of e.stands.entries()){assert.ok(walkable(p.x,p.z,{radius:.5}),e.id+' standing spot');assert.ok(Math.hypot(p.x-e.targets[j].x,p.z-e.targets[j].z)>1,e.id+' outside prop')}
  }
  const roads=[{points:ringRoad(),width:10},...city.districtRoads,{points:waterfront.road,width:9},...townRoads,...roadConnectors];
  for(const h of EVENT_HUBS){
    assert.ok(h.x-16>city.world.minX+4&&h.x+16<city.world.maxX-4&&h.z-25>city.world.minZ+4&&h.z+25<city.world.maxZ-4);
    const r=railway.rail;assert.ok(h.x+16<r.left-3||h.x-16>r.right+3||h.z+25<r.top-3||h.z-25>r.bottom+3,h.id+' clears railway');
    for(const road of roads)for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
      for(let k=0;k<=n;k++){const t=k/(n||1),x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;assert.ok(Math.abs(x-h.x)>16+(road.width??8)/2+1||Math.abs(z-h.z)>25+(road.width??8)/2+1,h.id+' clears road')}
    }
    for(const home of [...city.residences,...waterfront.homes]){const radius=Math.hypot(home.width,home.depth)/2+1;assert.ok(Math.abs(home.x-h.x)>16+radius||Math.abs(home.z-h.z)>25+radius,h.id+' clears homes')}
  }
});
