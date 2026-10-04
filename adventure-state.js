import {FOREST,FOREST_TREES,FOREST_SPECIES,VILLAGE_EVENTS} from './adventure-layout.js';
import {walkable,findPath} from './navigation.js';
import {ANIMAL_RADII} from './zoo-wildlife.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function forestClear(x,z,r=1.6){return x>FOREST.x-FOREST.width/2+r&&x<FOREST.x+FOREST.width/2-r&&z>FOREST.z-FOREST.depth/2+r&&z<FOREST.z+FOREST.depth/2-r&&FOREST_TREES.every(([tx,tz])=>Math.hypot(x-tx,z-tz)>r+.4)&&walkable(x,z,{radius:r})}
export function createForestAnimals(){return Array.from({length:16},(_,i)=>{
  const [species,name,icon,scale]=FOREST_SPECIES[i%8],z=-143+i*6.4,x=-233+Math.sin(i/15*Math.PI*3)*7;
  return {id:'forest-'+i,species,name,icon,scale,x,z,angle:0,stride:0,wait:i*.2,moving:false,seed:371+i*97,radius:ANIMAL_RADII[species]*scale,target:null};
})}
function random(a){a.seed=(Math.imul(a.seed,1664525)+1013904223)>>>0;return a.seed/4294967296}
export const adventureActions={
  resetAdventure(){this.pendingEvent=null;this.adventure={id:null,phase:'idle',step:0,time:0,finished:[],completed:0};this.forest={animals:createForestAnimals(),selected:null,phase:'idle',time:0,met:[],soundRequest:0}},
  cancelAdventure(){const s=this.adventure;if(this.adventureBusy)return false;const changed=s.phase!=='idle'||this.forest.phase!=='idle';if(['approach','walking'].includes(s.phase)||this.forest.phase==='approach'){this.path=[];this.target=null;this.mode='idle'}this.pendingEvent=null;s.phase='idle';s.id=null;this.forest.selected=null;this.forest.phase='idle';if(changed)this.changed('adventure');return true},
  startEvent(id){
    const e=VILLAGE_EVENTS.find(e=>e.id===id);if(!e||this.riding||this.activityLocked)return false;
    if(this.adventure.id===id&&this.adventure.phase!=='idle')return true;
    if(!this.moveTo(e.entry))return false;
    this.scooter=false;Object.assign(this.adventure,{id,phase:'approach',step:0,time:0});this.cityNotice(e.line);this.changed('adventure');return true;
  },
  eventTarget(id,step){
    const s=this.adventure,e=VILLAGE_EVENTS.find(e=>e.id===id);
    if(!e||s.id!==id||s.phase!=='ready'||s.step!==step||this.riding||this.activityLocked)return false;
    const path=findPath(this.child,e.stands[step],this.options);if(!path)return false;
    this.path=path;this.target={...e.stands[step]};this.mode='moving';s.phase='walking';this.changed('adventure');return true;
  },
  meetForestAnimal(id){
    const a=this.forest.animals.find(a=>a.id===id);if(!a||this.riding||this.activityLocked)return false;
    if(this.forest.selected===id&&this.forest.phase!=='idle')return true;
    const spots=[];for(let i=0;i<16;i++){const angle=i*Math.PI/8,p={x:a.x+Math.sin(angle)*(a.radius+1),z:a.z+Math.cos(angle)*(a.radius+1)};if(walkable(p.x,p.z,this.options))spots.push(p)}
    spots.sort((p,q)=>dist(this.child,p)-dist(this.child,q));
    for(const p of spots){if(!this.moveTo(p))continue;this.scooter=false;Object.assign(this.forest,{selected:id,phase:'approach',time:0});a.moving=false;a.target=null;return true}
    return false;
  },
  updateAdventure(dt){
    if(this.pendingEvent&&this.city.helicopter.phase==='idle'&&!this.riding){const id=this.pendingEvent;this.pendingEvent=null;const e=VILLAGE_EVENTS.find(e=>e.id===id);if(e&&dist(this.child,e.entry)<8)this.startEvent(id)}
    const s=this.adventure,e=VILLAGE_EVENTS.find(e=>e.id===s.id);
    if(e&&['approach','walking'].includes(s.phase)&&this.mode==='idle'&&!this.path.length){
      const destination=s.phase==='approach'?e.entry:e.stands[s.step];
      if(dist(this.child,destination)>.55){s.phase='idle';s.id=null;this.changed('adventure')}
      else if(s.phase==='approach'){s.phase='ready';this.changed('adventure')}
      else {s.phase='action';s.time=0;this.mode='event';this.child.angle=Math.PI;this.changed('adventure')}
    }
    if(e&&s.phase==='action'){
      s.time+=dt;
      if(s.time>=2.2){s.step++;s.time=0;this.mode='idle';
        if(s.step===3){s.phase='celebrate';s.completed++;if(!s.finished.includes(e.id))s.finished.push(e.id);this.cityNotice(e.done);this.changed('event-complete')}
        else{s.phase='ready';this.changed('adventure')}
      }
    }else if(s.phase==='celebrate'){s.time+=dt;if(s.time>3){s.phase='idle';s.id=null;this.changed('adventure')}}
    const f=this.forest,a=f.animals.find(a=>a.id===f.selected);
    if(f.phase==='approach'&&a&&this.mode==='idle'&&!this.path.length){
      if(dist(this.child,a)<a.radius+2){f.phase='greet';f.time=0;f.soundRequest++;this.mode='greeting';this.child.angle=Math.atan2(a.x-this.child.x,a.z-this.child.z);a.angle=this.child.angle+Math.PI;this.cityNotice(a.name+' 친구야, 안녕!');if(!f.met.includes(a.species))f.met.push(a.species);this.changed('forest-meet')}
      else {f.phase='idle';f.selected=null}
    }
    if(f.phase==='greet'){f.time+=dt;if(f.time>3){f.phase='idle';f.selected=null;this.mode='idle';this.changed('adventure')}}
    // Substeps prevent tunnelling at low frame rates; animals avoid trees and each other.
    let remaining=Math.min(dt,1);while(remaining>0){const step=Math.min(.05,remaining);remaining-=step;
      for(const a of f.animals){
        if(a.id===f.selected){a.moving=false;continue}
        a.wait-=step;if(a.wait>0){a.moving=false;continue}
        if(!a.target){for(let i=0;i<12;i++){const p={x:a.x+(random(a)-.5)*15,z:a.z+(random(a)-.5)*15};if(forestClear(p.x,p.z,a.radius)){a.target=p;break}}if(!a.target){a.wait=.8;continue}}
        const d=dist(a,a.target);if(d<.15){a.target=null;a.wait=1+random(a)*3;a.moving=false;continue}
        const angle=Math.atan2(a.target.x-a.x,a.target.z-a.z),turn=Math.atan2(Math.sin(angle-a.angle),Math.cos(angle-a.angle));a.angle+=Math.max(-step*2,Math.min(step*2,turn));
        const speed=a.species==='tortoise'?.36:.85,travel=Math.min(d,speed*step),x=a.x+Math.sin(angle)*travel,z=a.z+Math.cos(angle)*travel;
        if(Math.abs(turn)>.35){a.moving=false;continue}
        const safe=forestClear(x,z,a.radius)&&f.animals.every(b=>a===b||Math.hypot(x-b.x,z-b.z)>a.radius+b.radius+.15)&&Math.hypot(x-this.child.x,z-this.child.z)>a.radius+.55;
        if(!safe){a.target=null;a.wait=.7;a.moving=false;continue}
        a.x=x;a.z=z;a.moving=true;a.stride+=step*(a.species==='tortoise'?2:5);
      }
    }
  },
};
