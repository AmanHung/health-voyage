import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { meals } from './meals';
import { foodAiRoute } from './food-ai';
import {
  DEMO_DATE,
  MAX_IMAGE_BYTES,
  imageMime,
  parseExerciseRecognition,
  validateOcrLayout,
  validateMetrics,
  type EvidenceRecord,
} from '../lib/exercise-evidence';
type Env = {
  DB: D1Database;
  EVIDENCE: R2Bucket;
  OPENAI_API_KEY?: string;
  ASSETS: { fetch: typeof fetch };
};
type Row = { id: string; payload: string };
const headers = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers });
const db = (env: Env) => {
  if (!env.DB || !env.EVIDENCE) throw new Error('Storage unavailable');
  return env.DB;
};
async function rows(env: Env, owner: string) {
  return (
    await db(env)
      .prepare(
        'SELECT id, payload FROM exercise_submissions WHERE owner_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 100',
      )
      .bind(owner)
      .all<Row>()
  ).results;
}
async function limitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('缺少上傳資料。');
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_IMAGE_BYTES + 100000) {
        await reader.cancel();
        throw new Error('上傳資料過大，截圖上限為 5 MB。');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    body.set(p, offset);
    offset += p.length;
  }
  return new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
    body,
  }).formData();
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const owner = request.headers.get('oai-authenticated-user-id');
    if (!owner)
      return json(
        { error: '登入識別資訊不完整，請重新登入後再存取私人紀錄。' },
        401,
      );
    try {
      if(url.pathname==='/api/food-ai') return await foodAiRoute(request,env,owner,limitedBody);
      if (
        url.pathname === '/api/meals' ||
        url.pathname.startsWith('/api/meals/')
      )
        return await meals(request, env, owner, limitedBody);
      if (url.pathname === '/api/exercise' && request.method === 'GET') {
        return json({
          records: (await rows(env, owner)).map((x) => JSON.parse(x.payload)),
        });
      }
      const imageMatch = url.pathname.match(
        /^\/api\/exercise\/([a-f0-9-]{36})\/image$/,
      );
      if (imageMatch && request.method === 'GET') {
        const row = await db(env)
          .prepare(
            'SELECT id, payload FROM exercise_submissions WHERE id = ? AND owner_id = ?',
          )
          .bind(imageMatch[1], owner)
          .first<Row>();
        if (!row) return json({ error: '找不到截圖。' }, 404);
        const record: EvidenceRecord = JSON.parse(row.payload);
        if (!record.imageKey) return json({ error: '此筆為純手動紀錄。' }, 404);
        const object = await env.EVIDENCE.get(record.imageKey);
        if (!object) return json({ error: '截圖暫時無法讀取。' }, 404);
        return new Response(object.body as unknown as BodyInit, {
          headers: {
            ...headers,
            'Content-Type': record.imageType!,
            'Content-Security-Policy': "default-src 'none'; sandbox",
            'Content-Disposition': `inline; filename="exercise-${record.id}.${record.imageType === 'image/png' ? 'png' : record.imageType === 'image/jpeg' ? 'jpg' : 'webp'}"`,
          },
        });
      }
      if (url.pathname !== '/api/exercise' || request.method !== 'POST')
        return json({ error: '不支援此操作。' }, 404);
      if (
        request.headers.get('Origin') !== url.origin ||
        request.headers.get('Sec-Fetch-Site') === 'cross-site'
      )
        return json({ error: '請從本站提交紀錄。' }, 403);
      if (
        !request.headers.get('content-type')?.startsWith('multipart/form-data;')
      )
        return json({ error: '上傳格式不正確。' }, 415);
      const form = await limitedBody(request);
      const raw = form.get('record');
      if (typeof raw !== 'string' || raw.length > 60000)
        return json({ error: '紀錄格式不正確。' }, 400);
      let input;
      try {
        input = JSON.parse(raw);
      } catch {
        return json({ error: '紀錄格式不正確。' }, 400);
      }
      if (
        !input ||
        typeof input !== 'object' ||
        input.date !== DEMO_DATE
      )
        return json({ error: '請檢查紀錄格式與示範日期。' }, 400);
      const metrics = validateMetrics({
        steps: input.steps,
        minutes: input.minutes,
      });
      if (!['步行', '伸展', '自行車', '其他', '今日休息'].includes(input.kind))
        return json({ error: '請選擇運動種類。' }, 400);
      if (input.reason !== undefined && (typeof input.reason !== 'string' || input.reason.length > 300))
        return json({ error: '說明限 300 字。' }, 400);
      const previousRows = await rows(env, owner);
      const latest: EvidenceRecord | null = previousRows[0]
        ? JSON.parse(previousRows[0].payload)
        : null;
      if ((latest?.id ?? null) !== input.previousId)
        return json(
          { error: '紀錄已在其他頁面更新，請重新開啟後再編輯。' },
          409,
        );
      if (previousRows.length >= 100)
        return json({ error: '本原型已達 100 筆修訂測試上限。' }, 429);
      const image = form.get('image');
      const hasFile = image instanceof File && image.size > 0;
      if (!['screenshot', 'manual'].includes(input.source))
        return json({ error: '請選擇紀錄來源。' }, 400);
      let recognition = latest?.recognition ?? null;
      let imageKey = latest?.imageKey ?? null,
        imageType = latest?.imageType ?? null,
        imageHash = latest?.imageHash ?? null;
      const id = crypto.randomUUID();
      let bytes: ArrayBuffer | null = null;
      if (input.source === 'screenshot') {
        if (hasFile) {
          if (image.size > MAX_IMAGE_BYTES)
            return json({ error: '截圖上限為 5 MB。' }, 400);
          bytes = await image.arrayBuffer();
          imageType = imageMime(new Uint8Array(bytes));
          if (!imageType || imageType !== image.type)
            return json({ error: '請選擇有效的 PNG、JPG 或 WebP 截圖。' }, 400);
          imageHash = Array.from(
            new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
            (x) => x.toString(16).padStart(2, '0'),
          ).join('');
          if (
            !input.recognition ||
            typeof input.recognition.text !== 'string' ||
            input.recognition.text.length > 20000 ||
            !['recognized', 'failed'].includes(input.recognition.status)
          )
            return json({ error: '辨識紀錄不完整，請重新選取截圖。' }, 400);
          const text = input.recognition.text;
          let layout;
          try {
            layout = validateOcrLayout(input.recognition.layout);
          } catch {
            return json({ error: '辨識版面資料不正確，請重新選取截圖。' }, 400);
          }
          recognition = {
            ...parseExerciseRecognition(text, layout),
            text,
            layout,
            status: input.recognition.status,
            engine: 'Tesseract.js 6 / text-and-numeric-layout-v2',
          };
          imageKey = `exercise/${id}`;
        } else if (!imageKey || latest?.source !== 'screenshot')
          return json({ error: '請先選取運動截圖。' }, 400);
      } else {
        if (hasFile) return json({ error: '手動模式不可附帶截圖。' }, 400);
        recognition = null;
        imageKey = null;
        imageType = null;
        imageHash = null;
      }
      const record: EvidenceRecord = {
        ...metrics,
        id,
        previousId: latest?.id ?? null,
        kind: input.kind,
        date: DEMO_DATE,
        createdAt: new Date().toISOString(),
        reason: input.reason?.trim() ?? '',
        source: input.source,
        recognition,
        imageKey,
        imageType,
        imageHash,
      };
      if (bytes)
        await env.EVIDENCE.put(imageKey!, bytes, {
          httpMetadata: { contentType: imageType! },
        });
      try {
        const result = await db(env)
          .prepare(
            "INSERT INTO exercise_submissions (id, owner_id, created_at, payload) SELECT ?, ?, ?, ? WHERE COALESCE((SELECT id FROM exercise_submissions WHERE owner_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1), '') = ?",
          )
          .bind(
            id,
            owner,
            record.createdAt,
            JSON.stringify(record),
            owner,
            latest?.id ?? '',
          )
          .run();
        if (result.meta.changes !== 1) {
          if (bytes) await env.EVIDENCE.delete(imageKey!);
          return json({ error: '紀錄已更新，請重新開啟再編輯。' }, 409);
        }
      } catch (e) {
        if (bytes) await env.EVIDENCE.delete(imageKey!);
        throw e;
      }
      return json({ record }, 201);
    } catch (error) {
      if (
        error instanceof Error &&
        /步數|時間|至少|上傳|缺少/.test(error.message)
      )
        return json({ error: error.message }, 400);
      // Never log screenshots, extracted text, owner identity, or submitted data.
      console.error('private_records_api_unavailable');
      return json(
        { error: '尚未儲存成功，請稍後重試。請勿關閉已填寫的表單。' },
        503,
      );
    }
  },
};
