import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createWorker } from 'tesseract.js';
import { recognizeExercise } from '../lib/exercise-ocr.ts';
import { dimensions } from '../production/images.ts';

for (const path of process.argv.slice(2)) {
  const bytes = new Uint8Array(await readFile(path));
  const size = dimensions(bytes);
  const image = `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`;
  const workers = [];
  const create = async (languages) => {
    const worker = await createWorker(languages, 1, {
      langPath: fileURLToPath(new URL('../public/ocr/lang/', import.meta.url)),
      cacheMethod: 'none',
    });
    workers.push(worker);
    return worker;
  };
  try {
    const result = await recognizeExercise(
      await create('eng+chi_tra'),
      image,
      size,
      () => create('eng'),
    );
    console.log(path, { steps: result.steps, minutes: result.minutes });
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate().catch(() => {})));
  }
}
