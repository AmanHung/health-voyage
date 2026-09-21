import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogClose} from '@/components/ui/dialog';
import {foodCategories,categoryIcons,foodLights,findFoods,currentMeals,mealWeek,type Food} from '../lib/food-guide';
import type {RecordItem} from './api';
import './food-guide.css';

export function FoodDetail({food}:{food:Food}) {
  const light=foodLights[food.color];
  return <><div className="fg-badges"><span className={'fg-light '+food.color}>{light.name}・{light.meaning}</span>{food.cautions.map(label=><span className="fg-tag" key={label}>{label}</span>)}</div>
    <div className="fg-overview"><div><h3>食材特性</h3><p>{food.characteristic}</p></div><img src={import.meta.env.BASE_URL+'food-art/'+food.art+'.svg'} alt={food.name+'插圖'} width="200" height="180"/></div>
    <section className="fg-caution"><h3>注意事項</h3><p>{food.tip}</p>{food.cautionNotes.map(note=><p className="fg-note" key={note}>{note}</p>)}</section>
    {['red','yellow'].includes(food.color)&&<section className="fg-swap"><h3>健康選擇</h3><p>{food.alt}</p></section>}</>;
}
export function FoodSearch() {
  const [query,setQuery]=useState(''),[category,setCategory]=useState('全部'),[selected,setSelected]=useState<Food|null>(null);
  const results=findFoods(category,query);
  return <section className="fg-search"><div className="fg-intro"><span>點餐前，先看一眼</span><h1>這個可以吃嗎？</h1><p>看懂原因，比只記住顏色更有用。</p></div>
    <label className="fg-searchbox"><span aria-hidden>⌕</span><input type="search" aria-label="搜尋食物" placeholder="找食物，例如：吐司、豆漿、地瓜" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="fg-categories" aria-label="食物分類">{foodCategories.map(c=><button key={c} type="button" aria-pressed={category===c} onClick={()=>setCategory(c)}>{categoryIcons[c]&&<span aria-hidden>{categoryIcons[c]}</span>}{c}</button>)}</div>
    <section className="fg-legend" aria-labelledby="fg-legend-title"><h2 id="fg-legend-title">燈號怎麼看？</h2><ul>{Object.entries(foodLights).map(([color,light])=><li key={color} className={color}><span className={'fg-dot '+color} aria-hidden/><div><strong>{light.name}</strong><span>{light.meaning}</span></div></li>)}</ul><p>燈號也與做法有關，綠燈仍需適量。<br/>點「查看」，了解各項食物的注意事項。</p></section>
    <div className="fg-list">{results.map(food=><button type="button" className="fg-row" key={food.id} onClick={()=>setSelected(food)} aria-label={`${food.name}，${foodLights[food.color].name}，查看注意事項`}><span className={'fg-dot '+food.color} aria-hidden/><strong>{food.name}</strong><span className="fg-view" aria-hidden>查看 ›</span></button>)}{!results.length&&<div className="fg-empty" role="status">尚無符合的食物。可試試「吐司」「豆漿」「魚」。{category!=='全部'&&<Button variant="outline" onClick={()=>setCategory('全部')}>改查全部分類</Button>}</div>}</div>
    <p className="fg-note">飲食建議供日常選擇參考；若另有限鉀、限磷或限水計畫，請依照護團隊的個人指示。</p>
    <Dialog open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null);}}>{selected&&<DialogContent showCloseButton={false} className={'prod-dialog fg-dialog '+selected.color}><DialogClose className="fg-close" aria-label="關閉食物小卡">×</DialogClose><DialogTitle className="fg-title">{selected.name}</DialogTitle><DialogDescription className="sr-only">食物特性、注意事項與健康選擇</DialogDescription><FoodDetail food={selected}/></DialogContent>}</Dialog>
  </section>;
}
type Props={records:RecordItem[];today:string;onRecord:(record?:RecordItem)=>void;onPhoto:(record:RecordItem)=>void;onBack:()=>void;initialPage?:'home'|'search'|'week'};
export function DietGuide({records,today,onRecord,onPhoto,onBack,initialPage='home'}:Props) {
  const [page,setPage]=useState(initialPage);
  const meals=currentMeals(records,today),week=mealWeek(records,today),latest=meals[0],todayMeal=meals.find(r=>r.date===today);
  function changePage(next:typeof page){setPage(next);window.scrollTo({top:0,behavior:'instant'});}
  function recordCard(r:RecordItem){return <article className="fg-meal" key={r.id}><h3>{r.date}・{r.period||'飲食紀錄'}</h3><p>{r.mealDetails?.mealName||r.groups?.join('、')||'已記錄餐點'}</p>{r.feedback&&<p><strong>本餐回饋：</strong>{r.feedback}</p>}<div className="fg-actions">{r.hasImage&&<Button variant="outline" onClick={()=>onPhoto(r)}>看照片</Button>}<Button variant="outline" onClick={()=>onRecord(r)}>查看或修改</Button></div></article>;}
  return <div className="food-guide"><Button variant="ghost" onClick={onBack}>← 回健康航程</Button><nav className="fg-tabs" aria-label="護心餐桌導覽"><button aria-current={page==='home'?'page':undefined} onClick={()=>changePage('home')}>護心餐桌</button><button onClick={()=>onRecord(todayMeal)}>記錄一餐</button><button aria-current={page==='search'?'page':undefined} onClick={()=>changePage('search')}>食物查詢</button><button aria-current={page==='week'?'page':undefined} onClick={()=>changePage('week')}>本週回顧</button></nav>
    {page==='home'&&<><section className="fg-hero"><div><span>我的護心餐桌</span><h1>今天，<br/>吃得更好一點。</h1><p>記下一餐，找到一個適合自己的小改變。</p><Button onClick={()=>onRecord(todayMeal)}>{todayMeal?'查看今天的飲食紀錄':'＋ 記錄這一餐'}</Button></div><img src={import.meta.env.BASE_URL+'food-art/food-7-1.svg'} alt="清蒸魚" width="200" height="180"/></section><div className="fg-entries"><button onClick={()=>changePage('search')}><strong>這個可以吃嗎？</strong><span>查燈號，找到合適的健康選擇 →</span></button><button onClick={()=>changePage('week')}><strong>看看這週</strong><span>已留下 {week.recordedDays} 天飲食紀錄 →</span></button></div><section className="fg-panel"><h2>最近的一餐</h2>{latest?recordCard(latest):<p>還沒有飲食紀錄，從今天的一餐開始。</p>}</section></>}
    {page==='search'&&<FoodSearch/>}
    {page==='week'&&<section className="fg-panel"><h1>本週餐桌足跡</h1><p>{week.days[0]} — {week.days[6]}</p><h2>已留下 {week.recordedDays} 天飲食紀錄</h2><div className="fg-days">{week.days.map((date,i)=><div key={date}><span>{['一','二','三','四','五','六','日'][i]}</span><strong aria-label={`${date}，${date>today?'尚未到':week.meals.some(r=>r.date===date)?'已記錄':'未記錄'}`}>{date>today?'·':week.meals.some(r=>r.date===date)?'✓':'—'}</strong></div>)}</div><p className="fg-note">未記錄不代表飲食不佳。目前每天保留一筆飲食紀錄，修改不重複計算；紀錄不代表全天攝取量。</p>{week.meals.length?week.meals.map(recordCard):<p>這週尚未留下飲食紀錄。</p>}</section>}
  </div>;
}
