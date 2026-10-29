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
test('patient card uses exercise diary copy while preserving progress, targets and pauses',()=>{
 assert.match(html.empty,/尚無步數紀錄/);assert.match(html.empty,/今日步數目標進度 0％/);
 assert.match(html.empty,/activity-illustration/);assert.match(html.empty,/voyage\/activity.svg/);
 assert.match(html.achieved,/今天的目標，達成了/);assert.match(html.achieved,/3,000/);assert.match(html.achieved,/今日步數目標進度 100％/);
 assert.match(html.paused,/這段時間，照自己的步調/);assert.match(html.paused,/尚未啟用步數目標/);
 for(const state of [html.empty,html.achieved,html.paused]){assert.match(state,/讓我們一起用運動寫日記/);assert.doesNotMatch(state,/與照護團隊約定|預設每日目標|每天 [\d,]+ 步|上傳截圖，核對並保存今天的步數/);}
});
test('admin target starts blank and explains effective date without assigning a universal target',()=>{
  assert.match(html.admin,/每日目標步數/);assert.match(html.admin,/value=""/);assert.match(html.admin,/首次設定於當日生效/);
  assert.match(html.admin,/系統不預設步數，也不自動提高目標/);
});
