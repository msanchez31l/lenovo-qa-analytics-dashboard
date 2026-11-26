import React, { useEffect, useMemo, useState } from 'react';
import { Activity, RotateCcw, Upload } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const projects = ['DXGWP', 'EPM', 'AGWP'];

function validate(raw) {
  if (
    raw?.schemaVersion !== 1 ||
    !Array.isArray(raw.rows) ||
    !Number.isFinite(Date.parse(raw.lastPollAt)) ||
    !Number.isFinite(Date.parse(raw.generatedAt))
  ) throw Error('Invalid activity dataset');

  for (const row of raw.rows) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !projects.includes(row.project) ||
      typeof row.engineer !== 'string' ||
      !Number.isSafeInteger(row.assignments) ||
      row.assignments < 0
    ) throw Error('Invalid activity record');
  }

  if (raw.assignments !== undefined && (!Array.isArray(raw.assignments) || raw.assignments.some(a => !/^(DXGWP|EPM|AGWP)-[0-9]+$/.test(a.ticket) || !projects.includes(a.project) || typeof a.engineer !== 'string' || !Number.isFinite(Date.parse(a.assignedAt))))) throw Error('Invalid assignment details');
  return raw;
}

function dayInZone(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date).map(p => [p.type, p.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function LiveActivity() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [project, setProject] = useState('');
  const [engineer, setEngineer] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [clock, setClock] = useState(Date.now());

  async function refresh() {
    try {
      const response = await fetch(
        import.meta.env.BASE_URL + 'data/live-activity.json',
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw Error('Activity snapshot not published');
      }

      setData(validate(await response.json()));
      setSource('Published snapshot');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (source === 'Local import') return;
    refresh();
    const timer = setInterval(refresh, 120000);
    return () => clearInterval(timer);
  }, [source]);

  useEffect(() => {
    const timer = setInterval(
      () => setClock(Date.now()), 30000
    );
    return () => clearInterval(timer);
  }, []);

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setData(validate(JSON.parse(await file.text())));
      setSource('Local import');
      setError('');
    } catch (err) {
      setError(err.message);
    }

    event.target.value = '';
  }

  const rows = data?.rows || [];

  const engineers = [...new Set(
    rows.map(row => row.engineer)
  )].sort();

  const filtered = useMemo(() => rows.filter(row =>
    (!project || row.project === project) &&
    (!engineer || row.engineer === engineer) &&
    (!from || row.date >= from) &&
    (!to || row.date <= to)
  ), [rows, project, engineer, from, to]);

  const details = (data?.assignments || []).filter(row => (!project || row.project === project) && (!engineer || row.engineer === engineer) && (!from || row.date >= from) && (!to || row.date <= to));
  const today = dayInZone(new Date(clock));

  const total = list => list.reduce(
    (sum, row) => sum + row.assignments, 0
  );

  function group(field) {
    const result = new Map();

    for (const row of filtered) {
      result.set(
        row[field],
        (result.get(row[field]) || 0) + row.assignments
      );
    }

    return [...result.entries()].map(
      ([name, count]) => ({ name, count })
    );
  }

  const daily = group('date').sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  const stale = data &&
    clock - Date.parse(data.lastPollAt) > 600000;

  const metrics = [
    ['Assignments today',
      total(filtered.filter(r => r.date === today))],
    ['Assignments in selected period', total(filtered)],
    ['Engineers with assignments',
      new Set(filtered.map(r => r.engineer)).size],
    ['Projects with assignments',
      new Set(filtered.map(r => r.project)).size]
  ];

  return <>
    <div className="sectionHeading">
      <div>
        <h2>Live QA Activity</h2>
        <p>Assignment activity from the QA monitoring agent.</p>
      </div>
      <span className="statTag">
        <Activity size={15}/> {source || 'Awaiting snapshot'}
      </span>
    </div>

    <section className="filterbar">
      <select value={project}
        aria-label="Activity project"
        onChange={e => setProject(e.target.value)}>
        <option value="">All projects</option>
        {projects.map(p => <option key={p}>{p}</option>)}
      </select>

      <select value={engineer}
        aria-label="Activity engineer"
        onChange={e => setEngineer(e.target.value)}>
        <option value="">All engineers</option>
        {engineers.map(n => <option key={n}>{n}</option>)}
      </select>

      <label>From <input type="date" value={from}
        max={to || undefined}
        onChange={e => setFrom(e.target.value)}/></label>

      <label>To <input type="date" value={to}
        min={from || undefined}
        onChange={e => setTo(e.target.value)}/></label>

      <button className="button" onClick={() => {
        setProject(''); setEngineer('');
        setFrom(''); setTo('');
      }}><RotateCcw size={15}/> Clear filters</button>

      <label className="button">
        <Upload size={15}/> Import activity
        <input type="file" accept=".json" style={{maxWidth:180}}
          aria-label="Import activity JSON"
          onChange={importFile}/>
      </label>
    </section>

    {error && <div className="error" role="alert">
      {error}. {data ? 'Showing last loaded snapshot.' :
        'No sample data is displayed.'}
    </div>}

    {data && <div className="localStatus">
      <Activity size={16}/>
      {stale ? 'Snapshot is older than 10 minutes' :
        'Recent monitor snapshot'}
      {' · Last successful poll: '}
      {new Date(data.lastPollAt).toLocaleString()}
    </div>}

    <div className="cards">
      {metrics.map(([label, value]) =>
        <article className="metric" key={label}>
          <div className="metricTop">{label}</div>
          <strong>{data ? value : '—'}</strong>
          <small>Recorded assignment activity</small>
        </article>
      )}
    </div>

    <div className="charts">
      {[
        ['Assignment activity by day', daily],
        ['Assignment activity by engineer', group('engineer')],
        ['Assignment activity by project', group('project')]
      ].map(([title, values]) =>
        <article className="panel" key={title}>
          <div className="panelHeading"><h3>{title}</h3></div>
          {values.length ?
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={values}>
                  <CartesianGrid vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize: 11}}/>
                  <YAxis allowDecimals={false}/>
                  <Tooltip/>
                  <Bar dataKey="count" name="Assignments"
                    fill="#d84c41" radius={[6,6,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div> :
            <div className="nohistory">
              {data ? 'No assignments in the selected period.' :
                'Activity dataset unavailable.'}
            </div>}
        </article>
      )}
    </div>

    <article className="panel">
      <div className="panelHeading"><h3>Recent assignments</h3><span>{details.length} events</span></div>
      <div className="tableWrap"><table><thead><tr><th>Ticket</th><th>Engineer</th><th>Assigned at</th><th>Initial status</th><th>Status at detection</th></tr></thead><tbody>
      {details.map((a,i)=><tr key={i}><td><a href={'https://jira.xpaas.lenovo.com/browse/'+encodeURIComponent(a.ticket)} target="_blank" rel="noopener noreferrer">{a.ticket}</a></td><td>{a.engineer}</td><td>{new Date(a.assignedAt).toLocaleString()}</td><td>{a.initialStatus}</td><td>{a.statusAtDetection}</td></tr>)}
      </tbody></table></div>
      {!details.length && <p className="empty">{data ? 'No recorded assignment details match the filters.' : 'Waiting for an activity snapshot.'}</p>}
    </article>
    <article className="panel">
      <div className="panelHeading">
        <h3>Daily activity breakdown</h3>
        <span>{filtered.length} records</span>
      </div>
      <div className="tableWrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Engineer</th>
            <th>Project</th><th>Assignments</th>
          </tr></thead>
          <tbody>
            {filtered.map(row =>
              <tr key={JSON.stringify([
                row.date,row.engineer,row.project
              ])}>
                <td>{row.date}</td>
                <td>{row.engineer}</td>
                <td><span className="project">
                  {row.project}
                </span></td>
                <td>{row.assignments}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!filtered.length && <p className="empty">
        {data ? 'No recorded assignments match the filters.' :
          'Waiting for an activity snapshot.'}
      </p>}
    </article>
  </>;
}
