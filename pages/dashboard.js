import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from './_app';

const TAG_LABELS = { varc: 'VARC', lrdi: 'LRDI', qa: 'QA', mock: 'MOCK' };

export default function Dashboard() {
  const { auth, logout, toast, apiFetch } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('plan');
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Today skip modal
  const [skipModal, setSkipModal] = useState(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipErr, setSkipErr] = useState('');
  const [logging, setLogging] = useState({});

  // Yesterday resolution state
  const [yesterdaySkipModal, setYesterdaySkipModal] = useState(null);
  const [yesterdaySkipReason, setYesterdaySkipReason] = useState('');
  const [yesterdaySkipErr, setYesterdaySkipErr] = useState('');
  const [yesterdayLogging, setYesterdayLogging] = useState({});

  // Events (mocks + sectionals)
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [attemptingEvent, setAttemptingEvent] = useState({});

  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    if (!auth) { router.replace('/'); return; }
    if (auth.role === 'admin') { router.replace('/admin'); return; }
    loadData();
  }, [auth]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch(`/api/student/today?date=${today}`);
      setData(d);
    } catch (e) { toast(e.message); }
    setLoading(false);
  }, [apiFetch, today]);

  const loadProgress = useCallback(async () => {
    try {
      const d = await apiFetch('/api/student/progress?days=14');
      setProgress(d);
    } catch {}
  }, [apiFetch]);

  useEffect(() => { if (tab === 'progress') loadProgress(); }, [tab]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const d = await apiFetch('/api/student/events');
      setEvents(d.events || []);
    } catch {}
    setEventsLoading(false);
  }, [apiFetch]);

  useEffect(() => { if (tab === 'resources') loadEvents(); }, [tab]);

  async function markAttempted(eventId) {
    setAttemptingEvent(p => ({ ...p, [eventId]: true }));
    try {
      await apiFetch('/api/student/events', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId }),
      });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attempted: true } : e));
      toast('Marked as attempted!');
    } catch (e) { toast(e.message); }
    setAttemptingEvent(p => ({ ...p, [eventId]: false }));
  }

  // Mark today's task done
  async function markDone(taskId) {
    setLogging(p => ({ ...p, [taskId]: true }));
    try {
      await apiFetch('/api/student/log', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, status: 'done', log_date: today }),
      });
      toast('Task marked complete ✓');
      loadData();
    } catch (e) { toast(e.message); }
    setLogging(p => ({ ...p, [taskId]: false }));
  }

  // Submit today skip
  async function submitSkip() {
    if (!skipReason.trim()) { setSkipErr('Please provide a reason.'); return; }
    setSkipErr('');
    setLogging(p => ({ ...p, [skipModal.id]: true }));
    try {
      await apiFetch('/api/student/log', {
        method: 'POST',
        body: JSON.stringify({
          task_id: skipModal.id, status: 'skipped',
          skip_reason: skipReason, log_date: today,
        }),
      });
      toast('Task skipped. Reason recorded.');
      setSkipModal(null); setSkipReason('');
      loadData();
    } catch (e) { toast(e.message); }
    setLogging(p => ({ ...p, [skipModal?.id]: false }));
  }

  // Mark yesterday task done
  async function markYesterdayDone(taskId) {
    setYesterdayLogging(p => ({ ...p, [taskId]: true }));
    try {
      await apiFetch('/api/student/log', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, status: 'done', log_date: data.yesterdayKey }),
      });
      toast('Yesterday task marked done ✓');
      loadData();
    } catch (e) { toast(e.message); }
    setYesterdayLogging(p => ({ ...p, [taskId]: false }));
  }

  // Submit yesterday skip with mandatory reason
  async function submitYesterdaySkip() {
    if (!yesterdaySkipReason.trim()) { setYesterdaySkipErr('A reason is required to skip.'); return; }
    setYesterdaySkipErr('');
    setYesterdayLogging(p => ({ ...p, [yesterdaySkipModal.id]: true }));
    try {
      await apiFetch('/api/student/log', {
        method: 'POST',
        body: JSON.stringify({
          task_id: yesterdaySkipModal.id, status: 'skipped',
          skip_reason: yesterdaySkipReason, log_date: data.yesterdayKey,
        }),
      });
      toast('Reason recorded.');
      setYesterdaySkipModal(null); setYesterdaySkipReason('');
      loadData();
    } catch (e) { toast(e.message); }
    setYesterdayLogging(p => ({ ...p, [yesterdaySkipModal?.id]: false }));
  }

  if (!auth || loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <span className="spinner" style={{ width:32, height:32 }} />
    </div>
  );

  const { student, tasks, logs, todayUnlocked, yesterdayTasks, yesterdayLogs } = data || {};

  const logMap = {};
  (logs || []).forEach(l => { logMap[l.task_id] = l; });
  const yLogMap = {};
  (yesterdayLogs || []).forEach(l => { yLogMap[l.task_id] = l; });

  const isProperlyResolved = (log) =>
    log?.status === 'done' || (log?.status === 'skipped' && log?.skip_reason?.trim());

  const yesterdayPending = (yesterdayTasks || []).filter(t => !isProperlyResolved(yLogMap[t.id]));
  const yesterdayResolved = (yesterdayTasks || []).filter(t => isProperlyResolved(yLogMap[t.id]));

  const done = (logs || []).filter(l => l.status === 'done').length;
  const skipped = (logs || []).filter(l => l.status === 'skipped').length;
  const total = (tasks || []).length;
  const pct = total ? Math.round(((done + skipped) / total) * 100) : 0;

  const yesterdayDateLabel = data?.yesterdayKey
    ? new Date(data.yesterdayKey + 'T12:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'short',
      })
    : '';

  return (
    <>
      <Head><title>My Plan — GRADSKOOL</title></Head>
      <div className="app-shell">

        {/* Nav */}
        <nav className="app-nav">
          <div className="logo">GRAD<span>SKOOL</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div className="avatar">{student?.name?.[0]?.toUpperCase() || 'S'}</div>
            <span style={{ color:'#fff', fontSize:'0.88rem', fontWeight:500 }}>{student?.name}</span>
            <button className="btn btn-sm"
              style={{ color:'var(--g400)', background:'transparent', border:'1px solid #333', fontSize:'0.78rem' }}
              onClick={() => { logout(); router.replace('/'); }}>Logout</button>
          </div>
        </nav>

        <div className="app-body">
          <aside className="sidebar">
            {[
              { key:'plan',      icon:'\uD83D\uDCCB', label:"Today's Plan" },
              { key:'progress',  icon:'\uD83D\uDCC8', label:'My Progress' },
              { key:'resources', icon:'\uD83D\uDCDA', label:'Resources' },
            ].map(s => (
              <div key={s.key} className={`side-item ${tab === s.key ? 'active' : ''}`}
                onClick={() => setTab(s.key)}>
                {s.icon} {s.label}
              </div>
            ))}
            <div className="side-footer">
              <div style={{ fontSize:'0.73rem', color:'var(--g400)' }}>Track</div>
              <div style={{ fontSize:'0.88rem', fontWeight:600, color:'var(--red)', marginTop:'0.2rem' }}>
                {student?.track} Track
              </div>
            </div>
          </aside>

          <main className="main">

            {/* TODAY'S PLAN */}
            {tab === 'plan' && (
              <>
                <div className="page-header">
                  <div>
                    <div className="page-title">Today's Plan</div>
                    <div className="page-sub">{todayLabel}</div>
                  </div>
                  <span className="badge badge-red">{student?.track} Track</span>
                </div>

                {/* Stats */}
                <div className="card" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
                  gap:'0.5rem', marginBottom:'1rem', textAlign:'center' }}>
                  {[
                    { num:`${pct}%`,               label:'Today',     color: pct===100?'#22c55e':pct>=50?'#f59e0b':'var(--red)' },
                    { num: done,                   label:'Done',      color:'#22c55e' },
                    { num: skipped,                label:'Skipped',   color:'var(--red)' },
                    { num: total - done - skipped, label:'Remaining', color:'var(--black)' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize:'1.5rem', fontWeight:700, fontFamily:'var(--serif)', color:s.color }}>{s.num}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--g400)', marginTop:'0.1rem' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="progress-bar" style={{ marginBottom:'1.25rem', height:8 }}>
                  <div className={`progress-fill ${pct===100?'green':''}`} style={{ width:`${pct}%` }} />
                </div>

                {/* YESTERDAY RESOLUTION PANEL */}
                {!todayUnlocked && yesterdayTasks && yesterdayTasks.length > 0 && (
                  <div style={{ marginBottom:'1.25rem', border:'2px solid var(--red)',
                    borderRadius:'var(--radius)', overflow:'hidden' }}>

                    <div style={{ background:'var(--red)', color:'#fff', padding:'0.85rem 1rem',
                      display:'flex', alignItems:'center', gap:'0.7rem' }}>
                      <span style={{ fontSize:'1.1rem' }}>🔒</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:'0.93rem' }}>
                          Complete {yesterdayDateLabel} to unlock today
                        </div>
                        <div style={{ fontSize:'0.78rem', opacity:0.88, marginTop:'0.15rem' }}>
                          {yesterdayPending.length} task{yesterdayPending.length !== 1 ? 's' : ''} pending
                          &nbsp;&mdash;&nbsp;mark done or provide a skip reason for each
                        </div>
                      </div>
                      <div style={{ background:'rgba(255,255,255,0.22)', borderRadius:20,
                        padding:'0.2rem 0.7rem', fontSize:'0.8rem', fontWeight:700, whiteSpace:'nowrap' }}>
                        {yesterdayResolved.length}/{yesterdayTasks.length}
                      </div>
                    </div>

                    <div style={{ background:'#fff' }}>
                      {(yesterdayTasks || []).map((task, idx) => {
                        const log = yLogMap[task.id];
                        const isDone = log?.status === 'done';
                        const isSkippedProperly = log?.status === 'skipped' && log?.skip_reason?.trim();
                        const isResolved = isDone || isSkippedProperly;
                        const isLoading = !!yesterdayLogging[task.id];
                        const isLast = idx === (yesterdayTasks.length - 1);

                        return (
                          <div key={task.id}
                            style={{ display:'flex', alignItems:'center', gap:'0.7rem',
                              padding:'0.7rem 1rem',
                              borderBottom: isLast ? 'none' : '1px solid var(--g100)',
                              background: isResolved ? 'var(--g50)' : '#fff',
                              transition:'background 0.2s' }}>

                            <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0,
                              background: isDone ? '#22c55e' : isSkippedProperly ? 'var(--red)' : 'var(--g200)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              color: isResolved ? '#fff' : 'var(--g400)', fontSize:'0.78rem', fontWeight:700 }}>
                              {isDone ? '✓' : isSkippedProperly ? '✕' : '○'}
                            </div>

                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'0.88rem', fontWeight:500,
                                color: isResolved ? 'var(--g400)' : 'var(--black)',
                                textDecoration: isResolved ? 'line-through' : 'none' }}>
                                {task.task_name}
                              </div>
                              <div style={{ fontSize:'0.73rem', color:'var(--g400)', marginTop:'0.1rem' }}>
                                {task.time_slot}
                                &nbsp;&middot;&nbsp;
                                <span style={{ textTransform:'uppercase', fontWeight:600, letterSpacing:'0.04em' }}>
                                  {TAG_LABELS[task.tag] || task.tag}
                                </span>
                              </div>
                              {isSkippedProperly && (
                                <div style={{ fontSize:'0.75rem', color:'var(--g600)',
                                  marginTop:'0.2rem', fontStyle:'italic' }}>
                                  Skipped: {log.skip_reason}
                                </div>
                              )}
                            </div>

                            {!isResolved && (
                              <div style={{ display:'flex', gap:'0.4rem', flexShrink:0 }}>
                                <button disabled={isLoading} onClick={() => markYesterdayDone(task.id)}
                                  style={{ padding:'0.3rem 0.7rem', fontSize:'0.78rem', fontWeight:600,
                                    background:'#f0fdf4', color:'#16a34a', border:'1.5px solid #86efac',
                                    borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem',
                                    opacity: isLoading ? 0.6 : 1 }}>
                                  {isLoading
                                    ? <span className="spinner" style={{ width:12, height:12 }} />
                                    : <>✓ Done</>}
                                </button>
                                <button disabled={isLoading}
                                  onClick={() => {
                                    setYesterdaySkipModal(task);
                                    setYesterdaySkipReason('');
                                    setYesterdaySkipErr('');
                                  }}
                                  style={{ padding:'0.3rem 0.7rem', fontSize:'0.78rem', fontWeight:600,
                                    background:'var(--red-light)', color:'var(--red)', border:'1.5px solid var(--red)',
                                    borderRadius:6, cursor:'pointer', opacity: isLoading ? 0.6 : 1 }}>
                                  Skip
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Today task list */}
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {(tasks || []).map(task => {
                    const log = logMap[task.id];
                    const isDone = log?.status === 'done';
                    const isSkipped = log?.status === 'skipped';
                    const isLocked = !todayUnlocked;
                    const cls = isDone ? 'done' : isSkipped ? 'skipped' : isLocked ? 'locked' : '';

                    return (
                      <div key={task.id} className={`task-card ${cls}`}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                          <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--g400)', minWidth:80 }}>
                            {task.time_slot}
                          </div>
                          <div style={{ flex:1, fontSize:'0.92rem', fontWeight:500 }}>
                            {task.task_name}
                          </div>
                          <span className={`tag tag-${task.tag}`}>{TAG_LABELS[task.tag] || task.tag}</span>
                          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                            {isLocked && <span style={{ fontSize:'0.9rem' }}>🔒</span>}
                            {!isDone && !isSkipped && !isLocked && (
                              <>
                                <button className="btn btn-ghost btn-sm"
                                  onClick={() => { setSkipModal(task); setSkipReason(''); setSkipErr(''); }}
                                  disabled={!!logging[task.id]}>Skip</button>
                                <button onClick={() => markDone(task.id)} disabled={!!logging[task.id]}
                                  style={{ width:30, height:30, borderRadius:'50%',
                                    border:'2px solid var(--g200)', background:'#fff', cursor:'pointer',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:'0.85rem', transition:'all 0.15s' }}
                                  onMouseOver={e => { e.currentTarget.style.borderColor='#22c55e'; e.currentTarget.style.background='#f0fdf4'; }}
                                  onMouseOut={e => { e.currentTarget.style.borderColor='var(--g200)'; e.currentTarget.style.background='#fff'; }}>
                                  {logging[task.id]
                                    ? <span className="spinner" style={{ width:14, height:14 }} />
                                    : '✓'}
                                </button>
                              </>
                            )}
                            {isDone && (
                              <div style={{ width:30, height:30, borderRadius:'50%', background:'#22c55e',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                color:'#fff', fontSize:'0.85rem' }}>✓</div>
                            )}
                            {isSkipped && (
                              <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--red)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                color:'#fff', fontSize:'0.85rem' }}>✕</div>
                            )}
                          </div>
                        </div>
                        {isSkipped && log?.skip_reason && (
                          <div style={{ marginTop:'0.65rem', padding:'0.5rem 0.75rem',
                            background:'rgba(255,94,95,0.08)', borderRadius:4,
                            borderLeft:'3px solid var(--red)', fontSize:'0.8rem', color:'var(--g700)' }}>
                            <strong>Reason:</strong> {log.skip_reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {total === 0 && (
                  <div className="empty-state">
                    <div className="icon">📋</div>
                    <p>No tasks yet. Your coach will set up your plan shortly.</p>
                  </div>
                )}
              </>
            )}

            {/* MY PROGRESS */}
            {tab === 'progress' && (
              <>
                <div className="page-header">
                  <div className="page-title">My Progress</div>
                  <button className="btn btn-ghost btn-sm" onClick={loadProgress}>↻ Refresh</button>
                </div>

                {!progress ? (
                  <div style={{ textAlign:'center', padding:'2rem' }}>
                    <span className="spinner" style={{ width:28, height:28 }} />
                  </div>
                ) : Object.keys(progress.history).length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📊</div>
                    <p>No history yet. Complete some tasks to see progress here.</p>
                  </div>
                ) : (
                  <>
                    {/* 14-day bar chart */}
                    <div className="card" style={{ marginBottom:'1.25rem' }}>
                      <div style={{ fontSize:'0.74rem', fontWeight:600, color:'var(--g400)',
                        textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.75rem' }}>
                        14-Day Activity
                      </div>
                      <div style={{ display:'flex', gap:'4px', alignItems:'flex-end', height:40 }}>
                        {Array.from({ length: 14 }).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (13 - i));
                          const key = d.toISOString().split('T')[0];
                          const dayData = progress.history[key];
                          const p = dayData && progress.totalTasks
                            ? Math.round(((dayData.done + dayData.skipped) / progress.totalTasks) * 100)
                            : 0;
                          const isToday = key === today;
                          const color = p === 100 ? '#22c55e' : p >= 50 ? '#f59e0b' : p > 0 ? '#fca5a5' : 'var(--g200)';
                          return (
                            <div key={key} title={`${key}: ${p}%`}
                              style={{ flex:1, height:`${Math.max(4, p * 0.4)}px`, background: color,
                                borderRadius:3, transition:'height 0.3s',
                                outline: isToday ? '2px solid var(--red)' : 'none', outlineOffset:2 }} />
                          );
                        })}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.4rem' }}>
                        <span style={{ fontSize:'0.7rem', color:'var(--g400)' }}>14 days ago</span>
                        <span style={{ fontSize:'0.7rem', color:'var(--red)', fontWeight:600 }}>Today</span>
                      </div>
                    </div>

                    {/* Daily cards */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                      {Object.keys(progress.history).sort().reverse().map(date => {
                        const d = progress.history[date];
                        const p = progress.totalTasks
                          ? Math.round(((d.done + d.skipped) / progress.totalTasks) * 100) : 0;
                        const missed = Math.max(0, progress.totalTasks - d.done - d.skipped);
                        const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
                          weekday:'long', day:'numeric', month:'short',
                        });
                        const skippedLogs = d.logs.filter(l => l.status === 'skipped');
                        const doneLogs = d.logs.filter(l => l.status === 'done');
                        return (
                          <div key={date} className="card">
                            <div style={{ display:'flex', alignItems:'center',
                              justifyContent:'space-between', marginBottom:'0.5rem' }}>
                              <strong style={{ fontSize:'0.9rem' }}>{dateLabel}</strong>
                              <span className={`badge ${p===100?'badge-green':p>=50?'badge-amber':'badge-red'}`}>{p}%</span>
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)',
                              gap:'0.4rem', marginBottom:'0.5rem', textAlign:'center' }}>
                              {[
                                { n:d.done,    l:'Done',    c:'#22c55e' },
                                { n:d.skipped, l:'Skipped', c:'var(--red)' },
                                { n:missed,    l:'Missed',  c:'var(--g400)' },
                              ].map(x => (
                                <div key={x.l} style={{ background:'var(--g50)', borderRadius:4, padding:'0.4rem' }}>
                                  <div style={{ fontSize:'1rem', fontWeight:700, color:x.c }}>{x.n}</div>
                                  <div style={{ fontSize:'0.7rem', color:'var(--g400)' }}>{x.l}</div>
                                </div>
                              ))}
                            </div>

                            <div className="progress-bar">
                              <div className={`progress-fill ${p===100?'green':''}`} style={{ width:`${p}%` }} />
                            </div>

                            {doneLogs.length > 0 && (
                              <div style={{ marginTop:'0.6rem' }}>
                                <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--g400)',
                                  textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.3rem' }}>
                                  Completed
                                </div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem' }}>
                                  {doneLogs.map((l, i) => (
                                    <span key={i} style={{ fontSize:'0.76rem', padding:'0.2rem 0.6rem',
                                      background:'#f0fdf4', color:'#15803d', borderRadius:20,
                                      border:'1px solid #86efac' }}>
                                      ✓ {l.task_name || 'Task'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {skippedLogs.length > 0 && (
                              <div style={{ marginTop:'0.6rem' }}>
                                <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--g400)',
                                  textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.3rem' }}>
                                  Skipped
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                                  {skippedLogs.map((l, i) => (
                                    <div key={i} style={{ padding:'0.4rem 0.65rem',
                                      background:'var(--red-light)', borderRadius:4,
                                      borderLeft:'3px solid var(--red)', fontSize:'0.79rem', color:'var(--g700)' }}>
                                      <span style={{ fontWeight:600 }}>{l.task_name || 'Task'}</span>
                                      {l.skip_reason
                                        ? <> — {l.skip_reason}</>
                                        : <em style={{ color:'var(--g400)' }}> — No reason given</em>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* RESOURCES */}
            {tab === 'resources' && (() => {
              const mocks = events.filter(e => e.type === 'mock');
              const sectionals = events.filter(e => e.type === 'sectional');

              const getStatus = (launch_date) => {
                const diff = new Date(launch_date) - new Date();
                if (diff <= 0) return 'live';
                if (diff < 24 * 60 * 60 * 1000) return 'today';
                return 'upcoming';
              };

              const formatDate = (launch_date) => new Date(launch_date).toLocaleString('en-IN', {
                day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit',
              });

              const EventRow = ({ ev }) => {
                const status = getStatus(ev.launch_date);
                const isLive = status === 'live';
                return (
                  <div className="card" style={{ marginBottom:'0.65rem' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{ev.name}</div>
                        <div style={{ fontSize:'0.78rem', color:'var(--g400)', marginTop:'0.2rem' }}>
                          {formatDate(ev.launch_date)}
                        </div>
                        {ev.link && isLive && (
                          <a href={ev.link} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem',
                              marginTop:'0.45rem', padding:'0.3rem 0.75rem',
                              background:'var(--red)', color:'#fff', borderRadius:6,
                              fontSize:'0.78rem', fontWeight:600, textDecoration:'none' }}>
                            Open Test ↗
                          </a>
                        )}
                        {ev.link && !isLive && (
                          <a href={ev.link} target="_blank" rel="noreferrer"
                            style={{ fontSize:'0.78rem', color:'var(--red)', marginTop:'0.25rem',
                              display:'inline-block', textDecoration:'none', fontWeight:500 }}>
                            Preview Link ↗
                          </a>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end',
                        gap:'0.45rem', flexShrink:0 }}>
                        <span className={`badge ${isLive?'badge-green':status==='today'?'badge-amber':'badge-red'}`}>
                          {isLive ? 'Live' : status === 'today' ? 'Today' : 'Upcoming'}
                        </span>
                        {isLive && (
                          ev.attempted ? (
                            <span style={{ fontSize:'0.75rem', color:'#16a34a', fontWeight:600 }}>✓ Attempted</span>
                          ) : (
                            <button
                              disabled={!!attemptingEvent[ev.id]}
                              onClick={() => markAttempted(ev.id)}
                              style={{ fontSize:'0.75rem', padding:'0.25rem 0.6rem',
                                background:'#f0fdf4', color:'#16a34a', border:'1.5px solid #86efac',
                                borderRadius:6, cursor:'pointer', fontWeight:600 }}>
                              {attemptingEvent[ev.id] ? '...' : 'Mark Attempted'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  <div className="page-header">
                    <div className="page-title">Resources</div>
                    <button className="btn btn-ghost btn-sm" onClick={loadEvents}>↻ Refresh</button>
                  </div>

                  {eventsLoading ? (
                    <div style={{ textAlign:'center', padding:'2rem' }}>
                      <span className="spinner" style={{ width:28, height:28 }} />
                    </div>
                  ) : (
                    <>
                      <p className="section-label">Mocks (iCATs)</p>
                      {mocks.length === 0
                        ? <div className="empty-state" style={{ padding:'1.25rem', marginBottom:'1rem' }}>
                            <p>No mocks scheduled yet.</p>
                          </div>
                        : mocks.map(ev => <EventRow key={ev.id} ev={ev} />)
                      }

                      <p className="section-label" style={{ marginTop:'1.25rem' }}>Sectionals</p>
                      {sectionals.length === 0
                        ? <div className="empty-state" style={{ padding:'1.25rem', marginBottom:'1rem' }}>
                            <p>No sectionals scheduled yet.</p>
                          </div>
                        : sectionals.map(ev => <EventRow key={ev.id} ev={ev} />)
                      }

                      <p className="section-label" style={{ marginTop:'1.25rem' }}>Core Philosophy</p>
                      <div className="card">
                        {['Consistency beats intensity', 'Analysis builds rank', 'Clarity creates speed'].map(p => (
                          <div key={p} style={{ display:'flex', alignItems:'center', gap:'0.5rem',
                            padding:'0.35rem 0', fontSize:'0.87rem', color:'var(--g700)' }}>
                            <span style={{ color:'var(--red)', fontWeight:700 }}>✦</span> {p}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

          </main>
        </div>
      </div>

      {/* TODAY SKIP MODAL */}
      {skipModal && (
        <div className="modal-overlay" onClick={() => setSkipModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom:'0.25rem' }}>Why did you skip?</h2>
            <p style={{ fontSize:'0.85rem', color:'var(--g600)', marginBottom:'1.5rem' }}>
              A reason is required. Without it, tomorrow's plan will be locked. Your coach will see this.
            </p>
            <div style={{ background:'var(--g100)', borderRadius:4, padding:'0.6rem 0.85rem',
              marginBottom:'1rem', fontSize:'0.85rem', fontWeight:500 }}>
              Task: {skipModal.task_name}
            </div>
            <div className="field">
              <label>Reason <span style={{ color:'var(--red)' }}>*</span></label>
              <textarea rows={4} placeholder="Be honest — your coach will review this..."
                value={skipReason} onChange={e => setSkipReason(e.target.value)} />
              {skipErr && <p className="err">{skipErr}</p>}
            </div>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setSkipModal(null)}>Cancel</button>
              <button className="btn btn-red" style={{ flex:1 }} onClick={submitSkip}>Submit & Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* YESTERDAY SKIP MODAL */}
      {yesterdaySkipModal && (
        <div className="modal-overlay" onClick={() => setYesterdaySkipModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom:'0.25rem' }}>Why did you skip this?</h2>
            <p style={{ fontSize:'0.85rem', color:'var(--g600)', marginBottom:'1.5rem' }}>
              A reason is <strong>required</strong> to unlock today's plan. Your coach will review this.
            </p>
            <div style={{ background:'var(--g100)', borderRadius:4, padding:'0.6rem 0.85rem',
              marginBottom:'1rem', fontSize:'0.85rem', fontWeight:500 }}>
              <div>{yesterdaySkipModal.task_name}</div>
              <div style={{ fontSize:'0.77rem', color:'var(--g500)', marginTop:'0.2rem' }}>{yesterdayDateLabel}</div>
            </div>
            <div className="field">
              <label>Reason <span style={{ color:'var(--red)' }}>*</span></label>
              <textarea rows={4}
                placeholder="Explain why you couldn't complete this task..."
                value={yesterdaySkipReason}
                onChange={e => setYesterdaySkipReason(e.target.value)} />
              {yesterdaySkipErr && <p className="err">{yesterdaySkipErr}</p>}
            </div>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex:1 }}
                onClick={() => setYesterdaySkipModal(null)}>Cancel</button>
              <button className="btn btn-red" style={{ flex:1 }} onClick={submitYesterdaySkip}>
                Submit &amp; Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
