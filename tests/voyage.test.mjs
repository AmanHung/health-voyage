import test from 'node:test';
import assert from 'node:assert/strict';
import {voyageProgress} from '../lib/voyage.ts';
const record=(date,kind='exercise',extra={})=>({date,kind,...extra});

test('new participant has no invented progress or rewards',()=>{
  const p=voyageProgress([],'2026-09-09');
  assert.equal(p.totalDays,0);assert.equal(p.todayCount,0);assert.equal(p.weeklyDays,0);
  assert.equal(p.currentPort,null);assert.equal(p.nextPort.name,'啟程港');
  assert.ok(p.badges.every(b=>!b.earned));
});
test('three tasks and unsorted revisions count one day, one task of each kind',()=>{
  const p=voyageProgress([
    record('2026-09-09','exercise',{createdAt:'2026-09-09T02:00:00Z'}),
    record('2026-09-09','exercise',{createdAt:'2026-09-09T01:00:00Z'}),
    record('2026-09-09','meal'),record('2026-09-09','medicine'),
  ],'2026-09-09');
  assert.equal(p.totalDays,1);assert.equal(p.weeklyDays,1);assert.equal(p.todayCount,3);
  assert.equal(p.latest.find(r=>r.kind==='exercise').createdAt,'2026-09-09T02:00:00Z');
  assert.equal(p.badges.find(b=>b.id==='exercise').value,1);
});
test('honest missed or uncertain medicine reports earn participation, not adherence',()=>{
  for(const status of ['未服用','有疑問','今日無需服藥','已服用']){
    const p=voyageProgress([record('2026-09-09','medicine',{status})],'2026-09-09');
    assert.equal(p.totalDays,1);assert.equal(p.todayCount,1);
    assert.equal(p.badges.find(b=>b.id==='medicine').value,1);
    assert.equal('adherence' in p,false);
  }
});
test('Taiwan server day anchors a Monday week across month and year boundaries',()=>{
  const p=voyageProgress([record('2025-12-28'),record('2025-12-29'),record('2026-01-01')],'2026-01-01');
  assert.equal(p.week[0].date,'2025-12-29');assert.equal(p.week[6].date,'2026-01-04');
  assert.equal(p.weeklyDays,2);assert.equal(p.totalDays,3);
  assert.equal(p.week.filter(d=>d.future).length,3);
});
test('weekly reset and breaks retain all lifetime milestones',()=>{
  const rows=Array.from({length:7},(_,i)=>record(`2026-08-${String(i+1).padStart(2,'0')}`));
  const p=voyageProgress(rows,'2026-09-09');
  assert.equal(p.totalDays,7);assert.equal(p.weeklyDays,0);
  assert.equal(p.currentPort.name,'活力島');assert.equal(p.nextPort.name,'好習慣灣');
  assert.equal(p.badges.find(b=>b.id==='week').earned,true);
});
test('future records, invalid dates and unknown kinds cannot earn rewards',()=>{
  const p=voyageProgress([record('2026-09-10'),record('2026-02-30'),record('invalid'),record('2026-09-09','unknown')],'2026-09-09');
  assert.equal(p.totalDays,0);assert.throws(()=>voyageProgress([],'2026-02-30'));
});
test('weekly participation can exceed five without inventing another port or losing progress',()=>{
  const rows=Array.from({length:30},(_,i)=>record(`2026-08-${String(i+1).padStart(2,'0')}`));
  const p=voyageProgress(rows,'2026-08-30');
  assert.equal(p.weeklyDays,7);assert.equal(p.totalDays,30);assert.equal(p.nextPort,null);
  assert.equal(p.currentPort.name,'好習慣灣');assert.equal(p.badges.find(b=>b.id==='month').earned,true);
});
