export function soundMix(state,time,{paused=false,hidden=false,narrating=false}={}){
  const enabled=state.sound&&!paused&&!hidden&&state.ready;
  const moving=state.truckMoving||state.dumpPhase==='returning'||state.buses.some(b=>b.phase==='returning')||(state.riding&&state.mode==='moving');
  const emergency=state.riding&&['police','ambulance'].includes(state.vehicle);
  return {
    engineHz:(state.drivingBus?58:state.drivingDump?72:82)+Math.sin(time*23)*1.5,
    engineGain:enabled&&moving?.016:0,
    sirenHz:state.vehicle==='police'?650+(Math.sin(time*5)+1)*260:Math.floor(time*2)%2?960:720,
    sirenGain:enabled&&emergency?(narrating?.012:.035):0,
    waterGain:enabled&&state.drivingFire&&state.mode==='extinguishing'?.055:0,
  };
}
