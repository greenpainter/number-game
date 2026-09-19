import {HOME,CHILD_START,FIRE,FIRE_STOP,findPath,walkable} from './navigation.js';

export class FireGame {
  constructor(onChange=()=>{}){this.onChange=onChange;this.reset(false)}
  get actor(){return this.riding?this.truck:this.child}
  get options(){return this.riding?{}:{radius:.32,truck:this.truck}}
  changed(reason){this.onChange(reason)}
  reset(notify=true){
    this.child={...CHILD_START,angle:Math.PI};this.truck={...HOME,angle:Math.PI/2};
    this.riding=false;this.mode='idle';this.boarding=false;this.fireMission=false;
    this.hp=100;this.complete=false;this.path=[];this.target=null;
    if(notify)this.changed('reset');
  }
  routeTo(target,{boarding=false,fireMission=false}={}){
    const path=findPath(this.actor,target,this.options);if(!path)return false;
    this.path=path;this.target={...target};this.boarding=boarding;this.fireMission=fireMission;
    this.mode='moving';this.changed('move');return true;
  }
  moveTo(target){return this.routeTo(target)}
  boardingSpots(){
    const c=Math.cos(this.truck.angle),s=Math.sin(this.truck.angle),spots=[];
    for(const [x,z] of [[-1.35,.65],[1.35,.65],[-1.6,0],[1.6,0],[0,-2.15],[0,2.15],[-2.1,0],[2.1,0]]){
      const p={x:this.truck.x+x*c+z*s,z:this.truck.z-x*s+z*c};
      if(walkable(p.x,p.z,{radius:.32,truck:this.truck}))spots.push(p);
    }
    return spots;
  }
  boardTruck(){
    if(this.riding)return false;
    const spots=this.boardingSpots().sort((a,b)=>Math.hypot(a.x-this.child.x,a.z-this.child.z)-Math.hypot(b.x-this.child.x,b.z-this.child.z));
    for(const spot of spots)if(this.routeTo(spot,{boarding:true}))return true;
    return false;
  }
  exitTruck(){
    if(!this.riding)return false;
    const spot=this.boardingSpots()[0];if(!spot)return false;
    this.child={...spot,angle:this.truck.angle};this.riding=false;this.mode='idle';
    this.path=[];this.target=null;this.boarding=false;this.fireMission=false;this.changed('exit');return true;
  }
  dispatch(){
    if(!this.riding||this.complete)return false;
    return this.routeTo(FIRE_STOP,{fireMission:true});
  }
  goHome(){return this.riding?this.moveTo(HOME):this.boardTruck()}
  update(dt){
    if(this.mode==='moving'){
      const actor=this.actor;let distance=dt*(this.riding?3.5:2.65);
      while(distance>0&&this.path.length){
        const next=this.path[0],dx=next.x-actor.x,dz=next.z-actor.z,len=Math.hypot(dx,dz);
        if(len>.001){const target=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(target-actor.angle),Math.cos(target-actor.angle));actor.angle+=delta*Math.min(1,dt*14)}
        if(len<=distance){actor.x=next.x;actor.z=next.z;this.path.shift();distance-=len}
        else{actor.x+=dx/len*distance;actor.z+=dz/len*distance;distance=0}
      }
      if(!this.path.length){
        if(this.boarding){this.riding=true;this.boarding=false;this.mode='idle';this.target=null;this.changed('board')}
        else{this.mode=this.riding&&this.fireMission&&!this.complete&&Math.hypot(actor.x-FIRE.x,actor.z-FIRE.z)<5?'extinguishing':'idle';this.target=null;this.changed('arrive')}
      }
    }
    if(this.mode==='extinguishing'&&this.riding){
      const target=Math.atan2(FIRE.x-this.truck.x,FIRE.z-this.truck.z),delta=Math.atan2(Math.sin(target-this.truck.angle),Math.cos(target-this.truck.angle));
      this.truck.angle+=delta*Math.min(1,dt*5);this.hp=Math.max(0,this.hp-dt*14);
      if(this.hp===0){this.complete=true;this.fireMission=false;this.mode='idle';this.changed('win')}
    }
  }
  snapshot(){return {mode:this.mode,riding:this.riding,boarding:this.boarding,fireRemaining:Math.round(this.hp),complete:this.complete,child:{...this.child},truck:{...this.truck}}}
}
