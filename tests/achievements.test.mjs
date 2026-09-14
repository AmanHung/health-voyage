import test from 'node:test';
import assert from 'node:assert/strict';
import { voyageProgress } from '../lib/voyage.ts';
import { achievementCollections } from '../lib/achievements.ts';
const today = '2026-09-14';
const collection = (rows) =>
  achievementCollections(voyageProgress(rows, today));
test('six original series each have five increasing tiers; empty data earns nothing', () => {
  const result = collection([]);
  assert.equal(result.length, 6);
  assert.equal(
    result.reduce((n, s) => n + s.tiers.length, 0),
    30,
  );
  for (const s of result) {
    assert.equal(s.earned, 0);
    assert.ok(s.tiers.every((t, i) => !i || t.goal > s.tiers[i - 1].goal));
    assert.equal(s.next.index, 0);
  }
});
test('step totals use latest confirmed valid steps, never OCR candidates, future entries or duration', () => {
  const rows = [
    {
      date: today,
      kind: 'exercise',
      mode: 'steps',
      value: 10000,
      createdAt: '2026-09-14T01:00Z',
    },
    {
      date: today,
      kind: 'exercise',
      mode: 'steps',
      value: 3111,
      createdAt: '2026-09-14T02:00Z',
    },
    { date: '2026-09-13', kind: 'exercise', mode: 'minutes', value: 60 },
    { date: '2026-09-12', kind: 'exercise', mode: 'steps', value: -1 },
    { date: '2026-09-15', kind: 'exercise', mode: 'steps', value: 10000 },
  ];
  const steps = collection(rows).find((s) => s.id === 'steps');
  assert.equal(steps.value, 3111);
  assert.equal(steps.earned, 1);
  assert.equal(steps.next.goal, 10000);
});
test('medication rewards honest participation but a partial day does not earn three-task completion', () => {
  const rows = ['exercise', 'meal', 'medicine'].map((kind) => ({
    date: today,
    kind,
    medicationComplete: kind === 'medicine' ? false : undefined,
  }));
  const first = collection(rows);
  assert.equal(first.find((s) => s.id === 'medicine').earned, 1);
  assert.equal(first.find((s) => s.id === 'balance').value, 0);
  rows[2].medicationComplete = true;
  assert.equal(collection(rows).find((s) => s.id === 'balance').value, 1);
});
test('all earned tiers remain visible and correcting data recalculates without duplicate rewards', () => {
  const rows = Array.from({ length: 180 }, (_, i) => ({
    date: new Date(Date.parse(today) - i * 86400000).toISOString().slice(0, 10),
    kind: 'meal',
  }));
  const full = collection(rows).find((s) => s.id === 'meal');
  assert.equal(full.earned, 5);
  assert.equal(full.next, null);
  assert.ok(full.tiers.every((t) => t.earned));
  assert.equal(
    collection([...rows, rows[0]]).find((s) => s.id === 'meal').value,
    180,
  );
  assert.equal(
    collection(rows.slice(1)).find((s) => s.id === 'meal').earned,
    4,
  );
});
