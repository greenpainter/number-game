import {riverX} from './river-geometry.js';
export function soundMix(state,time,{paused=false,hidden=false,narrating=false}={}){
  const enabled=state.sound&&!paused&&!hidden&&state.ready;
  const metro=state.transit?.metro.phase==='running',ferry=state.transit?.ferry.phase==='cruising';
  const moving=metro||ferry||state.truckMoving||state.dumpPhase==='returning'||state.buses.some(b=>b.phase==='returning')||(state.riding&&['moving','train-moving'].includes(state.mode));
  const emergency=state.sirenOn;
  const helicopter=state.city?.helicopter,rotors=helicopter&&!['idle','waiting'].includes(helicopter.phase);
  const rotorDistance=helicopter?Math.hypot(helicopter.car.x-state.actor.x,helicopter.car.z-state.actor.z,helicopter.car.height-(state.actor.height??0)):0;
  return {
    engineHz:(metro?55+(state.transit.metro.speed??0)*2:ferry?46:state.drivingTrain?50:state.drivingBus?58:state.drivingDump?72:82)+Math.sin(time*23)*1.5,
    engineGain:enabled&&moving?(narrating?.007:metro?.022:.016):0,
    sirenHz:state.drivingFire?520+(Math.sin(time*2.8)+1)*330:state.vehicle==='police'?650+(Math.sin(time*5)+1)*260:Math.floor(time*2)%2?960:720,
    sirenGain:enabled&&emergency?(narrating?.012:.035):0,
    waterGain:enabled?(state.drivingFire&&state.mode==='extinguishing'?.055:!state.metroTrip&&Math.abs(state.actor.x-riverX(state.actor.z))<30?.007:0):0,
    rotorGain:enabled&&rotors?(narrating?.023:.065)/(1+rotorDistance*.055):0,
    rotorHz:helicopter?.phase==='boarding'||helicopter?.phase==='disembarking'?11:14,
  };
}
