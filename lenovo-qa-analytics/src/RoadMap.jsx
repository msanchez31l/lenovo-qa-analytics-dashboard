import React,{useEffect,useMemo,useState} from 'react';
import {Search,LockKeyhole,RefreshCw} from 'lucide-react';
import './roadmap.css';

const normalize=(s)=>String(s||'').trim().toUpperCase();
export default function RoadMap(){
 const [source,setSource]=useState(null),[error,setError]=useState(''),[area,setArea]=useState('All areas'),[status,setStatus]=useState('All statuses'),[query,setQuery]=useState(''),[page,setPage]=useState(1);
 useEffect(()=>{let active=true;fetch(import.meta.env.BASE_URL+'data/roadmap.json?ts='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Road Map data has not been published yet');return r.json()}).then(d=>{if(!Array.isArray(d.checks))throw Error('Invalid Road Map dataset');if(active)setSource(d)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
 const checks=source?.checks||[];
 const areas=[...new Set(checks.map(x=>x.area))].sort();
 const automated=checks.filter(x=>normalize(x.status)==='AUTOMATED').length;
 const pending=checks.filter(x=>normalize(x.status)==='PENDING').length;
 const coverage=checks.length?Math.round(automated/checks.length*1000)/10:0;
 const filtered=useMemo(()=>checks.filter(x=>(area==='All areas'||x.area===area)&&(status==='All statuses'||normalize(x.status)===status)&&(!query||[x.area,x.category,x.check,x.method,x.tool].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))),[checks,area,status,query]);
 const pages=Math.max(1,Math.ceil(filtered.length/15));const current=Math.min(page,pages);
 const shown=filtered.slice((current-1)*15,current*15);
 return <section className="roadmap">
 <div className="sectionHeading"><div><h2>QA Automation Road Map</h2><p>Manual QA checks → Automated Desktop Tools · Excel-controlled, read-only view</p></div><span className="rmReadOnly"><LockKeyhole size={14}/> Read-only</span></div>
 {error?<div className="panel rmEmpty"><h3>Road Map data unavailable</h3><p>{error}. Publish the approved roadmap.json generated from the master Excel.</p></div>:!source?<div className="panel rmEmpty">Loading Road Map…</div>:<>
 <div className="rmStats"><article className="panel"><small>Total checks</small><strong>{checks.length}</strong></article><article className="panel"><small>Automated</small><strong>{automated}</strong></article><article className="panel"><small>Pending</small><strong>{pending}</strong></article><article className="panel"><small>Automation coverage</small><strong>{coverage}%</strong></article></div>
 <article className="panel rmCoverage"><div className="rmSpread"><h3>Automation progress</h3><span>{automated} of {checks.length} checks</span></div><div className="rmTrack"><div style={{width:coverage+'%'}}/></div><p>Coverage is calculated from the statuses in the published Excel; no estimates or synthetic progress.</p></article>
 <article className="panel rmAreas"><h3>Coverage by QA area</h3><div className="rmAreaGrid">{areas.map(a=>{const rows=checks.filter(x=>x.area===a);const done=rows.filter(x=>normalize(x.status)==='AUTOMATED').length;return <div className="rmArea" key={a}><div className="rmSpread"><b>{a}</b><span>{done}/{rows.length}</span></div><div className="rmTrack"><div style={{width:(rows.length?done/rows.length*100:0)+'%'}}/></div></div>})}</div></article>
 <article className="panel rmList"><div className="rmSpread"><div><h3>QA check inventory</h3><p>{filtered.length} matching checks · Source: approved Excel</p></div><span className="rmReadOnly"><LockKeyhole size={14}/> No inline editing</span></div>
 <div className="rmFilters"><label><Search size={16}/><input aria-label="Search QA checks" placeholder="Search checks, tools, methods…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><select aria-label="QA area" value={area} onChange={e=>{setArea(e.target.value);setPage(1)}}><option>All areas</option>{areas.map(a=><option key={a}>{a}</option>)}</select><select aria-label="Automation status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option>All statuses</option><option value="AUTOMATED">Automated</option><option value="PENDING">Pending</option></select></div>
 <div className="rmTableWrap"><table className="rmTable"><thead><tr><th>QA area</th><th>Category</th><th>QA check</th><th>Current method</th><th>Status</th><th>Automation tool / plan</th></tr></thead><tbody>{shown.map((x,i)=><tr key={(current-1)*15+i}><td>{x.area}</td><td>{x.category}</td><td>{x.check}</td><td>{x.method}</td><td><span className={'rmPill '+(normalize(x.status)==='AUTOMATED'?'done':'pending')}>{x.status}</span></td><td>{x.tool}</td></tr>)}</tbody></table>{!filtered.length&&<p className="rmEmpty">No checks match the selected filters.</p>}</div>
 <div className="rmSpread rmPager"><span>{filtered.length?((current-1)*15+1)+'–'+Math.min(current*15,filtered.length):0} of {filtered.length}</span><div><button className="button" disabled={current<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {current} / {pages}</span><button className="button" disabled={current>=pages} onClick={()=>setPage(p=>p+1)}>Next</button></div></div>
 </article><p className="rmSource"><RefreshCw size={13}/> Updates only when the master Excel is converted and published to GitHub. Viewers cannot change roadmap data.</p>
 </>}
 </section>
}
