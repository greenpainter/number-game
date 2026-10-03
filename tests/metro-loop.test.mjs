import test from 'node:test';
import assert from 'node:assert/strict';
import {FireGame} from '../game-state.js';
import {METRO_LOOP,nextMetroStation,metroStopsBetween} from '../metro-loop.js';
import layout from '../waterfront-layout.js';
test('an entrance tap rides to the next station and the fourth station wraps to the first',()=>{
  for(const id of METRO_LOOP){
    const g=new FireGame(),s=layout.stations.find(s=>s.id===id);g.child={...s.boarding,angle:0};
    assert(g.rideSubway(id));assert.equal(g.transit.metro.to,nextMetroStation(id));
    for(let i=0;i<2800&&g.transit.metro.phase!=='idle';i++)g.update(1/30);
    assert.equal(g.transit.metro.phase,'idle');const to=layout.stations.find(s=>s.id===nextMetroStation(id));assert(Math.hypot(g.child.x-to.exit.x,g.child.z-to.exit.z)<.1);
  }
  assert.equal(nextMetroStation('zoo'),'central');
});
test('map journeys stop at intermediate stations in loop order without ejecting the child',()=>{
  assert.deepEqual(metroStopsBetween('central','zoo'),['central','airport','riverside','zoo']);
  const g=new FireGame();g.child={...layout.stations[0].boarding,angle:0};assert(g.rideSubway('central','zoo'));const passed=[];
  for(let i=0;i<3000&&g.transit.metro.phase!=='idle';i++){g.update(1/30);const m=g.transit.metro;if(m.phase==='passing'){assert(g.riding);const id=m.route[m.leg+1];if(passed.at(-1)!==id)passed.push(id)}}
  assert.deepEqual(passed,['airport','riverside']);assert.equal(g.transit.metro.phase,'idle');assert(!g.riding);
});
