import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const {outputFiles}=await build({
  stdin:{contents:`import React from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    import {VoyageHome,VoyageJourney,VoyageAchievements,VoyageNavigation} from './production/voyage.tsx';
    import {voyageProgress} from './lib/voyage.ts';
    const p=voyageProgress([],'2026-09-09');
    export const home=renderToStaticMarkup(<VoyageHome nickname="測試旅人" records={[]} progress={p} onTask={()=>{}} onNavigate={()=>{}}/>);
    export const journey=renderToStaticMarkup(<VoyageJourney progress={p}/>);
    export const achievements=renderToStaticMarkup(<VoyageAchievements progress={p}/>);
    export const navigation=renderToStaticMarkup(<VoyageNavigation view="history" onNavigate={()=>{}}/>);`,loader:'tsx',resolveDir:process.cwd()},
  bundle:true,write:false,platform:'node',format:'cjs',define:{'import.meta.env.BASE_URL':'"/health-voyage/"'},
});
const compiled={exports:{}};
new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const html=compiled.exports;
test('home exposes all three record actions and zero-state progress honestly',()=>{
  for(const label of ['記錄步數','拍照記錄','回報情形'])assert.match(html.home,new RegExp(label));
  assert.match(html.home,/0／3 已記錄/);assert.doesNotMatch(html.home,/已抵達|已記錄，點此/);
  assert.match(html.home,/測試旅人/);assert.match(html.home,/health-voyage\/voyage\/coast.webp/);
});
test('map and awards explain participation without inventing treatment success',()=>{
  for(const name of ['啟程港','活力島','好習慣灣'])assert.match(html.journey,new RegExp(name));
  assert.match(html.journey,/不代表疾病控制或服藥達標/);
  assert.doesNotMatch(html.achievements,/voyage-badge earned/);
  assert.match(html.achievements,/未服用或有疑問/);
});
test('navigation provides labelled destinations and keeps history under My account',()=>{
  assert.match(html.navigation,/aria-label="主要導覽"/);
  for(const name of ['今日','航程','成就','我的'])assert.match(html.navigation,new RegExp(name));
  assert.equal((html.navigation.match(/aria-current="page"/g)||[]).length,1);
  assert.match(html.navigation,/aria-current="page"[^]*?<span>我的<\/span>/);
});
