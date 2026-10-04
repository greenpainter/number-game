import * as THREE from 'three';
import {PLAY_ACTIVITIES,playPose} from './playground-layout.js';

export async function createPlayground(loader,scene,prepare){
  const world=prepare((await loader.loadAsync('./models/playground.glb')).scene);scene.add(world);
  const entries=PLAY_ACTIVITIES.map(p=>({...p,root:world.getObjectByName('Play_'+p.id)}));
  const part=name=>world.getObjectByName(name);
  const swing=part('SwingSeat'),seesaw=part('SeeBeam'),carousel=part('CarouselDeck'),zip=part('ZipSeat'),balloon=part('BalloonBasket'),car=part('PedalCar'),flowers=part('Flowers');
  const canopy=part('CarouselCanopy');
  if(canopy)canopy.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()});
  // Exported empty pivots use the same Y-up coordinates as the game.
  const rests=new Map([swing,seesaw,carousel,zip,balloon,car,flowers].map(o=>[o,{q:o.quaternion.clone(),p:o.position.clone()}]));
  const xAxis=new THREE.Vector3(1,0,0),yAxis=new THREE.Vector3(0,1,0),zAxis=new THREE.Vector3(0,0,1);
  function turn(o,axis,angle){o.quaternion.copy(rests.get(o).q);o.rotateOnAxis(axis,angle)}
  function shift(o,x,y,z){o.position.copy(rests.get(o).p).add(new THREE.Vector3(x,y,z))}
  // Large pictograms above the toys make the park usable without reading.
  for(const p of entries){
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fffbea';ctx.beginPath();ctx.arc(64,64,57,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#378977';ctx.lineWidth=5;ctx.stroke();ctx.font='68px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.icon,64,68);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const badge=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));
    // Sprite attached to a scene-level interaction root, avoiding GLB axis flips.
    const marker=new THREE.Group();marker.add(badge);badge.scale.set(2,2,1);marker.position.set(p.entry.x,3,p.entry.z);marker.userData.playId=p.id;scene.add(marker);p.marker=marker;
  }
  const bubbleGeo=new THREE.SphereGeometry(1,12,8),bubbleMats=[0xcbeffa,0xf9d5e5,0xf9edb6].map(color=>new THREE.MeshPhysicalMaterial({color,transparent:true,opacity:.44,roughness:.13,metalness:.05,depthWrite:false}));
  const bubbles=Array.from({length:14},(_,i)=>{const mesh=new THREE.Mesh(bubbleGeo,bubbleMats[i%3]);scene.add(mesh);mesh.visible=false;return mesh});
  const drops=Array.from({length:12},()=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.045,6,4),new THREE.MeshBasicMaterial({color:0x7bcdda}));scene.add(mesh);mesh.visible=false;return mesh});
  const toolPaint=new THREE.MeshStandardMaterial({color:0x309b99,roughness:.5});
  const wateringCan=new THREE.Group(),canBody=new THREE.Mesh(new THREE.CylinderGeometry(.22,.24,.38,16),toolPaint);wateringCan.add(canBody);
  const spout=new THREE.Mesh(new THREE.CylinderGeometry(.045,.065,.48,10),toolPaint);spout.rotation.x=-Math.PI/3;spout.position.set(0,.03,-.30);wateringCan.add(spout);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.22,.035,8,18),toolPaint);handle.position.set(0,.16,.15);wateringCan.add(handle);scene.add(wateringCan);
  const wand=new THREE.Group(),wandRing=new THREE.Mesh(new THREE.TorusGeometry(.16,.026,8,20),new THREE.MeshStandardMaterial({color:0xf4b24d}));wand.add(wandRing);
  const wandStick=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.3,8),toolPaint);wandStick.position.y=-.29;wand.add(wandStick);scene.add(wand);
  const pickRoots=[world,...entries.map(p=>p.marker)];
  function update(state,child,limbs,ring){
    const s=state.play,active=state.playing,time=s.time,id=active?s.id:null;
    const activity=PLAY_ACTIVITIES.find(p=>p.id===id),mechanism=activity?playPose(id,s.phase==='active'?time:s.phase==='boarding'?0:activity.duration):null;
    for(const [o,r] of rests){o.position.copy(r.p);o.quaternion.copy(r.q)}
    if(id==='swing')turn(swing,xAxis,-mechanism.tilt);
    if(id==='seesaw')turn(seesaw,zAxis,mechanism.tilt);
    if(id==='carousel')turn(carousel,yAxis,mechanism.angle);
    if(canopy)canopy.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.transparent=id==='carousel';m.opacity=id==='carousel'?.16:1;m.depthWrite=id!=='carousel'}});
    shift(zip,0,0,id==='zipline'?(mechanism.z-8):-4.6);
    shift(balloon,0,id==='balloon'?Math.max(0,mechanism.height-.35):0,0);
    const pedal=PLAY_ACTIVITIES.find(p=>p.id==='pedalcar'),cp=id==='pedalcar'?mechanism:playPose('pedalcar',0);
    shift(car,cp.x-pedal.x,0,cp.z-pedal.z);turn(car,yAxis,cp.angle);
    flowers.scale.setScalar(id==='garden'?.75+Math.min(1,time/8)*.25:1);
    entries.forEach(p=>{p.marker.visible=!active});
    wateringCan.visible=id==='garden'&&s.phase==='active';wateringCan.position.set(362.2,1.25,9.7);wateringCan.rotation.x=-.35;
    wand.visible=id==='bubbles'&&s.phase==='active';wand.position.set(375.7,1.7,-7.15);
    bubbles.forEach((b,i)=>{b.visible=id==='bubbles'&&s.phase==='active';if(!b.visible)return;const age=(time+i*.33)%3;b.position.set(376+Math.sin(i*4)*age*.65,1.7+age*.85,-6.5-age);b.scale.setScalar(.12+age*.14)});
    drops.forEach((d,i)=>{d.visible=id==='garden'&&s.phase==='active';const t=(time*1.8+i/12)%1;d.position.set(362+.2+Math.sin(i)*.18,1.25-t*.7,9.6-t*1.5)});
    if(!active||!s.pose)return;
    const p=s.pose;child.position.set(p.x,.13+p.height,p.z);child.rotation.set(id==='swing'?-p.tilt:0,p.angle,0);ring.visible=false;
    for(const side of ['L','R']){
      if(limbs['Arm_'+side])limbs['Arm_'+side].rotation.set(p.arm??0,0,0);
      if(limbs['Leg_'+side])limbs['Leg_'+side].rotation.x=p.seated?-1.35:0;
      if(limbs['Knee_'+side])limbs['Knee_'+side].rotation.x=p.seated?1.25:0;
    }
    if(id==='pedalcar')for(const [side,offset] of [['L',0],['R',Math.PI]]){limbs['Leg_'+side].rotation.x=-1.2+Math.sin(time*7+offset)*.22;limbs['Knee_'+side].rotation.x=1.2-Math.sin(time*7+offset)*.22}
    if(id==='slide'&&!p.seated&&s.phase==='active')for(const [side,offset] of [['L',0],['R',Math.PI]]){limbs['Leg_'+side].rotation.x=Math.sin(time*8+offset)*.55;limbs['Knee_'+side].rotation.x=Math.max(0,Math.sin(time*8+offset))*.7}
  }
  return {world,entries,pickRoots,update};
}
