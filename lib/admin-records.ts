import {exerciseSummary} from './exercise.ts';
import type {RecordItem} from '../production/api';
export function adminRecordGroups(records:RecordItem[]) {
  const groups=new Map<string,RecordItem[]>();
  for(const record of records){const key=`${record.patientId}:${record.date}:${record.kind}`;const versions=groups.get(key)||[];versions.push(record);groups.set(key,versions);}
  return [...groups.values()].map(versions=>({current:versions[versions.length-1],versions})).sort((a,b)=>b.current.date.localeCompare(a.current.date));
}
export function recordSummary(r:RecordItem) {
  return r.kind==='exercise'?exerciseSummary(r):r.kind==='meal'?`${r.period}・${r.mealDetails?.mealName||r.groups?.join('、')}・${r.eaten}`:r.status||'';
}
