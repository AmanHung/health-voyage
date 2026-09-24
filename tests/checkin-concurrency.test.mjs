import test from 'node:test';
import assert from 'node:assert/strict';
import {environment} from './helpers/google-environment.mjs';
import {readFileSync} from 'node:fs';
test('checkin uses server Taiwan date, ignores claimed patient/date, retries once and survives bootstrap',()=>{
 const e=environment({now:'2026-09-24T15:59:00Z'}),a=e.patient('SIGN_A'),b=e.patient('SIGN_B');
 for(let i=0;i<3;i++) assert.equal(e.call('checkin',{patientId:b.id,date:'2099-01-01'},a.identity).ok,true);
 assert.deepEqual(e.call('bootstrap',{},a.identity).data.profile.checkinDays,['2026-09-24']);
 assert.deepEqual(e.call('bootstrap',{},b.identity).data.profile.checkinDays,[]);
 e.setNow('2026-09-24T16:01:00Z');
 assert.equal(e.call('checkin',{},a.identity).data.today,'2026-09-25');
 assert.deepEqual(e.call('bootstrap',{},a.identity).data.profile.checkinDays,['2026-09-24','2026-09-25']);
 assert.equal(e.call('checkin').ok,false);
});
test('a busy write lock cannot prevent another patient bootstrap; failed checkin is safely retryable',()=>{
 const e=environment(),a=e.patient('LOCK_A'),b=e.patient('LOCK_B');
 let locked=true,attempts=0;
 e.context.LockService.getScriptLock=()=>({tryLock(){attempts++;return !locked;},releaseLock(){}});
 assert.equal(e.call('checkin',{},a.identity).ok,false);
 assert.equal(e.call('bootstrap',{},b.identity).ok,true);
 assert.equal(attempts,1);
 locked=false;
 assert.equal(e.call('checkin',{},a.identity).ok,true);
 assert.equal(e.call('bootstrap',{},a.identity).data.profile.checkinDays.length,1);
});
test('interleaved identities remain separate without a global login lock',()=>{
 const e=environment(),patients=Array.from({length:10},(_,i)=>e.patient('LOAD'+i));
 for(const p of patients)assert.equal(e.call('checkin',{},p.identity).ok,true);
 e.context.LockService.getScriptLock=()=>{throw Error('login must not lock');};
 for(let round=0;round<3;round++)for(const p of patients){const r=e.call('bootstrap',{},p.identity);assert.equal(r.ok,true,r.error);assert.equal(r.data.profile.id,p.id);assert.equal(r.data.profile.checkinDays.length,1);}
});
test('release excludes preview auth and test controls; leaderboard is deferred and login remains split',()=>{
 const main=readFileSync('production/main.tsx','utf8'),features=readFileSync('production/journey-features.tsx','utf8');
 assert.match(main,/view!=='exercise'/);
 assert.doesNotMatch(features,/routeTest|localStorage|PREVIEW_ONLY|testTotal/);
 assert.doesNotMatch(readFileSync('production/login.tsx','utf8'),/journey-features|journey.css|mock-api/);
});
