import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';
import {build} from 'esbuild';
import {dayKey,validateRecord,latest,leaderboard} from '../google/domain.js';
const compiled=await build({entryPoints:['google/backend.js'],bundle:true,write:false,format:'iife',globalName:'HealthVoyage',platform:'neutral'});
function environment(){
  const properties=new Map([['LINE_CHANNEL_ID','line-channel'],['GOOGLE_CLIENT_ID','google-client'],['ACCEPT_PATIENTS','true']]),cache=new Map(),books=new Map(),files=new Map();
  function sheet(){
    const rows=[];
    return {rows,getLastRow:()=>rows.length,setFrozenRows(){},getRange(start,col,count,width){
      return {
        getValues:()=>Array.from({length:count},(_,i)=>(rows[start-1+i]||[]).slice(col-1,col-1+width)),
        setNumberFormat(){return this;},
        setValues(values){values.forEach((v,i)=>{rows[start-1+i]??=[];v.forEach((cell,j)=>rows[start-1+i][col-1+j]=cell);});return this;},
      };
    }};
  }
  const spreadsheet={create(){const id=randomUUID(),sheets=new Map();const b={id,getId:()=>id,getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=sheet();sheets.set(n,s);return s;}};books.set(id,b);return b;},openById:id=>books.get(id)};
  const context={Date,Map,JSON,Math,Number,String,Array,Error,encodeURIComponent,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty(k,v){properties.set(k,v);return this;}})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},SpreadsheetApp:spreadsheet,
    Session:{getEffectiveUser:()=>({getEmail:()=> 'obm0304@gmail.com'})},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
    Utilities:{getUuid:randomUUID,DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_a,s)=>[...createHash('sha256').update(s).digest()],base64Decode:s=>[...Buffer.from(s,'base64')],base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,type,name)=>({bytes,type,name,getBytes:()=>bytes})},
    DriveApp:{Access:{PRIVATE:'private'},getFolderById:()=>folder,getFileById:id=>files.get(id),createFolder:()=>folder},
    UrlFetchApp:{fetch(url,options){let provider=url.includes('api.line.me')?'line':'google';const token=provider==='line'?options.payload.id_token:new URL(url).searchParams.get('id_token');const subject=token.slice(80);const valid=!subject.startsWith('invalid');const claim={iss:provider==='line'?'https://access.line.me':'https://accounts.google.com',aud:subject==='wrongaud'?'wrong':provider==='line'?'line-channel':'google-client',sub:subject,email:subject==='admin'?'obm0304@gmail.com':'other@example.test',email_verified:subject!=='unverified',exp:subject==='expired'?1:Date.now()/1000+3600};return {getResponseCode:()=>valid?200:401,getContentText:()=>JSON.stringify(claim)};}},
  };
  const folder={getId:()=> 'photos',getSharingAccess:()=> 'private',getEditors:()=>[],getViewers:()=>[],createFile(blob){const id=randomUUID();const file={getId:()=>id,getSize:()=>blob.bytes.length,getBlob:()=>blob};files.set(id,file);return file;}};
  vm.createContext(context);vm.runInContext(compiled.outputFiles[0].text,context);
  context.HealthVoyage.setup();
  const auth=(subject='admin',provider='google')=>({provider,token:'t'.repeat(80)+subject});
  const call=(action,payload={},identity=auth())=>JSON.parse(context.HealthVoyage.post({postData:{contents:JSON.stringify({action,payload,auth:identity})}}).text);
  function patient(subject,isTest=true){const created=call('admin.createPatient',{requestId:randomUUID(),name:'測試個案 '+subject,isTest});assert.equal(created.ok,true);const identity=auth(subject,'line');const bound=call('bind',{code:created.data.code,nickname:'測試'+subject},identity);assert.equal(bound.ok,true);return {identity,id:created.data.patient.id,code:created.data.code};}
  return {call,auth,patient,properties,books,files,cache,context};
}
const image='data:image/jpeg;base64,'+Buffer.from([255,216,255,192,0,17,8,0,100,0,100,3,1,17,0,2,17,0,3,17,0,255,218,0,2,255,217]).toString('base64');
test('Google backend rejects missing, expired, wrong-audience and non-admin Google identities',()=>{
  const env=environment();
  for(const identity of [null,env.auth('invalid','line'),env.auth('expired','line'),env.auth('wrongaud','line'),env.auth('other','google')])assert.equal(env.call('bootstrap',{},identity).ok,false);
  assert.equal(env.call('bootstrap').data.role,'admin');
});
test('one-use invitation binds a LINE identity and cannot be stolen/reused',()=>{
  const e=environment(),p=e.patient('A');
  assert.equal(e.call('bind',{code:p.code,nickname:'其他帳號'},e.auth('B','line')).ok,false);
  assert.equal(e.call('bootstrap',{},p.identity).data.profile.id,p.id);
  assert.equal(e.call('admin.patients',{},p.identity).ok,false);
  assert.equal(e.call('save',{patientId:p.id},e.auth('unbound','line')).ok,false);
});
test('test patient completes three tasks; saves survive bootstrap; photos are owner/admin only',()=>{
  const e=environment(),p=e.patient('A'),other=e.patient('B'),date=dayKey();
  const examples=[{kind:'exercise',date,mode:'steps',value:1616,activity:'步行',recognized:1616},{kind:'meal',date,period:'午餐',groups:['主食','蔬菜'],eaten:'全部',drink:'無飲料',restrictedDiet:false},{kind:'medicine',date,status:'未服用'}];
  for(const record of examples){const result=e.call('save',{record,requestId:randomUUID(),image:record.kind==='medicine'?null:image},p.identity);assert.equal(result.ok,true,result.error);}
  const records=e.call('bootstrap',{},p.identity).data.records;assert.equal(records.length,3);
  assert.equal(e.call('bootstrap',{},other.identity).data.records.length,0);
  assert.equal(e.call('image',{id:records[0].id},p.identity).ok,true);
  assert.equal(e.call('image',{id:records[0].id},other.identity).ok,false);
  assert.equal(e.call('image',{id:records[0].id}).ok,true);
  assert.equal(e.call('admin.records',{patientId:p.id}).data.records.length,3);
  assert.equal('imageFileId' in records[0],false);
});
test('idempotent retry makes one record; corrections preserve history and replace daily total',()=>{
  const e=environment(),p=e.patient('A',false),date=dayKey(),requestId=randomUUID();
  const record={kind:'exercise',date,mode:'steps',value:1616,activity:'步行',recognized:1616};
  const body={record,requestId,image};const saved=e.call('save',body,p.identity).data.record;
  assert.equal(e.call('save',body,p.identity).data.record.id,saved.id);
  assert.equal(e.call('save',{...body,record:{...record,value:1700}},p.identity).ok,false);
  const revised=e.call('save',{record:{...record,value:2000},previousId:saved.id,requestId:randomUUID()},p.identity);assert.equal(revised.ok,true,revised.error);
  assert.equal(revised.data.record.manuallyCorrected,true);
  assert.equal(e.call('bootstrap',{},p.identity).data.records.length,1);
  assert.equal(e.call('admin.records',{patientId:p.id}).data.records.length,2);
  assert.equal(e.call('save',{record,previousId:saved.id,requestId:randomUUID()},p.identity).ok,false);
  e.call('profile',{nickname:'參賽者',participating:true},p.identity);
  assert.equal(e.call('leaderboard',{},p.identity).data.rows[0].steps,2000);
});
test('test patients never enter real leaderboard; opting out persists',()=>{
  const e=environment(),p=e.patient('A');e.call('profile',{nickname:'測試暱稱',participating:true},p.identity);
  e.call('save',{record:{kind:'exercise',date:dayKey(),mode:'steps',value:1000,activity:'步行'},requestId:randomUUID(),image},p.identity);
  assert.deepEqual(e.call('leaderboard',{},p.identity).data.rows,[]);
  e.call('profile',{nickname:'測試暱稱',participating:false},p.identity);
  assert.equal(e.call('bootstrap',{},p.identity).data.profile.participating,false);
});
test('closed enrollment permits only scoped test patients, invalid images fail closed',()=>{
  const e=environment(),p=e.patient('A'),real=e.patient('REAL',false);e.properties.set('ACCEPT_PATIENTS','false');e.properties.set('ACCEPT_TEST_PATIENTS','false');assert.equal(e.call('bootstrap',{},p.identity).ok,false);
  assert.equal(e.call('bootstrap').ok,true);
  e.properties.set('ACCEPT_TEST_PATIENTS','true');
  assert.equal(e.call('bootstrap',{},p.identity).ok,true);
  assert.equal(e.call('bootstrap',{},real.identity).ok,false);
  const unbound=e.auth('new-test','line');assert.equal(e.call('bootstrap',{},unbound).data.bound,false);
  assert.equal(e.call('bind',{code:'0000000000000000',nickname:'測試新手'},unbound).ok,false);
  const record={kind:'exercise',date:dayKey(),mode:'steps',value:0,activity:'休息'};
  assert.equal(e.call('save',{record,requestId:randomUUID(),image:'data:image/jpeg;base64,AAAA'},p.identity).ok,false);
  assert.equal(e.call('save',{record,requestId:randomUUID()},p.identity).ok,false);
});
test('real Taiwan day, future dates, integer ranges and single metric validated',()=>{
  assert.equal(dayKey(new Date('2026-09-03T16:01:00Z')),'2026-09-04');
  for(const date of ['2026-09-04','2026-02-31','wrong'])assert.throws(()=>validateRecord({kind:'medicine',date,status:'已服用'},'2026-09-03'));
  assert.throws(()=>validateRecord({kind:'exercise',date:'2026-09-03',mode:'minutes',value:1.5,activity:'步行'},'2026-09-03'));
  const value=validateRecord({kind:'exercise',date:'2026-09-03',mode:'minutes',value:30,activity:'步行',steps:999999},'2026-09-03');assert.equal('steps' in value,false);
});
