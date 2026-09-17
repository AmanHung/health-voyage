import {RefreshCw,Footprints} from 'lucide-react';
import {RankMedal} from './rank-medal';
import {Avatar} from './avatar';
import {Button} from '@/components/ui/button';
import './step-leaderboard.css';
export type StepRow={nickname:string;steps:number;avatar?:string};
export function rankedSteps(rows:StepRow[]){
  const sorted=rows.filter(row=>Number.isFinite(row.steps)&&row.steps>0).slice().sort((a,b)=>b.steps-a.steps);
  let rank=0;
  return sorted.map((row,index)=>{if(index===0||row.steps!==sorted[index-1].steps)rank=index+1;return {...row,rank,tied:sorted.filter(other=>other.steps===row.steps).length>1};});
}
export function StepLeaderboard({rows,today,ownSteps=0,avatar,onEditAvatar,loading=false,error='',onRetry}:{rows:StepRow[];today:string;ownSteps?:number;avatar?:string;onEditAvatar?:()=>void;loading?:boolean;error?:string;onRetry?:()=>void}){
  const ranked=rankedSteps(rows);
  return <section className="step-board" aria-label="本月同行步數排行榜" aria-busy={loading}>
    <div className="step-board-hero"><div className="step-board-heading"><div><span className="step-board-month">{Number(today.slice(0,4))} 年 {Number(today.slice(5,7))} 月</span><h2>同行步數排行榜</h2></div>{onEditAvatar&&<button className="step-avatar-edit" onClick={onEditAvatar} aria-label="設定我的排行榜頭像"><Avatar value={avatar}/><span>換頭像</span></button>}</div>
      <div className="step-total-ring"><span>我的本月累積</span><strong>{ownSteps.toLocaleString('zh-TW')}</strong><span>步</span></div><p className="step-board-cheer">每一步，都讓航程更向前。</p><div className="step-board-wave" aria-hidden="true"/>
    </div>
    <div className="step-board-body">{loading?<p className="step-board-message" role="status">正在更新本月榜單…</p>:error?<div className="step-board-message" role="status"><p>{error}</p>{onRetry&&<Button variant="outline" onClick={onRetry}><RefreshCw aria-hidden/>重新讀取</Button>}</div>:ranked.length===0?<div className="step-board-message"><Footprints aria-hidden/><p>本月還沒有步數紀錄。<br/>記下今天的步數，向榜單第一步出發！</p></div>:<ol className="step-ranking-list">{ranked.map((row,index)=><li key={index} className={`step-ranking-row place-${row.rank}`}><span className="step-rank" aria-label={`${row.tied?'並列':''}第 ${row.rank} 名`}>{row.rank<=3?<RankMedal rank={row.rank}/>:row.rank}</span><Avatar value={row.avatar} label={`${row.nickname}的頭像`}/><div className="step-person"><strong>{row.nickname}</strong>{row.tied&&<small>並列第 {row.rank} 名</small>}</div><span className="step-score">{row.steps.toLocaleString('zh-TW')}<small> 步</small></span></li>)}</ol>}
      <p className="step-board-note">以本月已記錄步數累計，最多顯示 20 位；同分並列。依自己的活動目標，持續累積。</p>
    </div>
  </section>;
}
