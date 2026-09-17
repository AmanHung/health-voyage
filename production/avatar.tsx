import {AVATARS,avatarValue,MAX_AVATAR_LENGTH} from '../lib/avatar';
import {dimensions,resized,MAX_SOURCE_BYTES} from './images';
import './avatar.css';
export function Avatar({value,label='頭像'}:{value?:string;label?:string}) {
  const safe=avatarValue(value),preset=AVATARS.find(a=>a.id===safe);
  return preset?<span className="person-avatar" role="img" aria-label={`${label}：${preset.name}`} style={{background:preset.color}}>{preset.symbol}</span>:<img className="person-avatar" src={safe} alt={label}/>;
}
export function AvatarPicker({value,onChange,disabled=false,onFile}:{value:string;onChange:(v:string)=>void;disabled?:boolean;onFile:(file:File)=>void}) {
  return <fieldset className="avatar-picker" disabled={disabled}><legend>排行榜頭像</legend><div className="avatar-preview"><Avatar value={value} label="目前選擇的頭像"/><span>選一個喜歡的圖案，或上傳自己的照片。</span></div><div className="avatar-options">{AVATARS.map(a=><button key={a.id} type="button" aria-pressed={value===a.id} onClick={()=>onChange(a.id)}><Avatar value={a.id}/><span>{a.name}</span></button>)}</div><label className="avatar-upload">上傳或更換大頭照（JPG／PNG）<input type="file" accept="image/jpeg,image/png" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)onFile(file);}}/></label><p>照片會置中裁成正方形，儲存前請確認預覽。頭像會與暱稱、當月步數一起顯示給已登入的排行榜使用者。改選預設圖案並儲存，即可移除大頭照。</p></fieldset>;
}
export async function prepareAvatar(file:File):Promise<string> {
  if(!file.size||file.size>MAX_SOURCE_BYTES)throw new Error('請選擇 20 MB 以下的 JPG 或 PNG 照片。');
  const size=dimensions(new Uint8Array(await file.slice(0,1024*1024).arrayBuffer()));resized(size.width,size.height,128);
  const image=await createImageBitmap(file,{imageOrientation:'from-image'});
  try {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('無法處理照片，請重新選取。');
    const edge=Math.min(image.width,image.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,128,128);ctx.drawImage(image,(image.width-edge)/2,(image.height-edge)/2,edge,edge,0,0,128,128);
    for(const quality of [.85,.7,.5,.3]) {const result=canvas.toDataURL('image/jpeg',quality);if(result.length<=MAX_AVATAR_LENGTH)return result;}
    throw new Error('照片壓縮後仍太大，請選另一張照片。');
  } finally {image.close();}
}
