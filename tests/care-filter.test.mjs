import test from 'node:test';import assert from 'node:assert/strict';
import {matchesCareFilters} from '../lib/care-filter.ts';
const p={recordCounts:{medicine:2,exercise:1,meal:4},unseenCounts:{medicine:1,exercise:0,meal:0}};
test('category and new filters must match the same record category',()=>{
 assert.equal(matchesCareFilters(p,true,['meal']),false);
 assert.equal(matchesCareFilters(p,false,['meal']),true);
 assert.equal(matchesCareFilters(p,true,['medicine']),true);
 assert.equal(matchesCareFilters({...p,unseenCounts:{meal:2}},true,['meal']),true);
});
test('multiple categories match any selected category; no selection means all categories',()=>{
 assert.equal(matchesCareFilters(p,true,['meal','medicine']),true);
 assert.equal(matchesCareFilters(p,true,['meal','exercise']),false);
 assert.equal(matchesCareFilters(p,true,[]),true);
 assert.equal(matchesCareFilters({},false,[]),true);
 assert.equal(matchesCareFilters({},true,[]),false);
 assert.equal(matchesCareFilters({},false,['meal']),false);
});
