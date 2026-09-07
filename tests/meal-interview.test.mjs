import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMealInterview,inferMealType,mealQuestionKeys,mealInterviewComplete,groupsFromInterview} from '../lib/meal-interview.ts';
import {validateRecord} from '../google/domain.js';
import {suggestMeal} from '../production/meal-classifier.ts';

test('meal names cover diverse common Taiwanese eating contexts',()=>{
  const cases={'排骨便當':'便當／餐盤','雞腿便當':'便當／餐盤','牛肉湯麵':'湯麵','肉燥乾麵':'乾麵／炒麵','咖哩飯':'飯類','蔬菜粥':'粥／湯品','涮涮鍋':'火鍋','蛋餅早餐':'早餐','cheeseburger':'漢堡／三明治','香蕉':'水果','奶茶飲料':'飲料'};
  for(const [name,type] of Object.entries(cases))assert.equal(inferMealType(name),type,name);
});

test('questions branch by meal type and collect only relevant necessary details',()=>{
  assert.deepEqual(mealQuestionKeys('湯麵'),['stapleAmount','vegetableAmount','proteinAmount','soupAmount','processedFood','eaten','drink','restrictedDiet']);
  assert.deepEqual(mealQuestionKeys('漢堡／三明治'),['cookingMethod','stapleAmount','vegetableAmount','proteinAmount','sideDish','processedFood','eaten','drink','restrictedDiet']);
  assert.deepEqual(mealQuestionKeys('水果'),['portionSize','eaten','restrictedDiet']);
});

test('AI suggestion is never enough until patient confirms every required answer',()=>{
  const a={...emptyMealInterview(),mealType:'便當／餐盤',mealName:'排骨便當',source:'model-confirmed',modelSuggestion:'排骨便當'};
  assert.equal(mealInterviewComplete(a),false);
  Object.assign(a,{cookingMethod:'油炸',stapleAmount:'約一碗',vegetableAmount:'約一份',proteinAmount:'約一掌心',processedFood:'沒有',eaten:'全部',drink:'沒有飲料',restrictedDiet:false});
  assert.equal(mealInterviewComplete(a),true);
  assert.deepEqual(groupsFromInterview(a),['主食','豆魚蛋肉','蔬菜']);
  const record={kind:'meal',date:'2026-09-07',period:'午餐',groups:groupsFromInterview(a),eaten:'全部',drink:'無飲料',restrictedDiet:false,mealDetails:a};
  assert.equal(validateRecord(record,'2026-09-07').feedbackVersion,'meal-guided-qa-v1');
  assert.throws(()=>validateRecord({...record,groups:['主食']},'2026-09-07'),/不一致/);
});

test('free classifier suggests a broad type instead of silently skipping analysis',()=>{
  assert.deepEqual(suggestMeal([{className:'cheeseburger',probability:0.8}]),{name:'漢堡／三明治',mealType:'漢堡／三明治',confidence:0.8});
  assert.deepEqual(suggestMeal([{className:'plate',probability:0.4}]),{name:'便當／餐盤',mealType:'便當／餐盤',confidence:0});
  assert.equal(suggestMeal([]),null);
});
