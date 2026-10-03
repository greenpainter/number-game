import layout from './waterfront-layout.js';
export function riverX(z){
  const points=layout.river.points,i=Math.max(0,Math.min(points.length-2,Math.floor((z-points[0][1])/2))),a=points[i],b=points[i+1],t=Math.max(0,Math.min(1,(z-a[1])/(b[1]-a[1])));
  return a[0]+(b[0]-a[0])*t;
}
export function riverBlocked(x,z,radius=0){
  if(Math.abs(x-riverX(z))>=layout.river.width/2+radius+.5)return false;
  return !layout.bridges.some(b=>Math.abs(z-b.z)<=b.width/2-radius-.25&&Math.abs(x-b.x)<=b.length/2);
}
export function riverHeight(x,z){
  const b=layout.bridges.find(b=>Math.abs(x-b.x)<b.length/2&&Math.abs(z-b.z)<b.width/2);
  return b?Math.sin((x-b.x+b.length/2)/b.length*Math.PI)**2*b.height:0;
}
