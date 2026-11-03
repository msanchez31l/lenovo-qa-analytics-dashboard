import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const host=process.env.HOST||'127.0.0.1';
if(process.env.NODE_ENV==='production' && process.env.TRUST_HTTPS_PROXY!=='true')throw Error('Production requires TRUST_HTTPS_PROXY=true and an HTTPS reverse proxy');
const port=Number(process.env.PORT||4174);
const dist=path.resolve(process.env.DIST_DIR||'./dist');
const reportPath=path.resolve(process.env.REPORT_PATH||'./private-data/report.json');
const passwordHash=process.env.DASHBOARD_PASSWORD_HASH;
const sessionKey=process.env.SESSION_SECRET;
const uploadKey=process.env.REPORT_UPLOAD_TOKEN;
if(!passwordHash||!sessionKey||!uploadKey||sessionKey.length<32||uploadKey.length<32)throw Error('Configure DASHBOARD_PASSWORD_HASH, SESSION_SECRET and REPORT_UPLOAD_TOKEN (32+ chars for keys)');
const maxBytes=8*1024*1024;
const publicHost=process.env.PUBLIC_HOST||'';
const expectedOrigin=process.env.PUBLIC_ORIGIN||'';
const attempts=new Map();
const send=(res,status,body,headers={})=>{res.writeHead(status,{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",...headers});res.end(body)};
const json=(res,status,value)=>send(res,status,JSON.stringify(value),{'Content-Type':'application/json; charset=utf-8'});
const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
function checkPassword(value){const [kind,salt,hash]=passwordHash.split(':');if(kind!=='scrypt'||!salt||!hash)return false;return equal(crypto.scryptSync(value,salt,64).toString('hex'),hash)}
const sign=(value)=>crypto.createHmac('sha256',sessionKey).update(value).digest('hex');
function authed(req){const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('qa_session='))?.slice(11);if(!cookie)return false;const [exp,mac]=cookie.split('.');if(!/^\d+$/.test(exp)||Number(exp)<Date.now()||!mac)return false;return equal(sign(exp),mac)}
const body=async(req)=>{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>maxBytes)throw Error('payload too large');chunks.push(chunk)}return Buffer.concat(chunks).toString('utf8')};
const loginPage=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lenovo QA Analytics · Sign in</title><style>body{margin:0;background:#101725;color:#edf2f7;font:16px system-ui;display:grid;place-items:center;min-height:100vh}.card{width:min(390px,90vw);background:#1b2638;border:1px solid #334155;border-radius:16px;padding:30px}h1{font-size:23px}input,button{box-sizing:border-box;width:100%;padding:14px;border-radius:8px;margin-top:14px;font:inherit}input{background:#0f172a;border:1px solid #64748b;color:white}button{background:#dc4239;color:white;border:0;cursor:pointer}p{color:#cbd5e1;font-size:14px}</style><div class="card"><h1>Lenovo QA Analytics</h1><p>Private QA dashboard</p><form method="POST" action="/auth/login"><input type="password" name="password" required autocomplete="current-password" placeholder="Team password"><button>Sign in</button></form></div></html>`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(publicHost && req.headers.host!==publicHost)return json(res,403,{error:'Invalid host'});
  if(req.method==='POST' && expectedOrigin && req.headers.origin && req.headers.origin!==expectedOrigin)return json(res,403,{error:'Invalid origin'});
  if(pathname==='/auth/logout'&&req.method==='POST')return send(res,303,'',{'Set-Cookie':'qa_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(process.env.NODE_ENV==='production'?'; Secure':''),'Location':'/login'});
  if(pathname==='/auth/login'&&req.method==='POST'){
   const ip=req.socket.remoteAddress||'unknown',now=Date.now();const state=attempts.get(ip)||{count:0,until:0};if(state.until>now)return json(res,429,{error:'Too many attempts. Try again later.'});
   const form=new URLSearchParams(await body(req));if(!checkPassword(form.get('password')||'')){state.count++;if(state.count>=5){state.until=now+15*60*1000;state.count=0}attempts.set(ip,state);return send(res,401,'Invalid password',{'Content-Type':'text/plain; charset=utf-8'})}
   attempts.delete(ip);const exp=String(Date.now()+8*60*60*1000);const cookie=`qa_session=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`;
   res.writeHead(303,{'Set-Cookie':cookie,'Location':'/lenovo-qa-analytics-dashboard/','Cache-Control':'no-store'});return res.end();
  }
  if(pathname==='/api/publish'&&req.method==='POST'){
   if(!equal(req.headers.authorization||'',`Bearer ${uploadKey}`))return json(res,401,{error:'Unauthorized'});
   const raw=await body(req),value=JSON.parse(raw);if(!value||!Array.isArray(value.entries)||value.entries.length>500)return json(res,400,{error:'Invalid report'});
   await fs.mkdir(path.dirname(reportPath),{recursive:true});const temp=reportPath+'.tmp-'+crypto.randomUUID();await fs.writeFile(temp,raw,{mode:0o600});await fs.rename(temp,reportPath);return json(res,200,{ok:true});
  }
  if(!authed(req)){if(req.method==='GET'&&(pathname==='/'||pathname==='/lenovo-qa-analytics-dashboard/'||pathname==='/login'))return send(res,200,loginPage,{'Content-Type':'text/html; charset=utf-8'});return json(res,401,{error:'Authentication required'})}
  if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true});
  if(pathname==='/api/report'&&req.method==='GET'){try{return send(res,200,await fs.readFile(reportPath,'utf8'),{'Content-Type':'application/json; charset=utf-8'})}catch{return json(res,503,{error:'Report not available'})}}
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  if(pathname==='/login')return send(res,303,'',{'Location':'/lenovo-qa-analytics-dashboard/'});
  let relative=pathname.replace(/^\/lenovo-qa-analytics-dashboard\/?/,'/');if(relative==='/'||relative==='')relative='/index.html';
  const file=path.resolve(dist,'.'+relative);if(!file.startsWith(dist+path.sep))return json(res,403,{error:'Forbidden'});
  let contents;try{contents=await fs.readFile(file)}catch{return json(res,404,{error:'Not found'})}
  return send(res,200,contents,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
 }catch(e){return json(res,e.message==='payload too large'?413:500,{error:'Request failed'})}
}).listen(port,host,()=>console.log(`Private dashboard listening on http://${host}:${port}/lenovo-qa-analytics-dashboard/`));
