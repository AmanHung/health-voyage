import type {Auth,Bootstrap} from './api';

type Dependencies<T>={line:(start:boolean,signal:AbortSignal)=>Promise<Auth|null>;bootstrap:(auth:Auth,signal:AbortSignal)=>Promise<Bootstrap>;load:()=>Promise<T>;stage:(text:string)=>void;ready:(auth:Auth,data:Bootstrap,app:T)=>void;error:(error:unknown)=>void;busy:(value:boolean)=>void};
// Single owner for automatic login, taps and Google callbacks. Cancelled work
// may finish in the background but can never restore an old account/session.
export function loginFlow<T>(deps:Dependencies<T>){
  let active:AbortController|null=null;
  return {
    async start(start=false,google?:Auth){
      if(active)return;
      const current=new AbortController();active=current;deps.busy(true);
      try{
        deps.stage(google?'正在驗證登入…':'正在連接 LINE…');
        const auth=google||await deps.line(start,current.signal);
        if(active!==current||!auth)return;
        deps.stage('正在讀取您的紀錄…');
        const [data,app]=await Promise.all([deps.bootstrap(auth,current.signal),deps.load()]);
        if(active===current)deps.ready(auth,data,app);
      }catch(error){if(active===current)deps.error(error);}
      finally{if(active===current){active=null;deps.busy(false);}}
    },
    cancel(){const old=active;active=null;old?.abort();deps.busy(false);},
  };
}
