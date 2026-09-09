import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,Camera,Check,ChevronRight,HelpCircle,Pencil,Utensils} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import type {MealSuggestion} from './meal-classifier';
import {MEAL_TYPES,emptyMealInterview,inferMealType,mealInterviewComplete,mealQuestionKeys,questionLabel,questionOptions,type MealInterview as Answers,type MealQuestionKey,type MealType} from '../lib/meal-interview';
import {initialMealScreen,mealSummaryScreen,nextMealScreen,mealReadyForSave} from '../lib/meal-flow';

const PERIODS=['早餐','午餐','晚餐','點心'];
const icons:Record<MealType,string>={'便當／餐盤':'🍱','自助餐':'🍽️','漢堡／三明治':'🍔','湯麵':'🍜','乾麵／炒麵':'🥢','飯類':'🍛','粥／湯品':'🥣','火鍋':'🍲','早餐':'🍳','點心／甜品':'🍰','水果':'🍎','飲料':'🥤','其他':'✍️'};

export function MealInterview({imageUrl,hasSavedImage=false,period,onPeriod,value,onChange,onReady}:{imageUrl:string|null;hasSavedImage?:boolean;period:string;onPeriod:(v:string)=>void;value:Answers;onChange:(v:Answers)=>void;onReady:(v:boolean)=>void}){
  const [screen,setScreen]=useState(()=>initialMealScreen(value)),[suggestion,setSuggestion]=useState<MealSuggestion|null>(null),[analyzing,setAnalyzing]=useState(false),[analysisFailed,setAnalysisFailed]=useState(false),[analyzedUrl,setAnalyzedUrl]=useState(''),[manual,setManual]=useState(value.source==='patient-entered'),[manualName,setManualName]=useState(value.mealName||'');
  const [editing,setEditing]=useState(false);
  const keys=useMemo(()=>value.mealType?mealQuestionKeys(value.mealType):[],[value.mealType]);
  const questionIndex=screen-2,done=screen>=keys.length+2;
  useEffect(()=>onReady(mealReadyForSave(value,screen)),[value,screen,onReady]);
  useEffect(()=>{
    if(!imageUrl||value.mealType||manual)return;
    let active=true;setAnalyzing(true);setAnalysisFailed(false);setSuggestion(null);
    const finish=()=>{if(active){setAnalyzing(false);setAnalyzedUrl(imageUrl);}};
    const image=new Image();image.onload=()=>import('./meal-classifier').then(module=>active?module.classifyMeal(image):null).then(result=>{if(active){setSuggestion(result);setAnalysisFailed(!result);}}).catch(()=>{if(active){setSuggestion(null);setAnalysisFailed(true);}}).finally(finish);image.onerror=()=>{if(active){setAnalysisFailed(true);finish();}};image.src=imageUrl;
    return()=>{active=false;};
  },[imageUrl,value.mealType,manual]);
  function update(patch:Partial<Answers>){onChange({...value,...patch});}
  function identify(type:MealType,name:string=type,source:Answers['source']='patient-selected'){
    update({...emptyMealInterview(),mealType:type,mealName:name.trim().slice(0,40),source,modelSuggestion:suggestion?.name||''});setScreen(1);setManual(false);setEditing(false);
  }
  function answer(key:MealQuestionKey,answer:string){
    const next={...value};
    if(key==='restrictedDiet')next.restrictedDiet=answer==='有';
    else if(key==='cookingMethod')next.cookingMethod=answer;
    else if(key==='stapleAmount')next.stapleAmount=answer;
    else if(key==='vegetableAmount')next.vegetableAmount=answer;
    else if(key==='proteinAmount')next.proteinAmount=answer;
    else if(key==='soupAmount')next.soupAmount=answer;
    else if(key==='sideDish')next.sideDish=answer;
    else if(key==='portionSize')next.portionSize=answer;
    else if(key==='processedFood')next.processedFood=answer;
    else if(key==='eaten')next.eaten=answer;
    else next.drink=answer;
    onChange(next);setScreen(nextMealScreen(next,screen,editing));setEditing(false);
  }
  function changeType(){setManual(true);setManualName(value.mealName);setEditing(true);setScreen(0);}
  function editAt(next:number){setEditing(true);setScreen(next);}
  function returnToSummary(){setEditing(false);setScreen(mealSummaryScreen(value));}
  const progressTotal=(keys.length||7)+2,progress=Math.min(screen+1,progressTotal);
  if(!imageUrl&&!hasSavedImage&&!value.mealType)return <section className="meal-awaiting"><Camera/><h3>請先選擇餐點照片</h3><p>選好照片後，可使用辨識或自行選擇餐點。</p></section>;
  const waiting=Boolean(imageUrl&&analyzedUrl!==imageUrl);
  if(screen===0)return <Question title={manual?'選擇餐點類型':analyzing||waiting?'正在辨識餐點…':suggestion?`初步判斷：${suggestion.name}`:analysisFailed?'模型目前無法判斷':'請確認餐點類型'} current={1} total={progressTotal} stage="確認餐點" onBack={editing&&mealInterviewComplete(value)?returnToSummary:undefined} backLabel="回到確認內容">
    {(analyzing||waiting)&&!manual?<div className="meal-analyzing"><Utensils/><p>模型正在看照片</p><small>您也可以直接選擇，不必等待。</small><Button type="button" variant="outline" onClick={()=>{setManual(true);setAnalyzing(false);}}>自行選擇餐點類型<ChevronRight/></Button></div>:suggestion&&!manual?<><p className="meal-model-result">模型已完成初步判斷，請確認是否正確。</p><div className="meal-answer-row"><Button type="button" onClick={()=>identify(suggestion.mealType,suggestion.name,'model-confirmed')}><Check/>正確</Button><Button type="button" variant="outline" onClick={()=>setManual(true)}>不正確</Button><Button type="button" variant="ghost" onClick={()=>setManual(true)}><HelpCircle/>不知道</Button></div></>:<><p className="meal-model-result">{editing?'選擇不同餐點後，將重新確認這一餐的內容。':'請點選最接近的餐點類型。'}</p><IdentifyChoices manualName={manualName} onManualName={setManualName} onManual={()=>{const name=manualName.trim();if(name)identify(inferMealType(name),name,'patient-entered');}} onPick={type=>identify(type,type,'patient-selected')}/></>}
  </Question>;
  if(screen===1)return <Question title="這是哪一餐？" current={2} total={progressTotal} stage="確認餐點" onBack={editing?returnToSummary:()=>setScreen(0)} backLabel={editing?'回到確認內容':'上一題'}><OptionGrid options={PERIODS} value={period} onPick={v=>{onPeriod(v);setScreen(editing?mealSummaryScreen(value):2);setEditing(false);}}/></Question>;
  if(done)return <section className="meal-summary" aria-live="polite"><div className="meal-done-icon"><Check/></div><h3>確認這一餐</h3><p>需要調整時，直接點選該項修改。</p><div className="meal-review-list"><ReviewRow label="餐點類型" answer={value.mealName} onEdit={changeType}/><ReviewRow label="餐別" answer={period} onEdit={()=>editAt(1)}/>{keys.map((key,index)=><ReviewRow key={key} label={questionLabel(key,value.mealName)} answer={key==='restrictedDiet'?(value.restrictedDiet===null?'尚未確認':value.restrictedDiet?'有':'沒有'):String(value[key])} onEdit={()=>editAt(index+2)}/>)}</div><p className="meal-review-note">核對後，按下方「儲存紀錄」。</p></section>;
  const key=keys[questionIndex];
  if(!key)return null;
  return <Question title={questionLabel(key,value.mealName)} current={progress} total={progressTotal} stage={editing?'修改這一項':'記下餐點內容'} onBack={editing?returnToSummary:()=>setScreen(s=>Math.max(0,s-1))} backLabel={editing?'回到確認內容':'上一題'}><OptionGrid options={[...questionOptions(key)]} value={key==='restrictedDiet'?(value.restrictedDiet===null?'':value.restrictedDiet?'有':'沒有'):String(value[key])} onPick={v=>answer(key,v)}/></Question>;
}

