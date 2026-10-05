import {SERVICES,walkable} from './navigation.js';
export const PATIENT_SPOTS=[{x:21,z:12},{x:-24,z:18},{x:42,z:-12}];
export const RESCUE_LINES=['구급차를 타고 아픈 친구를 도와줘요.','아픈 친구를 만나러 가요.','조심조심 구급차에 타요.','병원으로 출발해요!','병원에 도착했어요. 이제 괜찮아요!','친구를 병원에 데려다준 뒤 내려요.'];
export const rescueActions={
  resetRescue(){this.patients=PATIENT_SPOTS.map((p,id)=>({...p,id,phase:'waiting',time:0}));this.rescue={phase:'idle',patient:null,time:0,delivered:0}},
  rescuePatient(id){
    if(this.rescue.phase==='approach'&&this.rescue.patient===id)return true;
    const p=this.patients.find(p=>p.id===id);if(!p||p.phase!=='waiting'||this.carryingPatient)return false;
    if(!this.riding||this.vehicle!=='ambulance'){this.cityNotice(RESCUE_LINES[0]);return false}
    if(this.activityLocked)return false;
    const stops=[[3,0],[-3,0],[0,3],[0,-3]].map(([x,z])=>({x:p.x+x,z:p.z+z}));
    stops.sort((a,b)=>Math.hypot(a.x-this.actor.x,a.z-this.actor.z)-Math.hypot(b.x-this.actor.x,b.z-this.actor.z));
    const stop=stops.find(s=>walkable(s.x,s.z,this.options)&&this.moveTo(s));if(!stop)return false;
    Object.assign(this.rescue,{phase:'approach',patient:id,time:0,stop});this.cityNotice(RESCUE_LINES[1]);return true;
  },
  routePatientToHospital(){
    if(!this.carryingPatient)return false;
    this.path=[];this.target=null;this.mode='idle';
    this.rescue.phase='transporting';this.cityNotice('병원까지 안내선을 따라 운전해요.');return true;
  },
  updateRescue(dt){
    const r=this.rescue;
    for(const p of this.patients)if(p.phase==='recovered'){p.time+=dt;if(p.time>45){p.phase='waiting';p.time=0}}
    if(r.phase==='idle')return;
    const p=this.patients[r.patient];
    if(r.phase==='approach'&&(!this.riding||this.vehicle!=='ambulance')){r.phase='idle';return}
    r.time+=dt;
    if(r.phase==='approach'&&this.mode==='idle'&&Math.hypot(this.actor.x-r.stop.x,this.actor.z-r.stop.z)<.5){r.phase='boarding';r.time=0;p.phase='boarding';this.mode='patient-boarding';this.cityNotice(RESCUE_LINES[2])}
    else if(r.phase==='boarding'&&r.time>=2.2){p.phase='aboard';this.routePatientToHospital()}
    else if(r.phase==='waiting-route'&&r.time>1)this.routePatientToHospital();
    else if(r.phase==='transporting'&&Math.hypot(this.actor.x-SERVICES.ambulance.home.x,this.actor.z-SERVICES.ambulance.home.z)<2.5){r.phase='unloading';r.time=0;p.phase='unloading';this.path=[];this.target=null;this.mode='patient-unloading';this.changed('patient-unloading')}
    else if(r.phase==='unloading'&&r.time>=2.5){p.phase='recovered';p.time=0;r.phase='idle';r.delivered++;this.mode='idle';this.cityNotice(RESCUE_LINES[4]);this.changed('patient-rescued')}
  },
};
