import {createPlayground} from './playground.js';
import {createAdventure} from './adventure.js';
import {VILLAGE_EVENTS} from './adventure-layout.js';
import {PARK,PLAY_ACTIVITIES} from './playground-layout.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FIRE,SERVICES,WORLD} from './navigation.js';
import {FireGame} from './game-state.js';
import {createServices} from './services.js';
import {createEmergencyLights} from './emergency-lights.js';
import {createExpansion} from './expansion.js';
import {soundMix} from './sound.js';
import {createBackgroundMusic} from './background-music.js';
import {createZooAudio} from './zoo-audio.js';
import {KoreanNarrator} from './narration.js';
import {PlayInput,iceCreamZoom} from './play-input.js';
import {createFishing} from './fishing.js';
import {createRailway,groundHeight} from './railway.js';
import {acceleratePicking} from './picking.js';
import railwayLayout from './railway-layout.js';
import cityLayout from './city-layout.js';
import {createCity} from './city.js';
import {createWaterfront} from './waterfront.js';
import waterfrontLayout from './waterfront-layout.js';
import {riverHeight} from './river-geometry.js';
import {prepareSurfaces} from './surfaces.js';
import {zooTapTarget} from './zoo-interaction.js';
import {createCityMap} from './city-map.js';
import {scooterPose,applyScooterPose} from './scooter-pose.js';
import {createCoast} from './coast.js';
import {createFamily} from './family.js';
import {nextMetroStation} from './metro-loop.js';
const narrator=new KoreanNarrator();

const $=id=>document.getElementById(id);
const stage=$('stage'),canvas=$('game');
const travelControls=document.createElement('nav');travelControls.className='travel-controls';travelControls.setAttribute('aria-label','마을 이동');
document.querySelector('.topbar').prepend(travelControls);travelControls.append($('home'),$('open-map'),$('scooter-toggle'),$('mom-toggle'),$('dad-toggle'));
const state=new FireGame(onStateChange);
state.ready=false;state.sound=true;
let renderer,scene,camera,truck,child,wood,village,station,garageDoor,flames,smoke,water,marker,routeLine,childRing,lastTime=0,audioCtx,expansion,sun,ambientLight,services,rectGround,caveBlend=0;
const limbs={};
let truckLights;
const cameraTarget=new THREE.Vector3(),cameraOffset=new THREE.Vector3(28,32,28);
let waterSound=null,engineOsc=null,sirenOsc=null,rotorSound=null,backgroundMusic=null,zooAudio=null;
let viewWidth=1,viewHeight=1;
const temp=new THREE.Object3D(), vec=new THREE.Vector3(), raycaster=new THREE.Raycaster();
const ground=new THREE.Plane(new THREE.Vector3(0,1,0),-.12);
const flameParts=[], smokeParts=[];
let pendingPress=null,fishing,railway,city,waterfront,scooter,coast,family,playground,adventure;
const tapFeedback=document.createElement('div');tapFeedback.id='tap-feedback';tapFeedback.setAttribute('aria-hidden','true');document.body.append(tapFeedback);

