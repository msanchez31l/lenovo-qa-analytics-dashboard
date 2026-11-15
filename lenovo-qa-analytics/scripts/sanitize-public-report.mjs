import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const statuses=['qa','review','inProgress','toDo','done','closed'];
const labels={qa:'QA',review:'Review',inProgress:'In Progress',toDo:'To Do',done:'Done',closed:'Closed'};
const canonical=s=>String(s).toLowerCase().replace(/[^a-z]/g,'');
const bucket=s=>statuses.find(x=>canonical(x)===canonical(s))||(canonical(s)==='qatesting'?'qa':null);
const issueKey=/^[A-Z][A-Z0-9_]*-[0-9]+$/;
const safeString=(s,max)=>typeof s==='string'&&s.length>0&&s.length<=max&&!/[<>\x00-\x1f]/.test(s);
const date=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;
function sanitizeTicket(raw,owner,project,status){
 if(!raw||typeof raw!=='object'||!issueKey.test(raw.key||''))throw Error('Invalid issue key');
 const updated=date(raw.updated||raw.fields?.updated||raw.created||raw.fields?.created);
 if(raw.updated && !updated)throw Error('Issue has invalid updated date: '+raw.key);
 return {key:raw.key,owner,project,status,updated};
}
export function sanitize(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid input');
 const source=raw.report&&typeof raw.report==='object'?raw.report:raw;
 const capturedAt=date(raw.capturedAt||raw.generatedAt||source.capturedAt||source.generatedAt);
 if(!capturedAt)throw Error('Report missing valid capturedAt/generatedAt');
 const entries=[];
 const add=(name,project,countsSource,ticketsSource)=>{
  if(!safeString(name,120)||!safeString(project,40))throw Error('Invalid engineer/project');
  const counts=Object.fromEntries(statuses.map(s=>[s,0]));
  for(const [k,v] of Object.entries(countsSource)){
   const b=bucket(k);if(!b)throw Error('Unknown status: '+k);
   if(!Number.isSafeInteger(v)||v<0||v>100000000)throw Error('Invalid count');
   counts[b]+=v;
  }
  const tickets=ticketsSource.map(t=>{
   const st=bucket(t.status?.name||t.fields?.status?.name||t.status||'');
   if(!st)throw Error('Ticket missing recognized status');
   return sanitizeTicket(t,name,project,labels[st]);
  });
  entries.push({name,project,counts,tickets});
 };
 if(Array.isArray(source.entries)){
  if(source.entries.length>500)throw Error('Too many entries');
  for(const e of source.entries){
   if(!e||typeof e!=='object'||!e.counts||typeof e.counts!=='object'||Array.isArray(e.counts)||!Array.isArray(e.tickets))throw Error('Entry requires counts and tickets arrays');
   add(e.name,e.project,e.counts,e.tickets);
  }
 }else{
  for(const [name,projects] of Object.entries(source)){
   if(['capturedAt','generatedAt','metadata','totals','summary','teamTotals','users'].includes(name))continue;
   if(!projects||typeof projects!=='object'||Array.isArray(projects))throw Error('Unexpected root field '+name);
   for(const [project,groups] of Object.entries(projects)){
    if(!groups||typeof groups!=='object'||Array.isArray(groups))throw Error('Invalid project');
    const counts={};const tickets=[];
    for(const [status,items] of Object.entries(groups)){
     const b=bucket(status);if(!b)throw Error('Unknown status '+status);
     if(Array.isArray(items)){counts[b]=(counts[b]||0)+items.length;for(const item of items)tickets.push({...item,status:labels[b]});}
     else if(Number.isSafeInteger(items)&&items>=0)counts[b]=(counts[b]||0)+items;
     else if(items&&Number.isSafeInteger(items.count)&&items.count>=0)counts[b]=(counts[b]||0)+items.count;
     else throw Error('Invalid status payload');
    }
    add(name,project,counts,tickets);
   }
  }
 }
 if(!entries.length)throw Error('No entries');
 const keys=new Set();
 for(const e of entries)for(const t of e.tickets){if(keys.has(t.key))throw Error('Duplicate issue '+t.key);keys.add(t.key)}
 const output={schemaVersion:1,capturedAt,entries};
 const serialized=JSON.stringify(output);
 if(Buffer.byteLength(serialized)>6*1024*1024)throw Error('Output too large');
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node sanitize-public-report.mjs input.json output.json');
 const value=sanitize(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(value,null,2)+'\n',{flag:'w'});
 console.log('Sanitized '+value.entries.length+' entries; SHA256 '+crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'));
}
