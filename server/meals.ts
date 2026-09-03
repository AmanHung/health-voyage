import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { validateMeal, MEAL_FEEDBACK_VERSION, type MealRecord } from '../lib/meal-domain';
import { MAX_IMAGE_BYTES, imageMime } from '../lib/exercise-evidence';
import type {FoodReceipt} from '../lib/food-ai';
type Env = { DB: D1Database; EVIDENCE: R2Bucket };
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: privateHeaders });
const database = (env: Env) => {
  if (!env.DB || !env.EVIDENCE) throw new Error('Storage unavailable');
  return env.DB;
};
export async function meals(
  request: Request,
  env: Env,
  owner: string,
  limitedBody: (r: Request) => Promise<FormData>,
) {
  const url = new URL(request.url);
  if (url.pathname === '/api/meals' && request.method === 'GET') {
    const rows = await database(env)
      .prepare(
        'SELECT payload FROM meal_submissions WHERE owner_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 100',
      )
      .bind(owner)
      .all<{ payload: string }>();
    return json({ records: rows.results.map((r) => JSON.parse(r.payload)) });
  }
  const image = url.pathname.match(/^\/api\/meals\/([a-f0-9-]{36})\/image$/);
  if (image && request.method === 'GET') {
    const row = await database(env)
      .prepare(
        'SELECT payload FROM meal_submissions WHERE id = ? AND owner_id = ?',
      )
      .bind(image[1], owner)
      .first<{ payload: string }>();
    if (!row) return json({ error: '找不到照片。' }, 404);
    const record: MealRecord = JSON.parse(row.payload);
    const object = record.imageKey
      ? await env.EVIDENCE.get(record.imageKey)
      : null;
    if (!object) return json({ error: '此紀錄沒有可讀取的照片。' }, 404);
    return new Response(object.body as unknown as BodyInit, {
      headers: {
        ...privateHeaders,
        'Content-Type': record.imageType!,
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  }
  if (url.pathname !== '/api/meals' || request.method !== 'POST')
    return json({ error: '不支援此操作。' }, 404);
  if (
    request.headers.get('Origin') !== url.origin ||
    request.headers.get('Sec-Fetch-Site') === 'cross-site'
  )
    return json({ error: '請從本站提交。' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('multipart/form-data;'))
    return json({ error: '上傳格式不正確。' }, 415);
  const form = await limitedBody(request);
  const raw = form.get('record');
  let input;
  try {
    if (typeof raw !== 'string' || raw.length > 6000) throw new Error();
    input = JSON.parse(raw);
  } catch {
    return json({ error: '飲食資料格式不正確。' }, 400);
  }
  let answers;
  try {
    answers = validateMeal(input);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  if (
    (input.photoReason !== undefined && (typeof input.photoReason !== 'string' || input.photoReason.length > 300)) ||
    (input.revisionReason !== undefined && (typeof input.revisionReason !== 'string' || input.revisionReason.length > 300)) ||
    !['photo', 'manual'].includes(input.mode)
  )
    return json({ error: '請檢查照片來源與說明（限 300 字）。' }, 400);
  const latestRow = await database(env)
    .prepare(
      'SELECT payload FROM meal_submissions WHERE owner_id = ? AND record_date = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
    )
    .bind(owner, answers.date)
    .first<{ payload: string }>();
  const latest: MealRecord | null = latestRow
    ? JSON.parse(latestRow.payload)
    : null;
  if ((latest?.id ?? null) !== input.previousId)
    return json({ error: '這天已在其他頁面更新，請重新載入後再編輯。' }, 409);
  const count = await database(env)
    .prepare('SELECT COUNT(*) AS n FROM meal_submissions WHERE owner_id = ?')
    .bind(owner)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= 100)
    return json({ error: '已達原型 100 筆修訂上限。' }, 429);
  const file = form.get('image');
  let bytes: ArrayBuffer | null = null;
  let imageKey = latest?.imageKey ?? null,
    imageType = latest?.imageType ?? null,
    imageHash = latest?.imageHash ?? null;
  const id = crypto.randomUUID();
  if (input.mode === 'photo') {
    if (file instanceof File && file.size) {
      if (file.size > MAX_IMAGE_BYTES)
        return json({ error: '照片上限為 5 MB。' }, 400);
      bytes = await file.arrayBuffer();
      imageType = imageMime(new Uint8Array(bytes));
      if (!imageType || imageType !== file.type)
        return json({ error: '請選擇有效的 JPG、PNG 或 WebP 照片。' }, 400);
      imageKey = `meal/${id}`;
      imageHash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
        (x) => x.toString(16).padStart(2, '0'),
      ).join('');
    } else if (!imageKey)
      return json({ error: '請選取餐點照片，或改用無照片補填。' }, 400);
  } else {
    if (file instanceof File && file.size)
      return json({ error: '無照片補填不可附帶檔案。' }, 400);
    imageKey = null;
    imageType = null;
    imageHash = null;
  }
  let analysis:FoodReceipt|null=null;
  if(input.analysisId){
    if(typeof input.analysisId!=='string'||input.analysisId.length>36||!imageHash)return json({error:'AI 結果與照片不符，請重新辨識或取消使用 AI 結果。'},400);
    const stored=await database(env).prepare('SELECT payload FROM food_ai_attempts WHERE id = ? AND owner_id = ? AND image_hash = ?').bind(input.analysisId,owner,imageHash).first<{payload:string|null}>();
    if(!stored?.payload)return json({error:'AI 結果與照片不符，請重新辨識或取消使用 AI 結果。'},400);
    analysis=JSON.parse(stored.payload);
  }
  const record: MealRecord = {
    ...answers,
    id,
    previousId: latest?.id ?? null,
    createdAt: new Date().toISOString(),
    imageKey,
    imageType,
    imageHash,
    photoReason: input.mode === 'manual' ? input.photoReason?.trim() ?? '' : '',
    revisionReason: input.revisionReason?.trim() ?? '',
    source: 'self-report',
    ...(answers.details ? { feedbackVersion: MEAL_FEEDBACK_VERSION } : {}),
    analysis,
  };
  if (bytes)
    await env.EVIDENCE.put(imageKey!, bytes, {
      httpMetadata: { contentType: imageType! },
    });
  try {
    const result = await database(env)
      .prepare(
        "INSERT INTO meal_submissions (id, owner_id, record_date, created_at, payload) SELECT ?, ?, ?, ?, ? WHERE COALESCE((SELECT id FROM meal_submissions WHERE owner_id = ? AND record_date = ? ORDER BY created_at DESC, rowid DESC LIMIT 1), '') = ?",
      )
      .bind(
        id,
        owner,
        answers.date,
        record.createdAt,
        JSON.stringify(record),
        owner,
        answers.date,
        latest?.id ?? '',
      )
      .run();
    if (result.meta.changes !== 1) {
      if (bytes) await env.EVIDENCE.delete(imageKey!);
      return json({ error: '這天的紀錄已更新，請重新載入後再編輯。' }, 409);
    }
  } catch (e) {
    if (bytes) await env.EVIDENCE.delete(imageKey!);
    throw e;
  }
  return json({ record }, 201);
}
