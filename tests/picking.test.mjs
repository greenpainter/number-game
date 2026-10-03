import {METRO_DEPTH,METRO_RAIL_HEIGHT} from '../metro-path.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as THREE from '../vendor/three.module.js';
import {acceleratePicking} from '../picking.js';
import cityLayout from '../city-layout.js';
import {zooTapTarget} from '../zoo-interaction.js';
import waterfrontLayout from '../waterfront-layout.js';
import {METRO_PLATFORM,METRO_TRAIN_Z,metroPathPoint} from '../metro-path.js';
import {riverHeight} from '../river-geometry.js';
import {createZooAnimals} from '../zoo-wildlife.js';

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

test('walking animal exports retain attached legs and fit their enclosure clearance',()=>{
  for(const a of createZooAnimals().filter(a=>!a.id.includes('-'))){
    const root=loadMeshes('city-'+a.species);let radius=0;
    root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);o.localToWorld(v);radius=Math.max(radius,Math.hypot(v.x,v.z))}});
    assert(radius<=a.radius,a.species+' body exceeds safe radius');
    for(const name of ['Walk_FL','Walk_FR']){const leg=root.getObjectByName(name);assert(leg?.parent,a.species+' needs attached walking feet');const home=leg.position.clone();leg.rotation.x=.23;root.updateMatrixWorld(true);assert.deepEqual(leg.position,home)}
  }
});
test('citizen shoes remain attached to their moving leg pivots',()=>{
  const citizen=loadMeshes('city-citizen');
  for(const side of ['L','R']){
    const leg=citizen.getObjectByName('Leg_'+side),shoe=citizen.getObjectByName('Shoe_'+side);
    assert.equal(shoe.parent,leg);
    const local=shoe.position.clone(),initial=shoe.getWorldPosition(new THREE.Vector3());
    for(const angle of [-.42,.42]){
      leg.rotation.x=angle;citizen.updateMatrixWorld(true);
      assert(shoe.position.equals(local));assert(shoe.getWorldPosition(new THREE.Vector3()).distanceTo(initial)>.2);
    }
  }
});

test('both elevated ramp surfaces raycast to the Overpass interaction root',()=>{
  const world=loadMeshes('city-world');world.traverse(o=>{if(o.isMesh)acceleratePicking(o)});
  for(const [x,z,y] of [[76,24,.7],[178,36.6,.9],[110,-5,7.2]]){
    const origin=new THREE.Vector3(x+10,y+16,z+10),target=new THREE.Vector3(x,y,z);
    const hit=new THREE.Raycaster(origin,target.sub(origin).normalize()).intersectObject(world,true)[0];
    assert(hit);let root=hit.object;while(root.parent&&root.parent!==world)root=root.parent;
    assert.equal(root.name,'Overpass');
  }
});
test('all six bridge piers stay below the exported driving surface',()=>{
  const world=loadMeshes('waterfront-world');world.traverse(o=>{if(o.isMesh)acceleratePicking(o)});
  // Sample both driving lanes, clear of the raised centre-line paint.
  for(const b of waterfrontLayout.bridges)for(const dx of [-27,27])for(const edge of [-.65,0,.65])for(const dz of [-3,3]){
    const x=b.x+dx+edge,z=b.z+dz,ray=new THREE.Raycaster(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObject(world,true)[0];assert(hit);const deck=.20+riverHeight(x,z);
    assert(Math.abs(hit.point.y-deck)<.06,`Pier protrudes at ${x},${z}: ${hit.point.y}, deck ${deck}`);
  }
});
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

test('actual exported elephant enclosure routes fence and floor hits to the elephant',()=>{
  const world=loadMeshes('city-world'),h=cityLayout.zoo.habitats.find(h=>h.id==='elephant');
  world.traverse(o=>{if(o.isMesh)acceleratePicking(o)});
  for(const target of [new THREE.Vector3(h.x,.3,h.z),new THREE.Vector3(h.x,1,h.z+14),new THREE.Vector3(h.x,1.3,h.z+15.5)]){
    const origin=new THREE.Vector3(h.x+10,20,h.z+35),ray=new THREE.Raycaster(origin,target.clone().sub(origin).normalize());
    const hit=ray.intersectObject(world,true)[0];assert(hit);let root=hit.object;while(root.parent&&root.parent!==world)root=root.parent;
    assert.equal(root.name,'Zoo');assert.deepEqual(zooTapTarget(hit.point),{animal:'elephant'});
  }
});

test('all exported homes stand on the terrain with upright walls',()=>{
  const world=loadMeshes('city-districts'),homes=world.children.filter(o=>o.name.startsWith('Home_'));
  assert.equal(homes.length,cityLayout.residences.length);
  for(const home of homes){const box=new THREE.Box3().setFromObject(home);assert(box.min.y>=-.001&&box.min.y<.15,`${home.name} base ${box.min.y}`);assert(box.max.y>3,home.name)}
});

test('rebuilt railway homes clear the connecting roads and relocated metro entrance',()=>{
  const world=loadMeshes('expanded-ground'),homes=world.children.filter(o=>o.name.startsWith('StreetFacingHouse'));
  assert.equal(homes.length,14);
  const roads=[[-95,-43,15.5,24.5],[43,95,15.5,24.5],[-53,-43,-80,-33],[30,40,37,73]];
  const central=waterfrontLayout.stations.find(s=>s.id==='central');
  const entrance=loadMeshes('metro-entrance');entrance.position.set(central.x,.12,central.z);
  const stationBox=new THREE.Box3().setFromObject(entrance);
  for(const home of homes){
    const box=new THREE.Box3().setFromObject(home);assert(box.min.y>=0&&box.max.y>3);
    assert(!box.intersectsBox(stationBox),home.name+' overlaps the metro');
    for(const [x0,x1,z0,z1] of roads)assert(box.max.x<=x0||box.min.x>=x1||box.max.z<=z0||box.min.z>=z1,home.name+' overlaps a connector');
  }
  const stairs=loadMeshes('metro-stairs'),train=loadMeshes('metro-train');train.position.set(2,METRO_RAIL_HEIGHT,METRO_TRAIN_Z);
  assert(!new THREE.Box3().setFromObject(stairs).intersectsBox(new THREE.Box3().setFromObject(train)),'stairs intersect the stopped train');
  stairs.traverse(o=>{if(o.isMesh){o.material.side=THREE.DoubleSide;acceleratePicking(o)}});
  for(let i=0;i<=100;i++){
    const p=metroPathPoint(METRO_PLATFORM,i/100,{x:0,z:0});
    const ray=new THREE.Raycaster(new THREE.Vector3(p.x,p.height+.33,p.z),new THREE.Vector3(0,1,0),0,1.6);
    assert.equal(ray.intersectObject(stairs,true).length,0,'platform walk passes through stair treads');
  }
});
