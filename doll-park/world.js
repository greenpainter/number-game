import * as THREE from 'three';

const TAU = Math.PI * 2;
const Y = new THREE.Vector3(0, 1, 0);
const v = (x, y, z) => new THREE.Vector3(x, y, z);

const C = {
  grass: '#a7cf8e', grassLight: '#b8d89b', grassEdge: '#94ba7d', grassDeep: '#86b182',
  path: '#efd4a2', pathEdge: '#dbb98d', pebble: '#f6e4bd', ochre: '#dda758',
  forest: '#4b886c', pine: '#508871', leaf: '#75ad79', leafHi: '#91bf79',
  cream: '#ffefd1', porcelain: '#fff3dc', pink: '#e9897c', melon: '#eea591',
  coral: '#e47864', tangerine: '#e69857', brick: '#bd7459', gold: '#edbf66',
  timber: '#a57453', wood: '#c39767', darkWood: '#8e6148', stripe: '#f4d792',
  mint: '#91c9b9', aqua: '#6cb7b3', teal: '#438c8a', darkTeal: '#447475',
  blue: '#678f9b', navy: '#455e70', wick: '#d7ad78', iris: '#9c90b1',
};

const materialCache = new Map();
const geoCache = new Map();
function mat(color) {
  if (!materialCache.has(color)) materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: .84 }));
  return materialCache.get(color);
}
function cached(key, factory) {
  if (!geoCache.has(key)) geoCache.set(key, factory());
  return geoCache.get(key);
}
function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
function mesh(parent, geometry, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function blob(p, x, y, z, sx, sy, sz, color, even = false) {
  const tiny=!even&&Math.max(sx,sy,sz)<.14;
  const g=cached(even?'dome':tiny?'bud':'sphere',()=>new THREE.SphereGeometry(1,even?20:tiny?8:12,even?13:tiny?5:8));
  const m=mesh(p,g,color,x,y,z);
  m.scale.set(sx, sy, sz);
  return m;
}
function box(p, x, y, z, w, h, d, c, radius = 0) {
  if (radius === 0) {
    const o = mesh(p, cached('unitBox', () => new THREE.BoxGeometry(1,1,1)), c, x,y,z);
    o.scale.set(w,h,d);
    return o;
  }
  const r = Math.min(radius, w * .46, h * .46, d * .46);
  const key = ['box',w,h,d,r].join('|');
  const geom = cached(key, () => {
    const b = r*.64, a = Math.max(.001, w/2 - b), h2 = Math.max(.001, h/2 - b);
    const rr = Math.min(r*.8,a*.96,h2*.96);
    const s = new THREE.Shape();
    s.moveTo(-a+rr,-h2); s.lineTo(a-rr,-h2); s.quadraticCurveTo(a,-h2,a,-h2+rr);
    s.lineTo(a,h2-rr); s.quadraticCurveTo(a,h2,a-rr,h2);
    s.lineTo(-a+rr,h2); s.quadraticCurveTo(-a,h2,-a,h2-rr);
    s.lineTo(-a,-h2+rr); s.quadraticCurveTo(-a,-h2,-a+rr,-h2);
    const g = new THREE.ExtrudeGeometry(s, {depth: Math.max(.001,d-2*b), bevelEnabled:true, bevelSize:b, bevelThickness:b, bevelSegments:2, curveSegments:3});
    g.center();
    return g;
  });
  return mesh(p,geom,c,x,y,z);
}
function cylinder(p, x, y, z, rt, rb, h, color, sides=18) {
  return mesh(p,cached(['tube',rt,rb,h,sides].join('|'),()=>new THREE.CylinderGeometry(rt,rb,h,sides)),color,x,y,z);
}
function beam(p, a, b, r, color, endR=r, sides=12) {
  const delta = b.clone().sub(a);
  const o = cylinder(p, 0,0,0,endR,r,delta.length(),color,sides);
  o.position.copy(a).lerp(b,.5);
  o.quaternion.setFromUnitVectors(Y,delta.normalize());
  return o;
}
function cord(p, points, radius, color, steps=24, sides=7) {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(p,new THREE.TubeGeometry(curve,steps,radius,sides,false),color);
}
function ring(p,x,y,z,r,t,c) {
  const o=mesh(p,cached(['ring',r,t].join('|'),()=>new THREE.TorusGeometry(r,t,8,48)),c,x,y,z);
  o.rotation.x=Math.PI/2;
  return o;
}
function oval(p,x,z,rx,rz,top,col) {
  const o=mesh(p,cached('disk',()=>new THREE.CircleGeometry(1,54)),col,x,top,z);
  o.rotation.x=-Math.PI/2;
  o.scale.set(rx,rz,1); o.castShadow=false;
  return o;
}
function random(seed) {
  return () => {
    seed|=0; seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed ^ seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function ribbon(p, points, width, y, color, closed=false) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x,z])=>v(x,0,z)),closed);
  const pointsCount = closed ? 150 : 64;
  const vertices=[], indices=[];
  for(let i=0;i<=pointsCount;i++) {
    const t=i/pointsCount, at=curve.getPoint(t), dir=curve.getTangent(t);
    const dx=-dir.z*width/2,dz=dir.x*width/2;
    vertices.push(at.x+dx,y,at.z+dz,at.x-dx,y,at.z-dz);
    if(i) {
      const n=i*2;
      indices.push(n-2,n,n-1,n,n+1,n-1);
    }
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  const m=mesh(p,geom,color); m.castShadow=false;
  return m;
}
function parkPath(p,coords,width,closed=false) {
  ribbon(p,coords,width+.15,.018,C.pathEdge,closed);
  return ribbon(p,coords,width,.031,C.path,closed);
}
function grassClump(p,x,z,scale,col,rand) {
  const g=group(p,x,0,z);
  g.rotation.y=rand()*TAU; g.scale.setScalar(scale);
  for(let i=0;i<3;i++){
    const a=i*TAU/3;
    const blade=blob(g, Math.sin(a)*.065,.08,Math.cos(a)*.065,.037,.135,.045,col);
    blade.rotation.z=Math.sin(a)*-.54; blade.rotation.x=Math.cos(a)*.54;
  }
}
function flowers(p,x,z,spread,amount,rand) {
  const shades=['#f6cd6b','#f5ad9c','#fff0cb','#df958c'];
  for(let i=0;i<amount;i++) {
    const px=x+(rand()-.5)*spread,pz=z+(rand()-.5)*spread*.62;
    const s=.72+rand()*.48, h=.11+s*.095;
    beam(p,v(px,0,pz),v(px,h,pz),.014,C.forest);
    const leaf=blob(p,px+.042,h*.46,pz,.065,.024,.032,C.leaf); leaf.rotation.z=.47;
    const shade=shades[(i+Math.floor(rand()*3))%4];
    const g=group(p,px,h,pz);
    g.rotation.x=-.45-rand()*.43; g.rotation.y=rand()*.7;
    for(let j=0;j<5;j++) {
      const a=j/5*TAU;
      const petal=blob(g,Math.sin(a)*.050*s,Math.cos(a)*.050*s,0,.041*s,.058*s,.025*s,shade);
      petal.rotation.z=-a;
    }
    blob(g,0,0,.02,.038*s,.038*s,.03*s,C.gold);
  }
}
function berryBush(p,x,z,size,rand,berries=false) {
  oval(p,x,z,size*.96,size*.71,.007,C.grassEdge);
  const colors=[C.forest,C.leaf,C.leafHi];
  for(let i=0;i<4;i++) {
    const a=i*1.55+rand()*.3;
    const cap=blob(p,x+Math.cos(a)*size*.34,size*.22+rand()*.055,z+Math.sin(a)*size*.25,
                    size*(.43+rand()*.11),size*(.33+rand()*.15),size*.43,colors[i===3?2:i%2]);
    cap.rotation.y=rand()*TAU;
  }
  if(berries) for(let i=0;i<4;i++) {
    const a=rand()*TAU;
    blob(p,x+Math.sin(a)*size*.48,.39*size+rand()*.12,z+Math.cos(a)*size*.37,.057,.065,.057,C.coral);
  }
}
function tree(p,x,z,s,kind,rand) {
  const g=group(p,x,0,z);
  g.scale.setScalar(s); g.rotation.y=rand()*TAU;
  oval(g,0,0,1.06,.9,.008,'#90b881');
  beam(g,v(0,.03,0),v(.03,1.74,.035),.15,C.wood,.09);
  if(kind==='spruce'){
    const shades=['#59957d','#69a58b','#82b69a'];
    for(let i=0;i<3;i++){
      const o=cylinder(g,0,1.57+i*.55,0,.10,.91-.15*i,1.29,shades[i],11);
      o.rotation.y=i*.25;
      blob(g,0,1.00+i*.55,0,.90-.15*i,.16,.90-.15*i,shades[i]);
    }
    return;
  }
  const b=kind==='pink'?['#de9e9f','#e9b3aa','#f0c0b0']:kind==='pear'?['#6ba778','#8ab87c','#a6c584']:['#6a9f73','#89b67b','#9cc382'];
  beam(g,v(0,.87,0),v(-.47,1.57,.07),.087,C.wood,.042);
  beam(g,v(.015,1.18,0),v(.43,1.91,-.08),.072,C.wood,.035);
  blob(g,0,2.14,0,.93,1.24,.86,b[0],true);
  for(const [dx,dy,dz,r,k] of [[-.46,1.96,.11,.63,1],[.43,2.16,.06,.64,1],[-.12,2.65,.06,.71,2],[.04,2.13,.39,.58,1]]){
    const o=blob(g,dx,dy,dz,r,r*(kind==='pear'?1.17:1.04),r*.91,b[k],true);
    o.rotation.z=dx*.27;
  }
  if(kind==='pear') for(const [dx,dy,dz] of [[-.58,2.13,.55],[.44,2.42,.64],[.17,1.80,.69],[-.14,2.72,.61]]){
    blob(g,dx,dy,dz,.078,.093,.077,'#e8a664');
  }
}
function fence(p,a,b) {
  const dx=b[0]-a[0], dz=b[1]-a[1], len=Math.hypot(dx,dz), n=Math.ceil(len/1.28);
  for(const y of [.30,.59]){
    const rail=box(p,(a[0]+b[0])/2,y,(a[1]+b[1])/2,len,.105,.10,'#eed8ae',.023);
    rail.rotation.y=-Math.atan2(dz,dx);
  }
  for(let j=0;j<=n;j++) {
    const x=a[0]+dx*j/n,z=a[1]+dz*j/n;
    box(p,x,.38,z,.16,.71,.16,C.cream,.045);
    blob(p,x,.733,z,.099,.095,.099,C.cream);
  }
}
function bench(p,x,z,angle) {
  const b=group(p,x,0,z); b.rotation.y=angle;
  for(const s of [-1,1]) {
    beam(b,v(s*.59,.02,.14),v(s*.59,.47,.12),.064,C.darkTeal);
    beam(b,v(s*.59,.02,-.19),v(s*.59,.87,-.22),.056,C.darkTeal);
  }
  for(const z0 of [-.13,.07,.24]) box(b,0,.43,z0,1.63,.088,.16,C.wood,.035);
  for(let i=0;i<2;i++) box(b,0,.64+i*.17,-.22,1.65,.14,.09,i?C.wood:C.wick,.04);
}
function landscape(p) {
  const rand=random(55491);
  const floor=mesh(p,new THREE.PlaneGeometry(190,190),C.grass,0,-.02,0);
  floor.rotation.x=-Math.PI/2; floor.castShadow=false;
  for(let i=0;i<13;i++){
    const a=i/13*TAU, r=36+rand()*5;
    const hill=blob(p,Math.sin(a)*r,-3.2+rand()*.8,Math.cos(a)*r,8+rand()*7,5+rand()*2.7,8+rand()*6,['#aecdb0','#a6c8a8','#bad3ac'][i%3],true);
    hill.castShadow=false;
  }
  const loop=[[-6.9,-3.6],[-4.5,-5.15],[.3,-5.49],[5.15,-4.80],[7.05,-2.0],[7.13,1.7],[5.79,4.38],[1.6,5.63],[-2.3,5.95],[-5.48,5.30],[-7.32,2.44],[-7.45,-1.1]];
  parkPath(p,loop,.84,true);
  parkPath(p,[[-7.12,.64],[-5.42,1.10],[-2.78,1.32],[-.58,.97],[1.54,.44],[3.18,-.34],[4.45,-1.42],[6.54,-2.75]],.98);
  parkPath(p,[[1.10,5.93],[1.02,4.64],[.04,3.43],[-.61,2.04],[-.39,.92],[-.01,-.58],[-.84,-2.27],[-1.60,-3.67],[-1.30,-5.23]],.93);
  // Short entrance by the nearest fence has alternating inlaid pavers.
  parkPath(p,[[1.18,5.42],[1.5,6.52],[2.4,7.62],[2.62,8.54]],1.18);
  for(let i=0;i<5;i++){
    const o=box(p,2.26+i*.084,.054,7.13+i*.27,.79,.039,.12,i%2?C.pebble:'#e6c299',.018); o.rotation.y=.36;
  }
  const trees=[[-8.4,-4.7,1.13,'pear'],[-6.8,-6.4,1.05,'round'],[-4.1,-7.0,.89,'spruce'],[-2.3,-6.8,1.16,'pink'],[.3,-7.6,.83,'round'],[3.1,-6.75,1.12,'spruce'],[5.8,-6.15,1.06,'pear'],[7.85,-4.7,1.08,'round'],[8.85,-1.73,.78,'spruce'],[-9.0,.1,1.06,'round'],[-8.8,3.9,.79,'pear']];
  for(const [x,z,s,k] of trees) tree(p,x,z,s,k,rand);
  for(let i=0;i<24;i++) {
    const a=(i/24*TAU)*.86+.53;
    const x=Math.cos(a)*(13.9+rand()*3), z=Math.sin(a)*(11.6+rand()*3);
    if((z>4 && x>-5)||(x>8 && z>1)) continue;
    tree(p,x,z,.67+rand()*.54,i%4===0?'spruce':'round',rand);
  }
  fence(p,[-8.02,-3.6],[-6.85,-5.48]); fence(p,[-6.85,-5.48],[-3.5,-6.25]);
  fence(p,[-3.5,-6.25],[3.65,-6.22]); fence(p,[3.65,-6.22],[6.94,-5.53]);
  fence(p,[6.94,-5.53],[8.0,-3.37]); fence(p,[-8.02,-3.6],[-8.24,.08]); fence(p,[-8.24,.08],[-7.96,2.62]);
  fence(p,[-5.65,6.35],[-3.55,6.82]); fence(p,[-3.55,6.82],[-.04,6.86]);
  fence(p,[3.15,6.65],[5.38,6.04]);
  for(const [x,z,s] of [[-6.68,-4.32,.77],[-7.83,-2.65,.89],[-6.7,4.78,.72],[-6.9,4.13,.55],[-4.22,6.54,.73],[3.89,-5.47,.69],[5.86,-4.98,.67],[7.23,3.05,.7],[6.92,3.73,.85],[4.54,5.27,.7],[8.27,.11,.69],[-1.36,-5.82,.45],[-2.20,-5.74,.61]]) berryBush(p,x,z,s,rand,true);
  for(const [x,z,sz,n] of [[-6.5,3.1,.76,6],[-4.7,5.68,.66,6],[-.95,5.12,1.,8],[3.95,4.54,.77,8],[7.13,3.96,.8,8],[5.03,-4.92,.94,8],[-2.44,-5.82,.98,7],[-6.75,-3.84,.7,8],[-6.58,-.18,.9,6],[-1.78,1.87,.54,5],[2.9,-1.32,.42,4]]) flowers(p,x,z,sz,n,rand);
  for(const [x,z] of [[-5.9,2.65],[-7.47,.34],[-.40,5.21],[-1,5.26],[3.75,4.88],[5.9,4.82],[6.59,4.02],[4.02,-4.75],[-2.46,-4.72],[-6.9,-2.25],[.72,2.64],[2.84,-1.23]]) grassClump(p,x,z,.84+.3*rand(),C.leaf,rand);
  bench(p,-6.57,2.58,1.40); bench(p,4.71,-4.61,-.32);
  // A few small stones distinguish edges of the planted beds from the path.
  for(const [x,z,s] of [[-7.24,3.99,.32],[-6.92,4.36,.22],[6.8,4.23,.30],[7.07,4.13,.19],[-5.01,5.75,.24],[3.12,-5.45,.28],[3.40,-5.3,.17],[-2.0,1.94,.16]]) {
    blob(p,x,.09,z,s,.16,s*.72,'#aeb9a5');
  }
  return floor;
}

