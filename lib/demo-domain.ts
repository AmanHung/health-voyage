export type Exercise = { steps: number | null; minutes: number | null; kind: string };
export type MedicineStatus = '' | 'taken' | 'later' | 'missed' | 'question';
export type MedicineEntry = { status: MedicineStatus; reason: string };
export type Medicines = { morning: MedicineEntry; evening: MedicineEntry };
export const statusLabels: Record<MedicineStatus, string> = {
  '': '尚未回報',
  taken: '已服用',
  later: '稍後再記',
  missed: '未服用',
  question: '有疑問',
};
export function validateExercise(value: unknown): Exercise {
  if (!value || typeof value !== 'object') throw new Error('請填寫運動紀錄。');
  const x = value as Partial<Exercise>;
  if (!Number.isInteger(x.steps) || x.steps! < 0 || x.steps! > 100000)
    throw new Error('步數請填寫 0～100,000 的整數。');
  if (!Number.isInteger(x.minutes) || x.minutes! < 0 || x.minutes! > 1440)
    throw new Error('運動時間請填寫 0～1,440 分鐘的整數。');
  if (!['步行', '伸展', '自行車', '其他', '今日休息'].includes(x.kind!))
    throw new Error('請選擇運動種類。');
  return { steps: x.steps!, minutes: x.minutes!, kind: x.kind! };
}
export function medicineComplete(m: Medicines): boolean {
  return [m.morning, m.evening].every((x) =>
    ['taken', 'missed', 'question'].includes(x.status),
  );
}
export function completion(
  exercise: Exercise | null,
  hasMeal: boolean,
  meds: Medicines,
) {
  return Number(!!exercise) + Number(hasMeal) + Number(medicineComplete(meds));
}
export function needsCare(meds: Medicines) {
  return [meds.morning, meds.evening].some(
    (x) => x.status === 'missed' || x.status === 'question',
  );
}
export function sanitizeMedicines(meds: Medicines): Medicines {
  const clean = (entry: MedicineEntry): MedicineEntry => ({
    status: entry.status,
    reason: ['missed', 'question'].includes(entry.status)
      ? entry.reason.trim()
      : '',
  });
  return { morning: clean(meds.morning), evening: clean(meds.evening) };
}
export function validInvitation(name: string, code: string) {
  return name === '王示範' && code.trim().toUpperCase() === 'HV2026';
}
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
