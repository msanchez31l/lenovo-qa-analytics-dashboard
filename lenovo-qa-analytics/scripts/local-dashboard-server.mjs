import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','dist');
const report=process.env.QA_REPORT_PATH;
const port=Number(process.env.QA_DASHBOARD_PORT||4173);
if(!report){console.error('QA_REPORT_PATH is required. Point it to the private normalized JSON report.');process.exit(1)}
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(pathname==='/api/report'){
  try{const data=await fs.readFile(report,'utf8');JSON.parse(data);res.setHeader('Content-Type','application/json;charset=utf-8');res.end(data)}
  catch(e){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Report not ready',detail:e.code||'invalid-json'}))}return;
 }
 if(pathname==='/api/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,mode:'local-private'}));return}
 const relative=pathname.replace(/^\/lenovo-qa-analytics-dashboard\/?/,'/');const dest=path.resolve(root,'.'+relative);
 if(dest!==root&&!dest.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 let file=dest;try{if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html')}catch{file=path.join(root,'index.html')}
 try{const data=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data)}
 catch{res.writeHead(404);res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log('Private QA dashboard: http://127.0.0.1:'+port+'/lenovo-qa-analytics-dashboard/'));
