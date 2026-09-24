export const islands=[{name:'啟航燈塔島',goal:1,detail:'沿著晨光，留下第一枚足跡'},{name:'椰風花園島',goal:30,detail:'椰影、白沙與盛開的海岸花園'},{name:'珊瑚琉璃島',goal:50,detail:'透亮潟湖，遇見繽紛的珊瑚海'},{name:'翡翠瀑布島',goal:100,detail:'走進山林，聽見層層瀑布的回響'},{name:'極光秘境島',goal:200,detail:'繁花與星光，收藏最美的海上秘境'}];
export function shellProgress(records,checkins,today){
 const latest=new Map();
 for(const r of records){if(!r.date||r.date>today)continue;const key=r.date+':'+r.kind;const old=latest.get(key);if(!old||String(r.createdAt)>=String(old.createdAt))latest.set(key,r);}
 const dates=new Set([...latest.values()].map(r=>r.date));for(const d of checkins)if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=today)dates.add(d);
 const entries=[...dates].sort().map(date=>{const get=kind=>{const r=latest.get(date+':'+kind);return r&&!r.deletedAt?r:null;};const exercise=get('exercise'),meal=get('meal'),medicine=get('medicine');
 const stepValid=exercise?.hasImage&&exercise.mode==='steps'&&Number.isInteger(exercise.value)&&exercise.value>=0&&exercise.value<=100000;
 const exerciseDone=Boolean(exercise?.hasImage&&(stepValid||exercise.mode==='minutes'&&exercise.value>0));
 const mealDone=Boolean(meal?.hasImage);const medicineDone=Boolean(medicine&&medicine.medicationComplete!==false&&(medicine.medicationComplete===true||medicine.status));
 const parts={checkin:checkins.includes(date)?1:0,meal:mealDone?1:0,steps:stepValid?(exercise.value>=7500?2:exercise.value>=5000?1:0):0,medicine:medicineDone?1:0,tasks:exerciseDone&&mealDone&&medicineDone?1:0};return{date,...parts,taskCount:Number(exerciseDone)+Number(mealDone)+Number(medicineDone),exerciseDone,mealDone,medicineDone,total:Object.values(parts).reduce((a,b)=>a+b,0)};});
 const total=entries.reduce((n,e)=>n+e.total,0);return{total,entries,current:[...islands].reverse().find(i=>total>=i.goal),next:islands.find(i=>total<i.goal)};
}
