import layout from './railway-layout.js';
import {findPath,walkable} from './navigation.js';

export const petActions={
  resetPets(){this.pets=layout.pets.map(p=>({...p,angle:0,following:false,path:[],repath:0,moving:false,hello:0}));},
  followPet(id){
    const pet=this.pets.find(p=>p.id===id);if(!pet||this.riding)return false;
    if(pet.following){pet.hello=1.8;return true}
    pet.following=true;pet.repath=0;pet.hello=1.8;this.changed(id==='dog'?'dog-follow':'cat-follow');return true;
  },
  updatePets(dt,travel){
    for(const [index,pet] of this.pets.entries()){
      pet.hello=Math.max(0,pet.hello-dt);pet.moving=false;
      if(!pet.following)continue;
      // Pets wait safely while the child rides, then walk over again after dismounting.
      if(this.riding){pet.path=[];pet.repath=0;continue}
      const distance=Math.hypot(pet.x-this.child.x,pet.z-this.child.z),standOff=1.6+index*1.85;
      pet.repath-=dt;
      if(distance<=standOff+.08){pet.path=[];continue}
      const options={radius:.23,vehicles:this.otherVehicles(null)};
      if(pet.repath<=0){pet.path=findPath(pet,this.child,options)??[];pet.repath=.9+index*.12}
      if(!pet.path.length)continue;
      const next={...pet},path=pet.path.map(p=>({...p}));
      travel(next,path,Math.min(dt*(distance>8?5:3.65),Math.max(0,distance-standOff)),dt);
      if(walkable(next.x,next.z,options)){pet.x=next.x;pet.z=next.z;pet.angle=next.angle;pet.path=path;pet.moving=true}
      else{pet.path=[];pet.repath=Math.min(pet.repath,.3)}
    }
  },
};
