import * as THREE from 'three';

// Small shared mipmapped textures keep paving readable without thousands of tile meshes.
const textures=new Map(),prepared=new WeakSet();
function surfaceTexture(kind){
  if(textures.has(kind))return textures.get(kind);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d');c.fillStyle=kind==='paving'?'#f5f3ec':'#efefed';c.fillRect(0,0,128,128);
  let seed=17;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<2500;i++){const shade=kind==='paving'?216+random()*24:212+random()*27;c.fillStyle=`rgba(${shade},${shade},${shade},.23)`;c.fillRect(random()*128,random()*128,1,1)}
  if(kind==='paving'){
    c.strokeStyle='#babbb4';c.lineWidth=1.2;
    c.beginPath();c.moveTo(0,0);c.lineTo(128,0);c.moveTo(0,64);c.lineTo(128,64);c.moveTo(0,0);c.lineTo(0,64);c.moveTo(64,64);c.lineTo(64,128);c.stroke();
  }
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.set(kind,t);return t;
}
export function prepareSurfaces(root){
  root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(!o.isMesh||prepared.has(o.geometry))return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    // Existing baked road maps include lane markings and must retain their original UVs.
    if(mats.some(m=>m.map&&![...textures.values()].includes(m.map)))return;
    const surfaces=mats.filter(m=>/sidewalk|pav(?:ing|er)|asphalt|road surface/i.test(m.name));
    if(!surfaces.length)return;
    const p=o.geometry.attributes.position,uv=new Float32Array(p.count*2),v=new THREE.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);uv[i*2]=v.x/2;uv[i*2+1]=v.z/2}
    o.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));prepared.add(o.geometry);
    for(const m of surfaces){m.map=surfaceTexture(/asphalt|road surface/i.test(m.name)?'asphalt':'paving');m.roughness=.9;m.needsUpdate=true}
  });
  return root;
}