function pad(p,x,z,rx,rz) {
  oval(p,x,z,rx+.10,rz+.10,.043,'#c8b991');
  oval(p,x,z,rx,rz,.052,'#e8d3ae');
  oval(p,x,z,rx*.91,rz*.89,.058,'#efdcbb');
}

function swing(statics,moving) {
  const x=-4.60,z=-1.50, top=2.69, drop=2.00;
  pad(statics,x,z,2.09,1.52);
  const s=group(statics,x,0,z);
  for(const side of [-1,1]){
    for(const f of [-1,1]){
      const foot=v(side*1.47,.095,f*.91),joint=v(side*1.35,top-.03,0);
      beam(s,foot,joint,.119,C.aqua,.109,18);
      beam(s,foot,foot.clone().lerp(joint,.115),.131,C.teal,.126,16);
      const plug=blob(s,foot.x,foot.y,foot.z,.147,.073,.15,C.darkTeal);
      plug.rotation.y=side*.3;
    }
    beam(s,v(side*1.43,.90,-.59),v(side*1.43,.90,.59),.075,C.mint);
    for(const f of [-1,1]){
      blob(s,side*1.492,.90,.59*f,.038,.052,.052,C.gold);
    }
  }
  beam(s,v(-1.57,top,0),v(1.57,top,0),.145,C.gold,.145,24);
  for(const side of [-1,1]){
    beam(s,v(side*1.52,top,0),v(side*1.61,top,0),.15,C.coral,.142,20);
    blob(s,side*1.61,top,0,.045,.142,.142,C.coral);
    cylinder(s,side*.355,top-.126,0,.074,.065,.10,C.darkTeal);
  }
  // A small fabric garland decorates the fixed end of the timber, clear of the ropes.
  for(const side of [-1,1]){
    cord(s,[v(side*.62,top-.12,.09),v(side*.92,top-.23,.09),v(side*1.22,top-.13,.09)],.014,C.wick,9,5);
    for(let i=0;i<3;i++){
      const px=side*(.70+i*.19),py=top-.16-.037*Math.sin(i*Math.PI/2);
      const a=cylinder(s,px,py-.062,.095,.068,0,.133,[C.coral,C.cream,C.mint][i],3);
      a.scale.z=.23;
    }
  }
  const rig=group(moving,x,top,z);
  rig.userData.rideId='swing';
  const seatY=-drop;
  for(const side of [-1,1]){
    for(const f of [-1,1]){
      const a=v(side*.355,-.08,0), b=v(side*.36,seatY+.04,f*.152);
      beam(rig,a,b,.021,C.wick,.023,9);
      blob(rig,b.x,b.y+.048,b.z,.045,.067,.045,C.wick);
    }
    const hoop=mesh(rig,cached('swing-shackle',()=>new THREE.TorusGeometry(.057,.011,6,12)),C.darkTeal,side*.355,-.063,0);
    hoop.rotation.y=Math.PI/2;
  }
  box(rig,0,seatY,0,1.18,.13,.53,C.coral,.065);
  box(rig,0,seatY+.054,0,1.01,.057,.41,'#eaa480',.028);
  for(const side of [-1,1]) for(const f of [-1,1])
    blob(rig,side*.36,seatY+.066,f*.15,.034,.018,.034,C.gold);
  return {
    group:s, mobile:rig, entry:v(x,0,z+1.24),exit:v(x+.50,0,z+1.60),
    pose(angle=0){
      rig.rotation.x=-angle;
      const r=drop-.082;
      return {position:v(x,top-r*Math.cos(angle),z+r*Math.sin(angle)),yaw:0,tilt:-angle};
    }
  };
}

