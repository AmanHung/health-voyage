import { useState } from 'react';
import { Star, Footprints, Utensils, Pill, Check, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dayTasks, monthDates, type CalendarInput, type TaskStatus } from '@/lib/task-calendar';

const statusText: Record<TaskStatus,string> = { done: '已完成', missing: '未記錄', unavailable: '無可用資料', future: '尚未到' };
const tasks = [{name:'運動',Icon:Footprints},{name:'飲食',Icon:Utensils},{name:'用藥',Icon:Pill}];
export function TaskCalendar(props: CalendarInput) {
  const [selected, setSelected] = useState(props.today);
  const month = monthDates(props.today);
  const days = month.dates.map(date => ({date,...dayTasks(date,props)}));
  const day = dayTasks(selected,props);
  const stars = days.filter(d => d.complete).length;
  const logged = days.filter(d => d.count > 0).length;
  return <section className="surface task-calendar" aria-label="每日任務月曆">
    <div className="calendar-heading"><h2><CalendarDays aria-hidden />{month.month} 月任務月曆</h2><span className="pill">{month.year} 年{props.live ? '' : '・示範'}</span></div>
    <div className="calendar-rewards"><span><Star aria-hidden />{stars} 顆星星</span><span><Check aria-hidden />已記錄 {logged} 天</span></div>
    <p>完成三項，點亮一顆星星。</p>
    <div className="calendar-scroll" tabIndex={0} role="region" aria-label="月份日期，小螢幕可左右滑動">
      <div className="calendar-grid">
        {['日','一','二','三','四','五','六'].map(w => <span className="calendar-weekday" key={w}>{w}</span>)}
        {Array.from({length:month.offset},(_,i) => <span key={`blank-${i}`} aria-hidden />)}
        {days.map(d => <Button key={d.date} type="button" variant="ghost" className={`calendar-day ${d.complete ? 'complete' : d.count ? 'partial' : ''}`} aria-pressed={selected === d.date} aria-current={d.date === props.today ? 'date' : undefined} aria-label={`${d.date}，${d.date > props.today ? '尚未到' : `已完成 ${d.count} 項${d.statuses.includes('unavailable') ? '，部分資料不可用' : ''}`}`} disabled={d.date > props.today} onClick={() => setSelected(d.date)}>
          <span>{Number(d.date.slice(-2))}</span>
          {d.complete ? <Star className="calendar-star" aria-hidden /> : <span className="calendar-dots" aria-hidden>{d.statuses.map((s,i) => <span key={i} className={s === 'done' ? 'filled' : ''} />)}</span>}
        </Button>)}
      </div>
    </div>
    <div className="calendar-key"><span><Star aria-hidden />三項完成</span><span>圓點：已記錄項目</span></div>
    <div className="calendar-detail" aria-live="polite"><h3>{Number(selected.slice(5,7))} 月 {Number(selected.slice(8))} 日</h3>
      <div className="calendar-task-list">{tasks.map(({name,Icon},i) => <div key={name} className={day.statuses[i] === 'done' ? 'is-done' : ''}><Icon aria-hidden /><span>{name}</span><strong>{statusText[day.statuses[i]]}</strong></div>)}</div>
    </div>
    <details className="simple-help"><summary>月曆怎麼計算？</summary><p>點日期看紀錄。星星只獎勵真實回報，不評比步數、飲食或是否吃藥；修訂不重複累計。</p>{props.live ? <p>依已保存的紀錄計算；同一天修改不會重複加星。</p> : <p>示範今日為 {props.today}。運動與飲食依已保存資料；用藥目前僅暫存今日回報，重整後清除，過去用藥不推測。未連線顯示「無可用資料」。小螢幕月曆可左右滑動。</p>}</details>
  </section>;
}
