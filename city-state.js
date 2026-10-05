import layout from './city-layout.js';
import {noticeVoice} from './city-voice.js';
import {walkable,SERVICES} from './navigation.js';
import {trafficRoutes,bridgeRoute,TRAFFIC_COUNT} from './road-layout.js';
import {createZooAnimals,updateZooAnimals} from './zoo-wildlife.js';
const overpass=bridgeRoute();
const reverseOverpass=[...overpass].reverse();
const smooth=t=>t*t*(3-2*t);

export function routeLength(route,closed=true){let n=0;for(let i=1;i<route.length+(closed?1:0);i++){const a=route[i-1],b=route[i%route.length];n+=Math.hypot(b[0]-a[0],b[1]-a[1],(b[2]??0)-(a[2]??0))}return n}
export function routePoint(route,distance,closed=true){
  const total=routeLength(route,closed);let d=closed?((distance%total)+total)%total:Math.min(total,Math.max(0,distance));
  for(let i=1;i<route.length+(closed?1:0);i++){
    const a=route[i-1],b=route[i%route.length],len=Math.hypot(b[0]-a[0],b[1]-a[1],(b[2]??0)-(a[2]??0));
    if(d<=len||i===route.length-1&&!closed){const t=len?d/len:0;return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,height:(a[2]??0)+((b[2]??0)-(a[2]??0))*t,angle:Math.atan2(b[0]-a[0],b[1]-a[1])}}d-=len;
  }
  return {x:route[0][0],z:route[0][1],height:route[0][2]??0,angle:0};
}
export const cityActions={
  resetCity(){
    this.city={time:0,notice:'',noticeTime:0,chase:null,chaseTimer:0,caught:0,viewing:null,animalSoundRequest:0,animals:createZooAnimals(),
      traffic:Array.from({length:TRAFFIC_COUNT},(_,i)=>{const route=i%trafficRoutes.length,distance=Math.floor(i/trafficRoutes.length)*routeLength(trafficRoutes[route],route<3)/3;return {route,distance,car:routePoint(trafficRoutes[route],distance,route<3),moving:true}}),
      people:layout.walkRoutes.map((route,i)=>({route:i,distance:i*4,car:routePoint(route,i*4),moving:true})),
      thieves:layout.thiefRoutes.map((route,i)=>({id:i,distance:0,car:routePoint(route,0),phase:'wandering',cooldown:0,seen:false})),
      custody:{phase:'idle',thief:null,time:0,delivered:0},
      bridge:{phase:'idle',distance:0},
      helicopter:{phase:'idle',time:0,car:{x:0,z:0,height:28,angle:0}},
      plane:{car:{...layout.airport.home,height:0,angle:Math.PI},phase:'parked',distance:0}};
  },
  callHelicopter(destination){
    const h=this.city.helicopter;
    if(h.phase!=='idle')return true;
    if(this.drivingTrain||this.drivingPlane||this.activityLocked||['loading','unloading'].includes(this.mode))return false;
    if(!Number.isFinite(destination.x)||!Number.isFinite(destination.z)||!walkable(destination.x,destination.z,{radius:.5}))return false;
    if(this.riding&&!this.exitTruck())return false;
    this.cancelAdventure();
    for(const trip of Object.values(this.transit))if(trip.phase==='approach')trip.phase='idle';
    if(this.play.phase==='approach')this.play.phase='idle';
    h.destination={x:destination.x,z:destination.z};h.name=destination.name??'목적지';h.phase='waiting';h.time=0;
    this.city.chase=null;this.city.bridge.phase='idle';
    this.cityNotice('헬기가 데리러 와요!');return true;
  },
  startBridgeTour(){
    if(this.activityLocked||this.drivingPlane||this.drivingTrain)return false;
    const {entry,exit}=layout.bridge;
    const reverse=Math.hypot(this.actor.x-exit.x,this.actor.z-exit.z)<Math.hypot(this.actor.x-entry.x,this.actor.z-entry.z);
    if(!this.moveTo(reverse?exit:entry))return false;
    this.city.bridge.reverse=reverse;
    this.city.bridge.phase='approach';this.cityNotice('고가도로 입구로 가요 · 곡선 다리를 건너요');return true;
  },
  updateHelicopter(dt){
    const h=this.city.helicopter;if(h.phase==='idle')return;
    if(h.phase==='waiting'){
      if(this.riding)return;
      this.path=[];this.target=null;this.boarding=false;this.boardingStage=null;this.fireMission=false;this.homeMission=false;
      this.busRequest=null;this.serviceRequest=null;this.iceMission=false;this.fishingMission=false;this.dumpMission=null;
      if(this.truckPhase==='waiting')this.returnTruck();
      h.from={x:this.child.x,z:this.child.z};h.car={...h.from,height:24,angle:Math.atan2(h.destination.x-h.from.x,h.destination.z-h.from.z)};
      h.phase='descending';h.time=0;this.mode='helicopter';this.changed('helicopter');
    }
    h.time+=dt;
    const durations={descending:1.8,boarding:.55,ascending:1.25,cruising:Math.max(1.4,Math.hypot(h.destination.x-h.from.x,h.destination.z-h.from.z)/45),landing:1.5,disembarking:.45,departing:1.8};
    const t=smooth(Math.min(1,h.time/durations[h.phase]));
    if(h.phase==='descending')h.car.height=24*(1-t);
    if(h.phase==='ascending')h.car.height=26*t;
    if(h.phase==='cruising'){h.car.x=h.from.x+(h.destination.x-h.from.x)*t;h.car.z=h.from.z+(h.destination.z-h.from.z)*t;h.car.height=26+Math.sin(t*Math.PI)*4}
    if(h.phase==='landing')h.car.height=26*(1-t);
    if(h.phase==='departing')h.car.height=28*t;
    if(h.time<durations[h.phase])return;
    h.time=0;
    if(h.phase==='descending')h.phase='boarding';
    else if(h.phase==='boarding'){this.riding=true;this.vehicle='helicopter';h.phase='ascending';this.cityNotice('슝! '+h.name+'으로 날아가요')}
    else if(h.phase==='ascending')h.phase='cruising';
    else if(h.phase==='cruising'){h.car.x=h.destination.x;h.car.z=h.destination.z;h.phase='landing'}
    else if(h.phase==='landing')h.phase='disembarking';
    else if(h.phase==='disembarking'){
      // Recheck the landing area against vehicles that moved during the flight.
      const candidates=[h.destination];
      for(const r of [2,3.5,5])for(let i=0;i<16;i++)candidates.push({x:h.destination.x+Math.cos(i*Math.PI/8)*r,z:h.destination.z+Math.sin(i*Math.PI/8)*r});
      const spot=candidates.find(p=>walkable(p.x,p.z,{radius:.32,vehicles:this.otherVehicles(null)}));
      if(!spot){h.time=0;return}
      this.child={...spot,angle:h.car.angle};this.riding=false;this.vehicle=null;this.mode='idle';h.phase='departing';this.cityNotice(h.name+' 도착!');
    }else h.phase='idle';
  },
  cityNotice(text){this.city.notice=text;this.city.speech=noticeVoice(text);this.city.noticeTime=6;this.changed('city-notice')},
  boardPlane(){
    if(this.drivingPlane)return true;
    if(this.riding||this.activityLocked)return false;
    if(this.boardingStage==='plane-door')return true;
    if(!this.moveTo(layout.airport.boarding))return false;
    this.boarding=true;this.boardingStage='plane-door';this.cityNotice('공항으로 걸어가요 · 비행기 탑승');return true;
  },
  enterPlane(){
    this.riding=true;this.vehicle='plane';this.boarding=false;this.boardingStage=null;this.target=null;this.path=[];this.mode='flying';
    this.city.plane.phase='flying';this.city.plane.distance=0;this.cityNotice('도시 하늘 여행 · 공항에 돌아오면 내려요');
  },
  visitZoo(id){
    const animal=layout.zoo.animals.find(a=>a.id===id);
    if(id!==undefined&&!animal)return false;
    if(this.riding){this.cityNotice('동물 친구는 차에서 내려서 만나러 가요');return false}
    if(!this.moveTo(animal?.view??layout.zoo.entrance))return false;
    this.city.viewing=animal?.id??null;
    if(animal)this.city.animalSoundRequest++;
    this.cityNotice(animal?`${animal.name} 만나러 가요`:'동물원으로 가요 · 동물을 눌러 가까이 가세요');return true;
  },
  chaseThief(id){
    if(this.activityLocked)return false;
    const thief=this.city.thieves[id];if(!thief||thief.phase==='caught')return false;
    if(this.vehicle!=='police'){this.cityNotice('경찰차를 타고 도둑을 따라가요');return false}
    this.city.chase=id;this.city.chaseTimer=1;thief.phase='fleeing';this.cityNotice('도둑을 따라가요! 가까이 가면 잡을 수 있어요');return true;
  },
  updateCity(dt){
    const city=this.city;city.time+=dt;
    updateZooAnimals(city.animals,dt);
    this.updateHelicopter(dt);
    if(city.bridge.phase==='approach'&&this.mode==='idle'){
      city.bridge.phase='crossing';city.bridge.distance=0;this.mode='bridge';this.path=[];this.target=null;this.changed('bridge');
    }
    if(this.crossingBridge){
      city.bridge.distance+=dt*(this.riding?7:4.5);Object.assign(this.actor,routePoint(city.bridge.reverse?reverseOverpass:overpass,city.bridge.distance,false));
      if(city.bridge.distance>=routeLength(overpass,false)){this.actor.height=0;city.bridge.phase='idle';this.mode='idle';this.cityNotice('고가도로를 건넜어요!')}
    }
    if(city.noticeTime>0){city.noticeTime-=dt;if(city.noticeTime<=0){city.notice='';city.speech=null;this.changed('city-notice')}}
    const actor=this.actor;
    if(city.viewing&&!this.riding&&this.mode==='idle'){
      const animal=city.animals.find(a=>a.id===city.viewing);
      if(animal&&Math.hypot(actor.x-animal.view.x,actor.z-animal.view.z)<1)actor.angle=Math.atan2(animal.x-actor.x,animal.z-actor.z);
    }
    for(const traffic of city.traffic){
      const route=trafficRoutes[traffic.route],closed=traffic.route<3,total=routeLength(route,false);
      // Bridge traffic reverses at its approaches; it never cuts across the empty space below.
      const travel=traffic.distance+dt*5.1,leg=travel%(total*2),reverse=!closed&&leg>total;
      const next=routePoint(route,closed?travel:(reverse?total*2-leg:leg),closed);if(reverse)next.angle+=Math.PI;
      if(!closed){const lane=1.55*Math.min(1,Math.min(leg,total*2-leg,Math.abs(leg-total))/3);next.x+=Math.cos(next.angle)*lane;next.z-=Math.sin(next.angle)*lane}
      const separation=Math.hypot(next.x-actor.x,next.z-actor.z);
      traffic.moving=Math.abs((next.height??0)-(actor.height??0))>3||separation>(this.riding?6:3);
      if(traffic.moving){traffic.distance+=dt*5.1;Object.assign(traffic.car,next)}
    }
    for(const person of city.people){
      const route=layout.walkRoutes[person.route],next=routePoint(route,person.distance+dt*1.15);
      person.moving=Math.hypot(next.x-actor.x,next.z-actor.z)>2&&walkable(next.x,next.z,{radius:.2});
      if(person.moving){person.distance+=dt*1.15;Object.assign(person.car,next)}
    }
    for(const thief of city.thieves){
      if(['boarding','aboard','unloading'].includes(thief.phase))continue;
      if(thief.phase==='caught'){thief.cooldown-=dt;if(thief.cooldown<=0){thief.phase='wandering';thief.seen=false}continue}
      const near=Math.hypot(thief.car.x-actor.x,thief.car.z-actor.z);
      if(this.vehicle==='police'&&near<23&&!thief.seen){thief.seen=true;thief.phase='fleeing';this.cityNotice('도둑 발견! 줄무늬 옷의 도둑을 눌러 따라가요')}
      thief.distance+=dt*(thief.phase==='fleeing'?2.1:.7);Object.assign(thief.car,routePoint(layout.thiefRoutes[thief.id],thief.distance));
      if(city.chase===thief.id&&this.vehicle==='police'&&near<3.7){
        thief.phase='boarding';Object.assign(city.custody,{phase:'boarding',thief:thief.id,time:0});city.caught++;city.chase=null;this.path=[];this.target=null;this.mode='thief-boarding';this.cityNotice('잡았다! 경찰차에 타요.');
        this.changed('thief-caught');
      }
    }
    const custody=city.custody;
    if(custody.phase!=='idle'){
      custody.time+=dt;const thief=city.thieves[custody.thief];
      if(custody.phase==='boarding'&&custody.time>=2.2){custody.phase='transporting';thief.phase='aboard';this.mode='idle';this.cityNotice('경찰서까지 안내선을 따라 운전해요.')}
      else if(custody.phase==='transporting'&&Math.hypot(actor.x-SERVICES.police.home.x,actor.z-SERVICES.police.home.z)<2.5){custody.phase='unloading';custody.time=0;thief.phase='unloading';this.path=[];this.target=null;this.mode='thief-unloading';this.changed('thief-unloading')}
      else if(custody.phase==='unloading'&&custody.time>=2.5){custody.phase='idle';custody.delivered++;thief.phase='caught';thief.cooldown=90;this.mode='idle';this.cityNotice('경찰서 도착! 함께 마을을 지켰어요.');this.changed('thief-delivered')}
    }
    if(city.chase!==null){
      if(this.vehicle!=='police')city.chase=null;
      else{city.chaseTimer+=dt;if(city.chaseTimer>=1){city.chaseTimer=0;const p=city.thieves[city.chase].car;this.routeTo({x:p.x,z:p.z})}}
    }
    const plane=city.plane;
    if(plane.phase==='flying'){
      plane.distance+=dt*(plane.distance<35?10:23);Object.assign(plane.car,routePoint(layout.airport.flight,plane.distance,false));
      if(plane.distance>=routeLength(layout.airport.flight,false)){
        plane.phase='parked';plane.car={...layout.airport.home,height:0,angle:Math.PI};this.riding=false;this.vehicle=null;this.child={...layout.airport.exit,angle:0};this.mode='idle';this.cityNotice('공항에 도착했어요!');
      }
    }
  },
};
