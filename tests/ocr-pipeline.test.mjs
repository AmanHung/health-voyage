import test from 'node:test';
import assert from 'node:assert/strict';
import { recognizeExercise } from '../lib/exercise-ocr.ts';
const line = (text, y) => ({
  text,
  confidence: 90,
  bbox: { x0: 100, y0: y, x1: 250, y1: y + 35 },
  words: [],
});
const data = (text, lines) => ({
  data: { text, blocks: [{ paragraphs: [{ lines }] }] },
});
test('numeric retry preserves punctuation and uses text bounding boxes to veto a misread date', async () => {
  let options, parameters;
  const original = {
    setParameters: async () => {},
    recognize: async (_i, _o, outputs) => {
      assert.equal(outputs.blocks, true);
      return data('步數\n5/30', [line('步數', 180), line('5/30', 230)]);
    },
    terminate: async () => {},
  };
  const numeric = {
    setParameters: async (p) => {
      parameters = p;
    },
    recognize: async (_i, o) => {
      options = o;
      return data('5130\n3,111', [line('5130', 230), line('3,111', 300)]);
    },
    terminate: async () => {},
  };
  const result = await recognizeExercise(
    original,
    'image',
    { width: 600, height: 1280 },
    async () => numeric,
  );
  assert.equal(result.steps, 3111);
  assert.match(parameters.tessedit_char_whitelist, /\//);
  assert.match(parameters.tessedit_char_whitelist, /:/);
  assert.deepEqual(options, {});
});
