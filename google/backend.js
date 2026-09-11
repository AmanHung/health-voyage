/* Runs only in Google Apps Script. Never import into the browser bundle. */
import { requireValue as need, cleanText, dayKey, validateRecord, latest, leaderboard, feedback } from './domain.js';
import {medicationService} from './medication-service.js';
const ADMIN = 'obm0304@gmail.com';
const SCHEMAS = {
  Patients: ['個案編號', '建立時間', '姓名', '暱稱', '測試個案', '資料'],
  Records: ['紀錄編號', '個案編號', '日期', '種類', '儲存時間', '資料'],
  Audit: ['時間', '操作者', '操作', '目標', '資料'],
  MedicationPlans: ['版本編號','個案編號','生效時間','建立時間','資料'],
};
const props = () => PropertiesService.getScriptProperties();
const hash = s => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
const config = key => { const v = props().getProperty(key); need(v, '網站尚未完成設定，請聯絡管理員。'); return v; };
const json = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
function sheet(name) {
  const id = config(name === 'Patients' ? 'PATIENT_SHEET_ID' : 'RECORD_SHEET_ID');
  const s = SpreadsheetApp.openById(id).getSheetByName(name);
  need(s, '資料表尚未準備完成。'); return s;
}
function read(name, patientId) {
  const s = name==='MedicationPlans'?SpreadsheetApp.openById(config('RECORD_SHEET_ID')).getSheetByName(name):sheet(name); if (!s || s.getLastRow() < 2) return [];
  // This prototype is deliberately bounded; fail instead of silently dropping records.
  need(s.getLastRow() <= 25000, '資料量已達試用上限，請管理員安排升級。');
  if(patientId){
    const ids=s.getRange(2,2,s.getLastRow()-1,1).getValues();
    return ids.flatMap((r,i)=>r[0]===patientId?[{...JSON.parse(s.getRange(i+2,SCHEMAS[name].length,1,1).getValues()[0][0]),_row:i+2}]:[]);
  }
  return s.getRange(2, SCHEMAS[name].length, s.getLastRow()-1, 1).getValues().map((r, i) => ({ ...JSON.parse(r[0]), _row: i + 2 }));
}
function columns(name, row) {
  const data = {...row}; delete data._row;
  if (name === 'Patients') return [row.id, row.createdAt, row.name, row.nickname, row.isTest ? '是' : '否', JSON.stringify(data)];
  if (name === 'MedicationPlans') return [row.id,row.patientId,row.effectiveFrom,row.createdAt,JSON.stringify(data)];
  if (name === 'Records') return [row.id, row.patientId, row.date, row.kind, row.createdAt, JSON.stringify(data)];
  return [row.createdAt, row.actor, row.action, row.target, JSON.stringify(data)];
}
function write(name, row, number) {
  if(name==='MedicationPlans'){const book=SpreadsheetApp.openById(config('RECORD_SHEET_ID'));if(!book.getSheetByName(name)){const created=book.insertSheet(name);created.getRange(1,1,1,SCHEMAS[name].length).setValues([SCHEMAS[name]]);created.setFrozenRows(1);}}
  const s = sheet(name), cells = columns(name, row).map(v => /^[=+@\-\t\r]/.test(String(v)) ? "'" + v : v);
  s.getRange(number || s.getLastRow()+1, 1, 1, cells.length).setNumberFormat('@').setValues([cells]);
}
function locked(fn) {
  const lock = LockService.getScriptLock();
  need(lock.tryLock(15000), '目前使用人數較多，請稍後再試。');
  try { return fn(); } finally { lock.releaseLock(); }
}
function audit(actor, action, target, details) { write('Audit', { createdAt: new Date().toISOString(), actor, action, target, ...(details?{details}:{}) }); }
function fetchJson(url, options = {}) {
  const r = UrlFetchApp.fetch(url, { ...options, muteHttpExceptions: true });
  need(r.getResponseCode() === 200, '登入已失效，請重新登入。');
  return JSON.parse(r.getContentText());
}
export function authenticate(auth) {
  need(auth && ['line', 'google'].includes(auth.provider) && typeof auth.token === 'string' && auth.token.length > 50 && auth.token.length < 12000, '請先登入。');
  const clientId = config(auth.provider === 'line' ? 'LINE_CHANNEL_ID' : 'GOOGLE_CLIENT_ID');
  const cache = CacheService.getScriptCache(), key = 'identity:' + hash(auth.provider + ':' + clientId + ':' + auth.token);
  const cached = cache.get(key);
  if (cached) { const id = JSON.parse(cached); if (id.exp > Date.now()/1000) return id; }
  let claim;
  if (auth.provider === 'line') {
    claim = fetchJson('https://api.line.me/oauth2/v2.1/verify', { method: 'post', payload: { id_token: auth.token, client_id: clientId } });
    need(claim.iss === 'https://access.line.me' && String(claim.aud) === clientId, 'LINE 登入驗證失敗。');
  } else {
    // Google tokeninfo verifies the signature remotely; check all identity claims too.
    // Only a server-to-Google HTTPS call contains the token. Never put it in browser URLs or logs.
    claim = fetchJson('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(auth.token));
    need(['accounts.google.com', 'https://accounts.google.com'].includes(claim.iss) && claim.aud === clientId && [true, 'true'].includes(claim.email_verified), 'Google 登入驗證失敗。');
    const email=String(claim.email).toLowerCase();
    need(email===ADMIN||read('Patients').some(p=>p.active&&!p.deletedAt&&p.pharmacists?.includes(email)), '此帳號沒有管理員或藥師權限。');
  }
  need(typeof claim.sub === 'string' && claim.sub.length > 0 && Number(claim.exp) > Date.now()/1000, '登入已過期，請重新登入。');
  const identity = { provider: auth.provider, subject: auth.provider + ':' + claim.sub, role: auth.provider === 'google' ? (String(claim.email).toLowerCase()===ADMIN?'admin':'pharmacist') : 'patient', email:auth.provider==='google'?String(claim.email).toLowerCase():undefined, exp: Number(claim.exp) };
  cache.put(key, JSON.stringify(identity), Math.max(1, Math.min(60, Math.floor(identity.exp - Date.now()/1000))));
  return identity;
}
function admin(identity) { need(identity.role === 'admin', '沒有管理員權限。'); }
function person(identity) {
  const p = read('Patients').find(p => p.subject === identity.subject);
  need(p && p.active && !p.deletedAt, '請先綁定邀請碼，或聯絡照護團隊。'); return p;
}
function publicPerson(p) { return {id:p.id, nickname:p.nickname, participating:p.participating, isTest:p.isTest, active:p.active&&!p.deletedAt,activityGoals:(p.activityGoals||[]).map(g=>({id:g.id,steps:g.steps,effectiveFrom:g.effectiveFrom}))}; }
function adminPerson(p) { return {...publicPerson(p),name:p.name,bound:!!p.subject,deletedAt:p.deletedAt||null,stateVersion:p.stateChanges?.slice(-1)[0]?.id||null}; }
function publicRecord(r) { const o = {...r, hasImage: !!r.imageFileId}; delete o.imageFileId; delete o._row; delete o.adminMutation; return o; }
function visibleRecordIds(records) {
  const byId=new Map(records.map(r=>[r.id,r])),visible=new Set();
  for(const current of latest(records)) {
    let r=current;
    while(r&&!visible.has(r.id)){visible.add(r.id);r=byId.get(r.previousId);}
  }
  return visible;
}
function checkRate(subject) {
  const c = CacheService.getScriptCache(), key = 'rate:' + hash(subject), count = Number(c.get(key) || 0);
  need(count < 40, '操作太頻繁，請稍後再試。'); c.put(key, String(count+1), 60);
}
function privateFolder() {
  const folder = DriveApp.getFolderById(config('PHOTO_FOLDER_ID'));
  need(folder.getSharingAccess() === DriveApp.Access.PRIVATE && folder.getEditors().length === 0 && folder.getViewers().length === 0, '照片資料夾權限異常，請聯絡管理員。');
  return folder;
}
export function validateImage(data) {
  need(typeof data === 'string' && data.length < 1100000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data), '照片格式或大小不正確，請重新選取。');
  const bytes = Utilities.base64Decode(data.split(',')[1]), u = bytes.map(b => (b+256)%256);
  need(u.length <= 800000 && u[0] === 255 && u[1] === 216 && u[u.length-2] === 255 && u[u.length-1] === 217, '請上傳已壓縮的 JPG 圖片。');
  let width = 0, height = 0, pos = 2;
  while (pos + 8 < u.length) {
    need(u[pos] === 255, '圖片損壞。'); const marker = u[pos+1];
    if (marker === 218 || marker === 217) break;
    const size = u[pos+2]*256+u[pos+3]; need(size >= 2 && pos+size+2 <= u.length, '圖片損壞。');
    // Accept ordinary JPEG metadata. Access remains private and the browser normally re-encodes uploads.
    if ([192,193,194].includes(marker)) { height=u[pos+5]*256+u[pos+6]; width=u[pos+7]*256+u[pos+8]; }
    pos += size+2;
  }
  need(width>0 && height>0 && width<=1920 && height<=1920 && width*height<=3686400, '圖片解析度超過限制。');
  return {bytes, width, height};
}
const medication=medicationService({read,write,need,cleanText,locked,hash,audit,publicRecord,latest,person});
export function dispatch(action, payload, identity) {
  checkRate(identity.subject);
  const today = dayKey();
  if(identity.role==='pharmacist'){
    const assigned=read('Patients').filter(p=>p.active&&!p.deletedAt&&p.pharmacists?.includes(identity.email));
    need(assigned.length,'藥師權限已移除，請聯絡管理員。');
    if(action==='bootstrap')return {role:'pharmacist',today,patients:assigned.map(p=>({id:p.id,name:p.name}))};
    need(['medication.read','medication.publish'].includes(action),'沒有此操作權限。');
  }
  if(action.startsWith('medication.')||action==='admin.medicationStaff')return medication.dispatch(action,payload,identity,today);
  if (action === 'bootstrap') {
    if (identity.role === 'admin') return {role:'admin', email:ADMIN, today};
    const p = read('Patients').find(x=>x.subject===identity.subject);
    if (!p) return {role:'patient', bound:false, today};
    need(p.active && !p.deletedAt, '帳號已停用，請聯絡照護團隊。');
    const plans=medication.histories(p.id);
    return {role:'patient',bound:true,today,profile:publicPerson(p),records:latest(read('Records',p.id)).map(r=>medication.decorate(r,plans))};
  }
  if (action === 'admin.createPatient') {
    admin(identity);
    const requestId = cleanText(payload.requestId, 16, 64, '操作編號');
    const name = cleanText(payload.name, 1, 40, '姓名');
    return locked(()=> {
      const previous = read('Patients').find(p=>p.requestId===requestId);
      if (previous) return {patient:publicPerson(previous),alreadyCreated:true};
      const rawCode = Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase();
      const p = {id:Utilities.getUuid(),createdAt:new Date().toISOString(),name,nickname:'健康同行',subject:'',active:true,participating:true,isTest:payload.isTest===true,requestId,inviteHash:hash(rawCode),inviteExpiresAt:Date.now()+3*86400000,inviteUsedAt:null};
      write('Patients',p); audit(identity.subject,'patient.create',p.id);
      return {patient:publicPerson(p),code:rawCode,expiresAt:new Date(p.inviteExpiresAt).toISOString()};
    });
  }
  if (action === 'bind') {
    need(identity.role==='patient', '請使用 LINE 帳號綁定。');
    const code = cleanText(payload.code, 16, 24, '邀請碼').replace(/[ -]/g,'').toUpperCase();
    const nickname = cleanText(payload.nickname, 2, 12, '暱稱');
    return locked(()=> {
      const attemptKey = 'invite:' + hash(identity.subject), cache=CacheService.getScriptCache(), attempts=Number(cache.get(attemptKey)||0);
      need(attempts<5,'邀請碼嘗試次數過多，請一小時後再試。');
      cache.put(attemptKey,String(attempts+1),3600);
      const people=read('Patients');
      const existing = people.find(p=>p.subject===identity.subject);
      if(existing) { need(existing.active&&!existing.deletedAt,'帳號已停用。'); return {profile:publicPerson(existing)}; }
      const p=people.find(p=>p.inviteHash===hash(code));
      need(p && p.active && !p.deletedAt && !p.subject && !p.inviteUsedAt && p.inviteExpiresAt>Date.now(),'邀請碼錯誤、已使用或已過期。');
      p.subject=identity.subject;p.nickname=nickname;p.inviteUsedAt=new Date().toISOString();
      write('Patients',p,p._row);audit(identity.subject,'patient.bind',p.id);
      return {profile:publicPerson(p)};
    });
  }
  if (action === 'admin.patients') { admin(identity); return {patients:read('Patients').map(adminPerson)}; }
  if (action === 'admin.patientStatus') {
    admin(identity);need(typeof payload.deleted==='boolean','請確認刪除或復原操作。');
    const requestId=cleanText(payload.requestId,16,64,'操作編號');
    return locked(()=>{
      const p=read('Patients').find(p=>p.id===payload.patientId);need(p,'找不到個案。');
      const history=p.stateChanges||[],version=history.slice(-1)[0]?.id||null;
      const fingerprint=hash(JSON.stringify([payload.deleted,payload.previousVersion||null]));
      const retry=history.find(change=>change.requestId===requestId);
      if(retry){need(retry.fingerprint===fingerprint,'請重新提交刪除或復原操作。');return {patient:adminPerson(p),alreadyApplied:true};}
      need(version===(payload.previousVersion||null),'個案狀態已更新，請重新整理名冊。');
      need(!!p.deletedAt!==payload.deleted,'個案狀態已更新，請重新整理名冊。');
      const change={id:Utilities.getUuid(),requestId,fingerprint,deleted:payload.deleted,createdAt:new Date().toISOString(),actor:identity.subject};
      p.stateChanges=[...history,change];p.deletedAt=payload.deleted?change.createdAt:null;
      // Keep original active state, LINE binding and evidence for exact restore.
      write('Patients',p,p._row);audit(identity.subject,payload.deleted?'patient.delete':'patient.restore',p.id,{changeId:change.id});
      return {patient:adminPerson(p)};
    });
  }
  if (action === 'admin.recordStatus') {
    admin(identity);need(typeof payload.deleted==='boolean','請確認刪除或復原操作。');
    const requestId=cleanText(payload.requestId,16,64,'操作編號');
    return locked(()=>{
      const all=read('Records'),source=all.find(r=>r.id===payload.id);need(source,'找不到紀錄。');
      const p=read('Patients').find(p=>p.id===source.patientId);need(p&&!p.deletedAt,'請先復原個案，再管理紀錄。');
      const records=all.filter(r=>r.patientId===p.id);
      const retry=records.find(r=>r.adminMutation?.requestId===requestId);
      if(retry){need(retry.adminMutation.sourceId===payload.id&&retry.adminMutation.deleted===payload.deleted,'請重新提交刪除或復原操作。');return {records:records.map(publicRecord),alreadyApplied:true};}
      const current=latest(records,true).find(r=>r.date===source.date&&r.kind===source.kind);
      need(current?.id===source.id&&!!current.deletedAt!==payload.deleted,'紀錄已有新版或狀態已變更，請重新載入紀錄。');
      const now=new Date().toISOString();
      const revision={...current,id:Utilities.getUuid(),createdAt:now,previousId:current.id,deletedAt:payload.deleted?now:null,adminMutation:{requestId,sourceId:source.id,deleted:payload.deleted,actor:identity.subject}};
      delete revision._row;delete revision.requestId;delete revision.fingerprint;
      write('Records',revision);audit(identity.subject,payload.deleted?'record.delete':'record.restore',revision.id,{patientId:p.id,previousId:source.id});
      return {records:[...records,revision].map(publicRecord)};
    });
  }
  if (action === 'admin.activityGoal') {
    admin(identity);
    const requestId=cleanText(payload.requestId,16,64,'操作編號');
    need(payload.steps===null||(typeof payload.steps==='number'&&Number.isInteger(payload.steps)&&payload.steps>0&&payload.steps<=100000),'請填寫 1 至 100,000 的整數步數，或選擇暫停目標。');
    return locked(()=> {
      const p=read('Patients').find(p=>p.id===payload.patientId);need(p&&p.active&&!p.deletedAt,'找不到可設定的個案。');
      const history=p.activityGoals||[],previous=history[history.length-1]||null;
      const fingerprint=hash(JSON.stringify([payload.steps,payload.previousId||null]));
      const retry=history.find(g=>g.requestId===requestId);
      if(retry){need(retry.fingerprint===fingerprint,'請重新提交更新後的目標。');return {profile:publicPerson(p)};}
      need((previous?.id||null)===(payload.previousId||null),'目標已更新，請重新整理名冊後再設定。');
      need(payload.steps!==null||previous,'尚未設定活動目標。');
      // Initial goal starts today. Later changes start tomorrow, protecting all
      // completed days and today's target; same-day edits retain every revision.
      const effectiveFrom=previous?new Date(Date.parse(today+'T00:00:00Z')+86400000).toISOString().slice(0,10):today;
      const goal={id:Utilities.getUuid(),steps:payload.steps,effectiveFrom,createdAt:new Date().toISOString(),createdBy:identity.subject,requestId,fingerprint};
      p.activityGoals=[...history,goal];write('Patients',p,p._row);
      audit(identity.subject,'activityGoal.update',p.id,{previousId:previous?.id||null,goalId:goal.id,steps:goal.steps,effectiveFrom});
      return {profile:publicPerson(p)};
    });
  }
  if (action === 'admin.records') {
    admin(identity);const p=read('Patients').find(p=>p.id===payload.patientId);need(p,'找不到個案。');
    audit(identity.subject,'records.read',p.id);
    return {records:read('Records').filter(r=>r.patientId===p.id).map(publicRecord)};
  }
  if (action === 'image') {
    const all=read('Records'),r=all.find(r=>r.id===payload.id);need(r && r.imageFileId,'找不到照片。');
    if(identity.role!=='admin') {const p=person(identity);need(r.patientId===p.id&&visibleRecordIds(all.filter(r=>r.patientId===p.id)).has(r.id),'找不到照片。');}
    privateFolder();
    const file=DriveApp.getFileById(r.imageFileId);
    need(file.getSize()<=800000,'照片大小異常。');
    return {dataUrl:'data:image/jpeg;base64,'+Utilities.base64Encode(file.getBlob().getBytes())};
  }
  if (action === 'profile') return locked(()=> {
    const current=person(identity);
    current.nickname=cleanText(payload.nickname,2,12,'暱稱');
    current.participating=true;
    write('Patients',current,current._row);audit(identity.subject,'profile.update',current.id);
    return {profile:publicPerson(current)};
  });
  if (action === 'leaderboard') {if(identity.role!=='admin')person(identity);return {rows:leaderboard(read('Patients'),read('Records'),today.slice(0,7))};}
  if (action === 'save') {
    const value=validateRecord(payload.record,today), requestId=cleanText(payload.requestId,16,64,'操作編號');
    const image = payload.image ? validateImage(payload.image) : null;
    need(value.kind==='medicine' || image || typeof payload.previousId==='string','請選取照片或截圖。');
    return locked(()=> {
      const current=person(identity), all=read('Records').filter(r=>r.patientId===current.id);
      const fingerprint=hash(JSON.stringify(value)+String(payload.image||'')+String(payload.previousId||''));
      const previousRequest=all.find(r=>r.requestId===requestId);
      if(previousRequest){need(previousRequest.fingerprint===fingerprint,'請重新提交更新後的紀錄。');need(latest(all).some(r=>r.id===previousRequest.id),'紀錄已更新或刪除，請重新整理後再確認。');return {record:publicRecord(previousRequest)};}
      if(value.kind==='medicine')need(!medication.histories(current.id).some(p=>p.effectiveFrom.slice(0,10)<=value.date),'請改用逐項用藥回報，舊版每日回報不會覆蓋清單。');
      const dayRecord=latest(all).find(r=>r.date===value.date&&r.kind===value.kind);
      need((dayRecord?.id||null)===(payload.previousId||null),'紀錄已更新，請重新整理後再修改。');
      let imageFileId=dayRecord?.imageFileId||null;
      if(image){ const folder=privateFolder(); const file=folder.createFile(Utilities.newBlob(image.bytes,'image/jpeg',current.id+'_'+value.date+'_'+Utilities.getUuid()+'.jpg')); imageFileId=file.getId(); }
      const record={...value,id:Utilities.getUuid(),patientId:current.id,createdAt:new Date().toISOString(),previousId:dayRecord?.id||null,requestId,fingerprint,imageFileId,imageWidth:image?.width||dayRecord?.imageWidth||null,imageHeight:image?.height||dayRecord?.imageHeight||null};
      // Keep older compressed evidence for revision audit; no destructive overwrite.
      if(value.kind==='meal') record.feedback=feedback(value);
      write('Records',record); audit(identity.subject,'record.save',record.id);
      return {record:publicRecord(record)};
    });
  }
  throw new Error('不支援此操作。');
}
function requestAllowed(action, payload, identity) {
  if (identity.role === 'admin' || identity.role==='pharmacist' || props().getProperty('ACCEPT_PATIENTS') === 'true') return true;
  if (identity.role !== 'patient' || props().getProperty('ACCEPT_TEST_PATIENTS') !== 'true') return false;
  const people = read('Patients'), current = people.find(p=>p.subject===identity.subject);
  if (current) return current.active && !current.deletedAt && current.isTest === true;
  // An authenticated LINE user may reach the invitation screen, but no data is disclosed.
  if (action === 'bootstrap') return true;
  if (action !== 'bind' || typeof payload.code !== 'string') return false;
  const code = payload.code.replace(/[ -]/g,'').toUpperCase();
  const invited = people.find(p=>p.inviteHash===hash(code));
  return !!(invited && invited.active && !invited.deletedAt && invited.isTest === true && !invited.subject && !invited.inviteUsedAt && invited.inviteExpiresAt>Date.now());
}
export function get() { return json({ok:true,service:'health-voyage',version:4,capabilities:['activityGoals','adminTrash','medicationPlans'],acceptingPatients:props().getProperty('ACCEPT_PATIENTS')==='true',acceptingTestPatients:props().getProperty('ACCEPT_TEST_PATIENTS')==='true'}); }
export function post(e) {
  try {
    need(e?.postData?.contents && e.postData.contents.length<=1250000,'上傳資料太大或格式不正確。');
    const body=JSON.parse(e.postData.contents);
    const identity=authenticate(body.auth);
    need(requestAllowed(body.action,body.payload||{},identity),'網站尚未開放，請稍後再試。');
    return json({ok:true,data:dispatch(body.action,body.payload||{},identity)});
  } catch(error) {
    // No token, uploaded content, Google endpoint URL or raw exception in logs/responses.
    const message=String(error?.message||'');
    return json({ok:false,error:/^[\u3400-\u9fff]/.test(message) ? message.slice(0,160) : '服務暫時無法完成，請稍後重試。'});
  }
}
export function setup() {
  need(Session.getEffectiveUser().getEmail().toLowerCase()===ADMIN,'請使用指定管理員帳號執行。');
  return locked(()=> {
    const p=props();
    for(const [key,names,title] of [['PATIENT_SHEET_ID',['Patients'],'健康航程｜私有個案名冊'],['RECORD_SHEET_ID',['Records','Audit'],'健康航程｜健康紀錄與操作紀錄']]) {
      let book;
      if(p.getProperty(key)) book=SpreadsheetApp.openById(p.getProperty(key));
      else { book=SpreadsheetApp.create(title);p.setProperty(key,book.getId()); }
      for(const name of names){let s=book.getSheetByName(name);if(!s)s=book.insertSheet(name);if(s.getLastRow()===0){s.getRange(1,1,1,SCHEMAS[name].length).setValues([SCHEMAS[name]]);s.setFrozenRows(1);}}
    }
    if(!p.getProperty('PHOTO_FOLDER_ID'))p.setProperty('PHOTO_FOLDER_ID',DriveApp.createFolder('健康航程｜私有壓縮照片').getId());
    if(!p.getProperty('ACCEPT_PATIENTS'))p.setProperty('ACCEPT_PATIENTS','false');
    if(!p.getProperty('ACCEPT_TEST_PATIENTS'))p.setProperty('ACCEPT_TEST_PATIENTS','false');
    privateFolder();
    return {ready:true,acceptingPatients:p.getProperty('ACCEPT_PATIENTS')==='true'};
  });
}
