import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMeal, mealSummary, mealFeedback, mealCoaching } from '../lib/meal-domain.ts';
const base = {
  id: 'new',
  date: '2026-09-02',
  period: '午餐',
  groups: ['蔬菜'],
  portion: '一般份',
  eaten: '約一半',
  drink: '無糖',
  goal: '確認這一餐的內容',
  note: '',
};
test('meal questionnaire preserves uncertainty and excludes unsupported guesses', () => {
  assert.equal(
    validateMeal({ ...base, groups: ['不確定'], drink: '不確定' }).drink,
    '不確定',
  );
  for (const change of [
    { groups: [] },
    { groups: ['蔬菜', '不確定'] },
    { groups: ['蔬菜', '蔬菜'] },
    { portion: '' },
    { eaten: 0 },
    { date: '2026-09-03' },
    { note: 'a'.repeat(301) },
  ])
    assert.throws(() => validateMeal({ ...base, ...change }));
  const result = validateMeal({ ...base, calories: 123, aiRecognized: true });
  assert.equal(result.calories, undefined);
  assert.equal(result.aiRecognized, undefined);
  assert.match(
    mealFeedback({ ...base, drink: '不確定' }).join(' '),
    /不能單靠照片判斷/,
  );
});
test('weekly summary counts latest saved meal per day, no future or fabricated missing data', () => {
  assert.deepEqual(mealSummary([]), {
    count: 0,
    vegetables: 0,
    sugary: 0,
    unknownDrink: 0,
    featuresKnown: 0, fried: 0, processed: 0, vegetablesReported: 0, unknownFeatures: 0,
  });
  const records = [
    base,
    { ...base, id: 'old', drink: '含糖' },
    {
      ...base,
      id: 'yesterday',
      date: '2026-09-01',
      drink: '不確定',
      eaten: '未吃',
    },
    { ...base, date: '2026-09-03' },
    { ...base, date: '2026-08-30' },
  ];
  assert.deepEqual(mealSummary(records), {
    count: 2,
    vegetables: 1,
    sugary: 0,
    unknownDrink: 1,
    featuresKnown: 0, fried: 0, processed: 0, vegetablesReported: 2, unknownFeatures: 2,
  });
});

const quick = { ...base, details: { version: 2, vegetableAmount: '約四分之一', features: ['油炸', '加工肉品'], restrictedDiet: false } };
test('quick meal validates confirmations, incompatible choices and conditional vegetables', () => {
  assert.deepEqual(validateMeal(quick).details, quick.details);
  for (const change of [
    { features: [] }, { features: ['油炸', '不確定'] }, { features: ['以上皆無', '加工肉品'] },
    { features: ['油炸', '油炸'] }, { features: ['反式脂肪超標'] }, { features: [null] },
    { vegetableAmount: null }, { vegetableAmount: '100 克' }, { version: 3 }, { restrictedDiet: 'false' },
  ]) assert.throws(() => validateMeal({ ...quick, details: { ...quick.details, ...change } }));
  assert.throws(() => validateMeal({ ...quick, details: null }));
  assert.throws(() => validateMeal({ ...quick, groups: ['豆魚蛋肉'] }));
  assert.equal(validateMeal({ ...quick, groups: ['不確定'], details: { ...quick.details, vegetableAmount: null, features: ['不確定'] } }).details.vegetableAmount, null);
  const normalized = validateMeal({ ...quick, details: { ...quick.details, calories: 900 }, aiRecognized: true });
  assert.equal(normalized.details.calories, undefined);
  assert.equal(normalized.aiRecognized, undefined);
});

test('coaching offers one targeted action without inventing intake or approving clinical use', () => {
  assert.match(mealCoaching(quick).action, /加工肉品/);
  const fat = { ...quick, details: { ...quick.details, features: ['帶皮／明顯肥肉'] } };
  assert.match(mealCoaching(fat).action, /去皮/);
  const fried = { ...quick, details: { ...quick.details, features: ['油炸'] } };
  assert.match(mealCoaching(fried).action, /非油炸/);
  assert.doesNotMatch(mealCoaching(fried).action, /反式脂肪|克|大卡|降.*膽固醇/);
  const plain = { ...quick, details: { ...quick.details, features: ['以上皆無'] } };
  assert.match(mealCoaching({ ...plain, drink: '含糖' }).action, /無糖/);
  assert.match(mealCoaching({ ...plain, drink: '不確定' }).action, /不能單靠照片判斷/);
  assert.match(mealCoaching({ ...plain, details: { ...plain.details, vegetableAmount: '少於四分之一' } }).action, /不代表全天/);
  const restricted = mealCoaching({ ...quick, details: { ...quick.details, restrictedDiet: true } });
  assert.match(restricted.action, /不提供食物替換建議/);
  assert.doesNotMatch(restricted.action, /換成|多搭配|改選/);
  for (const eaten of ['未吃', '不確定']) {
    const c = mealCoaching({ ...quick, eaten });
    assert.match(c.action, /尚未吃|實際攝取/);
    assert.doesNotMatch(c.positive, /有搭配蔬菜/);
    assert.doesNotMatch(c.action, /換成|多搭配/);
  }
  assert.match(mealCoaching({ ...quick, groups: ['不確定'], details: { ...quick.details, vegetableAmount: null } }).action, /不用猜/);
  assert.match(mealCoaching(quick).disclaimer, /尚未經照護團隊個別審核/);
});

test('weekly features use confirmed records only, not missing legacy answers or superseded revisions', () => {
  const records = [quick, { ...base, id: 'old', details: { ...quick.details, features: ['以上皆無'] } },
    { ...base, date: '2026-09-01' },
    { ...quick, date: '2026-08-31', details: { ...quick.details, features: ['不確定'] } }];
  const summary = mealSummary(records);
  assert.equal(summary.count, 3);
  assert.equal(summary.featuresKnown, 1);
  assert.equal(summary.unknownFeatures, 2);
  assert.equal(summary.fried, 1);
  assert.equal(summary.processed, 1);
  assert.equal(mealSummary([{ ...base, details: undefined }]).featuresKnown, 0);
});
