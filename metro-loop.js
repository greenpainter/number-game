import layout from './waterfront-layout.js';
export const METRO_LOOP=['central','airport','riverside','zoo'];
export const METRO_ICONS={central:'🏡',airport:'✈️',riverside:'🌳',zoo:'🦒'};
export function nextMetroStation(id){const i=METRO_LOOP.indexOf(id);return i<0?null:METRO_LOOP[(i+1)%METRO_LOOP.length]}
export function metroStopsBetween(from,to){
  if(!METRO_LOOP.includes(from)||!METRO_LOOP.includes(to)||from===to)return [];
  const stops=[from];while(stops.at(-1)!==to)stops.push(nextMetroStation(stops.at(-1)));return stops;
}
export function nearestMetroStation(actor){return [...layout.stations].sort((a,b)=>Math.hypot(a.x-actor.x,a.z-actor.z)-Math.hypot(b.x-actor.x,b.z-actor.z))[0]}
