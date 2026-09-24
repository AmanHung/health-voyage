import assert from 'node:assert/strict';
import {shellProgress,islands} from '../production/shell-rules.mjs';
const today='2026-09-23';
const row=(kind,value=0,extra={})=>({kind,date:today,createdAt:today+'T08:00:00Z',hasImage:true,mode:'steps',value,...extra});
for(const [steps,expected] of [[4999,0],[5000,1],[7499,1],[7500,2],[100000,2],[100001,0],[-1,0],[7500.5,0]])assert.equal(shellProgress([row('exercise',steps)],[],today).total,expected);
const all=[row('exercise',7500),row('meal'),row('medicine',0,{status:'未服用',medicationComplete:true})];
assert.equal(shellProgress(all,[today,today],today).total,6);
assert.equal(shellProgress([...all,...all],[today],today).total,6);
assert.equal(shellProgress([...all,row('exercise',3200,{createdAt:today+'T09:00:00Z'})],[today],today).total,4);
assert.equal(shellProgress([row('exercise',7500,{hasImage:false})],[],today).total,0);
assert.equal(shellProgress([row('medicine',0,{status:'有疑問',medicationComplete:false})],[],today).total,0);
assert.equal(shellProgress([row('medicine',0,{status:'有疑問'})],[],today).total,1);
assert.equal(shellProgress([...all,row('meal',0,{deletedAt:'deleted',createdAt:today+'T09:00:00Z'})],[today],today).total,4);
assert.equal(shellProgress([row('meal',0,{date:'2026-09-24'})],['2026-09-24'],today).total,0);
for(const goal of [1,30,50,100,200]){const checks=Array.from({length:goal},(_,i)=>new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10));const p=shellProgress([],checks,today);assert.equal(p.current.goal,goal);assert.equal(p.total,goal);}
assert.deepEqual(islands.map(i=>i.goal),[1,30,50,100,200]);
console.log('PASS: step boundaries, daily cap, deduplication, revisions/deletions, photo requirements, medication reporting, future exclusion, five island thresholds');
