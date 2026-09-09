import type {PreparedImage} from './images';
import type {createWorker as CreateWorker} from 'tesseract.js';
import type {recognizeExercise as RecognizeExercise} from '../lib/exercise-ocr';

type Engine={createWorker:typeof CreateWorker;recognizeExercise:typeof RecognizeExercise};
type Result={status:'recognized'|'unreadable'|'timeout'|'cancelled';steps:number|null};
export const EXERCISE_READING_TIMEOUT=45000;
async function loadEngine():Promise<Engine> {
  const [worker,recognition]=await Promise.all([import('tesseract.js'),import('../lib/exercise-ocr')]);
  return {createWorker:worker.createWorker,recognizeExercise:recognition.recognizeExercise};
}
// Deadline includes module loading, worker initialization and both recognition
// passes. Cleanup never blocks the form; late workers are terminated on arrival.
export function startExerciseReading(image:PreparedImage,base:string,onProgress:(text:string)=>void,options:{timeoutMs?:number;load?:()=>Promise<Engine>}={}) {
  let active=true;
  const workers=new Set<Awaited<ReturnType<typeof CreateWorker>>>();
  let resolve!:(result:Result)=>void;
  const result=new Promise<Result>(done=>{resolve=done;});
  const terminate=(worker:Awaited<ReturnType<typeof CreateWorker>>)=>{try{void worker.terminate().catch(()=>{});}catch{/* Already released. */}};
  function finish(status:Result['status'],steps:number|null=null) {
    if(!active)return;active=false;clearTimeout(timer);
    resolve({status,steps});workers.forEach(terminate);workers.clear();
  }
  const timer=setTimeout(()=>finish('timeout'),options.timeoutMs??EXERCISE_READING_TIMEOUT);
  void (async()=>{
    try {
      const {createWorker,recognizeExercise}=await (options.load||loadEngine)();
      if(!active)return;
      const create=async(languages:string)=>{
        if(!active)throw new Error('Cancelled');
        const worker=await createWorker(languages,1,{
          workerPath:base+'ocr/worker.min.js',corePath:base+'ocr/core',langPath:base+'ocr/lang',gzip:true,
          logger:({status,progress})=>{
            if(!active)return;
            if(status==='recognizing text')onProgress(`正在辨識步數（${Math.round(Math.max(0,Math.min(1,progress))*100)}％）…`);
            else if(status==='loading language traineddata')onProgress('正在載入辨識資料，首次使用可能較久…');
            else onProgress('正在啟動步數辨識…');
          },
        });
        if(!active){terminate(worker);throw new Error('Cancelled');}
        workers.add(worker);return worker;
      };
      const recognized=await recognizeExercise(await create('eng+chi_tra'),image.dataUrl,image,()=>create('eng'),()=>active);
      finish(recognized.steps===null?'unreadable':'recognized',recognized.steps);
    }catch{finish('unreadable');}
  })();
  return {result,cancel:()=>finish('cancelled')};
}
