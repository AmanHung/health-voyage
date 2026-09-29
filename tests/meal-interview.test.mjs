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
  assert.deepEqual(mealQuestionKeys('湯麵'),['stapleAmount','vegetableAmount','proteinAmount','soupAmount','processedFood','eaten','drink']);
  assert.deepEqual(mealQuestionKeys('漢堡／三明治'),['cookingMethod','stapleAmount','vegetableAmount','proteinAmount','sideDish','processedFood','eaten','drink']);
  assert.deepEqual(mealQuestionKeys('水果'),['portionSize','eaten']);
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

test('classifier refuses unknown photos rather than fabricating a bento',()=>{
  assert.deepEqual(suggestMeal([{className:'cheeseburger',probability:0.8}]),{name:'漢堡／三明治',mealType:'漢堡／三明治',confidence:0.8});
  assert.equal(suggestMeal([{className:'plate',probability:0.4}]),null);
  assert.equal(suggestMeal([]),null);
});

test('uncertain, competing and non-food labels never become a meal automatically',()=>{
 for(const predictions of [
  [{className:'plate',probability:.85},{className:'cheeseburger',probability:.09}],
  [{className:'cheeseburger',probability:.34}],
  [{className:'cheeseburger',probability:.44},{className:'banana',probability:.4}],
  [{className:'coffee mug',probability:.2}],
  [{className:'coffee mug',probability:.9}],
  [{className:'cheeseburger',probability:NaN}],
 ])assert.equal(suggestMeal(predictions),null);
 assert.equal(suggestMeal([{className:'banana',probability:.75}]).mealType,'水果');
});

test('removed restriction question stays unknown on new records; old answers remain intact',()=>{
 const m={...emptyMealInterview(),mealType:'水果',mealName:'香蕉',portionSize:'一般份量',eaten:'全部'};
 assert.equal(mealInterviewComplete(m),true);
 for(const restrictedDiet of [null,true,false]){
  const a={...m,restrictedDiet};
  const record=validateRecord({kind:'meal',date:'2026-09-24',period:'點心',groups:groupsFromInterview(a),eaten:'全部',drink:'不確定',restrictedDiet,mealDetails:a},'2026-09-24');
  assert.equal(record.restrictedDiet,restrictedDiet);
  assert.equal(record.mealDetails.restrictedDiet,restrictedDiet);
 }
 assert.equal(mealQuestionKeys('飲料').includes('vegetableAmount'),false);
 assert.equal(mealQuestionKeys('湯麵').includes('soupAmount'),true);
 for(const type of ['水果','飲料','便當／餐盤'])assert.equal(mealQuestionKeys(type).includes('restrictedDiet'),false);
});
