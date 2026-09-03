import test from 'node:test';
import assert from 'node:assert/strict';
import {monthDates,dayTasks} from '../lib/task-calendar.ts';
const base = {today:'2026-09-02',exerciseDates:['2026-09-02'],mealDates:['2026-09-01','2026-09-02'],exerciseReady:true,mealReady:true,medicineDone:true};
test('calendar uses actual month length and weekday alignment, including leap years',()=>{
  assert.equal(monthDates(base.today).offset,2);
  assert.equal(monthDates(base.today).dates.length,30);
  assert.equal(monthDates('2024-02-29').dates.length,29);
  assert.equal(monthDates('2026-02-02').dates.length,28);
});
test('stars require all three real reports, and revisions cannot add stars',()=>{
  assert.equal(dayTasks(base.today,base).complete,true);
  assert.equal(dayTasks(base.today,{...base,exerciseDates:[base.today,base.today]}).count,3);
  assert.equal(dayTasks(base.today,{...base,medicineDone:false}).complete,false);
});
test('past medicine, unavailable storage and future days are not fabricated as completed or zero intake',()=>{
  assert.deepEqual(dayTasks('2026-09-01',base).statuses,['missing','done','unavailable']);
  assert.deepEqual(dayTasks('2026-09-03',base).statuses,['future','future','future']);
  assert.equal(dayTasks(base.today,{...base,mealReady:false}).statuses[1],'unavailable');
  assert.equal(dayTasks(base.today,{...base,mealReady:false}).complete,false);
});
