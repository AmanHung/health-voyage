// Shared scheduling rules. All effective times use Taiwan local ISO minutes.
export const DOSE_STATUSES = ['已服用', '未服用', '有疑問'] as const;
export const MEDICATION_PERIODS = [
  '早餐前',
  '早餐後',
  '午餐前',
  '午餐後',
  '晚餐前',
  '晚餐後',
  '睡前',
  '指定時間',
] as const;
export type MedicationSlot = { time: string; label: string; amount: number };
export type MedicationItem = {
  id: string;
  code: string;
  name: string;
  strength: string;
  unit: string;
  route: string;
  note: string;
  hasImage: boolean;
  active: boolean;
  days: number[];
  start: string;
  end: string;
  prn: boolean;
  slots: MedicationSlot[];
};
export type MedicationPlan = {
  id: string;
  patientId: string;
  effectiveFrom: string;
  createdAt: string;
  createdBy: string;
  items: MedicationItem[];
  previousId: string | null;
};
export type MedicationDose = {
  key: string;
  planId: string;
  itemId: string;
  code: string;
  name: string;
  strength: string;
  unit: string;
  route: string;
  note: string;
  hasImage: boolean;
  time: string;
  label: string;
  amount: number;
  prn: boolean;
};
export type DoseReport = MedicationDose & {
  status: (typeof DOSE_STATUSES)[number];
  reason: string;
  reportedAt: string;
};
export function taiwanMinute(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 16);
}
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function text(value: unknown, max: number, required = false) {
  check(
    typeof value === 'string' &&
      value.trim().length <= max &&
      (!required || value.trim().length > 0) &&
      !/[\u0000-\u001f\u007f]/.test(value),
    '請確認用藥欄位。',
  );
  return value.trim();
}
export function medicationDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function medicationTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function validateMedicationPlan(input: unknown, now: string) {
  const p = input as { effectiveFrom: string; items: MedicationItem[] };
  check(
    p && typeof p === 'object' && typeof p.effectiveFrom === 'string',
    '請設定生效時間。',
  );
  check(
    p.effectiveFrom.length === 16 &&
      medicationDay(p.effectiveFrom.slice(0, 10)) &&
      p.effectiveFrom[10] === 'T' &&
      medicationTime(p.effectiveFrom.slice(11)) &&
      p.effectiveFrom >= now,
    '生效時間不能回溯修改。',
  );
  check(
    Array.isArray(p.items) && p.items.length <= 20,
    '每份清單最多 20 項藥品。',
  );
  const items = p.items.map((m) => {
    check(m && typeof m === 'object', '藥品格式不正確。');
    const id = text(m.id, 64, true),
      code = text(m.code, 24);
    check(
      /^[a-zA-Z0-9-]+$/.test(id) && (!code || /^[a-zA-Z0-9_-]+$/.test(code)),
      '藥品代碼格式不正確。',
    );
    check(
      typeof m.active === 'boolean' &&
        typeof m.prn === 'boolean' &&
        typeof m.hasImage === 'boolean',
      '請確認藥品狀態。',
    );
    check(
      Array.isArray(m.days) &&
        m.days.length > 0 &&
        m.days.length <= 7 &&
        new Set(m.days).size === m.days.length &&
        m.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
      '請選擇使用星期。',
    );
    check(
      medicationDay(m.start) &&
        (!m.end || (medicationDay(m.end) && m.end >= m.start)),
      '請確認藥品起訖日期。',
    );
    check(
      Array.isArray(m.slots) &&
        m.slots.length >= 1 &&
        m.slots.length <= 8 &&
        (!m.prn || m.slots.length === 1),
      '請設定服用時段；需要時用藥請設定一個每次用量。',
    );
    const slots = m.slots
      .map((s) => {
        check(
          s &&
            medicationTime(s.time) &&
            MEDICATION_PERIODS.includes(
              s.label as (typeof MEDICATION_PERIODS)[number],
            ),
          '請確認時段與時間。',
        );
        check(
          typeof s.amount === 'number' &&
            Number.isFinite(s.amount) &&
            s.amount > 0 &&
            s.amount <= 10000,
          '請填寫有效的每次用量。',
        );
        return { time: s.time, label: s.label, amount: s.amount };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
    check(
      new Set(slots.map((s) => s.time)).size === slots.length,
      '同一藥品不能重複設定相同時間。',
    );
    return {
      id,
      code,
      name: text(m.name, 100, true),
      strength: text(m.strength ?? '', 60),
      unit: text(m.unit, 12, true),
      route: text(m.route, 30, true),
      note: text(m.note, 160),
      hasImage: !!code && m.hasImage,
      active: m.active,
      days: [...m.days].sort(),
      start: m.start,
      end: m.end || '',
      prn: m.prn,
      slots,
    };
  });
  check(
    new Set(items.map((m) => m.id)).size === items.length,
    '藥品項目重複。',
  );
  const identities = items
    .filter((m) => m.active)
    .map((m) => m.code || `${m.name}:${m.strength}:${m.route}`);
  check(
    new Set(identities).size === identities.length,
    '相同藥品請合併至同一項，再新增服用時段。',
  );
  check(
    items.reduce((n, m) => n + m.slots.length, 0) <= 60,
    '每日排定時段最多 60 次。',
  );
  return { effectiveFrom: p.effectiveFrom, items };
}
export function planAt(plans: MedicationPlan[], minute: string) {
  return plans.filter((p) => p.effectiveFrom <= minute).at(-1);
}
function applies(m: MedicationItem, date: string) {
  return (
    m.active &&
    m.start <= date &&
    (!m.end || m.end >= date) &&
    m.days.includes(new Date(date + 'T00:00:00Z').getUTCDay())
  );
}
function dose(
  p: MedicationPlan,
  m: MedicationItem,
  s: MedicationSlot,
): MedicationDose {
  return {
    key: `${p.id}:${m.id}:${m.prn ? 'prn:' : ''}${s.time}`,
    planId: p.id,
    itemId: m.id,
    code: m.code,
    name: m.name,
    strength: m.strength,
    unit: m.unit,
    route: m.route,
    note: m.note,
    hasImage: m.hasImage,
    time: s.time,
    label: m.prn ? '需要時使用' : s.label,
    amount: s.amount,
    prn: m.prn,
  };
}
export function scheduledDoses(plans: MedicationPlan[], date: string) {
  const result: MedicationDose[] = [];
  for (const p of plans)
    for (const m of p.items)
      if (applies(m, date) && !m.prn)
        for (const s of m.slots) {
          if (planAt(plans, date + 'T' + s.time)?.id === p.id)
            result.push(dose(p, m, s));
        }
  return result.sort(
    (a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name),
  );
}
export function prnDose(
  plans: MedicationPlan[],
  date: string,
  time: string,
  itemId: string,
) {
  const p = planAt(plans, date + 'T' + time),
    m = p?.items.find((m) => m.id === itemId && m.prn && applies(m, date));
  return p && m ? dose(p, m, { ...m.slots[0], time }) : undefined;
}
export function medicationSummary(
  plans: MedicationPlan[],
  date: string,
  reports: DoseReport[],
) {
  const expected = scheduledDoses(plans, date),
    valid = new Set(expected.map((d) => d.key));
  const fixed = reports.filter((r) => !r.prn && valid.has(r.key));
  const complete =
    expected.length > 0 &&
    expected.every((d) => fixed.some((r) => r.key === d.key));
  return {
    expected: expected.length,
    reported: fixed.length,
    taken: fixed.filter((r) => r.status === '已服用').length,
    complete,
    status: `已回報 ${fixed.length}／${expected.length} 次${reports.some((r) => r.prn) ? `・需要時用藥 ${reports.filter((r) => r.prn).length} 次` : ''}`,
  };
}
export function drugImageUrl(code: string) {
  return /^[a-zA-Z0-9_-]{1,24}$/.test(code)
    ? `https://res.cloudinary.com/de02nbokt/image/upload/w_400,c_scale,q_auto,f_auto/${encodeURIComponent(code)}`
    : '';
}
