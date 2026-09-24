import assert from 'node:assert/strict';
import {routeGeometry,stops,departures} from '../production/route-math.mjs';
import {shellProgress} from '../production/shell-rules.mjs';
for(const stop of stops){const p=routeGeometry(stop.goal).point;assert.equal(p.x,stop.x);assert.equal(p.y,stop.y);}
const midpoint=routeGeometry(15).point;assert.ok(midpoint.y>stops[1].y&&midpoint.y<stops[2].y);assert.ok(Math.abs(midpoint.y-(departures[0].y+stops[2].y)/2)<2);
assert.deepEqual(routeGeometry(999).point,{x:65,y:235});assert.deepEqual(routeGeometry(-1).point,{x:65,y:27});
const today='2026-09-23',row=kind=>({kind,date:today,createdAt:today,hasImage:true,value:5000,mode:'steps',status:'有疑問'});
for(let n=0;n<=3;n++){const rows=['exercise','meal','medicine'].slice(0,n).map(row);const entry=shellProgress(rows,[],today).entries[0];assert.equal(entry?.taskCount||0,n);assert.equal(entry?.tasks||0,n===3?1:0);}
console.log('PASS: exact waypoint positions, 15-shell interpolation, endpoint clamping, task count 0/1/2/3');

for(let i=1;i<stops.length-1;i++){
 const stop=stops[i],dock=routeGeometry(stop.goal),next=routeGeometry(stop.goal+1);
 assert.equal(dock.docked,true);
 assert.equal(next.docked,false);
 assert.ok(next.point.y>departures[i-1].y);
 assert.ok(departures[i-1].y>stop.y);
}
for(let n=2;n<=200;n++) assert.ok(routeGeometry(n).point.y>routeGeometry(n-1).point.y);
console.log('PASS: arrival docking, departure below each island, monotonic progress');