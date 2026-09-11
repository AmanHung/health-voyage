import type {DoseReport} from '../lib/medication';
import {config} from './config';
export type Auth = {provider:'line'|'google';token:string};
import type {ActivityGoal} from '../lib/activity-goal';
export type Profile = {id:string;nickname:string;participating:boolean;isTest:boolean;active:boolean;activityGoals?:ActivityGoal[]};
export type AdminPatient = Profile&{name:string;bound:boolean;deletedAt?:string|null;stateVersion?:string|null};
import type {MealInterview} from '../lib/meal-interview';
export type RecordItem = {id:string;patientId:string;date:string;kind:'exercise'|'meal'|'medicine';createdAt:string;hasImage:boolean;previousId?:string|null;deletedAt?:string|null;mode?:'steps'|'minutes';value?:number;activity?:string;recognized?:number|null;period?:string;groups?:string[];eaten?:string;drink?:string;restrictedDiet?:boolean;mealDetails?:MealInterview;feedback?:string;status?:string;medicationDoses?:DoseReport[];medicationComplete?:boolean;medicationExpected?:number;medicationNoScheduled?:boolean};
export type Bootstrap = {role:'admin'|'patient'|'pharmacist';today:string;bound?:boolean;profile?:Profile;records?:RecordItem[];email?:string;patients?:{id:string;name:string}[]};
// Cross-origin simple POST: don't use no-cors/JSONP or put credentials in a URL.
// A blocked response is a failure, never interpreted as a successful write.
export async function api<T>(auth:Auth,action:string,payload:unknown={}):Promise<T> {
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),45000);
  try {
    const response=await fetch(config.apiUrl,{method:'POST',redirect:'follow',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({auth,action,payload}),signal:abort.signal});
    if(!response.ok)throw new Error('服務暫時無法使用，請稍後再試。');
    const result=await response.json();
    if(!result.ok)throw new Error(result.error||'儲存失敗，請再試一次。');
    return result.data;
  } catch(error) {
    if(error instanceof TypeError || (error as Error).name==='AbortError')throw new Error('未能確認儲存結果，請保留畫面並重試。');
    throw error;
  } finally {clearTimeout(timer);}
}
