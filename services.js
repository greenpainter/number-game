import * as THREE from 'three';
import {SERVICES,ICE_VAN} from './navigation.js';
export async function createServices(loader,scene,prepare,child,limbs){
  const names=['civic-ground-rect','police-station','hospital-station','policecar','ambulance','icecream'];
  const assets=await Promise.all(names.map(n=>loader.loadAsync(`./models/${n}.glb`)));
  const models=Object.fromEntries(names.map((n,i)=>{const root=prepare(assets[i].scene);scene.add(root);return[n,root]}));
  const entries={};
  for(const [id,c] of Object.entries(SERVICES)){
    const building=models[id==='police'?'police-station':'hospital-station'],car=models[id==='police'?'policecar':'ambulance'];
    building.position.set(c.building.x,.13,c.building.z);
    const lights=[];car.traverse(o=>{if(o.isMesh&&['red','blue'].includes(o.material.name)){o.material=o.material.clone();o.material.emissive.copy(o.material.color);lights.push(o.material)}});
    entries[id]={building,car,door:building.getObjectByName('Door'),lights};
  }
  const van=models.icecream;van.position.set(ICE_VAN.x,.13,ICE_VAN.z);van.rotation.y=-Math.PI/2;
  // A hand-held cone is kept separate from the child's original outfit.
  const cone=new THREE.Group();child.add(cone);
  const wafer=new THREE.Mesh(new THREE.ConeGeometry(.1,.26,10),new THREE.MeshStandardMaterial({color:0xdca15b}));wafer.rotation.z=Math.PI;cone.add(wafer);
  const scoops=[];
  for(const [y,color,r] of [[.17,0xfff0bf,.15],[.34,0xff69a0,.13]]){const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),new THREE.MeshStandardMaterial({color}));o.position.y=y;cone.add(o);scoops.push(o)}
  cone.visible=false;const hand=new THREE.Vector3();
  return {entries,van,ground:models['civic-ground-rect'],update(state,time){
    for(const [id,v] of Object.entries(entries)){
      const s=state.services[id];v.car.position.set(s.car.x,.13,s.car.z);v.car.rotation.y=s.car.angle;v.door.scale.y=Math.max(.025,1-s.door);
      const active=s.phase==='occupied'||['outgoing','returning','entering'].includes(s.phase);
      v.lights.forEach((m,i)=>m.emissiveIntensity=active&&Math.floor(time*5)%2===i?2.5:0);
    }
    const eating=state.mode==='eating';cone.visible=eating;
    if(limbs.Arm_R)limbs.Arm_R.rotation.z=eating?-.5:0;
    if(eating&&limbs.Arm_R){
      const bite=Math.sin(state.eatTime*5),raise=Math.min(1,state.eatTime*2);
      limbs.Arm_R.rotation.x=(-1.85+Math.max(0,bite)*.2)*raise;
      child.updateMatrixWorld(true);hand.set(0,-.43,.02);limbs.Arm_R.localToWorld(hand);child.worldToLocal(hand);cone.position.copy(hand);cone.rotation.set(0,0,-.14);
      scoops.forEach((o,i)=>o.scale.setScalar(Math.max(.02,Math.min(1,(5-state.eatTime)/(i?2.8:4.5)))));
    }
  }};
}
