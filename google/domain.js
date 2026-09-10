// Pure validation and aggregation shared with the Apps Script backend tests.
import {MEAL_TYPES,COOKING_METHODS,STAPLE_AMOUNTS,VEGETABLE_AMOUNTS,PROTEIN_AMOUNTS,SOUP_AMOUNTS,SIDES,PORTION_SIZES,PROCESSED_FOOD,EATEN as INTERVIEW_EATEN,DRINKS as INTERVIEW_DRINKS,mealQuestionKeys,groupsFromInterview} from '../lib/meal-interview.ts';
export const GROUPS = ['主食', '豆魚蛋肉', '蔬菜', '水果', '乳品', '不確定'];
export const MEDS = ['已服用', '未服用', '有疑問', '今日無需服藥'];
export function requireValue(ok, message) { if (!ok) throw new Error(message); }
export function cleanText(value, min, max, label) {
  requireValue(typeof value === 'string', `請填寫${label}。`);
  const text = value.trim();
  requireValue(text.length >= min && text.length <= max && !/[\u0000-\u001f\u007f]/.test(text), `請確認${label}。`);
  return text;
}
export function dayKey(now = new Date()) { return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10); }
export function validDay(value, today) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), '請選擇日期。');
  const parsed = new Date(value + 'T00:00:00Z');
  requireValue(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value, '日期不正確。');
  requireValue(value <= today && (Date.parse(today) - parsed.getTime()) <= 30 * 86400000, '僅能記錄最近 30 天，不能選擇未來日期。');
  return value;
}
export function validateRecord(input, today) {
  requireValue(input && typeof input === 'object', '紀錄格式不正確。');
  const date = validDay(input.date, today);
  const kind = input.kind;
  requireValue(['exercise', 'meal', 'medicine'].includes(kind), '紀錄類型不正確。');
  if (kind === 'exercise') {
    const mode = input.mode;
    requireValue(['steps', 'minutes'].includes(mode), '請選擇步數或分鐘。');
    requireValue(Number.isInteger(input.value) && input.value >= 0 && input.value <= (mode === 'steps' ? 100000 : 1440), '請確認步數或分鐘。');
    requireValue(['步行', '伸展', '自行車', '其他', '休息'].includes(input.activity), '請選擇運動種類。');
    const recognized = input.recognized == null ? null : Number(input.recognized);
    requireValue(recognized === null || (Number.isInteger(recognized) && recognized >= 0 && recognized <= (mode === 'steps' ? 100000 : 1440)), '辨識數值不正確。');
    return { kind, date, mode, value: input.value, activity: input.activity, recognized, manuallyCorrected: recognized !== null && recognized !== input.value };
  }
  if (kind === 'meal') {
    requireValue(['早餐', '午餐', '晚餐', '點心'].includes(input.period), '請選擇餐別。');
    requireValue(Array.isArray(input.groups) && input.groups.length > 0 && input.groups.length <= 5 && new Set(input.groups).size === input.groups.length && input.groups.every(g => GROUPS.includes(g)), '請選擇食物類別。');
    requireValue(!input.groups.includes('不確定') || input.groups.length === 1, '不確定不能與其他類別一起選。');
    requireValue(['全部', '約一半', '少量', '不確定'].includes(input.eaten), '請選擇吃了多少。');
    requireValue(['無飲料', '無糖', '含糖', '不確定'].includes(input.drink), '請選擇飲料。');
    requireValue(typeof input.restrictedDiet === 'boolean', '請確認飲食限制。');
    let mealDetails;
    if(input.mealDetails!=null){
      const m=input.mealDetails;
      requireValue(m && typeof m==='object' && MEAL_TYPES.includes(m.mealType),'請確認餐點類型。');
      const options={cookingMethod:COOKING_METHODS,stapleAmount:STAPLE_AMOUNTS,vegetableAmount:VEGETABLE_AMOUNTS,proteinAmount:PROTEIN_AMOUNTS,soupAmount:SOUP_AMOUNTS,sideDish:SIDES,portionSize:PORTION_SIZES,processedFood:PROCESSED_FOOD,eaten:INTERVIEW_EATEN,drink:INTERVIEW_DRINKS};
      const cleaned={mealType:m.mealType,mealName:cleanText(m.mealName,1,40,'餐點名稱'),cookingMethod:'',stapleAmount:'',vegetableAmount:'',proteinAmount:'',soupAmount:'',sideDish:'',portionSize:'',processedFood:'',eaten:'',drink:'',restrictedDiet:m.restrictedDiet,source:m.source,modelSuggestion:typeof m.modelSuggestion==='string'?m.modelSuggestion.trim().slice(0,40):''};
      requireValue(['model-confirmed','patient-entered','patient-selected'].includes(m.source),'餐點確認來源不正確。');
      requireValue(typeof m.restrictedDiet==='boolean','請確認飲食限制。');
      for(const key of Object.keys(options)){
        const value=typeof m[key]==='string'?m[key]:'';
        requireValue(value===''||options[key].includes(value),`請確認${key}。`);cleaned[key]=value;
      }
      for(const key of mealQuestionKeys(m.mealType))requireValue(key==='restrictedDiet'||cleaned[key], '請完成餐點問答。');
      requireValue(JSON.stringify(groupsFromInterview(cleaned))===JSON.stringify(input.groups),'餐點內容不一致，請重新確認。');
      mealDetails=cleaned;
    }
    return { kind, date, period: input.period, groups: input.groups, eaten: input.eaten, drink: input.drink, restrictedDiet: input.restrictedDiet, ...(mealDetails?{mealDetails}:{}), feedbackVersion: mealDetails?'meal-guided-qa-v1':'meal-observation-v1' };
  }
  requireValue(MEDS.includes(input.status), '請選擇用藥情形。');
  return { kind, date, status: input.status };
}
export function latest(records, includeDeleted = false) {
  const map = new Map();
  for (const r of records) map.set(`${r.patientId}:${r.kind}:${r.date}`, r);
  // Select the final revision before filtering: deleting a record must never
  // reveal an earlier revision as if it were still current.
  return [...map.values()].filter(r => includeDeleted || !r.deletedAt);
}
export function leaderboard(patients, records, month) {
  return patients.filter(p => p.active && !p.deletedAt && !p.isTest).map(p => ({
    nickname: p.nickname,
    steps: latest(records.filter(r => r.patientId === p.id)).filter(r => r.kind === 'exercise' && r.mode === 'steps' && r.date.startsWith(month)).reduce((sum, r) => sum + r.value, 0),
  })).sort((a,b) => b.steps - a.steps).slice(0, 20);
}
export function feedback(meal) {
  if (meal.restrictedDiet) return '已記下這一餐。請依照照護團隊的飲食安排，不自行調整。';
  if (meal.mealDetails) {
    const m=meal.mealDetails;
    if(m.eaten==='還沒吃')return `已記下${m.mealName}，尚未食用，不據此評估攝取。`;
    if(m.drink==='含糖飲料')return `已記下${m.mealName}。下一餐可優先選白開水或無糖飲料。`;
    if(m.vegetableAmount==='沒有'||m.vegetableAmount==='少於一份')return `已記下${m.mealName}。下一餐可試著多搭配一份蔬菜。`;
    if(m.cookingMethod==='油炸'||m.sideDish==='薯條／炸物')return `已記下${m.mealName}。下一餐可試著選一項非油炸食物。`;
    if(m.processedFood==='有')return `已記下${m.mealName}。下一餐可少選一項加工肉品或丸餃。`;
    return `已記下${m.mealName}與您確認的份量。這是一餐的紀錄，不代表全天營養評估。`;
  }
  if (meal.groups.includes('不確定')) return '照片已保存，可請照護團隊協助確認內容。';
  return `已記下${meal.groups.join('、')}，食用量：${meal.eaten}。這是一餐的紀錄，不代表全天營養評估。`;
}
