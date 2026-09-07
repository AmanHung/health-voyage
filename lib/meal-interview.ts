export const MEAL_TYPES = ['便當／餐盤','自助餐','漢堡／三明治','湯麵','乾麵／炒麵','飯類','粥／湯品','火鍋','早餐','點心／甜品','水果','飲料','其他'] as const;
export const COOKING_METHODS = ['油炸','煎／炒','烤／滷','蒸／煮','生食','不知道','不適用'] as const;
export const STAPLE_AMOUNTS = ['沒有','少於半碗','約半碗','約一碗','超過一碗','不知道'] as const;
export const VEGETABLE_AMOUNTS = ['沒有','少於一份','約一份','兩份以上','不知道'] as const;
export const PROTEIN_AMOUNTS = ['沒有','少於一掌心','約一掌心','兩掌心以上','不知道'] as const;
export const SOUP_AMOUNTS = ['沒有喝湯','少於半碗','約半碗','一碗以上','不知道'] as const;
export const SIDES = ['沒有配餐','薯條／炸物','沙拉／蔬菜','其他','不知道'] as const;
export const PORTION_SIZES = ['小份','一般份量','大份','不知道'] as const;
export const PROCESSED_FOOD = ['有','沒有','不知道'] as const;
export const EATEN = ['全部','約一半','少量','還沒吃','不知道'] as const;
export const DRINKS = ['沒有飲料','白開水','無糖飲料','含糖飲料','不知道'] as const;

export type MealType = typeof MEAL_TYPES[number];
export type MealInterview = {
  mealType: MealType | '';
  mealName: string;
  cookingMethod: string;
  stapleAmount: string;
  vegetableAmount: string;
  proteinAmount: string;
  soupAmount: string;
  sideDish: string;
  portionSize: string;
  processedFood: string;
  eaten: string;
  drink: string;
  restrictedDiet: boolean | null;
  source: 'model-confirmed'|'patient-entered'|'patient-selected';
  modelSuggestion: string;
};

export const emptyMealInterview = (): MealInterview => ({mealType:'',mealName:'',cookingMethod:'',stapleAmount:'',vegetableAmount:'',proteinAmount:'',soupAmount:'',sideDish:'',portionSize:'',processedFood:'',eaten:'',drink:'',restrictedDiet:null,source:'patient-selected',modelSuggestion:''});

const soupMeals = new Set<MealType>(['湯麵','粥／湯品','火鍋']);
const mixedMeals = new Set<MealType>(['便當／餐盤','自助餐','湯麵','乾麵／炒麵','飯類','粥／湯品','火鍋','早餐','其他']);
const cookingMeals = new Set<MealType>(['便當／餐盤','自助餐','漢堡／三明治','乾麵／炒麵','飯類','早餐','點心／甜品','其他']);
const processedMeals = new Set<MealType>(['便當／餐盤','自助餐','漢堡／三明治','湯麵','乾麵／炒麵','飯類','粥／湯品','火鍋','早餐']);

export type MealQuestionKey='cookingMethod'|'stapleAmount'|'vegetableAmount'|'proteinAmount'|'soupAmount'|'sideDish'|'portionSize'|'processedFood'|'eaten'|'drink'|'restrictedDiet';
export function mealQuestionKeys(type:MealType):MealQuestionKey[]{
  const keys:MealQuestionKey[]=[];
  if(cookingMeals.has(type))keys.push('cookingMethod');
  if(mixedMeals.has(type) || type==='漢堡／三明治')keys.push('stapleAmount');
  if(mixedMeals.has(type) || type==='漢堡／三明治')keys.push('vegetableAmount','proteinAmount');
  if(soupMeals.has(type))keys.push('soupAmount');
  if(type==='漢堡／三明治')keys.push('sideDish');
  if(['點心／甜品','水果','飲料'].includes(type))keys.push('portionSize');
  if(processedMeals.has(type))keys.push('processedFood');
  keys.push('eaten');
  if(type!=='水果')keys.push('drink');
  keys.push('restrictedDiet');
  return keys;
}

