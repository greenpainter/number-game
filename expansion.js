import * as THREE from 'three';
import {BUS_SPOTS,EXCAVATOR,DROP_POINT} from './navigation.js';

export async function createExpansion(loader,scene,prepare){
  const assets=await Promise.all(['expansion-rect','bus','dumptruck','excavator'].map(name=>loader.loadAsync(`./models/${name}.glb`)));
  const ground=prepare(assets[0].scene);scene.add(ground);
  const pad=ground.getObjectByName('UnloadPad');
  const buses=BUS_SPOTS.map((p,i)=>{
    const bus=prepare(assets[1].scene.clone(true));bus.position.set(p.x,.13,p.z);
    bus.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name==='buspaint')o.material.color.setHex([0xe64132,0x2588dd,0x27ae62][i])}});
    scene.add(bus);return bus;
  });
  const dump=prepare(assets[2].scene);scene.add(dump);
  const bed=dump.getObjectByName('DumpBed'),gate=dump.getObjectByName('Tailgate');
  const excavator=prepare(assets[3].scene);excavator.position.set(EXCAVATOR.x,.13,EXCAVATOR.z);scene.add(excavator);
  const turn=excavator.getObjectByName('ExcavatorTurn'),boom=excavator.getObjectByName('Boom'),stick=excavator.getObjectByName('Stick'),bucket=excavator.getObjectByName('Bucket');
  const dirtMaterial=new THREE.MeshStandardMaterial({color:0x996126,roughness:1});
  const dirtGeometry=new THREE.IcosahedronGeometry(1,1);
  const cargo=new THREE.Mesh(dirtGeometry,dirtMaterial);cargo.castShadow=true;cargo.receiveShadow=true;bed.add(cargo);
  const scoop=new THREE.Mesh(dirtGeometry,dirtMaterial);scoop.scale.set(.43,.23,.33);scoop.position.set(0,-.09,.22);bucket.add(scoop);
  const pile=new THREE.Group();pile.position.set(DROP_POINT.x,.13,DROP_POINT.z);scene.add(pile);
  for(let i=0;i<5;i++){
    const clod=new THREE.Mesh(dirtGeometry,dirtMaterial);clod.position.set(Math.sin(i*2.4)*.75,.25,Math.cos(i*2.4)*.6);clod.scale.set(1,.6,.9);clod.castShadow=true;clod.receiveShadow=true;pile.add(clod);
  }
  const falling=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.13,0),dirtMaterial,34);falling.frustumCulled=false;falling.castShadow=true;scene.add(falling);
  const temp=new THREE.Object3D(),from=new THREE.Vector3(),to=new THREE.Vector3();
  const smooth=(a,b,t)=>THREE.MathUtils.lerp(a,b,t*t*(3-2*t));
  function arm(distance,height,dt){
    const l1=2.6,l2=2.3,r=Math.min(4.85,Math.hypot(distance,height));
    const shoulder=Math.atan2(height,distance)+Math.acos(THREE.MathUtils.clamp((r*r+l1*l1-l2*l2)/(2*r*l1),-1,1));
    const elbow=-Math.acos(THREE.MathUtils.clamp((r*r-l1*l1-l2*l2)/(2*l1*l2),-1,1));
    const t=1-Math.exp(-dt*12);
    boom.rotation.x=THREE.MathUtils.lerp(boom.rotation.x,-shoulder,t);stick.rotation.x=THREE.MathUtils.lerp(stick.rotation.x,-elbow,t);
    return shoulder+elbow;
  }
  function update(state,time,dt){
    buses.forEach((bus,i)=>{const car=state.buses[i].car;bus.position.set(car.x,.13,car.z);bus.rotation.y=car.angle});
    dump.position.set(state.dump.x,.13,state.dump.z);dump.rotation.y=state.dump.angle;
    const unloading=state.mode==='unloading'&&state.drivingDump,loading=state.mode==='loading'&&state.drivingDump;
    const t=state.workTime;
    const tip=unloading?(t<1.2?smooth(0,.98,t/1.2):t<3.2?.98:smooth(.98,0,Math.min(1,(t-3.2)/1.3))):0;
    bed.rotation.x=-tip;gate.rotation.x=tip*1.1;
    cargo.visible=state.cargo>0;cargo.scale.set(.83,.17+state.cargo*.1,1.09);cargo.position.set(0,.18+state.cargo*.07,1.25);
    pile.visible=state.delivered>0;pile.scale.set(1+Math.min(state.delivered,15)*.015,Math.min(2.8,.35+state.delivered*.14),1+Math.min(state.delivered,15)*.015);
    const cycle=(t%4)/4;
    let yaw=Math.PI,distance=3.75,height=-.75,curl=0;
    if(loading){
      if(cycle<.18){distance=3.75;height=smooth(-.75,-.9,cycle/.18);curl=.15}
      else if(cycle<.4){distance=smooth(3.75,2.8,(cycle-.18)/.22);height=smooth(-.9,2.4,(cycle-.18)/.22)}
      else if(cycle<.62){yaw=smooth(Math.PI,Math.PI*1.5,(cycle-.4)/.22);distance=smooth(2.8,4,(cycle-.4)/.22);height=smooth(2.4,1.15,(cycle-.4)/.22)}
      else if(cycle<.8){yaw=Math.PI*1.5;distance=4;height=1.15;curl=smooth(0,.95,(cycle-.62)/.18)}
      else{yaw=smooth(Math.PI*1.5,Math.PI,(cycle-.8)/.2);distance=smooth(4,3.75,(cycle-.8)/.2);height=smooth(1.15,-.75,(cycle-.8)/.2)}
    }
    turn.rotation.y=THREE.MathUtils.lerp(turn.rotation.y,yaw,1-Math.exp(-dt*12));
    bucket.rotation.x=arm(distance,height,dt)+curl;
    scoop.visible=loading&&cycle>.16&&cycle<.72;
    falling.visible=(loading&&cycle>.65&&cycle<.8)||(unloading&&t>1.4&&t<2.7);
    if(falling.visible){
      scene.updateMatrixWorld(true);
      if(loading){bucket.localToWorld(from.set(0,-.1,.45));bed.localToWorld(to.set(0,.35,1.25))}
      else{bed.localToWorld(from.set(0,.12,-.1));to.set(DROP_POINT.x,.45,DROP_POINT.z)}
      for(let i=0;i<34;i++){
        const q=(time*1.8+i/34)%1;temp.position.lerpVectors(from,to,q);temp.position.x+=Math.sin(i*7)*.22*q;temp.position.z+=Math.cos(i*4)*.2*q;temp.scale.setScalar(.6+(i%4)*.15);temp.rotation.set(time+i,i,0);temp.updateMatrix();falling.setMatrixAt(i,temp.matrix);
      }falling.instanceMatrix.needsUpdate=true;
    }
  }
  return {ground,pad,buses,dump,excavator,pile,update};
}
