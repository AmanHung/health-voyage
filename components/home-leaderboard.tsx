import { Trophy, Footprints, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HomeLeaderboard({nickname, steps, participating, onParticipating}: {nickname: string; steps: number; participating: boolean; onParticipating: (value: boolean) => void}) {
  const entries = [
    {nick:'晨光散步', steps:10400, self:false},
    {nick:'森林小徑', steps:8700, self:false},
    {nick:'自在同行', steps:6500, self:false},
    ...(participating ? [{nick:nickname, steps:3200 + steps, self:true}] : []),
  ].sort((a,b) => b.steps-a.steps);
  return <section className="surface home-leaderboard" aria-label="首頁步數排行榜">
    <div className="calendar-heading"><h2><Trophy aria-hidden />9 月步數榜</h2><span className="pill">示範榜單</span></div>
    <p className="legend">自願參加，只顯示暱稱與步數。</p>
    <ol className="home-rank-list">{entries.map((p,i) => <li className={`rank-row ${p.self ? 'self' : ''}`} key={p.self ? 'self' : p.nick}>
      <span className="rank-position" aria-label={`第 ${i+1} 名`}>{i === 0 ? <Trophy aria-hidden /> : i+1}</span>
      <span className="rank-nickname">{p.nick}{p.self && <small>（你）</small>}</span>
      <span className="rank-steps"><strong>{p.steps.toLocaleString()}</strong><small> 步</small></span>
    </li>)}</ol>
    <Button type="button" className="full-button" variant={participating ? 'outline' : 'default'} aria-pressed={participating} onClick={() => onParticipating(!participating)}>{participating ? <Check aria-hidden /> : <Footprints aria-hidden />}{participating ? '退出步數榜' : '參加步數榜'}</Button>
    <p className="legend">{participating ? '已參加；退出不影響任務與紀錄。' : '目前未參加，一樣能完成任務。'}</p>
    <details className="simple-help"><summary>排行榜說明</summary><p>截至示範日期 9／2。其他參與者為虛構；您的示範月步數包含預設 3,200 步與本日紀錄。參加設定重整後清除，不會對外分享。</p><p>飲食照片、病歷與用藥不列入排行榜。請依自己的身體狀況運動，不必追求名次。</p></details>
  </section>;
}
