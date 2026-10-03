import layout from './city-layout.js';

// Fence, scenery and sign hits belong to the enclosure being viewed. A path
// hit retains its actual world position instead of sending everyone to the gate.
export function zooTapTarget(point){
  const habitat=layout.zoo.habitats.find(h=>Math.abs(point.x-h.x)<=h.width/2+1.8&&Math.abs(point.z-h.z)<=h.depth/2+1.8);
  return habitat?{animal:habitat.id}:{x:point.x,z:point.z};
}
