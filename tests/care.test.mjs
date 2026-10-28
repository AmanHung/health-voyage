import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {environment} from './helpers/google-environment.mjs';import {CARE_RECORD_NEW_SINCE} from '../lib/care.ts';
function setup(){const e=environment({now:new Date(Date.parse(CARE_RECORD_NEW_SINCE)+1000).toISOString()}),p=e.patient('CARE-A'),q=e.patient('CARE-B');const record={kind:'medicine',date:CARE_RECORD_NEW_SINCE.slice(0,10),status:'有疑問'};const result=e.call('save',{record,requestId:randomUUID()},p.identity);assert.equal(result.ok,true,result.error);return {e,p,q,r:result.data.record,record};}
const body=(p,r,extra={})=>({patientId:p.id,date:r.date,kind:r.kind,sourceRecordId:r.id,body:'請記下問題，回診時與照護團隊討論。',withdrawn:false,previousAdviceId:null,requestId:randomUUID(),...extra});
function publish(e,p,r,extra={},auth){const payload=body(p,r,extra),result=e.call('care.publish',payload,auth);assert.equal(result.ok,true,result.error);return {payload,a:result.data.advice};}
function otherAdmin(e){const accounts=e.call('admin.accounts').data;e.call('admin.accountChange',{email:'other@example.test',operation:'add',version:accounts.version,requestId:randomUUID()});return e.auth('other');}
test('record counts include honest reports; NEW is per administrator and exact current version',()=>{
 const {e,p,r,record}=setup(),other=otherAdmin(e);let row=e.call('admin.patients').data.patients.find(n=>n.id===p.id);assert.equal(row.recordCounts.medicine,1);assert.equal(row.unseenCounts.medicine,1);
 assert.equal(e.call('care.viewRecord',{patientId:p.id,recordId:r.id},p.identity).ok,false);
 for(let n=0;n<2;n++)assert.equal(e.call('care.viewRecord',{patientId:p.id,recordId:r.id}).ok,true);
 row=e.call('admin.patients').data.patients.find(n=>n.id===p.id);assert.equal(row.unseenCounts.medicine,0);assert.equal(e.call('admin.patients',{},other).data.patients.find(n=>n.id===p.id).unseenCounts.medicine,1);
 const revision=e.call('save',{record:{...record,status:'未服用'},previousId:r.id,requestId:randomUUID()},p.identity).data.record;
 row=e.call('admin.patients').data.patients.find(n=>n.id===p.id);assert.equal(row.recordCounts.medicine,1);assert.equal(row.unseenCounts.medicine,1);assert.equal(e.call('care.viewRecord',{patientId:p.id,recordId:r.id}).ok,false);
 assert.equal(e.call('care.viewRecord',{patientId:p.id,recordId:revision.id}).ok,true);
 const reads=e.books.get(e.properties.get('RECORD_SHEET_ID')).getSheetByName('CareReads').rows;assert.equal(reads.length,3);
});
test('advice publication retries are idempotent, private fields stay server-side and ownership is enforced',()=>{
 const {e,p,q,r}=setup(),payload=body(p,r);assert.equal(e.call('care.publish',payload,p.identity).ok,false);assert.equal(e.call('care.publish',{...payload,patientId:q.id}).ok,false);
 const result=e.call('care.publish',payload);assert.equal(result.ok,true,result.error);const a=result.data.advice;assert.equal(e.call('care.publish',payload).data.advice.id,a.id);assert.equal(e.call('care.publish',{...payload,body:'different'}).ok,false);
 assert.equal(e.call('bootstrap',{},p.identity).data.care.advice[0].body,payload.body);assert.equal(e.call('care.list',{patientId:p.id},q.identity).data.advice.length,0);assert.equal(e.call('care.readAdvice',{adviceId:a.id},q.identity).ok,false);
 for(const key of ['actor','requestId','fingerprint','_row'])assert.equal(key in a,false);
 assert.equal(e.call('care.records',{patientId:p.id,kind:'medicine'},q.identity).ok,false);assert.equal(e.call('care.records',{patientId:p.id,kind:'invalid'}).ok,false);
});
test('patient read acknowledgments persist, are idempotent, and a new advice version requires reading again',()=>{
 const {e,p,r}=setup(),{a}=publish(e,p,r),other=otherAdmin(e);for(let n=0;n<2;n++)assert.equal(e.call('care.readAdvice',{adviceId:a.id},p.identity).ok,true);
 assert.deepEqual(e.call('bootstrap',{},p.identity).data.care.readIds,[a.id]);
 const b=publish(e,p,r,{previousAdviceId:a.id,body:'更新建議'},other).a;assert.equal(e.call('care.publish',body(p,r,{previousAdviceId:a.id})).ok,false);
 const inbox=e.call('care.list',{},p.identity).data;assert.equal(inbox.advice[0].id,b.id);assert.equal(inbox.readIds.includes(b.id),false);assert.equal(e.call('care.readAdvice',{adviceId:a.id},p.identity).ok,false);
 assert.equal(e.call('care.records',{patientId:p.id,kind:r.kind}).data.readAdviceIds.includes(a.id),true);
});
test('record revisions invalidate publication snapshots and deletion hides advice without destroying history',()=>{
 const {e,p,r,record}=setup(),{a}=publish(e,p,r);const revision=e.call('save',{record:{...record,status:'未服用'},previousId:r.id,requestId:randomUUID()},p.identity).data.record;
 assert.equal(e.call('care.publish',body(p,r,{previousAdviceId:a.id})).ok,false);assert.equal(e.call('care.list',{},p.identity).data.advice[0].sourceRecordId,r.id);
 const deleted=e.call('admin.recordStatus',{id:revision.id,deleted:true,requestId:randomUUID()});assert.equal(deleted.ok,true,deleted.error);assert.equal(e.call('care.list',{},p.identity).data.advice.length,0);assert.equal(e.call('care.readAdvice',{adviceId:a.id},p.identity).ok,false);
 assert.equal(e.call('admin.patients').data.patients.find(n=>n.id===p.id).recordCounts.medicine,0);
 const head=deleted.data.records.at(-1);assert.equal(e.call('admin.recordStatus',{id:head.id,deleted:false,requestId:randomUUID()}).ok,true);assert.equal(e.call('care.list',{},p.identity).data.advice.length,1);
 assert.equal(e.call('care.records',{patientId:p.id,kind:r.kind}).data.adviceHistory.length,1);
});
test('withdrawal is versioned and removes patient-facing content; stale writers cannot overwrite it',()=>{
 const {e,p,r}=setup(),{a}=publish(e,p,r);const withdrawn=publish(e,p,r,{withdrawn:true,previousAdviceId:a.id,body:a.body}).a;assert.equal(withdrawn.withdrawn,true);assert.equal(e.call('care.list',{},p.identity).data.advice.length,0);
 assert.equal(e.call('care.publish',body(p,r,{previousAdviceId:a.id})).ok,false);const history=e.call('care.records',{patientId:p.id,kind:r.kind}).data.adviceHistory;assert.equal(history.length,2);assert.equal(history[0].body,a.body);
 const republished=publish(e,p,r,{previousAdviceId:withdrawn.id,body:'重新發布'}).a;assert.equal(e.call('care.list',{},p.identity).data.advice[0].id,republished.id);
});
test('advice allows paragraphs, bounds length, and cannot write through deleted or disabled patients',()=>{
 const {e,p,r}=setup();for(const text of ['', 'x'.repeat(601),'bad\u0000text'])assert.equal(e.call('care.publish',body(p,r,{body:text})).ok,false);
 const {a}=publish(e,p,r,{body:'第一行\n第二行'});assert.equal(a.body,'第一行\n第二行');
 assert.equal(e.call('admin.patientStatus',{patientId:p.id,deleted:true,requestId:randomUUID()}).ok,true);assert.equal(e.call('care.publish',body(p,r,{previousAdviceId:a.id})).ok,false);assert.equal(e.call('care.viewRecord',{patientId:p.id,recordId:r.id}).ok,false);assert.equal(e.call('care.list',{},p.identity).ok,false);
});
test('empty care reads do not create sheets and lock failures cannot acknowledge or publish',()=>{
 const {e,p,r}=setup();const book=e.books.get(e.properties.get('RECORD_SHEET_ID'));assert.equal(e.call('bootstrap',{},p.identity).data.care.advice.length,0);assert.equal(book.getSheetByName('CareAdvice'),undefined);assert.equal(book.getSheetByName('CareReads'),undefined);
 e.context.LockService.getScriptLock=()=>({tryLock:()=>false,releaseLock(){}});assert.equal(e.call('care.publish',body(p,r)).ok,false);assert.equal(e.call('care.viewRecord',{patientId:p.id,recordId:r.id}).ok,false);assert.equal(e.call('bootstrap',{},p.identity).ok,true);
});

