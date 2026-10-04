import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FireGame} from '../game-state.js';
import {PLAY_ACTIVITIES,PARK,playPose} from '../playground-layout.js';
import {findPath,walkable} from '../navigation.js';

test('all ten activities have reachable entrances and return the child safely',()=>{
  assert.equal(PLAY_ACTIVITIES.length,10);
  const g=new FireGame();
  assert.ok(findPath(g.child,PARK.entry,{radius:.32}));
  for(const p of PLAY_ACTIVITIES){
    assert.ok(findPath(PARK.entry,p.entry,{radius:.32}),p.id);
    g.child={...p.entry,angle:0};assert.equal(g.startPlay(p.id),true);
    const before=g.play.completed;
    for(let i=0;i<1600&&g.play.completed===before;i++){
      g.update(1/30);
      assert.ok(Number.isFinite(g.child.x)&&Number.isFinite(g.child.z)&&Number.isFinite(g.child.height??0));
    }
    assert.equal(g.play.completed,before+1,p.id);assert.equal(g.play.phase,'idle');
    assert.ok(walkable(g.child.x,g.child.z,{radius:.32}));assert.equal(g.child.height,undefined);
  }
  assert.equal(g.play.finished.length,10);
});

test('repeated taps do not restart approach; active play blocks other activities and reset releases it',()=>{
  const g=new FireGame(),p=PLAY_ACTIVITIES[0];g.child={...PARK.entry,angle:0};
  assert.ok(g.startPlay(p.id));const path=g.path;assert.ok(g.startPlay(p.id));assert.equal(g.path,path);
  assert.ok(g.moveTo(PARK.entry));assert.equal(g.play.phase,'idle');
  g.child={...p.entry,angle:0};g.startPlay(p.id);g.update(.05);g.update(.05);
  assert.equal(g.playing,true);assert.equal(g.moveTo(PARK.entry),false);
  assert.equal(g.boardService('ambulance'),false);assert.equal(g.callHelicopter(PARK.entry),false);assert.equal(g.toggleScooter(),false);
  g.reset();assert.equal(g.play.phase,'idle');assert.equal(g.child.height,undefined);
  assert.equal(g.play.completed,0);assert.ok(g.moveTo({x:-7,z:12}));
});

test('ride loops finish at their boarding point and stay within their reserved areas',()=>{
  for(const p of PLAY_ACTIVITIES){
    for(let i=0;i<=100;i++){
      const pose=playPose(p.id,p.duration*i/100);
      assert.ok(Math.abs(pose.x-p.x)<=p.width/2,p.id);
      assert.ok(Math.abs(pose.z-p.z)<=p.depth/2,p.id);
      assert.ok(pose.height>=-.2&&pose.height<14,p.id);
    }
    if(['swing','seesaw','carousel','zipline','balloon','pedalcar'].includes(p.id)){
      const a=playPose(p.id,0),b=playPose(p.id,p.duration);
      assert.ok(Math.hypot(a.x-b.x,a.z-b.z,a.height-b.height)<1e-8,p.id);
    }
  }
});

test('shipped playground retains all interaction roots and Y-up animated pivots',()=>{
  const b=readFileSync(new URL('../models/playground.glb',import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  for(const p of PLAY_ACTIVITIES){const node=j.nodes.find(n=>n.name==='Play_'+p.id);assert.ok(node,p.id);assert.ok(Math.abs(node.translation[0]-p.x)<.001);assert.ok(Math.abs(node.translation[2]-p.z)<.001)}
  for(const name of ['SwingSeat','SeeBeam','CarouselDeck','ZipSeat','Flowers','BalloonBasket','PedalCar']){
    const node=j.nodes.find(n=>n.name===name);assert.ok(node?.children?.length,name);assert.equal(node.rotation,undefined,name);
  }
  assert.equal(j.nodes.filter(n=>/^GardenTree/.test(n.name)).length,12);
});
