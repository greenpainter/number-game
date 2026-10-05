import test from 'node:test';
import assert from 'node:assert/strict';
import {MapViewport,attachMapViewport} from '../map-viewport.js';
import {arrangeMapPins,nearestMapPin} from '../map-pins.js';

function touchMap(){
  const listeners=new Map(),buttons=[{},{},{}],taps=[],pressed=[],pin={index:0};
  const svg={classList:{toggle(){}},setAttribute(){},getBoundingClientRect:()=>({width:900,height:520}),getScreenCTM:()=>({inverse:()=>null}),setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){},addEventListener(n,f){listeners.set(n,f)},createSVGPoint(){return {x:0,y:0,matrixTransform(){return this}}}};
  const controls=attachMapViewport(svg,{querySelectorAll:()=>buttons,querySelector:()=>({})},{findTarget:(x,y)=>Math.hypot(x-100,y-100)<26?pin:null,onTap:p=>taps.push(p.index),onPress:p=>pressed.push(p)});
  const emit=(type,x=100,y=100,id=1,extra={})=>{const e={pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,detail:1,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...extra};listeners.get(type)(e);return e};
  return {emit,taps,pressed,controls};
}
test('a slipping touch selects the initial picture once, including a release outside its hit area',()=>{
  const {emit,taps,pressed}=touchMap();emit('pointerdown',120);assert(pressed.at(-1));emit('pointermove',140);emit('pointerup',140);
  assert.deepEqual(taps,[0]);assert.equal(pressed.at(-1),null);assert(emit('click',140).stopped);
  assert(!emit('click',140,100,1,{detail:0}).stopped);
});
test('drag, cancellation and pinch never travel; a fresh tap after a drag works immediately',()=>{
  for(const cancel of ['pointercancel','lostpointercapture']){const m=touchMap();m.emit('pointerdown');m.emit(cancel);m.emit('pointerup');assert.deepEqual(m.taps,[])}
  const m=touchMap();m.emit('pointerdown');m.emit('pointermove',145);m.emit('pointermove',100);m.emit('pointerup');assert.deepEqual(m.taps,[]);
  m.emit('pointerdown');m.emit('pointerdown',150,100,2);m.emit('pointerup',150,100,2);m.emit('pointerup');assert.deepEqual(m.taps,[]);
  m.emit('pointerdown');m.emit('pointerup',110);assert.deepEqual(m.taps,[0]);
  m.emit('pointerdown');m.emit('pointerup',150);assert.deepEqual(m.taps,[0]);
  m.emit('pointerdown',200);m.emit('pointerup',110);assert.deepEqual(m.taps,[0]);
});
test('clustered map pictures receive separated finger targets and nearest-point hit testing',()=>{
  const pins=arrangeMapPins(Array.from({length:12},(_,i)=>({index:i,x:220+i%3*10,y:150+i%4*10})),{left:0,top:0,right:500,bottom:350});
  for(const p of pins){assert.equal(nearestMapPin(pins,p.x+15,p.y)?.index,p.index);for(const q of pins)if(p!==q)assert(Math.hypot(p.x-q.x,p.y-q.y)>=50)}
  assert.equal(nearestMapPin(pins,499,349),null);
});
test('map zoom preserves its anchor, clamps panning, and resets to the whole city',()=>{
  const v=new MapViewport();v.scale(2,{x:250,y:120});assert.equal(v.x,125);assert.equal(v.y,60);
  assert.equal((250-v.x)/v.width,250/900);v.pan(9999,9999);assert.equal(v.x,450);assert.equal(v.y,260);
  v.scale(100);assert.equal(v.zoom,4);v.pan(-9999,-9999);assert.equal(v.x,0);assert.equal(v.y,0);
  v.scale(.01);assert.equal(v.viewBox,'0 0 900 520');v.scale(3);v.reset();assert.equal(v.zoom,1);
});
test('wheel and pinch zoom, drag pans, and a completed drag cannot activate a place',()=>{
  const listeners=new Map(),buttons=[{},{},{}],output={},svg={box:'0 0 900 520',classList:{toggle(){}},setAttribute(_,v){this.box=v},getBoundingClientRect:()=>({width:900,height:520}),getScreenCTM:()=>({inverse:()=>null}),setPointerCapture(){},hasPointerCapture:()=>true,addEventListener(n,f){listeners.set(n,f)},createSVGPoint(){return {x:0,y:0,matrixTransform(){const [x,y,w,h]=svg.box.split(' ').map(Number);return {x:x+this.x*w/900,y:y+this.y*h/520}}}}};
  const controls=attachMapViewport(svg,{querySelectorAll:()=>buttons,querySelector:()=>output});
  const emit=(type,id,x,y,extra={})=>{const e={pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...extra};listeners.get(type)(e);return e};
  emit('wheel',0,450,260,{deltaY:-350});assert(Number.parseInt(output.textContent)>190);
  controls.reset();emit('pointerdown',1,350,260);emit('pointerdown',2,550,260);emit('pointermove',1,250,260);emit('pointermove',2,650,260);assert.equal(output.textContent,'200%');
  emit('pointerup',1,250,260);emit('pointerup',2,650,260);assert(emit('click',0,650,260).stopped);
  controls.reset();buttons[1].onclick();const before=svg.box;emit('pointerdown',3,450,260);emit('pointermove',3,550,260);emit('pointerup',3,550,260);assert.notEqual(svg.box,before);assert(emit('click',0,550,260).stopped);
  controls.reset();assert(!emit('click',0,450,260).stopped);assert.equal(svg.box,'0 0 900 520');
});
