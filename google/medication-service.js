import {
  validateMedicationPlan,
  taiwanMinute,
  scheduledDoses,
  prnDose,
  medicationSummary,
  DOSE_STATUSES,
  medicationTime,
} from '../lib/medication.ts';
import { validDay } from './domain.js';

export function medicationService(h) {
  const {
    read,
    write,
    need,
    cleanText,
    locked,
    hash,
    audit,
    publicRecord,
    latest,
    person,
  } = h;
  const publicPlan = (p) => {
    const { requestId, fingerprint, _row, ...rest } = p;
    return rest;
  };
  const histories = (id) => read('MedicationPlans', id).map(publicPlan);
  function access(identity, id) {
    if (identity.role === 'patient') {
      const p = person(identity);
      need(!id || id === p.id, '無法讀取其他個案資料。');
      return p;
    }
    const p = read('Patients').find((p) => p.id === id);
    need(
      p &&
        p.active &&
        !p.deletedAt &&
        (identity.role === 'admin' || p.pharmacists?.includes(identity.email)),
      '沒有此個案的用藥管理權限。',
    );
    return p;
  }
  function decorate(record, plans) {
    const r = publicRecord(record);
    if (
      r.kind === 'medicine' &&
      (r.medicationDoses || scheduledDoses(plans, r.date).length)
    ) {
      const summary = medicationSummary(plans, r.date, r.medicationDoses || []);
      return {
        ...r,
        medicationComplete:
          summary.complete ||
          (summary.expected === 0 &&
            (!!r.medicationNoScheduled || !!r.medicationDoses?.length)),
        medicationExpected: summary.expected,
        status: r.medicationDoses
          ? summary.expected === 0 && r.medicationNoScheduled
            ? '今日無固定用藥，已確認'
            : summary.status
          : `${r.status}（舊版每日回報）`,
      };
    }
    return r;
  }
  function view(identity, p, date) {
    const plans = histories(p.id),
      records = read('Records', p.id).filter((r) => r.kind === 'medicine');
    const current = latest(records).find((r) => r.date === date);
    return {
      plans,
      record: current ? decorate(current, plans) : null,
      now: taiwanMinute(),
      patient: { id: p.id, name: p.name },
      ...(identity.role !== 'patient'
        ? {
            records: latest(records).map((r) => decorate(r, plans)),
            pharmacists: identity.role === 'admin' ? p.pharmacists || [] : [],
            staffVersion: p.medicationStaffVersion || null,
          }
        : {}),
    };
  }
  function dispatch(action, payload, identity, today) {
    if (action === 'admin.medicationStaff') {
      need(identity.role === 'admin', '只有管理員可設定藥師權限。');
      const requestId = cleanText(payload.requestId, 16, 64, '操作編號');
      need(
        Array.isArray(payload.emails) && payload.emails.length <= 10,
        '每個個案最多指派 10 位藥師。',
      );
      const emails = [
        ...new Set(
          payload.emails.map((e) =>
            cleanText(e, 3, 150, '藥師信箱').toLowerCase(),
          ),
        ),
      ].sort();
      need(
        emails.every((e) =>
          /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(e),
        ),
        '請填寫有效的 Google 帳號信箱。',
      );
      return locked(() => {
        const p = access(identity, payload.patientId),
          fingerprint = hash(
            JSON.stringify([emails, payload.previousId || null]),
          );
        if (p.medicationStaffRequest?.id === requestId) {
          need(
            p.medicationStaffRequest.fingerprint === fingerprint,
            '請重新提交藥師設定。',
          );
          return view(identity, p, today);
        }
        need(
          (p.medicationStaffVersion || null) === (payload.previousId || null),
          '藥師設定已變更，請重新載入。',
        );
        p.pharmacists = emails;
        p.medicationStaffVersion = Utilities.getUuid();
        p.medicationStaffRequest = { id: requestId, fingerprint };
        write('Patients', p, p._row);
        audit(identity.subject, 'medication.staff', p.id, { emails });
        return view(identity, p, today);
      });
    }
    if (action === 'medication.read') {
      const p = access(identity, payload.patientId);
      const date = validDay(payload.date || today, today);
      if (identity.role !== 'patient')
        audit(identity.subject, 'medication.read', p.id);
      return view(identity, p, date);
    }
    if (action === 'medication.publish') {
      need(identity.role !== 'patient', '只有照護人員可維護用藥。');
      const requestId = cleanText(payload.requestId, 16, 64, '操作編號');
      return locked(() => {
        const p = access(identity, payload.patientId),
          all = read('MedicationPlans', p.id);
        const fingerprint = hash(
          JSON.stringify([payload.plan, payload.previousId || null]),
        );
        const retry = all.find((r) => r.requestId === requestId);
        if (retry) {
          need(retry.fingerprint === fingerprint, '請重新提交更新後的清單。');
          return view(identity, p, today);
        }
        need(
          (all.at(-1)?.id || null) === (payload.previousId || null),
          '清單已由其他人更新，請重新載入。',
        );
        // The server decides the activation time, including requests from older clients.
        const now = taiwanMinute();
        const clean = validateMedicationPlan(
          { ...payload.plan, effectiveFrom: now },
          now,
        );
        const plan = {
          ...clean,
          id: Utilities.getUuid(),
          patientId: p.id,
          previousId: all.at(-1)?.id || null,
          createdAt: new Date().toISOString(),
          createdBy: identity.subject,
          requestId,
          fingerprint,
        };
        write('MedicationPlans', plan);
        audit(identity.subject, 'medication.publish', p.id, {
          planId: plan.id,
          effectiveFrom: plan.effectiveFrom,
        });
        return view(identity, p, today);
      });
    }
    if (action === 'medication.report') {
      need(identity.role === 'patient', '請由個案回報服用情形。');
      const date = validDay(payload.date, today),
        requestId = cleanText(payload.requestId, 16, 64, '操作編號');
      const confirm = payload.confirmNoScheduled === true;
      need(
        confirm || DOSE_STATUSES.includes(payload.status),
        '請選擇服用情形。',
      );
      need(
        confirm || payload.key || medicationTime(payload.time),
        '請確認實際使用時間。',
      );
      const reason = cleanText(payload.reason || '', 0, 160, '備註');
      return locked(() => {
        const p = access(identity),
          plans = histories(p.id),
          all = read('Records', p.id),
          current = latest(all).find(
            (r) => r.kind === 'medicine' && r.date === date,
          );
        const fingerprint = hash(
          JSON.stringify([
            confirm,
            date,
            payload.key || '',
            payload.itemId || '',
            payload.time || '',
            payload.status,
            reason,
            payload.previousId || null,
            payload.planVersion || null,
          ]),
        );
        const retry = all.find((r) => r.requestId === requestId);
        if (retry) {
          need(
            retry.fingerprint === fingerprint && current?.id === retry.id,
            '紀錄已變更，請重新載入後確認。',
          );
          return view(identity, p, date);
        }
        need(
          (current?.id || null) === (payload.previousId || null),
          '紀錄已更新，請重新載入後再回報。',
        );
        need(
          (plans.at(-1)?.id || null) === (payload.planVersion || null),
          '用藥清單已更新，請重新載入確認。',
        );
        need(
          !confirm ||
            (plans.some((p) => p.effectiveFrom.slice(0, 10) <= date) &&
              scheduledDoses(plans, date).length === 0),
          '本日有固定用藥，請逐項回報。',
        );
        const dose = confirm
          ? null
          : payload.key
            ? scheduledDoses(plans, date).find((d) => d.key === payload.key)
            : prnDose(plans, date, payload.time, payload.itemId);
        need(
          confirm || (dose && date + 'T' + dose.time <= taiwanMinute()),
          '此時段尚未到、已停用，或清單已更新。',
        );
        const reports = confirm
          ? current?.medicationDoses || []
          : [
              ...(current?.medicationDoses || []).filter(
                (r) => r.key !== dose.key,
              ),
              {
                ...dose,
                status: payload.status,
                reason,
                reportedAt: new Date().toISOString(),
              },
            ];
        need(reports.length <= 80, '本日用藥回報已達上限，請聯絡照護團隊。');
        const summary = medicationSummary(plans, date, reports);
        const record = {
          id: Utilities.getUuid(),
          patientId: p.id,
          kind: 'medicine',
          date,
          createdAt: new Date().toISOString(),
          previousId: current?.id || null,
          requestId,
          fingerprint,
          medicationDoses: reports,
          medicationComplete:
            summary.complete ||
            (summary.expected === 0 && (confirm || reports.length > 0)),
          medicationNoScheduled:
            confirm || current?.medicationNoScheduled || false,
          medicationExpected: summary.expected,
          status: confirm ? '今日無固定用藥，已確認' : summary.status,
        };
        need(
          JSON.stringify(record).length < 45000,
          '本日紀錄內容過多，請聯絡照護團隊。',
        );
        write('Records', record);
        audit(identity.subject, 'medication.report', record.id, {
          planId: dose?.planId || null,
          key: dose?.key || null,
          confirmNoScheduled: confirm,
        });
        return view(identity, p, date);
      });
    }
    throw new Error('不支援此用藥操作。');
  }
  return { dispatch, histories, decorate };
}
