import { PSM, type ImageLike, type Worker } from 'tesseract.js';
import {
  parseExerciseRecognition,
  type Recognition,
  type OcrLayout,
} from './exercise-evidence.ts';

// Identical pipeline in the browser and local screenshot regression tests.
// Cropping is an OCR rectangle only: original image bytes are never changed.
export async function recognizeExercise(
  worker: Worker,
  image: ImageLike,
  size: { width: number; height: number },
  createNumericWorker: () => Promise<Worker>,
  isActive: () => boolean = () => true,
): Promise<Recognition> {
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    tessedit_char_whitelist: '',
  });
  const original = await worker.recognize(
    image,
    {},
    { text: true, blocks: true },
  );
  const text = original.data.text.slice(0, 20000);
  if (!isActive()) throw new Error('Recognition cancelled');
  const textLayout: OcrLayout = {
    ...size,
    lines: (original.data.blocks ?? [])
      .flatMap((block) =>
        block.paragraphs.flatMap((paragraph) =>
          paragraph.lines.flatMap((line) => [
            {
              text: line.text.trim().slice(0, 80),
              confidence: line.confidence,
              bbox: line.bbox,
            },
            ...(line.words ?? []).map((word) => ({
              text: word.text.trim().slice(0, 80),
              confidence: word.confidence,
              bbox: word.bbox,
            })),
          ]),
        ),
      )
      .slice(0, 80),
  };
  const first = parseExerciseRecognition(text, textLayout);
  if (first.steps !== null)
    return {
      ...first,
      text,
      status: 'recognized',
      layout: textLayout,
      engine: 'Tesseract.js 6 / steps-layout-v4',
    };
  await worker.terminate();
  const numericWorker = await createNumericWorker();
  if (!isActive()) {
    await numericWorker.terminate();
    throw new Error('Recognition cancelled');
  }
  await numericWorker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    tessedit_char_whitelist: '0123456789,./:-年月日%',
  });
  const numeric = await numericWorker.recognize(
    image,
    {},
    { text: true, blocks: true },
  );
  if (!isActive()) throw new Error('Recognition cancelled');
  const layout: OcrLayout = {
    ...size,
    lines: (numeric.data.blocks ?? [])
      .flatMap((block) =>
        block.paragraphs.flatMap((paragraph) =>
          paragraph.lines.map((line) => ({
            text: line.text.trim().slice(0, 80),
            confidence: line.confidence,
            bbox: line.bbox,
          })),
        ),
      )
      .slice(0, 80),
  };
  return {
    ...parseExerciseRecognition(text, layout, textLayout),
    text,
    layout,
    status: 'recognized',
    engine: 'Tesseract.js 6 / steps-layout-v4',
  };
}
