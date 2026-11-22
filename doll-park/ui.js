const NS = 'http://www.w3.org/2000/svg';
const iconPaths = {
  sound: '<path d="M11 5 6.5 8.5H3v7h3.5L11 19Z"/><path d="M15 8a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6.5 8.5H3v7h3.5L11 19Z"/><path d="m16 9 5 6m0-6-5 6"/>',
  camera: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><path d="m8 14 3-3 2 2 2-2 2 3"/>',
  close: '<path d="m6 6 12 12m0-12L6 18"/>',
  chevron: '<path d="m6 14 6-6 6 6"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  tap: '<path d="M8.7 11.3V6.2a1.6 1.6 0 0 1 3.2 0v4.3l1-1a1.6 1.6 0 0 1 2.5.2 1.6 1.6 0 0 1 2.5 1 1.6 1.6 0 0 1 2.3 1.5v2c0 3.6-2.2 6.3-5.4 6.3h-2.4c-1.6 0-2.8-.8-3.9-2.1l-4-4.8a1.5 1.5 0 0 1 2.1-2.1l1.9 1.6"/><path d="M5 6a5.7 5.7 0 0 1 3.9-4M4 8.3l.1-.6"/>',
  spark: '<path d="m12 3 1.9 5.8 5.8 2-5.8 1.9-1.9 5.8-1.9-5.8-5.8-1.9 5.8-2Zm7.1 12.4.8 2.1 2 .7-2 .8-.8 2-.7-2-2.1-.8 2.1-.7Z" fill="currentColor" stroke="none"/>',
};
function glyph(key) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.9');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = iconPaths[key];
  return svg;
}

