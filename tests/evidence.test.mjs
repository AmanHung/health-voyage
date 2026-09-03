import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import {
  parseExerciseText,
  validateMetrics,
  imageMime,
} from '../lib/exercise-evidence.ts';
const { outputFiles } = await build({
  entryPoints: ['server/worker.ts'],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'esm',
});
const worker = (
  await import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
  )
).default;

test('OCR extracts labelled Chinese and English exercise metrics', () => {
  assert.deepEqual(parseExerciseText('步數 3,500\n運動時間 30 分鐘'), {
    steps: 3500,
    minutes: 30,
  });
  assert.deepEqual(
    parseExerciseText('Steps\n3,500\nExercise 1 hour 30 minutes'),
    { steps: 3500, minutes: 90 },
  );
  assert.deepEqual(parseExerciseText('8,650 步\nDuration 01:30:20'), {
    steps: 8650,
    minutes: 90,
  });
  assert.deepEqual(parseExerciseText('步 數 3500\n運 動 時 間 30 分 鐘'), {
    steps: 3500,
    minutes: 30,
  });
});
test('ambiguous, missing, clock, goal and pace values stay null', () => {
  assert.deepEqual(
    parseExerciseText('09:41\nGoal 10000 steps\n250 kcal\nPace 5 min/km'),
    { steps: null, minutes: null },
  );
  assert.deepEqual(parseExerciseText('3000 steps\n4000 steps'), {
    steps: null,
    minutes: null,
  });
  assert.deepEqual(parseExerciseText('目標 10000 步\n3500 步'), {
    steps: 3500,
    minutes: null,
  });
  assert.deepEqual(parseExerciseText('Duration 30:00'), {
    steps: null,
    minutes: null,
  });
});
test('one metric suffices, missing is not zero; reject blanks and bad types', () => {
  assert.deepEqual(validateMetrics({ steps: null, minutes: 30 }), {
    steps: null,
    minutes: 30,
  });
  assert.deepEqual(validateMetrics({ steps: 0, minutes: null }), {
    steps: 0,
    minutes: null,
  });
  for (const x of [
    { steps: null, minutes: null },
    { steps: undefined, minutes: 20 },
    { steps: '3000', minutes: 20 },
    { steps: -1, minutes: 20 },
    { steps: 2, minutes: 1441 },
  ])
    assert.throws(() => validateMetrics(x));
});
test('file magic rejects HTML renamed as an image', () => {
  assert.equal(
    imageMime(new TextEncoder().encode('<html>not image</html>')),
    null,
  );
});
function environment() {
  const sql = new DatabaseSync(':memory:');
  for (const file of readdirSync('drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(readFileSync(`drizzle/${file}`, 'utf8'));
  const blobs = new Map();
  const DB = {
    prepare: (query) => ({
      bind: (...values) => ({
        all: async () => ({ results: sql.prepare(query).all(...values) }),
        first: async () => sql.prepare(query).get(...values) ?? null,
        run: async () => ({
          meta: { changes: sql.prepare(query).run(...values).changes },
        }),
      }),
    }),
  };
  return {
    DB,
    EVIDENCE: {
      put: async (key, bytes) => blobs.set(key, bytes),
      get: async (key) => (blobs.has(key) ? { body: blobs.get(key) } : null),
      delete: async (key) => blobs.delete(key),
    },
    ASSETS: { fetch: async () => new Response('asset') },
    sql,
    blobs,
  };
}
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7tkAAAAASUVORK5CYII=',
  'base64',
);
function request(owner, record, image = null, origin = 'https://demo.test') {
  const form = new FormData();
  form.set('record', JSON.stringify(record));
  if (image)
    form.set(
      'image',
      new File([image], 'screenshot.png', { type: 'image/png' }),
    );
  return new Request('https://demo.test/api/exercise', {
    method: 'POST',
    headers: {
      Origin: origin,
      ...(owner ? { 'oai-authenticated-user-id': owner } : {}),
    },
    body: form,
  });
}
const base = {
  steps: 3500,
  minutes: null,
  date: '2026-09-02',
  kind: '步行',
  source: 'screenshot',
  recognition: { text: 'Steps 3500', status: 'recognized' },
  reason: '',
  previousId: null,
  confirmed: true,
};
const mealBase = {
  date: '2026-09-02',
  period: '午餐',
  groups: ['蔬菜', '豆魚蛋肉'],
  portion: '一般份',
  eaten: '約一半',
  drink: '不確定',
  goal: '確認這一餐的內容',
  note: '示範便當',
  mode: 'photo',
  photoReason: '',
  revisionReason: '',
  confirmed: true,
  previousId: null,
};
function foodRequest(owner,{consent='true',id=crypto.randomUUID(),origin='https://demo.test'}={}) {
  const form=new FormData();form.set('consent',consent);form.set('requestId',id);
  form.set('image',new File([png],'meal.png',{type:'image/png'}));
  return new Request('https://demo.test/api/food-ai',{method:'POST',headers:{Origin:origin,...(owner?{'oai-authenticated-user-id':owner}:{})},body:form});
}
test('food AI requires owner, origin and consent; quotas stop calls and receipts bind owner and image',async()=>{
  const env={...environment(),OPENAI_API_KEY:'test-only-not-a-key'};
  const originalFetch=globalThis.fetch;let calls=0;
  const result={isFood:true,items:[{name:'白飯',group:'全穀雜糧',certainty:'較明確'}],uncertainties:[]};
  globalThis.fetch=async()=>{calls++;return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]});};
  try {
    assert.equal((await worker.fetch(foodRequest(null),env)).status,401);
    assert.equal((await worker.fetch(foodRequest('a',{origin:'https://evil.test'}),env)).status,403);
    assert.equal((await worker.fetch(foodRequest('a',{consent:'false'}),env)).status,400);
    assert.equal(calls,0);
    const id=crypto.randomUUID();
    const response=await worker.fetch(foodRequest('a',{id}),env);
    assert.equal(response.status,200);
    const analysis=(await response.json()).analysis;
    assert.deepEqual(analysis.result,result);assert.equal(env.blobs.size,0);
    assert.equal((await worker.fetch(foodRequest('a',{id}),env)).status,429);
    assert.equal(calls,1);
    assert.equal((await worker.fetch(mealRequest('b',{...mealBase,analysisId:id},png),env)).status,400);
    const changedPng=Buffer.concat([png,Buffer.from([0])]);
    assert.equal((await worker.fetch(mealRequest('a',{...mealBase,analysisId:id},changedPng),env)).status,400);
    const saved=await worker.fetch(mealRequest('a',{...mealBase,analysisId:id,groups:['蔬菜'],analysis:{result:'forged'}},png),env);
    assert.equal(saved.status,201);const record=(await saved.json()).record;
    assert.deepEqual(record.groups,['蔬菜']);assert.deepEqual(record.analysis,analysis);
    assert.deepEqual(Buffer.from(env.blobs.get(record.imageKey)),png);
    for(let i=1;i<10;i++)assert.equal((await worker.fetch(foodRequest('a'),env)).status,200);
    assert.equal((await worker.fetch(foodRequest('a'),env)).status,429);assert.equal(calls,10);
    for(const owner of ['b','c','d','e'])for(let i=0;i<10;i++)assert.equal((await worker.fetch(foodRequest(owner),env)).status,200);
    assert.equal((await worker.fetch(foodRequest('f'),env)).status,429);assert.equal(calls,50);
  }finally{globalThis.fetch=originalFetch;env.sql.close();}
});
test('failed food AI attempts count without storing fake analysis or exposing upstream errors',async()=>{
  const env={...environment(),OPENAI_API_KEY:'test-only-not-a-key'},originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({error:{code:'credit_balance_exhausted',type:'insufficient_quota',message:'DO NOT ECHO'}},{status:429});
  try {
    const response=await worker.fetch(foodRequest('a'),env);assert.equal(response.status,503);
    const body=await response.json();assert.equal(body.code,'quota');assert.ok(!JSON.stringify(body).includes('DO NOT ECHO'));
    const rows=env.sql.prepare('SELECT payload FROM food_ai_attempts').all();assert.equal(rows.length,1);assert.equal(rows[0].payload,null);assert.equal(env.blobs.size,0);
  }finally{globalThis.fetch=originalFetch;env.sql.close();}
});
function mealRequest(
  owner,
  record,
  image = null,
  origin = 'https://demo.test',
) {
  const req = request(owner, record, image, origin);
  return new Request('https://demo.test/api/meals', req);
}
test('meal persistence isolates owners and retains original image and revisions', async () => {
  const env = environment();
  assert.equal(
    (await worker.fetch(mealRequest(null, mealBase, png), env)).status,
    401,
  );
  assert.equal(
    (
      await worker.fetch(
        mealRequest('a', mealBase, png, 'https://evil.test'),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        mealRequest('a', { ...mealBase, date: 'invalid' }, png),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        mealRequest('a', mealBase, Buffer.from('not image')),
        env,
      )
    ).status,
    400,
  );
  assert.equal(env.blobs.size, 0);
  const saved = await worker.fetch(mealRequest('a', mealBase, png), env);
  assert.equal(saved.status, 201);
  const first = (await saved.json()).record;
  assert.equal(first.source, 'self-report');
  assert.deepEqual(Buffer.from(env.blobs.get(first.imageKey)), png);
  const get = (path, owner) =>
    worker.fetch(
      new Request(`https://demo.test/api/meals${path}`, {
        headers: { 'oai-authenticated-user-id': owner },
      }),
      env,
    );
  assert.equal((await get(`/${first.id}/image`, 'b')).status, 404);
  assert.equal((await get(`/${first.id}/image`, 'a')).status, 200);
  assert.deepEqual((await (await get('', 'b')).json()).records, []);
  assert.equal(
    (
      await worker.fetch(
        mealRequest('a', { ...mealBase, previousId: first.id, photoReason: 42 }),
        env,
      )
    ).status,
    400,
  );
  const update = {
    ...mealBase,
    previousId: first.id,
    drink: '無糖',
    revisionReason: '查看飲料標示後更正',
  };
  const edited = await worker.fetch(mealRequest('a', update), env);
  assert.equal(edited.status, 201);
  const second = (await edited.json()).record;
  assert.equal(second.imageHash, first.imageHash);
  assert.equal(second.previousId, first.id);
  assert.equal((await worker.fetch(mealRequest('a', update), env)).status, 409);
  const loaded = (await (await get('', 'a')).json()).records;
  assert.equal(loaded.length, 2);
  assert.equal(loaded[1].drink, '不確定');
  const manual = {
    ...update,
    previousId: second.id,
    mode: 'manual',
    photoReason: '示範補填',
  };
  const third = (
    await (await worker.fetch(mealRequest('a', manual), env)).json()
  ).record;
  assert.equal(third.imageKey, null);
  assert.equal(env.blobs.size, 1);
  assert.equal((await get(`/${first.id}/image`, 'a')).status, 200);
  env.sql.close();
});
test('quick meal saves self-confirmed details and feedback version, retaining earlier photo and answers', async () => {
  const env = environment();
  const details = { version: 2, vegetableAmount: '約四分之一', features: ['油炸'], restrictedDiet: false };
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error('No network permitted'); };
  try {
    const response = await worker.fetch(mealRequest('quick-owner', { ...mealBase, details, analysisId: null }, png), env);
    assert.equal(response.status, 201);
    const first = (await response.json()).record;
    assert.deepEqual(first.details, details);
    assert.equal(first.feedbackVersion, 'one-meal-rules-v1');
    assert.equal(first.analysis, null);
    const updated = { ...mealBase, details: { ...details, features: ['以上皆無'], restrictedDiet: true }, previousId: first.id, revisionReason: '確認料理非油炸' };
    const secondResponse = await worker.fetch(mealRequest('quick-owner', updated), env);
    assert.equal(secondResponse.status, 201);
    const second = (await secondResponse.json()).record;
    assert.equal(second.imageHash, first.imageHash);
    assert.equal(second.details.restrictedDiet, true);
    const saved = env.sql.prepare('SELECT payload FROM meal_submissions').all().map(r => JSON.parse(r.payload));
    assert.equal(saved.length, 2);
    assert.deepEqual(saved[0].details.features, ['油炸']);
    assert.deepEqual(saved[1].details.features, ['以上皆無']);
    assert.equal(env.blobs.size, 1);
    const bad = await worker.fetch(mealRequest('other', { ...mealBase, details: { ...details, features: ['油炸', '以上皆無'] } }, png), env);
    assert.equal(bad.status, 400);
    assert.equal(networkCalls, 0);
  } finally { globalThis.fetch = originalFetch; env.sql.close(); }
});

