// Gentle, original synthesized animal effects; no external samples or downloads.
export const ANIMAL_CALLS={
  elephant:{hz:240,end:470,seconds:1.65,rasp:.22,pulses:1},
  giraffe:{hz:95,end:65,seconds:1.25,rasp:.12,pulses:1},
  zebra:{hz:480,end:220,seconds:1.3,rasp:.18,pulses:3},
  lion:{hz:80,end:48,seconds:1.8,rasp:.55,pulses:2},
  panda:{hz:230,end:160,seconds:1.1,rasp:.12,pulses:3},
  penguin:{hz:560,end:340,seconds:1.1,rasp:.28,pulses:3},
  hippo:{hz:100,end:62,seconds:1.4,rasp:.4,pulses:4},
  rhino:{hz:92,end:58,seconds:1.25,rasp:.65,pulses:2},
  bear:{hz:110,end:65,seconds:1.65,rasp:.48,pulses:1},
  flamingo:{hz:620,end:470,seconds:1.2,rasp:.18,pulses:4},
  kangaroo:{hz:135,end:88,seconds:.9,rasp:.4,pulses:2},
  tortoise:{hz:130,end:100,seconds:.65,rasp:.85,pulses:1},
};
export function animalCallSamples(species,sampleRate=22050){
  const p=ANIMAL_CALLS[species];if(!p)return null;
  const samples=new Float32Array(Math.ceil(p.seconds*sampleRate));let phase=0,noise=0,seed=3191;
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate,u=i/(samples.length-1),pulse=Math.pow(.5-.5*Math.cos(u*p.pulses*Math.PI*2),.6);
    const envelope=Math.min(1,t/.045,(p.seconds-t)/.10)*(.15+.85*pulse);
    const hz=(p.hz+(p.end-p.hz)*u)*(1+.045*Math.sin(t*37));phase+=hz/sampleRate*Math.PI*2;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise=noise*.65+(seed/4294967296*2-1)*.35;
    const voice=Math.sin(phase)+.42*Math.sin(phase*2)+.22*Math.sin(phase*3);
    samples[i]=envelope*(voice*(1-p.rasp)*.32+noise*p.rasp)*.65;
  }
  return samples;
}
export function createZooAudio(context){
  const buffers=new Map(),gain=context.createGain();gain.gain.value=.32;gain.connect(context.destination);
  let current=null,nextAt=0,heardRequest=-1,city=null;
  function stop(){if(current){current.onended=null;current.stop();current.disconnect();current=null}}
  function play(species){
    if(!buffers.has(species)){const samples=animalCallSamples(species);if(!samples)return;const b=context.createBuffer(1,samples.length,22050);b.getChannelData(0).set(samples);buffers.set(species,b)}
    stop();const source=context.createBufferSource();source.buffer=buffers.get(species);source.connect(gain);source.onended=()=>{source.disconnect();if(current===source)current=null};source.start();current=source;
  }
  return {get active(){return !!current},stop,update(state,{paused=false,hidden=false,narrating=false}={}){
    if(city!==state.city){stop();city=state.city;heardRequest=-1;nextAt=0}
    if(!state.ready||!state.sound||paused||hidden||state.riding||state.metroTrip){stop();return}
    if(narrating){gain.gain.setTargetAtTime(.08,context.currentTime,.06);return}
    gain.gain.setTargetAtTime(.32,context.currentTime,.1);
    if(current||context.currentTime<nextAt)return;
    const near=[...state.city.animals,...(state.forest?.animals??[])].filter(a=>Math.hypot(a.x-state.actor.x,a.z-state.actor.z)<25);
    const selected=near.find(a=>a.id===(state.forest?.selected??state.city.viewing));
    const request=state.city.animalSoundRequest+(state.forest?.soundRequest??0);
    if(selected&&heardRequest!==request){heardRequest=request;play(selected.species);nextAt=context.currentTime+4;return}
    const closest=near.reduce((best,a)=>!best||Math.hypot(a.x-state.actor.x,a.z-state.actor.z)<Math.hypot(best.x-state.actor.x,best.z-state.actor.z)?a:best,null);
    if(closest){play(closest.species);nextAt=context.currentTime+13}
  }};
}
