// One decoded loop, shared with the gesture-unlocked game AudioContext.
export function createBackgroundMusic(context,fetchAudio=fetch){
  const gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
  let loading=null,source=null,target=0;
  return {
    start(){
      if(source)return Promise.resolve(true);
      if(loading)return loading;
      loading=(async()=>{
        try{
          const response=await fetchAudio(new URL('./audio/bgm/peaceful-ville.mp3',import.meta.url));
          if(!response.ok)throw new Error(`Music HTTP ${response.status}`);
          const buffer=await context.decodeAudioData(await response.arrayBuffer());
          source=context.createBufferSource();source.buffer=buffer;source.loop=true;
          source.connect(gain);source.start();
          return true;
        }catch{return false}finally{loading=null}
      })();
      return loading;
    },
    setVolume(value){
      if(value===target)return;
      target=value;
      gain.gain.cancelScheduledValues(context.currentTime);
      if(value===0)gain.gain.setValueAtTime(0,context.currentTime);
      else gain.gain.setTargetAtTime(value,context.currentTime,.3);
    },
  };
}