function canopy(p,x,y,z,rise,r,panels,colors,drop) {
  const g=group(p,x,y,z);
  const rings=[[.028,1.0],[.22,.73],[.51,.42],[.76,.20],[.96,.056],[1,0]];
  const verts=[],idx=[];
  for(let col=0;col<2;col++){
    verts.length=0; idx.length=0;
    for(let piece=col;piece<panels;piece+=2) {
      const start=verts.length/3,n=6;
      for(const [rad,level] of rings){
        for(let j=0;j<=n;j++){
          const t=j/n, angle=TAU*(piece+t)/panels;
          const fold=Math.sin(t*Math.PI);
          const rr=rad*r*(1+.020*fold);
          verts.push(Math.sin(angle)*rr,level*rise+fold*.047*rad,Math.cos(angle)*rr);
        }
      }
      for(let k=0;k<rings.length-1;k++) for(let j=0;j<n;j++){
        const a=start+k*(n+1)+j, b=a+n+1;
        idx.push(a,b,a+1,b,b+1,a+1);
      }
      const bottom=verts.length/3;
      for(let j=0;j<=n;j++){
        const t=j/n,angle=TAU*(piece+t)/panels,fold=Math.sin(t*Math.PI),rr=r*(1+.020*fold);
        verts.push(Math.sin(angle)*rr,-drop*(.32+.68*fold),Math.cos(angle)*rr);
      }
      const lip=start+(rings.length-1)*(n+1);
      for(let j=0;j<n;j++) idx.push(lip+j,bottom+j,lip+j+1,bottom+j,bottom+j+1,lip+j+1);
    }
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(verts.slice(),3));geom.setIndex(idx.slice());geom.computeVertexNormals();
    mesh(g,geom,colors[col]);
  }
  cylinder(g,0,-.026,0,r*.986,r*.975,.055,C.cream,panels*4);
  return g;
}

