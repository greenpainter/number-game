import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {trackPoint,TRACK_LENGTH} from '../railway-state.js';
import layout from '../railway-layout.js';
import {walkable,findPath,WORLD} from '../navigation.js';
function advance(g,until,limit=18000){for(let i=0;i<limit&&!until();i++)g.update(1/60);assert(until(),JSON.stringify(g.snapshot()))}

test('north platform automatically dismounts after one lap and supports repeated rides',()=>{
  const g=new FireGame();assert(layout.boarding.z<-40);assert(Math.abs(g.train.car.z-layout.rail.top)<.001);
  for(let lap=1;lap<=3;lap++){
    assert(g.boardTrain());assert.equal(g.boardingStage,'train-door');advance(g,()=>g.drivingTrain);
    const stop=lap*TRACK_LENGTH;assert(Math.abs(g.train.stopAt-stop)<.0001);let previous=g.train.distance;
    for(let i=0;i<5000&&g.riding;i++){
      g.update(1/60);assert(g.train.distance>=previous);previous=g.train.distance;
      assert.deepEqual(g.train.car,trackPoint(g.train.distance));
      for(const offset of [0,6.5,12.65]){const p=trackPoint(g.train.distance-offset);assert(p.x>=-66&&p.x<=66&&p.z>=-47.81&&p.z<=43.01)}
      if(g.riding&&i%100===0){assert(g.moveNear({x:0,z:0}));assert(g.boardTrain());assert.equal(g.train.stopAt,stop);assert.equal(g.path.length,0)}
    }
    assert(!g.riding,'Every ride must end without a dismount request');assert.equal(g.train.speed,0);assert.equal(g.train.phase,'parked');
    assert.deepEqual({x:g.child.x,z:g.child.z},layout.exit);assert(walkable(g.child.x,g.child.z,{radius:.32}));
    assert(g.moveTo({x:6.5,z:-34}));advance(g,()=>g.mode==='idle');
  }
});
test('walking away or choosing another activity cancels pending train boarding',()=>{
  const g=new FireGame();assert(g.boardTrain());g.update(.1);assert(g.moveTo({x:-10,z:1}));advance(g,()=>g.mode==='idle');assert(!g.riding);assert.equal(g.train.distance,0);
  assert(g.boardTrain());assert(g.startFishing());advance(g,()=>g.mode==='fish-celebrate');assert(!g.riding);
  g.reset();assert(g.boardTruck());advance(g,()=>g.riding);assert.equal(g.boardTrain(),false);
});
test('pets follow around solid buildings, repeated taps keep following, and wait during vehicle rides',()=>{
  const g=new FireGame();assert.equal(g.followPet('bird'),false);
  for(const pet of g.pets){assert(g.followPet(pet.id));assert(g.followPet(pet.id));assert(pet.following)}
  for(const target of [{x:9,z:1},{x:19,z:-16.5},{x:-14,z:-17}]){
    assert(g.moveTo(target));
    for(let i=0;i<4000;i++){
      g.update(1/60);
      for(const pet of g.pets)assert(walkable(pet.x,pet.z,{radius:.23}),`Pet entered scenery: ${pet.id}`);
      if(g.mode==='idle'&&g.pets.every((p,i)=>!p.moving&&Math.hypot(p.x-g.child.x,p.z-g.child.z)<1.8+i*1.85))break;
    }
    assert(g.pets.every((p,i)=>Math.hypot(p.x-g.child.x,p.z-g.child.z)<1.8+i*1.85));
    assert(g.pets.every(p=>!p.moving),'Pets should stop walking when they catch up');
  }
  assert(g.boardTrain());advance(g,()=>g.drivingTrain);const waiting=g.pets.map(p=>({x:p.x,z:p.z}));
  for(let i=0;i<300;i++)g.update(1/60);assert.deepEqual(g.pets.map(p=>({x:p.x,z:p.z})),waiting);
  assert(g.exitTrain());advance(g,()=>!g.riding);assert(g.moveTo({x:-7,z:28}));advance(g,()=>g.mode==='idle'&&g.pets.every((p,i)=>Math.hypot(p.x-g.child.x,p.z-g.child.z)<1.8+i*1.85));
  g.reset();assert(g.pets.every(p=>!p.following));
});
test('expanded map routes reach all four outer avenues without obstacles',()=>{
  assert.equal(WORLD.area/WORLD.previousArea,4);
  const points=[{x:-48,z:31},{x:-48,z:-34},{x:48,z:-34},{x:48,z:31}];
  let p={x:-7,z:20};for(const target of points){const route=findPath(p,target,{radius:2.7});assert(route);for(const q of route)assert(walkable(q.x,q.z,{radius:2.7}));p=target}
});

test('reset clears a moving train, active mission, pets and blocked movement so play can restart',()=>{
  const setups=[
    g=>{g.boardTrain();advance(g,()=>g.riding);for(let i=0;i<300;i++)g.update(1/60)},
    g=>{g.boardBus(0);advance(g,()=>g.riding);g.moveTo({x:-48,z:20});g.update(.1)},
    g=>{g.getIceCream();advance(g,()=>g.mode==='eating')},
    g=>{g.startFishing();advance(g,()=>g.mode==='fishing')},
    g=>{g.child={x:-7,z:-5.4,angle:0};g.mode='moving';g.path=[{x:-7,z:-5.4}];g.target={x:-7,z:5.7}}
  ];
  for(const setup of setups){
    const g=new FireGame();g.followPet('dog');g.followPet('cat');setup(g);g.reset();
    assert.deepEqual(g.snapshot(),new FireGame().snapshot());assert(g.moveTo({x:-7,z:12}));advance(g,()=>g.mode==='idle');assert.equal(g.child.z,12);
  }
});
