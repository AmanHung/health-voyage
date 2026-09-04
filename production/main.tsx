import {useEffect,useRef,useState,type FormEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {Compass,Footprints,Utensils,Pill,Home,Settings,CalendarDays,Shield,LogOut,Camera,Check,Trophy,ArrowLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {TaskCalendar} from '@/components/task-calendar';
import {api,type Auth,type Bootstrap,type Profile,type RecordItem} from './api';
import {configured} from './config';
import {lineAuth,googleButton,signOut} from './auth';
import {prepareImage,type PreparedImage} from './images';
import {feedback,GROUPS,MEDS} from '../google/domain.js';
import '@/app/globals.css';
import './style.css';

type View='home'|'history'|'account'|'admin';
const taskNames={exercise:'運動',meal:'飲食',medicine:'用藥'};
function message(error:unknown){return error instanceof Error?error.message:'操作未完成，請再試一次。';}
function Choice({label,options,value,onChange}:{label:string;options:string[];value:string;onChange:(value:string)=>void}){
  return <fieldset><legend>{label}</legend><RadioGroup className="prod-choices" value={value} onValueChange={v=>onChange(String(v))} aria-label={label}>{options.map(option=><label className="prod-choice" key={option}><RadioGroupItem value={option}/><span>{option}</span></label>)}</RadioGroup></fieldset>;
}
function App(){
  const [auth,setAuth]=useState<Auth|null>(null),[data,setData]=useState<Bootstrap|null>(null),[view,setView]=useState<View>('home');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[adminLogin,setAdminLogin]=useState(false);
  const [modal,setModal]=useState<{kind:RecordItem['kind'];record?:RecordItem}|null>(null);
  const [image,setImage]=useState<string|null>(null),[rows,setRows]=useState<{nickname:string;steps:number}[]>([]),[rankError,setRankError]=useState('');
  const googleEl=useRef<HTMLDivElement>(null);const authEpoch=useRef(0);
  async function login(identity:Auth){
    const epoch=++authEpoch.current;setBusy(true);setError('');
    try{const result=await api<Bootstrap>(identity,'bootstrap');if(epoch!==authEpoch.current)return;setAuth(identity);setData(result);setView(result.role==='admin'?'admin':'home');}
    catch(e){if(epoch===authEpoch.current)setError(message(e));}finally{if(epoch===authEpoch.current)setBusy(false);}
  }
  async function refresh(){if(!auth)return;const result=await api<Bootstrap>(auth,'bootstrap');setData(result);}
  useEffect(()=>{if(configured())lineAuth(false).then(identity=>{if(identity)void login(identity);}).catch(e=>setError(message(e)));},[]);
  useEffect(()=>{if(adminLogin&&googleEl.current)googleButton(googleEl.current,identity=>void login(identity)).catch(e=>setError(message(e)));},[adminLogin]);
  useEffect(()=>{if(!auth||!data?.bound)return;let active=true;setRankError('');api<{rows:typeof rows}>(auth,'leaderboard').then(r=>{if(active)setRows(r.rows);}).catch(()=>{if(active)setRankError('排行榜暫時無法讀取。');});return()=>{active=false;};},[auth,data]);
  function logout(){authEpoch.current++;signOut();setAuth(null);setData(null);setRows([]);setImage(null);setModal(null);setAdminLogin(false);setNotice('');setError('');setBusy(false);}
  async function photo(r:RecordItem){if(!auth)return;setBusy(true);setError('');try{const result=await api<{dataUrl:string}>(auth,'image',{id:r.id});setImage(result.dataUrl);}catch(e){setError(message(e));}finally{setBusy(false);}}
  const records=data?.records||[],profile=data?.profile;
  const updateProfile=(p:Profile)=>setData(d=>d?{...d,profile:p}:d);
  return <div className="prod-app">
    <header className="topbar home-topbar"><Button variant="ghost" className="home-brand" onClick={()=>setView(data?.role==='admin'?'admin':'home')}><Compass aria-hidden/><span>健康航程</span></Button>
    {data&&auth&&<DropdownMenu><DropdownMenuTrigger className="profile-trigger" aria-label="個人選單">{data.role==='admin'?'管':Array.from(profile?.nickname||'我')[0]}</DropdownMenuTrigger><DropdownMenuContent className="profile-menu" align="end">
      {data.role==='admin'?<DropdownMenuItem onClick={()=>setView('admin')}><Shield/>管理後臺</DropdownMenuItem>:<><DropdownMenuItem onClick={()=>setView('home')}><Home/>首頁</DropdownMenuItem><DropdownMenuItem onClick={()=>setView('history')}><CalendarDays/>健康紀錄</DropdownMenuItem><DropdownMenuItem onClick={()=>setView('account')}><Settings/>我的帳號</DropdownMenuItem></>}
      <DropdownMenuItem onClick={logout}><LogOut/>登出</DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu>}</header>
    <main className="prod-content">
      {error&&<p role="alert" className="prod-error">{error}</p>}{notice&&<p role="status" className="prod-success">{notice}</p>}
      {!configured()?<section className="surface prod-login"><Shield aria-hidden/><h1>網站設定中</h1><p>尚未開放登入與上傳。</p><p>Google 與 LINE 連線完成後，才會開放測試。</p></section>:!auth||!data?<section className="surface prod-login"><Compass aria-hidden/><h1>每天一小步</h1><p>記下運動、飲食與用藥。</p><Button disabled={busy} onClick={()=>{setBusy(true);lineAuth(true).then(identity=>{if(identity)return login(identity);}).catch(e=>setError(message(e))).finally(()=>setBusy(false));}}>{busy?'登入中…':'用 LINE 登入'}</Button><Button variant="ghost" onClick={()=>setAdminLogin(v=>!v)}>管理員登入</Button>{adminLogin&&<div ref={googleEl}/>}</section>:
      data.role==='admin'?<Admin auth={auth} onError={setError} onPhoto={photo}/>:!data.bound?<Binding auth={auth} onBound={refresh}/>:<>
      {profile?.isTest&&<p className="prod-test">測試個案・不列入正式排行榜</p>}
      {view!=='home'&&<Button variant="ghost" onClick={()=>setView('home')}><ArrowLeft/>回首頁</Button>}
      {view==='home'&&<><section className="prod-welcome"><h1>{profile?.nickname}，您好</h1><p>{data.today}・今天記錄 {records.filter(r=>r.date===data.today).length}／3 項</p></section>
      <div className="prod-tasks">{([{kind:'exercise',Icon:Footprints,title:'運動紀錄',sub:'截圖・步數或時間'},{kind:'meal',Icon:Utensils,title:'拍下這一餐',sub:'每天記錄一餐'},{kind:'medicine',Icon:Pill,title:'用藥紀錄',sub:'如實記下今天情形'}] as const).map(({kind,Icon,title,sub})=>{const record=records.find(r=>r.date===data.today&&r.kind===kind);return <Button variant="outline" className={'prod-task '+(record?'done':'')} key={kind} onClick={()=>setModal({kind,record})}><Icon aria-hidden/><strong>{title}</strong><span>{record?'已記錄・點此修改':sub}</span>{record&&<Check aria-hidden/>}</Button>;})}</div>
      <div className="home-overview"><TaskCalendar key={data.today} live today={data.today} exerciseDates={records.filter(r=>r.kind==='exercise').map(r=>r.date)} mealDates={records.filter(r=>r.kind==='meal').map(r=>r.date)} medicineDates={records.filter(r=>r.kind==='medicine').map(r=>r.date)} medicineDone={false} exerciseReady mealReady medicineReady/>
      <section className="surface prod-rank"><h2><Trophy/>{Number(data.today.slice(5,7))} 月步數榜</h2>{rankError?<p role="status">{rankError}</p>:rows.length?<ol>{rows.map((row,i)=><li key={i}><span>{i+1}．{row.nickname}</span><strong>{row.steps.toLocaleString()} 步</strong></li>)}</ol>:<p>尚無參加紀錄。</p>}<p>自由參加，不影響每日任務。</p><Button variant="outline" onClick={()=>setView('account')}>設定是否參加</Button></section></div></>}
      {view==='history'&&<section className="surface"><h1>健康紀錄</h1><RecordList records={records} onPhoto={photo} onEdit={r=>setModal({kind:r.kind,record:r})}/></section>}
      {view==='account'&&profile&&<Account auth={auth} profile={profile} onSaved={p=>{updateProfile(p);setNotice('個人設定已保存。');}}/>}
      </>}
      <footer className="prod-footer">紀錄供照護追蹤，不作即時醫療監測。身體不適請直接就醫。<span className="prod-legal"><a href="./privacy.html">隱私權政策</a><a href="./terms.html">服務條款</a></span></footer>
    </main>
    {modal&&auth&&data&&<Dialog open onOpenChange={open=>{if(!open)setModal(null);}}><DialogContent className="prod-dialog"><DialogTitle>{taskNames[modal.kind]}紀錄</DialogTitle><DialogDescription>核對後儲存，可再修改。</DialogDescription><RecordForm auth={auth} kind={modal.kind} today={data.today} record={modal.record} onSaved={r=>{setData(d=>d?{...d,records:[...(d.records||[]).filter(x=>!(x.date===r.date&&x.kind===r.kind)),r]}:d);setModal(null);setNotice('紀錄已保存。');}}/></DialogContent></Dialog>}
    {image&&<Dialog open onOpenChange={open=>{if(!open)setImage(null);}}><DialogContent className="prod-dialog"><DialogTitle>已保存的照片</DialogTitle><DialogDescription>此為壓縮後的紀錄圖片。</DialogDescription><img src={image} alt="已保存的紀錄照片" className="prod-photo"/></DialogContent></Dialog>}
  </div>;
}
function Binding({auth,onBound}:{auth:Auth;onBound:()=>Promise<void>}){
  const [code,setCode]=useState(''),[nickname,setNickname]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await api(auth,'bind',{code,nickname});await onBound();}catch(e){setError(message(e));}finally{setBusy(false);}}
  return <form className="surface prod-form prod-login" onSubmit={submit}><h1>第一次使用</h1><label>邀請碼<Input value={code} onChange={e=>setCode(e.target.value)} required autoComplete="off"/></label><label>想使用的暱稱<Input value={nickname} onChange={e=>setNickname(e.target.value)} required minLength={2} maxLength={12}/></label>{error&&<p role="alert" className="prod-error">{error}</p>}<Button type="submit" disabled={busy}>{busy?'綁定中…':'開始記錄'}</Button></form>;
}
function Account({auth,profile,onSaved}:{auth:Auth;profile:Profile;onSaved:(p:Profile)=>void}){
  const [nickname,setNickname]=useState(profile.nickname),[participating,setParticipating]=useState(profile.participating),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await api<{profile:Profile}>(auth,'profile',{nickname,participating});onSaved(r.profile);}catch(e){setError(message(e));}finally{setBusy(false);}}
  return <form className="surface prod-form" onSubmit={save}><h1>我的帳號</h1><label>暱稱<Input value={nickname} onChange={e=>setNickname(e.target.value)} required minLength={2} maxLength={12}/></label><label className="prod-choice"><Checkbox checked={participating} onCheckedChange={v=>setParticipating(!!v)}/>參加步數排行榜</label><p>參加後，其他個案可看到暱稱與本月步數。</p>{error&&<p className="prod-error" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy?'儲存中…':'儲存設定'}</Button></form>;
}
function RecordList({records,onPhoto,onEdit}:{records:RecordItem[];onPhoto:(r:RecordItem)=>void;onEdit?:(r:RecordItem)=>void}){
  return records.length?<div className="prod-records">{[...records].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).map(r=><article key={r.id}><h3>{r.date}・{taskNames[r.kind]}</h3><p>{r.kind==='exercise'?`${r.value?.toLocaleString()} ${r.mode==='steps'?'步':'分鐘'}・${r.activity}`:r.kind==='meal'?`${r.period}・${r.groups?.join('、')}・${r.eaten}`:r.status}</p>{r.feedback&&<p>{r.feedback}</p>}<div className="prod-actions">{r.hasImage&&<Button variant="outline" onClick={()=>onPhoto(r)}><Camera/>看照片</Button>}{onEdit&&<Button variant="outline" onClick={()=>onEdit(r)}>修改</Button>}</div></article>)}</div>:<p>還沒有紀錄。</p>;
}
function RecordForm({auth,kind,today,record,onSaved}:{auth:Auth;kind:RecordItem['kind'];today:string;record?:RecordItem;onSaved:(r:RecordItem)=>void}){
  const [date,setDate]=useState(record?.date||today),[mode,setMode]=useState<'steps'|'minutes'>(record?.mode||'steps'),[value,setValue]=useState(record?.value?.toString()||'');
  const [activity,setActivity]=useState(record?.activity||'步行'),[recognized,setRecognized]=useState<number|null>(record?.recognized??null);
  const [period,setPeriod]=useState(record?.period||'午餐'),[groups,setGroups]=useState<string[]>(record?.groups||[]),[eaten,setEaten]=useState(record?.eaten||'全部'),[drink,setDrink]=useState(record?.drink||'無飲料'),[restrictedDiet,setRestricted]=useState(record?.restrictedDiet||false);
  const [status,setStatus]=useState(record?.status||''),[prepared,setPrepared]=useState<PreparedImage|null>(null),[busy,setBusy]=useState(false),[processing,setProcessing]=useState(false),[error,setError]=useState(''),[ocrText,setOcrText]=useState('');
  const fileInput=useRef<HTMLInputElement>(null),previewRef=useRef(''),active=useRef(true),request=useRef({body:'',id:''});
  useEffect(()=>()=>{active.current=false;if(previewRef.current)URL.revokeObjectURL(previewRef.current);},[]);
  async function select(file?:File){if(!file)return;setProcessing(true);setError('');setOcrText('');setRecognized(null);
    try{const image=await prepareImage(file,kind==='exercise'?'exercise':'meal');if(!active.current){URL.revokeObjectURL(image.preview);return;}if(previewRef.current)URL.revokeObjectURL(previewRef.current);previewRef.current=image.preview;setPrepared(image);
      if(kind==='exercise'){
        setOcrText('正在讀取步數與時間…');
        const {createWorker}=await import('tesseract.js'),{recognizeExercise}=await import('@/lib/exercise-ocr');
        const workers:Awaited<ReturnType<typeof createWorker>>[]=[];
        const create=async(languages:string)=>{const w=await createWorker(languages,1,{workerPath:import.meta.env.BASE_URL+'ocr/worker.min.js',corePath:import.meta.env.BASE_URL+'ocr/core',langPath:import.meta.env.BASE_URL+'ocr/lang',gzip:true});workers.push(w);return w;};
        try{const result=await recognizeExercise(await create('eng+chi_tra'),image.dataUrl,image,()=>create('eng'),()=>active.current);if(!active.current)return;const metric=result.steps!==null?'steps':'minutes';const v=result.steps??result.minutes;if(v!==null){setMode(metric);setValue(String(v));setRecognized(v);setOcrText('已讀取，請核對數值。');}else setOcrText('未讀到數值，請手動填寫。');}catch{if(active.current)setOcrText('未讀到數值，請手動填寫。');}finally{await Promise.all(workers.map(w=>w.terminate().catch(()=>{})));}
      }
    }catch(e){setError(message(e));}finally{if(active.current)setProcessing(false);}
  }
  async function submit(e:FormEvent){e.preventDefault();if(busy||processing)return;setBusy(true);setError('');try{
    const entry=kind==='exercise'?{kind,date,mode,value:value.trim()===''?null:Number(value),activity,recognized}:kind==='meal'?{kind,date,period,groups,eaten,drink,restrictedDiet}:{kind,date,status};
    const payload={record:entry,previousId:record?.id||null,image:prepared?.dataUrl||null};const body=JSON.stringify(payload);if(request.current.body!==body)request.current={body,id:crypto.randomUUID()};
    const result=await api<{record:RecordItem}>(auth,'save',{...payload,requestId:request.current.id});onSaved(result.record);
  }catch(e){setError(message(e));}finally{setBusy(false);}}
  return <form className="prod-form" onSubmit={submit}><fieldset disabled={busy||processing} className="prod-form">
    <label>日期<Input type="date" max={today} value={date} disabled={!!record} onChange={e=>setDate(e.target.value)} required/></label>
    {kind!=='medicine'&&<><input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png" onChange={e=>void select(e.target.files?.[0])}/><Button variant="outline" onClick={()=>fileInput.current?.click()}><Camera/>{kind==='meal'?'選擇餐盤照片':'選擇運動截圖'}</Button>{prepared?<><img className="prod-photo" src={prepared.preview} alt={kind==='meal'?'餐盤照片預覽':'運動截圖預覽'}/><p>已縮小為 {Math.round(prepared.bytes/1024)} KB</p></>:record?.hasImage?<p>保留先前的壓縮照片。</p>:<p>照片會自動縮小後保存。</p>}</>}
    {kind==='exercise'&&<><Choice label="記錄項目" options={['步數','分鐘']} value={mode==='steps'?'步數':'分鐘'} onChange={v=>{setMode(v==='步數'?'steps':'minutes');setRecognized(null);setValue('');}}/><label>{mode==='steps'?'確認步數':'確認分鐘'}<Input type="number" inputMode="numeric" min={0} max={mode==='steps'?100000:1440} step={1} value={value} onChange={e=>setValue(e.target.value)} required/></label><Choice label="運動種類" options={['步行','伸展','自行車','其他','休息']} value={activity} onChange={setActivity}/></>}
    {kind==='meal'&&<><Choice label="哪一餐？" options={['早餐','午餐','晚餐','點心']} value={period} onChange={setPeriod}/><fieldset><legend>餐盤裡有什麼？</legend><div className="prod-choices">{GROUPS.map((g:string)=><label className="prod-choice" key={g}><Checkbox checked={groups.includes(g)} onCheckedChange={checked=>setGroups(checked?(g==='不確定'?['不確定']:[...groups.filter(x=>x!=='不確定'),g]):groups.filter(x=>x!==g))}/>{g}</label>)}</div></fieldset><Choice label="吃了多少？" options={['全部','約一半','少量','不確定']} value={eaten} onChange={setEaten}/><Choice label="飲料" options={['無飲料','無糖','含糖','不確定']} value={drink} onChange={setDrink}/><label className="prod-choice"><Checkbox checked={restrictedDiet} onCheckedChange={v=>setRestricted(!!v)}/>照護團隊有交代飲食限制</label>{groups.length>0&&<p className="prod-feedback">{feedback({groups,eaten,restrictedDiet})}</p>}</>}
    {kind==='medicine'&&<Choice label="今天用藥情形" options={MEDS} value={status} onChange={setStatus}/>}
    </fieldset>{processing&&<p role="status">正在處理圖片…</p>}{ocrText&&<p role="status">{ocrText}</p>}{error&&<p className="prod-error" role="alert">{error}</p>}<Button type="submit" disabled={busy||processing}>{busy?'儲存中…':'儲存紀錄'}<Check/></Button></form>;
}
function Admin({auth,onError,onPhoto}:{auth:Auth;onError:(error:string)=>void;onPhoto:(r:RecordItem)=>void}){
  const [patients,setPatients]=useState<(Profile&{name:string;bound:boolean})[]>([]),[name,setName]=useState('測試個案 001'),[isTest,setTest]=useState(true),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[records,setRecords]=useState<RecordItem[]>([]),[selected,setSelected]=useState('');
  const requestId=useRef(crypto.randomUUID());
  async function load(){const r=await api<{patients:typeof patients}>(auth,'admin.patients');setPatients(r.patients);}
  useEffect(()=>{load().catch(e=>onError(message(e)));},[]);
  async function create(e:FormEvent){e.preventDefault();setBusy(true);onError('');try{const r=await api<{code?:string}>(auth,'admin.createPatient',{name,isTest,requestId:requestId.current});setCode(r.code||'已建立，邀請碼只於首次建立時顯示。');requestId.current=crypto.randomUUID();await load();}catch(e){onError(message(e));}finally{setBusy(false);}}
  return <><section className="surface"><h1>管理後臺</h1><p>登入帳號：obm0304@gmail.com</p><form className="prod-form" onSubmit={create}><h2>新增個案</h2><label>姓名<Input value={name} onChange={e=>{setName(e.target.value);requestId.current=crypto.randomUUID();}} required maxLength={40}/></label><label className="prod-choice"><Checkbox checked={isTest} onCheckedChange={v=>{setTest(!!v);requestId.current=crypto.randomUUID();}}/>測試個案，不列入排行榜</label><Button type="submit" disabled={busy}>建立一次性邀請碼</Button>{code&&<p role="status" className="prod-code">{code}<br/><small>首次顯示的邀請碼有效 3 天，請私下交給個案。</small></p>}</form></section>
    <section className="surface"><h2>個案名冊</h2><div className="prod-records">{patients.map(p=><article key={p.id}><h3>{p.name}{p.isTest?'（測試）':''}</h3><p>{p.bound?'已綁定':'尚未綁定'}・{p.nickname}</p><Button variant="outline" onClick={async()=>{onError('');try{const r=await api<{records:RecordItem[]}>(auth,'admin.records',{patientId:p.id});setSelected(p.name);setRecords(r.records);}catch(e){onError(message(e));}}}>查看紀錄</Button></article>)}</div></section>
    {selected&&<section className="surface"><h2>{selected}的紀錄</h2><RecordList records={records} onPhoto={onPhoto}/></section>}
  </>;
}
const root=document.getElementById('root');if(root)createRoot(root).render(<App/>);
