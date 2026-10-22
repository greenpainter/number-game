import {TAXI_CUSTOMERS,TAXI_DESTINATIONS,TAXI_LINES} from './taxi-layout.js';
import {walkable} from './navigation.js';
export const TAXI_RESPAWN_SECONDS=15;
export const taxiActions={
  resetTaxi(){this.taxi={phase:'idle',customer:null,time:0,delivered:0,customers:TAXI_CUSTOMERS.map((p,id)=>({...p,id,phase:'waiting',time:0,trips:0}))}},
  pickupTaxiCustomer(id){
    const t=this.taxi,p=t.customers[id];if(!p||p.phase!=='waiting')return false;
    if(!this.riding||this.vehicle!=='taxi'){this.cityNotice(TAXI_LINES[0]);return false}
    if(t.phase==='approach'&&t.customer===id)return true;
    if(this.activityLocked)return false;
    if(!this.moveTo(p.stop))return false;
    Object.assign(t,{phase:'approach',customer:id,time:0});this.cityNotice(TAXI_LINES[2]);return true;
  },
  updateTaxi(dt){
    const t=this.taxi;
    for(const p of t.customers)if(p.phase==='delivered'){
      p.time+=dt;
      if(p.time>=TAXI_RESPAWN_SECONDS){p.phase='waiting';p.time=0;delete p.drop}
    }
    if(t.phase==='idle')return;
    const p=t.customers[t.customer];t.time+=dt;
    if(t.phase==='approach'&&(!this.riding||this.vehicle!=='taxi')){t.phase='idle';return}
    if(t.phase==='approach'&&this.mode==='idle'&&Math.hypot(this.actor.x-p.stop.x,this.actor.z-p.stop.z)<.6){
      t.phase='boarding';t.time=0;p.phase='boarding';this.mode='taxi-boarding';this.cityNotice(TAXI_LINES[3]);
    }else if(t.phase==='boarding'&&t.time>=2.2){
      t.destination={...TAXI_DESTINATIONS[(p.destination+p.trips)%TAXI_DESTINATIONS.length]};
      p.phase='aboard';t.phase='transporting';t.time=0;this.path=[];this.target=null;this.mode='idle';this.cityNotice(TAXI_LINES[4]);
    }else if(t.phase==='transporting'&&Math.hypot(this.actor.x-t.destination.x,this.actor.z-t.destination.z)<2.5){
      const car=this.actor,options={radius:.32,vehicles:this.otherVehicles('taxi')};
      const candidates=[1,-1].map(side=>({x:car.x+Math.cos(car.angle)*2.4*side,z:car.z-Math.sin(car.angle)*2.4*side,angle:car.angle+side*Math.PI/2}));
      p.drop=candidates.find(spot=>Array.from({length:9},(_,i)=>i/8).every(k=>walkable(car.x+(spot.x-car.x)*k,car.z+(spot.z-car.z)*k,options)));
      if(!p.drop)return;
      t.phase='unloading';t.time=0;p.phase='unloading';this.path=[];this.target=null;this.mode='taxi-unloading';this.changed('taxi-unloading');
    }else if(t.phase==='unloading'&&t.time>=2.2){
      p.phase='delivered';p.time=0;p.trips++;t.phase='idle';t.delivered++;this.mode='idle';this.cityNotice(TAXI_LINES[5]);this.changed('taxi-delivered');
    }
  },
};
