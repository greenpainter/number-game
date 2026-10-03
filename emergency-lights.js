import {AdditiveBlending,Box3,DataTexture,RGBAFormat,Sprite,SpriteMaterial,Vector3} from './vendor/three.module.js';
const LENS_PHASES=new Map([['red',0],['Red lens',0],['blue',1],['Blue lens',1]]);
let glowTexture;
function texture(){
  if(glowTexture)return glowTexture;
  const size=32,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;
    data.set([255,255,255,Math.round(Math.max(0,1-r)**2*180)],i);
  }
  glowTexture=new DataTexture(data,size,size,RGBAFormat);glowTexture.needsUpdate=true;return glowTexture;
}

// Each vehicle owns its lens materials so a shared GLB cannot flash other cars.
export function createEmergencyLights(root,vehicle){
  const lenses=new Map(),bounds=[new Box3(),new Box3()],glows=[];
  root.updateMatrixWorld?.(true);
  const prepare=material=>{
    const phase=LENS_PHASES.get(material.name);
    if(phase===undefined)return material;
    if(!lenses.has(material)){
      const lens=material.clone();
      lens.emissive.copy(lens.color);lens.emissiveIntensity=0;
      // The GLBs share blue/red paint with body stripes and tail lamps.
      // Only the roof lenses (above 1.7 model units) emit light.
      lens.onBeforeCompile=shader=>{
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vBeaconHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBeaconHeight=position.y;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vBeaconHeight;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=step(1.7,vBeaconHeight);');
      };
      lens.customProgramCacheKey=()=> 'roof-beacon';
      lenses.set(material,{material:lens,phase});
    }
    return lenses.get(material).material;
  };
  root.traverse(object=>{
    if(!object.isMesh)return;
    const phase=LENS_PHASES.get(object.material.name),positions=object.geometry?.attributes.position;
    if(phase!==undefined&&positions){
      for(let i=0;i<positions.count;i++)if(positions.getY(i)>1.7){
        const p=new Vector3().fromBufferAttribute(positions,i);object.localToWorld(p);root.worldToLocal(p);bounds[phase].expandByPoint(p);
      }
    }
    object.material=Array.isArray(object.material)?object.material.map(prepare):prepare(object.material);
  });
  for(const [phase,box] of bounds.entries())if(!box.isEmpty()){
    const glow=new Sprite(new SpriteMaterial({map:texture(),color:phase===0?0xff4433:0x4488ff,transparent:true,blending:AdditiveBlending,depthWrite:false,opacity:.8}));
    glow.position.copy(box.getCenter(new Vector3()));glow.position.y+=.10;glow.scale.set(.85,.85,1);glow.visible=false;
    root.add(glow);glows.push({glow,phase});
  }
  return {update(state,time){
    const enabled=state.sirenOn&&state.vehicle===vehicle;
    const phase=Math.floor(time*5)%2;
    for(const lens of lenses.values())lens.material.emissiveIntensity=enabled&&phase===lens.phase?2.5:0;
    for(const item of glows)item.glow.visible=enabled&&phase===item.phase;
  }};
}
