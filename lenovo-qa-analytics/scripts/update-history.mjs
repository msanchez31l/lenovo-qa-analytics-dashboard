import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const keys=['qa','review','inProgress','toDo','done','closed'];
const maxDays=90;
const safeCount=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
const validTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;
export function updateHistory(previous,report){
 if(!report||!Array.isArray(report.entries)||!validTime(report.capturedAt))throw Error('Invalid approved report');
 if(previous!==null&&(!previous||previous.schemaVersion!==1||!Array.isArray(previous.snapshots)))throw Error('Invalid existing history; refusing to overwrite');
 const snapshots=(previous?.snapshots||[]).map(s=>{
  if(!validTime(s.capturedAt)||!Array.isArray(s.entries))throw Error('Invalid historical snapshot');
  return s;
 });
 const entries=report.entries.map(e=>{
  if(typeof e.name!=='string'||typeof e.project!=='string'||!e.counts)throw Error('Invalid entry');
  const counts={};
  for(const key of keys){if(!safeCount(e.counts[key]))throw Error('Invalid count '+key);counts[key]=e.counts[key]}
  return {name:e.name,project:e.project,counts};
 });
 const timestamp=validTime(report.capturedAt);
 const existing=snapshots.find(s=>s.capturedAt===timestamp);
 if(existing){
  if(JSON.stringify(existing.entries)!==JSON.stringify(entries))throw Error('Conflicting snapshot timestamp');
 }else{
  snapshots.push({capturedAt:timestamp,entries});
 }
 snapshots.sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt));
 const latest=snapshots[snapshots.length-1].capturedAt;
 const cutoff=new Date(Date.parse(latest)-maxDays*86400000).toISOString();
 const kept=snapshots.filter(s=>s.capturedAt>=cutoff&&s.capturedAt<=latest);
 if(kept.length>300)throw Error('Too many historical snapshots');
 return {schemaVersion:1,snapshots:kept};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [reportPath,historyPath]=process.argv.slice(2);
 if(!reportPath||!historyPath)throw Error('Usage: node update-history.mjs approved-report.json history.json');
 const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
 const previous=fs.existsSync(historyPath)?JSON.parse(fs.readFileSync(historyPath,'utf8')):null;
 const result=updateHistory(previous,report);
 fs.mkdirSync(path.dirname(historyPath),{recursive:true});
 const temp=historyPath+'.tmp-'+process.pid;
 try{fs.writeFileSync(temp,JSON.stringify(result,null,2)+'\n');fs.renameSync(temp,historyPath)}
 finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}
 console.log('Historical snapshots: '+result.snapshots.length);
}
