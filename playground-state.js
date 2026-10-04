import {PLAY_ACTIVITIES,playPose} from './playground-layout.js';
import {walkable} from './navigation.js';
const smooth=t=>t*t*(3-2*t);
export const playgroundActions={
  resetPlayground(){this.play={id:null,phase:'idle',time:0,completed:0,finished:[],pose:null}},
  startPlay(id){
    const p=PLAY_ACTIVITIES.find(p=>p.id===id);
    if(!p||this.riding||this.activityLocked)return false;
    if(this.play.phase==='approach'&&this.play.id===id)return true;
    if(!this.moveTo(p.entry))return false;
    this.scooter=false;this.play={...this.play,id,phase:'approach',time:0,pose:null};
    this.cityNotice('놀이공원으로 놀러 가요!');return true;
  },
  updatePlayground(dt){
    const s=this.play;if(s.phase==='idle')return;
    const p=PLAY_ACTIVITIES.find(p=>p.id===s.id);
    if(s.phase==='approach'){
      if(this.mode!=='idle'||this.path.length)return;
      if(Math.hypot(this.child.x-p.entry.x,this.child.z-p.entry.z)>.5){s.phase='idle';return}
      s.phase='boarding';s.time=0;s.from={...this.child};this.mode='playing';this.cityNotice(p.line);
    }
    s.time+=dt;
    if(s.phase==='boarding'){
      const to=playPose(s.id,0),u=smooth(Math.min(1,s.time/1.2));
      s.pose={...to,x:s.from.x+(to.x-s.from.x)*u,z:s.from.z+(to.z-s.from.z)*u,height:to.height*u};
      if(s.time>=1.2){s.phase='active';s.time=0}
    }else if(s.phase==='active'){
      s.pose=playPose(s.id,s.time);
      if(s.time>=p.duration){s.from={...s.pose};s.phase='leaving';s.time=0}
    }else if(s.phase==='leaving'){
      const leavingDuration=p.id==='slide'?4:1.2,u=smooth(Math.min(1,s.time/leavingDuration));s.pose={...s.from,x:s.from.x+(p.entry.x-s.from.x)*u,z:s.from.z+(p.entry.z-s.from.z)*u,height:s.from.height*(1-u),seated:false,arm:0};
      if(p.id==='slide'){
        const points=[s.from,{x:p.x+p.width/2+.7,z:s.from.z},{x:p.x+p.width/2+.7,z:p.entry.z},p.entry],q=Math.min(2.999999,u*3),i=Math.floor(q),v=q-i;
        s.pose.x=points[i].x+(points[i+1].x-points[i].x)*v;s.pose.z=points[i].z+(points[i+1].z-points[i].z)*v;
        if(u>=1){s.pose.x=p.entry.x;s.pose.z=p.entry.z}
        s.pose.angle=Math.atan2(points[i+1].x-points[i].x,points[i+1].z-points[i].z);
      }
      if(s.time>=leavingDuration&&walkable(p.entry.x,p.entry.z,this.options)){
        this.child={...p.entry,angle:0};s.phase='idle';s.pose=null;s.completed++;if(!s.finished.includes(p.id))s.finished.push(p.id);
        this.mode='idle';this.cityNotice('놀이가 끝났어요. 또 놀아 볼까요?');this.changed('play-complete');return;
      }
    }
    if(s.pose)Object.assign(this.child,{x:s.pose.x,z:s.pose.z,angle:s.pose.angle,height:s.pose.height});
  },
};
