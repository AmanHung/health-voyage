import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pill, Check, Plus, RefreshCw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { api, type Auth, type RecordItem } from './api';
import {
  DOSE_STATUSES,
  MEDICATION_PERIODS,
  drugImageUrl,
  taiwanMinute,
  planAt,
  scheduledDoses,
  prnDose,
  medicationSummary,
  validateMedicationPlan,
  type MedicationItem,
  type MedicationPlan,
  type MedicationDose,
  type DoseReport,
} from '../lib/medication';
import { loadDrugCatalog, type CatalogDrug } from './drug-catalog';
import './medication.css';

type MedicationView = {
  plans: MedicationPlan[];
  record: RecordItem | null;
  records?: RecordItem[];
  now: string;
  patient: { id: string; name: string };
  pharmacists?: string[];
  staffVersion?: string | null;
};
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : '目前無法完成，請再試一次。';
const todayMinus = (date: string) =>
  new Date(Date.parse(date) - 30 * 86400000).toISOString().slice(0, 10);
export function MedicationPhoto({
  code,
  name,
  hasImage,
}: {
  code: string;
  name: string;
  hasImage: boolean;
}) {
  const [failed, setFailed] = useState(false),
    [open, setOpen] = useState(false);
  useEffect(() => setFailed(false), [code]);
  return (
    <>
      {hasImage && !failed ? (
        <button
          className="med-photo"
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`放大${name}圖片`}
        >
          <img
            src={drugImageUrl(code)}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
          <span>點圖放大</span>
        </button>
      ) : (
        <div className="med-photo med-no-photo">
          <Pill aria-hidden />
          <span>暫無圖片</span>
        </div>
      )}
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="prod-dialog">
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>請同時核對藥名、規格與藥袋。</DialogDescription>
            <img
              className="prod-photo"
              src={drugImageUrl(code)}
              referrerPolicy="no-referrer"
              alt={name}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
export function DoseCard({
  dose,
  report,
  disabled,
  notDue = false,
  onSave,
}: {
  dose: MedicationDose;
  report?: DoseReport;
  disabled: boolean;
  notDue?: boolean;
  onSave: (dose: MedicationDose, status: string, reason: string) => void;
}) {
  const [status, setStatus] = useState<string>(report?.status || ''),
    [reason, setReason] = useState(report?.reason || '');
  useEffect(() => {
    setStatus(report?.status || '');
    setReason(report?.reason || '');
  }, [report?.reportedAt, report?.status, report?.reason]);
  return (
    <article className="med-dose">
      <div className="med-dose-info">
        <MedicationPhoto
          code={dose.code}
          name={dose.name}
          hasImage={dose.hasImage}
        />
        <div>
          <h3>{dose.name}</h3>
          <p>{dose.strength}</p>
          <strong className="med-amount">
            每次 {dose.amount} {dose.unit}
          </strong>
          <p>
            {dose.route}・{dose.label}
          </p>
          {dose.note && <p className="med-note">{dose.note}</p>}
        </div>
      </div>
      <p className="med-status" role="status">
        {report
          ? `已保存：${report.status}`
          : notDue
            ? '尚未到設定時間'
            : '尚未回報'}
      </p>
      <fieldset disabled={disabled}>
        <legend className="sr-only">{dose.name}服用情形</legend>
        <div className="med-status-options">
          {DOSE_STATUSES.map((s) => (
            <Button
              type="button"
              key={s}
              variant={s === status ? 'default' : 'outline'}
              aria-pressed={s === status}
              onClick={() => {
                setStatus(s);
                setReason('');
              }}
            >
              {s === status && <Check aria-hidden />}
              {s}
            </Button>
          ))}
        </div>
        {status && status !== '已服用' && (
          <label>
            補充說明（可不填）
            <Input
              value={reason}
              maxLength={160}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        <Button
          className="med-save"
          type="button"
          disabled={
            !status ||
            disabled ||
            (report?.status === status && report?.reason === reason)
          }
          onClick={() => onSave(dose, status, reason)}
        >
          儲存這次回報
        </Button>
      </fieldset>
    </article>
  );
}
export function MedicationHistory({ record }: { record: RecordItem }) {
  return record.medicationDoses ? (
    <div className="med-history">
      {record.medicationDoses.map((r) => (
        <div key={r.key}>
          <strong>
            {r.time}・{r.name}
          </strong>
          <span>
            {r.strength}・{r.amount} {r.unit}・{r.label}・{r.status}
          </span>
          {r.reason && <span>補充：{r.reason}</span>}
        </div>
      ))}
    </div>
  ) : null;
}
export function MedicationPatient({
  auth,
  today,
  initialDate,
  onSaved,
  legacy,
}: {
  auth: Auth;
  today: string;
  initialDate?: string;
  onSaved: (r: RecordItem) => void;
  legacy: (date: string, record?: RecordItem) => ReactNode;
}) {
  const [date, setDate] = useState(initialDate || today),
    [data, setData] = useState<MedicationView | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [prnTime, setPrnTime] = useState(taiwanMinute().slice(11));
  const receivedAt = useRef(Date.now()),
    [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const epoch = useRef(0),
    request = useRef({ signature: '', id: '' }),
    sending = useRef(false);
  async function load() {
    const n = ++epoch.current;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const r = await api<MedicationView>(auth, 'medication.read', { date });
      if (n === epoch.current) {
        receivedAt.current = Date.now();
        setData(r);
      }
    } catch (e) {
      if (n === epoch.current) setError(errorText(e));
    } finally {
      if (n === epoch.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      epoch.current++;
    };
  }, [date, auth]);
  async function save(
    dose: MedicationDose | null,
    status: string,
    reason: string,
  ) {
    if (sending.current || !data) return;
    sending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const body = {
      date,
      status,
      reason,
      ...(!dose
        ? { confirmNoScheduled: true }
        : dose.prn
          ? { itemId: dose.itemId, time: dose.time }
          : { key: dose.key }),
      previousId: data.record?.id || null,
      planVersion: data.plans.at(-1)?.id || null,
    };
    const signature = JSON.stringify(body);
    if (signature !== request.current.signature)
      request.current = { signature, id: crypto.randomUUID() };
    try {
      const r = await api<MedicationView>(auth, 'medication.report', {
        ...body,
        requestId: request.current.id,
      });
      receivedAt.current = Date.now();
      setData(r);
      if (r.record) onSaved(r.record);
      setNotice('已保存。您可以繼續回報其他藥品。');
    } catch (e) {
      setError(errorText(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const now = data
    ? taiwanMinute(
        new Date(
          Date.parse(data.now + '+08:00') + Date.now() - receivedAt.current,
        ),
      )
    : taiwanMinute();
  const planned = data?.plans.some((p) => p.effectiveFrom.slice(0, 10) <= date),
    doses = data ? scheduledDoses(data.plans, date) : [],
    reports = data?.record?.medicationDoses || [];
  const prnPlan = data ? planAt(data.plans, date + 'T' + prnTime) : undefined;
  const prns =
    prnPlan?.items.filter(
      (m) => m.prn && prnDose(data!.plans, date, prnTime, m.id),
    ) || [];
  const summary = data ? medicationSummary(data.plans, date, reports) : null;
  return (
    <div className="medication">
      <div className="med-toolbar">
        <label>
          回報日期
          <Input
            type="date"
            min={todayMinus(today)}
            max={today}
            value={date}
            disabled={busy}
            onChange={(e) => {
              setDate(e.target.value || today);
              setNotice('');
            }}
          />
        </label>
        <Button
          variant="outline"
          disabled={busy || loading}
          onClick={() => void load()}
        >
          <RefreshCw />
          重新載入
        </Button>
      </div>
      {error && (
        <p className="prod-error" role="alert">
          {error} 可按「重新載入」確認最新資料。
        </p>
      )}
      {notice && (
        <p className="prod-success" role="status">
          {notice}
        </p>
      )}
      {!loading && data && data.plans.length > 0 && (
        <details className="med-prn" open={doses.length === 0}>
          <summary>已收到藥師用藥清單</summary>
          <p className="med-note">
            {data.plans.at(-1)!.effectiveFrom.replace('T', ' ')}{' '}
            起生效。依開始日期、使用星期與服用時段顯示回報卡片。
          </p>
          <PlanPreview items={data.plans.at(-1)!.items} />
        </details>
      )}
      {loading ? (
        <p role="status">正在載入您的用藥清單…</p>
      ) : data && !planned ? (
        <>
          <p className="med-note">此日期尚無用藥清單，可先回報整體情形。</p>
          {legacy(date, data.record || undefined)}
        </>
      ) : (
        data && (
          <>
            <div className="med-progress">
              <Pill />
              <div>
                <strong>
                  固定用藥已回報 {summary?.reported}／{summary?.expected} 次
                </strong>
                <p>如實記錄即可，未回報不代表未服用。</p>
              </div>
            </div>
            {data.record && !data.record.medicationDoses && (
              <p className="med-note">
                本日已有舊版總回報：{data.record.status}。請依清單逐項確認。
              </p>
            )}
            {doses.length === 0 && (
              <p>
                這天沒有生效後的固定服用時段。新清單不會回填存檔前已過的時段；請查看下方清單確認後續服法。
                <Button
                  className="med-save"
                  disabled={busy || !!data.record?.medicationNoScheduled}
                  variant="outline"
                  onClick={() => void save(null, '', '')}
                >
                  {data.record?.medicationNoScheduled
                    ? '已確認今日清單'
                    : '確認今日沒有固定用藥'}
                </Button>
              </p>
            )}
            {[...new Set(doses.map((d) => d.time))].map((time) => (
              <section key={time} className="med-period">
                <h2>
                  {time}・{doses.find((d) => d.time === time)?.label}
                </h2>
                {doses
                  .filter((d) => d.time === time)
                  .map((d) => (
                    <DoseCard
                      key={d.key}
                      dose={d}
                      report={reports.find((r) => r.key === d.key)}
                      notDue={date + 'T' + d.time > now}
                      disabled={busy || date + 'T' + d.time > now}
                      onSave={(d, s, r) => void save(d, s, r)}
                    />
                  ))}
              </section>
            ))}
            <details className="med-prn">
              <summary>需要時使用的藥品與回報</summary>
              <p>僅在依藥師指示使用或有疑問時回報，不列入固定用藥次數。</p>
              <label>
                這次使用時間
                <Input
                  type="time"
                  value={prnTime}
                  disabled={busy}
                  onChange={(e) => setPrnTime(e.target.value)}
                />
              </label>
              {prns.length ? (
                prns.map((m) => {
                  const d = prnDose(data.plans, date, prnTime, m.id)!;
                  return (
                    <DoseCard
                      key={d.key}
                      dose={d}
                      report={reports.find((r) => r.key === d.key)}
                      disabled={busy}
                      onSave={(d, s, r) => void save(d, s, r)}
                    />
                  );
                })
              ) : (
                <p>此時間沒有可回報的需要時用藥。</p>
              )}
              {reports
                .filter((r) => r.prn)
                .map((r) => (
                  <p key={r.key}>
                    {r.time}・{r.name}・{r.status}
                  </p>
                ))}
            </details>
          </>
        )
      )}
    </div>
  );
}

function newItem(today: string): MedicationItem {
  return {
    id: crypto.randomUUID(),
    code: '',
    name: '',
    strength: '',
    unit: '錠',
    route: '口服',
    note: '',
    hasImage: false,
    active: true,
    days: [0, 1, 2, 3, 4, 5, 6],
    start: today,
    end: '',
    prn: false,
    slots: [{ time: '08:00', label: '早餐後', amount: 0 }],
  };
}
export function MedicationManager({
  auth,
  today,
  patient,
  isAdmin = false,
}: {
  auth: Auth;
  today: string;
  patient: { id: string; name: string };
  isAdmin?: boolean;
}) {
  const [data, setData] = useState<MedicationView | null>(null),
    [items, setItems] = useState<MedicationItem[]>([]),
    [editing, setEditing] = useState(false),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [catalog, setCatalog] = useState<CatalogDrug[]>([]),
    [query, setQuery] = useState(''),
    [catalogBusy, setCatalogBusy] = useState(false),
    [catalogError, setCatalogError] = useState(''),
    [emails, setEmails] = useState('');
  const [date, setDate] = useState(today),
    [reportDate, setReportDate] = useState(today);
  const request = useRef({ signature: '', id: '' }),
    sending = useRef(false),
    epoch = useRef(0),
    receivedAt = useRef(Date.now());
  const currentMinute = () =>
    data
      ? taiwanMinute(
          new Date(
            Date.parse(data.now + '+08:00') + Date.now() - receivedAt.current,
          ),
        )
      : taiwanMinute();
  function accept(r: MedicationView) {
    receivedAt.current = Date.now();
    setData(r);
    setEmails((r.pharmacists || []).join('\n'));
  }
  async function load() {
    const n = ++epoch.current;
    setBusy(true);
    setError('');
    try {
      const r = await api<MedicationView>(auth, 'medication.read', {
        patientId: patient.id,
        date: reportDate,
      });
      if (n === epoch.current) accept(r);
    } catch (e) {
      if (n === epoch.current) setError(errorText(e));
    } finally {
      if (n === epoch.current) setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      epoch.current++;
    };
  }, [patient.id, auth, reportDate]);
  async function searchCatalog() {
    setCatalogBusy(true);
    setCatalogError('');
    try {
      setCatalog(await loadDrugCatalog());
    } catch (e) {
      setCatalogError(errorText(e));
    } finally {
      setCatalogBusy(false);
    }
  }
  function edit() {
    if (!data) return;
    setItems(structuredClone(data.plans.at(-1)?.items || []));
    setEditing(true);
    setPreview(false);
    setNotice('');
    void searchCatalog();
  }
  function change(id: string, patch: Partial<MedicationItem>) {
    setItems((current) =>
      current.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
    setPreview(false);
  }
  function add(drug?: CatalogDrug) {
    const item = newItem(today);
    if (drug)
      Object.assign(item, {
        code: drug.code,
        name: drug.name,
        hasImage: drug.hasImage,
      });
    setItems((current) => [...current, item]);
    setQuery('');
  }
  async function mutate(action: string, payload: object) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const signature = JSON.stringify([action, payload]);
    if (request.current.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    try {
      const r = await api<MedicationView>(auth, action, {
        ...payload,
        patientId: patient.id,
        requestId: request.current.id,
      });
      accept(r);
      setEditing(false);
      setPreview(false);
      setNotice(
        action === 'medication.publish'
          ? '用藥清單已發布，將依設定時間生效。'
          : '藥師權限已更新。',
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const results = query.trim()
    ? catalog
        .filter((d) =>
          (d.code + ' ' + d.name + ' ' + d.generic)
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .slice(0, 15)
    : [];
  const current = data ? planAt(data.plans, data.now) : undefined;
  const report = data?.records?.find((r) => r.date === reportDate);
  return (
    <section className="surface medication med-manager">
      <div className="med-toolbar">
        <div>
          <span className="voyage-eyebrow">藥師照護</span>
          <h2>{patient.name}的用藥管理</h2>
        </div>
        <Button
          disabled={busy || editing}
          variant="outline"
          onClick={() => void load()}
        >
          <RefreshCw />
          重新載入
        </Button>
      </div>
      {error && (
        <p className="prod-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="prod-success" role="status">
          {notice}
        </p>
      )}
      {!data ? (
        <p role="status">{busy ? '正在載入用藥資料…' : '請重新載入。'}</p>
      ) : (
        <>
          {!editing ? (
            <>
              <div className="med-plan-status">
                <strong>
                  {current
                    ? `目前生效：${current.effectiveFrom.replace('T', ' ')}`
                    : '尚無生效中的用藥清單'}
                </strong>
                {data.plans.at(-1) &&
                  data.plans.at(-1)!.effectiveFrom > data.now && (
                    <p>
                      下一份清單：
                      {data.plans.at(-1)!.effectiveFrom.replace('T', ' ')}{' '}
                      起生效
                    </p>
                  )}
                <Button disabled={busy} onClick={edit}>
                  <Plus />
                  維護用藥清單
                </Button>
              </div>
              <PlanPreview items={current?.items || []} />
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  validateMedicationPlan(
                    { effectiveFrom: currentMinute(), items },
                    currentMinute(),
                  );
                  setPreview(true);
                  setError('');
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              <fieldset disabled={busy}>
                <div className="med-toolbar">
                  <h3>{preview ? '發布前確認' : '編輯用藥清單'}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setPreview(false);
                    }}
                  >
                    取消編輯
                  </Button>
                </div>
                {!preview && (
                  <>
                    <div className="med-catalog">
                      <label>
                        搜尋院內藥品
                        <Input
                          placeholder="藥品代碼、商品名或學名"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      {catalogBusy && (
                        <p role="status">正在載入院內藥品目錄…</p>
                      )}
                      {catalogError && (
                        <p role="alert">
                          {catalogError}
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => void searchCatalog()}
                          >
                            重試目錄
                          </Button>
                        </p>
                      )}
                      <div className="med-results">
                        {results.map((d) => (
                          <button
                            type="button"
                            disabled={items.length >= 20}
                            key={d.code}
                            onClick={() => add(d)}
                          >
                            <strong>
                              {d.code}・{d.name}
                            </strong>
                            <span>{d.generic}</span>
                          </button>
                        ))}
                      </div>
                      {query && catalog.length > 0 && !results.length && (
                        <p>找不到藥品，可改用手動建檔。</p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={items.length >= 20}
                        onClick={() => add()}
                      >
                        <Plus />
                        手動新增／院外藥
                      </Button>
                    </div>
                    {items.map((m, index) => (
                      <article key={m.id} className="med-editor">
                        <div className="med-toolbar">
                          <h3>藥品 {index + 1}</h3>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => change(m.id, { active: !m.active })}
                          >
                            {m.active ? '設為停用' : '恢復使用'}
                          </Button>
                        </div>
                        <p>
                          {m.active ? '使用中' : '此版本停用'}・
                          {m.code || '手動建檔'}
                        </p>
                        <div className="med-editor-grid">
                          <MedicationPhoto {...m} />
                          <label>
                            藥品名稱
                            <Input
                              required
                              value={m.name}
                              maxLength={100}
                              onChange={(e) =>
                                change(m.id, { name: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            用量單位
                            <Input
                              required
                              value={m.unit}
                              maxLength={12}
                              onChange={(e) =>
                                change(m.id, { unit: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            使用途徑
                            <Input
                              required
                              value={m.route}
                              maxLength={30}
                              onChange={(e) =>
                                change(m.id, { route: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            開始日期
                            <Input
                              required
                              type="date"
                              value={m.start}
                              onChange={(e) =>
                                change(m.id, { start: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            結束日期（可留白）
                            <Input
                              type="date"
                              min={m.start}
                              value={m.end}
                              onChange={(e) =>
                                change(m.id, { end: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <label className="med-check">
                          <input
                            type="checkbox"
                            checked={m.prn}
                            onChange={(e) =>
                              change(m.id, {
                                prn: e.target.checked,
                                slots: e.target.checked
                                  ? [m.slots[0]]
                                  : m.slots,
                              })
                            }
                          />
                          需要時使用
                        </label>
                        <div className="med-days" aria-label="使用星期">
                          {['日', '一', '二', '三', '四', '五', '六'].map(
                            (d, i) => (
                              <label key={i}>
                                <input
                                  type="checkbox"
                                  checked={m.days.includes(i)}
                                  onChange={(e) =>
                                    change(m.id, {
                                      days: e.target.checked
                                        ? [...m.days, i]
                                        : m.days.filter((day) => day !== i),
                                    })
                                  }
                                />
                                {d}
                              </label>
                            ),
                          )}
                        </div>
                        {m.slots.map((s, i) => (
                          <div className="med-slot-editor" key={i}>
                            {!m.prn && (
                              <>
                                <label>
                                  時段
                                  <select
                                    value={s.label}
                                    onChange={(e) =>
                                      change(m.id, {
                                        slots: m.slots.map((slot, j) =>
                                          j === i
                                            ? { ...slot, label: e.target.value }
                                            : slot,
                                        ),
                                      })
                                    }
                                  >
                                    {MEDICATION_PERIODS.map((label) => (
                                      <option key={label}>{label}</option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  預定時間
                                  <Input
                                    type="time"
                                    required
                                    value={s.time}
                                    onChange={(e) =>
                                      change(m.id, {
                                        slots: m.slots.map((slot, j) =>
                                          j === i
                                            ? { ...slot, time: e.target.value }
                                            : slot,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                              </>
                            )}
                            <label>
                              每次用量
                              <Input
                                required
                                type="number"
                                step="any"
                                min="0.001"
                                max="10000"
                                value={s.amount || ''}
                                onChange={(e) =>
                                  change(m.id, {
                                    slots: m.slots.map((slot, j) =>
                                      j === i
                                        ? {
                                            ...slot,
                                            amount: Number(e.target.value),
                                          }
                                        : slot,
                                    ),
                                  })
                                }
                              />
                            </label>
                            {m.slots.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                  change(m.id, {
                                    slots: m.slots.filter((_, j) => i !== j),
                                  })
                                }
                              >
                                移除此時段
                              </Button>
                            )}
                          </div>
                        ))}
                        {!m.prn && m.slots.length < 8 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              change(m.id, {
                                slots: [
                                  ...m.slots,
                                  { time: '18:00', label: '晚餐後', amount: 0 },
                                ],
                              })
                            }
                          >
                            新增服用時段
                          </Button>
                        )}
                        <label>
                          個案提醒（可留白）
                          <Input
                            value={m.note}
                            maxLength={160}
                            onChange={(e) =>
                              change(m.id, { note: e.target.value })
                            }
                          />
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setItems((current) =>
                              current.filter((x) => x.id !== m.id),
                            )
                          }
                        >
                          從此份清單移除
                        </Button>
                      </article>
                    ))}
                    <p className="med-note">
                      請依處方確認藥品、用量與服法。確認存檔後立即生效；過去的服用時段與回報紀錄保留。
                    </p>
                    <Button type="submit">預覽個案用藥卡</Button>
                  </>
                )}
                {preview && (
                  <>
                    <p className="med-note">
                      確認存檔後立即生效，共{' '}
                      {items.filter((m) => m.active).length} 項使用中藥品。
                      {!items.some((m) => m.active) &&
                        '此清單將停止所有固定用藥安排。'}
                    </p>
                    <PlanPreview items={items} />
                    <div className="med-toolbar">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPreview(false)}
                      >
                        <ChevronLeft />
                        返回編輯
                      </Button>
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void mutate('medication.publish', {
                            plan: { items },
                            previousId: data.plans.at(-1)?.id || null,
                          })
                        }
                      >
                        {busy ? '存檔中…' : '已核對處方，確認存檔'}
                      </Button>
                    </div>
                  </>
                )}
              </fieldset>
            </form>
          )}
          {!editing && (
            <>
              <section className="med-review">
                <h3>逐項回報結果</h3>
                <div className="med-toolbar">
                  <label>
                    查看日期
                    <Input
                      type="date"
                      min={todayMinus(today)}
                      max={today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <Button
                    disabled={busy || !date}
                    variant="outline"
                    onClick={() => setReportDate(date)}
                  >
                    查看
                  </Button>
                </div>
                <p>
                  {reportDate}・{report?.status || '尚無回報'}
                </p>
                {report && <MedicationHistory record={report} />}
                <div className="med-history">
                  {scheduledDoses(data.plans, reportDate)
                    .filter(
                      (d) =>
                        !report?.medicationDoses?.some((r) => r.key === d.key),
                    )
                    .map((d) => (
                      <div key={d.key}>
                        <strong>
                          {d.time}・{d.name}
                        </strong>
                        <span>
                          {d.amount} {d.unit}・尚未回報
                        </span>
                      </div>
                    ))}
                </div>
              </section>
              <details className="med-prn">
                <summary>清單版本歷程（{data.plans.length} 版）</summary>
                {[...data.plans].reverse().map((p) => (
                  <details key={p.id}>
                    <summary>
                      {p.effectiveFrom.replace('T', ' ')} 起・
                      {p.items.filter((m) => m.active).length} 項使用中
                    </summary>
                    <p>
                      建立於{' '}
                      {new Date(p.createdAt).toLocaleString('zh-TW', {
                        timeZone: 'Asia/Taipei',
                      })}
                    </p>
                    <PlanPreview items={p.items} />
                  </details>
                ))}
              </details>
              {isAdmin && (
                <details className="med-prn">
                  <summary>指派此個案的藥師</summary>
                  <p>
                    輸入藥師的 Google
                    帳號信箱，每行一位。指派後可查看此個案用藥紀錄並維護清單；清空可移除藥師權限。
                  </p>
                  <textarea
                    aria-label="藥師 Google 帳號"
                    value={emails}
                    disabled={busy}
                    onChange={(e) => setEmails(e.target.value)}
                    rows={3}
                  />
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void mutate('admin.medicationStaff', {
                        emails: emails
                          .split(/[\n,，;；]+/)
                          .map((e) => e.trim())
                          .filter(Boolean),
                        previousId: data.staffVersion || null,
                      })
                    }
                  >
                    確認儲存藥師權限
                  </Button>
                </details>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
export function PlanPreview({ items }: { items: MedicationItem[] }) {
  return (
    <div className="med-plan-preview">
      {items
        .filter((m) => m.active)
        .map((m) => (
          <article className="med-dose med-preview" key={m.id}>
            <div className="med-dose-info">
              <MedicationPhoto {...m} />
              <div>
                <h3>{m.name}</h3>
                <p>
                  {m.strength}・{m.route}
                </p>
                {m.slots.map((s) => (
                  <strong key={s.time} className="med-amount">
                    {m.prn ? '需要時' : `${s.time} ${s.label}`}・每次 {s.amount}{' '}
                    {m.unit}
                  </strong>
                ))}
                <p>星期{m.days.map((d) => '日一二三四五六'[d]).join('、')}</p>
                <p>
                  {m.start} 起{m.end ? `，至 ${m.end}` : ''}
                </p>
                {m.note && <p className="med-note">{m.note}</p>}
              </div>
            </div>
          </article>
        ))}
    </div>
  );
}
export function PharmacistHome({
  auth,
  today,
  patients,
}: {
  auth: Auth;
  today: string;
  patients: { id: string; name: string }[];
}) {
  const [id, setId] = useState('');
  const selected = patients.find((p) => p.id === id);
  return (
    <>
      <section className="surface medication">
        <h1>藥師用藥管理</h1>
        <p>選擇已指派給您的個案。</p>
        <div className="med-patients">
          {patients.map((p) => (
            <Button
              key={p.id}
              variant={id === p.id ? 'default' : 'outline'}
              onClick={() => setId(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </section>
      {selected && (
        <MedicationManager
          key={id}
          auth={auth}
          today={today}
          patient={selected}
        />
      )}
    </>
  );
}
