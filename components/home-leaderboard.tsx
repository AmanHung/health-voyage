import { Trophy } from 'lucide-react';

export function HomeLeaderboard({nickname, steps}: {nickname: string; steps: number; participating: boolean; onParticipating: (value: boolean) => void}) {
  const entries = [
    {nick:'晨光散步', steps:10400, self:false},
    {nick:'森林小徑', steps:8700, self:false},
    {nick:'自在同行', steps:6500, self:false},
    {nick:nickname, steps:3200 + steps, self:true},
  ].sort((a,b) => b.steps-a.steps);
  return <section className="surface home-leaderboard" aria-label="首頁步數排行榜">
    <div className="calendar-heading"><h2><Trophy aria-hidden />9 月步數榜</h2><span className="pill">示範榜單</span></div>
    <p className="legend">所有正式個案以暱稱參加，只顯示暱稱與步數。</p>
    <ol className="home-rank-list">{entries.map((p,i) => <li className={`rank-row ${p.self ? 'self' : ''}`} key={p.self ? 'self' : p.nick}>
      <span className="rank-position" aria-label={`第 ${i+1} 名`}>{i === 0 ? <Trophy aria-hidden /> : i+1}</span>
      <span className="rank-nickname">{p.nick}{p.self && <small>（你）</small>}</span>
      <span className="rank-steps"><strong>{p.steps.toLocaleString()}</strong><small> 步</small></span>
    </li>)}</ol>
    <details className="simple-help"><summary>排行榜說明</summary><p>截至示範日期 9／2。其他參與者為虛構；您的示範月步數包含預設 3,200 步與本日紀錄。</p><p>飲食照片、病歷與用藥不列入排行榜。請依自己的身體狀況運動，不必追求名次。</p></details>
  </section>;
}
