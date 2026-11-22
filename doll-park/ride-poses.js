import { Euler, Quaternion, Vector3 } from 'three';

const RAD = Math.PI / 180;
const identity = new Quaternion();
const turn = new Quaternion();
const euler = new Euler(0, 0, 0, 'YXZ');
const hipVector = new Vector3();

// The source rig's arms have rolled local axes. Store their bind bases once,
// so a "forward" bend means the same thing on either side of the character.
export function preparePose(avatar) {
  const bones = avatar.bones;
  const axes = {};
  function restWorld(bone) {
    if (!bone?.isBone) return identity;
    const original = avatar.restPose?.[bone.name]?.quaternion || bone.quaternion;
    return restWorld(bone.parent).clone().multiply(original);
  }
  for (const [name, bone] of Object.entries(bones)) {
    const basis = restWorld(bone.parent);
    axes[name] = {
      bone, basis: basis.clone(), inverse: basis.clone().invert(),
      rotation: (avatar.restPose?.[name]?.quaternion || bone.quaternion).clone(),
      position: (avatar.restPose?.[name]?.position || bone.position).clone()
    };
  }
  avatar.poseAxes = axes;
  avatar.root.updateMatrixWorld(true);
  avatar.swingGrips = {};
  for (const [side,sign] of [['L',1],['R',-1]]) {
    const upper = bones['UpperArm.'+side], lower = bones['Forearm.'+side], hand = bones['Hand.'+side];
    if(!upper || !lower || !hand) continue;
    const relative = b=>avatar.root.worldToLocal(b.getWorldPosition(new Vector3()));
    const shoulder=relative(upper), elbow=relative(lower), wrist=relative(hand);
    const upperVector=elbow.clone().sub(shoulder), lowerVector=wrist.clone().sub(elbow);
    // Seat contact is at root y=.394. Ropes taper to ±.36 in the ride rig.
    const reach=new Vector3(sign*.356,.85,.112).sub(shoulder);
    const distance=Math.min(reach.length(),upperVector.length()+lowerVector.length()-.001);
    const forward=reach.normalize(), guide=new Vector3(sign*.20,-1,.30);
    guide.addScaledVector(forward,-guide.dot(forward)).normalize();
    const along=(upperVector.lengthSq()-lowerVector.lengthSq()+distance*distance)/(2*distance);
    const targetElbow=forward.clone().multiplyScalar(along)
      .addScaledVector(guide,Math.sqrt(Math.max(0,upperVector.lengthSq()-along*along)));
    const q1=new Quaternion().setFromUnitVectors(upperVector.normalize(),targetElbow.clone().normalize());
    const targetLower=forward.multiplyScalar(distance).sub(targetElbow).normalize().applyQuaternion(q1.clone().invert());
    const q2=new Quaternion().setFromUnitVectors(lowerVector.normalize(),targetLower);
    for(const [name,q] of [['UpperArm.'+side,q1],['Forearm.'+side,q2]]){
      const axis=axes[name];
      avatar.swingGrips[name]=axis.inverse.clone().multiply(q).multiply(axis.basis).multiply(axis.rotation);
    }
  }
}

function rotate(avatar, name, x=0, y=0, z=0) {
  const axis = avatar.poseAxes[name];
  if (!axis) return;
  turn.setFromEuler(euler.set(x*RAD,y*RAD,z*RAD));
  axis.bone.quaternion.copy(axis.inverse).multiply(turn).multiply(axis.basis).multiply(axis.rotation);
}

export function resetPose(avatar) {
  for (const item of Object.values(avatar.poseAxes)) {
    item.bone.quaternion.copy(item.rotation);
    item.bone.position.copy(item.position);
  }
}

export function locomotion(actor, name) {
  const a = actor.avatar;
  if (actor.motion !== name) {
    if (actor.motion === 'ride') resetPose(a);
    a.play(name, actor.motion === 'ride' ? 0 : .17);
    actor.motion = name;
  }
}

