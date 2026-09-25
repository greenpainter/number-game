import {HOME,CHILD_START,FIRE,FIRE_STOP,findPath,walkable,truckContains,DUMP_HOME,LOAD_STOP,UNLOAD_STOP} from './navigation.js';

import {busActions} from './bus-state.js';
import {serviceActions} from './service-state.js';
import {railwayActions} from './railway-state.js';
import {petActions} from './pets-state.js';

export const GARAGE={x:-7,z:-5.4};
export const WAITING={x:-9.25,z:2.8};
export const MOVEMENT_SPEED=1.2;
const approach=(value,target,step)=>value<target?Math.min(target,value+step):Math.max(target,value-step);
function distanceToRoute(p,route){
  let distance=Infinity;
  for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
    distance=Math.min(distance,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));
  }
  return distance;
}
function travel(actor,path,distance,dt,reverse=false){
  while(distance>0&&path.length){
    const next=path[0],dx=next.x-actor.x,dz=next.z-actor.z,len=Math.hypot(dx,dz);
    if(len>.001){const target=Math.atan2(dx,dz)+(reverse?Math.PI:0),delta=Math.atan2(Math.sin(target-actor.angle),Math.cos(target-actor.angle));actor.angle+=delta*Math.min(1,dt*14)}
    if(len<=distance){actor.x=next.x;actor.z=next.z;path.shift();distance-=len}
    else{actor.x+=dx/len*distance;actor.z+=dz/len*distance;distance=0}
  }
}
export class FireGame {
  constructor(onChange=()=>{}){this.onChange=onChange;this.reset(false)}
  get actor(){return this.drivingTrain?this.train.car:this.riding?(this.drivingBus?.car??this.services[this.vehicle]?.car??(this.vehicle==='dumptruck'?this.dump:this.truck)):this.child}
  get drivingTrain(){return this.riding&&this.vehicle==='train'}
  get drivingBus(){return this.riding?this.buses.find(b=>b.id===this.vehicle):null}
  get drivingFire(){return this.riding&&this.vehicle==='firetruck'}
  get drivingDump(){return this.riding&&this.vehicle==='dumptruck'}
  get options(){
    const vehicles=[];
    if(this.dump&&!this.drivingDump)vehicles.push(this.dump);
    if(!this.drivingFire&&this.truckPhase!=='parked')vehicles.push(this.truck);
    for(const [id,s] of Object.entries(this.services??{}))if(id!==this.vehicle&&s.phase!=='parked')vehicles.push(s.car);
    for(const b of this.buses??[])if(b.id!==this.vehicle)vehicles.push(b.car);
    return {radius:this.riding?(this.drivingBus?2.7:this.drivingDump?1.1:this.services[this.vehicle]?1:.86):.32,vehicles};
  }
  get truckMoving(){return ['outgoing','returning','entering'].includes(this.truckPhase)||(this.drivingFire&&this.mode==='moving')}
  changed(reason){this.onChange(reason)}
  phase(value){this.truckPhase=value;this.changed('garage')}
  reset(notify=true){
    this.child={...CHILD_START,angle:Math.PI};this.truck={...GARAGE,angle:0};
    this.riding=false;this.vehicle=null;this.mode='idle';this.boarding=false;this.fireMission=false;this.homeMission=false;
    this.hp=100;this.fireActive=false;this.complete=false;this.path=[];this.target=null;this.truckPath=[];
    this.truckPhase='parked';this.door=0;this.boardingStage=null;
    this.dump={...DUMP_HOME,angle:0,halfWidth:1.04,halfLength:2.22};this.dumpPhase='parked';this.dumpPath=[];this.dumpMission=null;this.cargo=0;this.delivered=0;this.workTime=0;this.loadStart=0;this.unloadCommitted=false;
    this.resetBuses();this.resetServices();this.resetRailway();this.resetPets();this.fishingMission=false;this.fishTime=0;this.fishCaught=0;if(notify)this.changed('reset');
  }
  routeTo(target,{boarding=false,fireMission=false,homeMission=false}={}){
    if(this.drivingTrain)return false;
    const path=findPath(this.actor,target,this.options);if(!path)return false;
    this.path=path;this.target={...target};this.boarding=boarding;this.fireMission=fireMission;this.homeMission=homeMission;
    this.mode='moving';this.changed('move');return true;
  }
  moveTo(target){
    if(this.drivingTrain)return true; // The train follows its rails even when the floor is tapped.
    if(['loading','unloading','eating','fishing','fish-celebrate','pulling-over'].includes(this.mode))return false;
    if(!this.routeTo(target))return false;
    this.boardingStage=null;this.dumpMission=null;this.busRequest=null;this.serviceRequest=null;this.iceMission=false;this.fishingMission=false;
    if(this.truckPhase==='waiting')this.returnTruck();
    return true;
  }
  moveNear(target){
    if(!Number.isFinite(target.x)||!Number.isFinite(target.z))return false;
    if(this.target&&Math.hypot(target.x-this.target.x,target.z-this.target.z)<.45&&!this.boarding)return true;
    if(this.moveTo(target))return true;
    const candidates=[];
    for(const r of [.6,1.2,1.8,2.4,3.2])for(let i=0;i<12;i++){
      const a=i*Math.PI/6,p={x:target.x+Math.cos(a)*r,z:target.z+Math.sin(a)*r};
      if(walkable(p.x,p.z,this.options))candidates.push({...p,score:r+Math.hypot(p.x-this.actor.x,p.z-this.actor.z)*.04});
    }
    candidates.sort((a,b)=>a.score-b.score);
    for(const p of candidates.slice(0,6))if(this.moveTo({x:p.x,z:p.z}))return true;
    return false;
  }
  get activityLocked(){return ['eating','fishing','fish-celebrate','pulling-over'].includes(this.mode)}
  startFishing(){
    if(this.riding||this.activityLocked)return false;
    if(this.fishingMission)return true;
    if(!this.routeTo({x:12,z:-11.1}))return false;
    this.boardingStage=null;this.boarding=false;this.busRequest=null;this.serviceRequest=null;this.iceMission=false;this.fishingMission=true;
    if(this.truckPhase==='waiting')this.returnTruck();this.changed('fish-walk');return true;
  }
  boardingSpots(){
    const c=Math.cos(this.truck.angle),s=Math.sin(this.truck.angle),spots=[];
    for(const [x,z] of [[-1.65,.65],[1.65,.65],[-2.1,0],[2.1,0],[0,-2.3],[0,2.3]]){
      const p={x:this.truck.x+x*c+z*s,z:this.truck.z-x*s+z*c};
      if(walkable(p.x,p.z,{radius:.32,truck:this.truck}))spots.push(p);
    }
    return spots;
  }
  boardTruck(){
    if(this.riding||this.activityLocked)return false;
    if(!this.routeTo(WAITING,{boarding:true}))return false;
    this.boardingStage='waiting';this.busRequest=null;this.serviceRequest=null;this.iceMission=false;this.fishingMission=false;
    if(this.truckPhase==='parked')this.phase('opening');
    return true;
  }
  returnTruck(){
    const path=findPath(this.truck,HOME,{vehicles:this.otherVehicles('firetruck')});if(!path)return false;
    this.truckPath=path;this.phase('returning');return true;
  }
  exitTruck(){
    if(this.drivingTrain)return this.exitTrain();
    if(this.drivingBus)return this.exitBus();
    if(this.services[this.vehicle])return this.exitService();
    if(this.drivingDump)return this.exitDump();
    if(!this.riding)return false;
    const route=findPath(this.truck,HOME,{vehicles:this.otherVehicles('firetruck')});if(!route)return false;
    const candidates=[];
    for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,p={x:this.truck.x+Math.cos(angle)*2.65,z:this.truck.z+Math.sin(angle)*2.65};
      if(walkable(p.x,p.z,{radius:.32,truck:this.truck})&&findPath(p,WAITING,{radius:.32,truck:this.truck}))candidates.push(p);
    }
    candidates.sort((a,b)=>distanceToRoute(b,[this.truck,...route])-distanceToRoute(a,[this.truck,...route]));
    const spot=candidates[0];if(!spot)return false;
    this.child={...spot,angle:this.truck.angle};this.riding=false;this.vehicle=null;this.mode='idle';
    this.path=[];this.target=null;this.boarding=false;this.boardingStage=null;this.fireMission=false;this.homeMission=false;
    this.returnTruck();this.changed('exit');return true;
  }
  dispatch(){
    if(!this.drivingFire||!this.fireActive||this.complete)return false;
    return this.routeTo(FIRE_STOP,{fireMission:true});
  }
  goHome(){if(this.riding&&!this.drivingFire)return false;return this.riding?this.routeTo(HOME,{homeMission:true}):this.boardTruck()}
  updateGarage(dt){
    const open=['opening','outgoing','openingReturn','entering'].includes(this.truckPhase);
    this.door=approach(this.door,open?1:0,dt*1.1);
    if(this.truckPhase==='opening'&&this.door===1){this.truckPath=[{...HOME}];this.phase('outgoing')}
    else if(this.truckPhase==='openingReturn'&&this.door===1){this.truck.angle=0;this.truckPath=[{...GARAGE}];this.phase('entering')}
    if(this.truckMoving&&!this.drivingFire){
      // Pause an unattended truck if a pedestrian is immediately in its path.
      const next={...this.truck},path=this.truckPath.map(p=>({...p}));
      travel(next,path,dt*3.1*MOVEMENT_SPEED,dt,this.truckPhase==='entering');
      if(this.riding||!truckContains(this.child.x,this.child.z,next,.38)){
        Object.assign(this.truck,next);this.truckPath=path;
      }
      if(!this.truckPath.length){
        if(this.truckPhase==='outgoing'){this.truck.angle=0;this.phase('waiting');if(!this.boarding||!['waiting','door'].includes(this.boardingStage))this.returnTruck()}
        else if(this.truckPhase==='returning')this.phase('openingReturn');
        else if(this.truckPhase==='entering')this.phase('closing');
      }
    }
    if(this.truckPhase==='closing'&&this.door===0){this.truck.angle=0;this.phase('parked');if(this.boarding&&['waiting','door'].includes(this.boardingStage))this.phase('opening')}
    if(this.boarding&&this.boardingStage==='waiting'&&this.mode==='idle'&&this.truckPhase==='waiting'){
      for(const spot of this.boardingSpots()){
        if(this.routeTo(spot,{boarding:true})){this.boardingStage='door';break}
      }
    }
  }
  update(dt){
    this.updateGarage(dt);this.updateDump(dt);this.updateServices(dt,travel);this.updateBuses(dt,travel);this.updateRailway(dt);this.updatePets(dt,travel);
    if(this.mode==='moving'){
      // Replan when the returning truck crosses a walking route.
      if(!this.riding&&this.path.length&&!walkable(this.path[0].x,this.path[0].z,this.options)){
        const route=findPath(this.child,this.target,this.options);if(route)this.path=route;else return;
      }
      if(!this.riding){
        const next={...this.child},path=this.path.map(p=>({...p}));travel(next,path,dt*2.65*MOVEMENT_SPEED,dt);
        if(!walkable(next.x,next.z,this.options)){
          const route=findPath(this.child,this.target,this.options);if(route)this.path=route;return;
        }
        Object.assign(this.child,next);this.path=path;
      }else travel(this.actor,this.path,dt*(this.drivingBus?4.6:this.drivingDump?4.8:3.5)*MOVEMENT_SPEED,dt);
      if(!this.path.length){
        if(this.boardingStage==='train-door'){
          this.enterTrain();
        }else if(this.boarding&&this.boardingStage==='door'&&this.truckPhase==='waiting'){
          this.riding=true;this.vehicle='firetruck';this.boarding=false;this.boardingStage=null;this.mode='idle';this.target=null;this.truckPhase='occupied';
          const firstFire=!this.fireActive;
          if(firstFire){this.fireActive=true;this.complete=false;this.hp=100}
          this.changed(firstFire?'fire-start':'board');
         }else if(this.boardingStage==='service-door'&&this.services[this.serviceRequest]?.phase==='waiting'){
          this.riding=true;this.vehicle=this.serviceRequest;this.services[this.vehicle].phase='occupied';this.serviceRequest=null;this.boarding=false;this.boardingStage=null;this.mode='idle';this.target=null;this.changed('service-board');
        }else if(this.boardingStage==='bus-door'&&this.busRequest!==null){
          const bus=this.buses[this.busRequest];this.riding=true;this.vehicle=bus.id;bus.phase='occupied';this.busRequest=null;this.boarding=false;this.boardingStage=null;this.mode='idle';this.target=null;this.changed('bus-board');
        }else if(this.fishingMission){
          this.fishingMission=false;this.fishTime=0;this.mode='fishing';this.target=null;this.child.angle=0;this.changed('fishing');
        }else if(this.iceMission){
          this.iceMission=false;this.eatTime=0;this.mode='eating';this.target=null;this.child.angle=Math.PI/4;this.changed('ice-eat');
        }else if(this.boardingStage==='dump-door'){
          this.riding=true;this.vehicle='dumptruck';this.boarding=false;this.boardingStage=null;this.mode='idle';this.target=null;this.dumpPhase='occupied';this.changed('dump-board');
        }else if(this.drivingDump&&this.dumpMission){
          this.mode=this.dumpMission==='load'?'loading':'unloading';this.dump.angle=0;this.workTime=0;this.loadStart=this.cargo;this.unloadCommitted=false;this.target=null;this.changed(this.mode);
        }else{
          this.mode=this.riding&&this.fireMission&&!this.complete&&Math.hypot(this.actor.x-FIRE.x,this.actor.z-FIRE.z)<5?'extinguishing':'idle';this.target=null;this.changed('arrive');
          if(this.riding&&this.homeMission)this.exitTruck();
        }
      }
    }
    if(this.mode==='extinguishing'&&this.drivingFire){
      const target=Math.atan2(FIRE.x-this.truck.x,FIRE.z-this.truck.z),delta=Math.atan2(Math.sin(target-this.truck.angle),Math.cos(target-this.truck.angle));
      this.truck.angle+=delta*Math.min(1,dt*5);this.hp=Math.max(0,this.hp-dt*14);
      if(this.hp===0){this.complete=true;this.fireActive=false;this.fireMission=false;this.mode='idle';this.changed('win')}
    }
    if(this.mode==='fishing'||this.mode==='fish-celebrate'){
      this.fishTime+=dt;
      if(this.mode==='fishing'&&this.fishTime>=3.5){this.mode='fish-celebrate';this.fishTime=0;this.fishCaught++;this.child.angle=Math.PI/4;this.changed('fish-caught')}
      else if(this.mode==='fish-celebrate'&&this.fishTime>=3){this.mode='idle';this.changed('fish-done')}
    }
  }
  boardDump(){
    if(this.riding||this.activityLocked||this.dumpPhase==='returning')return false;
    const spots=[];
    for(const dx of [-1.65,1.65,-2.5,2.5])spots.push({x:this.dump.x+dx*Math.cos(this.dump.angle)+1.15*Math.sin(this.dump.angle),z:this.dump.z-dx*Math.sin(this.dump.angle)+1.15*Math.cos(this.dump.angle)});
    spots.sort((a,b)=>Math.hypot(a.x-this.child.x,a.z-this.child.z)-Math.hypot(b.x-this.child.x,b.z-this.child.z));
    for(const p of spots)if(this.routeTo(p,{boarding:true})){this.boardingStage='dump-door';this.busRequest=null;this.dumpMission=null;this.serviceRequest=null;this.iceMission=false;this.fishingMission=false;if(this.truckPhase==='waiting')this.returnTruck();this.changed('dump-walk');return true}
    return false;
  }
  loadDump(){
    if(!this.drivingDump||this.cargo>=3||['loading','unloading'].includes(this.mode))return false;
    if(!this.routeTo(LOAD_STOP))return false;
    this.dumpMission='load';this.changed('dump-dispatch');return true;
  }
  unloadDump(){
    if(!this.drivingDump||this.cargo===0||['loading','unloading'].includes(this.mode))return false;
    if(!this.routeTo(UNLOAD_STOP))return false;
    this.dumpMission='unload';this.changed('dump-deliver');return true;
  }
  exitDump(){
    const route=findPath(this.dump,DUMP_HOME,{radius:1.1,vehicles:this.otherVehicles('dumptruck')});if(!route)return false;
    const candidates=[];
    for(let i=0;i<24;i++){
      const angle=i*Math.PI/12,p={x:this.dump.x+Math.cos(angle)*3.35,z:this.dump.z+Math.sin(angle)*3.35};
      if(walkable(p.x,p.z,{radius:.32,vehicles:[this.dump,this.truck]})&&findPath(p,{x:DUMP_HOME.x-3.5,z:DUMP_HOME.z},{radius:.32,vehicles:[this.dump,this.truck]}))candidates.push(p);
    }
    candidates.sort((a,b)=>distanceToRoute(b,[this.dump,...route])-distanceToRoute(a,[this.dump,...route]));
    if(!candidates.length)return false;
    this.child={...candidates[0],angle:this.dump.angle};this.riding=false;this.vehicle=null;this.mode='idle';this.path=[];this.target=null;this.boarding=false;this.boardingStage=null;this.dumpMission=null;this.workTime=0;
    this.dumpPath=route;this.dumpPhase='returning';this.changed('dump-exit');return true;
  }
  updateDump(dt){
    if(this.dumpPhase==='returning'){
      const next={...this.dump},path=this.dumpPath.map(p=>({...p}));travel(next,path,dt*4.5*MOVEMENT_SPEED,dt);
      if(this.riding||!truckContains(this.child.x,this.child.z,next,.38)){Object.assign(this.dump,next);this.dumpPath=path}
      if(!this.dumpPath.length){this.dump.angle=0;this.dumpPhase='parked';this.changed('dump-parked')}
    }
    if(this.drivingDump&&this.mode==='loading'){
      this.workTime+=dt;
      this.cargo=Math.min(3,this.loadStart+Math.floor((this.workTime+.9)/4));
      if(this.workTime>=(3-this.loadStart)*4){this.cargo=3;this.mode='idle';this.dumpMission=null;this.changed('loaded')}
    }
    if(this.drivingDump&&this.mode==='unloading'){
      this.workTime+=dt;
      if(this.workTime>=2.2&&!this.unloadCommitted){this.delivered+=this.cargo;this.cargo=0;this.unloadCommitted=true;this.changed('soil-dropped')}
      if(this.workTime>=4.5){this.mode='idle';this.dumpMission=null;this.workTime=0;this.changed('delivered')}
    }
  }
  snapshot(){return {train:structuredClone(this.train),pets:structuredClone(this.pets),fishingMission:this.fishingMission,fishTime:this.fishTime,fishCaught:this.fishCaught,buses:structuredClone(this.buses),busRequest:this.busRequest,services:structuredClone(this.services),serviceRequest:this.serviceRequest,eatTime:this.eatTime,iceCreams:this.iceCreams,vehicle:this.vehicle,dump:{...this.dump},dumpPhase:this.dumpPhase,cargo:this.cargo,delivered:this.delivered,workTime:this.workTime,dumpMission:this.dumpMission,mode:this.mode,riding:this.riding,boarding:this.boarding,truckPhase:this.truckPhase,doorOpen:this.door,fireActive:this.fireActive,fireRemaining:this.fireActive?Math.round(this.hp):0,complete:this.complete,child:{...this.child},truck:{...this.truck}}}
}

Object.assign(FireGame.prototype,serviceActions,busActions,railwayActions,petActions);
