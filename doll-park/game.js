import { Vector3 } from 'three';
import { preparePose, resetPose, locomotion, swingPose, slidePose, jumpPose, carouselPose } from './ride-poses.js';
import { groundPoint, route } from './park-paths.js';

const RIDES=['swing','slide','trampoline','carousel'];
const TAU=Math.PI*2, clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const smooth=t=>t*t*(3-2*t);
const ground=(x,z)=>new Vector3(x,0,z);
const stroll=[ground(-.8,1.65),ground(2.3,2.7),ground(-3.1,.6),ground(.1,4.6),ground(3.65,-.6),ground(-5.9,1.55)];
const startAt=ground(.30,1.15);
const actions={swing:'발 구르기',slide:'출발!',trampoline:'폴짝 뛰기',carousel:'빙글 돌리기'};
const hints={swing:'그네가 돌아올 때 톡 눌러요',slide:'꾹 앉아서 신나게 내려가요',trampoline:'착지하기 전에 톡 눌러요',carousel:'한 번 더 밀어서 빙글빙글'};
const defaults={swing:[-4.6,-.3,-4.1,.1],slide:[-1.05,-3.7,2.38,-.2],trampoline:[4.8,3.74,5.36,3.58],carousel:[-1.24,3.65,-1.35,4.42]};

function pointOf(ride,id,end) {
  const p=ride[end?'exit':'entry'];
  if(p?.isVector3)return p;
  const v=defaults[id];
  return ground(v[end?2:0],v[end?3:1]);
}
function turnTo(root,x,z,dt) {
  if(Math.abs(x)+Math.abs(z)<.001)return;
  const target=Math.atan2(x,z),current=root.rotation.y;
  const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
  root.rotation.set(0,current+delta*Math.min(1,dt*11),0,'YXZ');
}
function animationState(){
  return {t:0, since:0, amplitude:0, angle:0, velocity:0, speed:0, rotation:0,
    credit:0, powered:false, cheer:false, landed:false, repeat:false, jump:.78, lastPeak:-1};
}

export class PlaygroundGame {
  constructor({scene,world,loadCharacter,onState=()=>{},onFeedback=()=>{},onFocus=()=>{},initialStars=0,initialActivityCount=0}) {
    this.scene=scene;
    this.world=world;
    this.loadCharacter=loadCharacter;
    this.onState=onState;
    this.onFeedback=onFeedback;
    this.onFocus=onFocus;
    this.clock=0;
    this.stars=Math.max(0,Math.floor(Number(initialStars)||0));
    this.activityCount=Math.max(0,Math.floor(Number(initialActivityCount)||0));
    this.actors=[];
    this.player=null;
    this.version=0;
    this.closed=false;
    this.carouselAngle=0;
    this.lastState='';
    this.pendingId=null;
  }

  async start({id='teddy',friends=['garden','lilac','sailor']}={}) {
    if(this.player) return this;
    const avatar=await this.loadCharacter(id);
    if(this.closed) {avatar.dispose?.(); return this;}
    this.player=this.spawn(id,avatar,startAt,0);
    this.emit(true);
    const order=[...new Set(friends)].filter(f=>f!==id).slice(0,3);
    // Loading companions sequentially bounds parsing and texture uploads on phones.
    this.friendsReady=(async()=>{
      for(const [i,other] of order.entries()){
        if(this.closed)break;
        try{
          const companion=await this.loadCharacter(other);
          if(this.closed || this.actors.some(a=>a.id===other) || this.pendingId===other){
            companion.dispose?.(); continue;
          }
          const npc=this.spawn(other,companion,stroll[(i+2)%stroll.length],i+1);
          const initial=['swing','carousel','trampoline'][i];
          if(!this.actors.some(a=>a.rideId===initial)){
            npc.rideId=initial; npc.phase='ready'; npc.ride=animationState();
            this.begin(npc); npc.ride.t=.31*i; npc.ride.since=1.1;
          }
        }catch(error){ console.warn('Playground companion:',other,error); }
      }
    })();
    return this;
  }

  spawn(id,avatar,position,seed) {
    preparePose(avatar);
    avatar.root.userData.characterId=id;
    this.scene.add(avatar.root);
    avatar.root.position.copy(position);
    avatar.root.rotation.y=seed===0?.28:seed*.9;
    const actor={id,avatar,seed,motion:'',phase:'idle',rideId:null,ride:animationState(),path:[],
      timer:0,routeGoal:null,pendingTap:false,cooldown:0,
      npcThink:2.25+seed*.43,npcMove:11+seed*3,transition:null,visited:seed};
    this.actors.push(actor);
    locomotion(actor,'Idle');
    return actor;
  }

