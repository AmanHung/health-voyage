'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  Compass,
  Footprints,
  Utensils,
  Pill,
  ArrowUpRight,
  CalendarDays,
  Trophy,
  LayoutDashboard,
  ShieldCheck,
  Waves,
  Check,
  ArrowRight,
  Download,
  Search,
  MessageCircle,
  LockKeyhole,
  Award,
  Sprout,
  Flag,
  UserRound,
  CircleHelp,
  Link2,
  Clock,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  ExerciseForm,
  EvidenceHistory,
  loadExerciseRecords,
} from '@/components/exercise-form';
import { exerciseText, type EvidenceRecord } from '@/lib/exercise-evidence';
import { MealForm, MealSummary, useMealRecords } from '@/components/meal-form';
import { ProfileMenu } from '@/components/profile-menu';
import { HomeLeaderboard } from '@/components/home-leaderboard';
import { TaskCalendar } from '@/components/task-calendar';
import { MEAL_TODAY, latestMeals } from '@/lib/meal-domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  completion,
  medicineComplete,
  needsCare,
  statusLabels,
  validInvitation,
  csvCell,
  sanitizeMedicines,
  type Exercise,
  type Medicines,
  type MedicineStatus,
} from '@/lib/demo-domain';

type View = 'today' | 'history' | 'account' | 'admin';
type Modal = 'exercise' | 'meal' | 'medicine' | 'patient' | null;
type WebTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelDocument = Document & {
  modelContext?: {
    registerTool: (
      tool: WebTool,
      options: { signal: AbortSignal },
    ) => void | Promise<void>;
  };
};
const emptyMeds = (): Medicines => ({
  morning: { status: '', reason: '' },
  evening: { status: '', reason: '' },
});
const labels = {
  today: '首頁',
  history: '健康紀錄',
  account: '我的帳號',
  admin: '管理端示範',
};

