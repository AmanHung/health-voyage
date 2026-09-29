import type {MealQuestionKey,MealType} from './meal-interview';
// Interview context mirrors the existing heart-table catalog: cooking, portions,
// processed meat, vegetables, soup and sugar. Answers remain patient-confirmed.
export function mealQuestionHint(key:MealQuestionKey,type:MealType|''){
  const hints:Partial<Record<MealQuestionKey,string>>={
    cookingMethod:'護心餐桌會依料理方式區分食物；請回答主要食物的做法，不知道可以直接選「不知道」。',
    stapleAmount:type==='漢堡／三明治'?'麵包也是主食；不用硬換算成碗數，不確定就選「不知道」。':'飯、麵與粥都屬主食，請記下原本份量；全穀也需要留意份量。',
    vegetableAmount:'護心餐桌把蔬菜與主食分開；請依實際搭配回答，不確定份量可以選「不知道」。',
    proteinAmount:'把肉、魚、蛋與豆腐一起考慮；以自己的手掌大小估計，不必換算克數。',
    soupAmount:'湯麵、湯品與火鍋請記下實際喝的湯量；清湯也不一定低鈉。',
    sideDish:'配餐也會影響這餐的選擇；請確認是炸物、蔬菜或其他。',
    portionSize:type==='水果'?'整顆水果與果汁不同；如果是果汁，請回上一題改選「飲料」。':'依店家或自己準備的份量回答，不需要估算熱量。',
    processedFood:'香腸、火腿、培根與丸餃屬加工品；不確定成分可以選「不知道」。',
    eaten:type==='飲料'?'請記下實際喝了多少；還沒喝可選「還沒吃」。':'請記下實際吃下的量，剩下的部分不算已吃。',
    drink:'以標示或店家說明確認是否加糖；照片無法分辨糖量。',
  };
  return hints[key]||'';
}
