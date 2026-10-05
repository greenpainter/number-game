import {findPath} from './navigation.js';

// Guidance never assigns the actor's movement path. Replan only after meaningful travel.
export class DeliveryGuide{
  constructor(){this.destination=null;this.points=[];this.revision=0;this.elapsed=0;this.from=null}
  update(state,dt){
    const destination=state.deliveryDestination;
    if(!destination){if(this.destination){this.destination=null;this.points=[];this.from=null;this.revision++}return}
    this.elapsed+=dt;
    const changed=this.destination?.name!==destination.name;
    const moved=!this.from||Math.hypot(state.actor.x-this.from.x,state.actor.z-this.from.z)>2;
    if(!changed&&!(this.elapsed>=.75&&(moved||!this.points.length)))return;
    this.destination=destination;this.elapsed=0;this.from={x:state.actor.x,z:state.actor.z};
    const route=findPath(this.from,destination,state.options);
    this.points=route?[this.from,...route]:[];this.revision++;
  }
}