const rides = [
  {
    id:'swing', name:'그네', accent:'#609a7e', tint:'#dee9cd', action:'발 구르기',
    illustration: `<ellipse cx="44" cy="51.5" rx="31" ry="3" fill="#c5d6b6"/>
      <path d="m52 12-8 37m8-37 14 37" fill="none" stroke="#749a84" stroke-width="4.1"/>
      <path d="M23 12h30" stroke="#2b6759" stroke-width="4.4"/><path d="m23 12-9 38m9-38 15 38" fill="none" stroke="#4f927a" stroke-width="4.6"/>
      <path d="m32 14 1.3 22.5m9-22.5 2 22.5" stroke="#856943" stroke-width="2.2"/>
      <path d="m28.8 36.7 17.8-1.2 3.4 3.2-17.1 2.2-4.2-2.1z" fill="#e68b63" stroke="#97664c" stroke-width="1.4"/>
      <circle cx="23" cy="12" r="2" fill="#f6d590"/><circle cx="52" cy="12" r="1.6" fill="#f6d590"/>`
  },
  {
    id:'slide', name:'미끄럼틀', accent:'#d28a65', tint:'#f7e1cb', action:'출발!',
    illustration: `<ellipse cx="43" cy="50.8" rx="32" ry="3.7" fill="#ddcbb1"/>
      <path d="M17 49.6V23h19v26.6" fill="none" stroke="#547b68" stroke-width="3.6"/>
      <path d="M16.4 27.5h18.7" fill="none" stroke="#7b5d44" stroke-width="3.3"/>
      <path d="m10 22 15.9-13.5L42.4 22Z" fill="#dd8c69" stroke="#97624d" stroke-width="1.5"/>
      <path d="m25.9 8.5 6.9 13.1h9.6z" fill="#c87959"/>
      <path d="M28.3 26.9 23.5 50m7.7-22.8-4.7 23m-2.7-15.5h5.9m-7.2 6.6h5.9m-7.2 6.3h5.9" fill="none" stroke="#97724a" stroke-width="1.8"/>
      <path d="M36.1 26.4c10.9-.8 9 19.1 22 19.4l9.3-.4 4 3.4-13.5 2c-14.4.1-14.5-18.4-23-19.4Z" fill="#edb352" stroke="#a7773e" stroke-width="1.5"/>
      <path d="M38 27.2c10.3 2.3 8.9 19.2 21.8 19.2" fill="none" stroke="#ffdc90" stroke-width="2"/>`
  },
  {
    id:'trampoline', name:'트램펄린', accent:'#719db0', tint:'#dcebe9', action:'폴짝 뛰기',
    illustration: `<ellipse cx="42" cy="51.5" rx="30.5" ry="2.8" fill="#c1d3c7"/>
      <path d="M16 35.2v10.1q1 3 5.9 3.7l2.3-7.9m37.9-4.5v10.7l-4.5 2.6-1.8-9.7M37 39.1l1.7 12.1h4.9l2.2-11.2" fill="none" stroke="#42736e" stroke-width="3.4"/>
      <path d="M12 32.2c0 7 11.6 10.4 29.9 10.4s29.9-3.4 29.9-10.4v-3.1H12Z" fill="#559f9c" stroke="#4b7b74" stroke-width="1.5"/>
      <ellipse cx="41.9" cy="29.1" rx="30" ry="9.3" fill="#88c5b3" stroke="#4b8274" stroke-width="1.7"/>
      <ellipse cx="41.9" cy="29.1" rx="22.7" ry="5.3" fill="#446f70" stroke="#d2ddab" stroke-width="1.3"/>
      <path d="M34 8.6q-1-2.5-.9-4.9m7.4 3.6.1-5.4m6.4 7.1 2.1-4.4" fill="none" stroke="#d59d4e" stroke-width="2"/>`
  },
  {
    id:'carousel', name:'회전목마', accent:'#bd8580', tint:'#f3e2d7', action:'빙글 돌리기',
    illustration: `<ellipse cx="42" cy="52" rx="28.5" ry="2.7" fill="#d8ccb7"/>
      <path d="M19 46.1h45.4l-1.8 4H21.2Z" fill="#d68f72" stroke="#926a59" stroke-width="1.5"/>
      <path d="M41.8 20v25.8m-14-22.3v21.8M56 23.5v21.8" stroke="#a58148" stroke-width="2"/>
      <path d="M41.8 23.5v21" stroke="#e9bf77" stroke-width="4"/>
      <path d="M18.8 23q13.2-5.2 23-15.8Q53 18.6 65 23v3H19Z" fill="#e7a183" stroke="#a6765b" stroke-width="1.4"/>
      <path d="m41.8 7.2-10.9 16h8l2.9-16 6.1 16h7.3Z" fill="#fff0bc"/>
      <path d="M18.3 23h48v2.4q-4.5 6.1-9 .1-3.3 4.1-7 .3-4.4 4.4-8.3 0-4.1 4.1-8.2 0-3.7 4.2-7.4 0-4.2 4-8.1-.1Z" fill="#eab95f" stroke="#b38648" stroke-width="1.2"/>
      <path d="m23.4 37.6 3.2.2 1-4 2.7 2.2 1.5-.8 1.3 3.9-3.8.6-1.1 2.7m-2.9-2.7-1.6 2.4m28-5 3.5.3 1-4 2.4 2.2 1.6-.5 1.1 3.7-3.5.5-1.2 2.6m-2.9-2.5-1.3 2.4" fill="#80a99a" stroke="#598275" stroke-width="1.1"/>
      <circle cx="41.8" cy="6.1" r="2.4" fill="#d7a34f"/>`
  },
];
const rideById = new Map(rides.map(ride => [ride.id,ride]));
function rideArt(ride) {
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 84 56');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  svg.innerHTML=ride.illustration;
  return svg;
}
function colorRide(node, ride) {
  node.style.setProperty('--accent',ride.accent);
  node.style.setProperty('--tint',ride.tint);
}

