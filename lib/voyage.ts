// Participation rewards only: never infer adherence or clinical improvement.
export type VoyageRecord = {date:string;kind:string;createdAt?:string};
const kinds = ['exercise','meal','medicine'];
const DAY = 86400000;
function validDay(date:string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
}
export const PORTS = [
  {name:'啟程港',days:1,description:'第一份紀錄，旅程的開始'},
  {name:'活力島',days:7,description:'累積七天，留下自己的足跡'},
  {name:'好習慣灣',days:21,description:'累積二十一天，每次努力都算數'},
] as const;
export function voyageProgress(records:VoyageRecord[],today:string) {
  if (!validDay(today)) throw new Error('航程日期不正確。');
  const saved = new Map<string,VoyageRecord>();
  for (const record of records) {
    if (!validDay(record.date) || record.date > today || !kinds.includes(record.kind)) continue;
    const key = `${record.date}:${record.kind}`;
    const previous = saved.get(key);
    if (!previous || (record.createdAt || '') >= (previous.createdAt || '')) saved.set(key,record);
  }
  const latest = [...saved.values()];
  const dates = [...new Set(latest.map(r=>r.date))].sort();
  const timestamp = Date.parse(today+'T00:00:00Z');
  const monday = timestamp - ((new Date(timestamp).getUTCDay()+6)%7)*DAY;
  const week = Array.from({length:7},(_,i)=>{
    const date = new Date(monday+i*DAY).toISOString().slice(0,10);
    return {date,label:['一','二','三','四','五','六','日'][i],done:dates.includes(date),future:date>today};
  });
  const weeklyDays = week.filter(d=>d.done).length;
  const count = (kind:string)=>latest.filter(r=>r.kind===kind).length;
  const badges = [
    {id:'first',name:'啟程紀念',description:'保存第一份紀錄',value:dates.length,goal:1},
    {id:'exercise',name:'運動足跡',description:'累積五天運動紀錄',value:count('exercise'),goal:5},
    {id:'meal',name:'餐桌日記',description:'累積五天飲食紀錄',value:count('meal'),goal:5},
    {id:'medicine',name:'安心回報',description:'累積五天用藥回報',value:count('medicine'),goal:5},
    {id:'week',name:'一週同行',description:'累積七個紀錄日',value:dates.length,goal:7},
    {id:'month',name:'珍藏時光',description:'累積三十個紀錄日',value:dates.length,goal:30},
  ].map(b=>({...b,earned:b.value>=b.goal}));
  return {today,dates,latest,week,weeklyDays,weeklyGoal:5,totalDays:dates.length,
    todayCount:latest.filter(r=>r.date===today).length,badges,
    nextPort:PORTS.find(p=>p.days>dates.length) || null,
    currentPort:[...PORTS].reverse().find(p=>p.days<=dates.length) || null};
}
export type VoyageProgress = ReturnType<typeof voyageProgress>;
