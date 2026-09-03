export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 48_000_000;
export function dimensions(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71) return {width:view.getUint32(16),height:view.getUint32(20)};
  if (bytes[0]===255 && bytes[1]===216) {
    let p=2;
    while(p+8<bytes.length) {
      if(bytes[p]!==255)break;
      const marker=bytes[p+1],length=view.getUint16(p+2);
      if([192,193,194].includes(marker))return {height:view.getUint16(p+5),width:view.getUint16(p+7)};
      if(length<2)break;p+=length+2;
    }
  }
  throw new Error('請選擇 JPG 或 PNG 照片；HEIC 請先轉成 JPG。');
}
export function resized(width:number,height:number,longEdge:number) {
  if(width<1||height<1||width*height>MAX_SOURCE_PIXELS)throw new Error('照片尺寸太大，請重新拍攝。');
  const ratio=Math.min(1,longEdge/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
export type PreparedImage = {dataUrl:string;preview:string;bytes:number;width:number;height:number};
export async function prepareImage(file:File,kind:'exercise'|'meal'):Promise<PreparedImage> {
  if(!file.size||file.size>MAX_SOURCE_BYTES)throw new Error('照片需小於 20 MB，請重新拍攝。');
  const head=new Uint8Array(await file.slice(0,1024*1024).arrayBuffer());
  const source=dimensions(head);resized(source.width,source.height,1920);
  const image=await createImageBitmap(file,{imageOrientation:'from-image'});
  try {
    const size=resized(image.width,image.height,kind==='exercise'?1920:1280);
    const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('手機無法處理圖片，請換一張照片。');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    let blob:Blob|null=null;
    for(const quality of [0.88,0.78,0.68,0.58]) {
      blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
      if(blob && blob.size<=(kind==='exercise'?750000:350000))break;
    }
    if(!blob||blob.size>800000)throw new Error('照片仍太大，請重新拍攝較簡單的畫面。');
    const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('照片讀取失敗。'));reader.readAsDataURL(blob!);});
    return {dataUrl,preview:URL.createObjectURL(blob),bytes:blob.size,...size};
  } finally {image.close();}
}
