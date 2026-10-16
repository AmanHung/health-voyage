import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api,type Auth,type Profile,type RecordItem} from './api';
import {healthState,healthBalance,reminderState,prizes} from '../lib/health-rewards';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import './health-rewards.css';

type Props={auth:Auth;profile:Profile;today:string;onSaved:(p:Profile)=>void};
export function AppointmentLoginReminder({profile,today,ready}:{profile:Profile;today:string;ready:boolean}) {
  const [visits]=useState(()=>reminderState(healthState(profile),today).upcoming.filter(a=>a.days<=3));
  const [dismissed,setDismissed]=useState(false);
  return <Dialog open={ready&&!dismissed&&visits.length>0} onOpenChange={open=>{if(!open)setDismissed(true);}}><DialogContent className="prod-dialog visit-login-dialog"><span className="voyage-eyebrow">記得與照護團隊見面</span><DialogTitle>回診提醒</DialogTitle><DialogDescription>您的回診日期快到了，出門前記得確認預約資訊。</DialogDescription><ul className="visit-login-list">{visits.map(a=><li key={a.id}><strong>{a.days===0?'今天要回診':a.days===1?'明天要回診':`再 ${a.days} 天要回診`}</strong><span>{a.date.replaceAll('-','／')}</span></li>)}</ul><Button onClick={()=>setDismissed(true)}>我知道了</Button></DialogContent></Dialog>;
}
export function HealthCards({auth,profile,today,onSaved}:Props) {
  const state=healthState(profile),reminders=reminderState(state,today),last=state.measurements.at(-1);
  const [height,setHeight]=useState(last?.height?.toString()||''),[weight,setWeight]=useState(last?.weight?.toString()||''),[date,setDate]=useState('');
  const [step,setStep]=useState(0);
  const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const submitting=useRef(false);
  async function save(action:string,payload:unknown){if(submitting.current)return;submitting.current=true;setBusy(true);setError('');setNotice('');try{const r=await api<{profile:Profile}>(auth,action,payload);if(!r.profile.healthRewards)throw Error('健康登錄服務尚未更新，請稍後再試。');onSaved(r.profile);setNotice(action==='health.measure'?(reminders.measurementDue?'量測已保存，獲得 3 顆貝殼。':'量測已更新，本月獎勵已領取。'):'回診日期已更新。');if(action==='health.measure'){setEditing(false);setStep(0);}if(action==='health.appointment')setDate('');}catch(e){setError(e instanceof Error?e.message:'儲存失敗，請重試。');}finally{submitting.current=false;setBusy(false);}}
  function measure(e:FormEvent){e.preventDefault();if(step<2){setStep(step+1);return;}void save('health.measure',{height:Number(height),weight:Number(weight)});}
  function startMeasure(){setHeight(last?.height?.toString()||'');setWeight(last?.weight?.toString()||'');setStep(0);setNotice('');setEditing(true);}

  return <section className="health-cards" aria-label="健康登錄與回診提醒">
    <article className="surface health-card measurement-card">
      <div className="measurement-heading"><div><span className="voyage-eyebrow">每月照顧自己</span><h2>{!last?'記錄身高與體重':reminders.measurementDue?'記錄本月的自己':'本月量測已完成'}</h2></div><span className="measurement-month">{Number(today.slice(5,7))} 月量測</span></div>
      <div className="measurement-reward"><span className="measurement-shell" aria-hidden="true">✦</span><div><strong>{reminders.measurementDue?'完成登錄，獲得 3 顆貝殼':'本月 3 顆貝殼已領取'}</strong><small>每月限領一次，持續累積航程。</small></div></div>
      {editing?<form className="measurement-form" onSubmit={measure}>
        <ol className="measurement-steps" aria-label="量測登錄步驟">{['身高','體重','確認'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined} className={step>=i?'active':''}><span>{i+1}</span>{label}</li>)}</ol>
        <div className="measurement-question" key={step}>
          <p className="measurement-step-label">第 {step+1} 步，共 3 步</p>
          {step===0?<><label htmlFor="measure-height">您的身高是多少？</label><p>請填寫最近一次量到的身高。</p><div className="measurement-input"><Input id="measure-height" aria-label="身高（公分）" type="number" inputMode="decimal" min="50" max="250" step="0.1" placeholder="例如 160" required autoFocus value={height} onChange={e=>setHeight(e.target.value)}/><span>公分</span></div></>:step===1?<><label htmlFor="measure-weight">您目前的體重是多少？</label><p>建議在相近的時間、穿著輕便衣物量測。</p><div className="measurement-input"><Input id="measure-weight" aria-label="體重（公斤）" type="number" inputMode="decimal" min="10" max="400" step="0.1" placeholder="例如 60.5" required autoFocus value={weight} onChange={e=>setWeight(e.target.value)}/><span>公斤</span></div></>:<><h3 tabIndex={-1}>確認這次的量測</h3><p>量測日期：{today.replaceAll('-','／')}</p><dl className="measurement-values"><div><dt>身高</dt><dd>{height}<small> 公分</small></dd></div><div><dt>體重</dt><dd>{weight}<small> 公斤</small></dd></div></dl><p>{reminders.measurementDue?'確認後即可領取本月貝殼獎勵。':'此次為修改資料，不重複發放貝殼。'}</p></>}
        </div>
        <div className="measurement-actions"><Button type="submit" disabled={busy}>{busy?'儲存中…':step<2?'下一步':reminders.measurementDue?'確認登錄・領取 3 顆':'確認修改'}</Button>{step>0&&<Button type="button" variant="outline" disabled={busy} onClick={()=>setStep(step-1)}>上一步</Button>}<button className="measurement-cancel" type="button" disabled={busy} onClick={()=>setEditing(false)}>稍後再填</button></div>
      </form>:<>
        {last?<><div className="measurement-last"><span>{reminders.measurementDue?'上次量測':'最近一次量測'}・{last.date.replaceAll('-','／')}</span><dl className="measurement-values"><div><dt>身高</dt><dd>{last.height}<small> 公分</small></dd></div><div><dt>體重</dt><dd>{last.weight}<small> 公斤</small></dd></div></dl></div>{reminders.measurementDue?<p>新的一個月，記錄現在的身高與體重。</p>:<p>下個月再來記錄，一起收藏健康日常。</p>}</>:<p className="measurement-intro">先認識現在的自己。<br/>跟著步驟填寫身高與體重，就能開始累積健康紀錄。</p>}
        <Button className="measurement-start" variant={!reminders.measurementDue?'outline':'default'} disabled={busy} onClick={startMeasure}>{!last?'開始登錄':reminders.measurementDue?'登錄本月量測':'修改本月量測'}</Button>
      </>}
      {notice.startsWith('量測')&&<p className="measurement-success" role="status">{notice}</p>}
      {state.measurements.length>0&&<details><summary>查看量測歷程</summary>{state.measurements.slice().reverse().map((m,i)=><p key={i}>{m.date}：{m.height} 公分／{m.weight} 公斤</p>)}</details>}
    </article>
    <article className="surface health-card"><span className="voyage-eyebrow">記得與照護團隊見面</span><h2>我的回診日期</h2><p>登錄回診日期，回診前 3 天起提醒您。</p>
      {reminders.upcoming.length===0&&<p>還沒有待回診日期，請依預約單登錄。</p>}
      {reminders.upcoming.map(a=><div key={a.id} className={a.days<=3?'visit-reminder urgent':'visit-reminder'} role={a.days<=3?'status':undefined}><strong>{a.date}・{a.days===0?'今天要回診':a.days<=3?`再 ${a.days} 天要回診`:`還有 ${a.days} 天`}</strong><Button variant="outline" disabled={busy} onClick={()=>void save('health.cancelAppointment',{id:a.id})}>取消此日期</Button></div>)}
      <form className="prod-form" onSubmit={e=>{e.preventDefault();void save('health.appointment',{date});}}><label>新增回診日期<Input type="date" min={today} value={date} required onChange={e=>setDate(e.target.value)}/></label><Button type="submit" disabled={busy}>{busy?'儲存中…':'保存回診日期'}</Button></form><small>改期請取消舊日期，再新增正確日期；同一天只獎勵一次。</small>
    </article>
    {error&&<p className="prod-error" role="alert">{error}</p>}{notice&&!notice.startsWith('量測')&&<p role="status">{notice}</p>}
  </section>;
}
const rewardArtwork:Record<string,string>={gift30:'gift',body50:'body-composition-v3',nutrition80:'nutrition-counseling-v3',body200:'body-composition-v3'};
function RewardArtwork({prizeId,dialog=false}:{prizeId:string;dialog?:boolean}){
  const filename=rewardArtwork[prizeId];
  return filename?<div className={dialog?'reward-art-frame reward-art-dialog':'reward-art-frame'} aria-hidden="true"><img className="reward-art" src={import.meta.env.BASE_URL+'rewards/'+filename+'.webp'} alt="" width="512" height="512" loading={dialog?'eager':'lazy'} decoding="async"/></div>:null;
}
export function RewardShop({auth,profile,today,records,onSaved}:Props&{records:RecordItem[]}) {
  const state=healthState(profile),balance=healthBalance(records,profile.checkinDays||[],today,state);
  const [selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const submitting=useRef(false);
  const prize=prizes.find(p=>p.id===selected);
  async function redeem(){if(!prize||submitting.current)return;submitting.current=true;setBusy(true);setError('');try{const r=await api<{profile:Profile}>(auth,'health.redeem',{prizeId:prize.id});if(!r.profile.healthRewards?.redemptions.some(x=>x.prizeId===prize.id))throw Error('兌換尚未確認，請稍後重試。');onSaved(r.profile);setSelected(null);}catch(e){setError(e instanceof Error?e.message:'兌換失敗。');}finally{submitting.current=false;setBusy(false);}}
  return <section className="surface reward-shop" id="reward-shop" aria-label="島嶼獎勵"><span className="voyage-eyebrow">每到一座島，收藏一份獎勵</span><div className="reward-balance"><strong>累積 {balance.total} 顆貝殼</strong></div><div className="reward-grid">{prizes.map(p=>{const redemption=state.redemptions.find(r=>r.prizeId===p.id),remaining=Math.max(0,p.goal-balance.total),status=redemption?(redemption.collectedAt?'collected':'pending'):remaining?'locked':'unlocked';return <article key={p.id} id={'reward-island-'+p.goal} tabIndex={-1} aria-label={p.island+'兌獎區'} className={`reward-${status}`}><span className="reward-island">{p.island}</span><strong className="reward-goal">累積 {p.goal} 顆解鎖</strong><span className="reward-state">{status==='collected'?'已領取':status==='pending'?'待領取':status==='locked'?'尚未解鎖':'已解鎖・可兌換'}</span><RewardArtwork prizeId={p.id}/><h3>{p.name}</h3>{p.value>0&&<p>價值 {p.value} 元</p>}{status==='locked'&&<p className="reward-remaining">再累積 {remaining} 顆就抵達</p>}<Button disabled={busy||!!redemption||remaining>0} onClick={()=>{setError('');setSelected(p.id);}}>{redemption?redemption.collectedAt?'已領取':'已兌換・待領取':remaining?'繼續航程解鎖':'兌換此島獎勵'}</Button></article>;})}</div>
    <details><summary>我的兌換紀錄（{state.redemptions.length}）</summary>{state.redemptions.length===0?<p>尚無兌換紀錄。</p>:state.redemptions.map(r=><p key={r.id}>{r.createdAt.slice(0,10)}・{prizes.find(p=>p.id===r.prizeId)?.island}・{prizes.find(p=>p.id===r.prizeId)?.name}・{r.collectedAt?'已領取':'待照護團隊確認領取'}</p>)}</details>
    <Dialog open={!!prize} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}}><DialogContent className="prod-dialog reward-dialog"><DialogTitle>兌換{prize?.island}獎勵</DialogTitle>{prize&&<RewardArtwork prizeId={prize.id} dialog/>}<DialogDescription>您已解鎖{prize?.name}。確認後請向照護團隊領取或預約，每座島限兌換一次。</DialogDescription>{error&&<p role="alert">{error}</p>}<Button disabled={busy} onClick={()=>void redeem()}>{busy?'兌換中…':'確認兌換獎勵'}</Button><Button variant="outline" disabled={busy} onClick={()=>setSelected(null)}>暫不兌換</Button></DialogContent></Dialog>
  </section>;
}
export function StaffRewards({auth,patientId,patientName,initialProfile,inline=false,onSaved}:{auth:Auth;patientId:string;patientName?:string;initialProfile?:Profile;inline?:boolean;onSaved?:(profile:Profile)=>void}) {
  const [profile,setProfile]=useState<Profile|null>(initialProfile||null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0),[confirmId,setConfirmId]=useState<string|null>(null);const submitting=useRef(false);
  useEffect(()=>{if(initialProfile&&retry===0){setProfile(initialProfile);setError('');return;}let active=true;setProfile(null);setError('');api<{profile:Profile}>(auth,'health.read',{patientId}).then(r=>{if(active)setProfile(r.profile);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[auth,patientId,retry,initialProfile]);
  async function collect(id:string){if(submitting.current)return;submitting.current=true;setBusy(true);setError('');try{const r=await api<{profile:Profile}>(auth,'health.collect',{patientId,id});setProfile(r.profile);onSaved?.(r.profile);setConfirmId(null);}catch(e){setError(e instanceof Error?e.message:'確認失敗。');}finally{submitting.current=false;setBusy(false);}}
  return <section className={inline?"inline-staff-rewards":"surface health-card"} aria-label={patientName?`${patientName}的健康登錄與獎品領取`:"健康登錄與獎品領取"}>{inline?<h4>獎品領取</h4>:<h2>健康登錄與獎品領取</h2>}{error&&<p role="alert">{error}<Button variant="outline" onClick={()=>setRetry(n=>n+1)}>重新載入</Button></p>}{!profile&&!error&&<p role="status">讀取中…</p>}{profile&&<><details><summary>身高體重與回診紀錄</summary>{healthState(profile).measurements.map((m,i)=><p key={i}>{m.date}：{m.height} 公分／{m.weight} 公斤</p>)}{healthState(profile).appointments.filter(a=>!a.cancelledAt).map(a=><p key={a.id}>{a.date} 回診{a.cancelledAt?'（已取消）':''}</p>)}</details>{healthState(profile).redemptions.length===0&&<p>尚無兌換紀錄。</p>}{healthState(profile).redemptions.map(r=><div key={r.id} className="visit-reminder"><span>{prizes.find(p=>p.id===r.prizeId)?.name}・{prizes.find(p=>p.id===r.prizeId)?.island}・{r.collectedAt?'已領取': '待領取'}</span>{!r.collectedAt&&<Button disabled={busy} onClick={()=>setConfirmId(r.id)}>確認已交付</Button>}</div>)}</>}<Dialog open={!!confirmId} onOpenChange={v=>{if(!v&&!busy)setConfirmId(null);}}><DialogContent className="prod-dialog"><DialogTitle>確認獎品已交付</DialogTitle>{error&&<p role="alert">{error}</p>}<DialogDescription>{patientName&&<>個案：{patientName}。<br/></>}獎品：{prizes.find(p=>p.id===healthState(profile||{}).redemptions.find(r=>r.id===confirmId)?.prizeId)?.name}。<br/>請確認已交付此項獎品或服務；確認後將記錄領取時間。</DialogDescription><Button disabled={busy} onClick={()=>confirmId&&void collect(confirmId)}>確認已交付</Button><Button variant="outline" disabled={busy} onClick={()=>setConfirmId(null)}>取消</Button></DialogContent></Dialog></section>;
}
