import test from 'node:test';import assert from 'node:assert/strict';import {sanitize} from './sanitize-public-report.mjs';
const input=()=>({capturedAt:'2026-11-15T12:00:00Z',entries:[{name:'Example QA',project:'EPM',counts:{qa:1,review:0,inProgress:0,toDo:0,done:0,closed:0},tickets:[{key:'EPM-1',summary:'SECRET TITLE',description:'SECRET',status:'QA',updated:'2026-11-15T11:00:00Z',email:'secret@example.com'}]}]});
test('strict allowlist removes sensitive fields',()=>{const result=sanitize(input());const out=JSON.stringify(result);assert.equal(result.entries[0].tickets[0].key,'EPM-1');for(const forbidden of ['SECRET','email','description','summary','example.com'])assert.equal(out.includes(forbidden),false)});
test('rejects missing timestamp',()=>{const x=input();delete x.capturedAt;assert.throws(()=>sanitize(x))});
test('rejects unknown count/status',()=>{const x=input();x.entries[0].counts.admin=1;assert.throws(()=>sanitize(x))});
test('rejects invalid issue key',()=>{const x=input();x.entries[0].tickets[0].key='bad';assert.throws(()=>sanitize(x))});
test('rejects absent tickets array',()=>{const x=input();delete x.entries[0].tickets;assert.throws(()=>sanitize(x))});
