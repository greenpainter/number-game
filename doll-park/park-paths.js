import { Vector3 } from 'three';

// Keep the feet on the open paths between fixtures. A small visibility graph
// also avoids taking a straight shortcut through a slide or through the stage.
const fixtures = [
  {x:-4.6,z:-1.5, rx:1.33,rz:1.04},
  {x:4.8,z:2, rx:1.48,rz:1.45},
  {x:-3,z:3.8,rx:1.53,rz:1.53},
  {x:.43,z:-3.73,rx:1.43,rz:.62},
  {x:1.9,z:-2.12,rx:.71,rz:1.53}
];
const X=7.45, minZ=-5.6, maxZ=5.65;
const TAU=2*Math.PI;
const point=(x,z)=>new Vector3(x,0,z);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

function blocked(x,z) {
  return fixtures.some(o=>((x-o.x)/o.rx)**2+((z-o.z)/o.rz)**2 < 1);
}
function line(a,b) {
  const n=Math.max(1, Math.ceil(dist(a,b)/.21));
  for(let i=1;i<n;i++) {
    const t=i/n;
    if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)) return false;
  }
  return true;
}
const nodes=[];
for(const o of fixtures) {
  for(let i=0;i<10;i++) {
    const phi=TAU*i/10;
    const p=point(o.x+o.rx*1.14*Math.cos(phi),o.z+o.rz*1.14*Math.sin(phi));
    if(!blocked(p.x,p.z) && p.z<maxZ && p.z>minZ) nodes.push(p);
  }
}
const edges=nodes.map((p,i)=>nodes.map((q,j)=>i!==j && line(p,q)?dist(p,q):Infinity));

export function groundPoint(pos) {
  let p=point(Math.max(-X,Math.min(X,pos.x)),Math.max(minZ,Math.min(maxZ,pos.z)));
  for(const o of fixtures) {
    const x=(p.x-o.x)/o.rx,z=(p.z-o.z)/o.rz,r=Math.hypot(x,z);
    if(r<1.01) {
      const phi=r===0?Math.PI/2:Math.atan2(z,x);
      p=point(o.x+Math.cos(phi)*o.rx*1.08,o.z+Math.sin(phi)*o.rz*1.08);
    }
  }
  return p;
}

export function route(from,requested) {
  const start=groundPoint(from), end=groundPoint(requested);
  const prefix = dist(start,from)>.18 ? [start] : [];
  if(line(start,end)) return [...prefix,end];
  const n=nodes.length;
  const cost=nodes.map(p=>line(start,p)?dist(start,p):Infinity);
  const prev=Array(n).fill(-1);
  const seen=Array(n).fill(false);
  let best=Infinity, last=-1;
  for(let k=0;k<n;k++) {
    let a=-1;
    for(let i=0;i<n;i++) if(!seen[i] && cost[i]<(a<0?Infinity:cost[a])) a=i;
    if(a<0 || cost[a]>=best) break;
    seen[a]=true;
    if(line(nodes[a],end) && cost[a]+dist(nodes[a],end)<best) {
      best=cost[a]+dist(nodes[a],end); last=a;
    }
    for(let b=0;b<n;b++) {
      const value=cost[a]+edges[a][b];
      if(!seen[b] && value<cost[b]) { cost[b]=value; prev[b]=a; }
    }
  }
  const path=[];
  for(let i=last;i>=0;i=prev[i]) path.unshift(nodes[i].clone());
  return [...prefix,...path,end];
}
