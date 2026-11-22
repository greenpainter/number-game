import * as THREE from 'three';
import {buildWorld} from './world.js';
import {PlaygroundGame} from './game.js';
import {createUI} from './ui.js';
import {ROSTER,loadCharacter} from './characters.js';
import {ParkCamera} from './camera.js';
import {makeSound} from './sound.js';

const canvas=document.getElementById('park-canvas'), stage=canvas.parentElement;
const roster=ROSTER.map(r=>({...r, portrait:window.PLAY_ASSETS?.[r.portrait]||r.portrait}));
const pref='moyeora.park.v1.';
function read(key,fallback){try{const v=localStorage.getItem(pref+key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}}
function save(key,v){try{localStorage.setItem(pref+key,JSON.stringify(v));}catch{}}
const stored=read('avatar','teddy');
const initialId=roster.some(r=>r.id===stored)?stored:'teddy';
const stars=Number(read('stars',0)), audio=makeSound(read('sound',true));
let game,world,director,renderer,scene,ready=false, active={},lastT=0, markerClock=0, lastStars=Math.max(0,stars)||0;
let debug;
const safe=fn=> (...args)=>{
  audio.wake();
  if(!ready)return;
  try{const v=fn(...args);if(v?.catch)v.catch(e=>{console.error(e);ui.toast('친구를 다시 불러 주세요.');});}
  catch(e){console.error(e);}
};
const ui=createUI({
  onRide:safe(id=>{audio.play('select');game.selectRide(id);}),
  onAction:safe(()=>game.tapAction()),
  onAvatar:safe(id=>{audio.play('select');return game.selectCharacter(id);}),
  onOverview:safe(()=>{game.leaveRide();director.overview();ui.setState({cameraMoved:false});}),
  onSound:v=>{audio.set(v);save('sound',audio.enabled);ui.setState({sound:audio.enabled});if(v)audio.play('select');},
  onRetry:()=>location.reload()
},roster);
ui.setRoster(roster);
ui.setState({avatar:initialId,sound:audio.enabled,stars:lastStars});

const particles=[];
const v3=new THREE.Vector3();
function project(pos){
  v3.copy(pos).project(director.camera);
  return {x:(v3.x*.5+.5)*canvas.clientWidth,y:(.5-v3.y*.5)*canvas.clientHeight,visible:Math.abs(v3.x)<.95&&Math.abs(v3.y)<.94&&v3.z<1};
}
function burst(event){
  if(!event.point||!director)return;
  const el=document.createElement('div');
  el.style.cssText='position:absolute;left:0;top:0;z-index:4;pointer-events:none;font:900 24px system-ui;color:#ffcb49;text-shadow:0 2px #855e22,0 0 6px #fff6cf;will-change:transform;white-space:nowrap;';
  el.setAttribute('aria-hidden','true');
  el.textContent=event.stars?'✦ +'+event.stars:'✧';
  stage.append(el);
  const at=event.point.clone();at.y+=.43;
  particles.push({el,at,time:0});
}
function setGameState(s){
  active=s;
  if(s.selectedId){save('avatar',s.selectedId);}
  if(typeof s.stars==='number'&&lastStars!==s.stars){lastStars=s.stars;save('stars',s.stars);}
  ui.setState({avatar:s.selectedId||initialId,ride:s.rideId||null,phase:s.phase,
    stars:s.stars,actionLabel:s.actionLabel,actionHint:s.actionHint,disabled:s.actionReady===false,progress:s.progress});
}
function feedback(evt){
  audio.play(evt.stars?'reward':'action',evt.rideId);
  burst(evt);
}
const ray=new THREE.Raycaster(), ground=new THREE.Plane(new THREE.Vector3(0,1,0),0), cursor=new THREE.Vector2(), hit=new THREE.Vector3();
function clickScene(x,y){
  if(!ready)return;
  const rect=canvas.getBoundingClientRect();
  cursor.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
  ray.setFromCamera(cursor,director.camera);
  const interactive=[...(world.pickables||[]),...scene.children.filter(o=>o.userData.characterId)];
  const hits=ray.intersectObjects(interactive,true);
  for(const h of hits){
    for(let o=h.object;o;o=o.parent){
      const {rideId,characterId}=o.userData;
      if(rideId){game.selectRide(rideId);return;}
      if(characterId){
        if(characterId===active.selectedId&&active.rideId)game.tapAction();
        else if(characterId!==active.selectedId)game.selectCharacter(characterId);
        return;
      }
    }
  }
  if(active.rideId&&active.phase!=='walking'){game.tapAction();return;}
  if(ray.ray.intersectPlane(ground,hit)){
    const p=hit.clone();
    p.x=THREE.MathUtils.clamp(p.x,-7.8,7.8);p.z=THREE.MathUtils.clamp(p.z,-5.6,5.4);
    game.goTo(p);
  }
}
const pointers=new Map();let gestures=false,startX=0,startY=0,pinch=0;
function pairDistance(){const list=[...pointers.values()];return Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y);}
canvas.addEventListener('pointerdown',e=>{
  if(e.button>0)return;
  audio.wake();canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){gestures=false;startX=e.clientX;startY=e.clientY;}
  else if(pointers.size===2){gestures=true;pinch=pairDistance();}
});
canvas.addEventListener('pointermove',e=>{
  const prev=pointers.get(e.pointerId);if(!prev||!director)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    const now=pairDistance();if(pinch>4&&now>4)director.magnify(now/pinch);pinch=now;gestures=true;
  }else if(pointers.size===1){
    if(Math.hypot(e.clientX-startX,e.clientY-startY)>7)gestures=true;
    if(gestures)director.orbit(e.clientX-prev.x,e.clientY-prev.y);
  }
  if(gestures&&!active.rideId)ui.setState({cameraMoved:true});
});
canvas.addEventListener('pointerup',e=>{
  if(pointers.has(e.pointerId)&&pointers.size===1&&!gestures)clickScene(e.clientX,e.clientY);
  pointers.delete(e.pointerId);
});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gestures=true;});
canvas.addEventListener('wheel',e=>{e.preventDefault();if(!director)return;director.magnify(Math.exp(-e.deltaY*.001));if(!active.rideId)ui.setState({cameraMoved:true});},{passive:false});
canvas.addEventListener('keydown',e=>{
  if(!ready)return;
  if(e.key===' '||e.key==='Enter'){e.preventDefault();audio.wake();game.tapAction();}
  if(e.key==='Escape'){game.leaveRide();director.overview();}
});
function frame(ms){
  const dt=lastT?Math.min((ms-lastT)/1000,.065):.016;
  lastT=ms;
  if(document.hidden)return;
  if(game)game.update(dt);
  world.update?.(ms/1000,dt);
  director.update(dt);
  markerClock+=dt;
  if(markerClock>.055){
    markerClock=0;
    const markers=Object.entries(world.anchors).map(([id,p])=>({...project(p),id}));
    if(!ready||active.rideId)for(const m of markers)m.visible=false;
    ui.setMarkers(markers);
  }
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.time+=dt;
    if(p.time>=.85){p.el.remove();particles.splice(i,1);continue;}
    const at=project(p.at);p.el.style.transform='translate('+at.x+'px,'+(at.y-39*p.time)+'px) translate(-50%,-50%)';
    p.el.style.opacity=String(Math.min(1,(.85-p.time)*3));
  }
  renderer.render(scene,director.camera);
}
async function boot(){
  try{
    ui.setLoading(10,'놀이터 문 여는 중');
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<650?1.6:1.75));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();director=new ParkCamera(canvas);
    world=buildWorld(scene);
    function resize(){director.resize();renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);}
    new ResizeObserver(resize).observe(canvas);resize();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);ui.fail('화면 연결이 끊겼어요. 다시 열어 주세요.');});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
    ui.setLoading(42,'친구들 모이는 중');
    game=new PlaygroundGame({scene,world,loadCharacter,initialStars:lastStars,
      onState:setGameState,onFeedback:feedback,onFocus:event=>{director.focus(event);ui.setState({cameraMoved:false});}});
    renderer.setAnimationLoop(frame);
    await game.start({id:initialId,friends:['teddy','garden','lilac','sailor','apricot'].filter(id=>id!==initialId).slice(0,3)});
    ready=true;ui.ready();
    if(new URLSearchParams(location.search).has('qa')){
      debug={game,world,renderer,scene,camera:director.camera,director,ui,frame,get state(){return active;}};
      window.parkDebug=debug;
    }
  }catch(err){
    console.error('Park startup failed',err);
    ui.fail(renderer?'친구들을 불러오지 못했어요. 다시 시도해 주세요.':'3D 화면을 열 수 없어요. WebGL을 지원하는 브라우저에서 열어 주세요.');
  }
}
boot();
