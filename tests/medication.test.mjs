import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { environment } from './helpers/google-environment.mjs';
import {
  scheduledDoses,
  medicationSummary,
  planAt,
  prnDose,
  validateMedicationPlan,
  drugImageUrl,
} from '../lib/medication.ts';
import { parseCatalog } from '../production/drug-catalog.ts';
import { voyageProgress } from '../lib/voyage.ts';

const day = '2026-09-11';
const item = (patch = {}) => ({
  id: 'drug-one',
  code: '123456',
  name: '虛構藥品',
  strength: '5 mg 錠劑',
  unit: '錠',
  route: '口服',
  note: '依核對的處方使用',
  hasImage: true,
  active: true,
  days: [0, 1, 2, 3, 4, 5, 6],
  start: day,
  end: '',
  prn: false,
  slots: [
    { time: '08:00', label: '早餐後', amount: 0.5 },
    { time: '18:00', label: '晚餐後', amount: 1 },
  ],
  ...patch,
});
function fixture() {
  const e = environment({ now: '2026-09-10T22:00:00Z' }),
    p = e.patient('A', false),
    other = e.patient('B', false);
  return { e, p, other };
}
function publish(
  e,
  p,
  items = [item()],
  effectiveFrom = day + 'T07:00',
  previousId = null,
) {
  return e.call('medication.publish', {
    patientId: p.id,
    plan: { items, effectiveFrom },
    previousId,
    requestId: randomUUID(),
  });
}
function response(e, p) {
  const r = e.call('medication.read', { date: day }, p.identity);
  assert.equal(r.ok, true, r.error);
  return r.data;
}
function reportBody(view, dose, status = '已服用') {
  return {
    date: day,
    key: dose.key,
    status,
    reason: '',
    previousId: view.record?.id || null,
    planVersion: view.plans.at(-1)?.id || null,
    requestId: randomUUID(),
  };
}

