import test from 'node:test';
import assert from 'node:assert/strict';
import {adminRecordGroups} from '../lib/admin-records.ts';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const base={id:'original',patientId:'p',date:'2026-09-10',kind:'exercise',mode:'steps',value:1234,createdAt:'2026-09-10T01:00:00Z',hasImage:true};
test('admin record grouping keeps one daily head and all revisions including deletion',()=>{
  const records=[base,{...base,id:'revision',value:2345},{...base,id:'deleted',value:2345,deletedAt:'2026-09-10T02:00:00Z'}];
  const groups=adminRecordGroups(records);assert.equal(groups.length,1);assert.equal(groups[0].current.id,'deleted');assert.equal(groups[0].versions.length,3);
  assert.equal(adminRecordGroups([...records,{...base,id:'new',value:500}])[0].current.deletedAt,undefined);
});
const {outputFiles}=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
  import {AdminRecordRows,AdminDirectory,deletionDescription} from './production/admin-directory.tsx';
  const original=${JSON.stringify(base)},deleted={...original,id:'deleted',deletedAt:'2026-09-10T02:00:00Z'};
  export const active=renderToStaticMarkup(<AdminRecordRows records={[original,deleted]} trash={false} disabled={false} onPhoto={()=>{}} onChange={()=>{}}/>);
  export const trash=renderToStaticMarkup(<AdminRecordRows records={[original,deleted]} trash disabled={false} onPhoto={()=>{}} onChange={()=>{}}/>);
  export const directory=renderToStaticMarkup(<AdminDirectory auth={{provider:'google',token:'fake'}} today="2026-09-10" patients={[{id:'p',name:'測試個案',nickname:'測試',active:true,isTest:true,bound:true,participating:true}]} onPatientChanged={()=>{}} onReload={async()=>{}} onPhoto={()=>{}}/>);
  export const descriptions=[deletionDescription('patient',true),deletionDescription('record',true),deletionDescription('patient',false)];`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',define:{'import.meta.env':'{}'},loader:{'.css':'empty'}});
const compiled={exports:{}};new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);const html=compiled.exports;
test('deleted daily head is absent from active view, restorable in trash with read-only revision evidence',()=>{
  assert.match(html.active,/目前沒有有效紀錄/);assert.doesNotMatch(html.active,/刪除紀錄/);
  assert.match(html.trash,/復原紀錄/);assert.match(html.trash,/修訂歷程（2 筆）/);assert.equal((html.trash.match(/復原紀錄/g)||[]).length,1);
});
test('admin exposes deletion and trash while confirmation text explains patient access and retained evidence',()=>{
  assert.match(html.directory,/刪除個案/);assert.match(html.directory,/已刪除個案/);assert.match(html.directory,/原始資料與照片仍保留/);
  assert.match(html.descriptions[0],/停止登入、讀取與儲存/);assert.match(html.descriptions[0],/LINE 綁定會保留/);
  assert.match(html.descriptions[1],/不再計入步數、航程與任務統計/);assert.match(html.descriptions[2],/原本已刪除的單筆紀錄仍保留/);
});
