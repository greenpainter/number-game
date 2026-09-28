import layout from './railway-layout.js';

// Arc-length parametrization keeps every carriage on the same one-way track.
const r=layout.rail, pieces=[];
let length=0;
function line(ax,az,bx,bz){const size=Math.hypot(bx-ax,bz-az);pieces.push({start:length,size,at:t=>({x:ax+(bx-ax)*t,z:az+(bz-az)*t,angle:Math.atan2(bx-ax,bz-az)})});length+=size}
function arc(cx,cz,a){const size=Math.PI*r.radius/2;pieces.push({start:length,size,at:t=>{const theta=a-t*Math.PI/2;return {x:cx+r.radius*Math.cos(theta),z:cz+r.radius*Math.sin(theta),angle:Math.atan2(Math.sin(theta),-Math.cos(theta))}}});length+=size}
line(0,r.bottom,r.right-r.radius,r.bottom);
arc(r.right-r.radius,r.bottom-r.radius,Math.PI/2);
line(r.right,r.bottom-r.radius,r.right,r.top+r.radius);
arc(r.right-r.radius,r.top+r.radius,0);
line(r.right-r.radius,r.top,r.left+r.radius,r.top);
arc(r.left+r.radius,r.top+r.radius,-Math.PI/2);
line(r.left,r.top+r.radius,r.left,r.bottom-r.radius);
arc(r.left+r.radius,r.bottom-r.radius,-Math.PI);
line(r.left+r.radius,r.bottom,0,r.bottom);
export const TRACK_LENGTH=length;
// Begin at the north platform, halfway around the same physical track.
export function trackPoint(distance){const s=(((distance+length/2)%length)+length)%length,p=pieces.find(p=>s<p.start+p.size)??pieces.at(-1);return p.at((s-p.start)/p.size)}
export const stationDistance=stop=>stop.trackFraction*TRACK_LENGTH+stop.trackOffset;
function nextArrival(distance,stop){const at=stationDistance(stop);return at+Math.ceil((distance-at-.001)/TRACK_LENGTH)*TRACK_LENGTH}
export const railwayActions={
  resetRailway(){this.train={car:trackPoint(0),distance:0,speed:0,phase:'parked',stopAt:null,stationId:'north',targetStation:null,requestedStation:null};},
  boardTrain(id='north'){
    if(this.drivingTrain)return true;
    if(this.riding||this.activityLocked)return false;
    const stop=layout.stops.find(s=>s.id===id);if(!stop)return false;
    if(this.boardingStage==='train-door'&&this.train.requestedStation===id)return true;
    if(!this.routeTo(stop.boarding,{boarding:true}))return false;
    this.boardingStage='train-door';this.busRequest=null;this.serviceRequest=null;this.iceMission=false;this.fishingMission=false;this.dumpMission=null;
    const t=this.train;t.requestedStation=id;
    if(t.stationId!==id||t.phase!=='parked'){
      t.phase='fetching';t.stationId=null;t.targetStation=id;t.stopAt=nextArrival(t.distance,stop);
      // Retargeting must leave enough track to brake safely.
      if(t.stopAt-t.distance<t.speed*t.speed/8)t.stopAt+=TRACK_LENGTH;
    }
    if(this.truckPhase==='waiting')this.returnTruck();this.changed('train-walk');return true;
  },
  enterTrain(){
    const t=this.train;
    if(this.boardingStage!=='train-door')return;
    if(t.phase!=='parked'||t.stationId!==t.requestedStation){this.mode='train-waiting';this.changed('train-wait');return}
    const index=layout.stops.findIndex(s=>s.id===t.stationId),next=layout.stops[(index+1)%layout.stops.length];
    this.riding=true;this.vehicle='train';this.boarding=false;this.boardingStage=null;this.path=[];this.target=null;this.mode='train-moving';
    t.phase='running';t.targetStation=next.id;t.stationId=null;t.requestedStation=null;t.stopAt=nextArrival(t.distance,next);this.changed('train-board');
  },
  exitTrain(){
    // Every ride already ends at the next platform; repeated taps never add a lap.
    return this.drivingTrain;
  },
  updateRailway(dt){
    if(this.train.phase==='parked'){
      if(this.mode==='train-waiting'&&this.boardingStage==='train-door')this.enterTrain();
      return;
    }
    const t=this.train,remaining=t.stopAt===null?Infinity:t.stopAt-t.distance;
    const desired=Math.min(13,Math.sqrt(Math.max(0,2*4*remaining)));
    t.speed+=Math.max(-4*dt,Math.min(4*dt,desired-t.speed));
    t.distance+=Math.min(remaining,t.speed*dt);Object.assign(t.car,trackPoint(t.distance));
    if(t.stopAt!==null&&t.stopAt-t.distance<.035){
      const stop=layout.stops.find(s=>s.id===t.targetStation),wasRiding=this.drivingTrain;
      t.distance=t.stopAt;Object.assign(t.car,trackPoint(t.distance));t.speed=0;t.stopAt=null;t.phase='parked';t.stationId=stop.id;t.targetStation=null;
      if(wasRiding){this.child={...stop.exit,angle:0};this.riding=false;this.vehicle=null;this.mode='idle';this.changed('train-exit')}
      else if(this.mode==='train-waiting'&&this.boardingStage==='train-door')this.enterTrain();
    }
  },
};
