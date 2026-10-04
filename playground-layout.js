// Local coordinates are shared by the Blender assets and the play animations.
export const PARK={x:362,z:-3,width:48,depth:66,entry:{x:339,z:20}};
export const PARK_TREES=[[341,-34],[354,-34],[370,-34],[384,-34],[384,-17],[384,0],[340,0],[340,14],[303,-25],[297,-10],[303,5],[300,20]];
export const PLAY_ACTIVITIES=[
  {id:'slide',name:'미끄럼틀',icon:'🛝',x:348,z:-24,duration:8,width:5,depth:8,line:'계단을 올라가서 미끄럼틀을 슝 타요!'},
  {id:'swing',name:'그네',icon:'🌈',x:362,z:-24,duration:10,width:6,depth:7,line:'그네를 타고 앞뒤로 살랑살랑!'},
  {id:'seesaw',name:'시소',icon:'⚖️',x:376,z:-24,duration:9,width:7,depth:5,line:'친구와 시소를 타요. 올라갔다 내려갔다!'},
  {id:'carousel',name:'회전목마',icon:'🎠',x:348,z:-8,duration:12,width:9,depth:9,line:'회전목마를 타고 빙글빙글 돌아요!'},
  {id:'trampoline',name:'트램펄린',icon:'🤸',x:362,z:-8,duration:9,width:7,depth:7,line:'트램펄린에서 폴짝폴짝 뛰어요!'},
  {id:'bubbles',name:'비눗방울',icon:'🫧',x:376,z:-8,duration:8,width:5,depth:5,line:'후우! 무지개 비눗방울을 불어요!'},
  {id:'zipline',name:'짚라인',icon:'🪁',x:348,z:8,duration:9,width:5,depth:13,line:'손잡이를 꼭 잡고 짚라인을 슝 타요!'},
  {id:'garden',name:'꽃 물주기',icon:'🌷',x:362,z:8,duration:8,width:6,depth:5,line:'꽃에 물을 줘요. 예쁜 꽃이 활짝 피어요!'},
  {id:'balloon',name:'열기구',icon:'🎈',x:376,z:8,duration:16,width:7,depth:7,line:'열기구를 타고 하늘로 둥실 올라가요!'},
  {id:'pedalcar',name:'페달카',icon:'🏎️',x:362,z:24,duration:14,width:30,depth:11,line:'페달카를 타고 전용 길을 한 바퀴 달려요!'},
].map(p=>({...p,entry:{x:p.x,z:p.z+(p.id==='slide'?-1:1)*(p.depth/2+1.4)}}));
export const PLAY_LINES=[...PLAY_ACTIVITIES.map(p=>p.line),'놀이공원으로 놀러 가요!','놀이가 끝났어요. 또 놀아 볼까요?','먼저 차에서 내린 뒤 놀아요.'];
export const PLAY_OBSTACLES=PLAY_ACTIVITIES.map(p=>[p.x-p.width/2,p.x+p.width/2,p.z-p.depth/2,p.z+p.depth/2]);
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
export function playPose(id,time){
  const p=PLAY_ACTIVITIES.find(p=>p.id===id),t=Math.max(0,Math.min(1,time/p.duration));
  const fade=Math.sin(Math.PI*t),phase=time*2.2;
  let x=0,z=0,height=0,angle=0,seated=false,arm=0,tilt=0;
  switch(id){
    case 'slide':
      if(t<.48){const u=t/.48;z=lerp(-3,0,u);height=2.8*u;arm=-.7}
      else {const u=smooth((t-.48)/.52);z=3.2*u;height=2.8*(1-u);seated=true}break;
    case 'swing': {const a=Math.sin(phase)*.48*fade;z=2.9*Math.sin(a);height=.16+2.9*(1-Math.cos(a));tilt=a;seated=true;arm=-1.1;break}
    case 'seesaw':tilt=Math.sin(phase)*.23*fade;x=-2.3*Math.cos(tilt);height=.47-2.3*Math.sin(tilt);angle=Math.PI/2;seated=true;arm=-1;break;
    case 'carousel':angle=t*Math.PI*4;x=Math.sin(angle)*2.3;z=Math.cos(angle)*2.3;height=.9;seated=true;arm=-1.1;break;
    case 'trampoline':height=.55+Math.abs(Math.sin(time*3.2))*2*fade;arm=-.5-Math.abs(Math.sin(time*3.2));break;
    case 'zipline':z=-4.6+9.2*(.5-.5*Math.cos(t*Math.PI*2));height=.5+.25*Math.sin(t*Math.PI);seated=true;arm=-2.8;break;
    case 'balloon':height=.35+13*Math.sin(Math.PI*t)**2;arm=-.8;break;
    case 'pedalcar':angle=t*Math.PI*2;x=12*Math.sin(angle);z=4*Math.cos(angle);height=-.12;angle=Math.atan2(12*Math.cos(angle),-4*Math.sin(angle));seated=true;arm=-1.2;break;
    case 'bubbles':z=1.6;angle=Math.PI;arm=-1.5;break;
    case 'garden':z=2;angle=Math.PI;arm=-1.3;break;
  }
  return {x:p.x+x,z:p.z+z,height,angle,seated,arm,tilt,t};
}
