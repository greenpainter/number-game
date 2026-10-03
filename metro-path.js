// Coordinates are relative to the entrance. Heights are character offsets;
// render feet add .13 m, matching the stair treads and platform surface.
export const METRO_STAIRS=[[0,0,5],[0,-4,-3],[3,-4,-3],[3,-8,5],[6,-8,5],[6,-11.4,-1.8]];
// The train stops beyond the stairs, leaving a clear platform walking route.
export const METRO_TRAIN_Z=-12;
export const METRO_PLATFORM=[[6,-11.4,-1.8],[6,-11.4,METRO_TRAIN_Z+1.95],[4.9,-11.4,METRO_TRAIN_Z+1.95]];
export const METRO_BOARD=[[4.9,-11.4,METRO_TRAIN_Z+1.95],[2.8,-11.4,METRO_TRAIN_Z+1.95]];
export function pathLength(points){return points.slice(1).reduce((n,p,i)=>n+Math.hypot(...p.map((v,k)=>v-points[i][k])),0)}
export function metroPathPoint(points,fraction,origin){
  let remaining=pathLength(points)*Math.max(0,Math.min(1,fraction));
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=Math.hypot(...b.map((v,k)=>v-a[k]));
    if(remaining<=length||i===points.length-1){const t=Math.min(1,remaining/length);return {x:origin.x+a[0]+(b[0]-a[0])*t,z:origin.z+a[2]+(b[2]-a[2])*t,height:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[0]-a[0],b[2]-a[2])}}
    remaining-=length;
  }
}
