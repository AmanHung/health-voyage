import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dimensions,resized,prepareImage} from '../production/images.ts';
import {dayTasks} from '../lib/task-calendar.ts';
test('image dimensions checked before decode; oversized pixels rejected',()=>{
  const png=new Uint8Array(24);png.set([137,80,78,71]);new DataView(png.buffer).setUint32(16,4000);new DataView(png.buffer).setUint32(20,3000);
  assert.deepEqual(dimensions(png),{width:4000,height:3000});assert.deepEqual(resized(4000,3000,1280),{width:1280,height:960});
  assert.throws(()=>resized(30000,30000,1280));assert.throws(()=>dimensions(new Uint8Array(30)));
  assert.deepEqual(resized(600,800,1920),{width:600,height:800});
});
test('live calendar includes saved medication on earlier days',()=>{
  const input={today:'2026-09-03',exerciseDates:['2026-09-02'],mealDates:['2026-09-02'],medicineDates:['2026-09-02'],medicineDone:false,exerciseReady:true,mealReady:true,medicineReady:true,live:true};
  assert.equal(dayTasks('2026-09-02',input).complete,true);
  assert.equal(dayTasks('2026-09-04',input).complete,false);
});
test('meal correction can replace a photo and restarts confirmation',()=>{
  const source=readFileSync('production/main.tsx','utf8');
  assert.match(source,/type="button" variant="outline" onClick=\{\(\)=>fileInput\.current\?\.click\(\)\}/);
  assert.match(source,/e\.currentTarget\.value=''/);
  assert.match(source,/setMeal\(emptyMealInterview\(\)\);setMealReady\(false\)/);
  assert.match(source,/key=\{prepared\?\.preview\|\|record\?\.id\|\|'new-meal'\}/);
  assert.match(source,/開啟測試個案/);
});

test('a stalled phone image decoder times out and frees late image resources',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const png=new Uint8Array(24);png.set([137,80,78,71]);new DataView(png.buffer).setUint32(16,100);new DataView(png.buffer).setUint32(20,100);
  let resolveBitmap,closed=0;
  const original=globalThis.createImageBitmap;
  globalThis.createImageBitmap=()=>new Promise(resolve=>{resolveBitmap=resolve;});
  t.after(()=>{if(original)globalThis.createImageBitmap=original;else delete globalThis.createImageBitmap;});
  const pending=prepareImage(new File([png],'test.png',{type:'image/png'}),'exercise');
  const rejected=assert.rejects(pending,/圖片處理時間較久/);
  await new Promise(resolve=>setImmediate(resolve));t.mock.timers.tick(20000);await rejected;
  // There is no DOM in this test. Even the later canvas failure must close the bitmap.
  resolveBitmap({width:100,height:100,close(){closed++;}});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(closed,1);
});
