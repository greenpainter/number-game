import * as THREE from 'three';
import {FOREST,VILLAGE_EVENTS} from './adventure-layout.js';

function pictogram(icon,size=1.7){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle='#fff9df';ctx.beginPath();ctx.arc(64,64,58,0,Math.PI*2);ctx.fill();ctx.lineWidth=5;ctx.strokeStyle='#278f76';ctx.stroke();ctx.font='68px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,64,68);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:true}));sprite.scale.set(size,size,1);return sprite;
}
export async function createAdventure(loader,scene,prepare,models,state){
  const world=prepare((await loader.loadAsync('./models/forest-events.glb')).scene);scene.add(world);world.updateMatrixWorld(true);
  const entries=VILLAGE_EVENTS.map(e=>{
    const root=world.getObjectByName('Event_'+e.id),marker=pictogram(e.icon,2.1);marker.position.set(e.entry.x,2.8,e.entry.z);scene.add(marker);
    const targets=e.targets.map((p,i)=>{
      const object=world.getObjectByName('Target_'+e.id+'_'+i),reward=world.getObjectByName('Reward_'+e.id+'_'+i);
      // Animate in world axes, preserving the exported geometry and its original pose.
      scene.attach(object);scene.attach(reward);reward.visible=false;
      const sign=pictogram(e.icon,1.3);sign.position.set(p.x,2.1,p.z);scene.add(sign);sign.visible=false;
      return {object,reward,sign,rest:object.position.clone(),rotation:object.quaternion.clone(),rewardRotation:reward.quaternion.clone()};
    });return {...e,root,marker,targets};
  });
  const animals=state.forest.animals.map(a=>{const root=prepare(models[a.species].clone(true));root.scale.setScalar(a.scale);scene.add(root);return {id:a.id,root,legs:['FL','FR','BL','BR'].map(n=>root.getObjectByName('Walk_'+n))}});
  const welcome=pictogram('🌳',3);welcome.position.set(FOREST.entry.x,3,FOREST.entry.z);scene.add(welcome);
  const heart=pictogram('💛',1);scene.add(heart);heart.visible=false;
  const trees=Array.from({length:64},(_,i)=>world.getObjectByName('ForestTree'+i));
  const treeMaterials=new Map(),treePositions=new Map();
  for(const tree of trees){
    const materials=[];tree.traverse(o=>{if(o.isMesh){const clone=m=>{const c=m.clone();c.transparent=true;materials.push(c);return c};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material)}});
    treeMaterials.set(tree,materials);treePositions.set(tree,tree.getWorldPosition(new THREE.Vector3()));
  }
  const bubbleGeo=new THREE.SphereGeometry(.17,10,8),bubbleMat=new THREE.MeshStandardMaterial({color:0xd5f5ff,transparent:true,opacity:.65,depthWrite:false});
  const bubbles=Array.from({length:14},()=>{const m=new THREE.Mesh(bubbleGeo,bubbleMat);scene.add(m);m.visible=false;return m});
  const wash=entries.find(e=>e.id==='carwash'),dirt=Array.from({length:3},(_,i)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:0x88755a,roughness:1}));m.scale.set(.3,.22,.025);m.position.set(wash.x+(i-1)*.72,.83,wash.z-.635);scene.add(m);return m});
  const confetti=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.12,.04),new THREE.MeshStandardMaterial({color:0xffd865}),24);confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(confetti);const temp=new THREE.Object3D();
  const spark=pictogram('📸',1.3);scene.add(spark);spark.visible=false;
  const guideLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xfaf2ca}));scene.add(guideLine);guideLine.visible=false;
  const hud=document.createElement('nav');hud.className='adventure-hud';hud.setAttribute('aria-label','마을 놀이 진행');hud.hidden=true;document.body.append(hud);
  let hudKey='',tone=null,lastBeat=-1,lastEvent=null;
  function drawHud(s){
    const key=[s.id,s.phase,s.step,s.finished.length].join(':');if(key===hudKey)return;hudKey=key;
    const e=VILLAGE_EVENTS.find(e=>e.id===s.id);hud.hidden=!e||s.phase==='idle';hud.replaceChildren();if(hud.hidden)return;
    const title=document.createElement('span');title.className='adventure-title';title.textContent=e.icon;title.title=e.name;hud.append(title);
    for(let i=0;i<3;i++){
      const b=document.createElement('button');b.textContent=i<s.step?'⭐':e.icon;b.disabled=i!==s.step||s.phase!=='ready';b.className=i===s.step?'next-step':'';b.setAttribute('aria-label',e.name+' '+(i+1)+'번째 행동');b.onclick=()=>state.eventTarget(e.id,i);hud.append(b);
    }
    const counter=document.createElement('small');counter.textContent='🏅 '+s.finished.length+'/20';hud.append(counter);
    const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','놀이 그만하기');close.disabled=s.phase==='action';close.onclick=()=>state.cancelAdventure();hud.append(close);
  }
  function beat(){if(!state.sound)return;try{tone??=new (window.AudioContext||window.webkitAudioContext)();tone.resume();const o=tone.createOscillator(),gain=tone.createGain();o.type='sine';o.frequency.setValueAtTime(170,tone.currentTime);o.frequency.exponentialRampToValueAtTime(55,tone.currentTime+.18);gain.gain.setValueAtTime(.14,tone.currentTime);gain.gain.exponentialRampToValueAtTime(.001,tone.currentTime+.23);o.connect(gain);gain.connect(tone.destination);o.start();o.stop(tone.currentTime+.24);o.onended=()=>{o.disconnect();gain.disconnect()}}catch{}}
  const pickRoots=[welcome,...entries.flatMap(e=>[e.root,e.marker,...e.targets.flatMap(t=>[t.object,t.sign])]),...animals.map(a=>a.root)];
  function actionFor(belongs){
    const animal=animals.find(a=>belongs(a.root));if(animal)return ()=>state.meetForestAnimal(animal.id);
    if(belongs(welcome))return ()=>{if(state.moveTo(FOREST.entry))state.cityNotice('동물 친구 숲에 왔어요. 동물을 누르면 인사하러 가요.')};
    for(const e of entries){
      const target=e.targets.findIndex(t=>belongs(t.object)||belongs(t.sign));
      if(target>=0)return ()=>state.adventure.id===e.id?state.eventTarget(e.id,target):state.startEvent(e.id);
      if(belongs(e.root)||belongs(e.marker))return ()=>state.startEvent(e.id);
    }
    return null;
  }
  const sight=new THREE.Vector3(),delta=new THREE.Vector3(),canopy=new THREE.Vector3(),eye=new THREE.Vector3();
  function obscures(point,p,camera){
    if(!camera)return false;eye.set(point.x,1.5,point.z);sight.subVectors(camera.position,eye);const length=sight.length();sight.divideScalar(length);canopy.set(p.x,5.3,p.z);delta.subVectors(canopy,eye);const t=delta.dot(sight);return t>0&&t<length&&delta.lengthSq()-t*t<4.6**2;
  }
  function update(state,child,limbs,ring,paused=false,camera=null){
    const s=state.adventure,time=state.city.time,active=entries.find(e=>e.id===s.id),progress=s.phase==='action'?Math.min(1,s.time/2.2):0;
    drawHud(s);guideLine.visible=false;spark.visible=false;
    for(const e of entries){
      const selected=e.id===s.id&&s.phase!=='idle',finished=selected?s.step:state.adventure.finished.includes(e.id)?3:0;
      e.marker.visible=!selected&&Math.hypot(e.x-state.actor.x,e.z-state.actor.z)<65;
      e.marker.position.y=2.8+Math.sin(time*2)*.08;
      e.targets.forEach((t,i)=>{
        t.object.position.copy(t.rest);t.object.quaternion.copy(t.rotation);t.object.scale.setScalar(1);
        t.object.visible=i>=finished;t.reward.visible=i<finished;t.reward.quaternion.copy(t.rewardRotation);
        if(e.id==='bowling'){t.reward.visible=true;if(i<finished)t.reward.rotateX(-Math.PI/2)}
        t.sign.visible=selected&&i===s.step&&s.phase==='ready';t.sign.position.y=2.2+Math.sin(time*4)*.18;
        if(selected&&i===s.step&&s.phase==='action'){
          const u=progress,x=e.x+(i-1)*2.2,z=e.z-1;
          if(['collect','deliver','feed','harvest','serve'].includes(e.kind)){
            t.object.position.lerp(new THREE.Vector3(x,1+Math.sin(u*Math.PI)*1.3,z),u);
          }else if(['kick','bowl','roll','escort'].includes(e.kind)){
            t.object.position.z-=u*3.5;t.object.rotateX(-u*Math.PI*3);if(e.kind==='escort')t.object.quaternion.copy(t.rotation);
          }else if(e.kind==='fly'){
            t.object.position.y+=u*5;t.object.position.z-=u*2;t.object.rotateX(-.6);
            const attr=guideLine.geometry.attributes.position;attr.setXYZ(0,child.position.x,1.6,child.position.z);attr.setXYZ(1,t.object.position.x,t.object.position.y+.5,t.object.position.z);attr.needsUpdate=true;guideLine.visible=true;guideLine.geometry.computeBoundingSphere();
          }else if(e.kind==='grow'){t.object.position.z-=u*2;t.object.scale.setScalar(1+u*.5)}
          else if(e.kind==='photo'){spark.visible=u>.3&&u<.7;spark.position.set(child.position.x,2.6,child.position.z)}
          else if(e.kind==='wash'){t.object.position.lerp(new THREE.Vector3(x,.83,e.z-.6),Math.min(1,u*3));t.object.position.x+=Math.sin(u*Math.PI*10)*.12}
          else {t.object.position.y+=Math.sin(u*Math.PI*6)*.12}
        }
      });
    }
    const action=active&&s.phase==='action';
    dirt.forEach((m,i)=>{m.visible=i>=(s.id==='carwash'?s.step:s.finished.includes('carwash')?3:0)});
    bubbles.forEach((b,i)=>{b.visible=!!action&&active.kind==='wash';if(b.visible){const age=(s.time*.7+i/14)%1;b.position.set(active.x+Math.sin(i*2)*1.3,1+age*2,active.z-1+Math.cos(i)*.6);b.scale.setScalar(.5+age)}});
    const celebrate=s.phase==='celebrate';confetti.visible=celebrate;
    if(celebrate){for(let i=0;i<24;i++){const t=(s.time+i*.04)%2.5;temp.position.set(child.position.x+Math.sin(i*2.4)*t,1+t*2-t*t*.65,child.position.z+Math.cos(i*2.4)*t);temp.rotation.set(t*4,i,t*3);temp.updateMatrix();confetti.setMatrixAt(i,temp.matrix)}confetti.instanceMatrix.needsUpdate=true}
    if(action){
      ring.visible=false;const wave=Math.sin(s.time*8);for(const side of ['L','R'])if(limbs['Arm_'+side])limbs['Arm_'+side].rotation.x=-.8+wave*.35;
      if(['harvest','grow','collect'].includes(active.kind))child.rotation.x=.16*Math.sin(progress*Math.PI);
      if(active.kind==='kick'&&limbs.Leg_R)limbs.Leg_R.rotation.x=-Math.sin(progress*Math.PI)*.9;
      if(active.kind==='music'&&!paused){const index=Math.floor(s.time*3);if(index!==lastBeat||lastEvent!==active.id){beat();lastBeat=index;lastEvent=active.id}}
    }else lastBeat=-1;
    const f=state.forest;
    for(let i=0;i<animals.length;i++){
      const p=f.animals[i],a=animals[i];a.root.position.set(p.x,.17+(p.moving&&p.species==='kangaroo'?Math.abs(Math.sin(p.stride))*.14:0),p.z);a.root.rotation.y=p.angle;
      a.legs.forEach((leg,j)=>{if(leg)leg.rotation.x=p.moving?Math.sin(p.stride+(j===0||j===3?0:Math.PI))*.2:0});
    }
    heart.visible=f.phase==='greet';
    if(heart.visible){const a=f.animals.find(a=>a.id===f.selected);heart.position.set(a.x,3+Math.sin(f.time*2)*.15,a.z);if(limbs.Arm_R)limbs.Arm_R.rotation.z=-1.5+Math.sin(f.time*8)*.2;ring.visible=false}
    const selectedAnimal=f.animals.find(a=>a.id===f.selected);
    trees.forEach(tree=>{const p=treePositions.get(tree),near=Math.hypot(p.x-state.actor.x,p.z-state.actor.z)<7||obscures(state.actor,p,camera)||selectedAnimal&&obscures(selectedAnimal,p,camera);for(const m of treeMaterials.get(tree)){m.opacity=near?.20:1;m.depthWrite=!near}if(tree.userData.faded!==near){tree.userData.faded=near;tree.traverse(o=>{if(o.isMesh)o.castShadow=!near})}});
  }
  return {world,entries,animals,pickRoots,actionFor,update};
}