function toast(message){narrator.say(message)}
function updateUI(){
  $('siren-toggle').hidden=!state.hasSiren||state.crossingBridge;
  $('siren-toggle').setAttribute('aria-pressed',String(state.sirenOn));
  $('siren-toggle').setAttribute('aria-label',state.sirenOn?'사이렌 끄기':'사이렌 켜기');
  $('scooter-toggle').setAttribute('aria-pressed',!!state.onScooter);
  $('scooter-toggle').setAttribute('aria-label',state.onScooter?'킥보드에서 내리기':'킥보드 타기');
  $('scooter-toggle').innerHTML=`<span class="scooter-button-label">${state.onScooter?'내리기':'킥보드'}</span><span aria-hidden="true">🛴</span>`;
  document.body.classList.toggle('complete',state.complete);
  const returning=['returning','openingReturn','entering','closing'].includes(state.truckPhase);
  $('badge-text').textContent=state.mode==='extinguishing'?'불을 끄고 있어요':state.boarding?(state.boardingStage==='dump-door'?'덤프트럭에 타러 가요':'소방차를 기다려요'):state.riding?'소방차 탑승 중':returning?'소방차가 복귀 중':'걸어서 탐험 중';
  $('exit').hidden=!state.riding||state.drivingTrain||state.drivingPlane||state.metroTrip||state.ferryTrip||state.helicopterTrip||state.crossingBridge;$('exit').setAttribute('aria-label',state.drivingDump?'덤프트럭에서 내리기':'소방차에서 내리기');
  if(state.drivingDump)$('badge-text').textContent=state.mode==='loading'?'흙을 싣고 있어요':state.mode==='unloading'?'흙을 내리고 있어요':state.cargo?'흙을 실은 덤프트럭':'덤프트럭 탑승 중';
  else if(!state.riding&&state.dumpPhase==='returning')$('badge-text').textContent='덤프트럭이 주차장으로 돌아가요';
  if(state.services[state.vehicle]){$('badge-text').textContent=SERVICES[state.vehicle].name+' 탑승 중';$('exit').setAttribute('aria-label',SERVICES[state.vehicle].name+'에서 내리기')}
  if(state.drivingBus){$('badge-text').textContent=state.drivingBus.name+' 운전 중';$('exit').setAttribute('aria-label',state.drivingBus.name+'에서 내리기')}
  if(state.mode==='pulling-over')$('badge-text').textContent='내리기 좋은 곳에 멈춰요';
  if(state.fishingMission||state.mode==='fishing')$('badge-text').textContent='물고기를 만나러 가요';
  if(state.mode==='fish-celebrate')$('badge-text').textContent='물고기를 잡았어요!';
  if(state.busRequest!==null)$('badge-text').textContent=state.buses[state.busRequest].name+'에 타러 가요';
  if(state.serviceRequest)$('badge-text').textContent=SERVICES[state.serviceRequest].name+'를 기다려요';
  if(state.iceMission||state.mode==='eating')$('badge-text').textContent=state.mode==='eating'?'냠냠! 맛있는 아이스크림':'아이스크림 받으러 가요';
  if(state.boardingStage==='train-door')$('badge-text').textContent=state.mode==='train-waiting'?'승강장에서 기차를 기다려요':'기차 승강장으로 걸어가요';
  if(state.drivingTrain)$('badge-text').textContent=`${railwayLayout.stops.find(s=>s.id===state.train.targetStation)?.name} 정류장으로 · 도착하면 내려요`;
  if(state.drivingPlane)$('badge-text').textContent='비행기 여행 중 · 공항으로 돌아와요';
  if(state.helicopterTrip)$('badge-text').textContent='헬기 타고 목적지로 슝!';
  if(state.crossingBridge)$('badge-text').textContent='전망 고가도로를 건너요';
  if(state.boardingStage==='plane-door')$('badge-text').textContent='비행기를 타러 가요';
  if(state.metroTrip)$('badge-text').textContent='지하철 여행 중 · 도착하면 내려요';
  if(state.ferryTrip)$('badge-text').textContent='유람선 타고 강변 여행 중';
  if(state.onScooter)$('badge-text').textContent='킥보드로 슝슝!';
  if(state.playing)$('badge-text').textContent=PLAY_ACTIVITIES.find(p=>p.id===state.play.id).icon+' '+PLAY_ACTIVITIES.find(p=>p.id===state.play.id).name+' 놀이 중';
  if(state.city.notice)$('badge-text').textContent=state.city.notice;
  $('city-notice').textContent=state.city.notice;$('city-notice').hidden=!state.city.notice;
  $('exit').querySelector('span').textContent='내리기';
}
function serviceAction(id){if(!state.ready)return;if(!state.boardService(id))toast(state.riding?'먼저 타고 있는 차에서 내려 주세요.':'잠깐 기다렸다가 다시 눌러 주세요.')}
function iceAction(){if(!state.ready)return;if(!state.getIceCream())toast(state.riding?'차에서 내려서 아이스크림을 받으러 가요.':'냠냠! 아이스크림을 먹고 있어요.')}
function setRoute(points){
  if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();routeLine.material.dispose();routeLine=null}
  if(!points.length)return;
  const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(state.actor.x,.27+riverHeight(state.actor.x,state.actor.z),state.actor.z),...points.map(p=>new THREE.Vector3(p.x,.27+riverHeight(p.x,p.z),p.z))]);
  routeLine=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0xffffdb,dashSize:.25,gapSize:.22,transparent:true,opacity:.72}));
  routeLine.computeLineDistances();scene.add(routeLine);
}
function moveTo(target){
  if(!state.ready)return false;
  if(['loading','unloading','eating','fishing','fish-celebrate','pulling-over'].includes(state.mode))return false;
  return state.moveNear(target);
}
function boardTruck(){if(!state.ready)return false;if(!state.boardTruck()){toast('소방서 앞으로 갈 수 없어요. 빈 바닥에서 다시 눌러 주세요.');return false}return true}
function exitTruck(){if(!state.ready)return false;if(state.carryingPatient){toast('친구를 병원에 데려다준 뒤 내려요.');return false}if(!state.exitTruck()){toast('내릴 자리가 없어요. 조금 더 넓은 곳으로 이동해요.');return false}return true}
function stationAction(){if(!state.ready)return;if(state.riding&&!state.drivingFire){toast('먼저 타고 있는 차에서 내려 주세요.');return}if(state.riding)state.goHome();else boardTruck()}
function dispatch(){if(!state.ready)return false;if(!state.riding)return boardTruck();return state.dispatch()}
function fireAction(){if(!state.ready||state.complete)return;if(!state.drivingFire){toast('먼저 소방서 건물을 눌러 소방차를 타요!');return}state.dispatch()}
function reset(){
  if(!state.ready)return;
  pendingPress=null;playInput.cancel();narrator.stop();
  for(const id of ['help-dialog','city-map'])if($(id).open)$(id).close();
  family?.reset();for(const id of ['mom','dad'])$(id+'-toggle').setAttribute('aria-pressed','false');
  state.reset();camera.zoom=1;followCamera(0,true);
  expansion.update(state,0,0);services.update(state,0);fishing.update(state,0);railway.update(state,0,camera);updateSound();
}
function busAction(index){if(!state.ready)return;if(!state.boardBus(index))toast(state.riding?'먼저 차에서 내려 주세요.':'버스가 주차장에 돌아오면 탈 수 있어요.')}
function dumpAction(){if(!state.ready)return;if(!state.boardDump())toast(state.riding?'먼저 타고 있는 차에서 내려 주세요.':'덤프트럭이 주차장에 돌아오면 다시 탈 수 있어요.')}
function excavatorAction(){if(!state.ready)return;if(!state.drivingDump){toast('주차장에서 덤프트럭을 타고 와 주세요.');return}if(!state.loadDump())toast(state.cargo>=3?'흙이 가득해요. 초록색 테두리의 하역장에 내려 주세요.':'흙을 옮기는 중이에요. 잠깐 기다려 주세요.')}
function unloadAction(){if(!state.ready)return;if(!state.drivingDump){toast('흙을 실은 덤프트럭으로 와 주세요.');return}if(!state.unloadDump())toast(state.cargo===0?'먼저 포크레인에게 흙을 받아 와 주세요.':'잠깐 기다려 주세요.')}
function onStateChange(reason){
  if(!state.ready)return;
  syncActors();marker.visible=state.mode==='moving';
  if(state.target)marker.position.set(state.target.x,.28+riverHeight(state.target.x,state.target.z),state.target.z);
  setRoute(state.mode==='moving'?state.path:[]);
  if(reason==='city-notice'&&state.city.speech)toast(state.city.speech);
  if(reason==='metro-depart'||reason==='metro-arrive')chime();
  if(reason==='reset'){
    flames.visible=false;smoke.visible=false;water.visible=false;
    wood.traverse(o=>{if(o.isMesh&&o.userData.originalColor)o.material.color.copy(o.userData.originalColor)});
    toast('소방서를 눌러 소방차를 불러 볼까요?');
  }
  if(reason==='garage'&&state.truckPhase==='opening')toast('소방차가 나와요. 잠깐 기다려 주세요.');
  if(reason==='fire-start'){wood.traverse(o=>{if(o.isMesh&&o.userData.originalColor)o.material.color.copy(o.userData.originalColor)});toast('앗, 불이 났어요! 불을 눌러 출동해요!')}
  if(reason==='board')toast(state.complete?'소방차에 탔어요. 마을을 둘러볼까요?':'다시 탔어요. 불을 눌러 출동해 주세요.');
  if(reason==='move'&&state.fireMission)toast('출동! 불을 끄러 가요.');
  if(reason==='arrive'&&state.mode==='extinguishing')toast('물을 뿌려서 불을 꺼요.');
  if(reason==='exit')toast('내렸어요! 소방차가 소방서로 돌아가요.');
  const messages={'dump-walk':'덤프트럭에 타러 가요.','dump-board':'출발! 포크레인에게 흙을 받으러 가요.','dump-dispatch':'포크레인에게 흙을 받으러 가요.','loading':'포크레인이 흙을 퍼서 실어 줄게요.','loaded':'흙을 다 실었어요! 초록 테두리 안에 내려 볼까요?','dump-deliver':'흙을 내릴 곳으로 가요.','unloading':'적재함을 들어 흙을 내려요.','delivered':'흙을 잘 옮겼어요! 다시 흙을 받으러 가 볼까요?','dump-exit':'덤프트럭이 주차장으로 돌아가요.'};
  if(messages[reason])toast(messages[reason]);
  if(reason==='service-call')toast(SERVICES[state.serviceRequest].kind==='fire'?'소방차가 나와요. 잠깐 기다려 주세요.':SERVICES[state.serviceRequest].name+'가 나와요. 문 앞에서 기다려 주세요.');
  if(reason==='service-board')toast(state.drivingFire?'다시 탔어요. 불을 눌러 출동해 주세요.':state.vehicle==='police'?'경찰차 출발! 마을을 순찰해요!':'구급차를 타고 아픈 친구를 도와줘요.');
  if(reason==='service-exit')toast('내렸어요. 자동차가 자기 차고로 돌아가요.');
  if(reason==='bus-walk')toast(state.buses[state.busRequest].name+'를 타러 가요!');
  if(reason==='bus-board')toast(state.drivingBus.name+'에 탔어요! 마을을 한 바퀴 돌아볼까요?');
  if(reason==='bus-exit')toast('버스가 주차장으로 돌아가요.');
  if(reason==='ice-walk')toast('아이스크림을 받으러 가요!');
  if(reason==='ice-eat')toast('와, 아이스크림이다! 냠냠, 맛있다!');
  if(reason==='ice-done')toast('잘 먹었습니다!');
  if(reason==='fish-walk')toast('연못으로 낚시하러 가요!');
  if(reason==='fishing')toast('물고기야, 이리 와! 조금만 기다려 볼까요?');
  if(reason==='fish-caught'){chime();toast('우와! 물고기를 잡았어요!')}
  if(['patient-rescued','play-complete','event-complete','forest-meet'].includes(reason))chime();
  if(reason==='thief-caught'){chime();toast('잡았다! 도둑을 잡았어요!')}
  const newMessages={'train-walk':'승강장으로 기차를 타러 가요.','train-board':'다음 승강장에서 내려요. 조금만 기다려 주세요.','train-exit':'승강장에 도착했어요. 기차 여행 재미있었죠?','dog-follow':'강아지가 친구가 되었어요. 같이 산책해요!','cat-follow':'고양이가 친구가 되었어요. 같이 산책해요!'};
  if(newMessages[reason])toast(newMessages[reason]);
  if(reason==='win'){flames.visible=false;water.visible=false;wood.traverse(o=>{if(o.isMesh)o.material.color.multiplyScalar(.5)});chime();toast('고마워요! 마을이 다시 안전해졌어요.');}
  updateUI();
}
// Preserve the GLB's glass, paint, metal, and rubber surface properties.
function prepareModel(root){prepareSurfaces(root);root.traverse(o=>{if(o.isMesh){
  o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),size=box.getSize(new THREE.Vector3());
  // Broad ground slabs receive shadows; casting their own subpixel edge shadows causes striping.
  o.castShadow=!(size.y<2&&Math.max(size.x,size.z)>20);o.receiveShadow=true;acceleratePicking(o);
}});return root}
function addEffects(){
  const ring=new THREE.RingGeometry(.48,.57,40);
  marker=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:0xfffbce,side:THREE.DoubleSide,transparent:true,opacity:.9}));marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
  childRing=new THREE.Mesh(new THREE.RingGeometry(.48,.58,32),new THREE.MeshBasicMaterial({color:0xffdc55,side:THREE.DoubleSide}));childRing.rotation.x=-Math.PI/2;scene.add(childRing);
  flames=new THREE.Group();flames.position.set(FIRE.x,0,FIRE.z);scene.add(flames);flames.visible=false;
  const geo=new THREE.IcosahedronGeometry(1,0);
  for(let i=0;i<18;i++){
    const a=i*2.4,r=.22+(i%4)*.25;
    const f=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:i%3===0?0xffd45c:i%3===1?0xff862f:0xef4921}));
    f.userData={x:Math.cos(a)*r,z:Math.sin(a)*r,height:.7+(i%5)*.28,phase:i*.9};flameParts.push(f);flames.add(f);
  }
  smoke=new THREE.Group();smoke.position.set(FIRE.x,0,FIRE.z);scene.add(smoke);smoke.visible=false;
  const smokeMat=new THREE.MeshLambertMaterial({color:0x727d7d,transparent:true,opacity:.36,depthWrite:false});
  for(let i=0;i<12;i++){const p=new THREE.Mesh(geo,smokeMat);p.userData.phase=i/12;smokeParts.push(p);smoke.add(p)}
  water=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.14,1),new THREE.MeshBasicMaterial({color:0x16b9ed}),76);water.instanceMatrix.setUsage(THREE.DynamicDrawUsage);water.frustumCulled=false;water.visible=false;scene.add(water);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(1.75,40),new THREE.MeshBasicMaterial({color:0xee862c,transparent:true,opacity:.15,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.set(0,.17,0);flames.add(glow);
}
function resize(){
  if(!renderer)return;viewWidth=stage.clientWidth;viewHeight=stage.clientHeight;
  renderer.setSize(viewWidth,viewHeight,false);
  const aspect=viewWidth/viewHeight,vertical=Math.max(23,27/aspect);
  camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  followCamera(1,true);
}
function followCamera(dt,snap=false){
  const actor=state.actor,target=new THREE.Vector3(actor.x,1+(actor.height??0),actor.z);
  const underground=state.metroTrip;
  const inCave=Math.abs(actor.x)<17&&Math.abs(actor.z+85)<6.5&&(actor.height??0)<3;
  const [zx0,zx1,zz0,zz1]=cityLayout.zoo.bounds;
  const inZoo=actor.x>zx0&&actor.x<zx1&&actor.z>zz0&&actor.z<zz1;
  caveBlend=THREE.MathUtils.lerp(caveBlend,inCave?1:0,snap?1:1-Math.exp(-dt*4));
  $('cave-shade').style.opacity=String(caveBlend*.7);
  if(ambientLight)ambientLight.intensity=underground?.65:1.8-caveBlend*1.4;
  if(sun)sun.intensity=underground?.4:2.8-caveBlend*2.2;
  if(snap)cameraTarget.copy(target);else cameraTarget.lerp(target,1-Math.exp(-dt*9));
  if(sun){sun.position.set(cameraTarget.x-15,28,cameraTarget.z+16);sun.target.position.set(cameraTarget.x,0,cameraTarget.z);sun.target.updateMatrixWorld(true)}
  const inPark=Math.abs(actor.x-PARK.x)<32&&Math.abs(actor.z-PARK.z)<42;
  const scenicZoom=inPark?.78:underground?.85:state.ferryTrip?.78:inCave?1.35:inZoo?.75:state.crossingBridge?.82:null;
  camera.zoom=state.drivingPlane||state.ridingHelicopter?THREE.MathUtils.lerp(camera.zoom,.58,1-Math.exp(-dt*2)):scenicZoom!==null?THREE.MathUtils.lerp(camera.zoom,scenicZoom,1-Math.exp(-dt*3)):iceCreamZoom(camera.zoom,state.mode==='eating',dt);camera.updateProjectionMatrix();
  camera.position.copy(cameraTarget).add(new THREE.Vector3().copy(underground?new THREE.Vector3(22,22,26):cameraOffset).lerp(new THREE.Vector3(9,6.5,12),caveBlend));camera.lookAt(cameraTarget);camera.updateMatrixWorld(true);
}
function syncActors(time=0,paused=false){
  truckLights?.update(state,time);
  truck.position.set(state.truck.x,.13+(state.truck.height??0),state.truck.z);truck.rotation.y=state.truck.angle;
  child.visible=!state.riding;childRing.visible=!state.riding;
  const scooting=state.onScooter;
  const kickPose=scooting?scooterPose(time,state.mode==='moving'&&!paused):null;
  const walking=!state.riding&&!scooting&&(['moving','bridge'].includes(state.mode)||state.metroTrip&&state.transit.metro.walking)&&!paused;
  const swing=walking?Math.sin(time*10)*.62:0;
  const height=groundHeight(state.child.x,state.child.z)+(state.child.height??0);
  child.position.set(state.child.x,height+(kickPose?.body??(walking?Math.abs(Math.sin(time*10))*.045:0)),state.child.z);child.rotation.set(0,state.child.angle,0);
  for(const name of ['Knee_L','Knee_R','Ankle_L','Ankle_R'])if(limbs[name])limbs[name].rotation.x=0;
  for(const side of ['L','R'])if(limbs['Leg_'+side])limbs['Leg_'+side].position.x=limbs['Leg_'+side].userData.restX+(scooting?(side==='R'?.12:.045):0);
  for(const [name,sign] of [['Arm_L',-1],['Arm_R',1],['Leg_L',1],['Leg_R',-1]])if(limbs[name])limbs[name].rotation.set(swing*sign,0,0);
  if(scooter){scooter.visible=scooting;scooter.position.set(state.child.x-.1*Math.cos(state.child.angle),height,state.child.z+.1*Math.sin(state.child.angle));scooter.rotation.y=state.child.angle}
  if(scooting){for(const name of ['Arm_L','Arm_R'])if(limbs[name])limbs[name].rotation.x=-1.5;applyScooterPose(limbs,kickPose)}
  childRing.position.set(state.child.x,height+.03,state.child.z);
  garageDoor.scale.y=Math.max(.025,1-state.door);
}
function tick(now){
  requestAnimationFrame(tick);if(!state.ready||document.hidden)return;
  const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;const time=now/1000;
  const paused=$('help-dialog').open||$('city-map').open;
  if(pendingPress){const action=pendingPress;pendingPress=null;if(!paused)action()}
  if(!paused)state.update(dt);
  syncActors(time,paused);expansion.update(state,time,paused?0:dt);services.update(state,time);fishing.update(state,time);family?.update(state,time,paused?0:dt);followCamera(dt);railway.update(state,time,camera);
  city.update(state);coast?.update(time);playground?.update(state,child,limbs,childRing);adventure?.update(state,child,limbs,childRing,paused,camera);
  flames.visible=state.fireActive;
  water.visible=state.riding&&state.mode==='extinguishing';
  const strength=.12+.88*(state.hp/100);
  flameParts.forEach(f=>{const p=f.userData,wobble=Math.sin(time*7+p.phase);f.position.set(p.x,.65+p.height*.4*strength,p.z);f.scale.set((.3+wobble*.035)*strength,p.height*strength*(1+wobble*.16),(.3-wobble*.03)*strength);f.rotation.y=time*.5+p.phase});
  smoke.visible=state.fireActive;
  smokeParts.forEach((p,i)=>{const t=(time*.19+p.userData.phase)%1;p.position.set(Math.sin(i*3)*.3+t*.85,.8+t*5,Math.cos(i*2)*.3+t*.35);p.scale.setScalar((.18+t*.7)*strength);p.rotation.y=time*.2+i});
  if(water.visible){
    const fireVehicle=services.entries[state.vehicle]?.car??truck;
    const start=new THREE.Vector3(0,1.8,.29).applyAxisAngle(new THREE.Vector3(0,1,0),fireVehicle.rotation.y).add(fireVehicle.position);
    for(let i=0;i<76;i++){
      const t=(time*1.55+i/76)%1;
      temp.position.set(THREE.MathUtils.lerp(start.x,FIRE.x,t)+Math.sin(i*7)*.09*t,THREE.MathUtils.lerp(start.y,.55,t)+Math.sin(t*Math.PI)*1.3,THREE.MathUtils.lerp(start.z,FIRE.z,t)+Math.cos(i*5)*.09*t);
      temp.scale.setScalar(.8+t*.4);temp.updateMatrix();water.setMatrixAt(i,temp.matrix);
    }water.instanceMatrix.needsUpdate=true;
  }
  if(marker.visible)marker.scale.setScalar(1+Math.sin(time*5)*.12);
  waterfront.update(state,child,childRing);updateSound(paused);renderer.render(scene,camera);
}
function pickPress({x,y,type}){
  if(state.adventureBusy||state.playing||state.metroTrip||state.ferryTrip||state.helicopterTrip||state.crossingBridge)return;
  if(!state.ready||$('help-dialog').open||$('city-map').open||['eating','fishing','fish-celebrate','pulling-over','loading','unloading'].includes(state.mode))return;
  const bounds=canvas.getBoundingClientRect();
  const cast=(px,py)=>raycaster.setFromCamera(new THREE.Vector2((px-bounds.left)/bounds.width*2-1,-(py-bounds.top)/bounds.height*2+1),camera);
  const roots=[...railway.platforms.map(p=>p.root),...railway.cars,...railway.animals.map(p=>p.root),fishing.dock,rectGround,village,truck,wood,services.ground,services.van,...Object.values(services.entries).flatMap(v=>[v.building,v.car]),expansion.ground,expansion.dump,expansion.excavator,expansion.pile,...expansion.buses,...(state.fireActive?flameParts:[])];
  const actionFor=(object,point)=>{
    const belongs=root=>{for(let o=object;o;o=o.parent)if(o===root)return true;return false};
    const event=adventure?.actionFor(belongs);if(event)return event;
    const play=playground?.entries.find(p=>belongs(p.root)||belongs(p.marker));if(play)return ()=>{if(!state.startPlay(play.id))state.cityNotice('먼저 차에서 내린 뒤 놀아요.')};
    const metroStop=waterfront.entrances.find(e=>belongs(e.root));if(metroStop)return ()=>rideNextMetro(metroStop.id);
    if(belongs(waterfront.boat))return ()=>{if(!state.boardFerry())toast('먼저 타고 있는 차에서 내려 주세요.')};
    if(object.material?.name==='River jade')return ()=>state.cityNotice('강은 다리로 건너요. 유람선은 선착장에서 타요.');
    if(belongs(waterfront.world)&&Math.hypot(point.x-waterfrontLayout.dock.x,point.z-waterfrontLayout.dock.z)<10)return ()=>state.boardFerry();
    if(belongs(waterfront.world))return ()=>moveTo({x:point.x,z:point.z});
    if(belongs(city.plane)||belongs(city.airport))return ()=>{if(!state.boardPlane())state.cityNotice('비행기는 차에서 내려서 타요')};
    if(belongs(city.bridge))return ()=>state.startBridgeTour();
    const animal=city.animals.find(a=>belongs(a.root));if(animal)return ()=>state.visitZoo(animal.id);
    if(belongs(city.zoo)){const target=zooTapTarget(point);return ()=>target.animal?state.visitZoo(target.animal):moveTo(target)}
    const thief=city.thieves.findIndex(p=>belongs(p.root));if(thief>=0)return ()=>state.chaseThief(thief);
    const patient=city.patients.findIndex(p=>belongs(p.root));if(patient>=0)return ()=>state.rescuePatient(patient);
    const stop=railway.platforms.find(p=>belongs(p.root));
    if(stop||railway.cars.some(belongs))return ()=>{if(!state.boardTrain(stop?.id??state.train.targetStation??state.train.stationId??'north')&&state.riding)toast('먼저 타고 있는 차에서 내려 주세요.')};
    const pet=railway.animals.find(p=>belongs(p.root));if(pet)return ()=>state.followPet(pet.id);
    if(belongs(fishing.dock)||object.material?.name==='water')return ()=>state.startFishing();
    for(const [id,v] of Object.entries(services.entries))if(belongs(v.building)||belongs(v.car))return ()=>{if(state.vehicle!==id&&state.serviceRequest!==id)serviceAction(id)};
    if(belongs(services.van))return ()=>{if(!state.iceMission)iceAction()};
    if(belongs(expansion.dump))return ()=>{if(!state.drivingDump&&state.boardingStage!=='dump-door')dumpAction()};
    if(belongs(expansion.excavator))return ()=>{if(state.dumpMission!=='load')excavatorAction()};
    if(belongs(expansion.pad)||belongs(expansion.pile))return ()=>{if(state.dumpMission!=='unload')unloadAction()};
    const index=expansion.buses.findIndex(b=>belongs(b));if(index>=0)return ()=>{if(state.vehicle!==`bus-${index}`&&state.busRequest!==index)busAction(index)};
    if(belongs(station)||belongs(garageDoor))return ()=>{if(!['waiting','door'].includes(state.boardingStage))stationAction()};
    if(belongs(truck))return ()=>{if(!state.riding&&!['waiting','door'].includes(state.boardingStage))boardTruck()};
    if(belongs(wood)||flameParts.includes(object))return ()=>{if(!state.fireMission)fireAction()};
    return null;
  };
  roots.push(...playground.pickRoots);
  roots.push(...adventure.pickRoots.filter(r=>r.visible));
  roots.push(...waterfront.pickRoots);
  roots.push(...city.pickRoots.filter(r=>r.visible));
  scene.updateMatrixWorld(true);
  const radius=type==='touch'?22:type==='pen'?12:7;
  for(const [dx,dy] of [[0,0],[-radius,0],[radius,0],[0,-radius],[0,radius],[-radius*.7,-radius*.7],[radius*.7,-radius*.7],[-radius*.7,radius*.7],[radius*.7,radius*.7]]){
    cast(x+dx,y+dy);
    const hit=raycaster.intersectObjects(roots,true)[0],action=hit&&actionFor(hit.object,hit.point);
    if(action){pendingPress=action;return}
  }
  cast(x,y);
  const hit=new THREE.Vector3();
  if(!raycaster.ray.intersectPlane(ground,hit))return;
  const target={x:hit.x,z:hit.z};pendingPress=()=>moveTo(target);
}

// Audio is unlocked by a real touch/click, including on iPad Safari.
function ensureAudio(){
  if(audioCtx)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audioCtx=new Audio();narrator.connect(audioCtx);
  backgroundMusic=createBackgroundMusic(audioCtx);
  zooAudio=createZooAudio(audioCtx);
  const gain=audioCtx.createGain();gain.gain.value=0;gain.connect(audioCtx.destination);
  const osc=audioCtx.createOscillator();osc.type='triangle';osc.connect(gain);osc.start();engineOsc={osc,gain};
  const sirenGain=audioCtx.createGain();sirenGain.gain.value=0;sirenGain.connect(audioCtx.destination);const siren=audioCtx.createOscillator();siren.type='sine';siren.connect(sirenGain);siren.start();sirenOsc={osc:siren,gain:sirenGain};
  const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  const noise=audioCtx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;
  const waterGain=audioCtx.createGain();waterGain.gain.value=0;noise.connect(filter);filter.connect(waterGain);waterGain.connect(audioCtx.destination);noise.start();waterSound=waterGain;
  // Low turbine rumble and filtered air noise share a slowly pulsing rotor envelope.
  const rotorFilter=audioCtx.createBiquadFilter();rotorFilter.type='lowpass';rotorFilter.frequency.value=360;noise.connect(rotorFilter);
  const pulse=audioCtx.createGain();pulse.gain.value=.55;rotorFilter.connect(pulse);
  const rumble=audioCtx.createOscillator();rumble.type='triangle';rumble.frequency.value=62;
  const rumbleGain=audioCtx.createGain();rumbleGain.gain.value=.28;rumble.connect(rumbleGain);rumbleGain.connect(pulse);rumble.start();
  const beat=audioCtx.createOscillator(),depth=audioCtx.createGain();beat.frequency.value=14;depth.gain.value=.43;beat.connect(depth);depth.connect(pulse.gain);beat.start();
  const rotorGain=audioCtx.createGain();rotorGain.gain.value=0;pulse.connect(rotorGain);rotorGain.connect(audioCtx.destination);rotorSound={gain:rotorGain,beat};
}
function updateSound(paused=false){
  if(!audioCtx)return;
  const mix=soundMix(state,audioCtx.currentTime,{paused,hidden:document.hidden,narrating:narrator.status==='speaking'});
  zooAudio.update(state,{paused,hidden:document.hidden,narrating:['speaking','loading'].includes(narrator.status)});
  backgroundMusic.setVolume(zooAudio.active?Math.min(mix.musicGain,.045):mix.musicGain);
  engineOsc.gain.gain.setTargetAtTime(mix.engineGain,audioCtx.currentTime,.08);engineOsc.osc.frequency.setTargetAtTime(mix.engineHz,audioCtx.currentTime,.08);
  sirenOsc.gain.gain.setTargetAtTime(mix.sirenGain,audioCtx.currentTime,.12);sirenOsc.osc.frequency.setTargetAtTime(mix.sirenHz,audioCtx.currentTime,.06);
  waterSound.gain.setTargetAtTime(mix.waterGain,audioCtx.currentTime,.08);
  rotorSound.gain.gain.setTargetAtTime(mix.rotorGain,audioCtx.currentTime,.12);rotorSound.beat.frequency.setTargetAtTime(mix.rotorHz,audioCtx.currentTime,.15);
}
function chime(){if(!state.sound||!audioCtx)return;[523.25,659.25,783.99,1046.5].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+i*.15;o.frequency.value=f;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.start(t);o.stop(t+.4)})}

