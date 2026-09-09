import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMealInterview,mealQuestionKeys,groupsFromInterview} from '../lib/meal-interview.ts';
import {initialMealScreen,mealSummaryScreen,nextMealScreen,mealReadyForSave} from '../lib/meal-flow.ts';
import {validateRecord} from '../google/domain.js';

const meal=()=>({...emptyMealInterview(),mealType:'便當／餐盤',mealName:'便當',source:'patient-selected',cookingMethod:'蒸／煮',stapleAmount:'約一碗',vegetableAmount:'約一份',proteinAmount:'約一掌心',processedFood:'沒有',eaten:'全部',drink:'白開水',restrictedDiet:false});
test('existing complete meal opens review, while new and incomplete meals remain unconfirmed',()=>{
  const complete=meal();assert.equal(initialMealScreen(complete),mealSummaryScreen(complete));
  assert.equal(mealReadyForSave(complete,initialMealScreen(complete)),true);
  assert.equal(initialMealScreen(emptyMealInterview()),0);
  const missing={...complete,drink:''};assert.equal(initialMealScreen(missing),1);
  assert.equal(mealReadyForSave(missing,mealSummaryScreen(missing)),false);
});
test('single answer edit returns to review without revisiting the remaining questions',()=>{
  const updated={...meal(),drink:'含糖飲料'};
  const question=mealQuestionKeys(updated.mealType).indexOf('drink')+2;
  assert.equal(mealReadyForSave(updated,question),false);
  assert.equal(nextMealScreen(updated,question,true),mealSummaryScreen(updated));
  assert.equal(updated.stapleAmount,'約一碗');
  const submitted=validateRecord({kind:'meal',date:'2026-09-09',period:'晚餐',groups:groupsFromInterview(updated),eaten:'全部',drink:'含糖',restrictedDiet:false,mealDetails:updated},'2026-09-09');
  assert.equal(submitted.mealDetails.drink,'含糖飲料');
  assert.equal(submitted.mealDetails.cookingMethod,'蒸／煮');
});
test('normal interview still walks all required questions before becoming saveable',()=>{
  let value={...emptyMealInterview(),mealType:'便當／餐盤',mealName:'便當'};
  let screen=2;
  for(const key of mealQuestionKeys('便當／餐盤')){
    assert.equal(mealReadyForSave(value,screen),false);
    value={...value,[key]:meal()[key]};screen=nextMealScreen(value,screen,false);
  }
  assert.equal(screen,mealSummaryScreen(value));assert.equal(mealReadyForSave(value,screen),true);
});
test('new photo or new meal type cannot inherit the previous meal answers',()=>{
  const reset=emptyMealInterview();assert.equal(initialMealScreen(reset),0);
  const fruit={...reset,mealType:'水果',mealName:'水果'};
  assert.equal(mealReadyForSave(fruit,mealSummaryScreen(fruit)),false);
  assert.equal(fruit.restrictedDiet,null);assert.equal(fruit.eaten,'');
});
