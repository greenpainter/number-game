import {SERVICES,ICE_STOP,findPath,walkable,truckContains} from './navigation.js';
export const serviceActions={
  resetServices(){
    this.services=Object.fromEntries(Object.entries(SERVICES).map(([id,s])=>[id,{car:{...s.garage,angle:0,halfWidth:.95,halfLength:1.9},phase:'parked',door:0,path:[]}]));
    this.serviceRequest=null;this.iceMission=false;this.fishingMission=false;this.eatTime=0;this.iceCreams=0;
  },
  boardService(id){
    const s=this.services[id],config=SERVICES[id];if(!s||this.riding||this.activityLocked)return false;
    if(!this.routeTo(config.waiting,{boarding:true}))return false;
    this.busRequest=null;this.serviceRequest=id;this.iceMission=false;this.fishingMission=false;this.boardingStage='service-wait';
    if(s.phase==='parked')s.phase='opening';
    if(this.truckPhase==='waiting')this.returnTruck();this.changed('service-call');return true;
  },
  otherVehicles(except){return [...this.buses.filter(b=>b.id!==except).map(b=>b.car),...(except==='dumptruck'?[]:[this.dump]),...(except==='firetruck'||this.truckPhase==='parked'?[]:[this.truck]),...Object.entries(this.services).filter(([id,s])=>id!==except&&s.phase!=='parked').map(([,s])=>s.car)]},
  returnService(id){
    const s=this.services[id],path=findPath(s.car,SERVICES[id].home,{radius:1,vehicles:this.otherVehicles(id)});
    if(!path)return false;s.path=path;s.phase='returning';return true;
  },
  exitService(){
    const id=this.vehicle,s=this.services[id];if(!s)return false;
    const route=findPath(s.car,SERVICES[id].home,{radius:1,vehicles:this.otherVehicles(id)});if(!route)return false;
    const candidates=[];
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,p={x:s.car.x+Math.cos(a)*3,z:s.car.z+Math.sin(a)*3};
      if(walkable(p.x,p.z,{radius:.32,vehicles:this.otherVehicles(null)})&&findPath(p,SERVICES[id].waiting,{radius:.32,vehicles:this.otherVehicles(null)})){
        const points=[s.car,...route];p.score=Infinity;
        for(let j=1;j<points.length;j++){
          const a=points[j-1],b=points[j],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
          p.score=Math.min(p.score,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));
        }
        candidates.push(p);
      }
    }
    candidates.sort((a,b)=>b.score-a.score);if(!candidates.length)return false;
    this.child={x:candidates[0].x,z:candidates[0].z,angle:s.car.angle};this.riding=false;this.vehicle=null;this.path=[];this.target=null;this.mode='idle';this.boarding=false;this.boardingStage=null;this.serviceRequest=null;
    s.path=route;s.phase='returning';this.changed('service-exit');return true;
  },
  getIceCream(){
    if(this.riding||this.activityLocked||!this.routeTo(ICE_STOP))return false;
    this.boardingStage=null;this.busRequest=null;this.serviceRequest=null;this.iceMission=true;this.fishingMission=false;
    if(this.truckPhase==='waiting')this.returnTruck();this.changed('ice-walk');return true;
  },
  updateServices(dt,travel){
    for(const [id,s] of Object.entries(this.services)){
      const c=SERVICES[id],requested=this.serviceRequest===id;
      const open=['opening','outgoing','openingReturn','entering'].includes(s.phase);
      s.door=Math.max(0,Math.min(1,s.door+(open?1:-1)*dt*1.1));
      if(s.phase==='opening'&&s.door===1){s.path=[{...c.home}];s.phase='outgoing'}
      if(s.phase==='openingReturn'&&s.door===1){s.car.angle=0;s.path=[{...c.garage}];s.phase='entering'}
      if(['outgoing','returning','entering'].includes(s.phase)){
        const next={...s.car},path=s.path.map(p=>({...p}));travel(next,path,dt*3.6*1.2,dt,s.phase==='entering');
        if(this.riding||!truckContains(this.child.x,this.child.z,next,.38)){Object.assign(s.car,next);s.path=path}
        if(!s.path.length){if(s.phase==='outgoing'){s.car.angle=0;s.phase='waiting'}else if(s.phase==='returning')s.phase='openingReturn';else s.phase='closing'}
      }
      if(s.phase==='closing'&&s.door===0){s.phase=requested?'opening':'parked';s.car.angle=0}
      if(s.phase==='waiting'&&!requested)this.returnService(id);
      if(s.phase==='waiting'&&requested&&this.mode==='idle'&&this.boardingStage==='service-wait'){
        for(const dx of [-1.8,1.8])if(this.routeTo({x:s.car.x+dx,z:s.car.z+.5},{boarding:true})){this.boardingStage='service-door';break}
      }
    }
    if(this.mode==='eating'){
      this.eatTime+=dt;this.child.angle=Math.PI/4;
      if(this.eatTime>=5.5){this.mode='idle';this.iceCreams++;this.changed('ice-done')}
    }
  },
};
