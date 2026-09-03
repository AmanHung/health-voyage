import type {FoodReceipt} from './food-ai';
export const MEAL_TODAY = '2026-09-02';
export const WEEK_START = '2026-08-31';
export const FOOD_GROUPS = [
  '全穀雜糧',
  '豆魚蛋肉',
  '蔬菜',
  '水果',
  '乳品',
  '油脂與堅果',
  '不確定',
] as const;
export const PERIODS = ['早餐', '午餐', '晚餐', '點心'] as const;
export const AMOUNTS = [
  '全部',
  '約四分之三',
  '約一半',
  '約四分之一',
  '未吃',
  '不確定',
] as const;
export const PORTIONS = ['小份', '一般份', '大份', '不確定'] as const;
export const DRINKS = ['無飲料', '無糖', '含糖', '不確定'] as const;
export const MEAL_GOALS = [
  '確認這一餐的內容',
  '確認飲料是否含糖',
  '記下實際吃了多少',
] as const;
export const GROUP_LABELS: Record<string, string> = {
  全穀雜糧: '飯麵／主食', 豆魚蛋肉: '豆魚蛋肉',
  蔬菜: '蔬菜', 水果: '水果', 乳品: '牛奶／乳品',
  油脂與堅果: '油脂／堅果', 不確定: '不確定',
};
export const VEGETABLE_AMOUNTS = ['少於四分之一', '約四分之一', '約一半或更多', '不確定'] as const;
export const MEAL_FEATURES = ['油炸', '帶皮／明顯肥肉', '加工肉品', '以上皆無', '不確定'] as const;
export type MealDetails = {
  version: 2;
  vegetableAmount: string | null;
  features: string[];
  restrictedDiet: boolean;
};
export const MEAL_FEEDBACK_VERSION = 'one-meal-rules-v1';
export const MEAL_SOURCES = [
  { title: 'AHA：飽和脂肪與食物替換', url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats' },
  { title: 'AHA：2026 心血管飲食指引', url: 'https://professional.heart.org/en/science-news/2026-dietary-guidance-to-improve-cardiovascular-health/top-things-to-know' },
];
export type MealAnswers = {
  date: string;
  period: string;
  groups: string[];
  portion: string;
  eaten: string;
  drink: string;
  goal: string;
  note: string;
  details?: MealDetails;
};
export type MealRecord = MealAnswers & {
  id: string;
  previousId: string | null;
  createdAt: string;
  imageKey: string | null;
  imageType: string | null;
  imageHash: string | null;
  photoReason: string;
  revisionReason: string;
  source: 'self-report';
  analysis?: FoodReceipt | null;
  feedbackVersion?: string;
};
export function validateMeal(input: unknown): MealAnswers {
  if (!input || typeof input !== 'object')
    throw new Error('飲食資料格式不正確。');
  const a = input as MealAnswers;
  if (![WEEK_START, '2026-09-01', MEAL_TODAY].includes(a.date))
    throw new Error('請選擇本週已到的示範日期。');
  for (const [value, options] of [
    [a.period, PERIODS],
    [a.portion, PORTIONS],
    [a.eaten, AMOUNTS],
    [a.drink, DRINKS],
    [a.goal, MEAL_GOALS],
  ] as const) {
    if (!(options as readonly string[]).includes(value))
      throw new Error('請完成餐別、份量、實際食用量、飲料與小任務。');
  }
  if (
    !Array.isArray(a.groups) ||
    !a.groups.length ||
    a.groups.length > 6 ||
    new Set(a.groups).size !== a.groups.length ||
    a.groups.some((g) => !(FOOD_GROUPS as readonly string[]).includes(g)) ||
    (a.groups.includes('不確定') && a.groups.length > 1)
  )
    throw new Error('請確認食物類別；無法判斷可選「不確定」。');
  if (typeof a.note !== 'string' || a.note.length > 300)
    throw new Error('補充說明限 300 字。');
  let details: MealDetails | undefined;
  if (a.details !== undefined) {
    const d = a.details;
    if (!d || d.version !== 2 || typeof d.restrictedDiet !== 'boolean' ||
      !Array.isArray(d.features) || !d.features.length || d.features.length > 3 ||
      new Set(d.features).size !== d.features.length ||
      d.features.some(f => !(MEAL_FEATURES as readonly string[]).includes(f)) ||
      (d.features.some(f => f === '以上皆無' || f === '不確定') && d.features.length !== 1))
      throw new Error('請確認這餐的特徵；不知道可選「不確定」。');
    if (a.groups.includes('蔬菜')) {
      if (!(VEGETABLE_AMOUNTS as readonly string[]).includes(d.vegetableAmount ?? ''))
        throw new Error('請點選蔬菜占比；不知道可選「不確定」。');
    } else if (d.vegetableAmount !== null) {
      throw new Error('未選蔬菜時，不可填入蔬菜占比。');
    }
    details = { version: 2, vegetableAmount: d.vegetableAmount, features: [...d.features], restrictedDiet: d.restrictedDiet };
  }
  return {
    date: a.date,
    period: a.period,
    groups: [...a.groups],
    portion: a.portion,
    eaten: a.eaten,
    drink: a.drink,
    goal: a.goal,
    note: a.note.trim(),
    ...(details ? { details } : {}),
  };
}
export function mealCoaching(a: MealAnswers) {
  const d = a.details;
  const context = `您確認的餐點內容：${a.groups.map(g => GROUP_LABELS[g] ?? g).join('、')}；餐點吃了${a.eaten}；飲料：${a.drink}。`;
  let positive = '願意留下真實的用餐紀錄，就是今天完成的一步。';
  let action = '下次繼續選一餐記錄，不必刻意挑看起來最健康的一餐。';
  if (d?.restrictedDiet) {
    action = '下次回診可帶這份紀錄，請照護團隊依既有飲食計畫協助調整；這裡不提供食物替換建議。';
  } else if (a.eaten === '未吃' || a.eaten === '不確定') {
    action = a.eaten === '未吃' ? '這份餐點尚未吃，不據此評估攝取；下次可記錄實際吃下的一餐。' : '下次用餐後再確認吃了多少；目前不據此推估實際攝取。';
  } else if (a.groups.includes('不確定')) {
    action = '下次可查看菜單或詢問店家，再點選知道的食物類別；不確定不用猜。';
  } else if (d?.features.includes('加工肉品')) {
    action = '下次可把香腸、火腿等加工肉品，換成非油炸的魚、豆製品或較瘦的肉類，選一項就好。';
  } else if (d?.features.includes('帶皮／明顯肥肉')) {
    action = '下次主菜可選去皮、較瘦的肉類，或以魚、豆製品替換一部分。';
  } else if (d?.features.includes('油炸')) {
    action = '下次先試一個小改變：把油炸品換成清蒸、水煮或其他非油炸料理。';
  } else if (a.drink === '含糖') {
    action = '下次這餐的飲料可改選無糖，先從一杯開始。';
  } else if (a.drink === '不確定') {
    action = '下次可查看飲料標示或詢問店家，補上是否含糖；不能單靠照片判斷。';
  } else if (d?.features.includes('不確定')) {
    action = '下次可詢問主菜的做法；不知道有沒有油炸或加工肉品時，不必猜測。';
  } else if (d && (!a.groups.includes('蔬菜') || d.vegetableAmount === '少於四分之一')) {
    action = '下次選餐時，可試著多搭配一份蔬菜；本餐紀錄不代表全天蔬菜攝取不足。';
  } else if (d?.vegetableAmount === '不確定') {
    action = '下次拍照時讓整份餐點入鏡，再觀察蔬菜大約占多少；不必換算成克數。';
  }
  if (!d?.restrictedDiet && a.eaten !== '未吃' && a.eaten !== '不確定' && !a.groups.includes('不確定')) {
    if (a.groups.includes('蔬菜')) positive = '您確認這份餐點有搭配蔬菜，已留下可供下次比較的線索。';
    else if (a.drink === '無糖') positive = '您已確認這餐搭配的是無糖飲料。';
  }
  return { context, positive, action, disclaimer: '僅依本人確認資料提供本餐的一般飲食提醒，尚未經照護團隊個別審核。不估算熱量、油糖鹽、反式脂肪或全天營養達標；有特殊飲食限制請依團隊指示。' };
}
export function mealFeedback(a: MealAnswers) {
  if (a.details) {
    const c = mealCoaching(a);
    return [c.context, c.positive, c.action, c.disclaimer];
  }
  const notes = [
    `這餐由您確認為：${a.groups.join('、')}；原本份量：${a.portion}；實際食用量：${a.eaten}。`,
  ];
  if (a.drink === '不確定')
    notes.push(
      '下次可查看飲料標示或詢問店家，補上是否含糖；不能單靠照片判斷。',
    );
  else notes.push(`飲料紀錄：${a.drink}。這是您提供的資訊，不是影像辨識結果。`);
  if (a.groups.includes('不確定'))
    notes.push('可補寫餐點名稱或配料，之後與照護團隊討論。');
  notes.push(
    '這份紀錄不估算熱量、鈉或營養是否足夠；特殊飲食限制請依照護團隊指示。',
  );
  return notes;
}
export function latestMeals(records: MealRecord[]) {
  const days = new Map<string, MealRecord>();
  // API returns newest revisions first; edits replace a day in summaries, not in the audit trail.
  for (const r of records) if (!days.has(r.date)) days.set(r.date, r);
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}
export function mealSummary(records: MealRecord[]) {
  const meals = latestMeals(records).filter(
    (r) => r.date >= WEEK_START && r.date <= MEAL_TODAY,
  );
  return {
    count: meals.length,
    vegetables: meals.filter(
      (r) =>
        r.groups.includes('蔬菜') && r.eaten !== '未吃' && r.eaten !== '不確定',
    ).length,
    sugary: meals.filter((r) => r.drink === '含糖').length,
    unknownDrink: meals.filter((r) => r.drink === '不確定').length,
    featuresKnown: meals.filter(r => r.details && !r.details.features.includes('不確定')).length,
    fried: meals.filter(r => r.details?.features.includes('油炸')).length,
    processed: meals.filter(r => r.details?.features.includes('加工肉品')).length,
    vegetablesReported: meals.filter(r => r.groups.includes('蔬菜')).length,
    unknownFeatures: meals.filter(r => !r.details || r.details.features.includes('不確定')).length,
  };
}
