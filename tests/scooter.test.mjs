import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import water from '../waterfront-layout.js';
import {walkable} from '../navigation.js';
import {riverX} from '../river-geometry.js';
import {scooterPose,solveScooterLeg} from '../scooter-pose.js';

test('scooter follows the same walkable path at a faster speed and can dismount mid-trip',()=>{
  const walk=new FireGame(),ride=new FireGame();
  for(const g of [walk,ride]){g.child={x:-48,z:0,angle:0};assert(g.moveTo({x:-48,z:28}))}
  assert(ride.toggleScooter());assert(ride.onScooter);
  for(let i=0;i<60;i++){walk.update(1/60);ride.update(1/60);assert(walkable(ride.child.x,ride.child.z,ride.options))}
  assert(ride.child.z>walk.child.z*2);assert(!ride.riding);assert.equal(ride.actor,ride.child);
  const position={...ride.child};assert(ride.toggleScooter());assert(!ride.onScooter);assert.deepEqual(ride.child,position);
  for(let i=0;i<600;i++)ride.update(1/60);assert.equal(ride.mode,'idle');assert(Math.abs(ride.child.z-28)<.01);
});
test('scooter folds before subway and other activities and reset clears it',()=>{
  const g=new FireGame(),s=water.stations[0];g.child={...s.boarding,angle:0};assert(g.toggleScooter());assert(g.rideSubway(s.id,'zoo'));
  g.update(1/60);assert(!g.scooter);assert(!g.onScooter);assert(!g.toggleScooter());
  g.reset();assert(!g.scooter);assert(g.toggleScooter());assert(g.startFishing());g.update(1/60);assert(!g.scooter);
  g.reset();g.riding=true;g.vehicle='firetruck';assert(!g.toggleScooter());g.reset();assert(g.toggleScooter());g.reset();assert(!g.scooter);
});
test('scooter cannot enter river water or bypass a building',()=>{
  const g=new FireGame();assert(g.toggleScooter());
  assert(!g.moveTo({x:riverX(65),z:65}));assert(!g.moveTo({x:-7,z:-7}));assert(g.onScooter);
});
test('the pushing foot stays on the ground, the support foot stays on the deck and the knee recovers',()=>{
  let contactFrames=0,maxLift=0,minKnee=10,maxKnee=0;
  for(let i=0;i<125;i++){
    const pose=scooterPose(i/100,true),r=solveScooterLeg(pose.right),l=solveScooterLeg(pose.left);
    for(const [angles,target] of [[r,pose.right],[l,pose.left]]){
      const ankle=.72-.27*Math.cos(angles.hip)-.32*Math.cos(angles.hip+angles.knee);
      assert(Math.abs(ankle-(target.y+.13))<.001);assert(Math.abs(angles.hip+angles.knee+angles.ankle)<1e-9);
    }
    assert(Math.abs(pose.body+pose.left.y*1.15-.292)<1e-9);
    if(pose.contact){contactFrames++;assert(Math.abs(pose.body+pose.right.y*1.15)<1e-9)}
    maxLift=Math.max(maxLift,pose.body+pose.right.y*1.15);minKnee=Math.min(minKnee,r.knee);maxKnee=Math.max(maxKnee,r.knee);
  }
  assert(contactFrames>25);assert(maxLift>.29);assert(maxKnee-minKnee>.6);
  assert.deepEqual(scooterPose(1,false),scooterPose(5,false));
});
