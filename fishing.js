import * as THREE from 'three';

export function createFishing(scene,child,limbs){
  const wood=new THREE.MeshStandardMaterial({color:0xc89a61,roughness:.85}),gold=new THREE.MeshStandardMaterial({color:0xffce61,roughness:.6});
  const dock=new THREE.Group();scene.add(dock);
  for(let i=0;i<7;i++){
    const plank=new THREE.Mesh(new THREE.BoxGeometry(2.2,.13,.23),wood);plank.position.set(12,.22,-11.1+i*.25);plank.castShadow=true;plank.receiveShadow=true;dock.add(plank);
  }
  for(const x of [11.05,12.95]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.55,8),wood);post.position.set(x,.2,-9.5);dock.add(post)}
  const makeFish=()=>{
    const fish=new THREE.Group();
    const orange=new THREE.MeshStandardMaterial({color:0xff993f,roughness:.65});
    const finMaterial=new THREE.MeshStandardMaterial({color:0xf06c32,roughness:.75});
    const cream=new THREE.MeshStandardMaterial({color:0xffe9aa,roughness:.8});
    const white=new THREE.MeshStandardMaterial({color:0xfffff2,roughness:.65});
    const ink=new THREE.MeshBasicMaterial({color:0x253e4b});
    const oval=(x,y,z,sx,sy,sz,material)=>{
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),material);
      mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);fish.add(mesh);return mesh;
    };
    const fin=(points,z=0)=>{
      const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
      const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.015,bevelThickness:.012}),finMaterial);
      mesh.position.z=z-.0225;fish.add(mesh);return mesh;
    };
    // Broad forked tail and tall dorsal fin give a clear fish silhouette.
    const tail=fin([[-.4,.07],[-.83,.32],[-.77,.08],[-.71,0],[-.77,-.08],[-.83,-.32],[-.4,-.07]]);
    fin([[-.24,.18],[-.2,.38],[-.06,.43],[.12,.22]]);
    fin([[-.12,-.18],[-.04,-.34],[.14,-.19]]);
    oval(0,0,0,.47,.255,.17,orange);
    oval(.03,-.118,.008,.35,.14,.152,cream);
    for(const side of [-1,1]){
      fin([[-.03,-.015],[-.23,-.16],[-.17,.035]],side*.157);
      oval(.265,.078,side*.143,.095,.102,.044,white);
      oval(.294,.08,side*.181,.048,.059,.017,ink);
      oval(.304,.107,side*.197,.016,.02,.006,white);
      const gill=new THREE.QuadraticBezierCurve3(new THREE.Vector3(.13,.08,side*.168),new THREE.Vector3(.055,0,side*.184),new THREE.Vector3(.13,-.08,side*.164));
      fish.add(new THREE.Mesh(new THREE.TubeGeometry(gill,10,.009,5,false),finMaterial));
    }
    // Small puckered lips, instead of a featureless rounded nose.
    const mouth=new THREE.Mesh(new THREE.TorusGeometry(.045,.015,6,12),finMaterial);mouth.rotation.y=Math.PI/2;mouth.position.set(.46,-.025,0);fish.add(mouth);
    fish.userData.tail=tail;
    return fish;
  };
  const sign=makeFish();sign.position.set(13.08,.8,-10.5);sign.rotation.y=Math.PI/4;sign.scale.setScalar(.65);dock.add(sign);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.8,8),wood);post.position.set(13.08,.4,-10.5);dock.add(post);
  const held=makeFish();child.add(held);held.visible=false;
  const shoulders=Object.fromEntries(['Arm_L','Arm_R'].filter(name=>limbs[name]).map(name=>[name,limbs[name].position.y]));
  const rod=new THREE.Group();scene.add(rod);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,2.2,8),wood);pole.rotation.x=.8;pole.position.set(12.3,1.55,-10.45);rod.add(pole);
  const thread=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(12.3,2.32,-9.67),new THREE.Vector3(12.3,.3,-7.7)]),new THREE.LineBasicMaterial({color:0xf5fff9}));rod.add(thread);
  const bobber=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),gold);bobber.position.set(12.3,.3,-7.7);rod.add(bobber);
  const swimming=[];
  for(let i=0;i<3;i++){const fish=makeFish();fish.scale.setScalar(.4);fish.position.set(11.5+i*.5,.24,-5.1-i*.9);scene.add(fish);swimming.push(fish)}
  return {dock,update(state,time){
    rod.visible=state.mode==='fishing';held.visible=state.mode==='fish-celebrate';
    for(const [name,y] of Object.entries(shoulders)){limbs[name].position.y=y+(held.visible ? .28 : 0);limbs[name].scale.y=held.visible?2:1}
    bobber.position.y=.29+Math.sin(time*5)*.045;
    swimming.forEach((fish,i)=>{fish.position.x=12+Math.sin(time*.45+i*2)*.8;fish.rotation.y=Math.cos(time*.45+i*2)>0?0:Math.PI;fish.userData.tail.rotation.y=Math.sin(time*7+i)*.16});
    if(state.mode==='fishing'){if(limbs.Arm_R)limbs.Arm_R.rotation.x=-.8;if(limbs.Arm_L)limbs.Arm_L.rotation.x=-.5}
    if(held.visible){
      held.position.set(.06,2.45+Math.sin(time*9)*.018,.25);
      // Show its side to the quarter-view camera and keep it above the hat.
      held.rotation.set(-.6,0,Math.sin(time*5)*.045);held.userData.tail.rotation.y=Math.sin(time*8)*.13;
      for(const name of ['Arm_L','Arm_R'])if(limbs[name])limbs[name].rotation.x=-2.65;
      child.position.y+=Math.abs(Math.sin(state.fishTime*5.5))*.16;
    }
  }};
}
