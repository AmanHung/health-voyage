import test from 'node:test';
import assert from 'node:assert/strict';
import {dimensions,resized} from '../production/images.ts';
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
