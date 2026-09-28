import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as THREE from '../vendor/three.module.js';
import {acceleratePicking} from '../picking.js';

// Read actual shipped geometry without loading browser-only textures.
function loadMeshes(name){
  const file=readFileSync(new URL(`../models/${name}.glb`,import.meta.url));
  const jsonLength=file.readUInt32LE(12),json=JSON.parse(file.toString('utf8',20,20+jsonLength));
  const binary=20+jsonLength+8;
  function attribute(id){
    const a=json.accessors[id],v=json.bufferViews[a.bufferView],sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
    const bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType],size=sizes[a.type],out=[];
    const read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];
    for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)out.push(file[read](binary+(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??bytes*size)+j*bytes));
    return new THREE.BufferAttribute(a.componentType===5126?new Float32Array(out):new Uint32Array(out),size);
  }
  const nodes=json.nodes.map(n=>{
    const root=new THREE.Group();root.name=n.name;
    if(n.matrix)root.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));
    else{if(n.translation)root.position.fromArray(n.translation);if(n.rotation)root.quaternion.fromArray(n.rotation);if(n.scale)root.scale.fromArray(n.scale)}
    if(n.mesh!==undefined)for(const p of json.meshes[n.mesh].primitives){
      const g=new THREE.BufferGeometry();g.setAttribute('position',attribute(p.attributes.POSITION));
      if(p.attributes.NORMAL!==undefined)g.setAttribute('normal',attribute(p.attributes.NORMAL));
      if(p.attributes.TEXCOORD_0!==undefined)g.setAttribute('uv',attribute(p.attributes.TEXCOORD_0));
      if(p.indices!==undefined)g.setIndex(attribute(p.indices));
      root.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:json.materials[p.material]?.doubleSided?THREE.DoubleSide:THREE.FrontSide})));
    }
    return root;
  });
  json.nodes.forEach((n,i)=>(n.children??[]).forEach(c=>nodes[i].add(nodes[c])));
  const root=new THREE.Group();for(const i of json.scenes[json.scene??0].nodes)root.add(nodes[i]);root.updateMatrixWorld(true);return root;
}
const native=THREE.Mesh.prototype.raycast;
function compare(mesh,ray){
  const expected=[],actual=[];native.call(mesh,ray,expected);mesh.raycast(ray,actual);
  const order=(a,b)=>a.faceIndex-b.faceIndex;expected.sort(order);actual.sort(order);
  assert.equal(actual.length,expected.length);
  actual.forEach((hit,i)=>{const e=expected[i];assert.equal(hit.object,mesh);assert.equal(hit.faceIndex,e.faceIndex);assert(Math.abs(hit.distance-e.distance)<1e-6);assert(hit.point.distanceTo(e.point)<1e-6);if(e.uv)assert(hit.uv.distanceTo(e.uv)<1e-6)});
}
test('accelerated picking matches the actual town and truck, including moved/scaled meshes',t=>{
  const scene=new THREE.Group();scene.add(loadMeshes('expanded-ground'),loadMeshes('village-rect'),loadMeshes('city-world'),loadMeshes('city-plane'),loadMeshes('firetruck'));
  const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o)});
  const rays=[];
  for(const [x,z] of [[-7,5.7],[2.2,-7],[8,-6.7],[-58,10],[58,26],[0,0],[6.5,-39.8],[-135,34],[110,-52],[0,-85]])
    for(const dx of [-.25,0,.25])rays.push(new THREE.Raycaster(new THREE.Vector3(x+18+dx,25,z+18),new THREE.Vector3(-18-dx,-25,-18).normalize()));
  const run=()=>{const t=performance.now();for(const ray of rays)ray.intersectObjects(scene.children,true);return performance.now()-t};
  run();const before=run();meshes.forEach(acceleratePicking);run();const after=run();
  t.diagnostic(`Actual GLB picking: ${rays.length} rays, before ${before.toFixed(2)} ms, after ${after.toFixed(2)} ms`);
  for(const mesh of meshes)for(const ray of rays)compare(mesh,ray);
  const truck=meshes.at(-1);truck.position.set(3,.13,2);truck.rotation.y=.8;truck.scale.set(1,.07,1);scene.updateMatrixWorld(true);
  for(const ray of rays)compare(truck,ray);
});
test('picking respects clipping, sidedness, non-indexed geometry and shared clones',()=>{
  for(const indexed of [true,false]){
    const g0=new THREE.SphereGeometry(2,40,30),geometry=indexed?g0:g0.toNonIndexed();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()),clone=mesh.clone();
    acceleratePicking(mesh);acceleratePicking(clone);mesh.updateMatrixWorld();clone.updateMatrixWorld();
    for(const side of [THREE.FrontSide,THREE.BackSide,THREE.DoubleSide])for(const near of [0,4,10]){
      mesh.material.side=side;const ray=new THREE.Raycaster(new THREE.Vector3(.1,.2,6),new THREE.Vector3(0,0,-1),near,9);
      compare(mesh,ray);compare(clone,ray);
    }
    geometry.setDrawRange(0,90);compare(mesh,new THREE.Raycaster(new THREE.Vector3(0,0,6),new THREE.Vector3(0,0,-1)));
  }
});