function slide(statics) {
  const cx=1.22,cz=-3.63,deck=1.57, sx=-1.01;
  pad(statics,cx,-2.78,2.15,1.98);
  const s=group(statics);
  for(const ix of [-1,1]) for(const iz of [-1,1]){
    const x=cx+ix*.56,z=cz+iz*.54;
    beam(s,v(x,.055,z),v(x,2.83,z),.109,C.wood,.093,16);
    cylinder(s,x,.17,z,.124,.127,.22,C.teal);
    cylinder(s,x,2.63,z,.108,.108,.16,C.gold);
  }
  box(s,cx,deck-.095,cz,1.40,.17,1.37,C.darkTeal,.055);
  for(let j=0;j<7;j++){
    box(s,cx-.54+j*.18,deck-.008,cz,.174,.08,1.24,j%2?'#d8b784':C.wick,.028);
  }
  const wall=(dx,dz,rot,color)=>{
    const g=group(s,cx+dx,1.91,cz+dz);g.rotation.y=rot;
    for(let i=0;i<5;i++) box(g,-.388+i*.194,0,0,.181,.60,.080,i%2===0?color:C.mint,.038);
    box(g,0,.322,0,1.12,.082,.104,C.cream,.04);
  };
  wall(.0,-.544,0,C.aqua);
  wall(.56,.0,Math.PI/2,C.aqua);
  const steps=6, stairStart=sx+.05, stairEnd=cx-.55;
  for(let j=0;j<steps;j++){
    const u=(j+.5)/steps, x=THREE.MathUtils.lerp(stairStart,stairEnd,u), y=(j+1)*deck/steps;
    box(s,x,y-.043,cz,(stairEnd-stairStart)/steps+.019,.086,.785,C.wick,.035);
    box(s,x-(stairEnd-stairStart)/steps*.44,y-.015,cz,.031,.039,.744,C.cream,.016);
  }
  for(const side of [-1,1]){
    const z=cz+side*.445;
    beam(s,v(sx-.012,.08,z),v(stairEnd+.12,deck-.13,z),.07,C.teal);
    for(let j=0;j<4;j++){
      const u=j/3,x=THREE.MathUtils.lerp(sx-.02,stairEnd,u),y=THREE.MathUtils.lerp(.10,deck,u);
      beam(s,v(x,y-.006,z),v(x,y+.53,z),.041,C.aqua);
    }
    beam(s,v(sx-.02,.64,z),v(stairEnd,deck+.53,z),.054,C.coral,.055,12);
    blob(s,sx-.02,.64,z,.057,.06,.057,C.coral);
  }
  canopy(s,cx,2.88,cz,.60,.99,8,[C.coral,'#ed917c'],.12);
  beam(s,v(cx,3.43,cz),v(cx,3.86,cz),.031,C.gold);
  blob(s,cx,3.87,cz,.052,.065,.052,C.gold);
  const flag=new THREE.BufferGeometry();
  flag.setAttribute('position',new THREE.Float32BufferAttribute([
    cx,3.80,cz,cx+.36,3.68,cz+.025,cx,3.57,cz, cx,3.57,cz,cx+.36,3.68,cz+.025,cx,3.80,cz],3));
  flag.computeVertexNormals();mesh(s,flag,C.gold);
  // Four continuous curves form a shallow U-shaped trough with raised sides.
  const spline=new THREE.CatmullRomCurve3([v(cx,deck+.089,cz+.10),v(cx+.015,deck+.088,cz+.46),
       v(cx+.035,deck+.070,cz+.68),v(cx+.07,1.43,cz+.97),v(cx+.32,1.03,cz+1.36),v(cx+.63,.58,cz+1.78),
       v(cx+.86,.30,cz+2.10),v(cx+1.03,.255,cz+2.42),v(cx+1.10,.265,cz+2.76)],false,'centripetal');
  const lateral=(tan)=>v(tan.z,0,-tan.x).normalize();
  const widths=[-.435,-.389,-.333,-.267,0,.267,.333,.389,.435];
  const heights=[.196,.169,.065,.011,0,.011,.065,.169,.196];
  const verts=[],idx=[], edges=[[],[]],n=38;
  for(let i=0;i<=n;i++){
    const t=i/n,c=spline.getPointAt(t),side=lateral(spline.getTangentAt(t));
    for(let j=0;j<widths.length;j++){
      const h=heights[j]*(1-.35*t),p=c.clone().addScaledVector(side,widths[j]);
      p.y+=h;
      verts.push(p.x,p.y,p.z);
      if(j===0||j===widths.length-1) edges[j===0?0:1].push(p.clone());
      if(i&&j){
        const k=i*widths.length+j,l=k-widths.length;
        idx.push(l-1,k-1,l,k-1,k,l);
      }
    }
  }
  const geom=new THREE.BufferGeometry(); geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geom.setIndex(idx);geom.computeVertexNormals();
  mesh(s,geom,C.mint);
  const bottom=geom.clone();
  const backIdx=Array.from(idx).reverse(); bottom.setIndex(backIdx); bottom.translate(0,-.050,0);bottom.computeVertexNormals();
  mesh(s,bottom,C.teal);
  for(const edge of edges) cord(s,edge,.055,C.aqua,40,9);
  for(const t of [.30,.72,.95]){
    const c=spline.getPointAt(t),r=lateral(spline.getTangentAt(t));
    for(const sign of [-1,1]){
      const q=c.clone().addScaledVector(r,sign*.285);
      beam(s,v(q.x,.07,q.z),v(q.x,q.y-.10,q.z),.053,C.wood);
    }
    const a=c.clone().addScaledVector(r,-.32),b=c.clone().addScaledVector(r,.32);
    a.y-=.089;b.y-=.089;
    beam(s,a,b,.046,C.teal);
  }
  const end=spline.getPointAt(1);
  return {
    group:s, entry:v(sx-.34,0,cz), exit:v(end.x+.03,0,end.z+.57),
    climb(t){
      const u=THREE.MathUtils.clamp(t,0,1);
      const x=THREE.MathUtils.lerp(sx-.20,cx,u);
      const h=THREE.MathUtils.clamp((x-stairStart)/(stairEnd-stairStart),0,1)*deck;
      return {position:v(x,h+.04,cz),yaw:Math.PI/2*(1-THREE.MathUtils.smoothstep(u,.73,1))};
    },
    sample(t){
      const u=THREE.MathUtils.clamp(t,0,1),d=spline.getTangentAt(u);
      return {position:spline.getPointAt(u),yaw:Math.atan2(d.x,d.z),slope:Math.asin(d.y)};
    }
  };
}

