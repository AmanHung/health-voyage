import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const {outputFiles}=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {StepLeaderboard,rankedSteps} from './production/step-leaderboard';export {rankedSteps};export const render=(props)=>renderToStaticMarkup(<StepLeaderboard today="2026-09-16" {...props}/>);`,loader:'tsx',resolveDir:process.cwd()},loader:{'.css':'empty'},bundle:true,write:false,platform:'node',format:'cjs'});
const compiled={exports:{}};new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const {rankedSteps,render}=compiled.exports;
test('step ranks sort without mutating input, omit zero or invalid totals and share competition ranks',()=>{
  const rows=[{nickname:'零',steps:0},{nickname:'丙',steps:500},{nickname:'甲',steps:1000},{nickname:'乙',steps:1000},{nickname:'丁',steps:100},{nickname:'無效',steps:NaN}];
  assert.deepEqual(rankedSteps(rows).map(r=>[r.nickname,r.rank,r.tied]),[['甲',1,true],['乙',1,true],['丙',3,false],['丁',4,false]]);
  assert.equal(rows[0].nickname,'零');
});
test('list shows every rank with avatars, tied ranks and escaped names',()=>{
  const html=render({rows:[{nickname:'<測試>',steps:12000},{nickname:'甲',steps:11000},{nickname:'乙',steps:11000},{nickname:'丙',steps:9000}]});
  assert.equal((html.match(/class="step-ranking-row /g)||[]).length,4);
  assert.match(html,/並列第 2 名/);assert.match(html,/12,000/);assert.match(html,/&lt;測試&gt;/);assert.doesNotMatch(html,/<details/);assert.match(html,/person-avatar/);assert.match(html,/2026 年 9 月/);
});
test('loading, error and all-zero states never display stale winners or award nonexistent medals',()=>{
  const rows=[{nickname:'舊榜',steps:1000}];
  for(const props of [{rows,loading:true},{rows,error:'讀取失敗',onRetry:()=>{}},{rows:[{nickname:'零',steps:0}]}])assert.doesNotMatch(render(props),/class="step-winner |舊榜/);
  assert.match(render({rows:[],error:'讀取失敗',onRetry:()=>{}}),/重新讀取/);
  assert.match(render({rows:[]}),/本月還沒有步數紀錄/);
});

test('personal total is independent from truncated rankings and avatar setting is accessible',()=>{
  const html=render({rows:[{nickname:'其他人',steps:99999,avatar:'sun'}],ownSteps:4321,avatar:'flower',onEditAvatar:()=>{}});
  assert.match(html,/4,321/);assert.match(html,/設定我的排行榜頭像/);assert.match(html,/小花朵/);assert.match(html,/小太陽/);
});
