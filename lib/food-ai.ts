export const AI_FOOD_GROUPS = ['全穀雜糧','豆魚蛋肉','蔬菜','水果','乳品','油脂與堅果','不確定'] as const;
export type FoodAnalysis = {isFood:boolean;items:{name:string;group:string;certainty:'較明確'|'待確認'}[];uncertainties:string[]};
export type FoodReceipt = {id:string;imageHash:string;model:string;createdAt:string;result:FoodAnalysis};
export function validateFoodAnalysis(value:unknown):FoodAnalysis {
  const a=value as FoodAnalysis;
  if(!a || typeof a.isFood!=='boolean' || !Array.isArray(a.items) || a.items.length>12 || !Array.isArray(a.uncertainties) || a.uncertainties.length>6)throw new Error('AI 回傳格式不完整，請改用手動確認。');
  for(const i of a.items) if(!i || typeof i.name!=='string' || !i.name.trim() || i.name.length>80 || !(AI_FOOD_GROUPS as readonly string[]).includes(i.group) || !['較明確','待確認'].includes(i.certainty))throw new Error('AI 回傳格式不完整，請改用手動確認。');
  if(a.uncertainties.some(x=>typeof x!=='string'||x.length>300) || (!a.isFood && a.items.length))throw new Error('AI 回傳格式不完整，請改用手動確認。');
  return {isFood:a.isFood,items:a.items.map(i=>({name:i.name.trim(),group:i.group,certainty:i.certainty})),uncertainties:[...a.uncertainties]};
}
export function suggestedGroups(result:FoodAnalysis) {
  const known=[...new Set(result.items.filter(i=>i.certainty==='較明確'&&i.group!=='不確定').map(i=>i.group))];
  return known.length?known:['不確定'];
}
