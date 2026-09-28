import * as THREE from 'three';
import layout from './city-layout.js';

export async function createCity(loader,scene,prepare){
  const names=['world','car','plane','helicopter','citizen',...layout.zoo.animals.map(a=>a.id)];
  const assets=await Promise.all(names.map(n=>loader.loadAsync(`./models/city-${n}.glb`)));
  const models=Object.fromEntries(names.map((n,i)=>[n,prepare(assets[i].scene)]));
  const world=models.world;scene.add(world);
  const colors=[0xf2cd66,0xdf6d51,0x82a4b2,0xe8e1ce,0x679480,0xa193b8];
  function car(index){const root=prepare(models.car.clone(true));root.traverse(o=>{if(o.isMesh&&o.material.name==='Traffic paint'){o.material=o.material.clone();o.material.color.setHex(colors[index%colors.length])}});scene.add(root);return root}
  const parked=layout.parkedCars.map(([x,z,angle],i)=>{const root=car(i);root.position.set(x,.13,z);root.rotation.y=angle;return root});
  const traffic=Array.from({length:12},(_,i)=>car(i+2));
  function person(index,thief=false){
    const root=prepare(models.citizen.clone(true));
    root.traverse(o=>{if(o.isMesh&&o.material.name==='Citizen shirt'){o.material=o.material.clone();o.material.color.setHex(thief?0x333b47:colors[index%colors.length])}});
    const limbs=['Arm_L','Arm_R','Leg_L','Leg_R'].map(n=>root.getObjectByName(n));
    if(thief){
      const bag=new THREE.Mesh(new THREE.SphereGeometry(.32,8,6),new THREE.MeshStandardMaterial({color:0x856342}));bag.position.set(.43,.88,-.2);root.add(bag);
      const stripeMat=new THREE.MeshStandardMaterial({color:0xf2eadc});
      for(const y of [.96,1.12,1.28]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(.55,.07,.37),stripeMat);stripe.position.y=y;root.add(stripe)}
    }
    scene.add(root);return {root,limbs};
  }
  const people=layout.walkRoutes.map((_,i)=>person(i)),thieves=layout.thiefRoutes.map((_,i)=>person(i,true));
  const animals=layout.zoo.animals.map(a=>{const root=models[a.id];root.position.set(a.x,.13,a.z);scene.add(root);return {root,...a}});
  const plane=models.plane;scene.add(plane);
  const helicopter=models.helicopter;scene.add(helicopter);
  const rotor=helicopter.getObjectByName('MainRotor'),tailRotor=helicopter.getObjectByName('TailRotor');
  const landingRing=new THREE.Mesh(new THREE.RingGeometry(2.5,2.62,48),new THREE.MeshBasicMaterial({color:0xffdc87,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}));landingRing.rotation.x=-Math.PI/2;scene.add(landingRing);
  const caveLights=[-10,0,10].map(x=>{const light=new THREE.PointLight(0xffbf70,12,14,1.5);light.position.set(x,3,-88);scene.add(light);return light});
  const bridge=world.getObjectByName('Overpass');
  const airport=world.getObjectByName('Airport'),zoo=world.getObjectByName('Zoo'),roof=world.getObjectByName('TunnelRoof'),mountain=world.getObjectByName('TunnelMountain');
  const pickRoots=[world,plane,...animals.map(a=>a.root),...thieves.map(p=>p.root),...parked];
  function pose(p,state,time){p.root.position.set(state.car.x,.13,state.car.z);p.root.rotation.y=state.car.angle;p.limbs.forEach((limb,i)=>{if(limb)limb.rotation.x=state.moving?Math.sin(time*7+i%2*Math.PI)*.42:0})}
  return {world,plane,airport,zoo,bridge,animals,thieves,pickRoots,update(state){
    const c=state.city,time=c.time;
    traffic.forEach((root,i)=>{const p=c.traffic[i].car;root.position.set(p.x,.19+(p.height??0),p.z);root.rotation.y=p.angle});
    people.forEach((p,i)=>pose(p,c.people[i],time+i));
    thieves.forEach((p,i)=>{const t=c.thieves[i];p.root.visible=t.phase!=='caught';pose(p,{car:t.car,moving:t.phase!=='caught'},time*1.6)});
    const p=c.plane.car;plane.position.set(p.x,.13+p.height,p.z);plane.rotation.y=p.angle;
    const h=c.helicopter;helicopter.visible=h.phase!=='idle'&&h.phase!=='waiting';helicopter.position.set(h.car.x,.2+h.car.height,h.car.z);helicopter.rotation.y=h.car.angle;
    if(rotor)rotor.rotation.y=time*32;if(tailRotor)tailRotor.rotation.x=time*40;
    landingRing.visible=helicopter.visible&&h.car.height<15;landingRing.position.set(h.car.x,.28,h.car.z);landingRing.scale.setScalar(1+h.car.height*.08);
    for(const a of animals){a.root.rotation.y=Math.sin(time*.26+a.x)*.18;a.root.position.y=.13+Math.sin(time*1.2+a.z)*.035}
    const tunnelOutside=Math.abs(state.actor.x)>19||Math.abs(state.actor.z+85)>7||(state.actor.height??0)>4;
    if(roof)roof.visible=tunnelOutside;
    if(mountain)mountain.visible=tunnelOutside;
    caveLights.forEach(l=>l.visible=!tunnelOutside);
  }};
}
