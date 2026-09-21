import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const {outputFiles}=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {FoodDetail,FoodSearch,DietGuide} from './production/food-guide';export * from './lib/food-guide';export const detail=food=>renderToStaticMarkup(<FoodDetail food={food}/>);export const search=()=>renderToStaticMarkup(<FoodSearch/>);export const hub=props=>renderToStaticMarkup(<DietGuide onRecord={()=>{}} onPhoto={()=>{}} onBack={()=>{}} {...props}/>);`,loader:'tsx',resolveDir:process.cwd()},define:{'import.meta.env.BASE_URL':'"/health-voyage/"'},loader:{'.css':'empty'},bundle:true,write:false,platform:'node',format:'cjs'});
const compiled={exports:{}};new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const {foods,findFoods,mealWeek,currentMeals,detail,search,hub}=compiled.exports;
test('approved catalog assets, aliases and red-yellow-gray-green order survive integration',()=>{
  assert.equal(foods.length,122);assert.equal(new Set(foods.map(f=>f.id)).size,122);
  for(const food of foods){assert.ok(fs.readFileSync(`public/food-art/${food.art}.svg`,'utf8').includes(`<title>${food.name}插圖</title>`));assert.ok(findFoods('全部',food.name).some(f=>f.id===food.id));}
  assert.ok(findFoods('全部','土司').some(f=>f.name==='全麥吐司'));
  assert.equal(findFoods('飲品','豆漿').length,2);
  assert.equal(findFoods('豆魚蛋肉','').length,31);
  assert.deepEqual([...new Set(findFoods('全部','').map(f=>f.color))],['red','yellow','review','green']);
  assert.equal(findFoods('水果','吐司').length,0);
});
test('all foods render and details preserve conditional food-specific advice without patient jargon',()=>{
  const html=search();assert.equal((html.match(/class="fg-row"/g)||[]).length,122);
  for(const label of ['紅燈','黃燈','灰燈','綠燈'])assert.ok(html.includes(label));
  assert.doesNotMatch(html,/資料庫共|再看 24|ASCVD/);
  for(const food of foods){const card=detail(food);assert.equal(card.includes('健康選擇'),['red','yellow'].includes(food.color));assert.doesNotMatch(card,/ASCVD|食物插圖|實際怎麼選/);assert.match(card,/\/health-voyage\/food-art\//);}
  assert.match(detail(foods.find(f=>f.name==='含糖豆漿')),/少糖豆漿/);
  assert.doesNotMatch(detail(foods.find(f=>f.name==='起司／乳酪')),/減少沾醬/);
});
test('weekly review uses current records only, deduplicates revisions and handles Monday across months',()=>{
  const record=(id,date,createdAt,extra={})=>({id,date,createdAt,kind:'meal',patientId:'synthetic',hasImage:true,...extra});
  const records=[record('old','2026-08-31','2026-08-31T01:00:00Z'),record('new','2026-08-31','2026-08-31T02:00:00Z'),record('tue','2026-09-01','2026-09-01'),record('prior','2026-08-30','2026-08-30'),record('future','2026-09-03','2026-09-03'),record('deleted','2026-09-02','2026-09-02',{deletedAt:'2026-09-02'}),record('walk','2026-09-02','2026-09-02',{kind:'exercise'})];
  const week=mealWeek(records,'2026-09-02');assert.equal(week.days[0],'2026-08-31');assert.equal(week.days[6],'2026-09-06');assert.equal(week.recordedDays,2);assert.deepEqual(week.meals.map(r=>r.id),['tue','new']);assert.equal(currentMeals(records,'2026-09-02').length,3);assert.equal(records.length,7);
  const empty=hub({records:[],today:'2026-09-21',initialPage:'week'});assert.match(empty,/已留下 0 天/);assert.match(empty,/這週尚未/);assert.doesNotMatch(empty,/示範週報|5 天/);
});
