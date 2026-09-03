import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFood} from '../server/food-ai.ts';
import {validateFoodAnalysis,suggestedGroups} from '../lib/food-ai.ts';
const result={isFood:true,items:[{name:'白飯',group:'全穀雜糧',certainty:'較明確'},{name:'配菜',group:'蔬菜',certainty:'待確認'}],uncertainties:['無法確認配菜種類']};
test('food analysis uses image input, strict JSON and no provider response storage',async()=>{
  const actual=await analyzeFood(new Uint8Array([1,2,3]),'image/png','test-only-not-a-key',async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);
    assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.max_output_tokens,1100);
    assert.equal(body.input[0].content[1].image_url,'data:image/png;base64,AQID');
    return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]});
  });
  assert.deepEqual(actual,result);assert.deepEqual(suggestedGroups(actual),['全穀雜糧']);
});
test('food analysis rejects incomplete, refused and malformed results with safe errors',async()=>{
  for(const data of [{status:'incomplete'}, {status:'completed',output:[{type:'message',content:[{type:'refusal',text:'refused'}]}]}, {status:'completed',output:[{type:'message',content:[{type:'output_text',text:'not JSON'}]}]}]) {
    await assert.rejects(()=>analyzeFood(new Uint8Array([1]),'image/png','test-only-not-a-key',async()=>Response.json(data)),/AI/);
  }
  await assert.rejects(()=>analyzeFood(new Uint8Array([1]),'image/png','test-only-not-a-key',async()=>Response.json({error:{code:'insufficient_quota',message:'DO NOT ECHO'}},{status:429})),e=>e.code==='quota'&&!e.message.includes('DO NOT ECHO'));
  await assert.rejects(()=>analyzeFood(new Uint8Array([1]),'image/png','test-only-not-a-key',async()=>Response.json({error:{code:'credit_balance_exhausted',type:'insufficient_quota'}},{status:429})),e=>e.code==='quota');
  await assert.rejects(()=>analyzeFood(new Uint8Array([1]),'image/png','test-only-not-a-key',async()=>Response.json({error:{code:'rate_limit_exceeded'}},{status:429})),e=>e.code==='rate_limit');
});
test('food categories exclude uncertainty from auto-fill and reject invented fields',()=>{
  assert.deepEqual(suggestedGroups({isFood:false,items:[],uncertainties:[]}),['不確定']);
  assert.throws(()=>validateFoodAnalysis({...result,isFood:false}));
  assert.throws(()=>validateFoodAnalysis({...result,items:[{name:'food',group:'magic',certainty:'較明確'}]}));
  assert.equal(validateFoodAnalysis({...result,calories:999}).calories,undefined);
});
