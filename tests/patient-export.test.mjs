import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { patientExportSheets, exportRangeValid } from '../lib/patient-export.ts';
import { patientWorkbook } from '../lib/patient-workbook.ts';
const patient = { id:'p', name:'=1+1', nickname:'甲', active:true };
const record = (id, extra={}) => ({ id, patientId:'p', date:'2026-09-14', kind:'exercise', mode:'steps', value:3111, createdAt:'2026-09-14T01:00:00Z', hasImage:false, ...extra });
test('exports only selected patient latest active revisions within inclusive dates; zero remains numeric', () => {
  const sheets = patientExportSheets(patient, [record('old'), record('new',{value:0}),record('foreign',{patientId:'other'}),record('meal',{kind:'meal'}),record('deleted',{kind:'meal',deletedAt:'now'}),record('outside',{date:'2026-09-13'})], '2026-09-14','2026-09-14');
  assert.equal(sheets[1].rows.length,1);
  assert.equal(sheets[1].rows[0][1],'new');
  assert.equal(sheets[1].rows[0][4],0);
  assert.equal(sheets[1].rows[0][2],'2026-09-14 09:00:00');
  assert.equal(sheets[1].rows[0][8],'未上傳');
  assert.equal(sheets[2].rows.length,0);
});
test('range validation and empty export retain workbook headers', () => {
  assert.equal(exportRangeValid('2026-02-30',''),false);
  assert.throws(() => patientExportSheets(patient,[],'2026-09-15','2026-09-14'));
  assert.equal(patientExportSheets(patient,[]).length,5);
});
test('dose statuses and snapshot doses preserved separately from daily completion', () => {
  const r = record('med',{kind:'medicine',medicationComplete:true,medicationExpected:1,medicationDoses:[{planId:'plan',code:'001',name:'藥品',strength:'',time:'08:00',label:'早餐後',amount:0.5,unit:'錠',route:'口服',prn:false,status:'未服用',reason:'忘記',reportedAt:'2026-09-14T02:00:00Z',note:''}]});
  const sheets=patientExportSheets(patient,[r]);
  assert.equal(sheets[3].rows[0][4],'是');
  assert.equal(sheets[4].rows[0][9],0.5);
  assert.equal(sheets[4].rows[0][13],'未服用');
});
test('real XLSX roundtrip preserves Chinese, text instead of formulas, numbers, sheets and frozen headers', async () => {
  const sheets=patientExportSheets(patient,[record('r')]);
  const bytes=await patientWorkbook(sheets);
  assert.equal(bytes[0],0x50); assert.equal(bytes[1],0x4b);
  const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  assert.equal(workbook.worksheets.length,5);
  const cell=workbook.getWorksheet('個案摘要').getCell('B3');
  assert.equal(cell.value,'=1+1');
  assert.equal(cell.type,ExcelJS.ValueType.String);
  assert.equal(workbook.getWorksheet('運動紀錄').getCell('E2').value,3111);
  assert.equal(workbook.getWorksheet('運動紀錄').views[0].ySplit,1);
});
test('photo export contains only uploaded status for both exercise and meals',()=>{
  const sheets=patientExportSheets(patient,[record('e',{hasImage:true}),record('m',{kind:'meal',hasImage:true})]);
  for(const sheet of sheets.slice(1,3)){
    const index=sheet.headers.indexOf('照片上傳狀態');
    assert.equal(sheet.rows[0][index],'已上傳');
  }
});
