import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const {outputFiles}=await build({stdin:{contents:`import React from 'react';
  import {renderToStaticMarkup} from 'react-dom/server';
  import {MealInterview} from './production/meal-interview.tsx';
  import {emptyMealInterview} from './lib/meal-interview.ts';
  const value={...emptyMealInterview(),mealType:'水果',mealName:'水果',source:'patient-selected',portionSize:'一般份量',eaten:'全部',restrictedDiet:false};
  const props={imageUrl:null,period:'點心',onPeriod:()=>{},onChange:()=>{},onReady:()=>{}};
  export const review=renderToStaticMarkup(<MealInterview {...props} hasSavedImage value={value}/>);
  export const newMeal=renderToStaticMarkup(<MealInterview {...props} value={emptyMealInterview()}/>);
  export const pending=renderToStaticMarkup(<MealInterview {...props} imageUrl="blob:synthetic-test" value={emptyMealInterview()}/>);
  export const legacy=renderToStaticMarkup(<MealInterview {...props} hasSavedImage value={emptyMealInterview()}/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs'});
const compiled={exports:{}};
new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const html=compiled.exports;
test('saved meals expose individual edit controls, including period and type',()=>{
  assert.match(html.review,/確認這一餐/);assert.doesNotMatch(html.review,/重新回答/);
  assert.match(html.review,/aria-label="修改：餐別"/);assert.match(html.review,/aria-label="修改：餐點類型"/);
  assert.equal((html.review.match(/aria-label="修改：/g)||[]).length,5);
  assert.match(html.review,/一般份量/);
});
test('photo is still required; slow recognition offers an explicit manual alternative',()=>{
  assert.match(html.newMeal,/請先選擇餐點照片/);
  assert.match(html.pending,/正在辨識餐點/);assert.match(html.pending,/自行選擇餐點類型/);
  assert.doesNotMatch(html.pending,/初步判斷：/);
});
test('legacy record with a saved photo can answer without re-uploading the same photo',()=>{
  assert.doesNotMatch(html.legacy,/請先選擇餐點照片/);
  assert.match(html.legacy,/請點選最接近的餐點類型/);
});
