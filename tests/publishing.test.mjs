import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('public Pages publishing remains explicitly enabled and follows validation', () => {
  const workflow = readFileSync('.github/workflows/github-pages.yml', 'utf8');
  assert.match(workflow, /if: \$\{\{ vars\.PAGES_ENABLED == 'true' \}\}/);
  assert.match(workflow, /needs: validate/);
  assert.match(workflow, /path: build\/github/);
});

test('publishing an unconfigured site does not open login or patient enrollment', () => {
  const frontend = readFileSync('production/main.tsx', 'utf8');
  const backend = readFileSync('google/backend.js', 'utf8');
  assert.match(frontend, /!configured\(\)\?/);
  assert.match(frontend, /網站設定中/);
  assert.match(frontend, /尚未開放登入與上傳/);
  assert.match(backend, /ACCEPT_PATIENTS/);
  assert.match(backend, /'false'/);
});

test('public legal pages disclose the health-data boundaries', () => {
  const privacy=readFileSync('public/privacy.html','utf8');
  const terms=readFileSync('public/terms.html','utf8');
  assert.match(privacy,/私人 Google 試算表與 Google 雲端硬碟/);
  assert.match(privacy,/排行榜採自由參加/);
  assert.match(terms,/不是醫療診斷、處方、即時監測或緊急通報系統/);
});
