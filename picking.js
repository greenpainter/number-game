import {Box3,BufferGeometry,Matrix4,Mesh,Ray,Uint32BufferAttribute,Vector3} from './vendor/three.module.js';

// Rendering keeps the original model. Picking uses a cached hierarchy over its
// triangles, then delegates exact hits (UVs, sidedness, near/far) to Three.js.
const trees=new WeakMap(),nativeRaycast=Mesh.prototype.raycast;
const inverse=new Matrix4(),localRay=new Ray();
const LEAF_SIZE=128;

function build(geometry){
  const position=geometry.attributes.position,index=geometry.index;
  const vertex=i=>index?index.getX(i):i;
  const triangles=[];
  for(let i=0;i<(index?.count??position.count);i+=3){
    const bounds=new Box3();
    for(let k=0;k<3;k++)bounds.expandByPoint(new Vector3().fromBufferAttribute(position,vertex(i+k)));
    triangles.push({id:i/3,bounds,center:bounds.getCenter(new Vector3())});
  }
  function split(items){
    const bounds=new Box3();for(const t of items)bounds.union(t.bounds);
    if(items.length<=LEAF_SIZE){
      const leaf=new BufferGeometry();
      for(const [name,attribute] of Object.entries(geometry.attributes))leaf.setAttribute(name,attribute);
      leaf.setIndex(new Uint32BufferAttribute(items.flatMap(t=>[vertex(t.id*3),vertex(t.id*3+1),vertex(t.id*3+2)]),1));
      leaf.boundingBox=bounds;leaf.computeBoundingSphere();
      return {bounds,mesh:new Mesh(leaf,null),faces:items.map(t=>t.id)};
    }
    const size=bounds.getSize(new Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
    items.sort((a,b)=>a.center[axis]-b.center[axis]);
    const middle=items.length>>1;
    return {bounds,left:split(items.slice(0,middle)),right:split(items.slice(middle))};
  }
  return split(triangles);
}

export function acceleratePicking(mesh){
  const geometry=mesh.geometry;
  if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh||Array.isArray(mesh.material)||Object.keys(geometry.morphAttributes).length)return;
  geometry.computeBoundingBox();
  if((geometry.index?.count??geometry.attributes.position.count)<1536)return;
  let tree=trees.get(geometry);
  if(!tree){tree=build(geometry);trees.set(geometry,tree)}
  mesh.raycast=function(raycaster,hits){
    // Deforming meshes and custom draw ranges retain Three.js's normal path.
    if(this.geometry!==geometry||Array.isArray(this.material)||geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity){
      nativeRaycast.call(this,raycaster,hits);return;
    }
    inverse.copy(this.matrixWorld).invert();localRay.copy(raycaster.ray).applyMatrix4(inverse);
    const stack=[tree];
    while(stack.length){
      const node=stack.pop();if(!localRay.intersectsBox(node.bounds))continue;
      if(node.mesh){
        node.mesh.material=this.material;node.mesh.matrixWorld.copy(this.matrixWorld);
        const begin=hits.length;nativeRaycast.call(node.mesh,raycaster,hits);
        for(let i=begin;i<hits.length;i++){hits[i].object=this;hits[i].faceIndex=node.faces[hits[i].faceIndex]}
      }else{stack.push(node.right,node.left)}
    }
  };
}
