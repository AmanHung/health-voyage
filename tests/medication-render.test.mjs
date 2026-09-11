import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const built = await build({
  stdin: {
    contents: `
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {DoseCard,PlanPreview,MedicationHistory} from './production/medication';
const dose={key:'p:m:08:00',planId:'p',itemId:'m',code:'123456',name:'示例藥品',strength:'5 mg 錠劑',unit:'錠',route:'口服',note:'依藥袋使用',hasImage:true,time:'08:00',label:'早餐後',amount:0.5,prn:false};
export const initial=renderToStaticMarkup(<DoseCard dose={dose} disabled={false} onSave={()=>{}}/>);
export const future=renderToStaticMarkup(<DoseCard dose={dose} disabled notDue onSave={()=>{}}/>);
export const missed=renderToStaticMarkup(<DoseCard dose={{...dose,hasImage:false}} report={{...dose,status:'未服用',reason:'忘記',reportedAt:'2026-09-11T01:00:00Z'}} disabled={false} onSave={()=>{}}/>);
export const history=renderToStaticMarkup(<MedicationHistory record={{medicationDoses:[{...dose,status:'有疑問',reason:'想詢問藥師'}]}}/>);
`,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  loader: { '.css': 'empty' },
  define: { 'import.meta.env': '{}' },
});
const mod = { exports: {} };
new Function('module', 'exports', 'require', built.outputFiles[0].text)(
  mod,
  mod.exports,
  createRequire(import.meta.url),
);
const { initial, future, missed, history } = mod.exports;
test('dose card displays matched image, exact dose and distinct unreported status without preselecting taken', () => {
  assert.match(initial, /res.cloudinary.com\/de02nbokt/);
  assert.match(initial, /no-referrer/);
  assert.match(initial, /0.5/);
  assert.match(initial, /5 mg 錠劑/);
  assert.match(initial, /尚未回報/);
  assert.doesNotMatch(initial, /aria-pressed="true"/);
  assert.match(initial, /儲存這次回報/);
});
test('unavailable picture preserves medication instructions; missed status and reason remain explicit', () => {
  assert.match(missed, /暫無圖片/);
  assert.match(missed, /已保存：未服用/);
  assert.match(missed, /忘記/);
  assert.match(missed, /補充說明（可不填）/);
  assert.match(future, /尚未到設定時間/);
  assert.match(future, /<fieldset disabled/);
  assert.match(history, /有疑問/);
  assert.match(history, /想詢問藥師/);
  assert.match(history, /0.5/);
});
