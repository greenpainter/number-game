// Reserve a real finger-sized area, independent of SVG viewBox and screen size.
export function arrangeMapPins(points,{left,top,right,bottom},gap=50){
  const placed=[];
  for(const p of points){
    let best=null;
    for(let ring=0;ring<=12&&!best;ring++){
      const count=ring?Math.max(8,ring*8):1;
      for(let i=0;i<count;i++){
        const angle=i*Math.PI*2/count,x=p.x+Math.cos(angle)*ring*9,y=p.y+Math.sin(angle)*ring*9;
        if(x<left+25||x>right-25||y<top+25||y>bottom-25)continue;
        if(placed.every(q=>Math.hypot(q.x-x,q.y-y)>=gap)){best={...p,x,y};break}
      }
    }
    placed.push(best??{...p});
  }
  return placed;
}
export function nearestMapPin(points,x,y,radius=26){
  let closest=null,distance=radius;
  for(const p of points){const d=Math.hypot(p.x-x,p.y-y);if(d<=distance){distance=d;closest=p}}
  return closest;
}
