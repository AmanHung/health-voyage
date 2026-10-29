import {careKinds,type CareKind} from './care.ts';
type Counts={recordCounts?:Partial<Record<CareKind,number>>;unseenCounts?:Partial<Record<CareKind,number>>};
// Categories are OR'ed together; "new only" applies to those same categories.
export function matchesCareFilters(patient:Counts,onlyNew:boolean,kinds:readonly CareKind[]){
  if(!onlyNew&&!kinds.length)return true;
  const selected=kinds.length?kinds:careKinds;
  const counts=onlyNew?patient.unseenCounts:patient.recordCounts;
  return selected.some(kind=>(counts?.[kind]||0)>0);
}
