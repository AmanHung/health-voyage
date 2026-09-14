import type { AdminPatient, RecordItem } from '../production/api';

type Cell = string | number;
export type ExportSheet = { name: string; headers: string[]; rows: Cell[][] };
const flag = (v: boolean | null | undefined): string => v == null ? '' : v ? '是' : '否';
export function taiwanTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() + 28800000).toISOString().slice(0, 19).replace('T', ' ') : value;
}
export function exportRangeValid(from: string, to: string): boolean {
  const valid = (s: string) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  return valid(from) && valid(to) && (!from || !to || from <= to);
}
export function patientExportSheets(patient: AdminPatient, records: RecordItem[], from = '', to = '', now = new Date()): ExportSheet[] {
  if (!exportRangeValid(from, to)) throw new Error('請確認起訖日期，結束日期不可早於開始日期。');
  // Match the server's append order: a deleted latest revision must not revive its predecessor.
  const latest = new Map<string, RecordItem>();
  for (const r of records) if (r.patientId === patient.id) latest.set(`${r.date}:${r.kind}`, r);
  const rows = [...latest.values()].filter(r => !r.deletedAt && (!from || r.date >= from) && (!to || r.date <= to)).sort((a,b) => a.date.localeCompare(b.date));
  const common = ['日期', '紀錄編號', '回報時間（臺灣）'];
  const base = (r: RecordItem): Cell[] => [r.date, r.id, taiwanTimestamp(r.createdAt)];
  const exercise = rows.filter(r => r.kind === 'exercise');
  const meals = rows.filter(r => r.kind === 'meal');
  const medicines = rows.filter(r => r.kind === 'medicine');
  return [
    { name: '個案摘要', headers: ['項目', '內容'], rows: [
      ['個案編號', patient.id], ['姓名', patient.name], ['暱稱', patient.nickname],
      ['帳號狀態', patient.deletedAt ? '已刪除' : patient.active ? '使用中' : '已停用'],
      ['匯出時間（臺灣）', taiwanTimestamp(now.toISOString())], ['開始日期', from || '不限'], ['結束日期', to || '不限'],
      ['運動紀錄筆數', exercise.length], ['飲食紀錄筆數', meals.length], ['用藥回報筆數', medicines.length],
      ['資料範圍', '每日期、每項目僅保留最新有效紀錄；不包含已刪除紀錄與修訂舊版本。'],
      ['用藥說明', '回報完成不代表全部已服用；實際狀態請看服藥明細。尚未回報的服藥項目不在明細內。'],
      ['空白欄位', '代表未記錄或不適用；照片不包含在此檔案。'],
    ] },
    { name: '運動紀錄', headers: [...common, '紀錄方式', '確認數值', '單位', '活動', '辨識原始數值', '有照片', '回饋'], rows: exercise.map(r => [...base(r), r.mode === 'steps' ? '步數' : '運動時間', r.value ?? '', r.mode === 'steps' ? '步' : '分鐘', r.activity ?? '', r.recognized ?? '', flag(r.hasImage), r.feedback ?? '']) },
    { name: '飲食紀錄', headers: [...common, '餐別', '餐點名稱', '餐點類型', '食物分類', '烹調方式', '主食份量', '蔬菜份量', '蛋白質份量', '喝湯份量', '配餐', '原本份量', '加工食品', '實際吃下份量', '飲料', '飲食限制', '有照片', '回饋'], rows: meals.map(r => {
      const m = r.mealDetails;
      return [...base(r), r.period ?? '', m?.mealName ?? '', m?.mealType ?? '', r.groups?.join('、') ?? '', m?.cookingMethod ?? '', m?.stapleAmount ?? '', m?.vegetableAmount ?? '', m?.proteinAmount ?? '', m?.soupAmount ?? '', m?.sideDish ?? '', m?.portionSize ?? '', m?.processedFood ?? '', m?.eaten ?? r.eaten ?? '', m?.drink ?? r.drink ?? '', flag(m?.restrictedDiet ?? r.restrictedDiet), flag(r.hasImage), r.feedback ?? ''];
    }) },
    { name: '用藥回報', headers: [...common, '回報狀態', '回報完成（非服藥率）', '預期固定服藥項目數', '已回報項目數', '當日無固定用藥', '回饋'], rows: medicines.map(r => [...base(r), r.status ?? '', flag(r.medicationComplete), r.medicationExpected ?? '', r.medicationDoses?.length ?? '', flag(r.medicationNoScheduled), r.feedback ?? '']) },
    { name: '服藥明細', headers: [...common, '清單版本', '藥品代碼', '藥品名稱', '規格', '服藥時間', '服用時段', '每次用量', '單位', '途徑', '需要時使用', '服用情形', '原因或疑問', '項目回報時間（臺灣）', '個案提醒'], rows: medicines.flatMap(r => (r.medicationDoses ?? []).map(d => [...base(r), d.planId, d.code, d.name, d.strength, d.time, d.label, d.amount, d.unit, d.route, flag(d.prn), d.status, d.reason, taiwanTimestamp(d.reportedAt), d.note])) },
  ];
}
