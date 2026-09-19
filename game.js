import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FIRE} from './navigation.js';
import {FireGame} from './game-state.js';

const $=id=>document.getElementById(id);
const stage=$('stage'),canvas=$('game');
const state=new FireGame(onStateChange);
state.ready=false;state.sound=false;
let renderer,scene,camera,truck,child,wood,flames,smoke,water,marker,routeLine,childRing,lastTime=0,toastTimer,audioCtx;
const limbs={};
const stationBox=new THREE.Box3(new THREE.Vector3(-11.2,0,-8.5),new THREE.Vector3(-2.8,4.9,-2.6));
let waterSound=null,engineOsc=null;
let viewWidth=1,viewHeight=1;
const temp=new THREE.Object3D(), vec=new THREE.Vector3(), raycaster=new THREE.Raycaster();
const ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.12);
const flameParts=[], smokeParts=[];
const pointerStart={x:0,y:0,id:null};

function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2200)}
function tell(title,description,kicker='오늘의 출동'){$('mission-title').textContent=title;$('mission-description').textContent=description;$('mission-kicker').textContent=kicker}
function updateUI(){
  document.body.classList.toggle('complete',state.complete);
  $('badge-text').textContent=state.mode==='extinguishing'?'불을 끄고 있어요':state.boarding?'소방차에 타러 가요':state.riding?'소방차 탑승 중':'걸어서 탐험 중';
  $('dispatch-text').textContent=state.complete?'다시 놀기':state.boarding?'타러 가는 중':!state.riding?'소방차 타기':state.mode==='extinguishing'?'물 뿌리는 중':state.fireMission?'출동 중!':'출동하기';
  $('dispatch').disabled=!state.ready||(!state.complete&&(state.fireMission||state.boarding));
  $('exit').hidden=!state.riding;
  $('truck-label').hidden=state.riding;
  $('truck-label').disabled=state.boarding;
  $('child-label').hidden=state.riding;
  $('station-label').setAttribute('aria-label',state.riding?'소방서로 돌아가기':'소방서를 눌러 소방차 타기');
  $('station-label-text').textContent=state.riding?'소방서 · 돌아가기':'소방서 · 차 타기';
  $('play-hint-text').textContent=state.riding?'바닥을 톡! 운전해요 · 불을 톡! 물을 뿌려요':'바닥을 톡! 걸어가요 · 소방서를 톡! 차에 타요';
  $('progress-wrap').hidden=state.mode!=='extinguishing'&&!state.complete;
  $('fire-label-text').textContent=state.complete?'불을 다 껐어요!':state.mode==='extinguishing'?'조금만 더 힘내요!':'여기 불이 났어요!';
  $('fire-label').setAttribute('aria-label',state.complete?'불 끄기 놀이 다시 시작하기':'불타는 장작으로 출동하기');
  document.querySelector('.fire-icon').textContent=state.complete?'✓':'!';
  if(state.complete){tell('멋져요! 불을 모두 껐어요.','마을을 둘러보거나, 한 번 더 출동해요.','꼬마 소방관, 임무 성공!');$('mission-symbol').innerHTML='<span style="font-size:34px">✓</span>'}
  else if(state.boarding)tell('소방차에 타러 가고 있어요!','차 옆에 도착하면 소방차에 올라타요.','소방관이 될 준비');
  else if(!state.riding)tell('소방서에서 소방차를 타요!','소방서나 소방차를 눌러 주세요.','걸어서 마을 탐험');
  else if(state.mode==='extinguishing')tell('시원한 물줄기로 불을 꺼요!','조금만 기다리면 불이 모두 꺼져요.','진화 중');
  else if(state.fireMission)tell('소방차가 출동하고 있어요!','장작 가까이에 도착하면 물을 뿌려요.','출동 중');
  else tell('장작더미에 불이 났어요!','소방차와 함께 불을 끄러 가 볼까요?');
}
function showProgress(){const progress=Math.round(100-state.hp);$('progress-fill').style.width=`${progress}%`;$('progress-text').textContent=`${progress}%`;$('progress').setAttribute('aria-valuenow',progress)}
function setRoute(points){
  if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();routeLine.material.dispose();routeLine=null}
  if(!points.length)return;
  const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(state.actor.x,.18,state.actor.z),...points.map(p=>new THREE.Vector3(p.x,.18,p.z))]);
  routeLine=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0xffffdb,dashSize:.25,gapSize:.22,transparent:true,opacity:.72}));
  routeLine.computeLineDistances();scene.add(routeLine);
}
function moveTo(target){
  if(!state.ready)return false;
  if(!state.moveTo(target)){toast('집이나 나무 옆의 빈 바닥을 눌러 주세요.');return false}return true;
}
function boardTruck(){if(!state.ready)return false;if(!state.boardTruck()){toast('차 옆으로 갈 수 없어요. 빈 곳에서 다시 눌러 주세요.');return false}return true}
function exitTruck(){if(!state.ready)return false;if(!state.exitTruck()){toast('내릴 자리가 없어요. 조금 더 넓은 곳으로 이동해요.');return false}return true}
function stationAction(){if(!state.ready)return;if(state.riding)state.goHome();else boardTruck()}
function dispatch(){if(!state.ready)return false;if(state.complete){reset();return true}if(!state.riding)return boardTruck();return state.dispatch()}
function fireAction(){if(!state.ready)return;if(state.complete){reset();return}if(!state.riding){toast('먼저 소방서나 소방차를 눌러 차에 타요!');return}state.dispatch()}
function reset(){state.reset()}
function onStateChange(reason){
  if(!state.ready)return;
  syncActors();marker.visible=state.mode==='moving';
  if(state.target)marker.position.set(state.target.x,.16,state.target.z);
  setRoute(state.mode==='moving'?state.path:[]);
  if(reason==='reset'){
    flames.visible=true;water.visible=false;
    wood.traverse(o=>{if(o.isMesh&&o.userData.originalColor)o.material.color.copy(o.userData.originalColor)});
    $('mission-symbol').innerHTML='<svg viewBox="0 0 32 32" fill="none"><path d="M17 3c2 8-5 8-3 14 2-1 4-4 4-7 7 7 9 10 7 15-3 7-16 7-19-1C3 15 13 12 17 3Z" fill="currentColor"/><path d="M17 18c-1 5-6 5-4 9 2 3 7 1 7-2 0-2-1-4-3-7Z" fill="#ffdc88"/></svg>';
    toast('다시 소방관이 되어 볼까요?');
  }
  if(reason==='board')toast('탔어요! 불을 누르면 출동해요.');
  if(reason==='exit')toast('내렸어요! 차를 다시 누르면 탈 수 있어요.');
  if(reason==='win'){flames.visible=false;water.visible=false;wood.traverse(o=>{if(o.isMesh)o.material.color.multiplyScalar(.5)});chime();toast('고마워요! 마을이 다시 안전해졌어요.');}
  updateUI();showProgress();
}
function prepareModel(root){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.roughness=.85}});return root}
function addEffects(){
  const ring=new THREE.RingGeometry(.48,.57,40);
  marker=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:0xfffbce,side:THREE.DoubleSide,transparent:true,opacity:.9}));marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
  childRing=new THREE.Mesh(new THREE.RingGeometry(.48,.58,32),new THREE.MeshBasicMaterial({color:0xffdc55,side:THREE.DoubleSide}));childRing.rotation.x=-Math.PI/2;scene.add(childRing);
  flames=new THREE.Group();flames.position.set(FIRE.x,0,FIRE.z);scene.add(flames);
  const geo=new THREE.IcosahedronGeometry(1,0);
  for(let i=0;i<18;i++){
    const a=i*2.4,r=.22+(i%4)*.25;
    const f=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:i%3===0?0xffd45c:i%3===1?0xff862f:0xef4921}));
    f.userData={x:Math.cos(a)*r,z:Math.sin(a)*r,height:.7+(i%5)*.28,phase:i*.9};flameParts.push(f);flames.add(f);
  }
  smoke=new THREE.Group();smoke.position.set(FIRE.x,0,FIRE.z);scene.add(smoke);
  const smokeMat=new THREE.MeshLambertMaterial({color:0x727d7d,transparent:true,opacity:.36,depthWrite:false});
  for(let i=0;i<12;i++){const p=new THREE.Mesh(geo,smokeMat);p.userData.phase=i/12;smokeParts.push(p);smoke.add(p)}
  water=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.14,1),new THREE.MeshBasicMaterial({color:0x16b9ed}),76);water.instanceMatrix.setUsage(THREE.DynamicDrawUsage);water.frustumCulled=false;water.visible=false;scene.add(water);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(1.75,40),new THREE.MeshBasicMaterial({color:0xee862c,transparent:true,opacity:.15,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.set(0,.17,0);flames.add(glow);
}
function resize(){
  if(!renderer)return;viewWidth=stage.clientWidth;viewHeight=stage.clientHeight;
  renderer.setSize(viewWidth,viewHeight,false);
  const aspect=viewWidth/viewHeight,vertical=Math.max(31.3,43.5/aspect);
  camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  positionLabels();
}
function labelAt(element,x,y,z){vec.set(x,y,z).project(camera);element.style.transform=`translate(${(vec.x*.5+.5)*viewWidth}px,${(-vec.y*.5+.5)*viewHeight}px) translate(-50%,-100%)`}
function positionLabels(){
  labelAt($('station-label'),-7,5.35,-5.6);labelAt($('fire-label'),FIRE.x,4.9,FIRE.z);
  labelAt($('child-label'),state.child.x,2.9,state.child.z);
  labelAt($('truck-label'),state.truck.x,3.45,state.truck.z);
}
function syncActors(time=0,paused=false){
  truck.position.set(state.truck.x,.13,state.truck.z);truck.rotation.y=state.truck.angle;
  child.visible=!state.riding;childRing.visible=!state.riding;
  const walking=!state.riding&&state.mode==='moving'&&!paused;
  const swing=walking?Math.sin(time*10)*.62:0;
  child.position.set(state.child.x,.13+(walking?Math.abs(Math.sin(time*10))*.045:0),state.child.z);child.rotation.y=state.child.angle;
  for(const [name,sign] of [['Arm_L',-1],['Arm_R',1],['Leg_L',1],['Leg_R',-1]])if(limbs[name])limbs[name].rotation.x=swing*sign;
  childRing.position.set(state.child.x,.16,state.child.z);
  positionLabels();
}
function tick(now){
  requestAnimationFrame(tick);if(!state.ready||document.hidden)return;
  const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;const time=now/1000;
  const paused=$('help-dialog').open;
  if(!paused)state.update(dt);
  syncActors(time,paused);showProgress();
  water.visible=state.riding&&state.mode==='extinguishing';
  const strength=.12+.88*(state.hp/100);
  flameParts.forEach(f=>{const p=f.userData,wobble=Math.sin(time*7+p.phase);f.position.set(p.x,.65+p.height*.4*strength,p.z);f.scale.set((.3+wobble*.035)*strength,p.height*strength*(1+wobble*.16),(.3-wobble*.03)*strength);f.rotation.y=time*.5+p.phase});
  smoke.visible=!state.complete;
  smokeParts.forEach((p,i)=>{const t=(time*.19+p.userData.phase)%1;p.position.set(Math.sin(i*3)*.3+t*.85,.8+t*5,Math.cos(i*2)*.3+t*.35);p.scale.setScalar((.18+t*.7)*strength);p.rotation.y=time*.2+i});
  if(water.visible){
    const start=new THREE.Vector3(0,1.95,-.2).applyAxisAngle(new THREE.Vector3(0,1,0),truck.rotation.y).add(truck.position);
    for(let i=0;i<76;i++){
      const t=(time*1.55+i/76)%1;
      temp.position.set(THREE.MathUtils.lerp(start.x,FIRE.x,t)+Math.sin(i*7)*.09*t,THREE.MathUtils.lerp(start.y,.55,t)+Math.sin(t*Math.PI)*1.3,THREE.MathUtils.lerp(start.z,FIRE.z,t)+Math.cos(i*5)*.09*t);
      temp.scale.setScalar(.8+t*.4);temp.updateMatrix();water.setMatrixAt(i,temp.matrix);
    }water.instanceMatrix.needsUpdate=true;
  }
  if(marker.visible)marker.scale.setScalar(1+Math.sin(time*5)*.12);
  updateSound(paused);renderer.render(scene,camera);
}
function pointerUp(event){
  if(event.pointerId!==pointerStart.id)return;
  pointerStart.id=null;
  if(!state.ready||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>12)return;
  const bounds=canvas.getBoundingClientRect(),mouse=new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  raycaster.setFromCamera(mouse,camera);
  const hit=new THREE.Vector3();
  if(raycaster.ray.intersectBox(stationBox,hit)){stationAction();return}
  if(raycaster.intersectObject(truck,true).length){if(!state.riding)boardTruck();return}
  // Use the actual fire geometry first so tapping a flame above the ground works.
  if(!state.complete&&raycaster.intersectObjects([...flameParts,wood],true).length){fireAction();return}
  if(!raycaster.ray.intersectPlane(ground,hit))return;
  if(!state.complete&&Math.hypot(hit.x-FIRE.x,hit.z-FIRE.z)<2){fireAction();return}
  moveTo({x:hit.x,z:hit.z});
}

// Sound is opt-in and is created only after a user gesture, including iPad Safari.
function ensureAudio(){
  if(audioCtx)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audioCtx=new Audio();
  const gain=audioCtx.createGain();gain.gain.value=0;gain.connect(audioCtx.destination);
  const osc=audioCtx.createOscillator();osc.type='sine';osc.connect(gain);osc.start();engineOsc={osc,gain};
  const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  const noise=audioCtx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;
  const waterGain=audioCtx.createGain();waterGain.gain.value=0;noise.connect(filter);filter.connect(waterGain);waterGain.connect(audioCtx.destination);noise.start();waterSound=waterGain;
}
function updateSound(paused=false){if(!audioCtx)return;const enabled=state.sound&&!paused&&!document.hidden&&state.ready;const moving=state.riding&&state.mode==='moving';engineOsc.gain.gain.setTargetAtTime(enabled&&moving ? .024 : 0,audioCtx.currentTime,.08);engineOsc.osc.frequency.setTargetAtTime(340+Math.sin(performance.now()/170)*110,audioCtx.currentTime,.03);waterSound.gain.setTargetAtTime(enabled&&state.riding&&state.mode==='extinguishing' ? .055 : 0,audioCtx.currentTime,.08)}
function chime(){if(!state.sound||!audioCtx)return;[523.25,659.25,783.99,1046.5].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+i*.15;o.frequency.value=f;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.start(t);o.stop(t+.4)})}

