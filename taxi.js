import * as THREE from 'three';
import {TAXI_CUSTOMERS} from './taxi-layout.js';

export function createTaxiCustomers(scene,citizen,prepare){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=160;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff9db';ctx.strokeStyle='#d9a520';ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(5,5,246,125,32);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(108,127);ctx.lineTo(128,155);ctx.lineTo(148,127);ctx.fill();
  ctx.fillStyle='#574319';ctx.textAlign='center';ctx.font='bold 58px sans-serif';ctx.fillText('Taxi',128,70);ctx.font='35px sans-serif';ctx.fillText('🚕',128,112);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const customers=TAXI_CUSTOMERS.map((_,id)=>{
    const root=prepare(citizen.clone(true));
    root.traverse(o=>{if(o.isMesh&&o.material.name==='Citizen shirt'){o.material=o.material.clone();o.material.color.setHex([0xf2bd50,0x599fb4,0xcb799a,0x799653,0xdf8055,0x7f88b4][id])}});
    const limbs=['Arm_L','Arm_R','Leg_L','Leg_R'].map(n=>root.getObjectByName(n));
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));label.scale.set(2.8,1.75,1);label.position.set(0,3.25,0);label.renderOrder=4;root.add(label);scene.add(root);
    return {root,label,limbs};
  });
  return {customers,pickRoots:customers.map(p=>p.root),update(state){
    const t=state.taxi,car=state.services.taxi.car,time=state.city.time;
    customers.forEach((view,id)=>{
      const p=t.customers[id];view.root.visible=p.phase!=='aboard'&&(p.phase!=='delivered'||p.time<5);view.label.visible=p.phase==='waiting'&&Math.hypot(p.x-state.actor.x,p.z-state.actor.z)<85;
      let x=p.x,z=p.z,angle=Math.atan2(car.x-x,car.z-z),walking=false;
      if(p.phase==='boarding'){const k=Math.min(1,t.time/2.2);x+=(car.x-x)*k;z+=(car.z-z)*k;walking=true}
      if(p.phase==='unloading'){const k=Math.min(1,t.time/2.2);x=car.x+(p.drop.x-car.x)*k;z=car.z+(p.drop.z-car.z)*k;angle=p.drop.angle;walking=true}
      if(p.phase==='delivered'){x=p.drop.x;z=p.drop.z;angle=p.drop.angle}
      view.root.position.set(x,.13,z);view.root.rotation.y=angle;
      view.limbs.forEach((limb,j)=>{if(limb){limb.rotation.x=walking?Math.sin(time*7+j%2*Math.PI)*.4:0;limb.rotation.z=0}});
      if(!walking&&view.limbs[0])view.limbs[0].rotation.z=-1.9+Math.sin(time*4+id)*.2;
      view.label.position.y=3.25+Math.sin(time*2+id)*.08;
    });
  }};
}
