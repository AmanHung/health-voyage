import * as mobilenet from '@tensorflow-models/mobilenet';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import {inferMealType,type MealType} from '../lib/meal-interview';

export type MealSuggestion={name:string;mealType:MealType;confidence:number};
let model:Awaited<ReturnType<typeof mobilenet.load>>|null=null;
const labelName=(label:string)=>{
  const first=label.split(',')[0].trim();
  const type=inferMealType(label);
  const names:Partial<Record<MealType,string>>={'漢堡／三明治':'漢堡／三明治','湯麵':'湯麵','乾麵／炒麵':'麵類','飯類':'飯類','粥／湯品':'粥／湯品','火鍋':'火鍋','早餐':'早餐','點心／甜品':'點心／甜品','水果':'水果','飲料':'飲料'};
  return {type,name:names[type]||first};
};
export async function classifyMeal(image:HTMLImageElement):Promise<MealSuggestion|null>{
  model ||= await mobilenet.load({version:2,alpha:0.5});
  const predictions=await model.classify(image,8);
  for(const prediction of predictions){
    const mapped=labelName(prediction.className);
    if(mapped.type!=='其他' && prediction.probability>=0.08)return {name:mapped.name,mealType:mapped.type,confidence:prediction.probability};
  }
  // A standard image classifier often sees plates or ingredients instead of a local dish name.
  // Offer a broad, explicitly low-confidence candidate and let the patient confirm it.
  const top=predictions[0];
  if(top && /plate|tray|food|dish|meat|chicken|pork|rice/i.test(top.className))return {name:'便當／餐盤',mealType:'便當／餐盤',confidence:Math.min(top.probability,0.2)};
  return null;
}
