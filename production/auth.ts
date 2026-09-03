import {config} from './config';
import type {Auth} from './api';
type Liff = {init:(options:{liffId:string})=>Promise<void>;isLoggedIn:()=>boolean;login:(options?:{redirectUri:string})=>void;logout:()=>void;getIDToken:()=>string|null;isInClient:()=>boolean};
type GoogleIdentity = {accounts:{id:{initialize:(options:{client_id:string;callback:(response:{credential:string})=>void})=>void;renderButton:(element:HTMLElement,options:Record<string,unknown>)=>void;disableAutoSelect:()=>void}}};
declare global {interface Window {liff?:Liff;google?:GoogleIdentity}}
const loaders=new Map<string,Promise<void>>();
function script(url:string){
  if(loaders.has(url))return loaders.get(url)!;
  const promise=new Promise<void>((resolve,reject)=>{const node=document.createElement('script');node.src=url;node.async=true;node.referrerPolicy='no-referrer';node.onload=()=>resolve();node.onerror=()=>{loaders.delete(url);node.remove();reject(new Error('登入服務載入失敗，請檢查網路。'));};document.head.append(node);});loaders.set(url,promise);return promise;
}
let liffReady:Promise<void>|null=null;
export async function lineAuth(startLogin=false):Promise<Auth|null>{
  await script('https://static.line-scdn.net/liff/edge/2/sdk.js');
  if(!liffReady)liffReady=window.liff!.init({liffId:config.liffId}).catch(error=>{liffReady=null;throw error;});
  await liffReady;
  if(!window.liff!.isLoggedIn()){if(startLogin)window.liff!.login({redirectUri:location.origin+import.meta.env.BASE_URL});return null;}
  const token=window.liff!.getIDToken();if(!token)throw new Error('請允許 LINE 登入權限後再試。');
  return {provider:'line',token};
}
export async function googleButton(element:HTMLElement,callback:(auth:Auth)=>void){
  await script('https://accounts.google.com/gsi/client');
  window.google!.accounts.id.initialize({client_id:config.googleClientId,callback:r=>callback({provider:'google',token:r.credential})});
  window.google!.accounts.id.renderButton(element,{type:'standard',theme:'outline',size:'large',text:'signin_with',locale:'zh_TW'});
}
export function signOut(){if(window.liff?.isLoggedIn())window.liff.logout();window.google?.accounts.id.disableAutoSelect();}
