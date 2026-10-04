import layout from './city-layout.js';

export const ANIMAL_RADII={elephant:3.65,giraffe:2.8,zebra:2.8,lion:2.9,panda:2.9,penguin:1.65,hippo:2.95,rhino:3.25,bear:2.9,flamingo:1.7,kangaroo:3.2,tortoise:2.6};
const sizes=ANIMAL_RADII;
const speeds={elephant:.7,giraffe:.82,zebra:1.0,lion:.8,panda:.6,penguin:.58,hippo:.55,rhino:.68,bear:.65,flamingo:.62,kangaroo:1.15,tortoise:.22};
const habitats=new Map(layout.zoo.habitats.map(h=>[h.id,h]));
function random(a){a.seed=(Math.imul(a.seed,1664525)+1013904223)>>>0;return a.seed/4294967296}
export function habitatClear(a,x,z){
  const h=habitats.get(a.habitat),r=a.radius+.25,dx=x-h.x,dz=z-h.z;
  if(Math.abs(dx)>h.width/2-r||Math.abs(dz)>h.depth/2-r)return false;
  const wet=['elephant','hippo','penguin','flamingo'].includes(a.species);
  if(((dx-9)/((wet?5:3.1)+r))**2+((dz+7)/((wet?4:2.2)+r))**2<1)return false;
  for(const [ox,oz,rr] of [[-11,-8,1.0],[11,9,1.0],[-9,8,1.8],[-12,5,1.8],[-3,-10,.3],[3,-10,.3]])if(Math.hypot(dx-ox,dz-oz)<r+rr)return false;
  // Bears and pandas have climbing logs across the back of their habitat.
  if(['bear','panda'].includes(a.species)&&dx>-4.4-r&&dx<4.4+r&&dz>-7.4-r&&dz<-2.6+r)return false;
  return true;
}
function clear(a,x,z,animals){return habitatClear(a,x,z)&&animals.every(b=>b===a||b.habitat!==a.habitat||Math.hypot(x-b.x,z-b.z)>a.radius+b.radius+.3)}
function segmentClear(a,x,z,animals){const n=Math.ceil(Math.hypot(x-a.x,z-a.z)/.4);for(let i=1;i<=n;i++)if(!clear(a,a.x+(x-a.x)*i/n,a.z+(z-a.z)*i/n,animals))return false;return true}
export function createZooAnimals(){
  const animals=[];
  for(const [i,def] of layout.zoo.animals.entries()){
    const a={...def,radius:sizes[def.species]*def.scale,angle:0,speed:speeds[def.species],seed:1907+i*991,wait:i%3*.8,target:null,moving:false,stride:0};
    const h=habitats.get(a.habitat);
    if(!clear(a,a.x,a.z,animals)){
      // Start on clear land, including the body footprint of larger animals.
      let placed=false;
      for(let z=-10;z<=10&&!placed;z+=1)for(let x=-12;x<=12&&!placed;x+=1)if(clear(a,h.x+x,h.z+z,animals)){a.x=h.x+x;a.z=h.z+z;placed=true}
      if(!placed)throw new Error('No safe animal spawn: '+a.id);
    }
    animals.push(a);
  }
  return animals;
}
export function updateZooAnimals(animals,dt){
  // Bounded substeps prevent a long frame from stepping through a fence/animal.
  const steps=Math.max(1,Math.ceil(dt/.05)),step=dt/steps;
  for(let j=0;j<steps;j++)for(const a of animals){
    a.moving=false;
    if(a.wait>0){a.wait-=step;continue}
    if(!a.target){
      const h=habitats.get(a.habitat);
      for(let k=0;k<36;k++){
        const x=h.x+(random(a)-.5)*(h.width-2*a.radius-1),z=h.z+(random(a)-.5)*(h.depth-2*a.radius-1);
        if(Math.hypot(x-a.x,z-a.z)>3&&segmentClear(a,x,z,animals)){a.target={x,z};break}
      }
      if(!a.target){a.wait=.5+random(a);continue}
    }
    const dx=a.target.x-a.x,dz=a.target.z-a.z,d=Math.hypot(dx,dz),desired=Math.atan2(dx,dz);
    const turn=Math.atan2(Math.sin(desired-a.angle),Math.cos(desired-a.angle));a.angle+=Math.max(-step*1.8,Math.min(step*1.8,turn));
    if(Math.abs(turn)>.2)continue;
    const distance=Math.min(d,a.speed*step),x=a.x+dx/d*distance,z=a.z+dz/d*distance;
    if(!clear(a,x,z,animals)){a.target=null;a.wait=.6+random(a);continue}
    a.x=x;a.z=z;a.moving=true;a.stride+=distance*(a.species==='tortoise'?6:5);
    if(d<.08){a.target=null;a.wait=1.5+random(a)*3;a.moving=false}
  }
}