async function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-25,25,20,-20,.1,180);camera.position.set(29,34,40);camera.lookAt(0,.1,0);
    scene.add(new THREE.HemisphereLight(0xffffff,0x86a49b,2.7));const sun=new THREE.DirectionalLight(0xfff2d7,3.3);sun.position.set(-15,28,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:80});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun);
    const loader=new GLTFLoader();const [villageAsset,truckAsset,woodAsset,childAsset]=await Promise.all(['village','firetruck','firewood','child'].map(name=>loader.loadAsync(`./models/${name}.glb`)));
    const village=prepareModel(villageAsset.scene);scene.add(village);
    truck=prepareModel(truckAsset.scene);scene.add(truck);
    child=prepareModel(childAsset.scene);child.scale.setScalar(1.15);scene.add(child);
    for(const name of ['Arm_L','Arm_R','Leg_L','Leg_R'])limbs[name]=child.getObjectByName(name);
    wood=prepareModel(woodAsset.scene);wood.position.set(FIRE.x,.16,FIRE.z);wood.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.userData.originalColor=o.material.color.clone()}});scene.add(wood);
    addEffects();resize();syncActors();state.ready=true;$('loading').hidden=true;updateUI();registerGameTools();lastTime=performance.now();requestAnimationFrame(tick);
  }catch(error){console.error(error);$('loading').innerHTML='<div class="error-message"><strong>마을을 불러오지 못했어요.</strong><br>인터넷 연결과 Safari 업데이트를 확인하고 다시 열어 주세요.<button class="primary-button" id="retry">다시 열기</button></div>';$('retry').onclick=()=>location.reload()}
}
$('dispatch').addEventListener('click',dispatch);$('fire-label').addEventListener('click',fireAction);
$('home').addEventListener('click',stationAction);$('station-label').addEventListener('click',stationAction);
$('truck-label').addEventListener('click',boardTruck);$('exit').addEventListener('click',exitTruck);
$('help').addEventListener('click',()=>$('help-dialog').showModal());
for(const id of ['close-help','start-playing'])$(id).addEventListener('click',()=>$('help-dialog').close());
$('sound').addEventListener('click',async()=>{try{ensureAudio();if(!audioCtx){toast('이 브라우저에서는 소리를 지원하지 않아요.');return}await audioCtx.resume();state.sound=!state.sound;$('sound').setAttribute('aria-pressed',state.sound);$('sound').setAttribute('aria-label',state.sound?'소리 끄기':'소리 켜기');$('sound').title=state.sound?'소리 끄기':'소리 켜기';$('sound-waves').setAttribute('d',state.sound?'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14':'m16 9 5 6m0-6-5 6');updateSound()}catch{toast('화면을 다시 누른 뒤 소리를 켜 주세요.')}});
canvas.addEventListener('pointerdown',event=>{if(!event.isPrimary){pointerStart.id=null;return}pointerStart.x=event.clientX;pointerStart.y=event.clientY;pointerStart.id=event.pointerId;canvas.setPointerCapture(event.pointerId)});
canvas.addEventListener('pointercancel',()=>{pointerStart.id=null});
canvas.addEventListener('pointerup',pointerUp);
canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();state.ready=false;updateSound(true);$('loading').hidden=false;$('loading').innerHTML='<div class="error-message">화면이 잠시 쉬고 있어요.<button class="primary-button" id="reload-game">게임 다시 열기</button></div>';$('reload-game').onclick=()=>location.reload()});
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{lastTime=performance.now();updateSound()});

