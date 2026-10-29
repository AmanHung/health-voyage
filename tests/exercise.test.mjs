import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {environment} from './helpers/google-environment.mjs';
import {exerciseReward,exerciseSummary} from '../lib/exercise.ts';
import {shellProgress} from '../production/shell-rules.mjs';
import {validateRecord,dayKey,leaderboard} from '../google/domain.js';
import {patientExportSheets} from '../lib/patient-export.ts';
const image='data:image/jpeg;base64,'+Buffer.from([255,216,255,192,0,17,8,0,100,0,100,3,1,17,0,2,17,0,3,17,0,255,218,0,2,255,217]).toString('base64');
const form=(date,ids=['cycle','resistance'],value)=>({kind:'exercise',date,exerciseVersion:2,activities:ids.map(id=>({id,...(id!=='walk'?{duration:'10～30 分鐘'}:{})})),...(value==null?{}:{value})});
const save=(e,p,record,keys,extra={})=>e.call('save',{record,images:keys.map(key=>({key,dataUrl:image})),requestId:randomUUID(),...extra},p.identity);
test('exercise thresholds, association, daily cap and legacy scores stay deterministic',()=>{
  for(const [value,stars]of [[0,0],[4999,0],[5000,1],[7499,1],[7500,2]])assert.equal(exerciseReward({...form(dayKey(),['walk'],value),exercisePhotos:[{key:'walk',hasImage:true}]}).stars,stars);
  const r={...form(dayKey()),exercisePhotos:[{key:'cycle',hasImage:true}]};assert.equal(exerciseReward(r).stars,1);
  assert.equal(exerciseReward({...r,exercisePhotos:[...r.exercisePhotos,{key:'resistance',hasImage:true}]}).stars,2);
  assert.equal(exerciseReward({...r,activities:[{id:'resistance'}]}).stars,0);
  assert.equal(exerciseReward({...r,exercisePhotos:[{key:'cycle',hasImage:true},{key:'cycle',hasImage:true}]}).stars,1);
  assert.equal(exerciseReward({...form(dayKey(),['walk','cycle'],0),exercisePhotos:[{key:'walk',hasImage:true},{key:'cycle',hasImage:true}]}).stars,2);
  assert.equal(exerciseReward({mode:'minutes',value:30,hasImage:true}).stars,0);
  assert.equal(exerciseReward({mode:'steps',value:7500,hasImage:true}).stars,2);
});
test('server rejects invented activities, durations, duplicates and client supplied evidence',()=>{
  const e=environment(),p=e.patient('A'),date=dayKey();
  for(const record of [form(date,['invented']),form(date,['walk','walk']),{...form(date),activities:[{id:'cycle',duration:'不確定'}]},{...form(date),activities:[{id:'walk',duration:'10～30 分鐘'}]},form(date,['walk'],-1),form(date,['walk'],1.5)])assert.throws(()=>validateRecord(record,date));
  assert.equal(save(e,p,form(date),[],{}).ok,false);
  assert.equal(save(e,p,form(date),['walk']).ok,false);
  assert.equal(save(e,p,form(date),['cycle','cycle']).ok,false);
  assert.equal(e.call('save',{record:{...form(date),exercisePhotos:[{key:'cycle',hasImage:true}]},images:[{key:'cycle',reuse:true,fileId:'foreign'}],requestId:randomUUID()},p.identity).ok,false);
  assert.equal(e.call('save',{record:form(date),images:[{key:'cycle',dataUrl:'bad'}],requestId:randomUUID()},p.identity).ok,false);
});
test('multiple private photos survive reload, cannot cross patients, and never disclose Drive IDs',()=>{
  const e=environment(),p=e.patient('A'),other=e.patient('B'),date=dayKey(),record=form(date),requestId=randomUUID();
  const body={record,images:[{key:'cycle',dataUrl:image},{key:'resistance',dataUrl:image}],requestId};
  const result=e.call('save',body,p.identity);assert.equal(result.ok,true,result.error);const r=result.data.record;
  assert.equal(r.exercisePhotos.length,2);assert.equal(JSON.stringify(r).includes('fileId'),false);assert.equal('imageFileId'in r,false);
  const loaded=e.call('bootstrap',{},p.identity).data.records[0];assert.deepEqual(loaded.exercisePhotos,r.exercisePhotos);assert.equal(exerciseReward(loaded).stars,2);
  const care=e.call('care.records',{patientId:p.id,kind:'exercise'}).data.records[0];assert.deepEqual(care.exercisePhotos,r.exercisePhotos);assert.equal(JSON.stringify(care).includes('fileId'),false);assert.equal('imageFileId'in care,false);
  for(const key of ['cycle','resistance']){assert.equal(e.call('image',{id:r.id,key},p.identity).ok,true);assert.equal(e.call('image',{id:r.id,key},other.identity).ok,false);}
  assert.equal(e.call('image',{id:r.id,key:'walk'},p.identity).ok,false);
  assert.equal(e.call('save',body,p.identity).data.record.id,r.id);
  assert.equal(e.call('save',{...body,images:body.images.slice(0,1)},p.identity).ok,false);
  const revised=e.call('save',{record:form(date,['cycle']),images:[{key:'cycle',reuse:true}],previousId:r.id,requestId:randomUUID()},p.identity);assert.equal(revised.ok,true,revised.error);
  assert.equal(exerciseReward(revised.data.record).stars,1);assert.equal(e.call('image',{id:r.id,key:'resistance'},p.identity).ok,true);
  assert.equal(e.call('save',{record,images:[{key:'resistance',reuse:true}],previousId:revised.data.record.id,requestId:randomUUID()},p.identity).ok,false);
  assert.equal(e.call('save',{record:form(date),images:[{key:'cycle',reuse:true}],previousId:r.id,requestId:randomUUID()},p.identity).ok,false);
  assert.equal(e.call('save',{record:{kind:'exercise',date,mode:'steps',value:7500,activity:'步行'},previousId:revised.data.record.id,image,requestId:randomUUID()},p.identity).ok,false);
});
test('latest multi activity revisions, deletion, exports and task completion use the same rewards',()=>{
  const date=dayKey(),r={...form(date),id:'new',patientId:'p',createdAt:date+'T03:00:00Z',hasImage:true,exercisePhotos:[{key:'cycle',hasImage:true},{key:'resistance',hasImage:true}]};
  const meal={kind:'meal',date,hasImage:true},medicine={kind:'medicine',date,medicationComplete:true};
  const score=shellProgress([r,meal,medicine],[],date).entries[0];assert.equal(score.steps,2);assert.equal(score.tasks,1);assert.equal(score.exerciseDone,true);
  const update={...r,id:'next',createdAt:date+'T04:00:00Z',exercisePhotos:[{key:'cycle',hasImage:true}]};assert.equal(shellProgress([r,update],[],date).total,1);assert.equal(shellProgress([r,{...update,deletedAt:'deleted'}],[],date).total,0);
  const sheets=patientExportSheets({id:'p',name:'合成個案',nickname:'測試',active:true},[r]);const data=sheets[1];assert.match(exerciseSummary(r),/腳踏車／踏步機・10～30 分鐘/);assert.equal(data.rows[0].at(-1),2);assert.match(data.rows[0].at(-2),/彈力帶／啞鈴：已上傳/);assert.equal(JSON.stringify(data).includes('data:image'),false);
});
test('legacy walking screenshots can be reused only in their own activity during upgrade',()=>{
  const e=environment(),p=e.patient('A'),date=dayKey();const old=e.call('save',{record:{kind:'exercise',date,mode:'steps',value:6200,activity:'步行'},image,requestId:randomUUID()},p.identity).data.record;
  const body={record:form(date,['walk','cycle'],6200),images:[{key:'walk',reuse:true},{key:'cycle',dataUrl:image}],previousId:old.id,requestId:randomUUID()};const upgraded=e.call('save',body,p.identity);assert.equal(upgraded.ok,true,upgraded.error);assert.equal(exerciseReward(upgraded.data.record).stars,2);
});
test('blank step counts never contaminate monthly rankings or convert other exercise into steps',()=>{
  const date=dayKey(),patient={id:'p',active:true,nickname:'合成'};
  assert.equal(leaderboard([patient],[{...form(date,['walk']),patientId:'p'},{...form(date,['cycle']),patientId:'p'}],date.slice(0,7))[0].steps,0);
});
