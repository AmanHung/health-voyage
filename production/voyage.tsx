import {DailyCheckin,nearestAchievement,ShellSummary,useShells,RecordCalendar} from './journey-features';
import {AchievementGallery} from './achievement-gallery';
import {achievementCollections} from '../lib/achievements';
import {BadgeArt} from './badge-art';
import type {ReactNode} from 'react';
import {Anchor,ArrowRight,Award,CalendarDays,Check,ChevronRight,Compass,Flag,Footprints,Home,Lock,Map,MessageCircle,Pill,Ship,Star,Sun,Utensils,UserRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {PORTS,type VoyageProgress} from '@/lib/voyage';
import type {RecordItem} from './api';

export type PatientView='home'|'exercise'|'journey'|'achievements'|'account'|'history'|'diet';
const base=import.meta.env.BASE_URL;
const tasks=[
  {kind:'exercise',Icon:Footprints,title:'運動紀錄',detail:'記下今天走過的每一步',action:'記錄步數'},
  {kind:'meal',Icon:Utensils,title:'飲食紀錄',detail:'從一餐開始，照顧自己',action:'拍照記錄'},
  {kind:'medicine',Icon:Pill,title:'用藥回報',detail:'如實記錄，安心提問',action:'回報情形'},
] as const;
export function WeeklyProgress({progress}:{progress:VoyageProgress}) {
  return <div className="voyage-week"><div className="voyage-week-heading"><span>本週紀錄</span><strong>{progress.weeklyDays} <small>／ {progress.weeklyGoal} 天</small></strong></div>
    <Progress className="voyage-progress" value={Math.min(progress.weeklyDays/progress.weeklyGoal,1)*100} aria-label={`本週已記錄 ${progress.weeklyDays} 天，目標 ${progress.weeklyGoal} 天`}/>
    <div className="voyage-week-days">{progress.week.map(day=><div key={day.date} className={day.done?'logged':day.future?'future':''} aria-label={`${day.date}，${day.done?'已記錄':day.future?'尚未到':'未記錄'}`}><span>{day.label}</span><i>{day.done?<Check aria-hidden/>:Number(day.date.slice(-2))}</i></div>)}</div>
    <p>{progress.weeklyDays>=progress.weeklyGoal?'本週挑戰完成！每一份努力都已留下。':`再累積 ${progress.weeklyGoal-progress.weeklyDays} 天，完成本週小挑戰。`}</p>
  </div>;
}
export function VoyageHome({nickname,progress,records,onTask,onNavigate,children,leaderboard}:{nickname:string;progress:VoyageProgress;records:RecordItem[];onTask:(kind:RecordItem['kind'],record?:RecordItem)=>void;onNavigate:(view:PatientView)=>void;children?:ReactNode;leaderboard?:ReactNode}) {
  const today=progress.today;const shells=useShells(records,today);
  const nextBadge=nearestAchievement(achievementCollections(progress));
  return <>
    <div className="voyage-greeting"><span><Sun aria-hidden/>{nickname}，您好</span><span>{Number(today.slice(5,7))} 月 {Number(today.slice(8))} 日</span></div>
    <div className="voyage-home-grid"><section className="voyage-hero"><img src={base+'voyage/coast.webp'} alt="" width="1536" height="512" fetchPriority="high"/><div className="voyage-hero-copy"><span className="voyage-eyebrow">豐原醫院・藥劑科</span><h1>每天一步，<br className="voyage-mobile-break"/>健康同行</h1><p>記下運動、飲食與用藥。</p></div><div className="voyage-hero-status"><Ship aria-hidden/><span>{shells.current?`已抵達${shells.current.name}`:'準備啟程'}<strong>已收藏 {shells.total} 顆貝殼</strong></span></div></section>
    <section className="voyage-today" aria-label="今日三項任務"><div className="voyage-section-heading"><h2>今天的健康任務</h2><span>{progress.todayCount}／3 已記錄</span></div><div className="voyage-task-list">{tasks.map(({kind,title,detail,action})=>{const record=records.find(r=>r.date===today&&r.kind===kind);return <Button key={kind} variant="outline" className={`voyage-task ${kind} ${record&&record.medicationComplete!==false?'recorded':''}`} onClick={()=>onTask(kind,record)}><span className={`voyage-task-art art-${kind}`} aria-hidden="true"/><span className="voyage-task-text"><strong>{title}</strong><span>{record?.medicationComplete===false?record.status:record?'已記錄，點此查看或修改':detail}</span><small className="voyage-task-state">{record?.medicationComplete===false?'尚待完成回報':record?'已記錄':'尚未記錄'}</small></span><span className="voyage-task-action">{record?.medicationComplete===false?<span>繼續回報</span>:record?<><Check aria-hidden/><span>已記錄</span></>:<><span>{action}</span><ChevronRight aria-hidden/></>}</span></Button>;})}</div></section></div>
    <RecordCalendar kind="tasks" records={records} today={today}/><DailyCheckin/>
    {children}
    {nextBadge&&<button className="collection-home-teaser" onClick={()=>onNavigate('achievements')}><BadgeArt series={nextBadge.id} tier={nextBadge.next!.index}/><span><small>最接近的下一枚收藏</small><strong>{nextBadge.next!.name}</strong><span>已完成 {Math.round(nextBadge.value/nextBadge.next!.goal*100)}％・再累積 {(nextBadge.next!.goal-nextBadge.value).toLocaleString()} {nextBadge.unit}，讓收藏更豐富</span></span><ChevronRight aria-hidden/></button>}
    <ShellSummary records={records} today={today} onNavigate={onNavigate}/>
  </>;
}
export function VoyageJourney({progress}:{progress:VoyageProgress}) {
  return <><div className="voyage-page-heading"><span className="voyage-eyebrow">一路走來的足跡</span><h1>我的健康航程</h1><p>不必連續，每一個紀錄日都會累積。</p></div><div className="voyage-journey-grid"><section className="voyage-map" aria-label="航程地圖"><img src={base+'voyage/islands.webp'} alt="海上三座島嶼，從啟程港前往活力島與好習慣灣" width="900" height="1350"/><div className="voyage-map-total">累積記錄 <strong>{progress.totalDays}</strong> 天</div><svg className="voyage-route" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><path d="M 72 31 C 94 51 14 48 29 76 S 96 100 64 121" fill="none" stroke="white" strokeWidth="0.9" strokeDasharray="1.5 2" strokeLinecap="round"/></svg><ol className="voyage-ports">{PORTS.map((port,index)=>{const reached=progress.totalDays>=port.days;const next=port.name===progress.nextPort?.name;return <li key={port.name} className={`port-${index} ${reached?'reached':next?'next':'waiting'}`}><span className="voyage-port-marker">{reached?<Check aria-hidden/>:next?<Ship aria-hidden/>:<Lock aria-hidden/>}</span><div><strong>{port.name}</strong><span>{reached?'已抵達':`累積 ${port.days} 個紀錄日`}</span></div></li>;})}</ol></section><div className="voyage-journey-aside"><WeeklyProgress progress={progress}/><section className="voyage-explainer"><Anchor aria-hidden/><h2>照自己的步調前進</h2><p>有保存任一項紀錄，就累積一個紀錄日；同一天最多計算一次。</p><p>中斷後隨時回來，過去的足跡仍然保留。航程呈現參與紀錄，不代表疾病控制或服藥達標。</p></section></div></div></>;
}
export function VoyageAchievements({progress}:{progress:VoyageProgress}) {
  return <AchievementGallery progress={progress}/>;
}
export function VoyageNavigation({view,onNavigate}:{view:PatientView;onNavigate:(view:PatientView)=>void}) {
  return <nav className="voyage-navigation" aria-label="主要導覽">{([{id:'home',label:'每日任務',Icon:Home},{id:'exercise',label:'運動足跡',Icon:Footprints},{id:'diet',label:'護心餐桌',Icon:Utensils},{id:'journey',label:'健康航程',Icon:Map},{id:'achievements',label:'成就收藏',Icon:Star}] as const).map(({id,label,Icon})=><Button key={id} variant="ghost" aria-current={(view===id)?'page':undefined} onClick={()=>onNavigate(id)}><Icon aria-hidden/><span>{label}</span></Button>)}</nav>;
}
export function HistoryLink({onClick}:{onClick:()=>void}){return <Button variant="outline" className="voyage-history-link" onClick={onClick}><CalendarDays aria-hidden/><span>查看健康紀錄與月曆</span><ChevronRight aria-hidden/></Button>;}
