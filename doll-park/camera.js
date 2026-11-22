import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp;
const homeAngle=.29, homeTilt=.49;
export class ParkCamera {
  constructor(canvas){
    this.canvas=canvas;
    this.camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,120);
    this.target=new THREE.Vector3();
    this.desired=new THREE.Vector3();
    this.angle=homeAngle;
    this.tilt=homeTilt;
    this.zoom=1;
    this.span=13;
    this.resize();
    this.overview();
    this.update(1);
  }
  resize(){
    const wasPortrait=this.aspect<.85;
    this.width=this.canvas.clientWidth||innerWidth;
    this.height=this.canvas.clientHeight||innerHeight;
    this.aspect=this.width/this.height;
    if(wasPortrait!==(this.aspect<.85)&&!this.focused)this.overview();
  }
  overview(){
    this.focused=null;
    this.angle=this.aspect<.85?.45:homeAngle;
    this.tilt=this.aspect<.85?.68:homeTilt;
    this.zoom=1;
    this.desired.set(0,.58,.18);
  }
  focus(event){
    if(!event?.rideId){this.overview();return;}
    this.focused=event.rideId;
    this.zoom=1;
    const centers={
      swing:[-4.6,1.1,-1.5],slide:[1.5,1.2,-3],trampoline:[4.8,1.25,2],carousel:[-3,1.25,3.8]
    };
    this.desired.fromArray(centers[event.rideId]||[0,1,0]);
    this.angle=({swing:.28, slide:.59, trampoline:.23,carousel:.35})[event.rideId]??homeAngle;
    this.tilt=.34;
  }
  orbit(dx,dy){
    this.angle-=dx*.0052;
    this.tilt=clamp(this.tilt+dy*.003,.23,1.03);
  }
  magnify(ratio){this.zoom=clamp(this.zoom*ratio,.68,2.05);}
  update(dt){
    const {aspect:a,camera:c}=this;
    const blend=1-Math.exp(-dt*5.3);
    const overviewSpan=Math.max(9.4,(a<.85?12.6:17.5)/a);
    const rideSpan=Math.max(this.focused==='slide'?6.7:5.45,(this.focused==='slide'?6.8:5.65)/a);
    const next=(this.focused?rideSpan:overviewSpan)/this.zoom;
    this.span=THREE.MathUtils.lerp(this.span,next,blend);
    this.target.lerp(this.desired,blend);
    const H=this.span/2,W=H*a;
    // Reserve a little more sky on top than ground below; on phones let
    // the scene use the space above the bottom play controls.
    const offset=this.focused&&a<1?-.12*H:a<.85?-.03*H:0;
    c.left=-W;c.right=W;c.top=H+offset;c.bottom=-H+offset;
    c.position.set(Math.sin(this.angle)*Math.cos(this.tilt),Math.sin(this.tilt),Math.cos(this.angle)*Math.cos(this.tilt)).multiplyScalar(31).add(this.target);
    c.lookAt(this.target);c.updateProjectionMatrix();c.updateMatrixWorld();
  }
}
