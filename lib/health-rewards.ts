import {shellProgress} from '../production/shell-rules.mjs';

export const prizes = [
  {id:'gift30',goal:30,island:'椰風花園島',name:'精美小禮物',value:0},
  {id:'body50',goal:50,island:'珊瑚琉璃島',name:'免費體脂測量（前測）',value:400},
  {id:'nutrition80',goal:80,island:'翡翠瀑布島',name:'免費營養諮詢',value:200},
  {id:'body200',goal:200,island:'極光秘境島',name:'免費體脂測量（後測）',value:400},
] as const;
export type Measurement={date:string;height:number;weight:number;createdAt:string};
export type Appointment={id:string;date:string;createdAt:string;cancelledAt?:string};
export type Redemption={id:string;prizeId:string;goal:number;createdAt:string;collectedAt?:string};
export type HealthRewards={measurements:Measurement[];appointments:Appointment[];redemptions:Redemption[]};
export function healthState(p:{healthRewards?:HealthRewards}):HealthRewards {
  return p.healthRewards||{measurements:[],appointments:[],redemptions:[]};
}
export function validDate(date:unknown):date is string {
  return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
}
export function healthBalance(records:any[],days:string[],today:string,state:HealthRewards) {
  const monthly=new Set(state.measurements.filter(m=>m.date<=today).map(m=>m.date.slice(0,7))).size*3;
  // A cancelled or corrected appointment retains its reward key, preventing repeat awards.
  const visits=new Set(state.appointments.filter(a=>a.createdAt.slice(0,10)<=today).map(a=>a.date)).size;
  const total=shellProgress(records,days,today).total+monthly+visits;
  const claimed=new Set(state.redemptions.map(r=>r.prizeId));
  const unlocked=prizes.filter(p=>total>=p.goal);
  return {total,bonus:monthly+visits,unlocked:unlocked.length,redeemable:unlocked.filter(p=>!claimed.has(p.id)).length,claimed:claimed.size};
}
export function reminderState(state:HealthRewards,today:string) {
  return {measurementDue:!state.measurements.some(m=>m.date.slice(0,7)===today.slice(0,7)),
    upcoming:state.appointments.filter(a=>!a.cancelledAt&&a.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).map(a=>({...a,days:Math.round((Date.parse(a.date)-Date.parse(today))/86400000)}))};
}
