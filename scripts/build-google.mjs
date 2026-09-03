import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('build/google', { recursive: true });
const result = await build({ entryPoints: ['google/backend.js'], bundle: true, write: false, format: 'iife', globalName: 'HealthVoyage', target: 'es2020', platform: 'neutral', legalComments: 'none' });
const code = result.outputFiles[0].text + '\nfunction doGet(e){return HealthVoyage.get(e)}\nfunction doPost(e){return HealthVoyage.post(e)}\nfunction setupHealthVoyage(){return HealthVoyage.setup()}\n';
await writeFile('build/google/Code.gs', code);
await writeFile('build/google/appsscript.json', await readFile('google/appsscript.json'));
// Local-only transfer page for the browser editor; not part of the Pages artifact.
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
await writeFile('build/google/setup.html', '<!doctype html><meta charset="utf-8"><title>健康航程後端程式移交</title><label>Code.gs<textarea aria-label="Code.gs" style="width:95vw;height:70vh" readonly>'+escape(code)+'</textarea></label><label>appsscript.json<textarea aria-label="appsscript.json" style="width:95vw;height:20vh" readonly>'+escape(await readFile('google/appsscript.json','utf8'))+'</textarea></label>');
console.log('Google Apps Script bundle generated; no patient data or credentials included.');
