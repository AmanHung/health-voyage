import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {suggestedGroups,type FoodReceipt} from '@/lib/food-ai';
export function FoodAiResult({analysis}:{analysis:FoodReceipt}) {
  return <div><p><strong>AI 辨識原始結果</strong>（尚非您的確認值）</p>
    {!analysis.result.isFood?<p>無法確認這是可辨識的餐點照片，請換張照片或手動填寫。</p>:<ul>{analysis.result.items.map((i,n)=><li key={n}>{i.name} · {i.group} · {i.certainty}</li>)}</ul>}
    {analysis.result.uncertainties.map((x,n)=><p key={n}>待確認：{x}</p>)}
    <small>{analysis.model} · 「較明確」不代表保證正確。照片無法確認食材全貌、份量與實際攝取量。</small>
  </div>;
}
export function FoodAiPanel({file,analysis,onResult,onApply,onBusy}:{file:File|null;analysis:FoodReceipt|null;onResult:(r:FoodReceipt|null)=>void;onApply:(groups:string[],names:string)=>void;onBusy:(busy:boolean)=>void}) {
  const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [available,setAvailable]=useState(false),[status,setStatus]=useState('正在確認 AI 服務…');
  useEffect(()=>{const controller=new AbortController();fetch('/api/food-ai',{cache:'no-store',signal:controller.signal}).then(async r=>{
    if(r.status===401)throw new Error('登入識別尚未完整，暫時不能使用線上 AI；可繼續手動記錄。');
    if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw new Error('此預覽尚未連上食物 AI 服務。');
    const data=await r.json();if(!controller.signal.aborted){setAvailable(data.configured===true);setStatus(data.configured?'已設定 AI 連線（實際可用性依 API 授權與額度）':'線上 AI 金鑰尚未設定；可繼續手動記錄。');}
  }).catch(e=>{if(!controller.signal.aborted)setStatus(e.message);});return()=>controller.abort();},[]);
  async function analyze(){
    if(!file||!consent||busy)return;
    setBusy(true);onBusy(true);setError('');
    try{
      const form=new FormData();form.set('image',file);form.set('consent','true');form.set('requestId',crypto.randomUUID());
      const response=await fetch('/api/food-ai',{method:'POST',body:form,signal:AbortSignal.timeout(55000)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'AI 暫時無法使用。');
      onResult(data.analysis);
    }catch(e){setError(e instanceof Error&&e.name==='TimeoutError'?'辨識逾時，這次可能已計入試用次數；可改用手動記錄。':(e as Error).message);}
    finally{setBusy(false);onBusy(false);}
  }
  return <section className="surface" style={{padding:16}}><h3>讓 AI 幫忙看這一餐</h3><p>{status}</p>
    <p>只建議食物名稱與類別，不推算熱量、糖量或鈉。請自行刪改辨識錯誤的類別，並在餐點名稱欄修正食物名稱。</p>
    <label htmlFor="food-ai-consent" style={{display:'flex',gap:10,alignItems:'flex-start'}}><Checkbox id="food-ai-consent" checked={consent} onCheckedChange={v=>setConsent(v===true)} disabled={busy}/><span>同意將這張無個資的示範照片傳送給 OpenAI 分析，並在私人網站保留辨識結果與試用次數。照片另待確認保存；請勿上傳病人資料。</span></label>
    <Button type="button" style={{marginTop:12}} disabled={!available||!file||!consent||busy} onClick={()=>void analyze()}>{busy?'AI 正在辨識…':'辨識餐點照片'}</Button>
    {!file&&<p>請先選取照片；若要重辨識既有餐點，請重新選取同一張原圖。</p>}
    <small>每人每日最多 10 次，全站每日最多 50 次；失敗或逾時也計次，不會自動重試。AI 分析本身不完成每日任務。</small>
    {error&&<p role="alert" className="error">{error}</p>}
    {analysis&&<><FoodAiResult analysis={analysis}/>{analysis.result.isFood&&<Button type="button" variant="outline" disabled={busy} onClick={()=>onApply(suggestedGroups(analysis.result),analysis.result.items.map(i=>i.name).join('、'))}>套用較明確的類別與餐點名稱（可再修改）</Button>}<Button type="button" variant="ghost" disabled={busy} onClick={()=>onResult(null)}>不附上這次 AI 結果</Button></>}
  </section>;
}
