import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const {outputFiles}=await build({stdin:{contents:`import React from 'react';
  import {renderToStaticMarkup} from 'react-dom/server';
  import {ActivityGoalCard,AdminActivityGoal} from './production/activity-goal.tsx';
  const today='2026-09-09',history=[{id:'a',steps:3000,effectiveFrom:today}];
  const record={id:'r',patientId:'p',date:today,kind:'exercise',createdAt:'1',hasImage:true,mode:'steps',value:3000};
  export const empty=renderToStaticMarkup(<ActivityGoalCard today={today} records={[]} onRecord={()=>{}}/>);
  export const achieved=renderToStaticMarkup(<ActivityGoalCard today={today} history={history} records={[record]} onRecord={()=>{}}/>);
  export const paused=renderToStaticMarkup(<ActivityGoalCard today={today} history={[{...history[0],steps:null}]} records={[record]} onRecord={()=>{}}/>);
  export const admin=renderToStaticMarkup(<AdminActivityGoal today={today} auth={{provider:'google',token:'fake'}} patient={{id:'p',name:'測試個案',nickname:'測試',active:true,isTest:true,participating:true}} onSaved={()=>{}}/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',define:{'import.meta.env':'{}'}});
const compiled={exports:{}};
new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const html=compiled.exports;
test('patient goal card exposes honest empty, achieved and paused states with accessible week labels',()=>{
  assert.match(html.empty,/先和照護團隊討論/);assert.match(html.empty,/尚無步數紀錄/);assert.match(html.empty,/0 天達標/);
  assert.match(html.achieved,/今天的目標，達成了/);assert.match(html.achieved,/1 天達標/);assert.match(html.achieved,/2026-09-09，步數目標達成/);
  assert.match(html.achieved,/不必為了數字再加量/);assert.match(html.achieved,/紀錄日另計入航程/);
  assert.match(html.paused,/暫停步數目標/);assert.match(html.paused,/0 天達標/);
});
test('admin target starts blank and explains effective date without assigning a universal target',()=>{
  assert.match(html.admin,/每日目標步數/);assert.match(html.admin,/value=""/);assert.match(html.admin,/首次設定於當日生效/);
  assert.match(html.admin,/系統不預設步數，也不自動提高目標/);
});
