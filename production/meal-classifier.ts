import * as mobilenet from '@tensorflow-models/mobilenet';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import {inferMealType,type MealType} from '../lib/meal-interview.ts';

export type MealSuggestion={name:string;mealType:MealType;confidence:number};
export type MealPrediction={className:string;probability:number};
let model:Awaited<ReturnType<typeof mobilenet.load>>|null=null;
const labelName=(label:string)=>{
  const first=label.split(',')[0].trim();
  if(/\b(plate|cup|mug|bowl|tray|container|pot|pan)\b/i.test(first))return {type:'其他' as MealType,name:first};
  const type=inferMealType(label);
  const names:Partial<Record<MealType,string>>={'漢堡／三明治':'漢堡／三明治','湯麵':'湯麵','乾麵／炒麵':'麵類','飯類':'飯類','粥／湯品':'粥／湯品','火鍋':'火鍋','早餐':'早餐','點心／甜品':'點心／甜品','水果':'水果','飲料':'飲料'};
  return {type,name:names[type]||first};
};
export function suggestMeal(predictions:MealPrediction[]):MealSuggestion|null{
  // Only accept a strong, unambiguous food prediction. Containers are not meals.
  const ranked=predictions.filter(p=>Number.isFinite(p.probability)&&p.probability>=0&&p.probability<=1).sort((a,b)=>b.probability-a.probability);
  const top=ranked[0];
  if(!top||top.probability<0.35)return null;
  const mapped=labelName(top.className);
  if(mapped.type==='其他')return null;
  const rival=ranked.find(p=>labelName(p.className).type!==mapped.type);
  if(rival&&top.probability-rival.probability<0.15)return null;
  return {name:mapped.name,mealType:mapped.type,confidence:top.probability};
}
export async function classifyMeal(image:HTMLImageElement):Promise<MealSuggestion|null>{
  model ||= await mobilenet.load({version:2,alpha:0.5});
  return suggestMeal(await model.classify(image,8));
}
