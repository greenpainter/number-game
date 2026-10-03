import layout from './waterfront-layout.js';
import {riverX,riverHeight} from './river-geometry.js';
import {walkable} from './navigation.js';
import {METRO_STAIRS,METRO_PLATFORM,METRO_BOARD,METRO_TRAIN_Z,metroPathPoint,pathLength} from './metro-path.js';
import {nextMetroStation,metroStopsBetween} from './metro-loop.js';
const ease=t=>t*t*(3-2*t);
export const transitActions={
  resetTransit(){this.transit={metro:{phase:'idle',time:0,speed:0,car:{x:0,z:0,height:-12,angle:0}},ferry:{phase:'idle',time:0,car:{...layout.dock.boat,height:0,angle:Math.PI}}}},
  rideSubway(stationId,destinationId=nextMetroStation(stationId)){
    const from=layout.stations.find(s=>s.id===stationId),to=layout.stations.find(s=>s.id===destinationId);
    if(!from||!to||from===to||this.riding||this.activityLocked)return false;
    if(!this.moveTo(from.boarding))return false;
    Object.assign(this.transit.metro,{phase:'approach',time:0,speed:0,from:from.id,to:to.id,route:metroStopsBetween(from.id,to.id),leg:0});
    this.cityNotice('지하철 입구로 걸어가요.');return true;
  },
  boardFerry(){
    if(this.riding||this.activityLocked)return false;
    if(!this.moveTo(layout.dock.boarding))return false;
    this.transit.ferry.phase='approach';this.transit.ferry.time=0;this.cityNotice('선착장으로 유람선을 타러 가요.');return true;
  },
  updateTransit(dt){
    const m=this.transit.metro,f=this.transit.ferry;
    if(m.phase==='approach'&&this.mode==='idle'){
      const from=layout.stations.find(s=>s.id===m.from);
      m.car={x:from.x+2,z:from.z+METRO_TRAIN_Z,height:-12,angle:0};m.scene={x:from.x,z:from.z};
      m.phase='descending';m.time=0;m.walking=true;m.doors=0;this.mode='metro';this.path=[];this.target=null;
      this.cityNotice('계단을 내려가 지하 승강장으로 가요.');
    }
    if(this.metroTrip){
      const from=layout.stations.find(s=>s.id===m.from),to=layout.stations.find(s=>s.id===m.to);
      const legFrom=layout.stations.find(s=>s.id===m.route[m.leg]),legTo=layout.stations.find(s=>s.id===m.route[m.leg+1]);
      const distance=Math.hypot(legTo.x-legFrom.x,legTo.z-legFrom.z);
      const stairTime=pathLength(METRO_STAIRS)/2.5,platformTime=pathLength(METRO_PLATFORM)/2.1;
      const duration={descending:stairTime,platform:platformTime,waiting:1.3,boarding:1.8,closing:1.2,running:Math.max(6,distance/24),passing:1.4,arriving:1.5,alighting:1.8,returning:platformTime,ascending:stairTime,exiting:1.2}[m.phase];
      m.time+=dt;const t=Math.min(1,m.time/duration),smooth=ease(t);
      m.walking=['descending','platform','boarding','alighting','returning','ascending','exiting'].includes(m.phase);
      const paths={descending:METRO_STAIRS,platform:METRO_PLATFORM,boarding:METRO_BOARD,alighting:METRO_BOARD.toReversed(),returning:METRO_PLATFORM.toReversed(),ascending:METRO_STAIRS.toReversed()};
      if(paths[m.phase])Object.assign(this.child,metroPathPoint(paths[m.phase],t,['alighting','returning','ascending'].includes(m.phase)?to:from));
      if(m.phase==='exiting'){const start=to.boarding;this.child.x=start.x+(m.exit.x-start.x)*smooth;this.child.z=start.z+(m.exit.z-start.z)*smooth;this.child.height=0;this.child.angle=Math.atan2(m.exit.x-start.x,m.exit.z-start.z)}
      m.doors=['waiting','boarding','alighting','returning','ascending','exiting'].includes(m.phase)?1:m.phase==='closing'?1-t:m.phase==='arriving'?t:0;
      if(m.phase==='running'){m.car.x=legFrom.x+2+(legTo.x-legFrom.x)*smooth;m.car.z=legFrom.z+METRO_TRAIN_Z+(legTo.z-legFrom.z)*smooth;m.scene={x:m.car.x-2,z:m.car.z-METRO_TRAIN_Z};m.speed=distance/duration*6*t*(1-t)}
      if(t===1){
        m.time=0;
        const next={descending:'platform',platform:'waiting',waiting:'boarding',boarding:'closing',closing:'running',running:'arriving',arriving:'alighting',alighting:'returning',returning:'ascending',ascending:'exiting',exiting:'idle'};
        if(m.phase==='ascending'){
          const candidates=[to.exit,to.boarding,{x:to.exit.x+3,z:to.exit.z}];
          m.exit=candidates.find(p=>walkable(p.x,p.z,{radius:.32,vehicles:this.otherVehicles(null)}));
          if(!m.exit){m.time=duration;return}
        }
        if(m.phase==='running'&&m.leg<m.route.length-2){m.phase='passing';m.speed=0;this.cityNotice(legTo.name+'에 도착했어요.')}
        else if(m.phase==='passing'){m.leg++;m.phase='running'}
        else m.phase=next[m.phase];
        if(m.phase==='waiting')this.cityNotice('지하철 문이 열렸어요. 타 볼까요?');
        if(m.phase==='closing'){this.riding=true;this.vehicle='metro';m.walking=false}
        if(m.phase==='running'){const nextStop=layout.stations.find(s=>s.id===m.route[m.leg+1]);this.cityNotice('문이 닫힙니다. 다음 역은 '+nextStop.name+'입니다.');this.changed('metro-depart')}
        if(m.phase==='arriving'){m.speed=0;m.scene={x:to.x,z:to.z};this.cityNotice(to.name+'에 도착했어요.');this.changed('metro-arrive')}
        if(m.phase==='alighting'){this.riding=false;this.vehicle=null;Object.assign(this.child,metroPathPoint(METRO_BOARD,1,to))}
        if(m.phase==='idle'){m.walking=false;this.child.height=0;this.mode='idle';this.cityNotice('지상에 도착했어요. 새 동네를 둘러봐요!')}
      }
    }
    if(f.phase==='approach'&&this.mode==='idle'){f.phase='boarding';f.time=0;this.mode='ferry';this.path=[];this.target=null;this.cityNotice('유람선에 탔어요. 강을 따라 여행해요!');this.riding=true;this.vehicle='ferry'}
    if(this.ferryTrip){
      f.time+=dt;
      if(f.phase==='boarding'&&f.time>=1.7){f.phase='cruising';f.time=0}
      if(f.phase==='cruising'){
        const t=Math.min(1,f.time/24),z=65-112*Math.sin(t*Math.PI)**2,x=riverX(z)+3;
        const dz=-112*Math.sin(2*t*Math.PI)*Math.PI/24;f.car={x,z,height:Math.sin(f.time*2)*.055,angle:Math.atan2((riverX(z+.1)-riverX(z-.1))/.2*dz,dz)};
        if(t===1){f.phase='arriving';f.time=0;f.car={...layout.dock.boat,height:0,angle:Math.PI};this.cityNotice('선착장에 도착했어요. 조심히 내려요.')}
      }
      if(f.phase==='arriving'&&f.time>=1.8){
        const spot=[layout.dock.boarding,{x:layout.dock.boarding.x+3,z:65}].find(p=>walkable(p.x,p.z,{radius:.32,vehicles:this.otherVehicles(null)}));
        if(!spot)return;
        f.phase='idle';this.riding=false;this.vehicle=null;this.child={...spot,angle:0,height:0};this.mode='idle';this.changed('ferry-exit');
      }
    }
    const actors=[this.truck,this.dump,...Object.values(this.services).map(s=>s.car),...this.buses.map(b=>b.car)];
    if(!this.metroTrip&&!this.ferryTrip&&!this.helicopterTrip)actors.push(this.child);
    for(const actor of actors){
      if(this.crossingBridge&&actor===this.actor)continue;
      const height=riverHeight(actor.x,actor.z);if(height||'height' in actor)actor.height=height;
    }
  },
};
