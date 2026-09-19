// Distances are metres. Pedestrians and vehicles use different clearances.
export const HOME = {x:-7,z:.8};
export const CHILD_START = {x:-7,z:5.7};
export const FIRE = {x:7,z:6.3};
export const FIRE_STOP = {x:7,z:2.45};
export const DUMP_HOME={x:-26,z:5};
export const EXCAVATOR={x:30,z:-6.4};
export const LOAD_STOP={x:25.5,z:-5.5};
export const UNLOAD_STOP={x:27,z:10};
export const DROP_POINT={x:27,z:7.4};
export const BUS_SPOTS=[{x:-30.5,z:-7},{x:-25.5,z:-7},{x:-20.5,z:-7}];
export const WORLD={minX:-38,maxX:38,minZ:-31,maxZ:26.2,previousArea:2898,area:4347.2};
export const SERVICES={police:{name:'경찰차',building:{x:-7,z:-24},garage:{x:-7,z:-24},home:{x:-7,z:-17},waiting:{x:-10,z:-15}},ambulance:{name:'앰뷸런스',building:{x:7,z:-24},garage:{x:7,z:-24},home:{x:7,z:-17},waiting:{x:4,z:-15}}};
export const ICE_VAN={x:3,z:-2.4}, ICE_STOP={x:3.6,z:.3};
const rectangles = [
  ...Object.values(SERVICES).map(s=>[s.building.x-3.5,s.building.x+3.5,-26.8,-21.2]),
  [1.15,4.85,-3.35,-1.45],
  [-11.1,-2.9,-8.5,-2.9], [.2,4.2,-9,-5], [5.9,10.1,-8.8,-4.6],
  [-13.9,-10.1,5.2,9.4], [-3.2,.6,6.9,10.7],
  [9.6,14.5,-10,-3], [9.95,10.65,3.8,9],
  [5.6,8.4,4.85,7.8], // Firewood remains solid after the fire is out.
  [-2.2,-.2,14,15], [16,18,11.5,12.5],
  [28.75,31.25,-8.1,-4.7], [26,31.7,-14,-9.3],
];
const trees = [[-12,-10.8],[-15,6],[-1,-10],[5,-10.4],[20,5],[13,7],[6,10.5],[-3.5,12.7],[-14,11],[-.6,-3.1],[-12,-4.5]];
export function truckContains(x,z,truck,padding=.32){
  const dx=x-truck.x,dz=z-truck.z,c=Math.cos(truck.angle),s=Math.sin(truck.angle);
  return Math.abs(dx*c-dz*s)<(truck.halfWidth??.84)+padding&&Math.abs(dx*s+dz*c)<(truck.halfLength??1.65)+padding;
}
export function walkable(x,z,{radius=.86,truck=null,vehicles=[]}={}){
  const margin=radius+.15;
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<WORLD.minX+margin||x>WORLD.maxX-margin||z<WORLD.minZ+margin||z>WORLD.maxZ-margin)return false;
  if(rectangles.some(([x0,x1,z0,z1])=>x>x0-radius&&x<x1+radius&&z>z0-radius&&z<z1+radius))return false;
  if(trees.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<.36+radius))return false;
  return (!truck||!truckContains(x,z,truck,radius))&&!vehicles.some(v=>truckContains(x,z,v,radius));
}
const STEP=.5, MIN_X=-38, MIN_Z=-31, COLS=153, ROWS=115;
const point=i=>({x:MIN_X+(i%COLS)*STEP,z:MIN_Z+Math.floor(i/COLS)*STEP});
function clearSegment(a,b,options){
  const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12));
  for(let i=1;i<=steps;i++)if(!walkable(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,options))return false;
  return true;
}
export function findPath(start,target,options={}){
  if(!walkable(target.x,target.z,options))return null;
  if(clearSegment(start,target,options))return [{x:target.x,z:target.z}];
  const valid=Array.from({length:COLS*ROWS},(_,i)=>{const p=point(i);return walkable(p.x,p.z,options)});
  const nearest=p=>{
    const candidates=[];
    for(let i=0;i<valid.length;i++){if(!valid[i])continue;const q=point(i);candidates.push({i,d:(q.x-p.x)**2+(q.z-p.z)**2})}
    candidates.sort((a,b)=>a.d-b.d);
    return candidates.slice(0,30).find(({i})=>clearSegment(p,point(i),options))?.i;
  };
  const s=nearest(start),end=nearest(target);if(s===undefined||end===undefined)return null;
  const open=new Set([s]),closed=new Set(),g=new Map([[s,0]]),parents=new Map(),goal=point(end);
  const heuristic=i=>{const p=point(i);return Math.hypot(p.x-goal.x,p.z-goal.z)};
  while(open.size){
    let current=-1,best=Infinity;
    for(const i of open){const value=g.get(i)+heuristic(i);if(value<best){current=i;best=value}}
    if(current===end){
      const route=[];let n=current;while(n!==s){route.push(point(n));n=parents.get(n)}route.push(point(s));route.reverse();
      route.push({x:target.x,z:target.z});return route;
    }
    open.delete(current);closed.add(current);
    const cx=current%COLS,cz=Math.floor(current/COLS);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx=cx+dx,nz=cz+dz;if(nx<0||nx>=COLS||nz<0||nz>=ROWS)continue;
      const ni=nz*COLS+nx;if(!valid[ni]||closed.has(ni))continue;
      if(dx&&dz&&(!valid[cz*COLS+nx]||!valid[nz*COLS+cx]))continue;
      if(!clearSegment(point(current),point(ni),options))continue;
      const cost=g.get(current)+Math.hypot(dx,dz)*STEP;
      if(cost<(g.get(ni)??Infinity)){g.set(ni,cost);parents.set(ni,current);open.add(ni)}
    }
  }
  return null;
}