export function createUI(events = {}, initialRoster = []) {
  const byId = id => document.getElementById(id);
  const dialog = byId('roster-dialog');
  const opener = byId('avatar-selector');
  const dock = byId('ride-dock');
  const interactive = byId('activity');
  const action = byId('action-button');
  const soundButton = byId('sound-toggle');
  const overview = byId('overview-button');
  const loading = byId('load-screen');
  const toastElement = byId('toast');
  const buttons = new Map(), markers = new Map();
  let roster = [], toastTimer, progress = 0, hasRendered = false;
  let state = {ride:null,phase:'overview',avatar:null,sound:true,stars:0,actionLabel:'',actionHint:'',disabled:false,cameraMoved:false};

  byId('avatar-chevron').append(glyph('chevron'));
  byId('hint-touch').append(glyph('tap'));
  byId('roster-close').append(glyph('close'));
  overview.append(glyph('camera'));
  action.querySelector('.action-spark').append(glyph('spark'));
  function closeRoster() {
    if (dialog.open) dialog.close();
  }
  opener.addEventListener('click',()=>{
    if(!dialog.open) {
      dialog.showModal();
      opener.setAttribute('aria-expanded','true');
      const selected = dialog.querySelector('[aria-pressed=true]');
      if(selected) selected.focus({preventScroll:true});
    }
  });
  dialog.addEventListener('close',()=>{opener.setAttribute('aria-expanded','false');opener.focus({preventScroll:true});});
  dialog.addEventListener('click',e=>{
    if(e.target===dialog) {
      const r=dialog.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) closeRoster();
    }
  });
  byId('roster-close').addEventListener('click',closeRoster);
  for(const ride of rides) {
    const btn=document.createElement('button');
    btn.type='button'; btn.className='ride-button'; btn.dataset.ride=ride.id;
    btn.setAttribute('aria-label',ride.name+' 타기'); btn.setAttribute('aria-pressed','false');
    colorRide(btn,ride);
    const label=document.createElement('span');label.textContent=ride.name;
    btn.append(rideArt(ride),label);btn.addEventListener('click',()=>events.onRide?.(ride.id));
    dock.append(btn); buttons.set(ride.id,btn);
    const pin=document.createElement('button');pin.className='map-pin';pin.dataset.marker=ride.id;pin.type='button';
    pin.hidden=true;pin.tabIndex=-1;pin.setAttribute('aria-label',ride.name+' 타기');colorRide(pin,ride);
    const dot=document.createElement('span');dot.className='pin-dot';dot.setAttribute('aria-hidden','true');
    const pinName=document.createElement('span');pinName.textContent=ride.name;
    pin.append(dot,pinName);pin.addEventListener('click',()=>events.onRide?.(ride.id));
    byId('park-markers').append(pin);markers.set(ride.id,pin);
  }
  const callOverview=()=>events.onOverview?.();
  overview.addEventListener('click',callOverview);
  soundButton.addEventListener('click',()=>events.onSound?.(!state.sound));
  action.addEventListener('click',()=>{if(!state.disabled)events.onAction?.();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!dialog.open&&!overview.hidden) callOverview();
  });
  byId('retry-button').addEventListener('click',()=>events.onRetry?events.onRetry():window.location.reload());

  function setRoster(items) {
    roster=Array.isArray(items)?items:[];
    const grid=byId('roster-grid');
    grid.replaceChildren();
    for(const item of roster) {
      const btn=document.createElement('button');btn.className='friend-button';btn.type='button';btn.dataset.avatar=item.id;
      btn.setAttribute('aria-label',item.name+' 선택');
      const frame=document.createElement('span');frame.className='friend-portrait';
      const photo=document.createElement('img');photo.src=item.portrait;photo.alt='';photo.decoding='async';frame.append(photo);
      const name=document.createElement('b');name.textContent=item.name;
      const check=document.createElement('span');check.className='friend-check';check.setAttribute('aria-hidden','true');check.append(glyph('check'));
      btn.append(frame,name,check);btn.addEventListener('click',()=>{closeRoster();events.onAvatar?.(item.id);});
      grid.append(btn);
    }
    if(!state.avatar&&roster.length)state.avatar=roster[0].id;
    updateAvatar();
  }
  function updateAvatar() {
    const selected=roster.find(item=>item.id===state.avatar);
    const img=byId('active-portrait');
    if(selected) {
      if(img.getAttribute('src')!==selected.portrait)img.src=selected.portrait;
      byId('active-name').textContent=selected.name;
      opener.setAttribute('aria-label',selected.name+' · 친구 바꾸기');
    }
    for(const button of byId('roster-grid').children)button.setAttribute('aria-pressed',String(button.dataset.avatar===state.avatar));
  }
  function starAnimation() {
    const counter=byId('star-counter');
    counter.classList.remove('pop'); void counter.offsetWidth; counter.classList.add('pop');
  }
  function toast(text) {
    if(!text)return;
    clearTimeout(toastTimer);toastElement.textContent=text;toastElement.classList.add('is-visible');
    toastTimer=setTimeout(()=>{toastElement.classList.remove('is-visible');toastElement.textContent='';},2000);
  }
  function setState(patch={}) {
    const previous=state;
    state={...state,...patch};
    if(Object.prototype.hasOwnProperty.call(patch,'rideId')&&!('ride' in patch))state.ride=patch.rideId;
    if(Object.prototype.hasOwnProperty.call(patch,'selectedId')&&!('avatar' in patch))state.avatar=patch.selectedId;
    if(Object.prototype.hasOwnProperty.call(patch,'actionReady')&&!('disabled' in patch))state.disabled=!patch.actionReady;
    const displayKeys=['ride','phase','avatar','sound','stars','actionLabel','actionHint','disabled','cameraMoved'];
    if(hasRendered&&displayKeys.every(key=>previous[key]===state[key]))return;
    hasRendered=true;
    const ride=rideById.get(state.ride);
    for(const [id,b] of buttons)b.setAttribute('aria-pressed',String(!!ride&&id===ride.id));
    interactive.hidden=!ride;
    byId('idle-hint').hidden=!!ride;
    overview.hidden=!ride&&!state.cameraMoved;
    if(ride) {
      byId('activity-title').textContent=ride.name;
      byId('activity-hint').textContent=state.actionHint||(state.phase==='walking'?'가는 중이에요':'');
      byId('action-label').textContent=state.actionLabel||ride.action;
      action.disabled=state.disabled||state.phase==='walking';
    }
    if(previous.avatar!==state.avatar)updateAvatar();
    if(!soundButton.firstChild||previous.sound!==state.sound) {
      soundButton.replaceChildren(glyph(state.sound?'sound':'mute'));
      soundButton.setAttribute('aria-pressed',String(Boolean(state.sound)));
      const label=state.sound?'소리 끄기':'소리 켜기';soundButton.setAttribute('aria-label',label);soundButton.title=label;
    }
    byId('star-count').textContent=String(state.stars);
    byId('star-counter').setAttribute('aria-label','모은 별 '+state.stars+'개');
    if(state.stars>previous.stars)starAnimation();
    if(previous.phase!==state.phase||previous.ride!==state.ride)byId('live-status').textContent=ride?(ride.name+' '+(state.actionHint||state.actionLabel||'')):'놀이터 전체 보기';
  }
  function setMarkers(updates=[]) {
    if(!Array.isArray(updates)) return;
    const seen=new Set();
    for(const point of updates) {
      const pin=markers.get(point.id);
      if(!pin)continue;
      seen.add(point.id);
      const hide=point.visible===false||Boolean(state.ride)||!Number.isFinite(point.x)||!Number.isFinite(point.y);
      if(pin.hidden!==hide)pin.hidden=hide;
      if(!hide) {
        const x=Math.round(point.x),y=Math.round(point.y);
        if(pin._lastX!==x){pin.style.left=x+'px';pin._lastX=x;}
        if(pin._lastY!==y){pin.style.top=y+'px';pin._lastY=y;}
      }
    }
    for(const [id,pin] of markers)if(!seen.has(id)&&!pin.hidden)pin.hidden=true;
  }
  function setLoading(value,label) {
    if(Number.isFinite(value))progress=Math.max(0,Math.min(100,value>0&&value<1?value*100:value));
    const track=byId('load-progress');
    track.hidden=false;track.firstElementChild.style.width=Math.max(4,progress)+'%';
    track.setAttribute('aria-valuenow',String(Math.round(progress)));
    if(label)byId('load-label').textContent=label;
    byId('retry-button').hidden=true;loading.hidden=false;
  }
  function ready() {loading.hidden=true;}
  function fail(message) {byId('load-label').textContent=message||'놀이터를 열 수 없어요. 다시 시도해 주세요.';byId('load-progress').hidden=true;byId('retry-button').hidden=false;loading.hidden=false;}
  function reward(update) {if(typeof update==='number')setState({stars:update});starAnimation();}
  setRoster(initialRoster);setState();
  return {setState,setLoading,ready,fail,reward,setRoster,toast,setMarkers,closeRoster};
}
