import { createWorker, PSM } from 'tesseract.js';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { parseExerciseText } from '../lib/exercise-evidence.ts';
const worker = await createWorker(['chi_tra', 'eng'], 1, {
  langPath: resolve('public/ocr/lang'),
  cacheMethod: 'none',
});
try {
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
  const { data } = await worker.recognize('work/ocr-fixture.png');
  assert.deepEqual(parseExerciseText(data.text), { steps: 3500, minutes: 30 });
  console.log('Synthetic screenshot OCR passed: 3500 steps, 30 minutes.');
} finally {
  await worker.terminate();
}
