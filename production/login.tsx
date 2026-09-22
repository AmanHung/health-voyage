import {useEffect,useRef,useState,type ComponentType} from 'react';
import {createRoot} from 'react-dom/client';
import {api,type Auth,type Bootstrap} from './api';
import {lineAuth,googleButton,signOut} from './auth';
import {configured,config} from './config';
import {deadline} from './deadline';
import {loginFlow} from './login-flow';
import './login.css';

type AppProps={initialAuth:Auth;initialData:Bootstrap;onSignedOut:()=>void};
export function Login(){
  const [session,setSession]=useState<{auth:Auth;data:Bootstrap;App:ComponentType<AppProps>}|null>(null);
  const [busy,setBusy]=useState(configured()),[stage,setStage]=useState('正在連接 LINE…'),[error,setError]=useState(''),[slow,setSlow]=useState(false),[admin,setAdmin]=useState(false);
  const googleEl=useRef<HTMLDivElement>(null);
  const flow=useRef<ReturnType<typeof loginFlow<ComponentType<AppProps>>>|null>(null);
  if(!flow.current)flow.current=loginFlow({line:lineAuth,bootstrap:(auth,signal)=>api<Bootstrap>(auth,'bootstrap',{},signal),load:()=>deadline(import('./main').then(m=>m.default),25000,'畫面載入逾時，請重新載入。'),stage:setStage,busy:setBusy,error:e=>setError(e instanceof Error?e.message:'登入未完成，請重試。'),ready:(auth,data,App)=>setSession({auth,data,App})});
  useEffect(()=>{if(configured())void flow.current!.start();return()=>flow.current!.cancel();},[]);
  useEffect(()=>{setSlow(false);if(!busy)return;const timer=setTimeout(()=>setSlow(true),8000);return()=>clearTimeout(timer);},[busy]);
  useEffect(()=>{let active=true;if(admin&&googleEl.current)googleButton(googleEl.current,auth=>{if(active){setError('');void flow.current!.start(false,auth);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[admin]);
  function logout(){flow.current!.cancel();signOut();setSession(null);setAdmin(false);setError('');}
  if(session)return <session.App initialAuth={session.auth} initialData={session.data} onSignedOut={logout}/>;
  return <div className="login-shell"><header><img src={import.meta.env.BASE_URL+'voyage/fengyuan-hospital-logo.png'} width="195" height="60" alt="豐原醫院"/><strong>健康航程</strong></header><main><section className="login-card"><img className="login-coast" src={import.meta.env.BASE_URL+'voyage/coast.webp'} alt="海鳥陪伴帆船展開航程"/>{!configured()?<><h1>網站設定中</h1><p>尚未開放登入與上傳。</p></>:<><span>歡迎來到健康航程</span><h1>為自己，踏出今天的一步</h1><p>記下運動、飲食與用藥，<br/>把每天的努力，變成自己的航程。</p>{error&&<p className="login-error" role="alert">{error}</p>}<button disabled={busy} onClick={()=>{setError('');void flow.current!.start(true);}}>{busy?stage:error?'重試 LINE 登入':'用 LINE 開始航程'}</button>{busy&&<p role="status" aria-live="polite">{slow?'連線比平常久，您可以稍候，或取消後再試。':stage}</p>}{busy&&slow&&<button className="secondary" onClick={()=>{flow.current!.cancel();setError('已取消等待，請重試登入。');}}>取消等待</button>}{(error||slow)&&<button className="secondary" onClick={()=>location.reload()}>重新載入</button>}{error&&<a href={'https://liff.line.me/'+config.liffId}>從 LINE 重新開啟</a>}<button className="secondary" disabled={busy} onClick={()=>setAdmin(v=>!v)}>管理員登入</button>{admin&&<div ref={googleEl}/>}</>}</section><footer>紀錄供照護追蹤，不作即時醫療監測。身體不適請直接就醫。<p><a href="./privacy.html">隱私權政策</a>　<a href="./terms.html">服務條款</a></p></footer></main></div>;
}
const root=document.getElementById('root');if(root)createRoot(root).render(<Login/>);