  async selectCharacter(id) {
    const a=this.player;
    if(!a || !id || this.closed)return false;
    const request=++this.version;
    this.pendingId=id;
    if(id===a.id){this.pendingId=null;return true;}
    let next=this.actors.find(c=>c!==a && c.id===id);
    let incoming=next?.avatar || null;
    if(!incoming){
      try{incoming=await this.loadCharacter(id);}
      catch(error){if(this.version===request)this.pendingId=null;throw error;}
    }
    if(request!==this.version||this.closed) {if(!next)incoming.dispose?.();return false;}
    this.pendingId=null;
    if(!next){
      next=this.actors.find(c=>c!==a && c.id===id);
      if(next){incoming.dispose?.();incoming=next.avatar;}
      else{preparePose(incoming);this.scene.add(incoming.root);}
    }
    const old=a.avatar, oldId=a.id;
    const oldPoint=old.root.position.clone(), oldRotation=old.root.quaternion.clone();
    if(next) {
      old.root.position.copy(incoming.root.position); old.root.quaternion.copy(incoming.root.quaternion);
      next.id=oldId; next.avatar=old; next.motion='ride';
      old.root.userData.characterId=oldId;
      old.mixer.stopAllAction(); resetPose(old);
    }else{
      this.scene.remove(old.root); old.dispose?.();
    }
    a.id=id; a.avatar=incoming; a.motion='ride';
    incoming.mixer.stopAllAction();resetPose(incoming);
    incoming.root.position.copy(oldPoint);incoming.root.quaternion.copy(oldRotation);
    incoming.root.userData.characterId=id;
    this.emit(true);return true;
  }

