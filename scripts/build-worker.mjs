import { build } from 'esbuild';
await build({
  entryPoints: ['server/worker.ts'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
});
const worker = await import('../dist/server/index.js');
if (typeof worker.default?.fetch !== 'function')
  throw new Error('Worker fetch export missing');
console.log('Worker entry verified.');
