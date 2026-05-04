import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from './_app';

const TAG_LABELS = { varc: 'VARC', lrdi: 'LRDI', qa: 'QA', mock: 'MOCK' };

// ── Small reusable modal shell ──────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = 460 }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.48)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'var(--radius)', padding:'1.75rem',
        width:'100%', maxWidth, boxShadow:'0 12px 40px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
          <div style={{ fontFamily:'var(--serif)', fontSize:'1.1rem', fontWeight:700 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:'1.2rem', color:'var(--g400)', lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom:'0.85rem' }}>
      <label style={{ display:'block', fontSize:'0.76rem', fontWeight:600, color:'var(--g500)',
        textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.3rem' }}>{label}</label>
      {children}
    </div>
  );
}

function ModalInput({ style, ...props }) {
  return (
    <input style={{ width:'100%', padding:'0.5rem 0.75rem', border:'1.5px solid var(--g200)',
      borderRadius:'var(--radius)', fontFamily:'var(--sans)', fontSize:'0.9rem',
      outline:'none', boxSizing:'border-box', ...style }} {...props} />
  );
}

function ModalSelect({ style, children, ...props }) {
  return (
    <select style={{ width:'100%', padding:'0.5rem 0.75rem', border:'1.5px solid var(--g200)',
      borderRadius:'var(--radius)', fontFamily:'var(--sans)', fontSize:'0.9rem',
      outline:'none', background:'#fff', boxSizing:'border-box', ...style }} {...props}>
      {children}
    </select>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Admin() {
  const { auth, logout, toast, apiFetch } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [overview, setOverview] = useState(null);

  // Student detail panel
  const [selected, setSelected] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [detailTab, setDetailTab] = useState('plan'); // 'plan' | 'history'

  // Plan editing
  const [editTasks, setEditTasks] = useState([]);
  const [editTrack, setEditTrack] = useState('8H');
  const [newTask, setNewTask] = useState({ time_slot: '', task_name: '', tag: 'varc' });
  const [saving, setSaving] = useState(false);

  // Personalized planner generator
  const [showPlanner, setShowPlanner] = useState(false);
  const [plannerForm, setPlannerForm] = useState({
    hours: 6,
    startTime: '07:30',
    varc: 40,
    lrdi: 30,
    qa: 30,
    includeLiveSession: true,
    includeDoubtResolution: true,
  });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', track: '8H' });
  const [creating, setCreating] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(null); // student object
  const [deleting, setDeleting] = useState(false);

  const [showUnlockModal, setShowUnlockModal] = useState(null); // student object
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Events (mocks + sectionals)
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = create, object = edit
  const [eventForm, setEventForm] = useState({ type: 'mock', name: '', launch_date: '', link: '' });
  const [savingEvent, setSavingEvent] = useState(false);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // ── Auth guard
  useEffect(() => {
    if (!auth) { router.replace('/'); return; }
    if (auth.role !== 'admin') { router.replace('/dashboard'); return; }
    loadStudents();
  }, [auth]);

  // ── Data loaders
  const loadStudents = useCallback(async () => {
    try {
      const d = await apiFetch('/api/admin/students');
      setStudents(d.students || []);
    } catch (e) { toast(e.message); }
  }, [apiFetch]);

  const loadOverview = useCallback(async () => {
    try {
      const d = await apiFetch('/api/admin/overview');
      setOverview(d.logs || []);
    } catch {}
  }, [apiFetch]);

  useEffect(() => { if (tab === 'overview') loadOverview(); }, [tab]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const d = await apiFetch('/api/admin/events');
      setEvents(d.events || []);
    } catch (e) { toast(e.message); }
    setEventsLoading(false);
  }, [apiFetch]);

  useEffect(() => { if (tab === 'schedule') loadEvents(); }, [tab]);

  const selectStudent = useCallback(async (sid) => {
    setSelected(sid);
    setLoadingPlan(true);
    setDetailTab('plan');
    try {
      const d = await apiFetch(`/api/admin/student-plan?studentId=${sid}`);
      setPlanData(d);
      setEditTasks(JSON.parse(JSON.stringify(d.tasks || [])));
      setEditTrack(d.student?.track || '8H');
    } catch (e) { toast(e.message); }
    setLoadingPlan(false);
  }, [apiFetch]);

  // ── Plan editing
  const savePlan = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/student-plan?studentId=${selected}`, {
        method: 'PUT',
        body: JSON.stringify({ track: editTrack, tasks: editTasks }),
      });
      toast('Plan saved!');
      loadStudents();
      selectStudent(selected);
    } catch (e) { toast(e.message); }
    setSaving(false);
  };

  const addTask = () => {
    if (!newTask.task_name.trim()) { toast('Enter a task name.'); return; }
    setEditTasks(prev => [...prev, { ...newTask, is_required: true, task_order: prev.length + 1 }]);
    setNewTask({ time_slot: '', task_name: '', tag: 'varc' });
  };
  const removeTask = i => setEditTasks(prev => prev.filter((_, idx) => idx !== i));
  const updateTask = (i, key, val) => setEditTasks(prev => prev.map((t, idx) => idx === i ? { ...t, [key]: val } : t));

  // ── Create student
  const createStudent = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast('Name, email, and password are required.'); return;
    }
    setCreating(true);
    try {
      await apiFetch('/api/admin/create-student', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      toast(`Student "${createForm.name}" created!`);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', track: '8H' });
      loadStudents();
    } catch (e) { toast(e.message); }
    setCreating(false);
  };

  // ── Delete student
  const deleteStudent = async () => {
    if (!showDeleteModal) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/delete-student?studentId=${showDeleteModal.id}`, { method: 'DELETE' });
      toast(`${showDeleteModal.name} deleted.`);
      setShowDeleteModal(null);
      if (selected === showDeleteModal.id) { setSelected(null); setPlanData(null); }
      loadStudents();
    } catch (e) { toast(e.message); }
    setDeleting(false);
  };

  // ── Unlock today for student
  const unlockStudent = async () => {
    if (!showUnlockModal || !unlockReason.trim()) {
      toast('Please provide a reason for the unlock.'); return;
    }
    setUnlocking(true);
    try {
      await apiFetch('/api/admin/unlock-student', {
        method: 'POST',
        body: JSON.stringify({ studentId: showUnlockModal.id, reason: unlockReason }),
      });
      toast(`${showUnlockModal.name}'s today is now unlocked.`);
      setShowUnlockModal(null);
      setUnlockReason('');
      loadStudents();
      if (selected === showUnlockModal.id) selectStudent(showUnlockModal.id);
    } catch (e) { toast(e.message); }
    setUnlocking(false);
  };

  // ── Event CRUD ─────────────────────────────────────────────────────────────
  const openCreateEvent = (type) => {
    setEditingEvent(null);
    setEventForm({ type, name: '', launch_date: '', link: '' });
    setShowEventModal(true);
  };

  const openEditEvent = (ev) => {
    setEditingEvent(ev);
    // Format datetime-local value
    const dt = new Date(ev.launch_date);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    setEventForm({ type: ev.type, name: ev.name, launch_date: local, link: ev.link || '' });
    setShowEventModal(true);
  };

  const saveEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.launch_date) {
      toast('Name and date are required.'); return;
    }
    setSavingEvent(true);
    try {
      if (editingEvent) {
        await apiFetch('/api/admin/events', {
          method: 'PUT',
          body: JSON.stringify({ id: editingEvent.id, ...eventForm }),
        });
        toast('Event updated!');
      } else {
        await apiFetch('/api/admin/events', {
          method: 'POST',
          body: JSON.stringify(eventForm),
        });
        toast('Event added!');
      }
      setShowEventModal(false);
      loadEvents();
    } catch (e) { toast(e.message); }
    setSavingEvent(false);
  };

  const deleteEvent = async () => {
    if (!showDeleteEventModal) return;
    setDeletingEvent(true);
    try {
      await apiFetch(`/api/admin/events?id=${showDeleteEventModal.id}`, { method: 'DELETE' });
      toast('Event deleted.');
      setShowDeleteEventModal(null);
      loadEvents();
    } catch (e) { toast(e.message); }
    setDeletingEvent(false);
  };

  // ── Personalized plan generator ────────────────────────────────────────────
  const generatePlan = () => {
    const { hours, startTime, varc, lrdi, qa, includeLiveSession, includeDoubtResolution } = plannerForm;
    const totalMins = hours * 60;
    const tasks = [];

    // Parse start time
    const [sh, sm] = startTime.split(':').map(Number);
    let cursor = sh * 60 + sm; // minutes from midnight

    const addSlot = (minsFromMidnight) => {
      const h = Math.floor(minsFromMidnight / 60) % 24;
      const m = minsFromMidnight % 60;
      return `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    };

    let remaining = totalMins;

    // Always start with Live Session (90 min) if checked
    if (includeLiveSession && remaining >= 90) {
      tasks.push({ time_slot: addSlot(cursor), task_name: 'Live Session', tag: 'varc', is_required: true });
      cursor += 90; remaining -= 90;
      // 15 min break
      cursor += 15; remaining -= 15;
    }

    // Distribute remaining time by weights
    const varcMins = Math.floor((remaining * varc) / 100);
    const lrdiMins = Math.floor((remaining * lrdi) / 100);
    const qaMins   = remaining - varcMins - lrdiMins;

    // VARC block — reading cycles
    if (varcMins >= 60) {
      const cycles = Math.min(3, Math.floor(varcMins / 60));
      const label = cycles === 1 ? 'Reading + RC Practice' : `Reading Cycles (×${cycles}) + RC`;
      tasks.push({ time_slot: addSlot(cursor), task_name: label, tag: 'varc', is_required: true });
      cursor += cycles * 60; remaining -= cycles * 60;
      cursor += 15;
    }

    // Daily Quiz (always, 30 min)
    if (remaining >= 30) {
      tasks.push({ time_slot: addSlot(cursor), task_name: 'Daily Quiz (Timed)', tag: 'qa', is_required: true });
      cursor += 30; remaining -= 30;
      cursor += 10;
    }

    // Doubt Resolution (optional, 45 min)
    if (includeDoubtResolution && remaining >= 45) {
      tasks.push({ time_slot: addSlot(cursor), task_name: 'Doubt Resolution', tag: 'varc', is_required: false });
      cursor += 45; remaining -= 45;
      cursor += 15;
    }

    // LRDI block
    if (lrdiMins >= 60) {
      const sets = Math.min(4, Math.max(1, Math.floor(lrdiMins / 45)));
      const label = sets === 1 ? 'LRDI Set (1 set)' : `LRDI Sets (${sets} sets)`;
      tasks.push({ time_slot: addSlot(cursor), task_name: label, tag: 'lrdi', is_required: true });
      cursor += sets * 45; remaining -= sets * 45;
      cursor += 15;
    }

    // QA block
    if (qaMins >= 60) {
      const depth = qaMins >= 90 ? 'QA Area Practice + Deep Analysis' : 'QA Area Practice';
      tasks.push({ time_slot: addSlot(cursor), task_name: depth, tag: 'qa', is_required: true });
      cursor += Math.min(qaMins, 90);
      cursor += 10;
    }

    // Extra VARC if lots of time left
    if (remaining >= 60 && varc > 30) {
      tasks.push({ time_slot: addSlot(cursor), task_name: 'Extra Reading + Vocabulary', tag: 'varc', is_required: false });
    }

    // Apply track label
    const trackLabel = hours <= 5 ? '6H' : hours <= 8 ? '8H' : '10H';
    setEditTrack(trackLabel);
    setEditTasks(tasks.map((t, i) => ({ ...t, task_order: i + 1 })));
    setShowPlanner(false);
    toast(`Generated ${tasks.length}-task plan for ${hours}H · review and save below.`);
  };

  if (!auth) return null;

  // ── Overview helpers
  const overviewByStudent = {};
  if (overview) {
    overview.forEach(l => {
      if (!overviewByStudent[l.student_id]) overviewByStudent[l.student_id] = [];
      overviewByStudent[l.student_id].push(l);
    });
  }

  // ── History helpers for selected student
  const historyByDate = {};
  const taskMap = {};
  if (planData) {
    (planData.tasks || []).forEach(t => { taskMap[t.id] = t; });
    (planData.logs || []).forEach(l => {
      if (!historyByDate[l.log_date]) historyByDate[l.log_date] = [];
      historyByDate[l.log_date].push(l);
    });
  }
  const historyDates = Object.keys(historyByDate).sort().reverse();

  const inlineInput = {
    padding: '0.32rem 0.5rem', border: '1px solid var(--g200)', borderRadius: 4,
    fontSize: '0.82rem', fontFamily: 'var(--sans)', outline: 'none', background: '#fff',
  };

  return (
    <>
      <Head><title>Admin — GRADSKOOL</title></Head>
      <div className="app-shell">

        {/* Nav */}
        <nav className="app-nav">
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div className="logo">GRAD<span>SKOOL</span></div>
            <span style={{ background:'var(--red)', color:'#fff', padding:'0.15rem 0.55rem',
              borderRadius:10, fontSize:'0.7rem', fontFamily:'var(--sans)', fontWeight:600 }}>ADMIN</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div className="avatar" style={{ background:'var(--g700)' }}>A</div>
            <span style={{ color:'#fff', fontSize:'0.88rem' }}>Admin</span>
            <button className="btn btn-sm" style={{ color:'var(--g400)', background:'transparent',
              border:'1px solid #333', fontSize:'0.78rem' }}
              onClick={() => { logout(); router.replace('/'); }}>Logout</button>
          </div>
        </nav>

        <div className="app-body">

          {/* Sidebar */}
          <aside className="sidebar">
            {[
              { key:'students', icon:'👥', label:'Students' },
              { key:'schedule', icon:'🗓️', label:'Schedule' },
              { key:'overview', icon:'📊', label:'Overview' },
            ].map(s => (
              <div key={s.key} className={`side-item ${tab === s.key ? 'active' : ''}`}
                onClick={() => { setTab(s.key); setSelected(null); setPlanData(null); }}>
                {s.icon} {s.label}
              </div>
            ))}
            <div className="side-footer">
              <div style={{ fontSize:'0.73rem', color:'var(--g400)' }}>{students.length} students enrolled</div>
            </div>
          </aside>

          <main className="main">

            {/* ══ STUDENTS ══════════════════════════════════════════════════ */}
            {tab === 'students' && (
              <>
                <div className="page-header">
                  <div className="page-title">Students</div>
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={loadStudents}>↻ Refresh</button>
                    <button className="btn btn-sm"
                      style={{ background:'var(--red)', color:'#fff', border:'none' }}
                      onClick={() => setShowCreateModal(true)}>+ Add Student</button>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns: selected ? '260px 1fr' : '1fr', gap:'1.25rem' }}>

                  {/* ── Student list ── */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
                    {students.length === 0 && (
                      <div className="empty-state">
                        <div className="icon">👤</div>
                        <p>No students yet. Add one above.</p>
                      </div>
                    )}
                    {students.map(s => {
                      const pct = s.totalTasks ? Math.round((s.todayDone / s.totalTasks) * 100) : 0;
                      const isSelected = selected === s.id;
                      return (
                        <div key={s.id}
                          style={{ display:'flex', alignItems:'center', gap:'0.7rem',
                            padding:'0.8rem 0.9rem',
                            background: isSelected ? 'var(--red-light)' : '#fff',
                            border:`1px solid ${isSelected ? 'var(--red)' : 'var(--g200)'}`,
                            borderRadius:'var(--radius)', cursor:'pointer', transition:'all 0.12s' }}
                          onClick={() => selectStudent(s.id)}>
                          <div className="avatar"
                            style={{ background: isSelected ? 'var(--red)' : 'var(--g200)',
                              color: isSelected ? '#fff' : 'var(--g700)', flexShrink:0 }}>
                            {s.name[0].toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:500, fontSize:'0.88rem',
                              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize:'0.74rem', color:'var(--g400)', marginTop:'0.1rem' }}>
                              {s.track} · {s.email}
                            </div>
                            <div className="progress-bar" style={{ marginTop:'0.3rem' }}>
                              <div className={`progress-fill ${pct===100?'green':''}`} style={{ width:`${pct}%` }} />
                            </div>
                          </div>
                          <span className={`badge ${pct===100?'badge-green':pct>=50?'badge-amber':'badge-red'}`}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Student detail panel ── */}
                  {selected && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                      {loadingPlan ? (
                        <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
                          <span className="spinner" style={{ width:28, height:28 }} />
                        </div>
                      ) : planData ? (
                        <>
                          {/* Detail header */}
                          <div className="card" style={{ padding:'1rem 1.25rem' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                              <div className="avatar" style={{ background:'var(--red)', color:'#fff', width:40, height:40, fontSize:'1.1rem' }}>
                                {planData.student?.name[0].toUpperCase()}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:600, fontSize:'0.95rem' }}>{planData.student?.name}</div>
                                <div style={{ fontSize:'0.78rem', color:'var(--g400)', marginTop:'0.1rem' }}>
                                  {planData.student?.email} · {planData.student?.track} Track
                                </div>
                              </div>
                              <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                                {/* Lock / unlock badge */}
                                {planData.todayUnlocked ? (
                                  <span className="badge badge-green">Today Unlocked</span>
                                ) : (
                                  <button className="btn btn-sm"
                                    style={{ background:'#fef3c7', color:'#b45309', border:'1px solid #fcd34d', fontSize:'0.76rem' }}
                                    onClick={() => { setShowUnlockModal(planData.student); setUnlockReason(''); }}>
                                    🔒 Unlock Today
                                  </button>
                                )}
                                <button className="btn btn-sm"
                                  style={{ background:'var(--red-light)', color:'var(--red)', border:'1px solid var(--red)', fontSize:'0.76rem' }}
                                  onClick={() => setShowDeleteModal(planData.student)}>
                                  Delete
                                </button>
                                <button className="btn btn-ghost btn-sm"
                                  onClick={() => { setSelected(null); setPlanData(null); }}>✕</button>
                              </div>
                            </div>
                          </div>

                          {/* Detail sub-tabs */}
                          <div style={{ display:'flex', gap:'0.35rem' }}>
                            {[{ k:'plan', l:'Edit Plan' }, { k:'history', l:'14-Day History' }].map(t => (
                              <button key={t.k} onClick={() => setDetailTab(t.k)}
                                className={`btn btn-sm ${detailTab === t.k ? 'btn-red' : 'btn-ghost'}`}>
                                {t.l}
                              </button>
                            ))}
                          </div>

                          {/* ── Plan editor ── */}
                          {detailTab === 'plan' && (
                            <div className="card">
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.85rem' }}>
                                <div className="field" style={{ flex:1, marginBottom:0, marginRight:'0.75rem' }}>
                                  <label>Study Track</label>
                                  <select value={editTrack} onChange={e => setEditTrack(e.target.value)}>
                                    <option value="6H">6-Hour Track</option>
                                    <option value="8H">8-Hour Track</option>
                                    <option value="10H">10-Hour Track</option>
                                    <option value="custom">Custom / Personalized</option>
                                  </select>
                                </div>
                                <div style={{ flexShrink:0, paddingTop:'1.35rem' }}>
                                  <button
                                    className="btn btn-sm"
                                    style={{ background:'linear-gradient(135deg,#7c3aed,#db2777)', color:'#fff', border:'none', whiteSpace:'nowrap' }}
                                    onClick={() => setShowPlanner(true)}>
                                    ✦ Auto-Generate Plan
                                  </button>
                                </div>
                              </div>

                              <p className="section-label">Tasks</p>

                              {editTasks.length === 0 && (
                                <div style={{ fontSize:'0.83rem', color:'var(--g400)', padding:'0.5rem 0', marginBottom:'0.5rem' }}>
                                  No tasks yet. Add one below.
                                </div>
                              )}

                              {editTasks.map((task, i) => (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.4rem',
                                  padding:'0.5rem 0', borderBottom:'1px solid var(--g100)' }}>
                                  <input value={task.time_slot}
                                    onChange={e => updateTask(i, 'time_slot', e.target.value)}
                                    placeholder="Time" style={{ ...inlineInput, width:82 }} />
                                  <input value={task.task_name}
                                    onChange={e => updateTask(i, 'task_name', e.target.value)}
                                    placeholder="Task name" style={{ ...inlineInput, flex:1 }} />
                                  <select value={task.tag} onChange={e => updateTask(i, 'tag', e.target.value)}
                                    style={{ ...inlineInput, width:72 }}>
                                    {Object.entries(TAG_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                                  </select>
                                  <button onClick={() => removeTask(i)}
                                    style={{ width:26, height:26, borderRadius:4, border:'none',
                                      background:'var(--red-light)', color:'var(--red)', cursor:'pointer',
                                      fontSize:'0.82rem', display:'flex', alignItems:'center', justifyContent:'center',
                                      flexShrink:0 }}>✕</button>
                                </div>
                              ))}

                              {/* Add task row */}
                              <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.65rem', alignItems:'center' }}>
                                <input value={newTask.time_slot}
                                  onChange={e => setNewTask(p => ({ ...p, time_slot: e.target.value }))}
                                  placeholder="Time" style={{ ...inlineInput, width:82 }} />
                                <input value={newTask.task_name}
                                  onChange={e => setNewTask(p => ({ ...p, task_name: e.target.value }))}
                                  placeholder="New task name" style={{ ...inlineInput, flex:1 }}
                                  onKeyDown={e => e.key === 'Enter' && addTask()} />
                                <select value={newTask.tag} onChange={e => setNewTask(p => ({ ...p, tag: e.target.value }))}
                                  style={{ ...inlineInput, width:72 }}>
                                  {Object.entries(TAG_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                                <button className="btn btn-red btn-sm" onClick={addTask} style={{ flexShrink:0 }}>+ Add</button>
                              </div>

                              <button className="btn btn-red" style={{ width:'100%', marginTop:'1.1rem' }}
                                onClick={savePlan} disabled={saving}>
                                {saving ? <span className="spinner" style={{ width:16, height:16 }} /> : 'Save Plan'}
                              </button>
                            </div>
                          )}

                          {/* ── 14-Day history ── */}
                          {detailTab === 'history' && (
                            <div>
                              {historyDates.length === 0 ? (
                                <div className="empty-state">
                                  <div className="icon">📅</div>
                                  <p>No activity in the last 14 days.</p>
                                </div>
                              ) : historyDates.map(date => {
                                const dayLogs = historyByDate[date];
                                const done = dayLogs.filter(l => l.status === 'done').length;
                                const skipped = dayLogs.filter(l => l.status === 'skipped').length;
                                const total = (planData.tasks || []).length;
                                const pct = total ? Math.round(((done + skipped) / total) * 100) : 0;
                                const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
                                  weekday:'short', day:'numeric', month:'short'
                                });
                                const skippedWithReason = dayLogs.filter(l => l.status === 'skipped');
                                return (
                                  <div key={date} className="card" style={{ marginBottom:'0.6rem' }}>
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.4rem' }}>
                                      <strong style={{ fontSize:'0.88rem' }}>{dateLabel}</strong>
                                      <span className={`badge ${pct===100?'badge-green':pct>=50?'badge-amber':'badge-red'}`}>{pct}%</span>
                                    </div>
                                    <div style={{ fontSize:'0.78rem', color:'var(--g500)', marginBottom:'0.4rem' }}>
                                      {done} done · {skipped} skipped · {Math.max(0, total - done - skipped)} missed
                                    </div>
                                    <div className="progress-bar">
                                      <div className={`progress-fill ${pct===100?'green':''}`} style={{ width:`${pct}%` }} />
                                    </div>
                                    {skippedWithReason.map((l, i) => {
                                      const taskName = taskMap[l.task_id]?.task_name || 'Task';
                                      return (
                                        <div key={i} style={{ marginTop:'0.45rem', padding:'0.4rem 0.65rem',
                                          background:'var(--red-light)', borderRadius:4,
                                          borderLeft:'3px solid var(--red)', fontSize:'0.78rem', color:'var(--g700)' }}>
                                          <strong>{taskName}</strong>
                                          {' — '}
                                          {l.skip_reason || <em style={{ color:'var(--g400)' }}>No reason given</em>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══ SCHEDULE ══════════════════════════════════════════════════ */}
            {tab === 'schedule' && (() => {
              const mocks = events.filter(e => e.type === 'mock');
              const sectionals = events.filter(e => e.type === 'sectional');

              const getStatus = (launch_date) => {
                const now = new Date();
                const d = new Date(launch_date);
                const diff = d - now;
                if (diff <= 0) return 'live';
                if (diff < 24 * 60 * 60 * 1000) return 'today';
                return 'upcoming';
              };

              const formatDate = (launch_date) => {
                return new Date(launch_date).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                });
              };

              const EventCard = ({ ev }) => {
                const status = getStatus(ev.launch_date);
                return (
                  <div className="card" style={{ marginBottom:'0.65rem' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{ev.name}</div>
                        <div style={{ fontSize:'0.78rem', color:'var(--g400)', marginTop:'0.2rem' }}>
                          {formatDate(ev.launch_date)}
                        </div>
                        {ev.link && (
                          <a href={ev.link} target="_blank" rel="noreferrer"
                            style={{ fontSize:'0.78rem', color:'var(--red)', marginTop:'0.25rem',
                              display:'inline-block', textDecoration:'none', fontWeight:500 }}>
                            Open Link ↗
                          </a>
                        )}
                        {ev.attemptCount > 0 && (
                          <div style={{ fontSize:'0.74rem', color:'var(--g400)', marginTop:'0.2rem' }}>
                            {ev.attemptCount} student{ev.attemptCount !== 1 ? 's' : ''} attempted
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.4rem', flexShrink:0 }}>
                        <span className={`badge ${status==='live'?'badge-green':status==='today'?'badge-amber':'badge-red'}`}>
                          {status==='live'?'Live':status==='today'?'Today':'Upcoming'}
                        </span>
                        <div style={{ display:'flex', gap:'0.35rem' }}>
                          <button className="btn btn-ghost btn-sm"
                            style={{ fontSize:'0.72rem', padding:'0.2rem 0.5rem' }}
                            onClick={() => openEditEvent(ev)}>Edit</button>
                          <button className="btn btn-sm"
                            style={{ fontSize:'0.72rem', padding:'0.2rem 0.5rem',
                              background:'var(--red-light)', color:'var(--red)', border:'1px solid var(--red)' }}
                            onClick={() => setShowDeleteEventModal(ev)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  <div className="page-header">
                    <div className="page-title">Schedule</div>
                    <button className="btn btn-ghost btn-sm" onClick={loadEvents}>↻ Refresh</button>
                  </div>

                  {eventsLoading ? (
                    <div style={{ textAlign:'center', padding:'3rem' }}>
                      <span className="spinner" style={{ width:28, height:28 }} />
                    </div>
                  ) : (
                    <>
                      {/* Mocks */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.65rem' }}>
                        <p className="section-label" style={{ margin:0 }}>Mocks (iCATs)</p>
                        <button className="btn btn-sm btn-red"
                          onClick={() => openCreateEvent('mock')}>+ Add Mock</button>
                      </div>
                      {mocks.length === 0 ? (
                        <div className="empty-state" style={{ padding:'1.5rem', marginBottom:'1.25rem' }}>
                          <div className="icon" style={{ fontSize:'1.5rem' }}>📝</div>
                          <p>No mocks added yet.</p>
                        </div>
                      ) : mocks.map(ev => <EventCard key={ev.id} ev={ev} />)}

                      {/* Sectionals */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                        marginTop:'1.5rem', marginBottom:'0.65rem' }}>
                        <p className="section-label" style={{ margin:0 }}>Sectionals</p>
                        <button className="btn btn-sm btn-red"
                          onClick={() => openCreateEvent('sectional')}>+ Add Sectional</button>
                      </div>
                      {sectionals.length === 0 ? (
                        <div className="empty-state" style={{ padding:'1.5rem' }}>
                          <div className="icon" style={{ fontSize:'1.5rem' }}>📋</div>
                          <p>No sectionals added yet.</p>
                        </div>
                      ) : sectionals.map(ev => <EventCard key={ev.id} ev={ev} />)}
                    </>
                  )}
                </>
              );
            })()}

            {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
            {tab === 'overview' && (
              <>
                <div className="page-header">
                  <div className="page-title">Student Overview</div>
                  <button className="btn btn-ghost btn-sm" onClick={loadOverview}>↻ Refresh</button>
                </div>
                {!overview ? (
                  <div style={{ textAlign:'center', padding:'3rem' }}><span className="spinner" style={{ width:28, height:28 }} /></div>
                ) : students.length === 0 ? (
                  <div className="empty-state"><div className="icon">📊</div><p>No students yet.</p></div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    {students.map(s => {
                      const logs = overviewByStudent[s.id] || [];
                      const done = logs.filter(l => l.status === 'done').length;
                      const skipped = logs.filter(l => l.status === 'skipped').length;
                      const total = logs.length;
                      const overall = total ? Math.round(((done + skipped) / total) * 100) : 0;
                      const todayPct = s.totalTasks ? Math.round((s.todayDone / s.totalTasks) * 100) : 0;
                      const skipsWithReason = logs.filter(l => l.status === 'skipped' && l.skip_reason);
                      return (
                        <div key={s.id} className="card">
                          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.65rem' }}>
                            <div className="avatar">{s.name[0].toUpperCase()}</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:500 }}>{s.name}</div>
                              <div style={{ fontSize:'0.76rem', color:'var(--g400)' }}>{s.track} Track · {s.email}</div>
                            </div>
                            <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.25rem' }}>
                              <span className={`badge ${todayPct===100?'badge-green':todayPct>=50?'badge-amber':'badge-red'}`}>
                                Today {todayPct}%
                              </span>
                              <div style={{ fontSize:'0.73rem', color:'var(--g400)' }}>14d avg {overall}%</div>
                            </div>
                          </div>
                          <div className="progress-bar">
                            <div className={`progress-fill ${overall>=80?'green':''}`} style={{ width:`${overall}%` }} />
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.5rem',
                            marginTop:'0.65rem', textAlign:'center' }}>
                            {[
                              { n: done,                    l:'Done',    c:'#22c55e' },
                              { n: skipped,                 l:'Skipped', c:'var(--red)' },
                              { n: total - done - skipped,  l:'Missed',  c:'var(--g400)' },
                            ].map(x => (
                              <div key={x.l} style={{ background:'var(--g50)', borderRadius:4, padding:'0.45rem' }}>
                                <div style={{ fontSize:'1.1rem', fontWeight:700, color:x.c }}>{x.n}</div>
                                <div style={{ fontSize:'0.71rem', color:'var(--g400)' }}>{x.l}</div>
                              </div>
                            ))}
                          </div>
                          {/* Skip reasons */}
                          {skipsWithReason.length > 0 && (
                            <div style={{ marginTop:'0.65rem', display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                              <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--g400)',
                                textTransform:'uppercase', letterSpacing:'0.05em' }}>Recent Skip Reasons</div>
                              {skipsWithReason.slice(-3).reverse().map((l, i) => (
                                <div key={i} style={{ fontSize:'0.78rem', padding:'0.35rem 0.6rem',
                                  background:'var(--red-light)', borderRadius:4,
                                  borderLeft:'3px solid var(--red)', color:'var(--g700)' }}>
                                  <strong>{l.log_date}</strong> — {l.skip_reason}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </main>
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Create Student */}
      {showCreateModal && (
        <Modal title="Add New Student" onClose={() => setShowCreateModal(false)}>
          <FieldRow label="Name">
            <ModalInput placeholder="Full name" value={createForm.name}
              onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Email">
            <ModalInput type="email" placeholder="student@email.com" value={createForm.email}
              onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Password">
            <ModalInput type="password" placeholder="Min. 6 characters" value={createForm.password}
              onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Track">
            <ModalSelect value={createForm.track} onChange={e => setCreateForm(f => ({ ...f, track: e.target.value }))}>
              <option value="6H">6H Track</option>
              <option value="8H">8H Track</option>
              <option value="10H">10H Track</option>
              <option value="custom">Custom / Personalized</option>
            </ModalSelect>
          </FieldRow>
          <div style={{ display:'flex', gap:'0.65rem', marginTop:'1.25rem', justifyContent:'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-sm btn-red" onClick={createStudent} disabled={creating}>
              {creating ? 'Creating…' : 'Create Student'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Student */}
      {showDeleteModal && (
        <Modal title="Delete Student" onClose={() => setShowDeleteModal(null)} maxWidth={380}>
          <p style={{ fontSize:'0.9rem', color:'var(--g700)', marginBottom:'1.25rem' }}>
            This will permanently delete <strong>{showDeleteModal.name}</strong> and all their task history.
            This cannot be undone.
          </p>
          <div style={{ display:'flex', gap:'0.65rem', justifyContent:'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteModal(null)}>Cancel</button>
            <button className="btn btn-sm" style={{ background:'var(--red)', color:'#fff', border:'none' }}
              onClick={deleteStudent} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </div>
        </Modal>
      )}

      {/* Unlock Today */}
      {showUnlockModal && (
        <Modal title={`Unlock Today for ${showUnlockModal.name}`} onClose={() => setShowUnlockModal(null)} maxWidth={420}>
          <p style={{ fontSize:'0.85rem', color:'var(--g600)', marginBottom:'1rem' }}>
            This will mark all of yesterday's pending tasks as skipped with your reason,
            unlocking today's plan for this student.
          </p>
          <FieldRow label="Reason for unlock">
            <textarea
              rows={3}
              placeholder="e.g. Student was unwell, internet outage, family emergency..."
              value={unlockReason}
              onChange={e => setUnlockReason(e.target.value)}
              style={{ width:'100%', padding:'0.5rem 0.75rem', border:'1.5px solid var(--g200)',
                borderRadius:'var(--radius)', fontFamily:'var(--sans)', fontSize:'0.88rem',
                outline:'none', resize:'vertical', boxSizing:'border-box' }}
            />
          </FieldRow>
          <div style={{ display:'flex', gap:'0.65rem', justifyContent:'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowUnlockModal(null)}>Cancel</button>
            <button className="btn btn-sm" style={{ background:'#f59e0b', color:'#fff', border:'none' }}
              onClick={unlockStudent} disabled={unlocking || !unlockReason.trim()}>
              {unlocking ? 'Unlocking…' : '🔓 Unlock Today'}
            </button>
          </div>
        </Modal>
      )}
      {/* ── Add / Edit Event Modal ── */}
      {showEventModal && (
        <Modal
          title={editingEvent
            ? `Edit ${editingEvent.type === 'mock' ? 'Mock' : 'Sectional'}`
            : `Add ${eventForm.type === 'mock' ? 'Mock' : 'Sectional'}`}
          onClose={() => setShowEventModal(false)}>
          <FieldRow label="Name">
            <ModalInput
              placeholder={eventForm.type === 'mock' ? 'e.g. iCAT 31' : 'e.g. Sectional 11 – VARC, DILR, QA'}
              value={eventForm.name}
              onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Launch Date & Time">
            <ModalInput
              type="datetime-local"
              value={eventForm.launch_date}
              onChange={e => setEventForm(f => ({ ...f, launch_date: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Link (optional)">
            <ModalInput
              type="url"
              placeholder="https://icat.iim.ac.in/..."
              value={eventForm.link}
              onChange={e => setEventForm(f => ({ ...f, link: e.target.value }))} />
          </FieldRow>
          <div style={{ display:'flex', gap:'0.65rem', marginTop:'1.25rem', justifyContent:'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEventModal(false)}>Cancel</button>
            <button className="btn btn-sm btn-red" onClick={saveEvent} disabled={savingEvent}>
              {savingEvent ? 'Saving…' : editingEvent ? 'Save Changes' : 'Add Event'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Event Confirmation ── */}
      {showDeleteEventModal && (
        <Modal title="Delete Event" onClose={() => setShowDeleteEventModal(null)} maxWidth={380}>
          <p style={{ fontSize:'0.9rem', color:'var(--g700)', marginBottom:'1.25rem' }}>
            Permanently delete <strong>{showDeleteEventModal.name}</strong>?
            All student attempt records will also be removed.
          </p>
          <div style={{ display:'flex', gap:'0.65rem', justifyContent:'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteEventModal(null)}>Cancel</button>
            <button className="btn btn-sm" style={{ background:'var(--red)', color:'#fff', border:'none' }}
              onClick={deleteEvent} disabled={deletingEvent}>
              {deletingEvent ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </div>
        </Modal>
      )}
      {/* ── Personalized Plan Generator Modal ── */}
      {showPlanner && (
        <Modal title="✦ Auto-Generate Personalized Plan" onClose={() => setShowPlanner(false)} maxWidth={500}>
          <p style={{ fontSize:'0.84rem', color:'var(--g600)', marginBottom:'1.25rem', lineHeight:1.6 }}>
            Set the student's available hours, start time, and subject focus. A full task schedule will be generated and loaded into the plan editor for you to review and save.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
            <FieldRow label="Total Study Hours">
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <input
                  type="range" min={2} max={14} step={0.5}
                  value={plannerForm.hours}
                  onChange={e => setPlannerForm(f => ({ ...f, hours: parseFloat(e.target.value) }))}
                  style={{ flex:1 }} />
                <span style={{ minWidth:36, fontWeight:700, color:'var(--red)', fontSize:'1rem' }}>
                  {plannerForm.hours}H
                </span>
              </div>
            </FieldRow>
            <FieldRow label="Start Time">
              <input
                type="time"
                value={plannerForm.startTime}
                onChange={e => setPlannerForm(f => ({ ...f, startTime: e.target.value }))}
                style={{ width:'100%', padding:'0.5rem 0.75rem', border:'1.5px solid var(--g200)',
                  borderRadius:'var(--radius)', fontFamily:'var(--sans)', fontSize:'0.9rem', outline:'none' }} />
            </FieldRow>
          </div>

          <p style={{ fontSize:'0.74rem', fontWeight:600, color:'var(--g500)', textTransform:'uppercase',
            letterSpacing:'0.05em', marginBottom:'0.65rem' }}>Subject Focus (must total 100%)</p>

          {[
            { key:'varc', label:'VARC', color:'#3b82f6' },
            { key:'lrdi', label:'LRDI', color:'#8b5cf6' },
            { key:'qa',   label:'QA',   color:'#f59e0b' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ marginBottom:'0.6rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem' }}>
                <span style={{ fontSize:'0.82rem', fontWeight:600, color }}>{label}</span>
                <span style={{ fontSize:'0.82rem', fontWeight:700 }}>{plannerForm[key]}%</span>
              </div>
              <input
                type="range" min={10} max={70} step={5}
                value={plannerForm[key]}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  const others = ['varc','lrdi','qa'].filter(k => k !== key);
                  const remaining = 100 - val;
                  const otherTotal = plannerForm[others[0]] + plannerForm[others[1]];
                  const ratio0 = otherTotal > 0 ? plannerForm[others[0]] / otherTotal : 0.5;
                  setPlannerForm(f => ({
                    ...f,
                    [key]: val,
                    [others[0]]: Math.round(remaining * ratio0),
                    [others[1]]: remaining - Math.round(remaining * ratio0),
                  }));
                }}
                style={{ width:'100%', accentColor: color }} />
            </div>
          ))}

          {/* Visual breakdown bar */}
          <div style={{ display:'flex', height:10, borderRadius:5, overflow:'hidden', marginBottom:'1rem', marginTop:'0.25rem' }}>
            <div style={{ width:`${plannerForm.varc}%`, background:'#3b82f6', transition:'width 0.2s' }} />
            <div style={{ width:`${plannerForm.lrdi}%`, background:'#8b5cf6', transition:'width 0.2s' }} />
            <div style={{ width:`${plannerForm.qa}%`,   background:'#f59e0b', transition:'width 0.2s' }} />
          </div>

          <div style={{ display:'flex', gap:'1.25rem', marginBottom:'1.1rem' }}>
            {[
              { label:'Include Live Session', key:'includeLiveSession' },
              { label:'Include Doubt Resolution', key:'includeDoubtResolution' },
            ].map(({ label, key }) => (
              <label key={key} style={{ display:'flex', alignItems:'center', gap:'0.4rem',
                fontSize:'0.83rem', color:'var(--g700)', cursor:'pointer' }}>
                <input type="checkbox"
                  checked={plannerForm[key]}
                  onChange={e => setPlannerForm(f => ({ ...f, [key]: e.target.checked }))} />
                {label}
              </label>
            ))}
          </div>

          <div style={{ background:'var(--g50)', borderRadius:'var(--radius)', padding:'0.75rem 1rem',
            fontSize:'0.8rem', color:'var(--g600)', marginBottom:'1.25rem', lineHeight:1.6 }}>
            Estimated: <strong>{plannerForm.hours}H</strong> · VARC <strong>{plannerForm.varc}%</strong> · LRDI <strong>{plannerForm.lrdi}%</strong> · QA <strong>{plannerForm.qa}%</strong>
            &nbsp;· starts at <strong>{plannerForm.startTime}</strong>
            {plannerForm.varc + plannerForm.lrdi + plannerForm.qa !== 100 && (
              <span style={{ color:'var(--red)', fontWeight:600 }}> — percentages must total 100%</span>
            )}
          </div>

          <div style={{ display:'flex', gap:'0.65rem', justifyContent:'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPlanner(false)}>Cancel</button>
            <button
              className="btn btn-sm"
              style={{ background:'linear-gradient(135deg,#7c3aed,#db2777)', color:'#fff', border:'none' }}
              disabled={plannerForm.varc + plannerForm.lrdi + plannerForm.qa !== 100}
              onClick={generatePlan}>
              Generate Plan →
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
