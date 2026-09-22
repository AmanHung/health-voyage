import {config} from './config';
import type {Auth} from './api';
import {deadline} from './deadline';
type Liff = {init:(options:{liffId:string})=>Promise<void>;isLoggedIn:()=>boolean;login:(options?:{redirectUri:string})=>void;logout:()=>void;getIDToken:()=>string|null;isInClient:()=>boolean};
type GoogleIdentity = {accounts:{id:{initialize:(options:{client_id:string;callback:(response:{credential:string})=>void})=>void;renderButton:(element:HTMLElement,options:Record<string,unknown>)=>void;disableAutoSelect:()=>void}}};
declare global {interface Window {liff?:Liff;google?:GoogleIdentity}}
const loaders=new Map<string,Promise<void>>();
function script(url:string){
  if(loaders.has(url))return loaders.get(url)!;
  let node:HTMLScriptElement;
  const loading=new Promise<void>((resolve,reject)=>{node=document.createElement('script');node.src=url;node.async=true;node.referrerPolicy='no-referrer';node.onload=()=>resolve();node.onerror=()=>reject(new Error('登入服務載入失敗，請檢查網路後重試。'));document.head.append(node);});
  const promise=deadline(loading,15000,'登入服務載入逾時，請檢查網路後重試。').catch(error=>{loaders.delete(url);node.onload=null;node.onerror=null;node.remove();throw error;});
  loaders.set(url,promise);return promise;
}
let liffReady:Promise<void>|null=null;
export async function lineAuth(startLogin=false,signal?:AbortSignal):Promise<Auth|null>{
  await script('https://static.line-scdn.net/liff/edge/2/sdk.js');
  if(!window.liff)throw new Error('LINE 登入服務未能啟動，請重新載入。');
  // Keep a timed-out initialization rejected: starting a second init while the
  // first is unresolved can corrupt LIFF redirect state. A reload resets it.
  if(!liffReady)liffReady=deadline(window.liff.init({liffId:config.liffId}),15000,'LINE 連線逾時，請按「重新載入」再試。');
  await liffReady;
  if(signal?.aborted)return null;
  // An explicit retry in a desktop/external browser must obtain a fresh token.
  // LIFF may still report logged-in while its ID token has expired.
  if(startLogin && !window.liff!.isInClient()){
    if(window.liff!.isLoggedIn())window.liff!.logout();
    window.liff!.login({redirectUri:location.origin+import.meta.env.BASE_URL});
    return null;
  }
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
