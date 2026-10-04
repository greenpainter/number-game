import * as THREE from 'three';
import {walkable,findPath} from './navigation.js';
import {groundHeight} from './railway.js';

export async function createFamily(loader,scene,prepare,child,limbs){
  const parents=await Promise.all(['mom','dad'].map(async(id,i)=>{
    const root=prepare((await loader.loadAsync(`./models/${id}.glb`)).scene);root.visible=false;scene.add(root);
    const joints=Object.fromEntries(['Arm_L','Arm_R','Elbow_L','Elbow_R','Leg_L','Leg_R'].map(n=>[n,root.getObjectByName(n)]));
    return {id,side:i===0?-1:1,root,joints,enabled:false,placed:false,path:[],replan:0};
  }));
  const hand=new THREE.Vector3(),target=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);
  function safeSpot(p,state){
    const a=state.child,c=Math.cos(a.angle),s=Math.sin(a.angle),options={radius:.36,vehicles:state.otherVehicles(null)};
    const offsets=[[p.side*1.12,0],[p.side*.6,-1.1],[0,-1.7],[p.side*1.5,-1.4]];
    for(const [x,z] of offsets){const q={x:a.x+x*c+z*s,z:a.z-x*s+z*c};if(walkable(q.x,q.z,options))return q}
    return {x:a.x,z:a.z};
  }
  return {
    toggle(id,state){const p=parents.find(p=>p.id===id);if(!p||state.activityLocked||state.riding)return null;p.enabled=!p.enabled;p.placed=false;p.path=[];if(p.enabled&&state.onScooter)state.toggleScooter();return p.enabled},
    enabled(id){return parents.find(p=>p.id===id)?.enabled??false},
    reset(){for(const p of parents){p.enabled=false;p.placed=false;p.root.visible=false}},
    update(state,time,dt){
      const show=!state.playing&&!state.riding&&!state.metroTrip&&!state.helicopterTrip&&!state.ferryTrip;
      const holding=show&&!state.onScooter&&['idle','moving','bridge'].includes(state.mode);
      for(const p of parents){
        p.root.visible=p.enabled&&show;if(!p.root.visible){p.placed=false;continue}
        const goal=safeSpot(p,state),options={radius:.36,vehicles:state.otherVehicles(null)};
        if(!p.placed){p.root.position.set(goal.x,groundHeight(goal.x,goal.z)+(state.child.height??0),goal.z);p.root.rotation.y=state.child.angle;p.placed=true}
        const distance=Math.hypot(goal.x-p.root.position.x,goal.z-p.root.position.z);
        p.replan-=dt;
        if(distance>1.8&&p.replan<=0){p.path=findPath({x:p.root.position.x,z:p.root.position.z},goal,{...options,gridStep:1})??[];p.replan=.8}
        const destination=p.path.length&&distance>1.8?p.path[0]:goal;
        const dx=destination.x-p.root.position.x,dz=destination.z-p.root.position.z,d=Math.hypot(dx,dz),speed=state.onScooter?8.6:5.5;
        const step=Math.min(d,speed*dt),x=p.root.position.x+(d?dx/d*step:0),z=p.root.position.z+(d?dz/d*step:0);
        if(walkable(x,z,options)){p.root.position.x=x;p.root.position.z=z}
        if(d<.2)p.path.shift();
        p.root.position.y=groundHeight(x,z)+(state.child.height??0);p.root.rotation.y=state.child.angle;
        const walking=state.mode==='moving'||distance>.15,swing=walking?Math.sin(time*10)*.35:0;
        for(const [n,sign] of [['Leg_L',1],['Leg_R',-1],['Arm_L',-1],['Arm_R',1]])p.joints[n].rotation.set(swing*sign,0,0);
        for(const n of ['Elbow_L','Elbow_R'])p.joints[n].rotation.set(0,0,0);
        const childSide=p.side<0?'L':'R',parentSide=p.side<0?'R':'L';
        if(holding&&distance<.28&&Math.hypot(goal.x-state.child.x,goal.z-state.child.z)<1.2){
          const arm=limbs['Arm_'+childSide];arm.rotation.set(0,0,p.side<0?-1.02:1.02);child.updateMatrixWorld(true);
          hand.set(0,-.44,.035);arm.localToWorld(hand);p.root.updateMatrixWorld(true);target.copy(hand);p.root.worldToLocal(target);
          const shoulder=p.joints['Arm_'+parentSide];target.sub(shoulder.position);
          // A soft elbow bend keeps the palm at the child's hand without stretching.
          const reach=target.length(),a=.51,b=.49,clamped=Math.min(a+b-.0001,Math.max(.1,reach));
          const knee=Math.acos(THREE.MathUtils.clamp((clamped*clamped-a*a-b*b)/(2*a*b),-1,1));
          const correction=Math.atan2(b*Math.sin(knee),a+b*Math.cos(knee));
          shoulder.quaternion.setFromUnitVectors(down,target.normalize());shoulder.rotateX(-correction);p.joints['Elbow_'+parentSide].rotation.x=knee;
        }
      }
    }
  };
}