function rigForRide(actor) {
  if (actor.motion === 'ride') return;
  actor.avatar.mixer.stopAllAction();
  resetPose(actor.avatar);
  actor.motion = 'ride';
}

function sit(a, thigh, shin, splay=0) {
  for (const [side, direction] of [['L',1],['R',-1]]) {
    rotate(a,'Thigh.'+side,-thigh,0,splay*direction);
    rotate(a,'Shin.'+side,shin);
    rotate(a,'Foot.'+side,Math.max(-18,Math.min(18,thigh-shin)));
  }
}

function place(actor, anchor, seated, pitch=0) {
  const root = actor.avatar.root;
  root.rotation.set(pitch*RAD,anchor.yaw || 0,0,'YXZ');
  root.position.copy(anchor.position);
  if (seated) {
    // The playable rig is normalised to 1.36 units. Rotate about the saddle
    // instead of about the soles so the hips stay on it throughout the arc.
    hipVector.set(0,.394,0).applyQuaternion(root.quaternion);
    root.position.sub(hipVector);
  }
}

export function swingPose(actor, anchor, angle, velocity, time) {
  rigForRide(actor);
  const a = actor.avatar;
  place(actor,anchor,true,(anchor.tilt ?? -angle)/RAD);
  sit(a,78+velocity*13,58-velocity*24);
  const breath = 1.5*Math.sin(time*2.6);
  rotate(a,'Spine',0);
  rotate(a,'Head',3+breath,-3*Math.sin(time));
  for(const [name,orientation] of Object.entries(a.swingGrips)){
    a.poseAxes[name].bone.quaternion.copy(orientation);
  }
}

export function slidePose(actor, anchor, progress, cheering) {
  rigForRide(actor);
  const a = actor.avatar;
  place(actor,anchor,true,0);
  sit(a,78,15,3);
  rotate(a,'Spine',-9-Math.sin(progress*Math.PI)*7);
  rotate(a,'Head',4,Math.sin(progress*Math.PI)*4);
  for (const [side, sign] of [['L',1],['R',-1]]) {
    rotate(a,'UpperArm.'+side,cheering ? -19 : -26,sign*6,sign*(cheering ? 110 : 12));
    rotate(a,'Forearm.'+side,cheering ? -18 : -5,0,sign*3);
  }
}

export function jumpPose(actor, anchor, arc, crouch, time) {
  rigForRide(actor);
  const a = actor.avatar;
  place(actor,anchor,false);
  rotate(a,'Spine',crouch*17-arc*6);
  rotate(a,'Head',-crouch*7-arc*3,2*Math.sin(time*3));
  sit(a,crouch*48+arc*13,crouch*90+arc*33,arc*5);
  // Restore ankle pitch to keep the soles flat during compression.
  rotate(a,'Foot.L',-42*crouch-13*arc);
  rotate(a,'Foot.R',-42*crouch-13*arc);
  a.root.position.y -= .115*crouch;
  for (const [side, sign] of [['L',1],['R',-1]]) {
    rotate(a,'UpperArm.'+side,-crouch*13-arc*12,0,sign*(arc*117+crouch*7));
    rotate(a,'Forearm.'+side,-arc*17-crouch*28);
  }
}

export function carouselPose(actor, anchor, speed, time) {
  rigForRide(actor);
  const a = actor.avatar;
  place(actor,anchor,true);
  sit(a,62,71,15);
  rotate(a,'Spine',7,3*Math.sin(time));
  rotate(a,'Head',-4,-10+5*Math.sin(time*1.4));
  rotate(a,'UpperArm.L',-53,-7,-9);
  rotate(a,'Forearm.L',-35);
  const wave = Math.min(speed,1.3)/1.3;
  rotate(a,'UpperArm.R',-47+wave*29,0,-(8+86*wave));
  rotate(a,'Forearm.R',-35-17*wave,0,-wave*12*Math.sin(time*7));
}
