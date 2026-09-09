import {useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {Check,Footprints,Target,ArrowRight,Pause} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {activityProgress,goalOnDate,type ActivityGoal} from '../lib/activity-goal';
import {api,type Auth,type Profile,type RecordItem} from './api';

const number=(value:number)=>value.toLocaleString('zh-TW');
function goalText(goal:ActivityGoal|null) {return !goal?'尚未設定':goal.steps===null?'暫停步數目標':`每日 ${number(goal.steps)} 步`;}
export function ActivityGoalCard({history=[],records,today,onRecord}:{history?:ActivityGoal[];records:RecordItem[];today:string;onRecord:()=>void}) {
  const p=activityProgress(records,history,today),day=p.today;
  const headline=day.achieved?'今天的目標，達成了':!p.current?'找到適合自己的步調':p.current.steps===null?'這段時間，照自己的步調':day.steps===null?'今天，從一份紀錄開始':'每一步，都在向前';
  return <section className={`activity-card ${day.achieved?'achieved':''}`} aria-label="我的活動目標">
    <div className="activity-ring" style={{'--activity-progress':`${day.percent*3.6}deg`} as CSSProperties} role="img" aria-label={p.current?.steps?`今日步數目標進度 ${day.percent}％${day.steps===null?'，尚無步數紀錄':''}`:'尚未啟用步數目標'}><div><Footprints aria-hidden/><strong>{day.steps===null?'—':number(day.steps)}</strong><span>{day.steps===null?'尚無步數紀錄':'今日已記錄步數'}</span></div></div>
    <div className="activity-copy"><span className="voyage-eyebrow"><Target aria-hidden/>我的活動目標</span><h2>{headline}</h2><p>{p.current?.steps?<>與照護團隊約定：<strong>每天 {number(p.current.steps)} 步</strong></>:p.current?'目前暫停步數目標，仍可留下活動紀錄。':'先和照護團隊討論，再設定適合您的活動目標。'}</p>
      {p.current?.steps&&<p className="activity-encouragement">{day.achieved?'今天的努力已留下，不必為了數字再加量。':day.steps!==null?`已記錄 ${number(day.steps)} 步，依自己的狀況繼續。`:'上傳截圖，核對並保存今天的步數。'}</p>}
      {p.upcoming&&<p className="activity-upcoming">{p.upcoming.effectiveFrom.replaceAll('-','／')} 起：{goalText(p.upcoming)}</p>}
      <Button variant="outline" onClick={onRecord}>{day.recorded?'查看今日活動':'記錄今日活動'}<ArrowRight aria-hidden/></Button>
    </div>
    <div className="activity-week"><div className="activity-week-heading"><span>本週目標足跡</span><strong>{p.achievedDays} 天達標</strong></div><div className="activity-week-days">{p.week.map(d=>{
      const label=d.future?'尚未到':d.achieved?'步數目標達成':!d.goal?'尚未設定目標':d.goal.steps===null?'暫停目標':d.steps===null?'尚無步數紀錄':'已記錄，尚未達標';
      return <div key={d.date} className={d.future?'future':d.achieved?'achieved':d.steps!==null?'recorded':''} aria-label={`${d.date}，${label}`}><span>{d.label}</span><i>{d.achieved?<Check aria-hidden/>:d.future?Number(d.date.slice(-2)):d.steps!==null?'●':'—'}</i></div>;
    })}</div><p>勾選代表當日步數達標。紀錄日另計入航程。</p></div>
  </section>;
}

export function AdminActivityGoal({auth,patient,today,onSaved}:{auth:Auth;patient:Profile&{name:string};today:string;onSaved:(profile:Profile)=>void}) {
  const history=patient.activityGoals||[],last=history[history.length-1]||null;
  const [steps,setSteps]=useState(last?.steps?.toString()||''),[paused,setPaused]=useState(last?.steps===null&&!!last);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const requestId=useRef(crypto.randomUUID());
  const effectiveFrom=last?new Date(Date.parse(today+'T00:00:00Z')+86400000).toISOString().slice(0,10):today;
  function changed(){requestId.current=crypto.randomUUID();setNotice('');}
  async function save(e:FormEvent) {
    e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try {
      const result=await api<{profile:Profile}>(auth,'admin.activityGoal',{patientId:patient.id,previousId:last?.id||null,requestId:requestId.current,steps:paused?null:steps.trim()===''?undefined:Number(steps)});
      onSaved(result.profile);requestId.current=crypto.randomUUID();
      const saved=result.profile.activityGoals?.at(-1);setNotice(`目標已保存，${saved?.effectiveFrom.replaceAll('-','／')} 起生效。`);
    }catch(e){setError(e instanceof Error?e.message:'目標未能保存，請再試一次。');}finally{setBusy(false);}
  }
  return <form className="surface prod-form admin-activity-goal" onSubmit={save}><span className="voyage-eyebrow"><Target aria-hidden/>個別活動設定</span><h2>{patient.name}的活動目標</h2><p>請填寫照護團隊與個案討論後的每日步數。系統不預設步數，也不自動提高目標。</p>
    <div className="activity-current">今日：<strong>{goalText(goalOnDate(history,today))}</strong></div>
    <fieldset disabled={busy}><legend>設定方式</legend><div className="prod-actions"><Button type="button" variant={paused?'outline':'default'} aria-pressed={!paused} onClick={()=>{setPaused(false);changed();}}><Footprints/>每日步數</Button><Button type="button" variant={paused?'default':'outline'} aria-pressed={paused} disabled={!last} onClick={()=>{setPaused(true);changed();}}><Pause/>暫停目標</Button></div>
      {!paused&&<label>每日目標步數<Input type="number" inputMode="numeric" min={1} max={100000} step={1} value={steps} onChange={e=>{setSteps(e.target.value);changed();}} required aria-describedby="goal-start"/></label>}
    </fieldset>
    <p id="goal-start">{last?'調整於隔日生效，保留今天與過去的目標。':'首次設定於當日生效。'}預計生效日：{effectiveFrom.replaceAll('-','／')}。</p>
    {error&&<p className="prod-error" role="alert">{error}</p>}{notice&&<p className="prod-success" role="status">{notice}</p>}
    <Button type="submit" disabled={busy}>{busy?'保存中…':'保存活動目標'}</Button>
    {!!history.length&&<details><summary>目標修改歷程（{history.length} 筆）</summary><ol className="activity-goal-history">{[...history].reverse().map(g=><li key={g.id}><span>{g.effectiveFrom.replaceAll('-','／')} 起</span><strong>{goalText(g)}</strong></li>)}</ol><p>同一生效日以最後一次保存為準。</p></details>}
  </form>;
}
