import test from 'node:test';
import assert from 'node:assert/strict';
import {environment} from './helpers/google-environment.mjs';
test('bootstrap reads 500 patient records in one Sheets data call and excludes another patient before JSON parsing',()=>{
  const e=environment(),p=e.patient('PERF');
  const records=e.books.get(e.properties.get('RECORD_SHEET_ID')).getSheetByName('Records');
  for(let i=0;i<500;i++){
    const r={id:'test-'+i,patientId:p.id,date:new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10),kind:'exercise',mode:'steps',value:i,createdAt:'2026-01-01T00:00:00Z'};
    records.rows.push([r.id,p.id,r.date,r.kind,r.createdAt,JSON.stringify(r)]);
  }
  records.rows.push(['other','other-patient','2026-01-01','exercise','','invalid JSON belonging to someone else']);
  let reads=0;const getRange=records.getRange.bind(records);records.getRange=(...args)=>{const range=getRange(...args);const getValues=range.getValues;range.getValues=()=>{reads++;return getValues();};return range;};
  const result=e.call('bootstrap',{},p.identity);assert.equal(result.ok,true,result.error);
  assert.equal(result.data.records.length,500);assert.equal(reads,1);
  assert.ok(result.data.records.every(r=>r.patientId===p.id&&!('_row'in r)&&!('imageFileId'in r)));
});