async function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-25,25,20,-20,.1,180);camera.position.set(29,34,40);camera.lookAt(0,.1,0);
    ambientLight=new THREE.HemisphereLight(0xf3f8ff,0x839576,1.8);scene.add(ambientLight);sun=new THREE.DirectionalLight(0xfff2d7,2.8);sun.position.set(-15,28,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:80});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;scene.add(sun,sun.target);
    const loader=new GLTFLoader();const [villageAsset,truckAsset,woodAsset,childAsset]=await Promise.all(['village-rect','firetruck','firewood','child'].map(name=>loader.loadAsync(`./models/${name}.glb`)));
    village=prepareModel(villageAsset.scene);scene.add(village);station=village.getObjectByName("Station");garageDoor=village.getObjectByName("GarageDoor");
    truck=prepareModel(truckAsset.scene);scene.add(truck);truckLights=createEmergencyLights(truck,'firetruck');
    child=prepareModel(childAsset.scene);child.scale.setScalar(1.15);scene.add(child);
    scooter=prepareModel((await loader.loadAsync('./models/scooter.glb')).scene);scene.add(scooter);scooter.visible=false;
    for(const name of ['Arm_L','Arm_R','Leg_L','Leg_R','Knee_L','Knee_R','Ankle_L','Ankle_R']){limbs[name]=child.getObjectByName(name);if(limbs[name])limbs[name].userData.restX=limbs[name].position.x}
    wood=prepareModel(woodAsset.scene);wood.position.set(FIRE.x,.16,FIRE.z);wood.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.userData.originalColor=o.material.color.clone()}});scene.add(wood);
    expansion=await createExpansion(loader,scene,prepareModel);
    services=await createServices(loader,scene,prepareModel,child,limbs);
    fishing=createFishing(scene,child,limbs);
    rectGround=prepareModel((await loader.loadAsync('./models/expanded-ground.glb')).scene);scene.add(rectGround);
    railway=await createRailway(loader,scene,prepareModel);railway.update(state,0,camera);
    city=await createCity(loader,scene,prepareModel);city.update(state);
    waterfront=await createWaterfront(loader,scene,prepareModel);coast=createCoast(scene);family=await createFamily(loader,scene,prepareModel,child,limbs);
    playground=await createPlayground(loader,scene,prepareModel);
    adventure=await createAdventure(loader,scene,prepareModel,city.models,state);
    addEffects();resize();syncActors();state.ready=true;$('loading').hidden=true;updateUI();registerGameTools();lastTime=performance.now();requestAnimationFrame(tick);
  }catch(error){console.error(error);$('loading').innerHTML='<div class="error-message"><strong>마을을 불러오지 못했어요.</strong><br>인터넷 연결과 Safari 업데이트를 확인하고 다시 열어 주세요.<button class="primary-button" id="retry">다시 열기</button></div>';$('retry').onclick=()=>location.reload()}
}
$('exit').addEventListener('click',exitTruck);
$('siren-toggle').addEventListener('click',()=>{if(!state.ready)return;if(state.sound)unlockAudio();state.toggleSiren();updateSound()});
$('home').addEventListener('click',reset);
const cityAtlas=createCityMap({dialog:$('city-map'),art:$('city-map-art'),list:$('destinations'),onStation:rideMapMetro,onTravel(place){
  $('city-map').close();
  if(state.drivingTrain||state.drivingPlane){state.cityNotice('도착해서 내린 뒤 목적지를 골라 주세요');return}
  if(!state.callHelicopter(place))state.cityNotice('지금 놀이가 끝나면 헬기를 불러 주세요');
  else state.pendingEvent=place.eventId??null;
}});
$('open-map').addEventListener('click',()=>{if(state.sound)unlockAudio();cityAtlas.open(state.actor)});
$('close-map').addEventListener('click',()=>$('city-map').close());
$('scooter-toggle').addEventListener('click',()=>{if(!state.ready)return;if(state.sound)unlockAudio();if(!state.toggleScooter())toast('지금 놀이를 마치고 킥보드를 타요.');updateUI()});
function rideNextMetro(stationId){
  if(!state.ready)return;
  if(state.riding||state.activityLocked){toast('먼저 타고 있는 차에서 내려 주세요.');return}
  if(state.sound)unlockAudio();
  if(!state.rideSubway(stationId,nextMetroStation(stationId)))toast('잠깐 기다렸다가 다시 눌러 주세요.');
}
function rideMapMetro(destination){
  if(!state.ready)return;if(state.sound)unlockAudio();$('city-map').close();
  const station=waterfrontLayout.stations.find(s=>s.id===destination);
  if(station&&!state.callHelicopter({...station.boarding,name:station.name}))toast('지금 놀이가 끝나면 헬기를 불러 주세요');
}
for(const id of ['mom','dad'])$(id+'-toggle').addEventListener('click',()=>{
  if(!state.ready)return;if(state.sound)unlockAudio();const active=family.toggle(id,state);
  if(active===null){toast('지금 놀이를 마치고 손을 잡아요.');return}
  $(id+'-toggle').setAttribute('aria-pressed',String(active));
  toast(active?(family.enabled('mom')&&family.enabled('dad')?'엄마 아빠랑 손잡고 걸어요!':id==='mom'?'엄마랑 손잡고 걸어요!':'아빠랑 손잡고 걸어요!'):(id==='mom'?'엄마는 잠깐 기다릴게요.':'아빠는 잠깐 기다릴게요.'));
});
document.addEventListener('pointerdown',()=>{if(state.sound)unlockAudio()},{passive:true});
$('help').addEventListener('click',()=>$('help-dialog').showModal());
for(const id of ['close-help','start-playing'])$(id).addEventListener('click',()=>$('help-dialog').close());
$('sound').addEventListener('click',()=>{
  state.sound=!state.sound;narrator.setEnabled(state.sound);
  $('sound').setAttribute('aria-pressed',state.sound);$('sound').setAttribute('aria-label',state.sound?'소리 끄기':'소리 켜기');$('sound').title=state.sound?'소리 끄기':'소리 켜기';
  $('sound-waves').setAttribute('d',state.sound?'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14':'m16 9 5 6m0-6-5 6');
  if(state.sound){unlockAudio();toast('한국어 음성 안내를 켰어요.')}updateSound();
});
function unlockAudio(){try{ensureAudio();audioCtx?.resume().catch(()=>{});backgroundMusic?.start()}catch{}}
const playInput=new PlayInput(press=>{
  if(state.sound)unlockAudio();
  tapFeedback.style.left=press.x+'px';tapFeedback.style.top=press.y+'px';tapFeedback.classList.remove('pulse');void tapFeedback.offsetWidth;tapFeedback.classList.add('pulse');
  pickPress(press);
});
canvas.addEventListener('pointerdown',event=>{event.preventDefault();if(playInput.down(event)){try{canvas.setPointerCapture(event.pointerId)}catch{}}},{passive:false});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>playInput.up(event));
for(const name of ['contextmenu','dragstart','selectstart'])document.addEventListener(name,event=>event.preventDefault());
window.addEventListener('blur',()=>{playInput.cancel();pendingPress=null});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();state.ready=false;updateSound(true);$('loading').hidden=false;$('loading').innerHTML='<div class="error-message">화면이 잠시 쉬고 있어요.<button class="primary-button" id="reload-game">게임 다시 열기</button></div>';$('reload-game').onclick=()=>location.reload()});
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(document.hidden){narrator.stop();playInput.cancel();pendingPress=null}updateSound()});

