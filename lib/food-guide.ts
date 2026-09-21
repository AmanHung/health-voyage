import catalog from './food-catalog.json';
import type {RecordItem} from '../production/api';

export type Food = typeof catalog[number];
export const foods: Food[] = catalog;
export const foodCategories = ['全部', ...new Set(foods.map(f=>f.cat))];
export const categoryIcons: Record<string,string> = {'主食':'🍚','豆魚蛋肉':'🍖','蔬菜':'🥦','水果':'🍎','點心':'🍦','飲品':'🥛','油脂調味':'🧂','湯品其他':'🍲'};
export const foodLights: Record<string,{name:string;meaning:string}> = {
  red:{name:'紅燈',meaning:'建議少選'}, yellow:{name:'黃燈',meaning:'留意份量'},
  review:{name:'灰燈',meaning:'先詢問照護團隊'}, green:{name:'綠燈',meaning:'優先選擇'},
};
const lightOrder: Record<string,number> = {red:0,yellow:1,review:2,green:3};
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/土司/g,'吐司').replace(/臺/g,'台').replace(/\s+/g,'');
export function findFoods(category:string,query:string) {
  const q=normalize(query);
  return foods.filter(f=>(category==='全部'||f.cat===category)&&(!q||normalize(f.name+' '+f.aliases).includes(q))).sort((a,b)=>lightOrder[a.color]-lightOrder[b.color]);
}
// The current backend stores one current meal record per date. Revisions must
// never be presented as additional meals or completion credit.
export function currentMeals(records:RecordItem[],today:string) {
  const byDate=new Map<string,RecordItem>();
  for(const record of records) {
    if(record.kind!=='meal'||record.deletedAt||record.date>today)continue;
    const previous=byDate.get(record.date);
    if(!previous||record.createdAt>previous.createdAt)byDate.set(record.date,record);
  }
  return [...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export function mealWeek(records:RecordItem[],today:string) {
  const start=new Date(today+'T00:00:00Z');
  start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);
  const days=Array.from({length:7},(_,i)=>{
    const date=new Date(start);date.setUTCDate(date.getUTCDate()+i);return date.toISOString().slice(0,10);
  });
  const meals=currentMeals(records,today).filter(r=>r.date>=days[0]);
  return {days,meals,recordedDays:meals.length};
}