test('daily records save without reason or repeated consent while preserving revisions and originals', async () => {
  const env = environment();
  const exercise = { ...base, steps: 1616 };
  delete exercise.reason;
  delete exercise.confirmed;
  const firstResponse = await worker.fetch(request('simple', exercise, png), env);
  assert.equal(firstResponse.status, 201);
  const first = (await firstResponse.json()).record;
  assert.equal(first.reason, '');
  assert.equal(first.recognition.steps, 3500);
  const editResponse = await worker.fetch(request('simple', { ...exercise, previousId: first.id, steps: 1700 }), env);
  assert.equal(editResponse.status, 201);
  const second = (await editResponse.json()).record;
  assert.equal(second.imageHash, first.imageHash);
  assert.equal(second.previousId, first.id);
  const manualResponse = await worker.fetch(request('manual', { ...exercise, source: 'manual', steps: null, minutes: 20 }), env);
  assert.equal(manualResponse.status, 201);
  assert.equal((await manualResponse.json()).record.imageKey, null);
  const meal = { ...mealBase };
  delete meal.photoReason;
  delete meal.revisionReason;
  delete meal.confirmed;
  const mealResponse = await worker.fetch(mealRequest('simple', meal, png), env);
  assert.equal(mealResponse.status, 201);
  const mealFirst = (await mealResponse.json()).record;
  const revised = await worker.fetch(mealRequest('simple', { ...meal, previousId: mealFirst.id, mode: 'manual' }), env);
  assert.equal(revised.status, 201);
  const mealSecond = (await revised.json()).record;
  assert.equal(mealSecond.photoReason, '');
  assert.equal(mealSecond.revisionReason, '');
  assert.equal(mealSecond.imageKey, null);
  assert.ok(env.blobs.has(mealFirst.imageKey));
  assert.equal((await worker.fetch(mealRequest('no-photo', { ...meal, mode: 'manual' }), env)).status, 201);
  assert.equal((await worker.fetch(request(null, exercise, png), env)).status, 401);
  env.sql.close();
});