function gameSnapshot(){return {ready:state.ready,...state.snapshot()}}
function registerGameTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const empty={type:'object',properties:{},additionalProperties:false};
  const tools=[
    {name:'get_fire_game_state',description:'Read the current fire, mission, and firetruck position.',inputSchema:empty,annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>gameSnapshot()},
    {name:'start_fire_response',description:'Start driving to the fire. The child must already be riding the truck. Returns when dispatch starts.',inputSchema:empty,execute:()=>{if(!state.ready||state.complete||!state.riding)throw new Error('Board the truck before responding to an active fire.');if(!state.dispatch())throw new Error('Cannot reach fire.');return gameSnapshot()}},
    {name:'move_player',description:'Move the child on foot, or drive the truck when riding. Cancels a pending boarding or fire response.',inputSchema:{type:'object',properties:{x:{type:'number',minimum:-15,maximum:15},z:{type:'number',minimum:-11.2,maximum:11.2}},required:['x','z'],additionalProperties:false},execute:input=>{if(!input||!Number.isFinite(input.x)||!Number.isFinite(input.z)||!moveTo(input))throw new Error('Choose a reachable clear point in the village.');return gameSnapshot()}},
    {name:'board_firetruck',description:'Walk the child to the parked firetruck and board on arrival. Returns after walking begins.',inputSchema:empty,execute:()=>{if(!state.ready||state.riding||!boardTruck())throw new Error('Cannot start boarding.');return gameSnapshot()}},
    {name:'exit_firetruck',description:'Stop driving or spraying and place the child safely beside the parked truck.',inputSchema:empty,execute:()=>{if(!state.ready||!state.riding||!exitTruck())throw new Error('Cannot exit the truck here.');return gameSnapshot()}},
    {name:'reset_fire_game',description:'Restart on foot with the truck at the station and the wood burning again.',inputSchema:empty,execute:()=>{if(!state.ready)throw new Error('Game is loading.');reset();return gameSnapshot()}},
  ];
  for(const tool of tools){try{Promise.resolve(context.registerTool({...tool,annotations:tool.annotations??{readOnlyHint:false,untrustedContentHint:false}},{signal:lifecycle.signal})).catch(()=>{})}catch{}}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
init();
