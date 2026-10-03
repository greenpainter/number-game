import layout from './city-layout.js';
import waterfront from './waterfront-layout.js';
import {riverHeight} from './river-geometry.js';

// The same sampled curves are exported to Blender by build_city_refined.py.
export function ringRoad(offset=0){
  const r=18+offset,points=[];
  for(const [x,z,start] of [[82,-67,-90],[82,60,0],[-82,60,90],[-82,-67,180]]){
    for(let i=0;i<=18;i++){const a=(start+i*5)*Math.PI/180;points.push([x+Math.cos(a)*r,z+Math.sin(a)*r,0])}
  }
  return points;
}
export function bridgeRoute(){
  const controls=layout.bridge.route,points=[];
  for(let i=0;i<controls.length-1;i++){
    const a=controls[Math.max(0,i-1)],b=controls[i],c=controls[i+1],d=controls[Math.min(controls.length-1,i+2)];
    for(let j=0;j<12;j++){const t=j/12;points.push(b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t)))}
  }
  points.push(controls.at(-1));return points;
}
const riverCrossing=Array.from({length:72},(_,i)=>{const x=196+i*2,z=-100;return [x,z,riverHeight(x,z)]});
export const trafficRoutes=[ringRoad(-2.5),ringRoad(2.5).reverse(),layout.trafficRoutes[2],bridgeRoute(),...layout.districtRoads.map(r=>r.points),waterfront.road,riverCrossing];
export const TRAFFIC_COUNT=trafficRoutes.length*3;
