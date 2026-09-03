import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, PencilLine, Wheat, Fish, Leaf, Apple, Milk, Nut, CircleHelp, Check, ShieldCheck } from 'lucide-react';
import {
  FOOD_GROUPS,
  PERIODS,
  AMOUNTS,
  GROUP_LABELS,
  MEAL_FEATURES,
  VEGETABLE_AMOUNTS,
  MEAL_SOURCES,
  mealCoaching,
  DRINKS,
  MEAL_GOALS,
  MEAL_TODAY,
  WEEK_START,
  latestMeals,
  mealSummary,
  mealFeedback,
  validateMeal,
  type MealAnswers,
  type MealRecord,
} from '@/lib/meal-domain';

export function useMealRecords() {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    setError('');
    fetch('/api/meals', { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401)
          throw new Error(
            '登入資訊不完整，暫時無法讀取或保存飲食紀錄。請重新登入。',
          );
        if (
          !r.ok ||
          !r.headers.get('content-type')?.includes('application/json')
        )
          throw new Error('尚未連上私人飲食紀錄；可試填，但不會保存或加分。');
        const data = await r.json();
        if (!Array.isArray(data.records))
          throw new Error('飲食紀錄格式不正確。');
        if (!controller.signal.aborted) {
          setRecords(data.records);
          setReady(true);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [attempt]);
  return {
    records,
    ready,
    error,
    retry: () => setAttempt((n) => n + 1),
    saved: (r: MealRecord) => setRecords((old) => [r, ...old]),
  };
}
type Props = {
  records: MealRecord[];
  ready: boolean;
  error: string;
  retry: () => void;
  onBusy: (b: boolean) => void;
  onSaved: (r: MealRecord) => void;
};
export function MealForm(props: Props) {
  const [date, setDate] = useState(MEAL_TODAY);
  const [busy, setBusy] = useState(false);
  const current =
    latestMeals(props.records).find((r) => r.date === date) ?? null;
  return (
    <div className="form-stack">
      <div className="prototype-notice">
        每天記一餐。拍照、點選，不用寫菜名。
      </div>
      <div className="capture-steps"><span>1．留下餐點</span><span>2．快速確認</span><span>3．一個小改變</span></div>
      <label>
        紀錄日期（固定示範週）
        <select
          disabled={busy}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        >
          {[MEAL_TODAY, '2026-09-01', WEEK_START].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <small>離開前，記得按儲存。</small>
      {!props.ready && (
        <div role="status" className="prototype-notice">
          <p>{props.error || '正在讀取既有紀錄，請稍候。'}</p>
          <p>
            未連線可試填，但不會保存。
          </p>
          <a href="/signin-with-chatgpt?return_to=/" target="_top">
            重新登入
          </a>
          　
          <Button type="button" variant="outline" onClick={props.retry}>
            重試讀取
          </Button>
        </div>
      )}
      <MealFields
        key={`${date}-${current?.id ?? 'new'}`}
        date={date}
        current={current}
        ready={props.ready}
        onBusy={(b) => {
          setBusy(b);
          props.onBusy(b);
        }}
        onSaved={props.onSaved}
      />
    </div>
  );
}
function MealFields({
  date,
  current,
  ready,
  onBusy,
  onSaved,
}: {
  date: string;
  current: MealRecord | null;
  ready: boolean;
  onBusy: (b: boolean) => void;
  onSaved: (r: MealRecord) => void;
}) {
  const [answers, setAnswers] = useState<MealAnswers>(
    {
      ...(current ?? {
      date,
      period: '午餐',
      groups: [],
      portion: '不確定',
      eaten: '',
      drink: '',
      goal: MEAL_GOALS[0],
      note: '',
      }),
      details: current?.details ?? { version: 2, vegetableAmount: null, features: [], restrictedDiet: false },
    },
  );
  const [mode, setMode] = useState<'photo' | 'manual'>(
    current && !current.imageKey ? 'manual' : 'photo',
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const saving = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
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
  const field = (key: keyof MealAnswers, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  };
  async function choose(file?: File) {
    if (!file) return;
    const token = ++generation.current;
    setFile(null);
    setError('');
    setLoading(true);
    const url = URL.createObjectURL(file);
    try {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024 ||
        !file.size
      )
        throw new Error('請選擇 5 MB 以內的 JPG、PNG 或 WebP 照片。');
      const img = new Image();
      img.src = url;
      await img.decode();
      if (img.width * img.height > 16000000)
        throw new Error('照片解析度過大，請選擇 1,600 萬像素以內的圖片。');
      if (generation.current === token) {
        setFile(file);
        setMode('photo');
      }
    } catch (e) {
      if (generation.current === token) setError((e as Error).message);
    } finally {
      URL.revokeObjectURL(url);
      if (generation.current === token) setLoading(false);
    }
  }
  let feedback: string[] = [];
  try {
    feedback = mealFeedback(validateMeal(answers));
  } catch {
    /* Show feedback only after every required answer is supplied. */
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving.current) return;
    setError('');
    try {
      const checked = validateMeal(answers);
      if (!ready) throw new Error('尚未連上私人紀錄，這份內容仍未保存。');
      if (mode === 'photo' && !file && !current?.imageKey)
        throw new Error('請選照片，或改用無照片補填。');
      saving.current = true;
      setBusy(true);
      onBusy(true);
      const form = new FormData();
      form.set(
        'record',
        JSON.stringify({
          ...checked,
          mode,
          previousId: current?.id ?? null,
          analysisId: null,
        }),
      );
      if (mode === 'photo' && file) form.set('image', file);
      const response = await fetch('/api/meals', {
        method: 'POST',
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '尚未保存成功。');
      onSaved(data.record);
    } catch (e) {
      setError(
        `${(e as Error).message} 若剛才送出後斷線，請重新讀取確認，避免重複提交。`,
      );
    } finally {
      saving.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  const details = answers.details!;
  const coaching = feedback.length ? mealCoaching(answers) : null;
  function toggleGroup(g: string) {
    setAnswers(a => {
      const groups = g === '不確定' ? ['不確定'] : a.groups.includes(g)
        ? a.groups.filter(x => x !== g) : [...a.groups.filter(x => x !== '不確定'), g];
      return { ...a, groups, details: { ...a.details!, vegetableAmount: groups.includes('蔬菜') ? a.details!.vegetableAmount : null } };
    });
  }
  function toggleFeature(f: string) {
    setAnswers(a => {
      const old = a.details!.features;
      const features = ['以上皆無', '不確定'].includes(f) ? [f] : old.includes(f)
        ? old.filter(x => x !== f) : [...old.filter(x => !['以上皆無', '不確定'].includes(x)), f];
      return { ...a, details: { ...a.details!, features } };
    });
  }
  return (
    <form className="form-stack meal-quick-form" onSubmit={submit}>
      <fieldset
        disabled={busy}
        className="form-stack"
        style={{ border: 0, padding: 0, minWidth: 0 }}
      >
        <div className="tab-buttons" style={{ margin: 0 }}>
          {(['photo', 'manual'] as const).map((m) => (
            <Button
              key={m}
              type="button"
              variant={mode === m ? 'default' : 'outline'}
              aria-pressed={mode === m}
              onClick={() => {
                if (mode === m) return;
                generation.current++;
                setLoading(false);
                  setFile(null);
                setMode(m);
                setError('');
              }}
            >
              {m === 'photo' ? <><Camera aria-hidden />選照片</> : <><PencilLine aria-hidden />沒有照片</>}
            </Button>
          ))}
        </div>
        {mode === 'photo' ? (
          <>
            <label>
              餐點照片
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void choose(e.target.files?.[0])}
              />
            </label>
            <small>
              拍下整份餐點，最大 5 MB。請勿拍入姓名、病歷或人臉。
            </small>
            {(preview || current?.imageKey) && (
              <img
                className="preview-image"
                src={preview || `/api/meals/${current!.id}/image`}
                alt="本次餐點照片"
              />
            )}
            {loading && <p role="status">正在檢查圖片…</p>}
          </>
        ) : (
          <p className="meal-method-note">直接點選餐點內容即可。</p>
        )}
        <small>自己點選，不使用 AI 辨識。</small>
        <MealChoice label="這是哪一餐？" options={PERIODS} value={answers.period} onChange={v => field('period', v)} />
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend>這餐有什麼？（可複選）</legend>
          <div
            className="tab-buttons"
            style={{ flexWrap: 'wrap', marginTop: 10 }}
          >
            {FOOD_GROUPS.map((g) => (
              <Button
                key={g}
                type="button"
                aria-pressed={answers.groups.includes(g)}
                variant={answers.groups.includes(g) ? 'default' : 'outline'}
                onClick={() => toggleGroup(g)}
              >
                <MealGroupIcon group={g} />{GROUP_LABELS[g]}
              </Button>
            ))}
          </div>
        </fieldset>
        <MealChoice label="吃了多少？" options={AMOUNTS} value={answers.eaten} onChange={v => field('eaten', v)} />
        <section className="meal-followups form-stack" aria-label="本餐補充確認">
          <h3>再點選幾項</h3>
          {answers.groups.includes('蔬菜') && <MealChoice label="蔬菜約占多少？" options={VEGETABLE_AMOUNTS} value={details.vegetableAmount ?? ''} onChange={v => { setAnswers(a => ({ ...a, details: { ...a.details!, vegetableAmount: v } })); }} />}
          <fieldset className="meal-choice"><legend>有這些食物嗎？（可複選）</legend>
            <small>加工肉品：香腸、火腿、培根等。</small>
            <div className="meal-options">{MEAL_FEATURES.map(f => <Button key={f} type="button" aria-pressed={details.features.includes(f)} variant={details.features.includes(f) ? 'default' : 'outline'} onClick={() => toggleFeature(f)}>{f}</Button>)}</div>
          </fieldset>
          <MealChoice label="這餐的飲料是否含糖？" options={DRINKS} value={answers.drink} onChange={v => field('drink', v)} />
        </section>
        <Button type="button" className="diet-preference" variant={details.restrictedDiet ? 'default' : 'outline'} aria-pressed={details.restrictedDiet} onClick={() => setAnswers(a => ({ ...a, details: { ...a.details!, restrictedDiet: !a.details!.restrictedDiet } }))}><ShieldCheck aria-hidden />{details.restrictedDiet ? '已選：只要記錄提醒' : '有飲食限制？改為只記錄'}</Button>
        <details className="simple-help"><summary>補充餐點（選填）</summary><label>
          餐點名稱或說明
          <Textarea
            maxLength={300}
            value={answers.note}
            onChange={(e) => field('note', e.target.value)}
            placeholder="例如：雞腿便當、飯吃一半。請勿填寫姓名或病歷號。"
          />
        </label>
        </details>
        {current && <small>儲存後更新今天這餐，不重複加分。</small>}
        <section className="meal-coaching" aria-live="polite">
          <h3>這餐的小提醒</h3>
          <small>依您的填寫內容・尚未儲存</small>
          {coaching ? (
            <><div className="meal-positive"><h4>值得肯定</h4><p>{coaching.positive}</p></div><div className="meal-action"><h4>下一餐，試一件事</h4><p>{coaching.action}</p></div><details className="simple-help"><summary>更多說明</summary><p>{coaching.context}</p><p>{coaching.disclaimer}</p></details></>
          ) : (
            <p>
              點選完成後，這裡會顯示提醒。
            </p>
          )}
        </section>
        <details className="meal-guidance"><summary>回饋依據</summary><p>這是固定規則的一般飲食提醒，不是 AI 判讀或個別營養處方，尚待照護團隊審核。完成記錄即計任務，不按餐點健康程度給分。</p>{MEAL_SOURCES.map(s => <p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>
        <p className="meal-method-note">示範版：按儲存才保存，非即時醫療服務。</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={!ready || busy || loading}
          className="full-button"
        >
          {busy
            ? '正在保存…'
            : current
              ? '儲存這一餐'
              : '儲存這一餐'}<Check aria-hidden />
        </Button>
      </fieldset>
    </form>
  );
}
function MealGroupIcon({group}: {group: string}) {
  const Icon = ({全穀雜糧: Wheat, 豆魚蛋肉: Fish, 蔬菜: Leaf, 水果: Apple, 乳品: Milk, 油脂與堅果: Nut} as Record<string, typeof Wheat>)[group] ?? CircleHelp;
  return <Icon aria-hidden size={26} />;
}
function MealChoice({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (value: string) => void }) {
  return <fieldset className="meal-choice"><legend>{label}</legend><div className="meal-options">{options.map(o => <Button key={o} type="button" aria-pressed={value === o} variant={value === o ? 'default' : 'outline'} onClick={() => onChange(o)}>{o}</Button>)}</div></fieldset>;
}
export function MealSummary({
  records,
  ready,
  error,
}: {
  records: MealRecord[];
  ready: boolean;
  error: string;
}) {
  const summary = mealSummary(records);
  return (
    <section className="surface" style={{ marginTop: 20 }}>
      <div className="split-row">
        <h2>本週已記錄餐次</h2>
        <span className="pill">8 / 31 — 9 / 6</span>
      </div>
      <p className="legend">
        僅計本週已保存餐次，每天選一餐；修訂不重複計算。非全天攝取量、營養評分或診斷。
      </p>
      {!ready ? (
        <p role="status">{error || '正在讀取…'} 無法讀取時不把缺漏視為零。</p>
      ) : !summary.count ? (
        <p>尚無已保存餐次。先記一餐，就能開始累積自己的觀察。</p>
      ) : (
        <>
          <div className="meal-week-grid">
            <div><strong>{summary.count} 天</strong><span>完成一餐紀錄</span></div>
            <div><strong>{summary.vegetablesReported}／{summary.count} 餐</strong><span>本人勾選含蔬菜</span></div>
            <div><strong>{summary.featuresKnown ? `${summary.fried}／${summary.featuresKnown} 餐` : '待確認'}</strong><span>已確認特徵中有油炸</span></div>
            <div><strong>{summary.featuresKnown ? `${summary.processed}／${summary.featuresKnown} 餐` : '待確認'}</strong><span>已確認特徵中有加工肉品</span></div>
          </div>
          <p>含糖飲料：{summary.sugary} 餐；飲料不確定：{summary.unknownDrink} 餐。餐點特徵未填或不確定：{summary.unknownFeatures} 餐，未當成「沒有」。</p>
          <p>
            這些數字只描述您記下的餐次，沒有記錄的餐次不代表沒吃；食用比例也不等於每種食物實際吃下的比例。
          </p>
          <p className="meal-method-note">下週記錄小目標：每天繼續選一餐，依您知道的內容確認；不用追求滿分餐盤。</p>
        </>
      )}
      {ready &&
        latestMeals(records).map((r) => (
          <details
            key={r.id}
            className="record-row"
            style={{ display: 'block' }}
          >
            <summary>
              {r.date} · {r.period} · {r.groups.map(g => GROUP_LABELS[g] ?? g).join('、')}
            </summary>
            {r.imageKey ? (
              <img
                className="preview-image"
                loading="lazy"
                src={`/api/meals/${r.id}/image`}
                alt={`${r.date} 的私人餐點照片`}
              />
            ) : (
              <p>無照片補填{r.photoReason ? `：${r.photoReason}` : ''}</p>
            )}
            {mealFeedback(r).map((p) => (
              <p key={p}>{p}</p>
            ))}
            {r.details && <p>本人確認特徵：{r.details.features.join('、')}；蔬菜占比：{r.details.vegetableAmount ?? '不適用／未選蔬菜'}。{r.details.restrictedDiet && '已選擇只顯示記錄提醒。'}</p>}
            <p>記錄小任務：{r.goal}</p>
            {r.note && <p>補充：{r.note}</p>}
            <small>來源：本人確認。照片是紀錄佐證，不代表已完成 AI 辨識。</small>
            {r.analysis && <details><summary>歷史 AI 候選（非確認事實）</summary>{r.analysis.result.items.map((i,n) => <p key={n}>{i.name} · {i.group} · {i.certainty}</p>)}<small>保留既有分析供追溯；不作為本餐回饋的事實來源。</small></details>}
            <details>
              <summary>查看本日修訂紀錄與原圖</summary>
              {records
                .filter((x) => x.date === r.date)
                .map((x) => (
                  <p key={x.id}>
                    {x.createdAt} · {x.period} · {x.groups.join('、')} ·{' '}
                    {x.portion}／吃了{x.eaten} · 飲料：{x.drink} ·{' '}
                    {x.revisionReason || (x.previousId ? '修訂紀錄' : '首次記錄')}
                    {x.note && ` · ${x.note}`}
                    {x.details && ` · 本人確認特徵：${x.details.features.join('、')} · 蔬菜占比：${x.details.vegetableAmount ?? '未選蔬菜'} · ${x.details.restrictedDiet ? '僅記錄提醒' : '一般飲食提醒'}`}
                    {x.imageKey && (
                      <>
                        {' '}
                        ·{' '}
                        <a
                          href={`/api/meals/${x.id}/image`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          原圖
                        </a>
                      </>
                    )}
                  </p>
                ))}
            </details>
          </details>
        ))}
    </section>
  );
}
