import {Crown,Medal,Trophy,Footprints,RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import './step-leaderboard.css';

export type StepRow={nickname:string;steps:number};
export function rankedSteps(rows:StepRow[]){
  const sorted=rows.filter(row=>Number.isFinite(row.steps)&&row.steps>0).slice().sort((a,b)=>b.steps-a.steps);
  let rank=0;
  return sorted.map((row,index)=>{if(index===0||row.steps!==sorted[index-1].steps)rank=index+1;return {...row,rank,tied:sorted.filter(other=>other.steps===row.steps).length>1};});
}
export function StepLeaderboard({rows,today,loading=false,error='',onRetry}:{rows:StepRow[];today:string;loading?:boolean;error?:string;onRetry?:()=>void}){
  const ranked=rankedSteps(rows),leaders=ranked.filter(row=>row.rank<=3),others=ranked.filter(row=>row.rank>3);
  return <section className="step-board" aria-label="本月同行步數排行榜" aria-busy={loading}>
    <div className="step-board-heading"><span className="step-board-trophy"><Trophy aria-hidden/></span><div><span className="step-board-month">{Number(today.slice(0,4))} 年 {Number(today.slice(5,7))} 月・累積步數</span><h2>同行步數排行榜</h2></div></div>
    <p className="step-board-cheer">本月一起爭取前三名！<br/>每天多一點累積，讓努力登上榜單。</p>
    {loading?<p className="step-board-message" role="status">正在更新本月榜單…</p>:error?<div className="step-board-message" role="status"><p>{error}</p>{onRetry&&<Button variant="outline" onClick={onRetry}><RefreshCw aria-hidden/>重新讀取</Button>}</div>:ranked.length===0?<div className="step-board-message"><Footprints aria-hidden/><p>本月還沒有步數紀錄。<br/>記下今天的步數，向榜單第一步出發！</p></div>:<>
      <ol className="step-podium">{leaders.map((row,index)=><li key={index} className={`step-winner place-${row.rank}`}><span className="step-medal">{row.rank===1?<Crown aria-hidden/>:<Medal aria-hidden/>}<span>{row.rank}</span></span><span className="step-place">{row.tied?'並列':''}第 {row.rank} 名</span><strong className="step-name">{row.nickname}</strong><span className="step-score">{row.steps.toLocaleString('zh-TW')}<small>步</small></span></li>)}</ol>
      {others.length>0&&<details className="step-more"><summary>查看其餘 {others.length} 位同行夥伴</summary><ol>{others.map((row,index)=><li key={index}><span className="step-list-place">{row.tied?'並列':''}{row.rank}</span><strong>{row.nickname}</strong><span>{row.steps.toLocaleString('zh-TW')}<small> 步</small></span></li>)}</ol></details>}
    </>}
    <p className="step-board-note">以本月已記錄步數累計，最多顯示 20 位；同分並列。依自己的活動目標，持續累積。</p>
  </section>;
}