export function inferMealType(text:string):MealType{
  const value=text.toLowerCase();
  if(/便當|餐盒|餐盤|bento|lunch box/.test(value))return '便當／餐盤';
  if(/自助餐|buffet/.test(value))return '自助餐';
  if(/漢堡|三明治|吐司|burger|cheeseburger|sandwich|hotdog|hot dog/.test(value))return '漢堡／三明治';
  if(/湯麵|拉麵|牛肉麵|餛飩麵|ramen|noodle soup|pho/.test(value))return '湯麵';
  if(/乾麵|炒麵|義大利麵|麵|pasta|spaghetti|carbonara|noodle/.test(value))return '乾麵／炒麵';
  if(/炒飯|燴飯|丼|咖哩飯|飯|rice/.test(value))return '飯類';
  if(/粥|濃湯|羹|湯|porridge|congee|soup|consomme/.test(value))return '粥／湯品';
  if(/火鍋|鍋物|涮涮鍋|hot.?pot/.test(value))return '火鍋';
  if(/蛋餅|燒餅|油條|飯糰|早餐|bagel|pretzel|waffle|pancake/.test(value))return '早餐';
  if(/蛋糕|餅乾|甜點|冰淇淋|布丁|cake|cookie|ice cream|dessert/.test(value))return '點心／甜品';
  if(/水果|蘋果|香蕉|橘|柳橙|fruit|apple|banana|orange|strawberry/.test(value))return '水果';
  if(/飲料|咖啡|茶|果汁|奶茶|coffee|espresso|juice|beverage/.test(value))return '飲料';
  return '其他';
}

export function groupsFromInterview(a:MealInterview){
  const groups:string[]=[];
  if(a.stapleAmount && !['沒有','不適用'].includes(a.stapleAmount))groups.push('主食');
  if(a.proteinAmount && !['沒有','不適用'].includes(a.proteinAmount))groups.push('豆魚蛋肉');
  if(a.vegetableAmount && !['沒有','不適用'].includes(a.vegetableAmount))groups.push('蔬菜');
  if(a.mealType==='水果')groups.push('水果');
  if(a.mealType==='飲料' && /奶|乳/.test(a.mealName))groups.push('乳品');
  return groups.length?[...new Set(groups)]:['不確定'];
}

export function mealInterviewComplete(a:MealInterview){
  if(!a.mealType || !a.mealName.trim())return false;
  return mealQuestionKeys(a.mealType).every(key=>key==='restrictedDiet'?a.restrictedDiet!==null:Boolean(a[key]));
}

export function questionLabel(key:MealQuestionKey,name:string){
  const labels:Record<MealQuestionKey,string>={
    cookingMethod:`${name||'主餐'}主要怎麼料理？`,stapleAmount:'飯、麵或麵包有多少？',vegetableAmount:'蔬菜大約有幾份？',proteinAmount:'肉、魚、蛋或豆腐有多少？',soupAmount:'這餐喝了多少湯？',sideDish:'漢堡旁邊有什麼配餐？',portionSize:'原本是哪種份量？',processedFood:'有香腸、火腿、培根或丸餃嗎？',eaten:'最後吃了多少？',drink:'這餐喝什麼？',restrictedDiet:'照護團隊有交代飲食限制嗎？'
  };return labels[key];
}

export function questionOptions(key:MealQuestionKey){
  return ({cookingMethod:COOKING_METHODS,stapleAmount:STAPLE_AMOUNTS,vegetableAmount:VEGETABLE_AMOUNTS,proteinAmount:PROTEIN_AMOUNTS,soupAmount:SOUP_AMOUNTS,sideDish:SIDES,portionSize:PORTION_SIZES,processedFood:PROCESSED_FOOD,eaten:EATEN,drink:DRINKS,restrictedDiet:['有','沒有']} as const)[key];
}
