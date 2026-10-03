import * as THREE from 'three';
import layout from './waterfront-layout.js';
import {riverX} from './river-geometry.js';
import {METRO_TRAIN_Z} from './metro-path.js';
import {METRO_ICONS,nextMetroStation} from './metro-loop.js';

function sign(text,width=5){
  const c=document.createElement('canvas');c.width=768;c.height=160;
  const g=c.getContext('2d');g.fillStyle='#07566b';g.fillRect(0,0,768,160);g.fillStyle='#fff7df';g.font='bold 68px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,384,80,730);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));s.scale.set(width,width*160/768,1);return s;
}

export async function createWaterfront(loader,scene,prepare){
  const names=['waterfront-world','metro-entrance','metro-train','metro-tunnel','river-ferry','metro-stairs'];
  const assets=await Promise.all(names.map(n=>loader.loadAsync(`./models/${n}.glb`)));
  const [world,entrance,train,tunnel,boat,stairs]=assets.map(a=>prepare(a.scene));scene.add(world,boat);
  // The deck and terrain share one export; its broad lawn must not shadow itself.
  world.getObjectByName('RiverDistrict')?.traverse(o=>{if(o.isMesh)o.castShadow=false});
  const ripples=new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3,.10),new THREE.MeshBasicMaterial({color:0xe2f9f4,transparent:true,opacity:.17,depthWrite:false}),80);
  const dummy=new THREE.Object3D();
  for(let i=0;i<80;i++){const z=-170+i*4.35;dummy.position.set(riverX(z)+Math.sin(i*13)*8,-.065,z);dummy.rotation.x=-Math.PI/2;dummy.scale.set(.6+(i%4)*.22,1,1);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix)}
  scene.add(ripples);
  const entrances=layout.stations.map(s=>{const root=entrance.clone(true);root.position.set(s.x,.12,s.z);const label=sign(`${METRO_ICONS[s.id]} 🚇 → ${METRO_ICONS[nextMetroStation(s.id)]}`);label.position.set(0,5,2.9);root.add(label);scene.add(root);return {...s,root}});
  const dockLabel=sign('유람선 선착장',7);dockLabel.position.set(layout.dock.x,3.4,layout.dock.z);scene.add(dockLabel);
  const underground=new THREE.Group();scene.add(underground);underground.visible=false;
  underground.add(tunnel,stairs);tunnel.position.set(2,-12,METRO_TRAIN_Z);
  const cars=[train,train.clone(true),train.clone(true)],doors=[];
  cars.forEach((car,i)=>{car.position.set(2,-12,METRO_TRAIN_Z-i*11);underground.add(car);car.traverse(o=>{if(o.name.startsWith('Door_'))doors.push({o,home:o.position.clone(),direction:o.name.split('_').at(-1).startsWith('-1')?-1:1})})});
  const stationSign=sign('강변선 지하철',7);stationSign.position.set(-2,-8,METRO_TRAIN_Z+5);underground.add(stationSign);
  for(const z of [-20,0,20]){const light=new THREE.PointLight(0xc8eaff,45,28,1.2);light.position.set(2,-8,z);underground.add(light)}
  const stairLight=new THREE.PointLight(0xffdeb2,65,24,1.1);stairLight.position.set(4,-2,2);underground.add(stairLight);
  const hidden=new Map();let currentBackground=null;
  return {world,boat,entrances,pickRoots:[world,boat,...entrances.map(s=>s.root)],update(state,child,childRing){
    const m=state.transit.metro,f=state.transit.ferry;
    ripples.material.opacity=.14+Math.sin(state.city.time*.65)*.035;
    boat.position.set(f.car.x,.13+f.car.height,f.car.z);boat.rotation.y=f.car.angle;
    const below=state.metroTrip;
    underground.visible=below;
    if(below){
      if(!hidden.size){currentBackground=scene.background;scene.background=new THREE.Color(0x101e2a)}
      for(const root of scene.children){
        if(root===underground||root===child||root===childRing||root.isLight||root.isCamera)continue;
        if(!hidden.has(root))hidden.set(root,root.visible);root.visible=false;
      }
      underground.position.set(m.scene.x,0,m.scene.z);
      // A cutaway keeps the child and carriage visible inside the tunnel.
      // Train movement is conveyed by repeated ribs sliding past the carriage.
      const origin=layout.stations.find(s=>s.id===m.from);
      tunnel.position.z=METRO_TRAIN_Z+(m.phase==='running'?Math.hypot(m.car.x-origin.x-2,m.car.z-origin.z-METRO_TRAIN_Z)%10:0);
      const open=m.doors??0;
      doors.forEach(({o,home,direction})=>{o.position.copy(home);o.position.z+=direction*open*.62});
      stairs.visible=!['running','passing'].includes(m.phase);stairLight.visible=stairs.visible;
    }else if(hidden.size){
      for(const [root,visible] of hidden)root.visible=visible;hidden.clear();scene.background=currentBackground;
    }
  }};
}
