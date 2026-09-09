import test from 'node:test';
import assert from 'node:assert/strict';
import {activityProgress,goalOnDate} from '../lib/activity-goal.ts';
const goal=(id,date,steps)=>({id,effectiveFrom:date,steps});
const record=(date,value,createdAt='1',mode='steps')=>({date,value,createdAt,mode,kind:'exercise'});
test('no default target, missing data and an actual zero remain distinct',()=>{
  const noGoal=activityProgress([record('2026-09-09',5000)],[],'2026-09-09');
  assert.equal(noGoal.current,null);assert.equal(noGoal.today.achieved,false);
  const history=[goal('a','2026-09-09',3000)];
  assert.equal(activityProgress([],history,'2026-09-09').today.steps,null);
  const zero=activityProgress([record('2026-09-09',0)],history,'2026-09-09');
  assert.equal(zero.today.steps,0);assert.equal(zero.today.recorded,true);assert.equal(zero.today.achieved,false);
});
test('targets use their effective date, later changes do not rewrite past days',()=>{
  const history=[goal('a','2026-09-07',3000),goal('b','2026-09-09',5000),goal('c','2026-09-10',4000)];
  const p=activityProgress([record('2026-09-07',3000),record('2026-09-08',3000),record('2026-09-09',4000)],history,'2026-09-09');
  assert.equal(p.achievedDays,2);assert.equal(p.today.achieved,false);assert.equal(p.today.percent,80);assert.equal(p.upcoming.id,'c');
  assert.equal(goalOnDate(history,'2026-09-06'),null);
});
test('revisions replace daily progress, never sum or reward repeatedly; latest metric is respected',()=>{
  const history=[goal('a','2026-09-07',3000)];
  const p=activityProgress([record('2026-09-09',6000,'1'),record('2026-09-09',2000,'2')],history,'2026-09-09');
  assert.equal(p.today.steps,2000);assert.equal(p.achievedDays,0);
  assert.equal(activityProgress([record('2026-09-09',6000,'1'),record('2026-09-09',30,'2','minutes')],history,'2026-09-09').today.steps,null);
  const met=activityProgress([record('2026-09-09',9000)],history,'2026-09-09');assert.equal(met.today.percent,100);assert.equal(met.achievedDays,1);
});
test('pauses, future records, invalid targets and invalid metrics cannot earn goal days',()=>{
  const history=[goal('a','2026-09-07',3000),goal('b','2026-09-08',null)];
  const p=activityProgress([record('2026-09-07',3000),record('2026-09-08',5000),record('2026-09-10',9999)],history,'2026-09-09');
  assert.equal(p.achievedDays,1);assert.equal(p.current.steps,null);assert.equal(p.week[3].achieved,false);
  for(const value of [-1,1.5,Infinity,100001])assert.equal(activityProgress([record('2026-09-09',value)],[goal('a','2026-09-01',1)],'2026-09-09').today.steps,null);
  assert.equal(goalOnDate([goal('a','2026-02-31',3000),goal('b','2026-09-01',0)],'2026-09-09'),null);
});
test('same-date revisions use the last saved goal and week boundary uses Taiwan day supplied by server',()=>{
  const p=activityProgress([record('2026-09-07',3500)],[goal('a','2026-09-07',3000),goal('b','2026-09-07',4000)],'2026-09-07');
  assert.equal(p.today.achieved,false);assert.equal(p.week[0].date,'2026-09-07');assert.equal(p.week.at(-1).date,'2026-09-13');
  assert.throws(()=>activityProgress([],[],'2026-02-31'));
});
