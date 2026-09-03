import { PSM, type ImageLike, type Worker } from 'tesseract.js';
import {
  parseExerciseRecognition,
  parseExerciseText,
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
  const original = await worker.recognize(image);
  const text = original.data.text.slice(0, 20000);
  if (!isActive()) throw new Error('Recognition cancelled');
  const first = parseExerciseText(text);
  if (first.steps !== null)
    return {
      ...first,
      text,
      status: 'recognized',
      engine: 'Tesseract.js 6 / text-and-numeric-layout-v2',
    };
  await worker.terminate();
  const numericWorker = await createNumericWorker();
  if (!isActive()) {
    await numericWorker.terminate();
    throw new Error('Recognition cancelled');
  }
  await numericWorker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    tessedit_char_whitelist: '0123456789,',
  });
  const rectangle = {
    left: Math.floor(size.width * 0.02),
    top: Math.floor(size.height * 0.14),
    width: Math.floor(size.width * 0.96),
    height: Math.floor(size.height * 0.4),
  };
  const numeric = await numericWorker.recognize(
    image,
    { rectangle },
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
    ...parseExerciseRecognition(text, layout),
    text,
    layout,
    status: 'recognized',
    engine: 'Tesseract.js 6 / text-and-numeric-layout-v2',
  };
}
