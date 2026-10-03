import * as THREE from 'three';
import {WORLD} from './navigation.js';
import {riverX} from './river-geometry.js';

export function createCoast(scene){
  const root=new THREE.Group();root.name='TownCoast';scene.add(root);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(2600,2200),new THREE.MeshStandardMaterial({color:0x4cabb9,roughness:.88}));
  sea.rotation.x=-Math.PI/2;sea.position.set(60,-.14,0);root.add(sea);
  const sand=new THREE.MeshStandardMaterial({color:0xead6a2,roughness:1});
  const shallows=new THREE.MeshBasicMaterial({color:0x8bcbd0});
  const foam=new THREE.MeshBasicMaterial({color:0xe6f7e6,transparent:true,opacity:.65,depthWrite:false});
  const {minX:l,maxX:r,minZ:t,maxZ:b}=WORLD;
  function strip(points,material,name){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,2,1,0,3,2]);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.name=name;m.material.side=THREE.DoubleSide;root.add(m);return m}
  const waves=[];
  for(const [a,z,dir] of [[l,t,-1],[l,b,1]]){
    const mouth=riverX(z);
    for(const [x0,x1] of [[a,mouth-14],[mouth+14,r]]){
      strip([[x0+(x0===l?2.4:0),.205,z-dir*2.4],[x1-(x1===r?2.4:0),.205,z-dir*2.4],[x1+(x1===r?3:0),-.12,z+dir*3],[x0-(x0===l?3:0),-.12,z+dir*3]],sand,'Beach');
      strip([[x0-(x0===l?3:0),-.13,z+dir*3],[x1+(x1===r?3:0),-.13,z+dir*3],[x1+(x1===r?9:0),-.13,z+dir*9],[x0-(x0===l?9:0),-.13,z+dir*9]],shallows,'Shallow water');
      for(let x=x0+2;x<x1-8;x+=14)waves.push(strip([[x,-.10,z+dir*5],[x+8,-.10,z+dir*5],[x+9,-.10,z+dir*5.35],[x+1,-.10,z+dir*5.35]],foam,'Breaking wave'));
    }
  }
  for(const [x,dir] of [[l,-1],[r,1]]){
    strip([[x-dir*2.4,.205,t+2.4],[x-dir*2.4,.205,b-2.4],[x+dir*3,-.12,b+3],[x+dir*3,-.12,t-3]],sand,'Beach');
    strip([[x+dir*3,-.13,t-3],[x+dir*3,-.13,b+3],[x+dir*9,-.13,b+9],[x+dir*9,-.13,t-9]],shallows,'Shallow water');
    for(let z=t+3;z<b-9;z+=14)waves.push(strip([[x+dir*5,-.10,z],[x+dir*5,-.10,z+8],[x+dir*5.35,-.10,z+9],[x+dir*5.35,-.10,z+1]],foam,'Breaking wave'));
  }
  const positions=[],indices=[];
  for(const wave of waves){const offset=positions.length/3;positions.push(...wave.geometry.attributes.position.array);indices.push(...Array.from(wave.geometry.index.array,i=>i+offset));root.remove(wave);wave.geometry.dispose()}
  const waveGeometry=new THREE.BufferGeometry();waveGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));waveGeometry.setIndex(indices);root.add(new THREE.Mesh(waveGeometry,foam));
  return {root,update(time){foam.opacity=.40+Math.sin(time*.7)*.20}};
}