function trampoline(statics,moving) {
  const x=4.80,z=2,top=.63,r=1.37;
  pad(statics,x,z,1.89,1.84);
  const s=group(statics,x,0,z);
  for(let j=0;j<8;j++) {
    const a=j*TAU/8;
    const bx=Math.sin(a)*1.24,bz=Math.cos(a)*1.24;
    const side=v(Math.cos(a),0,-Math.sin(a));
    const base=v(bx,.09,bz);
    cord(s,[base.clone().addScaledVector(side,-.22).setY(.49),base.clone().addScaledVector(side,-.21),
      base.clone().addScaledVector(side,.21),base.clone().addScaledVector(side,.22).setY(.49)],.042,C.teal,14,8);
  }
  cylinder(s,0,.47,0,r+.03,r-.045,.25,C.darkTeal,52);
  ring(s,0,.394,0,r-.018,.043,C.mint);
  ring(s,0,.576,0,r-.013,.077,C.aqua);
  const pads=12;
  for(let j=0;j<pads;j++){
    const d=TAU/pads, arc=new THREE.TorusGeometry(r-.10,.131,12,10,d*.976);
    const o=mesh(s,arc,j%3===0?'#eeb982':j%3===1?'#efcc8d':'#f3d49d',0,.592,0);
    o.rotation.x=Math.PI/2; o.rotation.z=j*d;
  }
  const surface=group(moving,x,.001,z);
  const vertices=[],indices=[], dist=[];
  const turns=44,rings=10,rr=r-.219;
  for(let k=0;k<=rings;k++) for(let j=0;j<=turns;j++){
    const u=k/rings,theta=j/turns*TAU;
    vertices.push(rr*u*Math.sin(theta),top,rr*u*Math.cos(theta)); dist.push(u);
    if(k&&j){const i=k*(turns+1)+j;indices.push(i-turns-2,i-1,i-turns-1,i-1,i,i-turns-1);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const matMesh=mesh(surface,geometry,C.navy); matMesh.castShadow=false;
  const decoration=group(surface);
  ring(decoration,0,top+.005,0,.29,.013,'#88aab1');
  for(let i=0;i<8;i++){
    const a=i*TAU/8;
    const dash=box(decoration,.42*Math.sin(a),top+.007,.42*Math.cos(a),.025,.01,.092,'#a2c2bc',0);
    dash.rotation.y=a;
  }
  // Stepping stool at the open edge.
  box(s,0,.125,1.48,.78,.19,.42,C.aqua,.065);
  box(s,0,.216,1.48,.80,.074,.45,C.mint,.037);
  let last=-1;
  return {
    group:s,mobile:surface,entry:v(x,0,z+1.81),exit:v(x+.60,0,z+1.64),
    pose(height=0,compression=0){
      const d=THREE.MathUtils.clamp(compression,0,.305);
      if(Math.abs(last-d)>.0002) {
        const points=geometry.attributes.position;
        for(let i=0;i<dist.length;i++) points.setY(i,top-d*(1-dist[i]*dist[i]));
        points.needsUpdate=true; geometry.computeVertexNormals();
        decoration.position.y=-d*.91;last=d;
      }
      return {position:v(x,top+.005-d+height,z),yaw:.14};
    }
  };
}

function pony(p,colo,mane,trim) {
  blob(p,0,.58,.01,.19,.193,.354,colo,true);
  const neck=blob(p,0,.755,.222,.128,.232,.16,colo,true); neck.rotation.x=.39;
  const face=blob(p,0,.855,.326,.141,.143,.178,colo,true); face.rotation.x=-.14;
  blob(p,0,.821,.438,.121,.093,.132,colo,true);
  for(const side of [-1,1]){
    const ear=blob(p,side*.079,.985,.280,.043,.097,.052,colo);ear.rotation.z=-side*.20;
    const inner=blob(p,side*.079,.995,.304,.023,.053,.017,trim);inner.rotation.z=-side*.20;
    blob(p,side*.128,.885,.361,.021,.026,.019,'#4e443e');
    blob(p,side*.134,.894,.369,.009,.009,.008,C.cream);
  }
  for(let i=0;i<4;i++){
    const dz=.261-i*.033,dy=.938-i*.057;
    const strand=blob(p,0,dy,dz-.085,.078,.074,.092,mane);
    strand.rotation.x=.38;
  }
  for(const side of [-1,1]) for(const front of [-1,1]){
    const a=v(side*.112,.50,front*.165), b=v(side*.145,.275,front*.212);
    beam(p,a,b,.053,colo,.045);
    blob(p,b.x,.267,b.z,.058,.058,.065,mane);
  }
  const tail=blob(p,0,.494,-.33,.067,.172,.083,mane);tail.rotation.x=.38;
  // Paired blankets beneath the curved little saddle.
  const saddle=blob(p,0,.742,-.025,.194,.052,.158,trim,true);saddle.rotation.x=-.05;
  blob(p,0,.772,-.018,.164,.049,.133,'#a87555',true);
  for(const side of [-1,1]){
    cord(p,[v(side*.112,.858,.420),v(side*.137,.814,.348),v(side*.107,.708,.150)],.012,trim,10,5);
  }
}
function carousel(statics,moving) {
  const x=-3,z=3.80,r=1.48;
  pad(statics,x,z,1.84,1.75);
  const s=group(statics,x,0,z);
  cylinder(s,0,.105,0,r-.15,r-.24,.15,C.teal,54);
  const platform=group(moving,x,0,z);platform.userData.rideId='carousel';
  cylinder(platform,0,.184,0,r,r-.03,.161,C.coral,56);
  ring(platform,0,.192,0,r-.015,.039,C.gold);
  cylinder(platform,0,.291,0,r-.027,r-.022,.075,C.wick,60);
  ring(platform,0,.332,0,r-.106,.027,C.cream);
  ring(platform,0,.333,0,.81,.018,C.gold);
  for(let j=0;j<18;j++){
    const a=j*TAU/18;
    blob(platform,Math.sin(a)*(r-.011),.187,Math.cos(a)*(r-.011),.043,.045,.042,C.cream);
  }
  // Canopy and center column are on a fixed axis; the four ponies revolve below.
  cylinder(s,0,1.50,0,.13,.185,2.34,C.aqua,24);
  for(let j=0;j<5;j++) ring(s,0,.47+j*.42,0,.17-j*.007,.029,C.cream);
  cylinder(s,0,2.18,0,.28,.137,.14,C.gold,24);
  for(let j=0;j<8;j++){
    const a=j*TAU/8;
    beam(s,v(0,2.24,0),v(1.12*Math.sin(a),2.50,1.12*Math.cos(a)),.029,C.wick);
  }
  canopy(s,0,2.51,0,.74,1.52,16,[C.coral,C.cream],.145);
  ring(s,0,2.49,0,1.531,.025,C.gold);
  cylinder(s,0,3.26,0,.062,.11,.15,C.gold,16);
  blob(s,0,3.42,0,.092,.103,.092,C.gold);
  const seatRadius=1.003, baseAngle=-.57,seatHeight=.333+.808;
  const shades=[['#fff0cd','#dbaf7b','#77ada1'],['#d99b77','#aa735c','#eac66e'],['#b6cab8','#6a9b89','#eaa69c'],['#e9c6b0','#be8e77','#87b6b5']];
  for(let j=0;j<4;j++){
    const a=j*TAU/4+baseAngle,px=seatRadius*Math.sin(a),pz=seatRadius*Math.cos(a);
    const g=group(platform,px,.333,pz);g.rotation.y=a+Math.PI/2;
    beam(g,v(0,.01,.125),v(0,2.092,.125),.031,C.gold,.030,12);
    cylinder(g,0,.10,.125,.069,.091,.14,C.gold,14);
    pony(g,...shades[j]);
  }
  return {
    group:s,mobile:platform,entry:v(x+1.79,0,z-.20),exit:v(x+1.69,0,z+.63),
    pose(angle=0,seat=0){
      platform.rotation.y=angle;
      const a=angle+((seat%4)+4)%4*TAU/4+baseAngle;
      return {position:v(x+seatRadius*Math.sin(a),seatHeight,z+seatRadius*Math.cos(a)),yaw:a+Math.PI/2};
    }
  };
}

// Keep each moving mechanism independent but bake its stationary details into
// vertex-colored batches, so a phone submits a handful of shadow draw calls.
const combinedMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});
function combine(parent,mark) {
  parent.updateWorldMatrix(true,true);
  const rootInv=parent.matrixWorld.clone().invert(),sets=new Map(),all=[];
  parent.traverse(node=>{if(node.isMesh)all.push(node);});
  for(const obj of all) {
    const geom=obj.geometry,positions=geom.attributes.position,normals=geom.attributes.normal;
    const key=(obj.castShadow?'s':'n')+(obj.receiveShadow?'r':'n');
    if(!sets.has(key))sets.set(key,{pts:[],nrm:[],cols:[],ix:[],cast:obj.castShadow,receive:obj.receiveShadow});
    const batch=sets.get(key),offset=batch.pts.length/3;
    const matrix=rootInv.clone().multiply(obj.matrixWorld),norm=new THREE.Matrix3().getNormalMatrix(matrix);
    const p=new THREE.Vector3(),normal=new THREE.Vector3(),cc=obj.material.color;
    for(let j=0;j<positions.count;j++){
      p.fromBufferAttribute(positions,j).applyMatrix4(matrix);
      normal.fromBufferAttribute(normals,j).applyMatrix3(norm).normalize();
      batch.pts.push(p.x,p.y,p.z);batch.nrm.push(normal.x,normal.y,normal.z);
      batch.cols.push(cc.r,cc.g,cc.b);
    }
    if(geom.index)for(let j=0;j<geom.index.count;j++) batch.ix.push(offset+geom.index.getX(j));
    else for(let j=0;j<positions.count;j++)batch.ix.push(offset+j);
  }
  parent.clear();
  for(const b of sets.values()){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.pts,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(b.nrm,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(b.cols,3));
    g.setIndex(b.ix);g.computeBoundingSphere();
    const m=new THREE.Mesh(g,combinedMaterial);
    m.castShadow=b.cast;m.receiveShadow=b.receive;
    if(mark)m.userData.rideId=mark;
    parent.add(m);
  }
}
function lights(scene) {
  scene.background=new THREE.Color('#d0e8e2');
  scene.fog=new THREE.Fog('#d1e4d7',25,75);
  const hemi=new THREE.HemisphereLight('#fff7e9','#b5c6ab',1.62);
  scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff0d5',2.48);
  sun.position.set(-8.2,14.0,7.7);
  sun.target.position.set(0,0,-.1);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1536,1536);
  const c=sun.shadow.camera;c.left=-13;c.right=13;c.top=12;c.bottom=-12;c.near=.25;c.far=39;
  sun.shadow.bias=-.00035;sun.shadow.normalBias=.031;sun.shadow.radius=3;
  scene.add(sun,sun.target);
  const rim=new THREE.DirectionalLight('#daeae9',.55);rim.position.set(4,6,-9);scene.add(rim);
}

