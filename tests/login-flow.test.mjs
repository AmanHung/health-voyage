import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['production/login-flow.ts'],bundle:true,write:false,platform:'node',format:'cjs'});
const module={exports:{}};new Function('module','exports',built.outputFiles[0].text)(module,module.exports);
const {loginFlow}=module.exports;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const identity={provider:'line',token:'synthetic'};
test('automatic login and repeated taps share one bootstrap; ready only after both data and UI load',async()=>{
  const line=deferred(),data=deferred(),app=deferred();let reads=0,ready=0;const busy=[];
  const flow=loginFlow({line:()=>line.promise,bootstrap:()=>{reads++;return data.promise;},load:()=>app.promise,stage:()=>{},error:assert.fail,busy:v=>busy.push(v),ready:()=>ready++});
  const first=flow.start();await flow.start(true);line.resolve(identity);await Promise.resolve();
  assert.equal(reads,1);data.resolve({role:'patient'});await Promise.resolve();assert.equal(ready,0);
  app.resolve('app');await first;assert.equal(ready,1);assert.deepEqual(busy,[true,false]);
});
test('cancel aborts old request and a late response cannot overwrite a newer account',async()=>{
  const old=deferred();let signal;const seen=[];
  const flow=loginFlow({line:async()=>identity,bootstrap:(auth,s)=>{if(auth.token==='old'){signal=s;return old.promise;}return Promise.resolve({role:'patient'});},load:async()=>'app',stage:()=>{},error:assert.fail,busy:()=>{},ready:auth=>seen.push(auth.token)});
  const first=flow.start(false,{...identity,token:'old'});flow.cancel();assert.equal(signal.aborted,true);
  await flow.start(false,{...identity,token:'new'});old.resolve({role:'patient'});await first;assert.deepEqual(seen,['new']);
});
test('failed login releases the lock and allows a successful retry',async()=>{
  let attempts=0,errors=0,ready=0;
  const flow=loginFlow({line:async()=>identity,bootstrap:async()=>{if(!attempts++)throw Error('offline');return {role:'patient'};},load:async()=>'app',stage:()=>{},error:()=>errors++,busy:()=>{},ready:()=>ready++});
  await flow.start();await flow.start(true);assert.equal(errors,1);assert.equal(ready,1);
});
