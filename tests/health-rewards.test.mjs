import test from 'node:test';
import assert from 'node:assert/strict';
import {healthState,healthBalance,reminderState,prizes} from '../lib/health-rewards.ts';
import {environment} from './helpers/google-environment.mjs';
import {randomUUID} from 'node:crypto';

test('monthly reward uses Taiwan month, retains revisions, ignores client patient/date and validates numbers',()=>{
  const e=environment({now:'2026-10-15T03:00:00Z'}),a=e.patient('A'),b=e.patient('B');
  const save=(height,weight)=>e.call('health.measure',{height,weight,date:'2099-01-01',patientId:b.id},a.identity);
  for(const pair of [[170,70],[171,69],[171,69]])assert.equal(save(...pair).ok,true);
  let state=save(171,69).data.profile.healthRewards;
  assert.equal(state.measurements.length,2);assert.equal(state.measurements[0].date,'2026-10-15');
  assert.equal(healthBalance([],[],'2026-10-15',state).bonus,3);
  assert.equal(healthState(e.call('bootstrap',{},b.identity).data.profile).measurements.length,0);
  for(const pair of [[null,70],['170',70],[0,70],[170,401]])assert.equal(save(...pair).ok,false);
  e.setNow('2026-10-31T16:01:00Z');assert.equal(save(171,68).ok,true);
  state=e.call('bootstrap',{},a.identity).data.profile.healthRewards;
  assert.equal(healthBalance([],[],'2026-11-01',state).bonus,6);
  assert.equal(e.call('health.measure',{height:170,weight:70}).ok,false);
});
test('appointment date deduplicates across cancellation and re-entry; reminders start at three days',()=>{
  const e=environment({now:'2026-10-15T03:00:00Z'}),a=e.patient('A');
  for(const date of ['2026-02-30','2026-10-14','invalid'])assert.equal(e.call('health.appointment',{date},a.identity).ok,false);
  let r=e.call('health.appointment',{date:'2026-10-18'},a.identity);assert.equal(r.ok,true);
  const id=r.data.profile.healthRewards.appointments[0].id;
  assert.equal(e.call('health.appointment',{date:'2026-10-18'},a.identity).data.profile.healthRewards.appointments.length,1);
  assert.equal(e.call('health.cancelAppointment',{id},a.identity).ok,true);
  r=e.call('health.appointment',{date:'2026-10-18'},a.identity);
  const state=r.data.profile.healthRewards;assert.equal(healthBalance([],[],'2026-10-15',state).bonus,1);
  assert.equal(reminderState(state,'2026-10-15').upcoming[0].days,3);
  assert.equal(reminderState(state,'2026-10-18').upcoming[0].days,0);
  assert.equal(reminderState(state,'2026-10-19').upcoming.length,0);
});
test('island redemption uses cumulative thresholds without deductions, retries once and isolates collection',()=>{
  const e=environment({now:'2026-10-15T03:00:00Z'}),a=e.patient('A'),b=e.patient('B');
  assert.equal(e.call('health.redeem',{prizeId:'gift30',available:9999},a.identity).ok,false);
  // Seed only the in-memory synthetic patient fixture, never a live patient.
  const rows=e.books.get(e.properties.get('PATIENT_SHEET_ID')).getSheetByName('Patients').rows;
  const index=rows.findIndex(row=>row[0]===a.id),stored=JSON.parse(rows[index][5]);
  stored.checkinDays=Array.from({length:90},(_,i)=>new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10));rows[index][5]=JSON.stringify(stored);
  const r=e.call('health.redeem',{prizeId:'gift30',cost:1,patientId:b.id},a.identity);assert.equal(r.ok,true,r.error);
  const redemption=r.data.profile.healthRewards.redemptions[0];assert.equal(redemption.goal,30);
  assert.equal(e.call('health.redeem',{prizeId:'gift30'},a.identity).data.profile.healthRewards.redemptions.length,1);
  assert.equal(e.call('health.redeem',{prizeId:'body50'},a.identity).ok,true);
  assert.equal(e.call('health.redeem',{prizeId:'nutrition80'},a.identity).ok,true);
  assert.equal(e.call('health.redeem',{prizeId:'body200'},a.identity).ok,false);
  assert.equal(e.call('health.read',{patientId:a.id},b.identity).ok,false);
  assert.equal(e.call('health.collect',{patientId:a.id,id:redemption.id},a.identity).ok,false);
  assert.equal(e.call('health.collect',{patientId:a.id,id:redemption.id}).ok,true);
  assert.equal(e.call('health.collect',{patientId:b.id,id:redemption.id}).ok,false);
  const state=e.call('health.read',{patientId:a.id}).data.profile.healthRewards;
  assert.ok(state.redemptions[0].collectedAt);
  assert.deepEqual(healthBalance([],stored.checkinDays,'2026-10-15',state),{total:90,bonus:0,unlocked:3,redeemable:0,claimed:3});
  assert.equal(healthBalance([],[],'2026-10-15',state).total,0);
  assert.equal(healthBalance([],[],'2026-10-15',state).claimed,3);
  assert.deepEqual(prizes.map(p=>p.goal),[30,50,80,200]);
});
test('assigned pharmacist reads only their patients and loses access immediately on revocation',()=>{
  const e=environment(),a=e.patient('A'),b=e.patient('B'),staff=e.auth('other','google');
  const grant=e.call('admin.medicationStaff',{patientId:a.id,emails:['other@example.test'],previousId:null,requestId:randomUUID()});
  assert.equal(grant.ok,true,grant.error);
  assert.equal(e.call('health.read',{patientId:a.id},staff).ok,true);
  assert.equal(e.call('health.read',{patientId:b.id},staff).ok,false);
  assert.equal(e.call('health.measure',{height:170,weight:70},staff).ok,false);
  const rows=e.books.get(e.properties.get('PATIENT_SHEET_ID')).getSheetByName('Patients').rows;
  const index=rows.findIndex(r=>r[0]===a.id),p=JSON.parse(rows[index][5]);p.pharmacists=[];rows[index][5]=JSON.stringify(p);
  assert.equal(e.call('health.read',{patientId:a.id},staff).ok,false);
});
test('a busy lock rejects mutation without rewards; retry succeeds exactly once',()=>{
  const e=environment(),a=e.patient('A');let blocked=true;
  e.context.LockService.getScriptLock=()=>({tryLock:()=>!blocked,releaseLock(){}});
  const body={height:170,weight:70};
  assert.equal(e.call('health.measure',body,a.identity).ok,false);
  assert.equal(e.call('bootstrap',{},a.identity).data.profile.healthRewards.measurements.length,0);
  blocked=false;
  assert.equal(e.call('health.measure',body,a.identity).ok,true);
  assert.equal(e.call('health.measure',body,a.identity).data.profile.healthRewards.measurements.length,1);
});
test('each island unlocks at its exact threshold, and 200 shells unlock all four once without spending',()=>{
  for(const total of [29,30,49,50,79,80,199,200]){
    const e=environment({now:'2026-10-15T03:00:00Z'}),a=e.patient('ISLAND');
    const rows=e.books.get(e.properties.get('PATIENT_SHEET_ID')).getSheetByName('Patients').rows;
    const index=rows.findIndex(row=>row[0]===a.id),p=JSON.parse(rows[index][5]);
    p.checkinDays=Array.from({length:total},(_,i)=>new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10));rows[index][5]=JSON.stringify(p);
    for(const prize of prizes){
      const result=e.call('health.redeem',{prizeId:prize.id,total:99999,goal:0},a.identity);
      assert.equal(result.ok,total>=prize.goal,`${total} shells / ${prize.goal} goal`);
      if(result.ok)assert.equal(e.call('health.redeem',{prizeId:prize.id},a.identity).data.profile.healthRewards.redemptions.filter(r=>r.prizeId===prize.id).length,1);
    }
    const profile=e.call('bootstrap',{},a.identity).data.profile;
    const balance=healthBalance([],profile.checkinDays,'2026-10-15',profile.healthRewards);
    assert.equal(balance.total,total);
    assert.equal(balance.unlocked,prizes.filter(p=>total>=p.goal).length);
    assert.equal(balance.redeemable,0);
    assert.equal('available' in balance,false);
    assert.equal('spent' in balance,false);
  }
});
