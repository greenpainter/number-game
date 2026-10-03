const smooth=t=>t*t*(3-2*t);
const mix=(a,b,t)=>a+(b-a)*t;
// Foot targets in child-local coordinates; the sole stays level during contact.
export function scooterPose(time,moving){
  const p=moving?(time/1.25)%1:0.8;
  let y=.292,z=-.12,body=.035;
  if(p<.12){const t=smooth(p/.12);y=mix(.292,0,t);z=mix(-.12,.12,t);body=mix(.035,-.045,t)}
  else if(p<.42){const t=(p-.12)/.30;y=0;z=mix(.12,-.18,t);body=-.045}
  else if(p<.68){const t=smooth((p-.42)/.26);y=mix(0,.292,t)+Math.sin(t*Math.PI)*.13;z=mix(-.18,-.12,t);body=mix(-.045,.035,t)}
  return {body,left:{y:(.292-body)/1.15,z:.03},right:{y:(y-body)/1.15,z},contact:p>=.12&&p<.42};
}
export function solveScooterLeg(target){
  const a=.27,b=.32,dy=.72-(target.y+.13),dz=target.z-.005;
  const d=Math.min(a+b-.00001,Math.max(.06,Math.hypot(dy,dz)));
  const bend=Math.acos(Math.max(-1,Math.min(1,(d*d-a*a-b*b)/(2*a*b))));
  const hip=-Math.atan2(dz,dy)-Math.atan2(b*Math.sin(bend),a+b*Math.cos(bend));
  return {hip,knee:bend,ankle:-hip-bend};
}
export function applyScooterPose(limbs,pose){
  for(const [side,target] of [['L',pose.left],['R',pose.right]]){
    const angles=solveScooterLeg(target);
    if(limbs['Leg_'+side])limbs['Leg_'+side].rotation.x=angles.hip;
    if(limbs['Knee_'+side])limbs['Knee_'+side].rotation.x=angles.knee;
    if(limbs['Ankle_'+side])limbs['Ankle_'+side].rotation.x=angles.ankle;
  }
}