test('dose schedule respects weekdays, stop dates and within-day replacement without rewriting morning', () => {
  const a = { id: 'a', items: [item()], effectiveFrom: day + 'T07:00' },
    b = {
      id: 'b',
      items: [item({ slots: [{ time: '18:00', label: '晚餐後', amount: 2 }] })],
      effectiveFrom: day + 'T12:00',
    };
  assert.deepEqual(
    scheduledDoses([a, b], day).map((d) => [d.planId, d.time, d.amount]),
    [
      ['a', '08:00', 0.5],
      ['b', '18:00', 2],
    ],
  );
  assert.equal(
    scheduledDoses([{ ...a, items: [item({ days: [0] })] }], day).length,
    0,
  );
  assert.equal(
    scheduledDoses([{ ...a, items: [item({ end: day })] }], '2026-09-12')
      .length,
    0,
  );
  assert.equal(scheduledDoses([a, { ...b, items: [] }], day).length, 1);
  // A newly published earlier change replaces previously scheduled future changes.
  const future = { ...b, id: 'future', effectiveFrom: '2026-09-15T00:00' },
    replacement = {
      ...a,
      id: 'replacement',
      effectiveFrom: '2026-09-12T00:00',
    };
  assert.equal(
    planAt([a, future, replacement], '2026-09-16T12:00').id,
    'replacement',
  );
  assert.equal(planAt([a, future, replacement], day + 'T10:00').id, 'a');
});
test('plan validation rejects ambiguous schedules and unsafe codes without inventing dose defaults', () => {
  const valid = { effectiveFrom: day + 'T07:00', items: [item()] };
  assert.equal(
    validateMedicationPlan(valid, day + 'T06:00').items[0].slots[0].amount,
    0.5,
  );
  for (const patch of [
    { strength: '' },
    { slots: [{ time: '25:00', label: '早餐後', amount: 1 }] },
    { slots: [{ time: '08:00', label: '早餐後', amount: 0 }] },
    { days: [] },
    { code: '../../file' },
    { slots: [item().slots[0], item().slots[0]] },
  ])
    assert.throws(() =>
      validateMedicationPlan(
        { ...valid, items: [item(patch)] },
        day + 'T06:00',
      ),
    );
  assert.throws(
    () => validateMedicationPlan(valid, day + 'T08:00'),
    /不能回溯/,
  );
  assert.equal(drugImageUrl('../private'), '');
});
test('publishing is staff-only, version checked and retry-safe even after the effective time passes', () => {
  const { e, p } = fixture(),
    body = {
      patientId: p.id,
      plan: { items: [item()], effectiveFrom: day + 'T07:00' },
      previousId: null,
      requestId: randomUUID(),
    };
  assert.equal(e.call('medication.publish', body, p.identity).ok, false);
  const first = e.call('medication.publish', body);
  assert.equal(first.ok, true, first.error);
  e.setNow('2026-09-11T01:00:00Z');
  assert.equal(e.call('medication.publish', body).data.plans.length, 1);
  assert.equal(
    e.call('medication.publish', { ...body, plan: { ...body.plan, items: [] } })
      .ok,
    false,
  );
  assert.equal(publish(e, p, [], day + 'T12:00').ok, false);
  assert.equal(response(e, p).plans.length, 1);
});
test('each dose report is independent, honest missed/question reports count, concurrent writes and retries cannot overwrite', () => {
  const { e, p } = fixture();
  assert.equal(publish(e, p).ok, true);
  e.setNow('2026-09-11T01:00:00Z');
  let v = response(e, p),
    doses = scheduledDoses(v.plans, day),
    first = reportBody(v, doses[0], '未服用');
  assert.equal(
    e.call('medication.report', reportBody(v, doses[1]), p.identity).ok,
    false,
  );
  const saved = e.call('medication.report', first, p.identity);
  assert.equal(saved.ok, true, saved.error);
  v = saved.data;
  assert.equal(v.record.medicationComplete, false);
  assert.equal(v.record.medicationDoses[0].status, '未服用');
  assert.equal(
    e.call('medication.report', first, p.identity).data.record.id,
    v.record.id,
  );
  assert.equal(
    e.call('medication.report', { ...first, status: '已服用' }, p.identity).ok,
    false,
  );
  e.setNow('2026-09-11T11:00:00Z');
  assert.equal(
    e.call(
      'medication.report',
      { ...reportBody(v, doses[1]), previousId: null },
      p.identity,
    ).ok,
    false,
  );
  v = e.call(
    'medication.report',
    reportBody(v, doses[1], '有疑問'),
    p.identity,
  ).data;
  assert.equal(v.record.medicationComplete, true);
  assert.equal(v.record.medicationDoses.length, 2);
  assert.equal(
    medicationSummary(v.plans, day, v.record.medicationDoses).taken,
    0,
  );
  assert.equal(e.call('medication.report', first, p.identity).ok, false);
  assert.equal(
    voyageProgress([{ ...v.record, medicationComplete: false }], day)
      .todayCount,
    0,
  );
  assert.equal(
    voyageProgress([{ ...v.record, medicationComplete: false }], day).totalDays,
    1,
  );
  const legacy = e.call(
    'save',
    {
      record: { date: day, kind: 'medicine', status: '已服用' },
      previousId: v.record.id,
      requestId: randomUUID(),
    },
    p.identity,
  );
  assert.equal(legacy.ok, false);
});
test('within-day replacement keeps old dose snapshots and requires refreshed plan before reporting', () => {
  const { e, p } = fixture();
  publish(e, p);
  e.setNow('2026-09-11T01:00:00Z');
  let v = response(e, p);
  v = e.call(
    'medication.report',
    reportBody(v, scheduledDoses(v.plans, day)[0]),
    p.identity,
  ).data;
  const prior = v.plans.at(-1).id,
    stale = reportBody(v, scheduledDoses(v.plans, day)[1]);
  const next = publish(
    e,
    p,
    [item({ slots: [{ time: '18:00', label: '晚餐後', amount: 2 }] })],
    day + 'T12:00',
    prior,
  );
  assert.equal(next.ok, true, next.error);
  e.setNow('2026-09-11T11:00:00Z');
  assert.equal(e.call('medication.report', stale, p.identity).ok, false);
  v = response(e, p);
  v = e.call(
    'medication.report',
    reportBody(v, scheduledDoses(v.plans, day)[1]),
    p.identity,
  ).data;
  assert.deepEqual(
    v.record.medicationDoses.map((r) => r.amount),
    [0.5, 2],
  );
  assert.equal(v.record.medicationComplete, true);
});
test('PRN supports repeated distinct times and stays outside fixed dose denominator', () => {
  const { e, p } = fixture();
  publish(e, p, [
    item(),
    item({
      id: 'prn-one',
      code: '234567',
      prn: true,
      slots: [{ time: '08:00', label: '指定時間', amount: 1 }],
    }),
  ]);
  e.setNow('2026-09-11T04:00:00Z');
  let v = response(e, p);
  for (const time of ['09:30', '11:30']) {
    const r = e.call(
      'medication.report',
      {
        date: day,
        itemId: 'prn-one',
        time,
        status: '已服用',
        reason: '',
        previousId: v.record?.id || null,
        planVersion: v.plans.at(-1).id,
        requestId: randomUUID(),
      },
      p.identity,
    );
    assert.equal(r.ok, true, r.error);
    v = r.data;
  }
  assert.equal(v.record.medicationDoses.length, 2);
  assert.equal(v.record.medicationExpected, 2);
  assert.equal(v.record.medicationComplete, false);
  assert.notEqual(
    prnDose(v.plans, day, '09:30', 'prn-one').key,
    prnDose(v.plans, day, '11:30', 'prn-one').key,
  );
});
test('assigned pharmacist can manage only assigned active patients; revocation applies to cached sessions', () => {
  const { e, p, other } = fixture();
  const pharmacist = e.auth('other', 'google');
  const grant = e.call('admin.medicationStaff', {
    patientId: p.id,
    emails: ['other@example.test'],
    previousId: null,
    requestId: randomUUID(),
  });
  assert.equal(grant.ok, true, grant.error);
  const bootstrap = e.call('bootstrap', {}, pharmacist);
  assert.equal(bootstrap.data.role, 'pharmacist');
  assert.deepEqual(
    bootstrap.data.patients.map((p) => p.id),
    [p.id],
  );
  assert.equal(
    e.call('medication.read', { patientId: p.id, date: day }, pharmacist).ok,
    true,
  );
  assert.equal(
    e.call('medication.read', { patientId: other.id, date: day }, pharmacist)
      .ok,
    false,
  );
  for (const action of [
    'admin.patients',
    'admin.records',
    'image',
    'admin.patientStatus',
    'admin.medicationStaff',
    'save',
    'leaderboard',
  ])
    assert.equal(
      e.call(action, { patientId: p.id }, pharmacist).ok,
      false,
      action,
    );
  assert.equal(
    e.call(
      'medication.publish',
      {
        patientId: p.id,
        plan: { items: [item()], effectiveFrom: day + 'T07:00' },
        previousId: null,
        requestId: randomUUID(),
      },
      pharmacist,
    ).ok,
    true,
  );
  assert.equal(
    e.call('admin.medicationStaff', {
      patientId: p.id,
      emails: [],
      previousId: grant.data.staffVersion,
      requestId: randomUUID(),
    }).ok,
    true,
  );
  assert.equal(
    e.call('medication.read', { patientId: p.id, date: day }, pharmacist).ok,
    false,
  );
  assert.equal(e.call('bootstrap', {}, pharmacist).ok, false);
});
test('patient isolation, deletion and restore cover medication plans and individual dose reports', () => {
  const { e, p, other } = fixture();
  publish(e, p);
  e.setNow('2026-09-11T01:00:00Z');
  let v = response(e, p);
  assert.equal(
    e.call('medication.read', { patientId: other.id, date: day }, p.identity)
      .ok,
    false,
  );
  v = e.call(
    'medication.report',
    reportBody(v, scheduledDoses(v.plans, day)[0]),
    p.identity,
  ).data;
  const recordId = v.record.id;
  assert.equal(
    e.call('admin.recordStatus', {
      id: recordId,
      deleted: true,
      requestId: randomUUID(),
    }).ok,
    true,
  );
  assert.equal(response(e, p).record, null);
  const deleted = e.call('admin.patientStatus', {
    patientId: p.id,
    deleted: true,
    previousVersion: null,
    requestId: randomUUID(),
  });
  assert.equal(deleted.ok, true);
  assert.equal(e.call('medication.read', { date: day }, p.identity).ok, false);
  assert.equal(publish(e, p).ok, false);
  assert.equal(
    e.call('admin.patientStatus', {
      patientId: p.id,
      deleted: false,
      previousVersion: deleted.data.patient.stateVersion,
      requestId: randomUUID(),
    }).ok,
    true,
  );
  assert.equal(response(e, p).plans.length, 1);
  assert.equal(response(e, p).record, null);
});
test('public catalog parser keeps image-less medication, CSV quoted commas and line breaks', () => {
  const drugs = parseCatalog(
    '\uFEFF藥品代碼,學名,商品名(英文),圖片否,圖檔名稱,門診停用否,住院停用否\r\n123456,"Name, A","Tablet\nA",N,,N,N\r\n123457,B,Old,Y,,Y,Y\r\n123458,C,Current,Y,,N,Y\r\n',
  );
  assert.equal(drugs.length, 2);
  assert.equal(drugs[0].generic, 'Name, A');
  assert.equal(drugs[0].name, 'Tablet\nA');
  assert.equal(drugs[0].hasImage, false);
  assert.throws(() => parseCatalog('code,name\n1,A'), /欄位/);
});
test('zero-scheduled-day confirmation is explicit and cannot bypass fixed medication', () => {
  const { e, p } = fixture();
  publish(e, p, []);
  e.setNow('2026-09-11T01:00:00Z');
  let v = response(e, p);
  assert.equal(v.record, null);
  const body = {
    date: day,
    confirmNoScheduled: true,
    previousId: null,
    planVersion: v.plans.at(-1).id,
    requestId: randomUUID(),
  };
  let r = e.call('medication.report', body, p.identity);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.data.record.medicationComplete, true);
  assert.equal(r.data.record.medicationDoses.length, 0);
  assert.equal(
    e.call('medication.report', body, p.identity).data.record.id,
    r.data.record.id,
  );
  publish(e, p, [item()], day + 'T12:00', v.plans.at(-1).id);
  v = response(e, p);
  assert.equal(v.record.medicationComplete, false);
  r = e.call(
    'medication.report',
    {
      ...body,
      previousId: v.record.id,
      planVersion: v.plans.at(-1).id,
      requestId: randomUUID(),
    },
    p.identity,
  );
  assert.equal(r.ok, false);
});
test('a stale daily report cannot change quantity or restore deleted earlier reports', () => {
  const { e, p } = fixture();
  publish(e, p);
  e.setNow('2026-09-11T01:00:00Z');
  let v = response(e, p);
  const dose = scheduledDoses(v.plans, day)[0];
  let saved = e.call(
    'medication.report',
    { ...reportBody(v, dose), amount: 99, name: '改名' },
    p.identity,
  );
  assert.equal(saved.ok, true);
  assert.equal(saved.data.record.medicationDoses[0].amount, 0.5);
  assert.equal(saved.data.record.medicationDoses[0].name, '虛構藥品');
  e.call('admin.recordStatus', {
    id: saved.data.record.id,
    deleted: true,
    requestId: randomUUID(),
  });
  v = response(e, p);
  saved = e.call(
    'medication.report',
    reportBody(v, dose, '有疑問'),
    p.identity,
  );
  assert.equal(saved.ok, true);
  assert.equal(saved.data.record.medicationDoses.length, 1);
  assert.equal(saved.data.record.previousId, null);
});