function gardenButterflies(parent) {
  const spots=[[-2.12,1.69,'#eda564'],[4.82,-4.12,'#e68f99'],[-6.42,2.95,'#eab856']];
  const swarm=new THREE.InstancedMesh(cached('butterfly oval',()=>new THREE.SphereGeometry(1,10,7)),
                   new THREE.MeshStandardMaterial({color:0xffffff,roughness:.91}),5*spots.length);
  swarm.frustumCulled=false;
  parent.add(swarm);
  for(let i=0;i<spots.length;i++){
    swarm.setColorAt(i*5,new THREE.Color('#756953'));
    for(let j=1;j<5;j++) swarm.setColorAt(i*5+j,new THREE.Color(j<=2?spots[i][2]:'#f4c99c'));
  }
  const body=new THREE.Object3D(),part=new THREE.Object3D(),product=new THREE.Matrix4();
  function partAt(index,x,y,z,rx,rz,sx,sy,sz){
    part.position.set(x,y,z);part.rotation.set(rx,0,rz);part.scale.set(sx,sy,sz);part.updateMatrix();
    swarm.setMatrixAt(index,product.multiplyMatrices(body.matrix,part.matrix));
  }
  return (time)=>{
    for(let i=0;i<spots.length;i++){
      const [x,z]=spots[i],f=time*.65+i*2.7;
      body.position.set(x+.38*Math.sin(f),.40+.115*Math.sin(2.3*f+i),z+.29*Math.cos(1.09*f));
      body.rotation.set(.16*Math.sin(f),f+.7,.14*Math.sin(1.3*f));body.updateMatrix();
      const flap=.27+.57*(.5+.5*Math.sin(time*10.5+i*1.9));
      partAt(i*5,0,0,0,.24,0,.024,.028,.098);
      for(let side=0;side<2;side++){
        const sign=side?1:-1;
        partAt(i*5+1+side,sign*.078*Math.cos(flap),.068*Math.sin(flap),.018,.29,sign*flap,.107,.024,.083);
        partAt(i*5+3+side,sign*.053*Math.cos(flap),.047*Math.sin(flap),-.065,-.14,sign*flap,.073,.021,.066);
      }
    }
    swarm.instanceMatrix.needsUpdate=true;
  };
}

