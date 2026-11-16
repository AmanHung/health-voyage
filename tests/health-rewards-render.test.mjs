import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const {outputFiles}=await build({stdin:{contents:`import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HealthCards,RewardShop,StaffRewards} from './production/health-rewards';
const props={auth:{provider:'line',token:'synthetic'},profile:{id:'fixture',nickname:'測試',healthRewards:{measurements:[],appointments:[{id:'visit',date:'2026-10-18',createdAt:'2026-10-15T00:00:00Z'}],redemptions:[]}},today:'2026-10-15',onSaved:()=>{}};
export const cards=renderToStaticMarkup(<HealthCards {...props}/>);
export const shop=renderToStaticMarkup(<RewardShop {...props} records={[]}/>);
const statusProfile={...props.profile,checkinDays:Array.from({length:80},(_,i)=>new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10)),healthRewards:{measurements:[],appointments:[],redemptions:[{id:'first',prizeId:'gift30',goal:30,createdAt:'2026-10-10',collectedAt:'2026-10-11'},{id:'second',prizeId:'body50',goal:50,createdAt:'2026-10-12'}]}};
export const statuses=renderToStaticMarkup(<RewardShop {...props} profile={statusProfile} records={[]}/>);
export const staff=renderToStaticMarkup(<StaffRewards auth={props.auth} patientId="fixture" patientName="合成個案" initialProfile={{...statusProfile,shellTotal:80}} inline directRedemption/>);
export const staffEmpty=renderToStaticMarkup(<StaffRewards auth={props.auth} patientId="fixture" initialProfile={{...props.profile,shellTotal:30}} inline directRedemption/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',loader:{'.css':'empty'},define:{'import.meta.env':'{}'}});
const compiled={exports:{}};new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
test('measurement starts with a clear action and monthly reward; three-day reminder is accessible',()=>{
  assert.equal((compiled.exports.cards.match(/type="submit"/g)||[]).length,1);
  for(const text of ['記錄身高與體重','開始登錄','完成登錄，獲得 3 顆貝殼','新增回診日期','再 3 天要回診','每月限領一次'])assert.ok(compiled.exports.cards.includes(text));
  assert.match(compiled.exports.cards,/role="status"/);
});
test('island rewards expose thresholds, face values and locked states without a spending balance',()=>{
  const html=compiled.exports.shop;
  for(const goal of [30,50,80,200])assert.ok(html.includes(`累積 ${goal} 顆解鎖`));
  assert.equal((html.match(/價值 400 元/g)||[]).length,2);
  assert.ok(html.includes('價值 200 元'));
  assert.ok(html.includes('累積 1 顆貝殼'));
  assert.doesNotMatch(html,/可用|已兌換\s*\d+\s*顆|兌換扣除/);
  assert.doesNotMatch(html,/<button|確認兌換獎勵|兌換此島獎勵/);
});
test('island cards distinguish locked, unlocked, pending and collected independently',()=>{
  const html=compiled.exports.statuses;
  for(const state of ['reward-locked','reward-unlocked','reward-pending','reward-collected'])assert.ok(html.includes(state));
  assert.match(html,/已兌換/);assert.match(html,/請洽照護團隊兌換/);
  assert.doesNotMatch(html,/兌換此島獎勵|已領取/);
});

test('admin can redeem without an application; collected and locked checkboxes cannot be changed',()=>{
  const html=compiled.exports.staff;
  assert.equal((html.match(/type="checkbox"/g)||[]).length,4);
  assert.equal((html.match(/checked=""/g)||[]).length,1);
  assert.equal((html.match(/disabled=""/g)||[]).length,2);
  assert.match(html,/待領取・勾選完成兌換/);assert.match(html,/合成個案：免費營養諮詢已兌換/);
  assert.equal((compiled.exports.staffEmpty.match(/disabled=""/g)||[]).length,3);
  assert.match(compiled.exports.staffEmpty,/勾選即完成兌換，個案不需先申請/);
});
