import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {ArrowLeft,Camera,Check,ChevronRight,HelpCircle,Utensils} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {classifyMeal,type MealSuggestion} from './meal-classifier';
import {MEAL_TYPES,emptyMealInterview,inferMealType,mealInterviewComplete,mealQuestionKeys,questionLabel,questionOptions,type MealInterview as Answers,type MealQuestionKey,type MealType} from '../lib/meal-interview';

const PERIODS=['早餐','午餐','晚餐','點心'];
const icons:Record<MealType,string>={'便當／餐盤':'🍱','自助餐':'🍽️','漢堡／三明治':'🍔','湯麵':'🍜','乾麵／炒麵':'🥢','飯類':'🍛','粥／湯品':'🥣','火鍋':'🍲','早餐':'🍳','點心／甜品':'🍰','水果':'🍎','飲料':'🥤','其他':'✍️'};

export function MealInterview({imageUrl,period,onPeriod,value,onChange,onReady}:{imageUrl:string|null;period:string;onPeriod:(v:string)=>void;value:Answers;onChange:(v:Answers)=>void;onReady:(v:boolean)=>void}){
  const [screen,setScreen]=useState(value.mealType?2:0),[suggestion,setSuggestion]=useState<MealSuggestion|null>(null),[analyzing,setAnalyzing]=useState(false),[analysisFailed,setAnalysisFailed]=useState(false),[analyzedUrl,setAnalyzedUrl]=useState(''),[manual,setManual]=useState(value.source==='patient-entered'),[manualName,setManualName]=useState(value.mealName||'');
  const keys=useMemo(()=>value.mealType?mealQuestionKeys(value.mealType):[],[value.mealType]);
  const questionIndex=screen-2,done=screen>=keys.length+2;
  useEffect(()=>onReady(mealInterviewComplete(value)),[value,onReady]);
  useEffect(()=>{
    if(!imageUrl||value.mealType)return;
    let active=true;setAnalyzing(true);setAnalysisFailed(false);setSuggestion(null);
    const finish=()=>{if(active){setAnalyzing(false);setAnalyzedUrl(imageUrl);}};
    const image=new Image();image.onload=()=>classifyMeal(image).then(result=>{if(active){setSuggestion(result);setAnalysisFailed(!result);}}).catch(()=>{if(active){setSuggestion(null);setAnalysisFailed(true);}}).finally(finish);image.onerror=()=>{if(active){setAnalysisFailed(true);finish();}};image.src=imageUrl;
    return()=>{active=false;};
  },[imageUrl,value.mealType]);
  function update(patch:Partial<Answers>){onChange({...value,...patch});}
  function identify(type:MealType,name:string=type,source:Answers['source']='patient-selected'){
    update({...emptyMealInterview(),mealType:type,mealName:name.trim().slice(0,40),source,modelSuggestion:suggestion?.name||''});setScreen(1);setManual(false);
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
    onChange(next);setScreen(s=>s+1);
  }
  function resetType(){onChange(emptyMealInterview());setManual(false);setManualName('');setScreen(0);}
  const progressTotal=(keys.length||7)+2,progress=Math.min(screen+1,progressTotal);
  if(!imageUrl&&!value.mealType)return <section className="meal-awaiting"><Camera/><h3>請先選擇餐點照片</h3><p>選好照片後，會先判斷餐點類型。</p></section>;
  const waiting=Boolean(imageUrl&&analyzedUrl!==imageUrl);
  if(screen===0)return <Question title={analyzing||waiting?'正在辨識餐點…':suggestion?`初步判斷：${suggestion.name}`:analysisFailed?'模型目前無法判斷':'請確認餐點類型'} current={1} total={progressTotal}>
    {analyzing||waiting?<div className="meal-analyzing"><Utensils/><p>模型正在看照片</p><small>第一次使用可能需要幾秒鐘</small></div>:suggestion&&!manual?<><p className="meal-model-result">模型已完成初步判斷，請確認是否正確。</p><div className="meal-answer-row"><Button type="button" onClick={()=>identify(suggestion.mealType,suggestion.name,'model-confirmed')}><Check/>正確</Button><Button type="button" variant="outline" onClick={()=>setManual(true)}>不正確</Button><Button type="button" variant="ghost" onClick={()=>setManual(true)}><HelpCircle/>不知道</Button></div></>:<><p className="meal-model-result">請點選最接近的餐點類型。</p><IdentifyChoices manualName={manualName} onManualName={setManualName} onManual={()=>{const name=manualName.trim();if(name)identify(inferMealType(name),name,'patient-entered');}} onPick={type=>identify(type,type,'patient-selected')}/></>}
  </Question>;
  if(screen===1)return <Question title="這是哪一餐？" current={2} total={progressTotal}><OptionGrid options={PERIODS} value={period} onPick={v=>{onPeriod(v);setScreen(2);}}/></Question>;
  if(done)return <section className="meal-summary" aria-live="polite"><div className="meal-done-icon"><Check/></div><h3>確認完成</h3><p><strong>{value.mealName}</strong>・{period}</p><div className="meal-summary-grid">{keys.map(key=><span key={key}>{questionLabel(key,value.mealName)}<strong>{key==='restrictedDiet'?(value.restrictedDiet?'有':'沒有'):String(value[key])}</strong></span>)}</div><Button type="button" variant="outline" onClick={resetType}><ArrowLeft/>重新回答</Button></section>;
  const key=keys[questionIndex];
  if(!key)return null;
  return <Question title={questionLabel(key,value.mealName)} current={progress} total={progressTotal} onBack={()=>setScreen(s=>Math.max(0,s-1))}><OptionGrid options={[...questionOptions(key)]} value={key==='restrictedDiet'?(value.restrictedDiet===null?'':value.restrictedDiet?'有':'沒有'):String(value[key])} onPick={v=>answer(key,v)}/></Question>;
}

function Question({title,current,total,onBack,children}:{title:string;current:number;total:number;onBack?:()=>void;children:ReactNode}){
  return <section className="meal-question"><div className="meal-progress"><span>第 {current}／{total} 題</span><div><i style={{width:`${Math.round(current/total*100)}%`}}/></div></div>{onBack&&<Button type="button" variant="ghost" className="meal-back" onClick={onBack}><ArrowLeft/>上一題</Button>}<h3>{title}</h3>{children}</section>;
}
function OptionGrid({options,value,onPick}:{options:string[];value:string;onPick:(v:string)=>void}){
  return <div className="meal-option-grid">{options.map(option=><Button type="button" key={option} variant={value===option?'default':'outline'} aria-pressed={value===option} onClick={()=>onPick(option)}>{option}<ChevronRight/></Button>)}</div>;
}
function IdentifyChoices({manualName,onManualName,onManual,onPick}:{manualName:string;onManualName:(v:string)=>void;onManual:()=>void;onPick:(v:MealType)=>void}){
  return <div className="meal-identify"><div className="meal-type-grid">{MEAL_TYPES.map(type=><Button type="button" variant="outline" key={type} onClick={()=>onPick(type)}><span aria-hidden>{icons[type]}</span>{type}</Button>)}</div><p>找不到合適類型？</p><label htmlFor="meal-name">輸入餐點名稱</label><Input id="meal-name" value={manualName} maxLength={40} placeholder="例如：雞腿便當" onChange={e=>onManualName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onManual();}}}/><Button type="button" disabled={!manualName.trim()} onClick={onManual}>使用這個名稱<ChevronRight/></Button></div>;
}

export {emptyMealInterview};
