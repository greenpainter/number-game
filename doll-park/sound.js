const melodies={swing:[392,523.25],slide:[659.25,523.25,392],trampoline:[329.63,493.88,659.25],carousel:[392,493.88,587.33]};
export function makeSound(initial){
  let enabled=initial, ctx, master;
  function wake(){
    if(!enabled)return;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    try{
      if(!ctx){ctx=new Audio();master=ctx.createGain();master.gain.value=.42;master.connect(ctx.destination);}
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    }catch{}
  }
  function play(kind,ride){
    if(!enabled||!ctx||ctx.state!=='running')return;
    const notes=kind==='reward'?[523.25,659.25,783.99]:kind==='select'?[523.25]:(melodies[ride]||[392,493.88]);
    const t=ctx.currentTime;
    notes.forEach((f,i)=>{
      const at=t+.015+i*.087;
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=kind==='select'?'sine':'triangle';osc.frequency.value=f;
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.13,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+.32);
      osc.connect(gain).connect(master);osc.start(at);osc.stop(at+.34);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    });
  }
  return {wake,play,get enabled(){return enabled;},set(value){enabled=!!value;if(enabled)wake();}};
}