function gameSnapshot(){return {ready:state.ready,...state.snapshot(),city:{plane:structuredClone(state.city.plane),helicopter:structuredClone(state.city.helicopter),bridge:structuredClone(state.city.bridge),caught:state.city.caught,chase:state.city.chase,thieves:structuredClone(state.city.thieves),trafficCount:state.city.traffic.length,pedestrianCount:state.city.people.length},world:WORLD,train:structuredClone(state.train),pets:state.pets.map(({path,...pet})=>pet),narration:narrator.snapshot(),cameraZoom:camera.zoom,cameraTarget:{x:cameraTarget.x,y:cameraTarget.y,z:cameraTarget.z}}}
function registerGameTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const empty={type:'object',properties:{},additionalProperties:false};
  const tools=[
    {name:'ride_subway',description:'Walk to a metro entrance, descend underground and ride to another station.',inputSchema:{type:'object',properties:{station:{type:'string',enum:waterfrontLayout.stations.map(s=>s.id)},destination:{type:'string',enum:waterfrontLayout.stations.map(s=>s.id)}},required:['station','destination'],additionalProperties:false},execute:({station,destination})=>{if(!state.ready||!state.rideSubway(station,destination))throw new Error('Finish the current activity and dismount first.');return gameSnapshot()}},
    {name:'board_ferry',description:'Walk to the riverside dock, ride a sightseeing ferry and return to the dock.',inputSchema:empty,execute:()=>{if(!state.ready||!state.boardFerry())throw new Error('Dismount first.');return gameSnapshot()}},
    {name:'board_plane',description:'Walk to the airport and board a plane for a city sightseeing flight with automatic landing.',inputSchema:empty,execute:()=>{if(!state.ready||!state.boardPlane())throw new Error('Dismount first.');return gameSnapshot()}},
    {name:'call_helicopter',description:'Call the map helicopter for a pickup, flight and landing at one of the city map destinations.',inputSchema:{type:'object',properties:{destination:{type:'string',enum:cityLayout.destinations.map(p=>p.name)}},required:['destination'],additionalProperties:false},execute:({destination})=>{const p=cityLayout.destinations.find(p=>p.name===destination);if(!state.ready||!p||!state.callHelicopter(p))throw new Error('Finish the current activity first.');return gameSnapshot()}},
    {name:'cross_overpass',description:'Go to the curved overpass approach and cross it on foot or in your current road vehicle.',inputSchema:empty,execute:()=>{if(!state.ready||!state.startBridgeTour())throw new Error('Finish the current activity first.');return gameSnapshot()}},
    {name:'rescue_patient',description:'While driving the ambulance, pick up a waiting patient and bring them to the hospital.',inputSchema:{type:'object',properties:{id:{type:'integer',minimum:0,maximum:2}},required:['id'],additionalProperties:false},execute:({id})=>{if(!state.ready||!state.rescuePatient(id))throw new Error('Board the ambulance and choose a waiting patient.');return gameSnapshot()}},
    {name:'visit_zoo',description:'Walk to the zoo or an animal viewing point.',inputSchema:{type:'object',properties:{animal:{type:'string',enum:cityLayout.zoo.animals.map(a=>a.id)}},additionalProperties:false},execute:({animal}={})=>{if(!state.ready||!state.visitZoo(animal))throw new Error('Choose a valid animal and dismount first.');return gameSnapshot()}},
    {name:'board_city_firetruck',description:'Summon and board the west or east fire station engine. It can respond to the village fire.',inputSchema:{type:'object',properties:{station:{type:'string',enum:['fire-west','fire-east']}},required:['station'],additionalProperties:false},execute:({station})=>{if(!state.ready||!state.boardService(station))throw new Error('Dismount first.');return gameSnapshot()}},
    {name:'chase_thief',description:'While driving the police car, pursue a thief and catch them at close range.',inputSchema:{type:'object',properties:{id:{type:'integer',minimum:0,maximum:1}},required:['id'],additionalProperties:false},execute:({id})=>{if(!state.ready||!state.chaseThief(id))throw new Error('Board the police car first.');return gameSnapshot()}},
    {name:'board_train',description:'Walk to the selected station, summon the train if needed, and ride to the next station. Stops run north, west, south, east. Automatically dismount on arrival.',inputSchema:{type:'object',properties:{station:{type:'string',enum:['north','west','south','east']}},additionalProperties:false},execute:({station='north'}={})=>{if(!state.ready||!state.boardTrain(station))throw new Error('Dismount or finish playing first.');return gameSnapshot()}},
    {name:'follow_pet',description:'Befriend a dog or cat in the village. It follows the child on foot and waits while the child rides.',inputSchema:{type:'object',properties:{id:{type:'string',enum:['dog','cat']}},required:['id'],additionalProperties:false},execute:({id})=>{if(!state.ready||!state.followPet(id))throw new Error('Dismount first.');return gameSnapshot()}},
    {name:'get_fire_game_state',description:'Read the current fire, mission, and firetruck position.',inputSchema:empty,annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>gameSnapshot()},
    {name:'start_fire_response',description:'Start driving to the fire. The child must already be riding the truck. Returns when dispatch starts.',inputSchema:empty,execute:()=>{if(!state.ready||state.complete||!state.riding)throw new Error('Board the truck before responding to an active fire.');if(!state.dispatch())throw new Error('Cannot reach fire.');return gameSnapshot()}},
    {name:'move_player',description:'Move the child on foot, or drive the truck when riding. Cancels a pending boarding or fire response.',inputSchema:{type:'object',properties:{x:{type:'number',minimum:WORLD.minX,maximum:WORLD.maxX},z:{type:'number',minimum:WORLD.minZ,maximum:WORLD.maxZ}},required:['x','z'],additionalProperties:false},execute:input=>{if(!input||!Number.isFinite(input.x)||!Number.isFinite(input.z)||!moveTo(input))throw new Error('Choose a reachable clear point in the village.');return gameSnapshot()}},
    {name:'board_firetruck',description:'Summon the truck from the garage. Open the door, drive out, then walk the child to board.',inputSchema:empty,execute:()=>{if(!state.ready||state.riding||!boardTruck())throw new Error('Cannot start boarding.');return gameSnapshot()}},
    {name:'exit_firetruck',description:'Dismount safely and send the unattended truck back inside the garage.',inputSchema:empty,execute:()=>{if(!state.ready||!state.riding||!exitTruck())throw new Error('Cannot exit the truck here.');return gameSnapshot()}},
    {name:'board_policecar',description:'Call the police car out of its garage and walk over to board for a patrol.',inputSchema:empty,execute:()=>{if(!state.ready||!state.boardService('police'))throw new Error('Cannot board police car.');return gameSnapshot()}},
    {name:'board_ambulance',description:'Call the ambulance out of the hospital and board it.',inputSchema:empty,execute:()=>{if(!state.ready||!state.boardService('ambulance'))throw new Error('Cannot board ambulance.');return gameSnapshot()}},
    {name:'get_icecream',description:'Walk to the ice cream van, receive a cone and eat it facing the camera.',inputSchema:empty,execute:()=>{if(!state.ready||!state.getIceCream())throw new Error('Dismount first or finish eating.');return gameSnapshot()}},
    {name:'play_at_park',description:'Walk to a playground activity and play, then return safely to its entrance.',inputSchema:{type:'object',properties:{id:{type:'string',enum:PLAY_ACTIVITIES.map(p=>p.id)}},required:['id'],additionalProperties:false},execute:({id})=>{if(!state.ready||!state.startPlay(id))throw new Error('Finish the current activity or dismount first.');return gameSnapshot()}},
    {name:'go_fishing',description:'Walk to the pond, catch a fish and lift it in celebration.',inputSchema:empty,execute:()=>{if(!state.ready||!state.startFishing())throw new Error('Dismount or finish playing first.');return gameSnapshot()}},
    {name:'board_bus',description:'Walk to a parked bus and board it. Index 0 is red, 1 blue, 2 green.',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:2}},required:['index'],additionalProperties:false},execute:({index})=>{if(!state.ready||!state.boardBus(index))throw new Error('Bus is unavailable.');return gameSnapshot()}},
    {name:'board_dumptruck',description:'Walk to the parked dump truck and board it.',inputSchema:empty,execute:()=>{if(!state.ready||!state.boardDump())throw new Error('Dump truck is unavailable.');return gameSnapshot()}},
    {name:'load_soil',description:'Drive the dump truck to the excavator and load up to three scoops.',inputSchema:empty,execute:()=>{if(!state.ready||!state.loadDump())throw new Error('Board an empty dump truck first.');return gameSnapshot()}},
    {name:'unload_soil',description:'Drive the loaded dump truck to the unloading pad and tip its bed.',inputSchema:empty,execute:()=>{if(!state.ready||!state.unloadDump())throw new Error('Load soil first.');return gameSnapshot()}},
    {name:'exit_vehicle',description:'Dismount and automatically send this vehicle back to its home parking place.',inputSchema:empty,execute:()=>{if(!state.ready||!state.exitTruck())throw new Error('Cannot dismount here.');return gameSnapshot()}},
    {name:'reset_fire_game',description:'Restart on foot with the truck at the station and unlit wood; fire starts after boarding.',inputSchema:empty,execute:()=>{if(!state.ready)throw new Error('Game is loading.');reset();return gameSnapshot()}},
  ];
  for(const tool of tools){try{Promise.resolve(context.registerTool({...tool,annotations:tool.annotations??{readOnlyHint:false,untrustedContentHint:false}},{signal:lifecycle.signal})).catch(()=>{})}catch{}}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
init();
