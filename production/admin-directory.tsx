import {useEffect,useRef,useState} from 'react';
import {Camera,History,RefreshCw,RotateCcw,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {api,type Auth,type AdminPatient,type RecordItem} from './api';
import {AdminActivityGoal} from './activity-goal';
import {adminRecordGroups,recordSummary} from '../lib/admin-records';
import './admin-directory.css';

const kinds={exercise:'運動',meal:'飲食',medicine:'用藥'};
type Confirmation={type:'patient'|'record';patient:AdminPatient;record?:RecordItem;deleted:boolean;requestId:string};
export function deletionDescription(type:'patient'|'record',deleted:boolean) {
  if(type==='patient')return deleted?'個案會移至「已刪除個案」，停止登入、讀取與儲存資料，並退出排行榜。紀錄、照片及 LINE 綁定會保留，可由管理員復原。':'個案會回到名冊，並恢復刪除前的帳號狀態。原本已刪除的單筆紀錄仍保留在已刪除清單。';
  return deleted?'此日期的這項紀錄會移至「已刪除紀錄」，不再計入步數、航程與任務統計。原始照片與所有修訂歷程會保留，可由管理員復原。':'此紀錄會重新顯示，並按原日期納入統計。若已有新紀錄，系統會阻止覆蓋，請重新載入確認。';
}
export function AdminRecordRows({records,trash,disabled,onPhoto,onChange}:{records:RecordItem[];trash:boolean;disabled:boolean;onPhoto:(r:RecordItem)=>void;onChange:(r:RecordItem)=>void}) {
  const groups=adminRecordGroups(records).filter(g=>!!g.current.deletedAt===trash);
  return groups.length?<div className="prod-records">{groups.map(({current:r,versions})=><article key={r.id} className={trash?'admin-deleted':''}><h3>{r.date}・{kinds[r.kind]}</h3><p>{recordSummary(r)}</p>{r.feedback&&<p className="prod-feedback">{r.feedback}</p>}{r.deletedAt&&<p className="admin-meta">已移至刪除清單</p>}<div className="prod-actions">{r.hasImage&&<Button disabled={disabled} variant="outline" onClick={()=>onPhoto(r)}><Camera/>看照片</Button>}<Button disabled={disabled} variant={trash?'outline':'destructive'} onClick={()=>onChange(r)}>{trash?<RotateCcw/>:<Trash2/>}{trash?'復原紀錄':'刪除紀錄'}</Button></div><details className="admin-history"><summary><History aria-hidden/>修訂歷程（{versions.length} 筆）</summary><ol>{[...versions].reverse().map(v=><li key={v.id}><span>{new Date(v.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}・{v.deletedAt?'刪除版本':'保存版本'}</span><p>{recordSummary(v)}</p>{v.hasImage&&<Button disabled={disabled} variant="ghost" onClick={()=>onPhoto(v)}>查看此版本照片</Button>}</li>)}</ol></details></article>)}</div>:<p>{trash?'目前沒有已刪除紀錄。':'目前沒有有效紀錄。'}</p>;
}
export function AdminDirectory({auth,today,patients,onPatientChanged,onReload,onPhoto}:{auth:Auth;today:string;patients:AdminPatient[];onPatientChanged:(p:AdminPatient)=>void;onReload:()=>Promise<void>;onPhoto:(r:RecordItem)=>void}) {
  const [trash,setTrash]=useState(false),[recordTrash,setRecordTrash]=useState(false),[selectedId,setSelectedId]=useState(''),[goalId,setGoalId]=useState('');
  const [records,setRecords]=useState<RecordItem[]>([]),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [confirmation,setConfirmation]=useState<Confirmation|null>(null),[confirmError,setConfirmError]=useState('');
  const epoch=useRef(0),panel=useRef<HTMLElement>(null),goalPanel=useRef<HTMLDivElement>(null),submitting=useRef(false);
  const selected=patients.find(p=>p.id===selectedId),goalPatient=patients.find(p=>p.id===goalId&&!p.deletedAt);
  useEffect(()=>()=>{epoch.current++;},[]);
  useEffect(()=>{if(selectedId)panel.current?.scrollIntoView({block:'start'});},[selectedId]);
  useEffect(()=>{if(goalId)goalPanel.current?.scrollIntoView({block:'start'});},[goalId]);
  async function loadRecords(p:AdminPatient){const current=++epoch.current;setSelectedId(p.id);setGoalId('');setRecords([]);setRecordTrash(false);setLoading(true);setError('');try{const r=await api<{records:RecordItem[]}>(auth,'admin.records',{patientId:p.id});if(current===epoch.current)setRecords(r.records);}catch(e){if(current===epoch.current)setError(e instanceof Error?e.message:'紀錄載入失敗。');}finally{if(current===epoch.current)setLoading(false);}}
  async function reload(){epoch.current++;setSelectedId('');setGoalId('');setRecords([]);setLoading(true);setError('');try{await onReload();}catch(e){setError(e instanceof Error?e.message:'名冊載入失敗。');}finally{setLoading(false);}}
  function ask(value:Omit<Confirmation,'requestId'>){setConfirmError('');setConfirmation({...value,requestId:crypto.randomUUID()});}
  async function apply(){
    if(!confirmation||submitting.current)return;const target=confirmation;submitting.current=true;setBusy(true);setConfirmError('');setNotice('');
    try{
      if(target.type==='patient'){
        const result=await api<{patient:AdminPatient}>(auth,'admin.patientStatus',{patientId:target.patient.id,deleted:target.deleted,previousVersion:target.patient.stateVersion||null,requestId:target.requestId});
        epoch.current++;setLoading(false);onPatientChanged(result.patient);setSelectedId('');setGoalId('');setRecords([]);
      }else{
        const result=await api<{records:RecordItem[]}>(auth,'admin.recordStatus',{id:target.record!.id,deleted:target.deleted,requestId:target.requestId});setRecords(result.records);
      }
      setConfirmation(null);setNotice('操作已完成，清單已更新。');
    }catch(e){setConfirmError(e instanceof Error?e.message:'操作未完成，請重試。');}finally{submitting.current=false;setBusy(false);}
  }
  return <><section className="surface admin-directory"><div className="admin-heading"><h2>個案名冊</h2><Button disabled={busy||loading} variant="ghost" onClick={()=>void reload()}><RefreshCw/>重新整理名冊</Button></div><div className="prod-actions admin-filters"><Button disabled={busy} variant={trash?'outline':'default'} aria-pressed={!trash} onClick={()=>setTrash(false)}>使用中個案（{patients.filter(p=>!p.deletedAt).length}）</Button><Button disabled={busy} variant={trash?'default':'outline'} aria-pressed={trash} onClick={()=>setTrash(true)}><Trash2/>已刪除個案（{patients.filter(p=>p.deletedAt).length}）</Button></div>
    {error&&<p className="prod-error" role="alert">{error}</p>}{notice&&<p className="prod-success" role="status">{notice}</p>}
    <div className="prod-records">{patients.filter(p=>!!p.deletedAt===trash).map(p=><article key={p.id} className={trash?'admin-deleted':''}><h3>{p.name}{p.isTest?'（測試）':''}</h3><p>{p.bound?'已綁定':'尚未綁定'}・{p.nickname}{p.deletedAt?'・已刪除':!p.active?'・已停用':''}</p><div className="prod-actions"><Button disabled={busy||loading} variant="outline" onClick={()=>void loadRecords(p)}>查看紀錄</Button>{!trash&&<Button disabled={busy||!p.active} variant="outline" onClick={()=>setGoalId(p.id)}>設定活動目標</Button>}<Button disabled={busy} variant={trash?'outline':'destructive'} onClick={()=>ask({type:'patient',patient:p,deleted:!trash})}>{trash?<RotateCcw/>:<Trash2/>}{trash?'復原個案':'刪除個案'}</Button></div></article>)}</div>
    {!patients.some(p=>!!p.deletedAt===trash)&&<p>{trash?'目前沒有已刪除個案。':'目前沒有個案。'}</p>}<p className="admin-meta">刪除採可復原方式，原始資料與照片仍保留於私人儲存空間。</p>
    </section>
    {goalPatient&&<div ref={goalPanel}><AdminActivityGoal key={goalPatient.id} auth={auth} patient={goalPatient} today={today} onSaved={profile=>onPatientChanged({...goalPatient,...profile})}/></div>}
    {selected&&<section ref={panel} className="surface admin-directory"><div className="admin-heading"><h2>{selected.name}的紀錄</h2><Button disabled={busy||loading} variant="ghost" onClick={()=>void loadRecords(selected)}><RefreshCw/>重新載入紀錄</Button></div>{selected.deletedAt&&<p className="prod-test">此個案已刪除。請先復原個案，再刪除或復原單筆紀錄。</p>}<div className="prod-actions admin-filters"><Button disabled={busy} variant={recordTrash?'outline':'default'} aria-pressed={!recordTrash} onClick={()=>setRecordTrash(false)}>有效紀錄</Button><Button disabled={busy} variant={recordTrash?'default':'outline'} aria-pressed={recordTrash} onClick={()=>setRecordTrash(true)}>已刪除紀錄</Button></div>{loading?<p role="status">載入紀錄中…</p>:<AdminRecordRows records={records} trash={recordTrash} disabled={busy||!!selected.deletedAt} onPhoto={onPhoto} onChange={record=>ask({type:'record',patient:selected,record,deleted:!recordTrash})}/>}<p className="admin-meta">個案端的紀錄與統計在重新載入後更新。</p></section>}
    {confirmation&&<AlertDialog open onOpenChange={open=>{if(!open&&!busy)setConfirmation(null);}}><AlertDialogContent className="prod-dialog admin-confirm"><AlertDialogTitle>{confirmation.deleted?'確認刪除':'確認復原'}{confirmation.type==='patient'?'個案':'紀錄'}</AlertDialogTitle><p><strong>{confirmation.patient.name}</strong>{confirmation.record&&<>・{confirmation.record.date}・{kinds[confirmation.record.kind]}<br/>{recordSummary(confirmation.record)}</>}</p><AlertDialogDescription>{deletionDescription(confirmation.type,confirmation.deleted)}</AlertDialogDescription>{confirmError&&<p role="alert" className="prod-error">{confirmError}</p>}<div className="prod-actions"><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction disabled={busy} variant={confirmation.deleted?'destructive':'default'} onClick={()=>void apply()}>{busy?'處理中…':confirmation.deleted?'確認刪除，可復原':'確認復原'}</AlertDialogAction></div></AlertDialogContent></AlertDialog>}
  </>;
}
