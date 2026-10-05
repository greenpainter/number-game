import * as THREE from 'three';
import {DeliveryGuide} from './delivery-guide.js';
import {riverHeight} from './river-geometry.js';

export function createDeliveryView(scene){
  const guide=new DeliveryGuide();let revision=-1,icon='';
  const material=new THREE.MeshBasicMaterial({color:0x25cacc,side:THREE.DoubleSide,depthWrite:false});
  const ribbon=new THREE.Mesh(new THREE.BufferGeometry(),material);scene.add(ribbon);ribbon.visible=false;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));marker.scale.set(5,5,1);marker.renderOrder=5;scene.add(marker);marker.visible=false;
  const hint=document.createElement('div');hint.className='delivery-hint';hint.hidden=true;hint.setAttribute('role','status');document.querySelector('#stage').append(hint);
  return {update(state,dt){
    guide.update(state,dt);if(revision===guide.revision)return;revision=guide.revision;
    const d=guide.destination;marker.visible=!!d;ribbon.visible=!!d&&guide.points.length>1;hint.hidden=!d;
    if(!d)return;
    hint.innerHTML=`<span>${state.vehicle==='police'?'🚓':'🚑'}</span><span class="delivery-arrows">➜ ➜</span><span>${d.icon}</span><small>${d.name}까지 선을 따라 운전해요</small>`;
    marker.position.set(d.x,5,d.z);
    if(icon!==d.icon){icon=d.icon;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,256,256);ctx.fillStyle='#fffdf1';ctx.beginPath();ctx.roundRect(12,12,232,232,58);ctx.fill();ctx.font='152px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,128,142);texture.needsUpdate=true}
    const vertices=[],points=guide.points;
    const vertex=(x,z)=>vertices.push(x,.34+riverHeight(x,z),z);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.01)continue;
      const nx=-dz/length*.16,nz=dx/length*.16;
      vertex(a.x+nx,a.z+nz);vertex(a.x-nx,a.z-nz);vertex(b.x+nx,b.z+nz);
      vertex(a.x-nx,a.z-nz);vertex(b.x-nx,b.z-nz);vertex(b.x+nx,b.z+nz);
      for(let t=1.8;t<length;t+=3){const x=a.x+dx*t/length,z=a.z+dz*t/length;vertex(x+dx/length*.65,z+dz/length*.65);vertex(x+nx*4,z+nz*4);vertex(x-nx*4,z-nz*4)}
    }
    ribbon.geometry.dispose();ribbon.geometry=new THREE.BufferGeometry();ribbon.geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));ribbon.geometry.computeBoundingSphere();
  }};
}
