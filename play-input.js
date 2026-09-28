// One action at contact, rather than testing finger drift on release.
export class PlayInput {
  constructor(onPress){this.onPress=onPress;this.active=null;this.lastPen=-Infinity;this.lastPress=null}
  down(event){
    const type=event.pointerType||'mouse',now=event.timeStamp;
    if(event.button!==0)return false;
    if(type==='touch'&&(now-this.lastPen<600||event.width>45||event.height>45))return false;
    if(this.active&&!(type==='pen'&&this.active.type!=='pen'))return false;
    if(type==='touch'&&event.isPrimary===false)return false;
    const last=this.lastPress;
    if(last&&now>=last.time&&now-last.time<160&&type===last.type&&Math.hypot(event.clientX-last.x,event.clientY-last.y)<4)return false;
    if(type==='pen')this.lastPen=now;
    this.lastPress={time:now,type,x:event.clientX,y:event.clientY};
    this.active={id:event.pointerId,type};
    this.onPress({x:event.clientX,y:event.clientY,type});return true;
  }
  up(event){if(this.active?.id===event.pointerId){if(this.active.type==='pen')this.lastPen=event.timeStamp;this.active=null}}
  cancel(){this.active=null;this.lastPress=null}
}

export function iceCreamZoom(zoom,eating,dt){
  return zoom+((eating?1.38:1)-zoom)*(1-Math.exp(-Math.max(0,dt)*3.8));
}
