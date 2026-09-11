import type {ReactNode} from 'react';
import {Anchor,ArrowRight,Award,CalendarDays,Check,ChevronRight,Compass,Flag,Footprints,Home,Lock,Map,MessageCircle,Pill,Ship,Star,Sun,Utensils,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {PORTS,type VoyageProgress} from '@/lib/voyage';
import type {RecordItem} from './api';

export type PatientView='home'|'journey'|'achievements'|'account'|'history';
const base=import.meta.env.BASE_URL;
const tasks=[
  {kind:'exercise',Icon:Footprints,title:'今日活動',detail:'記下今天走過的每一步',action:'記錄步數'},
  {kind:'meal',Icon:Utensils,title:'拍下這一餐',detail:'從一餐開始，照顧自己',action:'拍照記錄'},
  {kind:'medicine',Icon:Pill,title:'用藥回報',detail:'如實記錄，安心提問',action:'回報情形'},
] as const;
export function WeeklyProgress({progress}:{progress:VoyageProgress}) {
  return <div className="voyage-week"><div className="voyage-week-heading"><span>本週紀錄</span><strong>{progress.weeklyDays} <small>／ {progress.weeklyGoal} 天</small></strong></div>
    <Progress className="voyage-progress" value={Math.min(progress.weeklyDays/progress.weeklyGoal,1)*100} aria-label={`本週已記錄 ${progress.weeklyDays} 天，目標 ${progress.weeklyGoal} 天`}/>
    <div className="voyage-week-days">{progress.week.map(day=><div key={day.date} className={day.done?'logged':day.future?'future':''} aria-label={`${day.date}，${day.done?'已記錄':day.future?'尚未到':'未記錄'}`}><span>{day.label}</span><i>{day.done?<Check aria-hidden/>:Number(day.date.slice(-2))}</i></div>)}</div>
    <p>{progress.weeklyDays>=progress.weeklyGoal?'本週挑戰完成！每一份努力都已留下。':`再累積 ${progress.weeklyGoal-progress.weeklyDays} 天，完成本週小挑戰。`}</p>
  </div>;
}
export function VoyageHome({nickname,progress,records,onTask,onNavigate,children}:{nickname:string;progress:VoyageProgress;records:RecordItem[];onTask:(kind:RecordItem['kind'],record?:RecordItem)=>void;onNavigate:(view:PatientView)=>void;children?:ReactNode}) {
  const today=progress.today;
  return <>
    <div className="voyage-greeting"><span><Sun aria-hidden/>{nickname}，您好</span><span>{Number(today.slice(5,7))} 月 {Number(today.slice(8))} 日</span></div>
    <div className="voyage-home-grid"><section className="voyage-hero"><img src={base+'voyage/coast.webp'} alt="" width="1536" height="512" fetchPriority="high"/><div className="voyage-hero-copy"><span className="voyage-eyebrow">我的健康航程</span><h1>今天也為自己<br/>前進一步</h1><p>每一次行動，都留下足跡。</p></div><div className="voyage-hero-status"><Ship aria-hidden/><span>{progress.currentPort?`已抵達${progress.currentPort.name}`:'準備啟程'}<strong>累積 {progress.totalDays} 個紀錄日</strong></span></div></section>
    <section className="voyage-today" aria-label="今日三項任務"><div className="voyage-section-heading"><h2>今天的小行動</h2><span>{progress.todayCount}／3 已記錄</span></div><div className="voyage-task-list">{tasks.map(({kind,Icon,title,detail,action})=>{const record=records.find(r=>r.date===today&&r.kind===kind);return <Button key={kind} variant="outline" className={`voyage-task ${kind} ${record&&record.medicationComplete!==false?'recorded':''}`} onClick={()=>onTask(kind,record)}><span className="voyage-task-icon"><Icon aria-hidden/></span><span className="voyage-task-text"><strong>{title}</strong><span>{record?.medicationComplete===false?record.status:record?'已記錄，點此查看或修改':detail}</span></span><span className="voyage-task-action">{record?.medicationComplete===false?<span>繼續回報</span>:record?<><Check aria-hidden/><span>已記錄</span></>:<><span>{action}</span><ChevronRight aria-hidden/></>}</span></Button>;})}</div></section></div>
    {children}
    <div className="voyage-home-bottom"><WeeklyProgress progress={progress}/><section className="voyage-next"><span className="voyage-icon-label"><Compass aria-hidden/>下一站，期待與您相遇</span><h2>{progress.nextPort?.name||'新的足跡，繼續累積'}</h2><p>{progress.nextPort?`再累積 ${progress.nextPort.days-progress.totalDays} 個紀錄日，就能抵達。`:'這條航線已完成，紀錄與成就繼續為您珍藏。'}</p><Button variant="ghost" onClick={()=>onNavigate('journey')}>看看我的航程<ArrowRight aria-hidden/></Button></section></div>
  </>;
}
export function VoyageJourney({progress}:{progress:VoyageProgress}) {
  return <><div className="voyage-page-heading"><span className="voyage-eyebrow">一路走來的足跡</span><h1>我的健康航程</h1><p>不必連續，每一個紀錄日都會累積。</p></div><div className="voyage-journey-grid"><section className="voyage-map" aria-label="航程地圖"><img src={base+'voyage/islands.webp'} alt="海上三座島嶼，從啟程港前往活力島與好習慣灣" width="1024" height="1536"/><svg className="voyage-route" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><path d="M 13 34 C 9 53 76 53 65 82 S 10 107 13 126" fill="none" stroke="white" strokeWidth="0.7" strokeDasharray="1.5 2" strokeLinecap="round"/></svg><ol className="voyage-ports">{PORTS.map((port,index)=>{const reached=progress.totalDays>=port.days;const next=port.name===progress.nextPort?.name;return <li key={port.name} className={`port-${index} ${reached?'reached':next?'next':'waiting'}`}><span className="voyage-port-marker">{reached?<Check aria-hidden/>:next?<Ship aria-hidden/>:<Lock aria-hidden/>}</span><div><strong>{port.name}</strong><span>{reached?'已抵達':`累積 ${port.days} 個紀錄日`}</span></div></li>;})}</ol></section><div className="voyage-journey-aside"><WeeklyProgress progress={progress}/><section className="voyage-explainer"><Anchor aria-hidden/><h2>照自己的步調前進</h2><p>有保存任一項紀錄，就累積一個紀錄日；同一天最多計算一次。</p><p>中斷後隨時回來，過去的足跡仍然保留。航程呈現參與紀錄，不代表疾病控制或服藥達標。</p></section></div></div></>;
}
const badgeIcons={first:Flag,exercise:Footprints,meal:Utensils,medicine:MessageCircle,week:Ship,month:Award};
export function VoyageAchievements({progress}:{progress:VoyageProgress}) {
  const earned=progress.badges.filter(b=>b.earned).length;
  return <><div className="voyage-page-heading"><span className="voyage-eyebrow">把努力，好好收藏</span><h1>我的成就</h1><p>從第一次記錄，到每一次願意繼續。</p></div><section className="voyage-award-banner"><span className="voyage-compass"><Compass aria-hidden/></span><div><span className="voyage-eyebrow">我的航程收藏</span><h2>{earned?`已收藏 ${earned} 枚紀念章`:'第一枚紀念章，等您啟程'}</h2><p>{earned?'每一枚，都是照顧自己的足跡。':'保存第一份紀錄，留下今天的開始。'}</p></div></section><div className="voyage-badges">{progress.badges.map(badge=>{const Icon=badgeIcons[badge.id as keyof typeof badgeIcons];return <article key={badge.id} className={`voyage-badge ${badge.earned?'earned':''}`}><div className="voyage-medallion"><Icon aria-hidden/>{badge.earned&&<span><Check aria-hidden/></span>}</div><h2>{badge.name}</h2><p>{badge.description}</p><span className="voyage-badge-status">{badge.earned?'已獲得':`${Math.min(badge.value,badge.goal)}／${badge.goal}`}</span></article>;})}</div><p className="voyage-reward-note">紀念章獎勵持續紀錄；未服用或有疑問的如實回報，也同樣值得肯定。</p></>;
}
export function VoyageNavigation({view,onNavigate}:{view:PatientView;onNavigate:(view:PatientView)=>void}) {
  return <nav className="voyage-navigation" aria-label="主要導覽">{([{id:'home',label:'今日',Icon:Home},{id:'journey',label:'航程',Icon:Map},{id:'achievements',label:'成就',Icon:Star},{id:'account',label:'我的',Icon:UserRound}] as const).map(({id,label,Icon})=><Button key={id} variant="ghost" aria-current={(view===id||id==='account'&&view==='history')?'page':undefined} onClick={()=>onNavigate(id)}><Icon aria-hidden/><span>{label}</span></Button>)}</nav>;
}
export function HistoryLink({onClick}:{onClick:()=>void}){return <Button variant="outline" className="voyage-history-link" onClick={onClick}><CalendarDays aria-hidden/><span>查看健康紀錄與月曆</span><ChevronRight aria-hidden/></Button>;}
