import {routeGeometry,stops} from './route-math.mjs';
import {shellProgress,islands} from './shell-rules.mjs';
import {useState,useEffect,createContext,useContext,type ReactNode} from 'react';
import {api,type Auth,type Profile,type RecordItem} from './api';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {CalendarDays,Check,Compass,Gift,ChevronLeft,ChevronRight} from 'lucide-react';
export function nearestAchievement(collections:any[]){return collections.filter(s=>s.next).sort((a,b)=>b.value/b.next.goal-a.value/a.next.goal)[0];}
const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function Collectible({lit=true,className=''}:{lit?:boolean;className?:string}){return <img className={`collectible ${lit?'lit':'unlit'} ${className}`} src={import.meta.env.BASE_URL+'collectible-star-transparent.webp'} alt="" aria-hidden/>;}
function DayGlyph({kind,entry}:any){
 const count=kind==='exercise'?2:1,lit=kind==='exercise'?entry?.steps||0:entry?.meal||0;
 if(kind==='tasks')return entry?.taskCount===3?<Collectible/>:<span className="task-dots">{[0,1,2].map(i=><i key={i} className={i<(entry?.taskCount||0)?'done':''}/>)}</span>;
 return <span className="day-collectibles">{Array.from({length:count},(_,i)=><Collectible key={i} lit={i<lit}/>)}</span>;
}
export function RecordCalendar({kind,records,today,onRecord,onPhoto}:any){
 const [selected,setSelected]=useState(today),[month,setMonth]=useState(today.slice(0,7)),[expanded,setExpanded]=useState(false);
 const [y,m]=month.split('-').map(Number),count=new Date(y,m,0).getDate(),offset=(new Date(y,m-1,1).getDay()+6)%7;
 const weekStart=new Date(selected+'T12:00:00');weekStart.setDate(weekStart.getDate()-(weekStart.getDay()+6)%7);
 const dates=expanded?Array.from({length:count},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`):Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return iso(d);});
 const scores=shellProgress(records,[],today).entries;
 const entries=records.filter((r:any)=>r.kind===kind&&r.date<=today);
 const latest=entries.filter((r:any)=>r.date===selected).sort((a:any,b:any)=>b.createdAt.localeCompare(a.createdAt))[0],record=latest&&!latest.deletedAt?latest:null;
 const noun=kind==='tasks'?'三任務':kind==='meal'?'飲食':'運動';
 const selectedScore=scores.find((e:any)=>e.date===selected);
 function move(n:number){setMonth(iso(new Date(y,m-1+n,1)).slice(0,7));}
 return <section className={`record-calendar ${kind==='tasks'?'task-calendar-preview':''}`} aria-label={`${noun}日曆`}>
 <div className="rc-heading"><div><span className="voyage-eyebrow">點日期，回顧每一天</span><h2>{kind==='tasks'?'每日三任務':kind==='meal'?'餐桌足跡':'運動紀錄'}</h2></div><Button variant="outline" aria-expanded={expanded} onClick={()=>{setExpanded(!expanded);setMonth(selected.slice(0,7));}}>{expanded?'收合日曆':'展開月曆'}</Button></div>
 {expanded?<div className="rc-month"><Button variant="ghost" aria-label={`上一個月${noun}`} onClick={()=>move(-1)}><ChevronLeft/></Button><strong>{y} 年 {m} 月</strong><Button variant="ghost" aria-label={`下一個月${noun}`} disabled={month>=today.slice(0,7)} onClick={()=>move(1)}><ChevronRight/></Button></div>:<p className="rc-week-range">{dates[0]} — {dates[6]}</p>}
 <div className="rc-grid">{['一','二','三','四','五','六','日'].map(d=><span key={d} className="rc-weekday">{d}</span>)}{Array.from({length:expanded?offset:0},(_,i)=><span key={'blank'+i}/>)}{dates.map(date=>{const entry=scores.find((e:any)=>e.date===date),lit=kind==='exercise'?entry?.steps||0:kind==='meal'?entry?.meal||0:entry?.tasks||0;return <button key={date} disabled={date>today} aria-label={`${date}，${kind==='tasks'?`完成 ${entry?.taskCount||0} 項任務`:`點亮 ${lit} 顆貝殼`}${date===today?'，今天':''}`} aria-pressed={selected===date} onClick={()=>setSelected(date)}><span>{Number(date.slice(-2))}</span><DayGlyph kind={kind} entry={entry}/></button>;})}</div>
 <p className="rc-note">{kind==='tasks'?'每完成一項任務亮一點，三項完成點亮一顆貝殼。':kind==='exercise'?'5,000 步點亮第一顆，7,500 步再點亮第二顆。':'保存附照片的飲食紀錄，點亮一顆貝殼。'}</p>
 {kind==='tasks'?<div className="task-day-status" aria-live="polite"><strong>{selected===today?'今天':selected}・{selectedScore?.taskCount||0}／3 完成</strong><div>{([['exerciseDone','運動'],['mealDone','飲食'],['medicineDone','用藥回報']] as const).map(([key,label])=><span key={key} className={selectedScore?.[key]?'done':''}>{label}・{selectedScore?.[key]?'已完成':'未完成'}</span>)}</div></div>:<article className="rc-record" aria-live="polite"><span className="voyage-eyebrow">{selected===today?'今日':selected}・{noun}紀錄</span>{record?<><h3>{kind==='exercise'?`${record.value?.toLocaleString()} ${record.mode==='steps'?'步':'分鐘'}`:`${record.period||'餐點'}・${record.mealDetails?.mealName||record.groups?.join('、')||'已記錄餐點'}`}</h3>{record.feedback&&<p>{record.feedback}</p>}<div className="fg-actions">{record.hasImage&&<Button variant="outline" onClick={()=>onPhoto(record)}>看照片</Button>}<Button variant="outline" onClick={()=>onRecord(record)}>查看或修改</Button></div></>:<><h3>{selected===today?'今天':'這一天'}尚無{noun}紀錄</h3>{selected===today?<Button onClick={()=>onRecord()}>＋ 記錄今日{noun}</Button>:<p>可點選其他日期查看紀錄。</p>}</>}</article>}
 </section>;
}

const JourneyContext=createContext<{days:string[];today:string;sign:()=>Promise<void>}>({days:[],today:'',sign:async()=>{}});
export function JourneyProvider({auth,profile,today,onChecked,children}:{auth:Auth;profile?:Profile;today:string;onChecked:(profile:Profile,today:string)=>void;children:ReactNode}){
 return <JourneyContext.Provider value={{days:profile?.checkinDays||[],today,sign:async()=>{const result=await api<{profile:Profile;today:string}>(auth,'checkin');onChecked(result.profile,result.today);}}}>{children}</JourneyContext.Provider>;
}
export function DailyCheckin(){
 const {days,today,sign:saveSign}=useContext(JourneyContext);
 const [open,setOpen]=useState(()=>!days.includes(today));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const signed=days.includes(today),count=days.length;
 function close(){setOpen(false);}
 async function sign(){if(busy)return;setBusy(true);setError('');try{await saveSign();}catch(e){setError(e instanceof Error?e.message:'簽到未完成，請重試。');}finally{setBusy(false);}}
 const stamps=<div className="checkin-stamps">{Array.from({length:7},(_,i)=><div key={i} className={count%7>i||count>0&&count%7===0?'done':''}><small>第 {Math.floor(Math.max(count-1,0)/7)*7+i+1} 天</small>{<Collectible lit={count%7>i||count>0&&count%7===0}/>}</div>)}</div>;
 return <><button className="checkin-card" onClick={()=>setOpen(true)}><img className="checkin-shell-art" src={import.meta.env.BASE_URL+'collectible-star-transparent.webp'} alt=""/><span><small>每日登船簽到</small><strong>{signed?'今天已簽到，歡迎回來':'今天，也為自己出發'}</strong><span>簽到收藏 {count} 顆貝殼・{signed?'查看簽到卡':'點我留下今日印記'}</span></span><ChevronRight/></button><Dialog open={open} onOpenChange={v=>{if(!v)close();}}><DialogContent className="prod-dialog checkin-dialog"><img className="checkin-shell-art" src={import.meta.env.BASE_URL+'collectible-star-transparent.webp'} alt="收藏貝殼"/><span className="voyage-eyebrow">DAILY CHECK-IN · 每日登船</span><DialogTitle>{signed?'今日印記，收藏完成！':'今天，也為自己出發'}</DialogTitle><DialogDescription>{signed?'謝謝您回來，繼續留下今天的小行動。':'每天回來一次，替自己的航程蓋上一枚印記。'}</DialogDescription><strong className="checkin-total">{count}<small> 天簽到足跡</small></strong>{stamps}<p>不必連續，累積的印記都會保留。</p>{error&&<p role="alert">{error}</p>}<Button disabled={busy} onClick={signed?close:sign}>{busy?'簽到中…':signed?'開始今日任務':'簽到・收下 1 顆貝殼'}</Button><small>每天簽到可得 1 顆貝殼；健康任務另外計算。</small></DialogContent></Dialog></>;
}

export function useShells(records:RecordItem[],today:string){const {days}=useContext(JourneyContext);return shellProgress(records,days,today);}
export function ShellSummary({records,today,onNavigate}:any){const p=useShells(records,today);return <button className="voyage-scenic-summary" onClick={()=>onNavigate('journey')}><span><span className="voyage-eyebrow">我的健康航程</span><strong>已收藏 {p.total} 顆貝殼</strong><span>{p.next?`再 ${p.next.goal-p.total} 顆，抵達${p.next.name}`:'五座島嶼，全部抵達'}</span></span><span className="voyage-summary-link">看看航程<ChevronRight/></span></button>;}
export function ShellJourney({records,today}:any){const p=useShells(records,today);return <section className="shell-journey"><div className="voyage-page-heading"><span className="voyage-eyebrow">收藏日常，航向更美的風景</span><h1>我的健康航程</h1><p>每一顆貝殼，都是為自己留下的小行動。</p></div><div className="shell-balance"><img src={import.meta.env.BASE_URL+'collectible-star-transparent.webp'} alt=""/><div><strong>{p.total}<small> 顆貝殼</small></strong><p>{p.next?`下一站：${p.next.name}・還差 ${p.next.goal-p.total} 顆`:'五座島嶼都已抵達，繼續收藏每一天。'}</p></div></div><IslandRoute total={p.total}/><section className="shell-rules"><h2>每天，怎麼收集貝殼？</h2><ul><li>每日簽到<strong>＋1 顆</strong></li><li>上傳飲食紀錄<strong>＋1 顆</strong></li><li>運動達 5,000 步<strong>＋1 顆</strong></li><li>運動達 7,500 步<strong>共 2 顆</strong></li><li>完成用藥回報<strong>＋1 顆</strong></li><li>完成當日三項任務<strong>額外＋1 顆</strong></li></ul><details><summary>查看貝殼紀錄</summary>{p.entries.filter((e:any)=>e.total>0).map((e:any)=><p key={e.date}>{e.date}：簽到 {e.checkin}・飲食 {e.meal}・運動 {e.steps}・用藥 {e.medicine}・三任務 {e.tasks}，共 {e.total} 顆</p>)}{!p.total&&<p>從今天的一項小行動開始。</p>}</details></section></section>;}

export function IslandRoute({total}:{total:number}){
 const route=routeGeometry(total);
 return <><div className="shell-map spaced-map"><img className="shell-map-image" loading="lazy" decoding="async" src={import.meta.env.BASE_URL+'five-islands-clear.webp'} alt="海面拉開五座島嶼的距離，由燈塔前往椰風花園、珊瑚、瀑布與極光秘境"/><svg className="island-route" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden>{route.paths.map((p:any,i:number)=><g key={i}><path d={p.full} className="route-base"/>{p.t>0&&<path d={p.lit} className="route-lit"/>}</g>)}{stops.slice(1).map(stop=><circle key={stop.goal} cx={stop.x} cy={stop.y} r="1.2" className={total>=stop.goal?'dock-stop reached':'dock-stop'}/>)}</svg><ol>{islands.map((island:any,i:number)=><li key={island.goal} style={{top:[9,25,42,61,85][i]+'%',left:(i%2?78:22)+'%'}} className={total>=island.goal?'reached':'unreached'} aria-label={`${island.name}，${island.goal} 顆貝殼，${total>=island.goal?'已點亮':'尚未點亮'}`}><strong>{island.name}</strong><span className="island-goal"><Collectible lit={total>=island.goal}/><b>{island.goal} 顆</b></span></li>)}</ol><div className="route-current" style={{left:route.point.x+'%',top:(route.point.y/3)+'%'}} aria-label={`目前收集 ${total} 顆貝殼`}>{route.docked&&<small className="route-docked">已抵達・停泊中</small>}<span className="route-current-dot"/><span className="route-current-label"><Collectible/><b>{total} 顆</b></span><img className="route-boat" src={import.meta.env.BASE_URL+'progress-sailboat.webp'} alt="" aria-hidden/></div></div></>;
}
