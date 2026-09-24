// Arrival docks and departure points leave a gap across every island.
export const stops=[{goal:0,x:65,y:27},{goal:1,x:65,y:27},{goal:30,x:32,y:58},{goal:50,x:65,y:111},{goal:100,x:32,y:164},{goal:200,x:65,y:235}];
export const departures=[{x:65,y:32},{x:32,y:89},{x:65,y:142},{x:32,y:203}];
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function routeGeometry(total){
 const paths=departures.map((start,i)=>{const a={...start,goal:stops[i+1].goal},b=stops[i+2],c={x:a.x,y:(a.y+b.y)/2},d={x:b.x,y:(a.y+b.y)/2};const t=Math.max(0,Math.min(1,(total-a.goal)/(b.goal-a.goal)));const ac=mix(a,c,t),cd=mix(c,d,t),db=mix(d,b,t),left=mix(ac,cd,t),right=mix(cd,db,t),point=mix(left,right,t);return{t,point,full:`M${a.x},${a.y} C${c.x},${c.y} ${d.x},${d.y} ${b.x},${b.y}`,lit:`M${a.x},${a.y} C${ac.x},${ac.y} ${left.x},${left.y} ${point.x},${point.y}`};});
 const dock=total<=1?stops[1]:total>=200?stops.at(-1):stops.find(s=>s.goal===total);
 const current=paths.find(p=>p.t<1)||paths.at(-1);
 return{paths,point:dock?{x:dock.x,y:dock.y}:current.point,docked:total>=1&&Boolean(dock)};
}