test('meal API validates unknown answers, future dates, optional reason types and day ownership', async () => {
  const env = environment();
  for (const change of [
    { date: '2026-09-03' },
    { eaten: '' },
    { groups: [] },
    { groups: ['蔬菜', '不確定'] },
    { groups: ['肉', '肉'] },
    { mode: 'manual', photoReason: 42 },
  ]) {
    assert.equal(
      (await worker.fetch(mealRequest('a', { ...mealBase, ...change }), env))
        .status,
      400,
    );
  }
  const manual = { ...mealBase, mode: 'manual', photoReason: '忘了拍照' };
  const first = await worker.fetch(mealRequest('a', manual), env);
  assert.equal(first.status, 201);
  assert.equal(
    (
      await worker.fetch(
        mealRequest('a', { ...manual, date: '2026-09-01' }),
        env,
      )
    ).status,
    201,
  );
  assert.equal((await worker.fetch(mealRequest('b', manual), env)).status, 201);
  assert.equal(env.blobs.size, 0);
  env.sql.close();
});
test('persistent screenshot workflow: auth, ownership, revision audit, CAS, unchanged original', async () => {
  const env = environment();
  assert.equal((await worker.fetch(request(null, base, png), env)).status, 401);
  assert.equal(
    (await worker.fetch(request('owner', base, png, 'https://evil.test'), env))
      .status,
    403,
  );
  const saved = await worker.fetch(request('owner', base, png), env);
  assert.equal(saved.status, 201);
  const first = (await saved.json()).record;
  assert.equal(first.steps, 3500);
  assert.equal(first.recognition.steps, 3500);
  assert.equal(env.blobs.size, 1);
  assert.deepEqual(Buffer.from(env.blobs.get(first.imageKey)), png);
  const listRequest = new Request('https://demo.test/api/exercise', {
    headers: { 'oai-authenticated-user-id': 'owner' },
  });
  const loaded = (await (await worker.fetch(listRequest, env)).json()).records;
  assert.equal(loaded[0].id, first.id);
  const imageUrl = `https://demo.test/api/exercise/${first.id}/image`;
  assert.equal(
    (
      await worker.fetch(
        new Request(imageUrl, {
          headers: { 'oai-authenticated-user-id': 'other' },
        }),
        env,
      )
    ).status,
    404,
  );
  assert.equal((await worker.fetch(new Request(imageUrl), env)).status, 401);
  assert.equal(
    (
      await worker.fetch(
        new Request(imageUrl, {
          headers: { 'oai-authenticated-user-id': 'owner' },
        }),
        env,
      )
    ).status,
    200,
  );
  const edited = {
    ...base,
    previousId: first.id,
    steps: 3800,
    reason: '辨識漏字',
    recognition: { text: 'Steps 99999', status: 'recognized' },
  };
  const second = (
    await (await worker.fetch(request('owner', edited), env)).json()
  ).record;
  assert.equal(second.steps, 3800);
  assert.equal(second.recognition.steps, 3500);
  assert.equal(second.imageHash, first.imageHash);
  assert.equal(second.previousId, first.id);
  assert.equal(env.blobs.size, 1);
  assert.equal((await worker.fetch(request('owner', edited), env)).status, 409);
  const all = (await (await worker.fetch(listRequest, env)).json()).records;
  assert.equal(all.length, 2);
  assert.equal(all[1].steps, 3500);
  env.sql.close();
});
test('server rejects bogus images and invalid metrics; supports OCR failure and duration only', async () => {
  const env = environment();
  assert.equal(
    (await worker.fetch(request('owner', base, Buffer.from('bad image')), env))
      .status,
    400,
  );
  assert.equal(
    (await worker.fetch(request('owner', { ...base, steps: -1 }, png), env))
      .status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        request('owner', { ...base, date: 'invalid' }, png),
        env,
      )
    ).status,
    400,
  );
  const r = await worker.fetch(
    request(
      'owner',
      {
        ...base,
        steps: null,
        minutes: 30,
        reason: '辨識失敗，手動補填',
        recognition: { text: '', status: 'failed' },
      },
      png,
    ),
    env,
  );
  assert.equal(r.status, 201);
  const record = (await r.json()).record;
  assert.equal(record.steps, null);
  assert.equal(record.minutes, 30);
  assert.equal(record.recognition.status, 'failed');
  env.sql.close();
});
