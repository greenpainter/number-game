import city from './city-layout.js';
import water from './waterfront-layout.js';
import rail from './railway-layout.js';
import {ringRoad,bridgeRoute} from './road-layout.js';
import townRoads from './town-roads.js';
import {METRO_LOOP,METRO_ICONS} from './metro-loop.js';

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
export function createCityMap({dialog,art,list,onTravel,onStation,onSelect}){
  let selected=null,filter='전체';
  const places=city.destinations.map((p,i)=>({...p,index:i,icon:details[i][0],category:details[i][1],description:details[i][2]}));
  const svg=[];
  const path=(points,cls,extra='')=>svg.push(`<polyline points="${line(points)}" class="${cls}" ${extra}/>`);
  const rect=(x,z,w,d,cls,r=0)=>{const [px,py]=P(x-w/2,z-d/2);svg.push(`<rect x="${px}" y="${py}" width="${w*1.28}" height="${d*1.28}" rx="${r}" class="${cls}"/>`)};
  svg.push('<rect width="900" height="520" rx="20" fill="#eaf0d9"/><path d="M0 65 Q150 30 280 80 T600 32 L600 0 H0Z" fill="#d2e0bd"/><path d="M0 440 Q230 385 445 464 T900 441 V520 H0Z" fill="#dde8ca"/>');
  rect(-191,74,142,183,'atlas-zoo',14);
  for(const h of city.zoo.habitats)rect(h.x,h.z,32,28,'atlas-habitat',6);
  for(const [i,h] of city.zoo.habitats.entries()){const [x,y]=P(h.x,h.z);svg.push(`<text x="${x}" y="${y+4}" class="atlas-animal">${['🐘','🦒','🦓','🦁','🐼','🐧','🦛','🦏','🐻','🦩','🦘','🐢'][i]}</text>`)}
  const river=water.river.points;path(river.map(([x,z])=>[x-19,z]),'atlas-promenade');path(river.map(([x,z])=>[x+19,z]),'atlas-promenade');path(river,'atlas-water');
  for(let z=-150;z<165;z+=36){const p=river[Math.floor((z+176)/2)], [x,y]=P(p[0],z);svg.push(`<path d="M${x-4} ${y} q4 -3 8 0 t8 0" class="atlas-ripple"/>`)}
  const routes=[{points:[...ringRoad(),ringRoad()[0]],width:10},...city.districtRoads,{points:water.road,width:9}];
  for(const r of routes){path(r.points,'atlas-road-edge',`style="stroke-width:${(r.width??9)*1.28+4}px"`);path(r.points,'atlas-road',`style="stroke-width:${(r.width??9)*1.28}px"`)}
  for(const r of townRoads){path(r.points,'atlas-local-edge');path(r.points,'atlas-local-road')}
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
  for(const s of water.stations){const [x,y]=P(s.x,s.z);svg.push(`<g class="atlas-station" data-station="${s.id}" role="button" tabindex="0" aria-label="${esc(s.name)} 지도 역 선택"><title>${esc(s.name)}</title><circle cx="${x}" cy="${y}" r="18" class="atlas-metro-stop"/><text x="${x}" y="${y+7}" class="atlas-station-picture">${METRO_ICONS[s.id]}</text></g>`)}
  for(const [name,x,z] of [['숲마을',-171,-142],['정원마을',-45,165],['동물원',-190,-27],['중앙 마을',-4,-57],['공항',139,-84],['강동 마을',336,-80],['강변 공원',295,108]]){const [px,py]=P(x,z);svg.push(`<text x="${px}" y="${py}" class="atlas-district">${name}</text>`)}
  svg.push('<g class="atlas-compass" transform="translate(865 36)"><text y="-9">N</text><path d="M0 0 L-5 14 L0 10 L5 14Z"/></g>');
  art.innerHTML=`<svg viewBox="0 0 900 520" role="img" aria-label="현재 도시 지도. 강, 세 다리, 동물원, 공항, 주거 구역과 지하철역이 표시되어 있어요.">${svg.join('')}<g id="atlas-pins"></g><g id="atlas-player"><circle r="11" class="atlas-player-halo"/><circle r="5" class="atlas-player-dot"/><text y="-16" class="atlas-player-label">내 위치</text></g></svg><div class="atlas-legend"><span><i class="legend-river"></i>강</span><span><i class="legend-road"></i>도로</span><span><i class="legend-metro"></i>지하철 연결</span><span><i class="legend-player"></i>내 위치</span></div>`;
  const pins=art.querySelector('#atlas-pins'),buttons=[];
  for(const station of art.querySelectorAll('[data-station]')){station.addEventListener('click',()=>onStation?.(station.dataset.station));station.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onStation?.(station.dataset.station)}})}
  const loop=document.createElement('div');loop.className='atlas-metro-loop';loop.setAttribute('aria-label','순환 지하철 역 선택');
  loop.innerHTML='<span aria-hidden="true">🚇 🔁</span>';
  for(const station of stationOrder){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',station.name+' 지하철로 가기');b.innerHTML=`<span aria-hidden="true">${METRO_ICONS[station.id]}</span><small>${esc(station.name)}</small>`;b.addEventListener('click',()=>onStation?.(station.id));loop.append(b);const arrow=document.createElement('span');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');loop.append(arrow)}
  art.after(loop);
  // Three central facilities are close together: small leader lines keep targets apart.
  const offsets={0:[10,20],1:[-16,4],2:[0,-14],8:[-4,-5]};
  places.forEach(p=>{const [x,y]=P(p.x,p.z),[dx,dy]=offsets[p.index]??[0,0];const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform',`translate(${x+dx} ${y+dy})`);g.setAttribute('class','atlas-pin');g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',p.name+' 지도에서 선택');g.innerHTML=`<title>${esc(p.name)}</title>${dx||dy?`<path d="M0 0 L${-dx} ${-dy}" class="atlas-leader"/>`:''}<circle r="15"/><text y="5">${p.icon}</text>`;g.addEventListener('click',()=>select(p.index));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(p.index)}});pins.append(g);buttons.push(g)});
  const filters=dialog.querySelector('.atlas-filters');
  for(const cat of ['전체','마을','놀거리','탈것','시설']){const b=document.createElement('button');b.textContent=cat;b.type='button';b.setAttribute('aria-pressed',cat===filter);b.addEventListener('click',()=>{filter=cat;for(const c of filters.children)c.setAttribute('aria-pressed',c===b);renderList()});filters.append(b)}
  function renderList(){list.replaceChildren();places.forEach(p=>{const show=filter==='전체'||p.category===filter;buttons[p.index].classList.toggle('dimmed',!show);if(!show)return;const b=document.createElement('button');b.className='atlas-place';b.dataset.index=p.index;b.setAttribute('aria-pressed',selected===p.index);b.innerHTML=`<span class="atlas-place-icon">${p.icon}</span><span><strong>${esc(p.name)}</strong><small>${p.category}</small></span><span class="atlas-place-number">${p.index+1}</span>`;b.addEventListener('click',()=>select(p.index));list.append(b)})}
  function select(index){selected=index;const p=places[index];onSelect?.(p);for(let i=0;i<buttons.length;i++){buttons[i].classList.toggle('selected',i===index);buttons[i].setAttribute('aria-pressed',i===index)}dialog.querySelector('#map-selection-name').textContent=p.icon+' '+p.name;dialog.querySelector('#map-selection-description').textContent=p.description;dialog.querySelector('#map-fly').disabled=false;dialog.querySelector('#map-fly').textContent='🚁 여기로 가요 →';for(const b of list.children)b.setAttribute('aria-pressed',Number(b.dataset.index)===index)}
  dialog.querySelector('#map-fly').addEventListener('click',()=>{if(selected!==null)onTravel(places[selected])});renderList();
  return {open(actor){const [x,y]=P(actor.x,actor.z);art.querySelector('#atlas-player').setAttribute('transform',`translate(${x} ${y})`);dialog.showModal()}};
}
