import {healthState,healthBalance,prizes,validDate} from '../lib/health-rewards.ts';
import {dayKey} from './domain.js';

export function healthService({read,write,need,locked,audit,person,publicPerson,scoreRecords}) {
  return (action,payload,identity,today)=>locked(()=>{
    today=dayKey();
    const staff=['admin','pharmacist'].includes(identity.role);
    let p;
    if(action==='health.collect'||action==='health.read') {
      need(staff,'只有照護團隊可以確認領取。');
      p=read('Patients').find(p=>p.id===payload.patientId&&p.active&&!p.deletedAt);
      need(p&&(identity.role==='admin'||p.pharmacists?.includes(identity.email)),'沒有此個案的權限。');
    } else {
      need(identity.role==='patient','只有個案可以登錄或兌換。');
      p=person(identity);
    }
    const state=healthState(p),now=new Date().toISOString();
    if(action==='health.read')return {profile:publicPerson(p),today};
    let changed=false;
    if(action==='health.measure') {
      need(typeof payload.height==='number'&&Number.isFinite(payload.height)&&payload.height>=50&&payload.height<=250,'身高請填寫 50 至 250 公分。');
      need(typeof payload.weight==='number'&&Number.isFinite(payload.weight)&&payload.weight>=10&&payload.weight<=400,'體重請填寫 10 至 400 公斤。');
      const previous=state.measurements.filter(m=>m.date.slice(0,7)===today.slice(0,7)).at(-1);
      if(!previous||previous.height!==payload.height||previous.weight!==payload.weight){
        state.measurements.push({date:today,height:payload.height,weight:payload.weight,createdAt:now});changed=true;
      }
    } else if(action==='health.appointment') {
      need(validDate(payload.date)&&payload.date>=today,'請選擇今天或之後的有效回診日期。');
      if(!state.appointments.some(a=>a.date===payload.date&&!a.cancelledAt)) {
        state.appointments.push({id:Utilities.getUuid(),date:payload.date,createdAt:now});changed=true;
      }
    } else if(action==='health.cancelAppointment') {
      const a=state.appointments.find(a=>a.id===payload.id);need(a,'找不到回診紀錄。');
      if(!a.cancelledAt){a.cancelledAt=now;changed=true;}
    } else if(action==='health.redeem') {
      const prize=prizes.find(r=>r.id===payload.prizeId);need(prize,'找不到此獎品。');
      if(!state.redemptions.some(r=>r.prizeId===prize.id)) {
        const records=scoreRecords(p.id);
        const balance=healthBalance(records,p.checkinDays||[],today,state);
        need(balance.total>=prize.goal,'尚未抵達此島嶼，請繼續累積貝殼解鎖。');
        state.redemptions.push({id:Utilities.getUuid(),prizeId:prize.id,goal:prize.goal,createdAt:now});changed=true;
      }
    } else if(action==='health.collect') {
      const r=state.redemptions.find(r=>r.id===payload.id);need(r,'找不到兌換紀錄。');
      if(!r.collectedAt){r.collectedAt=now;changed=true;}
    } else need(false,'不支援此操作。');
    if(changed){p.healthRewards=state;write('Patients',p,p._row);audit(identity.subject,action,p.id,{date:today,id:payload.id||null,prizeId:payload.prizeId||null});}
    return {profile:publicPerson(p),today};
  });
}
