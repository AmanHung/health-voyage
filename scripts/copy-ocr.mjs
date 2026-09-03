import { mkdir, cp, readdir } from 'node:fs/promises';
// Same-origin OCR assets: no screenshot or language request sent to a CDN.
await mkdir('public/ocr/core', { recursive: true });
await mkdir('public/ocr/lang', { recursive: true });
await cp(
  'node_modules/tesseract.js/dist/worker.min.js',
  'public/ocr/worker.min.js',
);
for (const name of await readdir('node_modules/tesseract.js-core')) {
  if (name.endsWith('.wasm.js'))
    await cp(
      `node_modules/tesseract.js-core/${name}`,
      `public/ocr/core/${name}`,
    );
}
for (const code of ['eng', 'chi_tra'])
  await cp(
    `node_modules/@tesseract.js-data/${code}/4.0.0_best_int/${code}.traineddata.gz`,
    `public/ocr/lang/${code}.traineddata.gz`,
  );
