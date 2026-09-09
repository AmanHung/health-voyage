export type ActivityGoal = {id:string;steps:number|null;effectiveFrom:string};
type ActivityRecord = {date:string;kind:string;createdAt?:string;mode?:string;value?:number};
const DAY=86400000;
function validDay(date:string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
}
export function goalOnDate(history:ActivityGoal[],date:string):ActivityGoal|null {
  return history.reduce<ActivityGoal|null>((found,goal)=>validDay(goal.effectiveFrom)&&goal.effectiveFrom<=date&&(goal.steps===null||(Number.isInteger(goal.steps)&&goal.steps>0&&goal.steps<=100000))&&(!found||goal.effectiveFrom>=found.effectiveFrom)?goal:found,null);
}
export function activityProgress(records:ActivityRecord[],history:ActivityGoal[],today:string) {
  if(!validDay(today))throw new Error('活動日期不正確。');
  const current=goalOnDate(history,today);
  function onDay(date:string) {
    const goal=goalOnDate(history,date);
    const record=records.filter(r=>r.date===date&&r.kind==='exercise').reduce<ActivityRecord|null>((saved,r)=>!saved||(r.createdAt||'')>=(saved.createdAt||'')?r:saved,null);
    const steps=record?.mode==='steps'&&typeof record.value==='number'&&Number.isInteger(record.value)&&record.value>=0&&record.value<=100000?record.value:null;
    const future=date>today;
    const achieved=!future&&goal?.steps!=null&&steps!==null&&steps>=goal.steps;
    return {date,goal,steps,future,achieved,recorded:!!record,percent:!future&&goal?.steps&&steps!==null?Math.min(100,Math.round(steps/goal.steps*100)):0};
  }
  const timestamp=Date.parse(today+'T00:00:00Z'),monday=timestamp-((new Date(timestamp).getUTCDay()+6)%7)*DAY;
  const week=Array.from({length:7},(_,i)=>({...onDay(new Date(monday+i*DAY).toISOString().slice(0,10)),label:['一','二','三','四','五','六','日'][i]}));
  // Same effective date can have revisions; the last saved version wins.
  const upcomingDates=history.map(g=>g.effectiveFrom).filter(d=>validDay(d)&&d>today).sort();
  return {current,today:onDay(today),week,achievedDays:week.filter(d=>d.achieved).length,upcoming:upcomingDates.length?goalOnDate(history,upcomingDates[0]):null};
}
