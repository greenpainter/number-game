const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class MapViewport{
  constructor(){this.reset()}
  reset(){this.zoom=1;this.x=0;this.y=0}
  get width(){return 900/this.zoom}
  get height(){return 520/this.zoom}
  get viewBox(){return `${this.x} ${this.y} ${this.width} ${this.height}`}
  pan(dx,dy){this.x=clamp(this.x+dx,0,900-this.width);this.y=clamp(this.y+dy,0,520-this.height)}
  scale(value,anchor={x:this.x+this.width/2,y:this.y+this.height/2}){
    const u=(anchor.x-this.x)/this.width,v=(anchor.y-this.y)/this.height;
    this.zoom=clamp(value,1,4);this.x=anchor.x-u*this.width;this.y=anchor.y-v*this.height;this.pan(0,0);
  }
}

export function attachMapViewport(svg,toolbar){
  const view=new MapViewport(),pointers=new Map();let gesture=null,suppressUntil=0;
  toolbar.innerHTML='<button type="button" aria-label="지도 축소">−</button><output aria-live="polite">100%</output><button type="button" aria-label="지도 확대">+</button><button type="button" aria-label="지도 전체 보기">⛶</button>';
  const [outButton,inButton,resetButton]=toolbar.querySelectorAll('button'),output=toolbar.querySelector('output');
  function render(){svg.setAttribute('viewBox',view.viewBox);output.textContent=Math.round(view.zoom*100)+'%';outButton.disabled=view.zoom===1;inButton.disabled=view.zoom===4;svg.classList.toggle('zoomed',view.zoom>1)}
  function point(x,y){const p=svg.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(svg.getScreenCTM().inverse())}
  outButton.onclick=()=>{view.scale(view.zoom/1.4);render()};inButton.onclick=()=>{view.scale(view.zoom*1.4);render()};resetButton.onclick=()=>{view.reset();render()};
  svg.addEventListener('wheel',e=>{e.preventDefault();view.scale(view.zoom*Math.exp(-e.deltaY*.002),point(e.clientX,e.clientY));render()},{passive:false});
  function baseline(){const p=[...pointers.values()];gesture=p.length?{points:p.map(v=>({...v})),x:view.x,y:view.y,zoom:view.zoom,width:view.width,height:view.height}:null}
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});baseline();if(pointers.size>1)suppressUntil=performance.now()+500});
  svg.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)||!gesture)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...pointers.values()],g=gesture;
    const mid=arr=>({x:arr.reduce((s,v)=>s+v.x,0)/arr.length,y:arr.reduce((s,v)=>s+v.y,0)/arr.length});
    const a=mid(g.points),b=mid(p),dx=b.x-a.x,dy=b.y-a.y;
    if(p.length===1&&Math.hypot(dx,dy)<6)return;
    e.preventDefault();suppressUntil=performance.now()+500;
    // Capture only after dragging so a plain tap still reaches its map pin.
    svg.setPointerCapture(e.pointerId);
    view.zoom=g.zoom;view.x=g.x;view.y=g.y;render();
    const anchor=point(a.x,a.y);
    if(p.length===2){const dist=arr=>Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y);view.scale(g.zoom*dist(p)/Math.max(1,dist(g.points)),anchor)}
    const r=svg.getBoundingClientRect(),units=Math.max(view.width/r.width,view.height/r.height);view.pan(-dx*units,-dy*units);render();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(name,e=>{if(pointers.delete(e.pointerId))baseline()});
  svg.addEventListener('pointerleave',e=>{if(!svg.hasPointerCapture(e.pointerId)&&pointers.delete(e.pointerId))baseline()});
  svg.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  render();return {reset(){pointers.clear();gesture=null;suppressUntil=0;view.reset();render()}};
}
