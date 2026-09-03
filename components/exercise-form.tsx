import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Check, FileCheck2, LoaderCircle, Footprints, Clock, PencilLine, Bike, PersonStanding, CircleHelp, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  DEMO_DATE,
  MAX_IMAGE_BYTES,
  imageMime,
  validateMetrics,
  metricText,
  exerciseText,
  type EvidenceRecord,
  type Recognition,
} from '@/lib/exercise-evidence';
import type { Worker } from 'tesseract.js';

export async function loadExerciseRecords(): Promise<EvidenceRecord[]> {
  const response = await fetch('/api/exercise', { cache: 'no-store' });
  if (response.status === 401)
    throw new Error(
      '登入身分資訊不完整，目前無法讀取或儲存。可先在本機辨識圖片；請重新登入私人網站後再試。',
    );
  if (
    !response.ok ||
    !response.headers.get('content-type')?.includes('application/json')
  )
    throw new Error('運動紀錄目前無法載入。請稍後重新開啟，避免覆蓋既有紀錄。');
  return (await response.json()).records;
}
export function ExerciseForm({
  current,
  ready,
  onSaved,
  onBusy,
}: {
  current: EvidenceRecord | null;
  ready: boolean;
  onSaved: (record: EvidenceRecord) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [source, setSource] = useState<'screenshot' | 'manual'>(
    current?.source ?? 'screenshot',
  );
  const [steps, setSteps] = useState(
    current?.steps == null ? '' : String(current.steps),
  );
  const [minutes, setMinutes] = useState(
    current?.minutes == null ? '' : String(current.minutes),
  );
  const [kind, setKind] = useState(current?.kind ?? '步行');
  const [metricMode, setMetricMode] = useState<'steps' | 'minutes'>(
    current?.steps == null && current?.minutes != null ? 'minutes' : 'steps',
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [recognition, setRecognition] = useState<Recognition | null>(
    current?.recognition ?? null,
  );
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scanNote, setScanNote] = useState('');
  const generation = useRef(0);
  const activeWorker = useRef<Worker | null>(null);
  useEffect(
    () => () => {
      generation.current++;
      void activeWorker.current?.terminate();
    },
    [],
  );
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function cancelScan() {
    generation.current++;
    void activeWorker.current?.terminate();
    activeWorker.current = null;
    setScanning(false);
    setRecognition({
      steps: null,
      minutes: null,
      text: '',
      status: 'failed',
      engine: 'Tesseract.js 6',
    });
    setScanNote('已停止辨識，可手動填寫；確認儲存時仍會保留截圖。');
  }
  async function chooseImage(selected?: File) {
    if (!selected) return;
    setError('');
    const g = ++generation.current;
    void activeWorker.current?.terminate();
    activeWorker.current = null;
    setScanning(false);
    if (selected.size > MAX_IMAGE_BYTES || selected.size === 0) {
      setError('請選擇 5 MB 以下的截圖。');
      return;
    }
    const mime = imageMime(
      new Uint8Array(await selected.slice(0, 16).arrayBuffer()),
    );
    if (g !== generation.current) return;
    if (!mime || selected.type !== mime) {
      setError('請選擇 PNG、JPG 或 WebP 截圖；不支援 HEIC。');
      return;
    }
    const decodeUrl = URL.createObjectURL(selected);
    let dimensions = { width: 0, height: 0 };
    try {
      const bitmap = new Image();
      bitmap.src = decodeUrl;
      await bitmap.decode();
      dimensions = { width: bitmap.naturalWidth, height: bitmap.naturalHeight };
      if (
        bitmap.naturalWidth * bitmap.naturalHeight > 16000000 ||
        !bitmap.naturalWidth
      )
        throw new Error('圖片尺寸過大或損壞。');
    } catch {
      if (g === generation.current)
        setError('無法讀取圖片，請選擇完整且不超過 1,600 萬畫素的截圖。');
      return;
    } finally {
      URL.revokeObjectURL(decodeUrl);
    }
    if (g !== generation.current) return;
    setFile(selected);
    setSource('screenshot');
    setRecognition(null);
    setSteps('');
    setMinutes('');
    setScanning(true);
    setProgress(0);
    setScanNote('首次需載入辨識模型，請稍候。截圖在此裝置辨識，確認後才上傳。');
    let worker: Worker | null = null;
    const timer = window.setTimeout(() => {
      if (g === generation.current) {
        cancelScan();
        setScanNote('辨識逾時，請手動確認數值，或改用較清楚的截圖。');
      }
    }, 60000);
    try {
      const { createWorker } = await import('tesseract.js');
      const { recognizeExercise } = await import('@/lib/exercise-ocr');
      const options = {
        workerPath: `${location.origin}/ocr/worker.min.js`,
        corePath: `${location.origin}/ocr/core`,
        langPath: `${location.origin}/ocr/lang`,
        cacheMethod: 'none',
        logger: (message: { progress: number }) => {
          if (g === generation.current)
            setProgress(Math.round(message.progress * 100));
        },
      };
      worker = await createWorker(['chi_tra', 'eng'], 1, options);
      if (g !== generation.current) return;
      activeWorker.current = worker;
      const result = await recognizeExercise(
        worker,
        selected,
        dimensions,
        async () => {
          worker = await createWorker('eng', 1, options);
          activeWorker.current = worker;
          return worker;
        },
        () => g === generation.current,
      );
      if (g !== generation.current) return;
      const metrics = result;
      setRecognition(result);
      setMetricMode(
        metrics.steps != null
          ? 'steps'
          : metrics.minutes != null
            ? 'minutes'
            : 'steps',
      );
      setSteps(metrics.steps == null ? '' : String(metrics.steps));
      setMinutes(metrics.minutes == null ? '' : String(metrics.minutes));
      setScanNote(
        metrics.steps === null && metrics.minutes === null
          ? '未辨識出明確數值，請依截圖手動填寫。原圖仍可儲存。'
          : '已找到候選數值。請核對原圖與日／週／月範圍，只需確認步數或時間其中一項。',
      );
    } catch {
      if (g !== generation.current) return;
      setRecognition({
        steps: null,
        minutes: null,
        text: '',
        status: 'failed',
        engine: 'Tesseract.js 6',
      });
      setScanNote('無法完成辨識，請手動填寫；確認儲存時仍會保留截圖。');
    } finally {
      window.clearTimeout(timer);
      if (worker) void worker.terminate();
      if (g === generation.current) {
        activeWorker.current = null;
        setScanning(false);
      }
    }
  }
  const shownImage =
    preview ||
    (source === 'screenshot' && current?.imageKey
      ? `/api/exercise/${current.id}/image`
      : '');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (!ready) throw new Error('紀錄尚未載入完成，請稍後重試。');
      const metrics = validateMetrics({
        steps: metricMode === 'steps' && steps.trim() ? Number(steps) : null,
        minutes:
          metricMode === 'minutes' && minutes.trim() ? Number(minutes) : null,
      });
      if (source === 'screenshot' && (!shownImage || !recognition))
        throw new Error('請先選取截圖並完成辨識，或選擇手動填寫。');
      setSaving(true);
      onBusy(true);
      const form = new FormData();
      form.set(
        'record',
        JSON.stringify({
          ...metrics,
          date: DEMO_DATE,
          kind,
          source,
          recognition,
          previousId: current?.id ?? null,
        }),
      );
      if (source === 'screenshot' && file) form.set('image', file);
      const response = await fetch('/api/exercise', {
        method: 'POST',
        body: form,
      });
      if (!response.headers.get('content-type')?.includes('application/json'))
        throw new Error('未收到儲存確認，請保留截圖，重新登入後再試。');
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || '未儲存成功，請稍後重試。');
      onSaved(result.record);
    } catch (e) {
      setError(e instanceof Error ? e.message : '尚未儲存成功，請稍後重試。');
    } finally {
      setSaving(false);
      onBusy(false);
    }
  }
  return (
    <form className="form-stack exercise-capture" onSubmit={submit}>
      <div className="capture-steps">
        <span>1．選取截圖</span>
        <span>2．核對數值</span>
        <span>3．儲存佐證</span>
      </div>
      <div className="prototype-notice">
        示範版：請勿上傳姓名、病歷等個資。
      </div>
      <div className="capture-mode">
        <Button
          type="button"
          variant={source === 'screenshot' ? 'default' : 'outline'}
          disabled={saving || scanning}
          onClick={() => {
            setSource('screenshot');
          }}
        >
          <Camera aria-hidden /> 選截圖
        </Button>
        <Button
          type="button"
          variant={source === 'manual' ? 'default' : 'outline'}
          disabled={saving || scanning}
          onClick={() => {
            setSource('manual');
          }}
        >
          <PencilLine aria-hidden /> 自己填
        </Button>
      </div>
      {source === 'screenshot' && (
        <>
          <label className="capture-upload">
            <Camera size={22} />
            <span>選擇運動截圖</span>
            <small>截圖請保留日期與數值，最大 5 MB。</small>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={saving || scanning}
              onChange={(e) => {
                void chooseImage(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {shownImage && (
            <figure className="evidence-preview">
              <img src={shownImage} alt="本次運動原始截圖，請對照數值及日期" />
              <figcaption>
                {file
                  ? '尚未上傳；確認儲存後保留原圖'
                  : '已留存的原始截圖；修正數值不會覆蓋原圖'}
              </figcaption>
            </figure>
          )}
          {scanning && (
            <div role="status">
              <Progress value={progress} />
              <p>
                <LoaderCircle className="spin-inline" size={16} /> 正在辨識……
                {progress}％
              </p>
              <Button type="button" variant="outline" onClick={cancelScan}>
                停止，自己填
              </Button>
            </div>
          )}
          {scanNote && (
            <p className="capture-note" role="status">
              {scanNote}
            </p>
          )}
          {recognition && (
            <div className="recognition-result">
              <FileCheck2 size={20} />
              <div>
                <strong>辨識結果</strong>
                <p>
                  {metricMode === 'steps'
                    ? `步數：${metricText(recognition.steps, '步')}`
                    : `運動時間：${metricText(recognition.minutes, '分鐘')}`}
                </p>
                <small>數字不對，可以直接修改。</small>
              </div>
            </div>
          )}
        </>
      )}
      <div className="capture-mode" aria-label="記錄項目，擇一即可">
        <Button
          type="button"
          variant={metricMode === 'steps' ? 'default' : 'outline'}
          aria-pressed={metricMode === 'steps'}
          disabled={saving || scanning}
          onClick={() => {
            setMetricMode('steps');
          }}
        >
          <Footprints aria-hidden /> 步數
        </Button>
        <Button
          type="button"
          variant={metricMode === 'minutes' ? 'default' : 'outline'}
          aria-pressed={metricMode === 'minutes'}
          disabled={saving || scanning}
          onClick={() => {
            setMetricMode('minutes');
          }}
        >
          <Clock aria-hidden /> 分鐘
        </Button>
      </div>
      <div>
        {metricMode === 'steps' ? (
          <label>
            確認步數
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="100000"
              step="1"
              value={steps}
              onChange={(e) => {
                setSteps(e.target.value);
              }}
              disabled={saving || scanning}
              placeholder="未辨識可手動填寫"
            />
          </label>
        ) : (
          <label>
            確認運動時間（分鐘）
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="1440"
              step="1"
              value={minutes}
              onChange={(e) => {
                setMinutes(e.target.value);
              }}
              disabled={saving || scanning}
              placeholder="請填寫運動分鐘數"
            />
          </label>
        )}
      </div>
      <p className="capture-note">步數或分鐘，選一項就好。</p><details className="simple-help"><summary>更多說明</summary><p>休息可填 0；時間填整分鐘。請填當天數值，不要填目標或週／月合計。只填時間不計入步數排名。</p></details>
      <fieldset className="meal-choice"><legend>做了什麼運動？</legend><div className="large-choice-grid">
        {(['步行', '伸展', '自行車', '其他', '今日休息'] as const).map((k, i) => {
          const Icon = [Footprints, PersonStanding, Bike, CircleHelp, Pause][i];
          return <Button key={k} type="button" variant={kind === k ? 'default' : 'outline'} aria-pressed={kind === k} disabled={saving || scanning} onClick={() => setKind(k)}><Icon aria-hidden />{k}</Button>;
        })}
      </div></fieldset>
      <p className="capture-note">按儲存後，數值與截圖會保留。</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!ready && (
        <div className="error">
          <p>
            尚未連線，暫時不能儲存。請先保留截圖，再重新登入。
          </p>
          <a
            href="/signin-with-chatgpt?return_to=/"
            target="_top"
            className="underline"
          >
            重新登入私人網站
          </a>
        </div>
      )}
      <Button
        className="full-button"
        type="submit"
        disabled={saving || scanning || !ready}
      >
        {saving
          ? '儲存中…'
          : source === 'screenshot'
            ? '儲存運動'
            : '儲存運動'}
        <Check />
      </Button>
    </form>
  );
}

export function EvidenceHistory({ records }: { records: EvidenceRecord[] }) {
  if (!records.length) return <p>尚無已留存的運動佐證。</p>;
  return (
    <section className="evidence-history">
      <h3>運動佐證與修正歷程</h3>
      <p className="capture-note">
        此處為目前網站登入者的示範紀錄，並非正式個案身分。截圖佐證不等同裝置驗證或防作弊認證。
      </p>
      {records.map((record, index) => (
        <details key={record.id} open={index === 0}>
          <summary>
            {index === 0 ? '目前採用' : '保留版本'}：{exerciseText(record)}
            <small>
              {new Date(record.createdAt).toLocaleString('zh-TW', {
                timeZone: 'Asia/Taipei',
              })}{' '}
              ·{' '}
              {record.source === 'screenshot' ? '附原始截圖' : '純手動，無截圖'}
            </small>
          </summary>
          {record.imageKey && (
            <>
              <a
                href={`/api/exercise/${record.id}/image`}
                target="_blank"
                rel="noreferrer"
              >
                開啟原始截圖
              </a>
              <img
                className="evidence-thumb"
                src={`/api/exercise/${record.id}/image`}
                alt="保存的運動佐證截圖"
                loading="lazy"
              />
            </>
          )}
          <dl>
            <dt>原始辨識</dt>
            <dd>
              {record.recognition
                ? exerciseText(record.recognition)
                : '無辨識資料'}
            </dd>
            <dt>個案確認</dt>
            <dd>{exerciseText(record)}</dd>
            <dt>補填／修正原因</dt>
            <dd>{record.reason || '未填寫（不需提供）'}</dd>
          </dl>
          {record.recognition && (
            <details>
              <summary>檢視辨識文字</summary>
              <pre>
                {record.recognition.text || '未取得文字，數值由人工補填。'}
              </pre>
            </details>
          )}
          {record.imageHash && (
            <small className="evidence-hash">
              原圖 SHA-256：{record.imageHash}
            </small>
          )}
        </details>
      ))}
    </section>
  );
}
