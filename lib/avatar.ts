export const AVATARS = [
  {id:'sail',name:'小帆船',symbol:'⛵',color:'#def2ef'},
  {id:'sun',name:'小太陽',symbol:'☀',color:'#fff0c3'},
  {id:'flower',name:'小花朵',symbol:'✿',color:'#ffe3ed'},
  {id:'star',name:'小星星',symbol:'★',color:'#e9e3ff'},
  {id:'tree',name:'小樹苗',symbol:'♧',color:'#dff1d4'},
  {id:'anchor',name:'小船錨',symbol:'⚓',color:'#dcecff'},
] as const;
export const MAX_AVATAR_LENGTH=16000;
export function validAvatar(value:unknown):value is string {
  return typeof value==='string' && (AVATARS.some(a=>a.id===value) || (value.length<=MAX_AVATAR_LENGTH && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value)));
}
export function avatarValue(value:unknown):string {return validAvatar(value)?value:'sail';}
