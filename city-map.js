import {PARK,PLAY_ACTIVITIES} from './playground-layout.js';
import {FOREST,FOREST_TRAIL,FOREST_TREES,VILLAGE_EVENTS,EVENT_HUBS} from './adventure-layout.js';
import city from './city-layout.js';
import water from './waterfront-layout.js';
import rail from './railway-layout.js';
import {ringRoad,bridgeRoute} from './road-layout.js';
import townRoads from './town-roads.js';
import roadConnectors from './road-connectors.js';
import {attachMapViewport} from './map-viewport.js';
import {arrangeMapPins,nearestMapPin} from './map-pins.js';
import {METRO_LOOP} from './metro-loop.js';

const details=[
  ['🏡','마을','익숙한 우리 마을에서 다시 출발해요.'],['🚌','탈것','빨강·파랑·초록 버스가 기다려요.'],
  ['🚓','시설','경찰차를 타고 도시를 순찰해요.'],['✈️','탈것','비행기를 타고 도시를 내려다봐요.'],
  ['🦒','놀거리','열두 종류의 동물 가족을 만나요.'],['⛰️','놀거리','산 아래 어두운 터널을 탐험해요.'],
  ['🚒','시설','서쪽 마을을 지키는 소방서예요.'],['🚒','시설','동쪽 마을에서 소방차를 불러요.'],
  ['🌉','놀거리','휘어진 고가도로 위로 올라가요.'],['🌲','마을','숲길을 따라 다양한 집을 구경해요.'],
  ['🌷','마을','정원과 곡선 도로가 있는 동네예요.'],['🌳','놀거리','강변 산책길과 다리를 둘러봐요.'],
  ['⛴️','탈것','유람선을 타고 강을 여행해요.'],['🏘️','마을','강 건너 새로운 동네를 찾아가요.'],
];
const P=(x,z)=>[24+(x-city.world.minX)*1.28,28+(z-city.world.minZ)*1.28];
const line=points=>points.map(([x,z])=>P(x,z).map(n=>n.toFixed(1)).join(',')).join(' ');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCityMap({dialog,art,list,onTravel,onStation}){
  let selected=null,filter='전체',travelStarted=false;
  const places=city.destinations.map((p,i)=>({...p,index:i,icon:details[i][0],category:details[i][1],description:details[i][2]}));
  for(const id of METRO_LOOP){const station=water.stations.find(s=>s.id===id);places.push({...station.boarding,name:station.name,index:places.length,stationId:id,icon:'🚇',category:'지하철',description:'헬기를 타고 지하철역 입구로 가요.'})}
  places.push({...PARK.entry,name:'무지개 놀이터',icon:'🛝',category:'놀거리',index:places.length,description:'열 가지 놀이가 기다려요.'});
  for(const p of PLAY_ACTIVITIES)places.push({...p.entry,name:p.name,icon:p.icon,category:'놀거리',index:places.length,description:p.line,listOnly:true});
  places.push({...FOREST.entry,name:FOREST.name,icon:FOREST.icon,category:'동물 숲',index:places.length,description:'숲속을 걷는 동물 친구들에게 인사해요.'});
  for(const h of EVENT_HUBS)places.push({x:h.x,z:h.z+24,name:h.name,icon:h.icon,category:'새 놀이',index:places.length,description:'그림을 누르면 새 놀이를 시작해요.'});
  for(const e of VILLAGE_EVENTS)places.push({...e.entry,eventId:e.id,name:e.name,icon:e.icon,category:'새 놀이',index:places.length,description:e.line,listOnly:true});
  dialog.querySelector('.atlas-directory-heading span').textContent=places.length+'곳';
  const svg=[];
  const path=(points,cls,extra='')=>svg.push(`<polyline points="${line(points)}" class="${cls}" ${extra}/>`);
  const rect=(x,z,w,d,cls,r=0)=>{const [px,py]=P(x-w/2,z-d/2);svg.push(`<rect x="${px}" y="${py}" width="${w*1.28}" height="${d*1.28}" rx="${r}" class="${cls}"/>`)};
  svg.push('<rect width="900" height="520" rx="20" fill="#eaf0d9"/><path d="M0 65 Q150 30 280 80 T600 32 L600 0 H0Z" fill="#d2e0bd"/><path d="M0 440 Q230 385 445 464 T900 441 V520 H0Z" fill="#dde8ca"/>');
  rect(PARK.x,PARK.z,PARK.width,PARK.depth,'atlas-zoo',9);
  rect(FOREST.x,FOREST.z,FOREST.width,FOREST.depth,'atlas-zoo',18);path(FOREST_TRAIL.map(p=>[p.x,p.z]),'atlas-promenade');
  for(const [x,z] of FOREST_TREES.filter((_,i)=>i%3===0)){const [px,py]=P(x,z);svg.push(`<text x="${px}" y="${py}" class="atlas-animal">🌲</text>`)}
  rect(-191,74,142,183,'atlas-zoo',14);
  for(const h of city.zoo.habitats)rect(h.x,h.z,32,28,'atlas-habitat',6);
  for(const [i,h] of city.zoo.habitats.entries()){const [x,y]=P(h.x,h.z);svg.push(`<text x="${x}" y="${y+4}" class="atlas-animal">${['🐘','🦒','🦓','🦁','🐼','🐧','🦛','🦏','🐻','🦩','🦘','🐢'][i]}</text>`)}
  const river=water.river.points;path(river.map(([x,z])=>[x-19,z]),'atlas-promenade');path(river.map(([x,z])=>[x+19,z]),'atlas-promenade');path(river,'atlas-water');
  for(let z=-150;z<165;z+=36){const p=river[Math.floor((z+176)/2)], [x,y]=P(p[0],z);svg.push(`<path d="M${x-4} ${y} q4 -3 8 0 t8 0" class="atlas-ripple"/>`)}
  const routes=[{points:[...ringRoad(),ringRoad()[0]],width:10},...city.districtRoads,{points:water.road,width:9}];
  for(const r of routes){path(r.points,'atlas-road-edge',`style="stroke-width:${(r.width??9)*1.28+4}px"`);path(r.points,'atlas-road',`style="stroke-width:${(r.width??9)*1.28}px"`)}
  for(const r of [...townRoads,...roadConnectors]){path(r.points,'atlas-local-edge');path(r.points,'atlas-local-road')}
  for(const b of water.bridges){path([[b.z===-100?132:b.z===30?181:127,b.z],[340,b.z]],'atlas-local-edge');path([[b.z===-100?132:b.z===30?181:127,b.z],[340,b.z]],'atlas-local-road');path([[b.x-40,b.z],[b.x+40,b.z]],'atlas-bridge')}
  path(bridgeRoute(),'atlas-overpass-edge');path(bridgeRoute(),'atlas-overpass');
  const {left,right,top,bottom,radius}=rail.rail;const railPoints=[];
  for(const [x,z,start] of [[right-radius,top+radius,-90],[right-radius,bottom-radius,0],[left+radius,bottom-radius,90],[left+radius,top+radius,180]])for(let i=0;i<=8;i++){const a=(start+i*90/8)*Math.PI/180;railPoints.push([x+Math.cos(a)*radius,z+Math.sin(a)*radius])}
  railPoints.push(railPoints[0]);path(railPoints,'atlas-rail');
  for(const h of [...city.residences,...water.homes]){const [x,y]=P(h.x,h.z);svg.push(`<rect x="${x-h.width*.64}" y="${y-h.depth*.64}" width="${h.width*1.28}" height="${h.depth*1.28}" rx="2" fill="${['#ca9470','#819d95','#b5a08a','#a0b5ac'][h.palette%4]}" transform="rotate(${-(h.rotation??0)*180/Math.PI} ${x} ${y})"/>`)}
  for(const [x,z] of rail.houses)rect(x,z,5.2,4.8,'atlas-home',2);
  rect(122,-63,12,78,'atlas-runway',4);path([[122,-97],[122,-29]],'atlas-runway-line');
  // Station locations follow the same layout as the playable entrances.
  const stationOrder=METRO_LOOP.map(id=>water.stations.find(s=>s.id===id));path([...stationOrder,stationOrder[0]].map(s=>[s.x,s.z]),'atlas-metro');
  for(const [name,x,z] of [['숲마을',-171,-142],['정원마을',-45,165],['동물원',-190,-27],['중앙 마을',-4,-57],['공항',139,-84],['강동 마을',336,-80],['강변 공원',295,108]]){const [px,py]=P(x,z);svg.push(`<text x="${px}" y="${py}" class="atlas-district">${name}</text>`)}
  svg.push('<g class="atlas-compass" transform="translate(865 36)"><text y="-9">N</text><path d="M0 0 L-5 14 L0 10 L5 14Z"/></g>');
  art.innerHTML=`<svg viewBox="0 0 900 520" role="img" aria-label="현재 도시 지도. 강, 세 다리, 동물원, 공항, 주거 구역과 지하철역이 표시되어 있어요.">${svg.join('')}<g id="atlas-pins"></g><g id="atlas-player"><circle r="11" class="atlas-player-halo"/><circle r="5" class="atlas-player-dot"/><text y="-16" class="atlas-player-label">내 위치</text></g></svg><div class="atlas-legend"><span><i class="legend-river"></i>강</span><span><i class="legend-road"></i>도로</span><span><i class="legend-metro"></i>지하철 연결</span><span><i class="legend-player"></i>내 위치</span></div>`;
  const toolbar=document.createElement('div');toolbar.className='atlas-zoom';toolbar.setAttribute('aria-label','지도 확대와 축소');art.prepend(toolbar);
  function travel(p){if(travelStarted)return;travelStarted=true;if(p.stationId)onStation?.(p.stationId);else onTravel(p)}
  const mapSvg=art.querySelector('svg'),pins=art.querySelector('#atlas-pins'),buttons=[];
  let pinScreens=[];
  places.forEach(p=>{
    if(p.listOnly){buttons.push(null);return}
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','atlas-pin atlas-touch-pin');g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',p.name+' 헬기로 가기');
    g.innerHTML=`<title>${esc(p.name)}</title><path class="atlas-leader"/><g class="atlas-bubble"><circle class="atlas-hit" r="26"/><circle class="atlas-disc" r="21"/><text y="8">${p.icon}</text></g>`;
    g.addEventListener('click',()=>select(p.index));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(p.index)}});pins.append(g);buttons.push(g);
  });
  function layoutPins(){
    const matrix=mapSvg.getScreenCTM(),bounds=mapSvg.getBoundingClientRect();if(!matrix||!bounds.width||!bounds.height)return;
    const scale=Math.hypot(matrix.a,matrix.b),inverse=matrix.inverse(),point=(x,y,m)=>new DOMPoint(x,y).matrixTransform(m);
    const anchors=places.filter(p=>!p.listOnly&&(filter==='전체'||p.category===filter)).map(p=>{const [x,y]=P(p.x,p.z),s=point(x,y,matrix);return {index:p.index,x:s.x,y:s.y,worldX:x,worldY:y}}).filter(p=>p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom);
    pinScreens=arrangeMapPins(anchors,bounds);
    for(const b of buttons)if(b)b.style.display='none';
    for(const pin of pinScreens){
      const b=buttons[pin.index],world=point(pin.x,pin.y,inverse);b.style.display='';b.setAttribute('transform',`translate(${world.x} ${world.y})`);
      b.querySelector('.atlas-bubble').setAttribute('transform',`scale(${1/scale})`);
      b.querySelector('.atlas-leader').setAttribute('d',`M0 0 L${pin.worldX-world.x} ${pin.worldY-world.y}`);
    }
  }
  const viewport=attachMapViewport(mapSvg,toolbar,{
    findTarget:(x,y)=>nearestMapPin(pinScreens,x,y),onTap:pin=>select(pin.index),onChange:layoutPins,
    onPress:pin=>buttons.forEach((b,i)=>b?.classList.toggle('is-pressed',i===pin?.index)),
  });
  new ResizeObserver(layoutPins).observe(mapSvg);
  const filters=dialog.querySelector('.atlas-filters');
  for(const cat of ['전체','새 놀이','동물 숲','마을','놀거리','탈것','시설','지하철']){const b=document.createElement('button');b.innerHTML=`<span aria-hidden="true">${{'전체':'🗺️','새 놀이':'🎉','동물 숲':'🌳','마을':'🏡','놀거리':'🛝','탈것':'🚌','시설':'🏥','지하철':'🚇'}[cat]}</span>${cat}`;b.type='button';b.setAttribute('aria-pressed',cat===filter);b.addEventListener('click',()=>{filter=cat;for(const c of filters.children)c.setAttribute('aria-pressed',c===b);renderList()});filters.append(b)}
  function renderList(){list.replaceChildren();places.forEach(p=>{const show=filter==='전체'||p.category===filter;if(!show)return;const b=document.createElement('button');b.className='atlas-place';b.dataset.index=p.index;b.setAttribute('aria-pressed',selected===p.index);b.innerHTML=`<span class="atlas-place-icon">${p.icon}</span><span><strong>${esc(p.name)}</strong><small>${p.category}</small></span><span class="atlas-place-number" aria-hidden="true">🚁</span>`;b.addEventListener('click',()=>select(p.index));list.append(b)});layoutPins()}
  function select(index){selected=index;travel(places[index])}
  renderList();
  return {open(actor){travelStarted=false;const [x,y]=P(actor.x,actor.z);art.querySelector('#atlas-player').setAttribute('transform',`translate(${x} ${y})`);dialog.showModal();viewport.reset()}};
}
