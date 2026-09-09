import test from 'node:test';
import assert from 'node:assert/strict';
import {startExerciseReading} from '../production/exercise-reader.ts';
const image={dataUrl:'data:image/jpeg;base64,example',preview:'blob:example',bytes:140000,width:900,height:1920};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('deadline also covers a stalled dynamic import before any worker exists',async()=>{
  const job=startExerciseReading(image,'/health-voyage/',()=>{}, {timeoutMs:5,load:()=>new Promise(()=>{})});
  assert.deepEqual(await job.result,{status:'timeout',steps:null});
});
test('stalled initialization releases the caller and terminates a worker arriving late',async()=>{
  const pending=deferred();let terminated=0,recognized=0;
  const job=startExerciseReading(image,'/health-voyage/',()=>{}, {timeoutMs:5,load:async()=>({createWorker:()=>pending.promise,recognizeExercise:async()=>{recognized++;return {steps:1234};}})});
  assert.equal((await job.result).status,'timeout');
  pending.resolve({terminate:async()=>{terminated++;}});await flush();
  assert.equal(terminated,1);assert.equal(recognized,0);
});
test('timeout during recognition is not blocked by worker cleanup that never resolves',async()=>{
  const worker={terminate:()=>new Promise(()=>{})};
  const job=startExerciseReading(image,'/health-voyage/',()=>{}, {timeoutMs:5,load:async()=>({createWorker:async()=>worker,recognizeExercise:()=>new Promise(()=>{})})});
  assert.deepEqual(await job.result,{status:'timeout',steps:null});
});
test('manual cancellation ignores late recognition and suppresses late progress updates',async()=>{
  const pending=deferred();let logger,terminated=0;const messages=[];
  const job=startExerciseReading(image,'/health-voyage/',text=>messages.push(text), {timeoutMs:1000,load:async()=>({createWorker:async(_langs,_mode,options)=>{logger=options.logger;return {terminate:async()=>{terminated++;}};},recognizeExercise:()=>pending.promise})});
  await flush();job.cancel();assert.deepEqual(await job.result,{status:'cancelled',steps:null});
  pending.resolve({steps:9999});logger({status:'recognizing text',progress:1});await flush();
  assert.equal(messages.length,0);assert.equal(terminated,1);assert.equal((await job.result).steps,null);
});
test('worker errors return a manual fallback and success preserves only recognized steps',async()=>{
  const failed=startExerciseReading(image,'/health-voyage/',()=>{}, {load:async()=>{throw new Error('Unavailable');}});
  assert.deepEqual(await failed.result,{status:'unreadable',steps:null});
  let workerOptions,terminated=0;
  const successful=startExerciseReading(image,'/health-voyage/',()=>{}, {load:async()=>({createWorker:async(_langs,_mode,options)=>{workerOptions=options;return {terminate:async()=>{terminated++;}};},recognizeExercise:async()=>({steps:8685})})});
  assert.deepEqual(await successful.result,{status:'recognized',steps:8685});assert.equal(terminated,1);
  assert.equal(workerOptions.workerPath,'/health-voyage/ocr/worker.min.js');assert.equal(workerOptions.langPath,'/health-voyage/ocr/lang');
});
test('closing before engine initialization prevents starting an unnecessary worker',async()=>{
  const pending=deferred();let created=0;
  const job=startExerciseReading(image,'/',()=>{}, {load:()=>pending.promise});job.cancel();
  pending.resolve({createWorker:async()=>{created++;},recognizeExercise:async()=>({steps:0})});await flush();
  assert.equal((await job.result).status,'cancelled');assert.equal(created,0);
});