  playerPosition(){
    return this.player?.avatar.root.position || null;
  }
  publicPhase(a=this.player){
    if(!a?.rideId)return 'overview';
    if(['walking','mount','dismount','landing'].includes(a.phase))return 'walking';
    if(a.phase==='playing')return 'playing';
    return 'ready';
  }
  getState(){
    const a=this.player, rideId=a?.rideId || null, phase=this.publicPhase(a);
    let actionLabel=actions[rideId]||'', actionHint=hints[rideId]||'';
    if(phase==='walking') {actionLabel=a?.phase==='landing'?'착지하는 중':a?.phase==='mount'&&rideId==='slide'?'계단 오르는 중':'놀러 가는 중';actionHint='';}
    else if(a?.phase==='finished'){actionLabel='한 번 더 타기';actionHint='꼭대기에서 다시 출발해요';}
    else if(rideId==='slide'&&phase==='playing') {actionLabel=a.ride.cheer?'신난다!':'손 번쩍!';actionHint='미끄러지는 동안 손을 들어요';}
    else if(rideId==='trampoline'&&phase==='playing')actionLabel=a.ride.repeat?'준비됐어요!':'한 번 더!';
    return {selectedId:a?.id || null,rideId,phase,stars:this.stars,activityCount:this.activityCount,
      actionReady:!!rideId && (phase==='ready'||phase==='playing') && !(rideId==='slide'&&a?.ride.cheer) && !(rideId==='trampoline'&&a?.ride.repeat),
      actionLabel,actionHint};
  }
  emit(force=false){
    const s=this.getState(),signature=JSON.stringify(s);
    if(force||this.lastState!==signature){this.lastState=signature;this.onState(s);}
  }
  feedback(a,kind,extra={}){
    if(a!==this.player)return;
    const p=a.avatar.root.position.clone();
    p.y+=a.phase==='playing' && ['slide','swing','carousel'].includes(a.rideId) ? 1.40:1.50;
    this.onFeedback({kind,rideId:a.rideId,point:p,stars:0,...extra});
  }
  reward(a){
    if(a!==this.player)return;
    this.stars++;this.activityCount++;
    this.feedback(a,'star',{stars:1});this.emit();
  }
  selectRide(id){
    const a=this.player;
    if(!a || this.closed || !RIDES.includes(id))return false;
    if(a.rideId===id){
      if(['walking','dismount','mount'].includes(a.phase)){a.pendingTap=true;return true;}
      return this.tapAction();
    }
    const occupied=this.actors.find(other=>other!==a&&other.rideId===id);
    if(occupied)this.assign(occupied,null,stroll[(occupied.visited+2)%stroll.length]);
    this.assign(a,id);
    this.onFocus({rideId:id,point:this.world.anchors?.[id]?.clone?.() || pointOf(this.world.rides[id],id,false).clone()});
    this.emit(true);return true;
  }
  goTo(point){
    if(!this.player || !point || !Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
    this.assign(this.player,null,groundPoint(point));this.onFocus(null);this.emit(true);return true;
  }
  leaveRide(){
    if(!this.player)return false;
    const a=this.player;
    if(!a.rideId && a.phase!=='walking')return false;
    this.assign(a,null);
    this.onFocus(null);this.emit(true);return true;
  }

  assign(a,rideId,goal){
    const prior=a.rideId,phase=a.phase,ride=this.world.rides[prior];
    const departing=!!prior&&['ready','playing','mount','landing'].includes(phase);
    const root=a.avatar.root;
    let departure=null;
    if(departing){
      let exit=pointOf(ride,prior,true);
      // If a rider changes activities half way up the staircase, step back to
      // its entry instead of leaping across the entire slide.
      if(prior==='slide'&&(phase==='mount'||phase==='ready'))exit=pointOf(ride,prior,false);
      departure={from:root.position.clone(),to:exit.clone(),t:0,duration:.52};
      if(prior==='trampoline')ride.pose(0,0);
      if(prior==='swing')ride.pose(0);
    }else if(phase==='dismount'){
      departure={from:root.position.clone(),to:a.transition.to.clone(),duration:Math.max(.12,a.transition.duration-a.timer)};
    }
    a.rideId=rideId;a.routeGoal=rideId?pointOf(this.world.rides[rideId],rideId,false).clone():goal?.clone()||null;
    a.ride=animationState();a.pendingTap=false;a.timer=0;a.cooldown=0;
    if(departure){
      a.transition=departure;a.phase='dismount';
      locomotion(a,'Walk');root.rotation.x=0;root.rotation.z=0;
    }else this.walk(a);
  }
  walk(a){
    const root=a.avatar.root;
    root.rotation.x=0;root.rotation.z=0;
    root.position.y=0;a.transition=null;
    if(!a.routeGoal){a.path=[];a.phase='idle';locomotion(a,'Idle');return;}
    a.path=route(root.position,a.routeGoal);
    if(a.rideId) {
      const actual=pointOf(this.world.rides[a.rideId],a.rideId,false);
      if(a.path.at(-1).distanceTo(actual)>.03)a.path.push(actual.clone());
    }
    a.phase='walking';locomotion(a,a===this.player&&root.position.distanceTo(a.routeGoal)>3.5?'Run':'Walk');
  }
  arrive(a){
    if(!a.rideId){a.phase='idle';a.timer=0;locomotion(a,'Idle');return;}
    a.phase='mount';a.timer=0;a.transition={from:a.avatar.root.position.clone()};
    this.feedback(a,'arrive');this.emit();
  }
  walkStep(a,dt){
    const root=a.avatar.root;
    const target=a.path[0];
    if(!target){this.arrive(a);return;}
    const dx=target.x-root.position.x,dz=target.z-root.position.z,d=Math.hypot(dx,dz);
    const speed=a.motion==='Run'?3.65:(a===this.player?2.33:1.58);
    if(d<speed*dt+.025) {
      root.position.copy(target);a.path.shift();
      if(!a.path.length)this.arrive(a);
    }else{
      root.position.x+=dx/d*speed*dt;root.position.z+=dz/d*speed*dt;
      turnTo(root,dx,dz,dt);
    }
    a.avatar.mixer.update(dt);
  }
  mount(a,dt){
    const id=a.rideId, ride=this.world.rides[id],root=a.avatar.root;
    a.timer+=dt;
    const duration=id==='slide'?2.05:.64;
    const t=clamp(a.timer/duration,0,1);
    if(id==='slide' && ride.climb){
      const climbing=clamp(a.timer/1.72,0,1);
      const sample=ride.climb(smooth(climbing));
      if(climbing<1){
        locomotion(a,'Walk');a.avatar.mixer.update(dt*1.30);
        root.position.copy(sample.position);root.rotation.set(0,sample.yaw||0,0,'YXZ');
      }else{
        const settle=smooth(clamp((a.timer-1.72)/(duration-1.72),0,1));
        if(!a.transition.joints)a.transition.joints=this.capture(a);
        slidePose(a,ride.sample(0),0,false);
        this.blendJoints(a,a.transition.joints,settle);
        root.position.lerpVectors(sample.position,root.position,settle);
      }
    }else{
      const start=a.transition.from;
      const anchor=id==='swing'?ride.pose(0):id==='trampoline'?ride.pose(0,0):
        id==='slide'?ride.sample(0):ride.pose(this.carouselAngle,0);
      const target=anchor.position.clone();
      if(id!=='trampoline')target.y-=.394;
      const u=smooth(t);
      if(id==='swing'||id==='carousel'){
        if(!a.transition.joints)a.transition.joints=this.capture(a);
        if(id==='swing')swingPose(a,anchor,0,0,this.clock);
        else carouselPose(a,anchor,0,this.clock);
        this.blendJoints(a,a.transition.joints,u);
      }else a.avatar.mixer.update(dt);
      root.position.lerpVectors(start,target,u);
      root.position.y+=.22*Math.sin(Math.PI*t);
      turnTo(root,Math.sin(anchor.yaw||0),Math.cos(anchor.yaw||0),dt);
    }
    if(t>=1){
      a.phase='ready';a.timer=0;a.transition=null;
      if(a.pendingTap || a!==this.player) {a.pendingTap=false;this.begin(a);}
      this.rideStep(a,0);this.emit();
    }
  }
  capture(a){
    return Object.entries(a.avatar.bones).map(([name,bone])=>[name,bone.quaternion.clone()]);
  }
  blendJoints(a,originals,t){
    for(const [name,from] of originals){
      const q=a.avatar.bones[name]?.quaternion;
      if(q)q.slerp(from,1-t);
    }
  }
  begin(a){
    a.phase='playing';a.ride=animationState();a.timer=0;
    const r=a.ride;
    r.credit=1;r.powered=true;
    if(a.rideId==='swing')r.amplitude=.46;
    if(a.rideId==='carousel')r.speed=1.28;
    this.feedback(a,'action');this.emit();
  }
  tapAction(){
    const a=this.player;
    if(!a?.rideId||this.closed)return false;
    if(['walking','mount','dismount'].includes(a.phase)){a.pendingTap=true;return true;}
    if(a.cooldown>0)return false;
    if(a.phase==='finished'){
      this.assign(a,a.rideId);a.pendingTap=true;this.emit();return true;
    }
    if(a.phase==='ready'){this.begin(a);a.cooldown=.25;return true;}
    return this.pump(a);
  }
  pump(a){
    if(a.phase!=='playing' || a.cooldown>0)return false;
    const r=a.ride;
    if(a.rideId==='trampoline'){
      if(r.repeat || r.t<.17)return false;
      r.repeat=true;
    }else if(a.rideId==='slide'){
      if(r.cheer)return false;
      r.cheer=true;
    }else if(a.rideId==='swing'){
      r.amplitude=clamp(r.amplitude+(Math.cos(r.t*2.30)>.1?.19:.11),.25,.92);
      r.credit=1;
    }else{
      r.speed=Math.min(2.90,r.speed+.65);r.credit=1;
    }
    r.since=0;a.cooldown=.26;this.feedback(a,'action');this.emit();return true;
  }
  rideStep(a,dt){
    const id=a.rideId,ride=this.world.rides[id],r=a.ride;
    const playing=a.phase==='playing';
    if(playing){r.t+=dt;r.since+=dt;}
    if(id==='swing'){
      const phase=r.t*2.30;
      r.amplitude*=Math.exp(-dt*(r.since>5.3?1.05:.095));
      const angle=playing?r.amplitude*Math.sin(phase):0;
      swingPose(a,ride.pose(angle),angle,r.amplitude*Math.cos(phase),this.clock);
      if(playing){
        const peak=Math.floor((phase+Math.PI*1.5)/TAU);
        if(peak>r.lastPeak){
          if(r.lastPeak>=0&&r.credit){this.reward(a);r.credit=0;}
          r.lastPeak=peak;
        }
        if(r.amplitude<.024 && r.since>5)a.phase='ready';
      }
    }else if(id==='carousel'){
      if(playing){
        this.carouselAngle=(this.carouselAngle+r.speed*dt)%TAU;
        r.rotation+=r.speed*dt;
        r.speed*=Math.exp(-dt*(r.since>4.6?.84:.10));
        if(r.rotation>=Math.PI*1.48){r.rotation%=Math.PI*1.48;if(r.credit){this.reward(a);r.credit=0;}}
        if(r.speed<.08&&r.since>5)a.phase='ready';
      }
      carouselPose(a,ride.pose(this.carouselAngle,0),playing?r.speed:0,this.clock);
    }else if(id==='slide'){
      const t=playing?clamp(r.t/1.95,0,1):0;
      const u=t*t*(2.45-1.45*t);
      slidePose(a,ride.sample(u),u,r.cheer);
      if(playing&&t>=1){
        this.reward(a);a.phase='landing';a.timer=0;a.transition={from:a.avatar.root.position.clone()};
        this.feedback(a,'land');this.emit();
      }
    }else if(id==='trampoline'){
      const charge=.145,flight=.88,land=.20,t=playing?r.t:0;
      const air=clamp((t-charge)/flight,0,1);
      const arc=playing?4*air*(1-air):0;
      const crouch=!playing?0:t<charge?Math.sin(t/charge*Math.PI):
        t>charge+flight?Math.sin(Math.PI*clamp((t-charge-flight)/land,0,1)):0;
      const anchor=ride.pose(r.jump*arc,.13*crouch);
      jumpPose(a,anchor,arc,crouch,this.clock);
      if(playing&&t>=charge+flight&&!r.landed){
        r.landed=true;this.reward(a);this.feedback(a,'land');
      }
      if(playing&&t>=charge+flight+land){
        if(r.repeat){r.t=0;r.repeat=false;r.landed=false;r.jump=Math.min(1.23,r.jump+.19);}
        else{a.phase='ready';r.jump=.78;}
        this.emit();
      }
    }
  }
  brain(a,dt){
    a.npcThink-=dt;a.npcMove-=dt;
    if(a.npcMove<=0 && !['walking','mount','dismount','landing'].includes(a.phase)){
      a.visited++;
      const available=RIDES.filter(id=>!this.actors.some(other=>other.rideId===id));
      if(available.length && (a.visited%3!==0 || !a.rideId))
        this.assign(a,available[(a.visited+a.seed)%available.length]);
      else this.assign(a,null,stroll[(a.visited+a.seed)%stroll.length]);
      a.npcMove=11+((a.visited*7+a.seed)%10);
      return;
    }
    if(a.npcThink>0)return;
    a.npcThink=1.20+((a.visited+a.seed*3)%5)*.22;
    if(a.phase==='ready')this.begin(a);
    else if(a.phase==='playing')this.pump(a);
    else if(a.phase==='finished'){a.npcMove=Math.min(a.npcMove,1.1);}
  }
  update(seconds){
    if(this.closed || !this.player)return;
    const dt=clamp(Number(seconds)||0,0,.12);this.clock+=dt;
    for(const a of this.actors){
      a.cooldown=Math.max(0,a.cooldown-dt);
      if(a!==this.player)this.brain(a,dt);
      if(a.phase==='walking')this.walkStep(a,dt);
      else if(a.phase==='mount')this.mount(a,dt);
      else if(a.phase==='ready'||a.phase==='playing')this.rideStep(a,dt);
      else if(a.phase==='landing'||a.phase==='dismount'){
        const landing=a.phase==='landing',tr=a.transition;
        const root=a.avatar.root;
        a.timer+=dt;const end=landing?pointOf(this.world.rides.slide,'slide',true):tr.to;
        const u=clamp(a.timer/(landing?.48:tr.duration),0,1);
        locomotion(a,'Walk');root.position.lerpVectors(tr.from,end,smooth(u));
        root.position.y+=.12*Math.sin(Math.PI*u);
        turnTo(root,end.x-tr.from.x,end.z-tr.from.z,dt);
        a.avatar.mixer.update(dt);
        if(u>=1){
          if(landing){a.phase='finished';a.transition=null;locomotion(a,'Idle');}
          else this.walk(a);
        }
      }else{
        locomotion(a,'Idle');a.avatar.mixer.update(dt);
      }
    }
    this.emit();
  }
  dispose(){
    this.closed=true;this.version++;
    for(const a of this.actors){this.scene.remove(a.avatar.root);a.avatar.dispose?.();}
    this.actors.length=0;this.player=null;
  }
}