test('baseline defaults existing records viewed without changing records, advice reads or creating CareReads',async()=>{
 const {CARE_RECORD_NEW_SINCE}=await import('../lib/care.ts');const before=new Date(Date.parse(CARE_RECORD_NEW_SINCE)-1000).toISOString();
 const e=environment({now:before}),p=e.patient('BASELINE');const record={kind:'medicine',date:CARE_RECORD_NEW_SINCE.slice(0,10),status:'有疑問'};const r=e.call('save',{record,requestId:randomUUID()},p.identity).data.record;
 const {a}=publish(e,p,r);let row=e.call('admin.patients').data.patients.find(n=>n.id===p.id);assert.equal(row.recordCounts.medicine,1);assert.equal(row.unseenCounts.medicine,0);assert.ok(e.call('care.records',{patientId:p.id,kind:'medicine'}).data.viewedIds.includes(r.id));
 assert.equal(e.books.get(e.properties.get('RECORD_SHEET_ID')).getSheetByName('CareReads'),undefined);const boot=e.call('bootstrap',{},p.identity).data;assert.equal(boot.records[0].id,r.id);assert.equal(boot.care.advice[0].id,a.id);assert.deepEqual(boot.care.readIds,[]);
 e.setNow(new Date(Date.parse(CARE_RECORD_NEW_SINCE)+1000).toISOString());const revision=e.call('save',{record:{...record,status:'未服用'},previousId:r.id,requestId:randomUUID()},p.identity).data.record;
 row=e.call('admin.patients').data.patients.find(n=>n.id===p.id);assert.equal(row.recordCounts.medicine,1);assert.equal(row.unseenCounts.medicine,1);assert.equal(e.call('care.records',{patientId:p.id,kind:'medicine'}).data.viewedIds.includes(revision.id),false);
 assert.equal(e.call('care.viewRecord',{patientId:p.id,recordId:revision.id}).ok,true);assert.equal(e.call('admin.patients').data.patients.find(n=>n.id===p.id).unseenCounts.medicine,0);
});
test('baseline boundary is fixed; later backdated entries and malformed timestamps remain NEW',async()=>{
 const {CARE_RECORD_NEW_SINCE,recordCareSummary,isBaselineCareRecord}=await import('../lib/care.ts');const r={id:'old',patientId:'p',kind:'medicine',date:'2026-10-01',createdAt:CARE_RECORD_NEW_SINCE};assert.equal(isBaselineCareRecord(r),true);
 const later={...r,id:'later',date:'2026-09-30',createdAt:new Date(Date.parse(CARE_RECORD_NEW_SINCE)+1).toISOString()},invalid={...r,id:'invalid',date:'2026-09-29',createdAt:'invalid'};assert.equal(isBaselineCareRecord(later),false);assert.equal(isBaselineCareRecord(invalid),false);
 const summary=recordCareSummary([r,later,invalid],[],'admin-A');assert.equal(summary.recordCounts.medicine,3);assert.equal(summary.unseenCounts.medicine,2);assert.equal(recordCareSummary([r,later],[{type:'record',actor:'admin-A',versionId:later.id}],'admin-B').unseenCounts.medicine,1);
});
