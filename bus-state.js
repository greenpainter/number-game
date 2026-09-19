import {BUS_SPOTS,findPath,walkable,truckContains} from './navigation.js';
function exitSpot(car,route,vehicles){
  const candidates=[],points=[car,...route];
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,p={x:car.x+Math.cos(a)*3.6,z:car.z+Math.sin(a)*3.6};
    if(!walkable(p.x,p.z,{radius:.4,vehicles:[...vehicles,car]}))continue;
    let score=3.6;
    for(let j=1;j<points.length;j++){
      const a=points[j-1],b=points[j],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
      score=Math.min(score,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));
    }
    if(score>3.1)candidates.push({...p,score});
  }
  return candidates.sort((a,b)=>b.score-a.score)[0]??null;
}
export const busActions={
  resetBuses(){
    this.buses=BUS_SPOTS.map((p,i)=>({id:`bus-${i}`,name:['빨간색 버스','파란색 버스','초록색 버스'][i],car:{...p,angle:0,halfWidth:1.12,halfLength:2.5},phase:'parked',path:[]}));this.busRequest=null;
  },
  boardBus(index){
    const b=this.buses[index];if(!b||this.riding||this.activityLocked||b.phase==='returning')return false;
    for(const dx of [-1.8,1.8]){
      const p={x:b.car.x+dx*Math.cos(b.car.angle)+1.5*Math.sin(b.car.angle),z:b.car.z-dx*Math.sin(b.car.angle)+1.5*Math.cos(b.car.angle)};
      if(this.routeTo(p,{boarding:true})){
        this.busRequest=index;this.boardingStage='bus-door';this.serviceRequest=null;this.iceMission=false;this.fishingMission=false;this.dumpMission=null;
        if(this.truckPhase==='waiting')this.returnTruck();this.changed('bus-walk');return true;
      }
    }
    return false;
  },
  exitBus(){
    const b=this.drivingBus;if(!b)return false;
    if(this.mode==='pulling-over')return true;
    const index=this.buses.indexOf(b),home=BUS_SPOTS[index],vehicles=this.otherVehicles(b.id);
    const route=findPath(b.car,home,{radius:2.7,vehicles});if(!route)return false;
    const spot=exitSpot(b.car,route,vehicles);
    if(spot)return this.finishBusExit(b,spot,route);
    // Follow the existing collision-free return route only as far as needed.
    const approach=[];let previous=b.car;
    for(let i=0;i<route.length;i++){
      const end=route[i],length=Math.hypot(end.x-previous.x,end.z-previous.z),steps=Math.max(1,Math.ceil(length/.75));
      for(let j=1;j<=steps;j++){
        const t=j/steps,p={x:previous.x+(end.x-previous.x)*t,z:previous.z+(end.z-previous.z)*t};
        const car={...b.car,...p,angle:Math.atan2(end.x-previous.x,end.z-previous.z)},remaining=[end,...route.slice(i+1)];
        const stop=exitSpot(car,remaining,vehicles);approach.push(p);
        if(stop){b.pullOver={spot:stop,route:remaining};b.path=approach;this.path=[];this.target=p;this.mode='pulling-over';this.changed('bus-pull-over');return true}
      }
      previous=end;
    }
    return false;
  },
  finishBusExit(b,spot,route){
    this.child={x:spot.x,z:spot.z,angle:b.car.angle};this.riding=false;this.vehicle=null;this.mode='idle';this.path=[];this.target=null;this.boarding=false;this.boardingStage=null;this.busRequest=null;b.pullOver=null;
    b.path=route;b.phase='returning';this.changed('bus-exit');return true;
  },
  updateBuses(dt,travel){
    const active=this.drivingBus;
    if(active?.pullOver){
      travel(active.car,active.path,dt*4.6*1.2,dt);
      if(!active.path.length){
        const request=active.pullOver,vehicles=this.otherVehicles(active.id),spot=exitSpot(active.car,request.route,vehicles);
        if(spot)this.finishBusExit(active,spot,request.route);
        else{active.pullOver=null;this.mode='idle';this.exitBus()}
      }
    }
    for(const b of this.buses)if(b.phase==='returning'){
      const next={...b.car},path=b.path.map(p=>({...p}));travel(next,path,dt*4.4*1.2,dt);
      if(this.riding||!truckContains(this.child.x,this.child.z,next,.4)){Object.assign(b.car,next);b.path=path}
      if(!b.path.length){b.car.angle=0;b.phase='parked';this.changed('bus-parked')}
    }
  },
};
