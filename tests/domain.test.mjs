import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateExercise,
  medicineComplete,
  completion,
  needsCare,
  validInvitation,
  csvCell,
  sanitizeMedicines,
} from '../lib/demo-domain.ts';
const meds = (morning = '', evening = '') => ({
  morning: { status: morning, reason: '' },
  evening: { status: evening, reason: '' },
});
test('rest is a valid honest activity record', () =>
  assert.deepEqual(
    validateExercise({ steps: 0, minutes: 0, kind: '今日休息' }),
    { steps: 0, minutes: 0, kind: '今日休息' },
  ));
test('reject malformed or out-of-range exercise input', () => {
  for (const steps of [-1, 1.5, 100001, NaN, '3000'])
    assert.throws(() => validateExercise({ steps, minutes: 20, kind: '步行' }));
  assert.throws(() => validateExercise(null));
  assert.throws(() =>
    validateExercise({ steps: 1, minutes: 1441, kind: '步行' }),
  );
  assert.throws(() =>
    validateExercise({ steps: 1, minutes: 3, kind: 'unknown' }),
  );
});
test('record completeness does not reward taken over honest missed/question', () => {
  assert.equal(medicineComplete(meds('missed', 'question')), true);
  assert.equal(medicineComplete(meds('taken', 'taken')), true);
});
test('later or missing status never completes the medication task', () => {
  assert.equal(medicineComplete(meds('taken', 'later')), false);
  assert.equal(medicineComplete(meds('taken', '')), false);
});
test('empty reporting is not mistaken for nonadherence', () =>
  assert.equal(needsCare(meds()), false));
test('missed/question creates care flag', () => {
  assert.equal(needsCare(meds('missed', 'taken')), true);
  assert.equal(needsCare(meds('question', 'taken')), true);
});
test('editing a record cannot inflate task count or points', () => {
  const first = completion(
    { steps: 10, minutes: 1, kind: '步行' },
    true,
    meds('taken', 'taken'),
  );
  const edited = completion(
    { steps: 100, minutes: 10, kind: '步行' },
    true,
    meds('missed', 'question'),
  );
  assert.equal(first, 3);
  assert.equal(edited, 3);
  assert.equal(140 + edited * 10, 170);
});
test('partial completion remains accurate', () => {
  assert.equal(completion(null, false, meds()), 0);
  assert.equal(completion(null, true, meds('taken', 'later')), 1);
});
test('invitation only accepts documented fictitious demo identity', () => {
  assert.equal(validInvitation('王示範', ' hv2026 '), true);
  assert.equal(validInvitation('王示範', 'wrong'), false);
  assert.equal(validInvitation('別人', 'HV2026'), false);
});
test('CSV escaping neutralizes formula injection and quotes', () => {
  assert.equal(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(csvCell('a"b'), '"a""b"');
});
test('changing medicine status removes stale reason', () => {
  const m = meds('taken', 'question');
  m.morning.reason = 'old missed reason';
  m.evening.reason = '  question  ';
  assert.deepEqual(sanitizeMedicines(m), {
    morning: { status: 'taken', reason: '' },
    evening: { status: 'question', reason: 'question' },
  });
});