function Question({title,current,total,onBack,backLabel='上一題',stage,children}:{title:string;current:number;total:number;onBack?:()=>void;backLabel?:string;stage:string;children:ReactNode}){
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{const element=heading.current;const dialog=element?.closest('.prod-dialog');element?.focus({preventScroll:true});if(element&&dialog)dialog.scrollTop+=element.getBoundingClientRect().top-dialog.getBoundingClientRect().top-24;},[title]);
  return <section className="meal-question"><div className="meal-progress"><span>{stage}・第 {current}／{total} 題</span><div><i style={{width:`${Math.round(current/total*100)}%`}}/></div></div>{onBack&&<Button type="button" variant="ghost" className="meal-back" onClick={onBack}><ArrowLeft/>{backLabel}</Button>}<h3 ref={heading} tabIndex={-1}>{title}</h3>{children}</section>;
}
function ReviewRow({label,answer,onEdit}:{label:string;answer:string;onEdit:()=>void}){return <div className="meal-review-row"><div><span>{label}</span><strong>{answer}</strong></div><Button type="button" variant="ghost" aria-label={`修改：${label}`} onClick={onEdit}><Pencil aria-hidden/><span>修改</span></Button></div>;}
function OptionGrid({options,value,onPick}:{options:string[];value:string;onPick:(v:string)=>void}){
  return <div className="meal-option-grid">{options.map(option=><Button type="button" key={option} variant={value===option?'default':'outline'} aria-pressed={value===option} onClick={()=>onPick(option)}>{option}<ChevronRight/></Button>)}</div>;
}
function IdentifyChoices({manualName,onManualName,onManual,onPick}:{manualName:string;onManualName:(v:string)=>void;onManual:()=>void;onPick:(v:MealType)=>void}){
  return <div className="meal-identify"><div className="meal-type-grid">{MEAL_TYPES.map(type=><Button type="button" variant="outline" key={type} onClick={()=>onPick(type)}><span aria-hidden>{icons[type]}</span>{type}</Button>)}</div><p>找不到合適類型？</p><label htmlFor="meal-name">輸入餐點名稱</label><Input id="meal-name" value={manualName} maxLength={40} placeholder="例如：雞腿便當" onChange={e=>onManualName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onManual();}}}/><Button type="button" disabled={!manualName.trim()} onClick={onManual}>使用這個名稱<ChevronRight/></Button></div>;
}

export {emptyMealInterview};
