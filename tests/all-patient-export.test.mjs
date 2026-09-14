import test from 'node:test';
import assert from 'node:assert/strict';
import {allPatientExport} from '../lib/all-patient-export.ts';
const patients=[{id:'a',name:'同名',nickname:'甲',active:true},{id:'b',name:'同名',nickname:'乙',active:false,deletedAt:'2026-09-14'}];
const row=(patientId,id,value=3111)=>({patientId,id,value,kind:'exercise',mode:'steps',date:'2026-09-14',createdAt:'2026-09-14T01:00:00Z',hasImage:false});
test('one workbook combines all patients, including deleted accounts and empty cases, with distinct identity columns',async()=>{
  const progress=[];
  const sheets=await allPatientExport([...patients,{id:'empty',name:'無紀錄',nickname:'',active:true}],async id=>id==='empty'?[]:[row(id,'old'),row(id,'latest',0),row('foreign','x')],'2026-09-14','2026-09-14',(n,total)=>progress.push([n,total]));
  assert.equal(sheets.length,6); assert.equal(sheets[1].rows.length,3);
  assert.equal(sheets[2].rows.length,2);
  assert.deepEqual(sheets[2].rows.map(r=>r.slice(0,4)),[['a','同名','甲','使用中'],['b','同名','乙','已刪除']]);
  assert.equal(sheets[2].rows[0][8],0);
  assert.deepEqual(progress.at(-1),[3,3]);
  assert.deepEqual(sheets[1].rows[2].slice(4),[0,0,0]);
});
test('any failed patient rejects the export rather than returning partial rows',async()=>{
  await assert.rejects(allPatientExport(patients,async id=>{if(id==='b')throw new Error('讀取失敗');return [row(id,'r')];},'',''),/讀取失敗/);
});
test('empty roster keeps headers and repeated patient IDs are read once',async()=>{
  const empty=await allPatientExport([],async()=>{throw new Error('unexpected');},'','');
  assert.equal(empty.length,6); assert.equal(empty[1].rows.length,0);
  let count=0;
  const result=await allPatientExport([patients[0],patients[0]],async()=>{count++;return [];},'','');
  assert.equal(count,1); assert.equal(result[1].rows.length,1);
});
