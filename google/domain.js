// Pure validation and aggregation shared with the Apps Script backend tests.
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
    return { kind, date, period: input.period, groups: input.groups, eaten: input.eaten, drink: input.drink, restrictedDiet: input.restrictedDiet, feedbackVersion: 'meal-observation-v1' };
  }
  requireValue(MEDS.includes(input.status), '請選擇用藥情形。');
  return { kind, date, status: input.status };
}
export function latest(records) {
  const map = new Map();
  for (const r of records) map.set(`${r.patientId}:${r.kind}:${r.date}`, r);
  return [...map.values()];
}
export function leaderboard(patients, records, month) {
  return patients.filter(p => p.active && p.participating && !p.isTest).map(p => ({
    nickname: p.nickname,
    steps: latest(records.filter(r => r.patientId === p.id)).filter(r => r.kind === 'exercise' && r.mode === 'steps' && r.date.startsWith(month)).reduce((sum, r) => sum + r.value, 0),
  })).sort((a,b) => b.steps - a.steps).slice(0, 20);
}
export function feedback(meal) {
  if (meal.restrictedDiet) return '已記下這一餐。請依照照護團隊的飲食安排，不自行調整。';
  if (meal.groups.includes('不確定')) return '照片已保存，可請照護團隊協助確認內容。';
  return `已記下${meal.groups.join('、')}，食用量：${meal.eaten}。這是一餐的紀錄，不代表全天營養評估。`;
}
