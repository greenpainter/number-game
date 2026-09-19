import {BUS_SPOTS,findPath,walkable,truckContains} from './navigation.js';
export const busActions={
  resetBuses(){
    this.buses=BUS_SPOTS.map((p,i)=>({id:`bus-${i}`,name:['빨간색 버스','파란색 버스','초록색 버스'][i],car:{...p,angle:0,halfWidth:1.12,halfLength:2.5},phase:'parked',path:[]}));this.busRequest=null;
  },
  boardBus(index){
    const b=this.buses[index];if(!b||this.riding||this.mode==='eating'||b.phase==='returning')return false;
    for(const dx of [-1.8,1.8]){
      const p={x:b.car.x+dx*Math.cos(b.car.angle)+1.5*Math.sin(b.car.angle),z:b.car.z-dx*Math.sin(b.car.angle)+1.5*Math.cos(b.car.angle)};
      if(this.routeTo(p,{boarding:true})){
        this.busRequest=index;this.boardingStage='bus-door';this.serviceRequest=null;this.iceMission=false;this.dumpMission=null;
        if(this.truckPhase==='waiting')this.returnTruck();this.changed('bus-walk');return true;
      }
    }
    return false;
  },
  exitBus(){
    const b=this.drivingBus;if(!b)return false;
    const index=this.buses.indexOf(b),home=BUS_SPOTS[index],vehicles=this.otherVehicles(b.id);
    const route=findPath(b.car,home,{radius:2.7,vehicles});if(!route)return false;
    const candidates=[];
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,p={x:b.car.x+Math.cos(a)*3.6,z:b.car.z+Math.sin(a)*3.6};
      if(!walkable(p.x,p.z,{radius:.32,vehicles:[...vehicles,b.car]})||!findPath(p,{x:home.x+1.8,z:home.z+1.5},{radius:.32,vehicles:[...vehicles,b.car]}))continue;
      const points=[b.car,...route];p.score=Infinity;
      for(let j=1;j<points.length;j++){
        const a=points[j-1],next=points[j],dx=next.x-a.x,dz=next.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
        p.score=Math.min(p.score,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));
      }
      candidates.push(p);
    }
    candidates.sort((a,b)=>b.score-a.score);if(!candidates.length)return false;
    this.child={x:candidates[0].x,z:candidates[0].z,angle:b.car.angle};this.riding=false;this.vehicle=null;this.mode='idle';this.path=[];this.target=null;this.boarding=false;this.boardingStage=null;this.busRequest=null;
    b.path=route;b.phase='returning';this.changed('bus-exit');return true;
  },
  updateBuses(dt,travel){
    for(const b of this.buses)if(b.phase==='returning'){
      const next={...b.car},path=b.path.map(p=>({...p}));travel(next,path,dt*4.4,dt);
      if(this.riding||!truckContains(this.child.x,this.child.z,next,.4)){Object.assign(b.car,next);b.path=path}
      if(!b.path.length){b.car.angle=0;b.phase='parked';this.changed('bus-parked')}
    }
  },
};
