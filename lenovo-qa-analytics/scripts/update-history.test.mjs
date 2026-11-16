import test from 'node:test';
import assert from 'node:assert/strict';
import {updateHistory} from './update-history.mjs';
const report=(capturedAt='2026-11-16T09:00:00Z',count=2)=>({capturedAt,entries:[{name:'QA Example',project:'EPM',counts:{qa:count,review:1,inProgress:0,toDo:0,done:0,closed:5},tickets:[{key:'EPM-1',summary:'secret'}]}]});
test('stores only aggregate counts and no tickets',()=>{const h=updateHistory(null,report());assert.equal(h.snapshots.length,1);assert.equal(h.snapshots[0].entries[0].counts.qa,2);assert.equal(JSON.stringify(h).includes('secret'),false);assert.equal(JSON.stringify(h).includes('tickets'),false)});
test('appends chronological snapshots and deduplicates exact timestamp',()=>{let h=updateHistory(null,report());h=updateHistory(h,report('2026-11-16T15:00:00Z',3));h=updateHistory(h,report());assert.equal(h.snapshots.length,2);assert.deepEqual(h.snapshots.map(x=>x.entries[0].counts.qa),[2,3])});
test('rejects conflicting timestamp',()=>{const h=updateHistory(null,report());assert.throws(()=>updateHistory(h,report('2026-11-16T09:00:00Z',3)),/Conflicting/)});
test('keeps only last 90 days',()=>{const h=updateHistory(null,report('2026-08-01T09:00:00Z'));const next=updateHistory(h,report('2026-11-16T09:00:00Z'));assert.equal(next.snapshots.length,1)});
test('fails closed on corrupt history',()=>assert.throws(()=>updateHistory({schemaVersion:1,snapshots:[{}]},report())));
