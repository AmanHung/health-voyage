import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseExerciseRecognition,
  parseExerciseText,
  validateOcrLayout,
  exerciseText,
} from '../lib/exercise-evidence.ts';
const line = (text, height, y = 420, confidence = 90) => ({
  text,
  confidence,
  bbox: { x0: 150, y0: y, x1: 280, y1: y + height },
});
const layout = (lines) => ({ width: 600, height: 1280, lines });
test('uses the prominent steps candidate, not smaller target number', () => {
  assert.deepEqual(
    parseExerciseRecognition(
      '步 數\n今天\n目標 150%',
      layout([line('8,400', 44), line('5,600', 21, 480)]),
    ),
    { steps: 8400, minutes: null },
  );
});
test('numeric pass joins split glyphs without reading the average section', () => {
  assert.deepEqual(
    parseExerciseRecognition(
      '步行\n總計\n162 0\n重點\n平均步數\n6,000 步/天',
      layout([line('1,62 0', 35, 250, 27)]),
    ),
    { steps: 1620, minutes: null },
  );
});
test('today value remains authoritative when lower quality digit pass conflicts', () => {
  assert.deepEqual(
    parseExerciseRecognition(
      '步數\n總計\n1,620\n今天\n900',
      layout([line('1608', 70)]),
    ),
    { steps: 1620, minutes: null },
  );
});
test('accepts a daily total line used by common phone health apps', () => {
  assert.deepEqual(parseExerciseText('步數\n總計 1,616 步\n今天'), {
    steps: 1616,
    minutes: null,
  });
  assert.equal(
    parseExerciseRecognition(
      '步數 今天',
      layout([line('1,616', 48, 220), line('900', 28, 480)]),
    ).steps,
    1616,
  );
  assert.equal(
    parseExerciseRecognition(
      '總計\n1,616\n今天\n檢視所有步數測量指標',
      layout([line('1,616', 60, 323), line('900', 15, 404)]),
    ).steps,
    1616,
  );
});
test('ambiguous or untitled numeric layouts stay blank', () => {
  assert.equal(
    parseExerciseRecognition(
      '步數',
      layout([line('3000', 40), line('4000', 39, 500)]),
    ).steps,
    null,
  );
  assert.equal(
    parseExerciseRecognition('卡路里', layout([line('3000', 40)])).steps,
    null,
  );
  assert.equal(parseExerciseText('步行\n重點\n6,000 步/天').steps, null);
});
test('validates bounded OCR layout payload', () => {
  assert.equal(validateOcrLayout(null), null);
  assert.deepEqual(
    validateOcrLayout(layout([line('3000', 40)])),
    layout([line('3000', 40)]),
  );
  assert.throws(() =>
    validateOcrLayout(layout([{ ...line('3000', 40), confidence: Infinity }])),
  );
  assert.throws(() => validateOcrLayout(layout([line('3000', 40, -1)])));
});
test('shows only the reported metric with no empty counterpart', () => {
  assert.equal(exerciseText({ steps: 1620, minutes: null }), '1,620 步');
  assert.equal(exerciseText({ steps: null, minutes: 30 }), '30 分鐘');
  assert.equal(exerciseText({ steps: 0, minutes: null }), '0 步');
});
