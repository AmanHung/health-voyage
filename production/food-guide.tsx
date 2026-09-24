import {RecordCalendar} from './journey-features';
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
  return <div className="food-guide">{page==='search'&&<Button variant="ghost" onClick={()=>changePage('home')}>← 回護心餐桌</Button>}
    {page==='home'&&<><section className="fg-hero"><div><span>我的護心餐桌</span><h1>今天，<br/>吃得更好一點。</h1><p>記下一餐，找到一個適合自己的小改變。</p><Button onClick={()=>onRecord(todayMeal)}>{todayMeal?'查看今天的飲食紀錄':'＋ 記錄這一餐'}</Button></div><img src={import.meta.env.BASE_URL+'voyage/plate.svg'} alt="蔬菜、魚肉與全穀飯的餐盤插圖" width="200" height="180"/></section><button className="preview-food-query" onClick={()=>changePage('search')}><span className="preview-query-icon" aria-hidden>⌕</span><span className="preview-query-copy"><strong>這個可以吃嗎？</strong><span>找到合適的健康選擇</span><small>搜尋食物・查看注意事項</small></span><span className="preview-query-cta">點我查詢 <span aria-hidden>→</span></span></button></>}
    {page==='search'&&<FoodSearch/>}
    {page!=='search'&&<section className="fg-panel"><RecordCalendar kind="meal" records={records} today={today} onRecord={onRecord} onPhoto={onPhoto}/></section>}
  </div>;
}