export function buildWorld(scene) {
  lights(scene);
  const root=new THREE.Group(); root.name='Clover Garden'; scene.add(root);
  const terrain=group(root),mobile=group(root),land=landscape(terrain);
  terrain.remove(land);root.add(land);land.userData.ground=true;
  const constructors={swing,slide,trampoline,carousel},rides={},pickables=[];
  for(const [id,build] of Object.entries(constructors)){
    const fixed=group(root);fixed.name=id;fixed.userData.rideId=id;
    const ride=build(fixed,mobile);rides[id]=ride;
    combine(fixed,id);
    pickables.push(...fixed.children);
    ride.group=fixed;
    if(ride.mobile){
      ride.mobile.userData.rideId=id;
      if(id!=='trampoline') combine(ride.mobile,id);
      ride.mobile.traverse(obj=>{if(obj.isMesh){obj.userData.rideId=id;pickables.push(obj);}});
    }
  }
  combine(terrain);
  const animateGarden=gardenButterflies(root);
  animateGarden(0);
  const anchors={swing:v(-4.60,3.07,-1.50),slide:v(1.22,3.94,-3.63),trampoline:v(4.8,1.35,2.0),carousel:v(-3.,3.67,3.80)};
  const bubbleAnchors={swing:v(-4.60,2.18,-1.50),slide:v(1.22,2.68,-3.63),trampoline:v(4.8,.88,2),carousel:v(-3,2.3,3.8)};
  return {root,land,anchors,bubbleAnchors,rides,pickables,update:animateGarden};
}