export default function Home() {
  const [view, setView] = useState<View>('today');
  const [modal, setModal] = useState<Modal>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [exerciseRecords, setExerciseRecords] = useState<EvidenceRecord[]>([]);
  const [exerciseReady, setExerciseReady] = useState(false);
  const [exerciseLoadError, setExerciseLoadError] = useState('');
  const [exerciseSaving, setExerciseSaving] = useState(false);
  const mealData = useMealRecords();
  const todayMeal = latestMeals(mealData.records).find(
    (r) => r.date === MEAL_TODAY,
  );
  const meal = todayMeal
    ? {
        period: todayMeal.period,
        tags: todayMeal.groups,
        photo: todayMeal.imageKey ? `/api/meals/${todayMeal.id}/image` : '',
      }
    : null;
  const [mealSaving, setMealSaving] = useState(false);
  const [meds, setMeds] = useState<Medicines>(emptyMeds);
  const [nickname, setNickname] = useState('慢慢走也很好');
  const [participating, setParticipating] = useState(false);
  const [bound, setBound] = useState(true);
  const [bindStep, setBindStep] = useState<'line' | 'details' | 'pending'>(
    'line',
  );
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [historyFilter, setHistoryFilter] = useState('全部');
  const [search, setSearch] = useState('');
  const [careFilter, setCareFilter] = useState('全部個案');
  const [careResolved, setCareResolved] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [audit, setAudit] = useState<string[]>([]);
  const [medicineDraft, setMedicineDraft] = useState<Medicines>(emptyMeds);
  const done = completion(exercise, !!meal, meds);
  const points = 140 + done * 10;
  const liveState = useRef({ exercise, meal, meds, bound, done });
  liveState.current = { exercise, meal, meds, bound, done };
  useEffect(() => {
    let active = true;
    loadExerciseRecords()
      .then((records) => {
        if (!active) return;
        setExerciseRecords(records);
        setExercise(records[0] ?? null);
        setExerciseReady(true);
      })
      .catch((e) => {
        if (active) setExerciseLoadError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const context = (document as ModelDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registrations: WebTool[] = [
      {
        name: 'read_demo_summary',
        title: '查看健康航程示範狀態',
        description:
          'Read the current in-memory demo task state. No real patient data.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          demo: true,
          bound: liveState.current.bound,
          completed: liveState.current.done,
          total: 3,
        }),
      },
      {
        name: 'start_exercise_record',
        title: '開啟截圖辨識與確認表單',
        description:
          'Open the exercise screenshot form. Does not submit or save a record. The user selects a demonstration screenshot and confirms values before saving.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input) => {
          if (!liveState.current.bound)
            throw new Error('請先完成示範帳號綁定。');
          if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            Object.keys(input).length
          )
            throw new Error('此操作不接受欄位。');
          flushSync(() => {
            setView('today');
            setModal('exercise');
          });
          return {
            demo: true,
            opened: true,
            saved: false,
          };
        },
      },
    ];
    registrations.forEach((tool) => {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {
          /* Optional browser capability; visible controls remain available. */
        });
      } catch {
        /* Unsupported browser implementation. */
      }
    });
    return () => lifecycle.abort();
  }, []);
  function navigate(next: View) {
    setView(next);
    setError('');
  }
  function openTask(next: Modal) {
    setError('');
    if (next === 'medicine') setMedicineDraft(structuredClone(meds));
    setModal(next);
  }
  function saveMedicine(event: FormEvent) {
    event.preventDefault();
    if (!medicineDraft.morning.status && !medicineDraft.evening.status) {
      setError('請至少回報一個時段。');
      return;
    }
    setMeds(sanitizeMedicines(medicineDraft));
    setCareResolved(false);
    setModal(null);
    setToast(
      medicineComplete(medicineDraft)
        ? '用藥回報已完成。感謝您真實記錄。'
        : '已儲存目前回報，其餘時段可稍後補上。',
    );
  }
  function startBinding() {
    setBound(false);
    setParticipating(false);
    setBindStep('line');
    setCode('');
    setConsent(false);
    setView('account');
    setError('');
  }
  function submitBinding(event: FormEvent) {
    event.preventDefault();
    if (!validInvitation('王示範', code)) {
      setError('原型只接受示範綁定碼 HV2026。請勿輸入真實資料。');
      return;
    }
    if (nickname.trim().length < 2 || nickname.trim().length > 12) {
      setError('暱稱請輸入 2～12 個字。');
      return;
    }
    if (!consent) {
      setError('請先確認示範模式說明。');
      return;
    }
    setNickname(nickname.trim());
    setBindStep('pending');
    setError('');
    setAudit((a) => ['王示範提交綁定申請（示範）', ...a]);
  }
  function approve() {
    setBound(true);
    setAudit((a) => ['管理員完成王示範的身分核對（示範）', ...a]);
    setToast('示範帳號已啟用，可回到今日任務。');
  }
  function saveFeedback(event: FormEvent) {
    event.preventDefault();
    if (!feedbackDraft.trim()) {
      setError('請先輸入示範回饋。');
      return;
    }
    setFeedback(feedbackDraft.trim());
    setAudit((a) => ['管理員新增一則站內回饋（未傳送 LINE）', ...a]);
    setModal(null);
    setToast('回饋已顯示在個案首頁，未發送任何外部訊息。');
  }
  const patientRows = [
    {
      id: 'DEMO-001',
      name: '王示範',
      nick: nickname,
      status: !bound
        ? '待綁定審核'
        : needsCare(meds) && !careResolved
          ? '待關懷'
          : careResolved
            ? '已關懷'
            : '持續追蹤',
      completion: `${done} / 3`,
      steps: exercise?.steps ?? '未填',
    },
    {
      id: 'DEMO-002',
      name: '陳示範',
      nick: '晨光散步',
      status: '持續追蹤',
      completion: '3 / 3',
      steps: 5200,
    },
    {
      id: 'DEMO-003',
      name: '林示範',
      nick: '森林小徑',
      status: '待關懷',
      completion: '1 / 3',
      steps: 2800,
    },
  ];
  const filteredPatients = patientRows.filter(
    (p) =>
      (careFilter === '全部個案' || p.status === careFilter) &&
      `${p.id}${p.name}${p.nick}`.includes(search),
  );
  function exportDemo() {
    const rows = [
      [
        '原型示範資料',
        '個案代碼',
        '姓名',
        '公開暱稱',
        '狀態',
        '今日任務',
        '今日步數',
      ],
      ...filteredPatients.map((p) => [
        '不供臨床使用',
        p.id,
        p.name,
        p.nick,
        p.status,
        p.completion,
        p.steps,
      ]),
    ];
    const blob = new Blob(
      ['\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '健康航程_示範個案摘要.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('已匯出目前篩選的示範個案摘要。');
  }
  const taskData = [
    {
      key: 'exercise',
      icon: Footprints,
      kicker: '動一動',
      title: '記錄今天的運動',
      desc: '選截圖，或自己填數字。',
      type: '運動',
      done: !!exercise,
      detail: exercise ? exerciseText(exercise) : '依個人照護目標，量力而為',
    },
    {
      key: 'meal',
      icon: Utensils,
      kicker: '好好吃',
      title: '記錄飲食',
      desc: '拍一餐，點選吃了什麼。',
      type: '飲食',
      done: !!meal,
      detail: meal
        ? `${meal.period} · ${meal.tags.join('、') || '餐點已記錄'}`
        : '不必寫菜名；誠實記錄就能完成任務',
    },
    {
      key: 'medicine',
      icon: Pill,
      kicker: '安心用藥',
      title: '回報今天的用藥',
      desc: '已吃、未吃或有疑問，直接點選。',
      type: '用藥',
      done: medicineComplete(meds),
      detail: `早：${statusLabels[meds.morning.status]} · 晚：${statusLabels[meds.evening.status]}`,
    },
  ];
  const records = [
    ...(exercise
      ? [
          {
            date: '09 / 02',
            category: '運動',
            title: `${exercise.kind} · ${exerciseText(exercise)}`,
            detail: exerciseRecords[0]?.imageKey
              ? '截圖佐證已留存 · 可手動修正'
              : '手動填報 · 無截圖佐證',
          },
        ]
      : []),
    ...(meal
      ? [
          {
            date: '09 / 02',
            category: '飲食',
            title: `${meal.period}餐點`,
            detail: meal.tags.join('、') || '已留下餐點紀錄',
          },
        ]
      : []),
    ...(['morning', 'evening'] as const)
      .filter((k) => meds[k].status)
      .map((k) => ({
        date: '09 / 02',
        category: '用藥',
        title: `${k === 'morning' ? '早上' : '晚上'} · ${statusLabels[meds[k].status]}`,
        detail: meds[k].reason || '示範用藥時段',
      })),
    {
      date: '09 / 01',
      category: '運動',
      title: '步行 · 3,200 步',
      detail: '25 分鐘 · 預設示範紀錄',
    },
    {
      date: '09 / 01',
      category: '飲食',
      title: '午餐餐點',
      detail: '有蔬菜 · 預設示範紀錄',
    },
    {
      date: '09 / 01',
      category: '用藥',
      title: '早晚用藥均已回報',
      detail: '預設示範紀錄',
    },
  ].filter((x) => historyFilter === '全部' || x.category === historyFilter);

  return (
    <div className="voyage-app">
      <main className="workspace">
        <header className="topbar home-topbar">
          <Button variant="ghost" className="home-brand" aria-label="健康航程，回到首頁" onClick={() => navigate('today')}><Compass aria-hidden /><span>健康航程</span></Button>
          <div className="profile-area"><span className="profile-hint">我的</span><ProfileMenu nickname={nickname} onNavigate={navigate} /></div>
        </header>
        {view !== 'today' && <nav className="page-return" aria-label="返回首頁"><Button variant="ghost" onClick={() => navigate('today')}><ArrowRight className="return-arrow" aria-hidden />首頁</Button><span aria-current="page">{labels[view]}</span></nav>}
        <div className="content">
          {!bound && view !== 'admin' ? (
            <div className="intro-panel surface">
              <div className="login-emblem">
                <Link2 />
              </div>
              <h1>從 LINE，開始健康航程。</h1>
              <p className="muted">只綁定一次，之後每次回來更輕鬆。</p>
              <div className="steps">
                <span className={bindStep === 'line' ? 'active' : ''}>
                  01 LINE 授權
                </span>
                <span className={bindStep === 'details' ? 'active' : ''}>
                  02 身分綁定
                </span>
                <span className={bindStep === 'pending' ? 'active' : ''}>
                  03 管理員確認
                </span>
              </div>
              <div className="prototype-notice">
                此處僅模擬流程，不會登入
                LINE。請使用示範姓名及綁定碼，不要輸入真實個資。
              </div>
              <div style={{ marginTop: 24 }}>
                {bindStep === 'line' ? (
                  <>
                    <Button
                      className="full-button"
                      onClick={() => setBindStep('details')}
                    >
                      <MessageCircle />
                      模擬 LINE 授權（不連線）
                      <ArrowRight />
                    </Button>
                    <p className="legend">
                      正式版將從官方帳號圖文選單進入 LIFF，再由伺服器驗證 LINE
                      身分。
                    </p>
                  </>
                ) : bindStep === 'details' ? (
                  <form className="form-stack" onSubmit={submitBinding}>
                    <label>
                      姓名（固定示範資料）
                      <Input value="王示範" readOnly />
                    </label>
                    <label>
                      一次性綁定碼
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="請輸入 HV2026"
                        maxLength={12}
                        autoComplete="off"
                        required
                      />
                    </label>
                    <label>
                      公開暱稱
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        minLength={2}
                        maxLength={12}
                        required
                      />
                    </label>
                    <small className="muted">
                      排行榜只顯示暱稱；姓名及院內識別資料僅管理端可見。
                    </small>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        我了解這是示範綁定，這裡填寫的姓名與綁定碼不會送出或保存。運動與飲食在按下儲存後才保存。本勾選不替代正式個資告知與同意程序。
                      </span>
                    </label>
                    {error && (
                      <p role="alert" className="error">
                        {error}
                      </p>
                    )}
                    <Button type="submit" className="full-button">
                      提交示範綁定申請
                      <ArrowRight />
                    </Button>
                  </form>
                ) : (
                  <div className="form-stack">
                    <div className="gentle-note" style={{ margin: 0 }}>
                      <ShieldCheck />
                      <div>
                        <strong>申請已送至示範管理端</strong>
                        <p>
                          核對完成後才可進入個案紀錄。正式版不會讓參與者自行核准。
                        </p>
                      </div>
                    </div>
                    <Button
                      className="full-button"
                      onClick={() => navigate('admin')}
                    >
                      切換管理端，體驗審核流程
                      <ArrowRight />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {view === 'today' && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">
                        每一個小行動，都讓健康前進一點。
                      </p>
                      <h1>早安，{nickname}。</h1>
                      <p>今天，也一起照顧好自己。</p>
                    </div>
                    <span className="date-label">
                      示範日期：9 月 2 日，星期三
                    </span>
                  </div>
                  <section className="surface daily-progress"><strong>今日完成 {done}／3 項</strong><Progress value={done / 3 * 100} aria-label="今日任務完成進度" /><span>{done === 3 ? '三項完成，點亮今天的星星！' : '每記錄一項，前進一步。'}</span></section>
                  <div className="section-heading">
                    <h2>今日健康任務</h2>
                    <span>點選下方按鈕</span>
                  </div>
                  <div className="task-grid">
                    {taskData.map(
                      (
                        {
                          key,
                          icon: I,
                          kicker,
                          title,
                          desc,
                          type,
                          done: finished,
                          detail,
                        },
                        i,
                      ) => (
                        <section className={`task-card task-${i}`} key={key}>
                          <div className="task-top">
                            <span className="task-icon">
                              <I />
                            </span>
                            <span className={finished ? 'pill' : 'task-tag'}>
                              {finished ? '已完成' : kicker}
                            </span>
                          </div>
                          <h3>{title}</h3>
                          <p>{desc}</p>
                          <div className="task-detail">{detail}</div>
                          <Button
                            className="action-button"
                            onClick={() => openTask(key as Modal)}
                          >
                            {finished ? `查看／修改${type}` : `記錄${type}`}
                            {finished ? <Check /> : <ArrowUpRight />}
                          </Button>
                          <small>
                            {finished
                              ? '可修正紀錄，不重複加分'
                              : '完成紀錄 +10 航程點'}
                          </small>
                        </section>
                      ),
                    )}
                  </div>
                  <div className="home-overview">
                    <TaskCalendar today={MEAL_TODAY} exerciseDates={exerciseRecords.map(r => r.date)} mealDates={mealData.records.map(r => r.date)} exerciseReady={exerciseReady} mealReady={mealData.ready} medicineDone={medicineComplete(meds)} />
                    <HomeLeaderboard nickname={nickname} steps={exercise?.steps ?? 0} participating={participating} onParticipating={v => { setParticipating(v); setToast(v ? '已加入示範步數榜。' : '已退出步數榜。'); }} />
                  </div>
                  <section className="gentle-note">
                    <Waves />
                    <div>
                      <strong>不必比別人快，只要持續照顧自己。</strong>
                      <p>
                        如實記錄就好，請勿為了積分多吃藥。
                      </p>
                    </div>
                  </section>
                  {feedback && (
                    <section className="surface" style={{ marginTop: 20 }}>
                      <p className="eyebrow">照護團隊的話 · 示範站內回饋</p>
                      <p>{feedback}</p>
                      <small className="muted">
                        未發送 LINE 訊息，亦非即時醫療諮詢。
                      </small>
                    </section>
                  )}
                </>
              )}
              {view === 'history' && (
                <>
                  <Heading
                    eyebrow="MY JOURNEY"
                    title="健康紀錄"
                    subtitle="查看與修改過去的紀錄。"
                  />
                  <div className="section-heading">
                    <h2>我的紀錄</h2>
                    <span>僅本人與照護團隊可見</span>
                  </div>
                  <div className="tab-buttons">
                    {['全部', '運動', '飲食', '用藥'].map((x) => (
                      <Button
                        key={x}
                        variant={historyFilter === x ? 'default' : 'outline'}
                        aria-pressed={historyFilter === x}
                        onClick={() => setHistoryFilter(x)}
                      >
                        {x}
                      </Button>
                    ))}
                  </div>
                  <section className="surface">
                    {records.map((r, i) => (
                      <div className="record-row" key={`${r.title}-${i}`}>
                        <div>
                          <small className="muted">
                            {r.date} · {r.category}
                          </small>
                          <p>{r.title}</p>
                          <small className="muted">{r.detail}</small>
                        </div>
                        {r.date === '09 / 02' && (
                          <Button
                            variant="outline"
                            onClick={() =>
                              openTask(
                                r.category === '運動'
                                  ? 'exercise'
                                  : r.category === '飲食'
                                    ? 'meal'
                                    : 'medicine',
                              )
                            }
                          >
                            修改
                          </Button>
                        )}
                      </div>
                    ))}
                    <p className="legend">
                      紀錄完成率不等於服藥遵從率。正式版需另依處方時段計算。
                    </p>
                  </section>
                  {(historyFilter === '全部' || historyFilter === '運動') && (
                    <EvidenceHistory records={exerciseRecords} />
                  )}
                  {(historyFilter === '全部' || historyFilter === '飲食') && (
                    <MealSummary
                      records={mealData.records}
                      ready={mealData.ready}
                      error={mealData.error}
                    />
                  )}
                  {exerciseLoadError && (
                    <p role="alert" className="error">
                      {exerciseLoadError}
                    </p>
                  )}
                </>
              )}
              {view === 'account' && (
                <>
                  <Heading
                    eyebrow="MY ACCOUNT"
                    title="我的帳號"
                    subtitle="修改暱稱與個人設定。"
                  />
                  <div className="two-columns">
                    <section className="surface">
                      <div className="split-row">
                        <div className="account-avatar">
                          <UserRound />
                        </div>
                        <span className="pill">示範帳號已綁定</span>
                      </div>
                      <form
                        className="form-stack"
                        style={{ marginTop: 22 }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const name =
                            new FormData(e.currentTarget)
                              .get('nickname')
                              ?.toString()
                              .trim() ?? '';
                          if (name.length < 2 || name.length > 12) {
                            setError('暱稱需為 2～12 個字。');
                            return;
                          }
                          setNickname(name);
                          setError('');
                          setToast('公開暱稱已更新。');
                        }}
                      >
                        <label>
                          公開暱稱
                          <Input
                            name="nickname"
                            defaultValue={nickname}
                            minLength={2}
                            maxLength={12}
                            required
                          />
                        </label>
                        <small className="muted">
                          請避免使用真實姓名、電話或病歷號。
                        </small>
                        {error && (
                          <p className="error" role="alert">
                            {error}
                          </p>
                        )}
                        <Button type="submit" className="full-button">
                          儲存暱稱
                        </Button>
                      </form>
                      <div className="record-row">
                        <div>
                          <small className="muted">LINE 綁定</small>
                          <p>示範 LINE 使用者</p>
                        </div>
                        <LockKeyhole size={18} />
                      </div>
                      <div className="record-row">
                        <div>
                          <small className="muted">個案代碼</small>
                          <p>DEMO-001</p>
                        </div>
                        <span className="pill">不收集身分證字號</span>
                      </div>
                      <Button
                        variant="outline"
                        className="full-button"
                        style={{ marginTop: 22 }}
                        onClick={startBinding}
                      >
                        體驗首次綁定流程
                        <ArrowRight />
                      </Button>
                      <p className="legend">
                        此按鈕會切換至未綁定示範狀態。正式版的重新綁定須由管理員核對。
                      </p>
                    </section>
                    <section className="surface">
                      <h2>我的航程收藏</h2>
                      <p className="large-number" style={{ marginTop: 15 }}>
                        {points} <small>航程點</small>
                      </p>
                      <p className="muted">
                        今日 +{done * 10} 點 · 三項紀錄每天各計分一次
                      </p>
                      <div className="badge-grid">
                        <div className="achievement">
                          <Sprout />
                          啟航第一步
                          <br />
                          <small>已獲得</small>
                        </div>
                        <div className="achievement">
                          <Award />
                          真實記錄者
                          <br />
                          <small>已獲得</small>
                        </div>
                        <div
                          className="achievement"
                          style={{ opacity: done === 3 ? 1 : 0.55 }}
                        >
                          <Flag />
                          今日三部曲
                          <br />
                          <small>
                            {done === 3 ? '已獲得' : `${done} / 3 項任務`}
                          </small>
                        </div>
                      </div>
                      <section className="gentle-note">
                        <CircleHelp />
                        <div>
                          <strong>資料與聯絡方式</strong>
                          <p>
                            運動與飲食確認保存後會留存於私人儲存區，歷次修訂與原圖也會保留。目前尚未提供刪除、保存期限及正式團隊權限管理，請勿上傳真實個案資料。正式收案前需完成相關流程。
                          </p>
                        </div>
                      </section>
                    </section>
                  </div>
                </>
              )}
              {view === 'admin' && (
                <>
                  <Heading
                    eyebrow="CARE TEAM / DEMO"
                    title="把時間，留給需要關懷的人。"
                    subtitle="此為可自由切換的管理介面示範，沒有正式權限或真實個案。"
                  />
                  <div
                    className="prototype-notice"
                    style={{ marginBottom: 22 }}
                  >
                    正式版須以獨立管理員驗證與權限控管保護此頁。以下所有身分、病歷號與操作均為示範。
                  </div>
                  <div className="task-grid" style={{ marginBottom: 22 }}>
                    <section className="surface">
                      <p className="muted">示範個案</p>
                      <p className="large-number">
                        3 <small>位</small>
                      </p>
                    </section>
                    <section className="surface">
                      <p className="muted">待綁定審核</p>
                      <p className="large-number">
                        {bound ? 0 : 1} <small>位</small>
                      </p>
                    </section>
                    <section className="surface">
                      <p className="muted">待關懷</p>
                      <p className="large-number">
                        {
                          patientRows.filter((p) => p.status === '待關懷')
                            .length
                        }{' '}
                        <small>位</small>
                      </p>
                    </section>
                  </div>
                  <section className="surface">
                    <div
                      className="split-row"
                      style={{ flexWrap: 'wrap', marginBottom: 20 }}
                    >
                      <h2>個案工作清單</h2>
                      <Button variant="outline" onClick={exportDemo}>
                        <Download />
                        匯出示範 CSV
                      </Button>
                    </div>
                    <div className="two-columns" style={{ marginBottom: 20 }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <Search size={18} />
                        <Input
                          aria-label="搜尋示範個案"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="姓名、代碼或暱稱"
                        />
                      </label>
                      <div className="tab-buttons" style={{ margin: 0 }}>
                        {['全部個案', '待關懷', '待綁定審核'].map((x) => (
                          <Button
                            key={x}
                            variant={careFilter === x ? 'default' : 'outline'}
                            onClick={() => setCareFilter(x)}
                          >
                            {x}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {filteredPatients.length === 0 ? (
                      <p
                        className="muted"
                        style={{ padding: 25, textAlign: 'center' }}
                      >
                        沒有符合條件的示範個案。
                      </p>
                    ) : (
                      filteredPatients.map((p) => (
                        <div
                          className="record-row"
                          key={p.id}
                          style={{ flexWrap: 'wrap' }}
                        >
                          <div>
                            <strong>{p.name}</strong>
                            <small className="muted">　{p.id}</small>
                            <p className="muted" style={{ fontSize: 12 }}>
                              公開暱稱：{p.nick} · 今日任務 {p.completion}
                            </p>
                          </div>
                          <div className="split-row">
                            <span className="pill">{p.status}</span>
                            {p.id === 'DEMO-001' ? (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setFeedbackDraft(feedback);
                                  setError('');
                                  setModal('patient');
                                }}
                              >
                                {!bound ? '審核綁定' : '檢視與關懷'}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  setToast(
                                    '此個案為固定範例；請操作王示範，體驗完整的紀錄與關懷流程。',
                                  )
                                }
                              >
                                固定範例
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <p className="legend">
                      「待關懷」為示範工作標記，不等於醫療風險分級。未回報不視為未服藥。
                    </p>
                  </section>
                  <section className="surface" style={{ marginTop: 22 }}>
                    <h2>本次示範操作紀錄</h2>
                    {audit.length ? (
                      audit.map((a, i) => (
                        <p className="legend" key={`${a}-${i}`}>
                          {a}
                        </p>
                      ))
                    ) : (
                      <p className="legend">
                        尚無管理操作。可先體驗帳號綁定，或回報用藥疑問。
                      </p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
          <footer>
            健康航程 · 豐原醫院藥劑科設計原型
            <br />
            未連接 LINE、醫院資料庫或通知服務。不是緊急醫療通報工具。
          </footer>
        </div>
      </main>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (exerciseSaving || mealSaving) return;
          if (!open) {
            setModal(null);
            setError('');
          }
        }}
      >
        <DialogContent className="dialog-form">
          <DialogTitle>
            {modal === 'exercise'
              ? '記錄運動'
              : modal === 'meal'
                ? '留下今天的一餐'
                : modal === 'medicine'
                  ? '記錄用藥'
                  : '個案檢視與關懷'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'patient'
              ? '王示範 · DEMO-001 · 院內病歷號 D00001（虛構）'
              : modal === 'exercise'
                ? '示範日期：2026 / 09 / 02。選截圖或直接填數字。'
                : modal === 'meal'
                  ? '每天記一餐，點選後儲存。僅限示範資料。'
                  : '示範日期：2026 / 09 / 02。用藥回報重整後清除。'}
          </DialogDescription>
          {modal === 'exercise' && (
            <ExerciseForm
              current={exerciseRecords[0] ?? null}
              ready={exerciseReady}
              onBusy={setExerciseSaving}
              onSaved={(record) => {
                setExercise(record);
                setExerciseRecords((previous) => [record, ...previous]);
                setModal(null);
                setToast(
                  record.imageKey
                    ? '原圖與確認值已保存；修改不重複加分。'
                    : '手動紀錄已保存，標註為無截圖佐證。',
                );
              }}
            />
          )}
          {modal === 'meal' && (
            <MealForm
              records={mealData.records}
              ready={mealData.ready}
              error={mealData.error}
              retry={mealData.retry}
              onBusy={setMealSaving}
              onSaved={(record) => {
                mealData.saved(record);
                setModal(null);
                setToast(
                  '照片與本人確認內容已保存；每日只計一次，修訂不重複加分。',
                );
              }}
            />
          )}
          {modal === 'medicine' && (
            <form className="form-stack" onSubmit={saveMedicine}>
              <div className="prototype-notice">
                示範藥品，非您的處方。請勿自行增減藥量。
              </div>
              {(['morning', 'evening'] as const).map((slot, i) => (
                <div key={slot} className="surface" style={{ padding: 17 }}>
                  <div className="split-row" style={{ marginBottom: 12 }}>
                    <strong>
                      {slot === 'morning' ? '早上' : '晚上'} · 示範藥品{' '}
                      {i === 0 ? 'A' : 'B'}
                    </strong>
                    <Pill size={18} />
                  </div>
                  <fieldset className="meal-choice"><legend>服用情形</legend><div className="large-choice-grid">
                    {(['taken', 'missed', 'question', 'later'] as MedicineStatus[]).map(status => {
                      const Icon = status === 'taken' ? Check : status === 'missed' ? X : status === 'question' ? CircleHelp : Clock;
                      return <Button key={status} type="button" variant={medicineDraft[slot].status === status ? 'default' : 'outline'} aria-pressed={medicineDraft[slot].status === status} onClick={() => setMedicineDraft(m => ({ ...m, [slot]: { status, reason: '' } }))}><Icon aria-hidden />{statusLabels[status]}</Button>;
                    })}
                  </div></fieldset>

                </div>
              ))}
              <small className="muted">
                如實點選即可；「稍後再記」不算完成。
              </small>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <Button type="submit" className="full-button">
                儲存用藥回報
                <Check />
              </Button>
            </form>
          )}
          {modal === 'patient' && (
            <div className="form-stack">
              <div className="prototype-notice">
                管理端全部為示範資料。LINE
                識別碼：DEMO-LINE-001。身分資料不會出現在排行榜。
              </div>
              {!bound ? (
                <>
                  <p>
                    綁定狀態：
                    {bindStep === 'pending'
                      ? '等待管理員核對'
                      : '個案尚未完成申請'}
                  </p>
                  <p className="muted">
                    姓名：王示範
                    <br />
                    院內識別碼：D00001
                    <br />
                    公開暱稱：{nickname}
                  </p>
                  <Button
                    className="full-button"
                    disabled={bindStep !== 'pending'}
                    onClick={() => {
                      approve();
                      setModal(null);
                    }}
                  >
                    確認示範身分並啟用帳號
                    <ShieldCheck />
                  </Button>
                </>
              ) : (
                <>
                  <p>
                    今日運動：
                    {exercise ? exerciseText(exercise) : '未記錄'}
                  </p>
                  <EvidenceHistory records={exerciseRecords} />
                  {exerciseLoadError && (
                    <p role="alert" className="error">
                      {exerciseLoadError}
                    </p>
                  )}
                  <p>
                    飲食：
                    {meal
                      ? `${meal.period} · ${meal.tags.join('、') || '已記錄'}`
                      : '未記錄'}
                  </p>
                  {meal?.photo && (
                    <img
                      className="preview-image"
                      src={meal.photo}
                      alt="示範個案已保存的私人餐點照片"
                    />
                  )}
                  {(['morning', 'evening'] as const).map((k) => (
                    <p key={k}>
                      {k === 'morning' ? '早上' : '晚上'}用藥：
                      {statusLabels[meds[k].status]}
                      {meds[k].reason ? `／${meds[k].reason}` : ''}
                    </p>
                  ))}
                  {needsCare(meds) && (
                    <Button
                      variant="outline"
                      disabled={careResolved}
                      onClick={() => {
                        setCareResolved(true);
                        setAudit((a) => [
                          '王示範的用藥回報已標記關懷完成（示範）',
                          ...a,
                        ]);
                        setToast('已標記完成關懷。');
                      }}
                    >
                      {careResolved ? '已標記關懷完成' : '標記已完成關懷'}
                    </Button>
                  )}
                  <form className="form-stack" onSubmit={saveFeedback}>
                    <label>
                      給個案的站內回饋（示範）
                      <Textarea
                        maxLength={250}
                        value={feedbackDraft}
                        onChange={(e) => setFeedbackDraft(e.target.value)}
                        placeholder="例如：謝謝您的紀錄，下次回診時我們一起討論。"
                      />
                    </label>
                    {error && (
                      <p role="alert" className="error">
                        {error}
                      </p>
                    )}
                    <Button className="full-button" type="submit">
                      儲存示範回饋
                      <MessageCircle />
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {toast && (
        <div role="status" aria-live="polite" className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
