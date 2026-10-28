import {currentCareRecords,publishedCareAdvice,careKinds,careKey,baselineCareRecordIds} from '../lib/care.ts';
export function careService({read,write,need,locked,audit,person,cleanText,hash}){
 const publicAdvice=a=>({id:a.id,patientId:a.patientId,date:a.date,kind:a.kind,sourceRecordId:a.sourceRecordId,body:a.body,publishedAt:a.publishedAt,withdrawn:a.withdrawn,authorLabel:'照護團隊'});
 function inbox(p,records){const history=read('CareAdvice',p.id),advice=publishedCareAdvice(history,records).map(publicAdvice);return {advice,readIds:read('CareReads',p.id).filter(r=>r.type==='advice'&&r.actor===p.subject).map(r=>r.versionId)};}
 function staff(identity){need(identity.role==='admin','只有管理員可以管理照護建議。');}
 function target(payload,requireActive=true){const p=read('Patients').find(p=>p.id===payload.patientId);need(p&&(!requireActive||p.active&&!p.deletedAt),'找不到使用中的個案。');return p;}
 function publish(payload,identity){staff(identity);return locked(()=>{
  const p=target(payload),requestId=cleanText(payload.requestId,16,64,'操作編號');need(typeof payload.withdrawn==='boolean','請確認發布或撤回操作。');
  need(careKinds.includes(payload.kind)&&typeof payload.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(payload.date),'請確認紀錄日期與種類。');
  const fingerprint=hash(JSON.stringify([payload.patientId,payload.date,payload.kind,payload.sourceRecordId,payload.body,payload.withdrawn,payload.previousAdviceId||null]));
  const history=read('CareAdvice',p.id),retry=history.find(a=>a.requestId===requestId);if(retry){need(retry.actor===identity.subject&&retry.fingerprint===fingerprint,'請重新提交更新後的建議。');return {advice:publicAdvice(retry),alreadyApplied:true};}
  const records=read('Records',p.id),r=currentCareRecords(records).find(r=>r.id===payload.sourceRecordId&&r.date===payload.date&&r.kind===payload.kind);need(r,'紀錄已更新或刪除，請重新載入後檢視。');
  const previous=history.filter(a=>a.date===r.date&&a.kind===r.kind).at(-1);need((previous?.id||null)===(payload.previousAdviceId||null),'建議已由其他管理員更新，請重新載入後再操作。');
  need(!payload.withdrawn||previous&&!previous.withdrawn,'沒有可撤回的建議。');
  if(!payload.withdrawn)need(typeof payload.body==='string'&&payload.body.trim().length>0&&payload.body.trim().length<=600&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(payload.body),'請填寫 1 至 600 字的建議內容。');
  const body=payload.withdrawn?previous.body:payload.body.trim(),now=new Date().toISOString();
  const advice={id:Utilities.getUuid(),patientId:p.id,date:r.date,kind:r.kind,sourceRecordId:r.id,body,publishedAt:now,createdAt:now,withdrawn:payload.withdrawn,actor:identity.subject,requestId,fingerprint};
  write('CareAdvice',advice);audit(identity.subject,payload.withdrawn?'care.withdraw':'care.publish',advice.id,{patientId:p.id,sourceRecordId:r.id});return {advice:publicAdvice(advice)};
 });}
 function view(payload,identity,type){return locked(()=>{
  let p,versionId;if(type==='record'){staff(identity);p=target(payload);versionId=cleanText(payload.recordId,1,80,'紀錄編號');need(currentCareRecords(read('Records',p.id),true).some(r=>r.id===versionId),'紀錄已更新，請重新載入。');}
  else {need(identity.role==='patient','只有個案可以確認閱讀自己的建議。');p=person(identity);versionId=cleanText(payload.adviceId,1,80,'建議編號');need(publishedCareAdvice(read('CareAdvice',p.id),read('Records',p.id)).some(a=>a.id===versionId),'建議已更新或撤回，請重新載入。');}
  const rows=read('CareReads',p.id);if(rows.some(r=>r.actor===identity.subject&&r.type===type&&r.versionId===versionId))return {versionId,alreadyApplied:true};
  write('CareReads',{id:Utilities.getUuid(),patientId:p.id,type,versionId,actor:identity.subject,createdAt:new Date().toISOString()});audit(identity.subject,type==='record'?'care.recordViewed':'care.adviceRead',versionId,{patientId:p.id});return {versionId};
 });}
 function dispatch(action,payload,identity){
  if(action==='care.publish')return publish(payload,identity);
  if(action==='care.viewRecord')return view(payload,identity,'record');
  if(action==='care.readAdvice')return view(payload,identity,'advice');
  if(action==='care.list'){need(identity.role==='patient','只有個案可以讀取自己的建議。');const p=person(identity);return inbox(p,read('Records',p.id));}
  if(action==='care.records'){staff(identity);const p=target(payload,false);const records=read('Records',p.id).filter(r=>r.kind===payload.kind);need(careKinds.includes(payload.kind),'請選擇紀錄種類。');return {records:records.map(r=>{const {imageFileId,_row,adminMutation,requestId,fingerprint,...rest}=r;return {...rest,hasImage:!!imageFileId};}),adviceHistory:read('CareAdvice',p.id).filter(a=>a.kind===payload.kind).map(publicAdvice),viewedIds:[...new Set([...baselineCareRecordIds(records),...read('CareReads',p.id).filter(r=>r.type==='record'&&r.actor===identity.subject).map(r=>r.versionId)])],readAdviceIds:[...new Set(read('CareReads',p.id).filter(r=>r.type==='advice'&&r.actor===p.subject).map(r=>r.versionId))]};}
  throw new Error('不支援此照護操作。');
 }
 return {dispatch,inbox};
}
