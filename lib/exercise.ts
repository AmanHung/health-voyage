export const EXERCISE_OPTIONS = [
  {id:'walk',label:'步行／健走'}, {id:'cycle',label:'腳踏車／踏步機'},
  {id:'resistance',label:'彈力帶／啞鈴'}, {id:'strength',label:'坐站／肌力訓練'},
  {id:'rehab',label:'伸展／復健運動'}, {id:'swim',label:'游泳／水中運動'},
  {id:'jog',label:'慢跑'}, {id:'machine',label:'橢圓機／划船機'}, {id:'other',label:'其他運動'},
] as const;
export const EXERCISE_DURATIONS=['未滿 10 分鐘','10～30 分鐘','30～60 分鐘','60 分鐘以上'] as const;
export type ExerciseActivity={id:string;name?:string;duration?:string};
export type ExercisePhoto={key:string;hasImage?:boolean;fileId?:string;width?:number;height?:number};
export type ExerciseRecord={exerciseVersion?:number;activities?:ExerciseActivity[];exercisePhotos?:ExercisePhoto[];mode?:string;value?:number|null;hasImage?:boolean;imageFileId?:string|null;activity?:string;deletedAt?:string|null};
export const activityLabel=(a:ExerciseActivity)=>a.id==='other'?a.name||'其他運動':EXERCISE_OPTIONS.find(o=>o.id===a.id)?.label||a.id;
export const legacyExerciseKey=(r:ExerciseRecord)=>r.mode==='steps'?'walk':r.activity==='自行車'?'cycle':'rehab';
export function exercisePhotoKeys(r:ExerciseRecord):string[]{
  if(r.exerciseVersion===2)return (r.exercisePhotos||[]).filter(p=>(p.hasImage||p.fileId)&&r.activities?.some(a=>a.id===p.key)).map(p=>p.key);
  return r.hasImage||r.imageFileId?['walk']:[];
}
export function exerciseReward(r:ExerciseRecord|undefined|null){
  if(!r||r.deletedAt)return {stars:0,done:false};
  if(r.exerciseVersion!==2){const valid=Boolean((r.hasImage||r.imageFileId)&&r.mode==='steps'&&Number.isInteger(r.value)&&r.value!>=0&&r.value!<=100000);return {stars:valid?(r.value!>=7500?2:r.value!>=5000?1:0):0,done:Boolean(valid||(r.hasImage||r.imageFileId)&&r.mode==='minutes'&&Number(r.value)>0)};}
  const keys=new Set(exercisePhotoKeys(r)),walking=keys.has('walk'),other=[...keys].filter(k=>k!=='walk').length;
  const valid=walking&&Number.isInteger(r.value)&&r.value!>=0&&r.value!<=100000;
  const steps=valid?(r.value!>=7500?2:r.value!>=5000?1:0):0;
  return {stars:Math.min(2,Math.max(steps,other,walking&&other?2:0)),done:keys.size>0};
}
export function exerciseSummary(r:ExerciseRecord){
  if(r.exerciseVersion!==2)return `${r.value?.toLocaleString('zh-TW')??'未填寫'} ${r.mode==='steps'?'步':'分鐘'}`;
  return (r.activities||[]).map(a=>a.id==='walk'?`步行／健走：${r.value==null?'未填步數':r.value.toLocaleString('zh-TW')+' 步'}`:`${activityLabel(a)}${a.duration?'・'+a.duration:''}`).join('；');
}
