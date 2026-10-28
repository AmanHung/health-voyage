import type {RecordItem} from '../production/api';
export type CareKind=RecordItem['kind'];
// One-time baseline requested by the administrator. Never advance on login or deploy.
export const CARE_RECORD_NEW_SINCE='2026-10-28T09:22:24.000Z';
export function isBaselineCareRecord(r:Pick<RecordItem,'createdAt'>){const time=Date.parse(r.createdAt);return Number.isFinite(time)&&time<=Date.parse(CARE_RECORD_NEW_SINCE);}
export function baselineCareRecordIds(records:RecordItem[]){return records.filter(isBaselineCareRecord).map(r=>r.id);}
export const careKinds:CareKind[]=['medicine','exercise','meal'];
export const careLabels:Record<CareKind,string>={medicine:'用藥',exercise:'運動',meal:'飲食'};
export type CareAdvice={id:string;patientId:string;date:string;kind:CareKind;sourceRecordId:string;body:string;publishedAt:string;withdrawn:boolean;authorLabel:string};
export type CareRead={id:string;patientId:string;type:'record'|'advice';versionId:string;actor:string;createdAt:string};
export type CareInbox={advice:CareAdvice[];readIds:string[]};
export const careKey=(r:{date:string;kind:CareKind})=>`${r.kind}:${r.date}`;
export function currentCareRecords(records:RecordItem[],includeDeleted=false){const map=new Map<string,RecordItem>();for(const r of records)map.set(`${r.patientId}:${careKey(r)}`,r);return [...map.values()].filter(r=>includeDeleted||!r.deletedAt).sort((a,b)=>b.date.localeCompare(a.date));}
export function currentAdvice(history:CareAdvice[]){const map=new Map<string,CareAdvice>();for(const a of history)map.set(`${a.patientId}:${careKey(a)}`,a);return [...map.values()];}
export function publishedCareAdvice(history:CareAdvice[],records:RecordItem[]){const keys=new Set(currentCareRecords(records).map(r=>`${r.patientId}:${careKey(r)}`));return currentAdvice(history).filter(a=>!a.withdrawn&&keys.has(`${a.patientId}:${careKey(a)}`)).reverse();}
export function recordCareSummary(records:RecordItem[],reads:CareRead[],actor:string){const seen=new Set(reads.filter(r=>r.type==='record'&&r.actor===actor).map(r=>r.versionId));const counts={medicine:0,exercise:0,meal:0},unseen={...counts};for(const r of currentCareRecords(records)){counts[r.kind]++;if(!seen.has(r.id)&&!isBaselineCareRecord(r))unseen[r.kind]++;}return {recordCounts:counts,unseenCounts:unseen};}
