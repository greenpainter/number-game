import * as THREE from 'three';
import {trackPoint} from './railway-state.js';
import layout from './railway-layout.js';

export function groundHeight(x,z){const p=layout.platform;return Math.abs(x-p.x)<p.width/2&&Math.abs(z-p.z)<p.depth/2?.29:.13}
export async function createRailway(loader,scene,prepare){
  const assets=await Promise.all(['railway-track','train-platform','train-engine','train-carriage','pet-dog','pet-cat'].map(n=>loader.loadAsync(`./models/${n}.glb`)));
  const [track,platform,engine,carriage,dog,cat]=assets.map(a=>prepare(a.scene));
  const cars=[engine,carriage,carriage.clone(true)];
  const animals=[dog,cat].map((root,index)=>({root,id:layout.pets[index].id,tail:root.getObjectByName('PetTail'),legs:['FL','FR','RL','RR'].map(n=>root.getObjectByName('PetLeg_'+n))}));
  // A small heart appears when a pet joins the walk.
  const heartShape=new THREE.Shape();heartShape.moveTo(0,.05);heartShape.bezierCurveTo(-.4,.3,-.28,.6,0,.38);heartShape.bezierCurveTo(.28,.6,.4,.3,0,.05);
  for(const pet of animals){pet.heart=new THREE.Mesh(new THREE.ShapeGeometry(heartShape),new THREE.MeshBasicMaterial({color:0xf2858e,side:THREE.DoubleSide}));pet.heart.position.y=2;pet.root.add(pet.heart)}
  scene.add(track,platform,...cars,...animals.map(a=>a.root));
  return {track,platform,cars,animals,update(state,time,camera){
    cars.forEach((car,index)=>{const p=trackPoint(state.train.distance-[0,6.5,12.65][index]);car.position.set(p.x,.18,p.z);car.rotation.y=p.angle});
    for(const pet of animals){
      const p=state.pets.find(p=>p.id===pet.id),stride=p.moving?Math.sin(time*13)*.5:0;
      pet.root.position.set(p.x,groundHeight(p.x,p.z)+(p.moving?Math.abs(Math.sin(time*13))*.025:0),p.z);pet.root.rotation.y=p.angle;
      pet.legs.forEach((leg,index)=>{if(leg)leg.rotation.x=stride*([1,-1,-1,1][index])});
      if(pet.tail)pet.tail.rotation.z=Math.sin(time*(p.following?10:3))*(p.id==='dog'?.4:.18);
      pet.heart.visible=p.hello>0;pet.heart.position.y=1.8+(1.8-p.hello)*.3;pet.heart.quaternion.copy(camera.quaternion);pet.heart.rotateY(-p.angle);
    }
  }};
}
