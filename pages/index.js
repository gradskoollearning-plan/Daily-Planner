import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from './_app';

export default function Landing() {
  const { auth, login, toast } = useAuth();
  const router = useRouter();
  const [modal, setModal] = useState(null); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (auth) router.replace(auth.role === 'admin' ? '/admin' : '/dashboard');
  }, [auth]);

  // Login
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', track: '8H' });

  async function handleLogin(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data);
      toast('Welcome back!');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  async function handleSignup(e) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data);
      toast('Account created! Welcome to GRADSKOOL.');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  function openModal(m) { setModal(m); setErr(''); }

  return (
    <>
      <Head>
        <title>GRADSKOOL — Daily Study Planner</title>
        <meta name="description" content="A structured daily study system for CAT preparation." />
      </Head>

      {/* NAV */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 2rem', height:60, background:'#fff', borderBottom:'1px solid var(--g200)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ fontFamily:'var(--serif)', fontSize:'1.4rem', fontWeight:700 }}>
          GRAD<span style={{ color:'var(--red)' }}>SKOOL</span>
        </div>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <button className="btn btn-outline" onClick={() => openModal('login')}>Log In</button>
          <button className="btn btn-red" onClick={() => openModal('signup')}>Get Started</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background:'linear-gradient(135deg,#fff 0%,var(--g50) 55%,var(--red-light) 100%)', padding:'5rem 2rem 4rem', textAlign:'center' }}>
        <h1 style={{ fontSize:'clamp(2rem,5vw,3.2rem)', fontWeight:700, lineHeight:1.15, maxWidth:700, margin:'0 auto 1rem' }}>
          Your <span style={{ color:'var(--red)' }}>daily discipline</span><br />system for CAT prep
        </h1>
        <p style={{ fontSize:'1.05rem', color:'var(--g600)', maxWidth:520, margin:'0 auto 2.25rem', lineHeight:1.75 }}>
          Track every task, unlock each day with accountability, and let your coach personalise your study plan — all in one place.
        </p>
        <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-red btn-lg" onClick={() => openModal('signup')}>Create Free Account</button>
          <button className="btn btn-outline btn-lg" onClick={() => openModal('login')}>Log In →</button>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background:'#fff', padding:'3rem 2rem' }}>
        <p className="section-label" style={{ textAlign:'center', marginBottom:'1.75rem' }}>Why GRADSKOOL Planner</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1.25rem', maxWidth:960, margin:'0 auto' }}>
          {[
            { icon:'📅', title:'Daily Task Tracking', desc:'Personalised schedules with time slots, tags, and one-tap completion.' },
            { icon:'🔓', title:'Accountability Unlock', desc:"Skipped a task? Explain why. Tomorrow unlocks only when yesterday is fully resolved." },
            { icon:'📊', title:'Progress Analytics', desc:'14-day history, completion rates, and skip reasons — visible to you and your coach.' },
            { icon:'🛠️', title:'Admin Customisation', desc:'Your coach can edit timings, tasks, and study tracks per student.' },
          ].map(f => (
            <div key={f.title} className="card">
              <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--red-light)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'0.75rem', fontSize:'1rem' }}>{f.icon}</div>
              <h3 style={{ fontFamily:'var(--sans)', fontSize:'0.92rem', fontWeight:600, marginBottom:'0.4rem' }}>{f.title}</h3>
              <p style={{ fontSize:'0.82rem', color:'var(--g600)', lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRACKS */}
      <section style={{ background:'var(--g50)', padding:'3rem 2rem' }}>
        <p className="section-label" style={{ textAlign:'center', marginBottom:'1.75rem' }}>Study Tracks</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem', maxWidth:780, margin:'0 auto' }}>
          {[
            { h:'6-Hour Track', items:['Live Session','1 Reading Cycle','Quiz','1 LRDI Set','Light QA Practice'] },
            { h:'8-Hour Track', items:['Live Session','1–2 Reading Cycles','Quiz','2 LRDI Sets','QA Practice + Analysis'] },
            { h:'10-Hour Track', items:['Live Session','2 Reading Cycles','Quiz','2–3 LRDI Sets','Advanced QA + Deep Analysis'] },
          ].map(t => (
            <div key={t.h} className="card" style={{ borderTop:'3px solid var(--red)' }}>
              <h3 style={{ fontFamily:'var(--sans)', fontSize:'0.92rem', fontWeight:600, marginBottom:'0.75rem' }}>{t.h}</h3>
              {t.items.map(i => <div key={i} style={{ fontSize:'0.8rem', color:'var(--g600)', padding:'0.2rem 0', display:'flex', alignItems:'center', gap:'0.4rem' }}><span style={{ color:'var(--red)' }}>✦</span>{i}</div>)}
            </div>
          ))}
        </div>
      </section>

      <footer style={{ background:'var(--black)', color:'var(--g400)', textAlign:'center', padding:'1.5rem', fontSize:'0.8rem' }}>
        © {new Date().getFullYear()} GRADSKOOL. Built for CAT aspirants.
      </footer>

      {/* LOGIN MODAL */}
      {modal === 'login' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom:'0.25rem' }}>Welcome back</h2>
            <p style={{ fontSize:'0.85rem', color:'var(--g600)', marginBottom:'1.5rem' }}>Log in to your GRADSKOOL account</p>
            <form onSubmit={handleLogin}>
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="you@email.com" value={loginForm.email}
                  onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" placeholder="••••••••" value={loginForm.password}
                  onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              {err && <p className="field err">{err}</p>}
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-red" style={{ flex:1 }} disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Log In'}
                </button>
              </div>
            </form>
            <p style={{ textAlign:'center', marginTop:'1rem', fontSize:'0.85rem', color:'var(--g600)' }}>
              No account? <button className="link-btn" onClick={() => openModal('signup')}>Sign up</button>
            </p>
          </div>
        </div>
      )}

      {/* SIGNUP MODAL */}
      {modal === 'signup' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom:'0.25rem' }}>Create account</h2>
            <p style={{ fontSize:'0.85rem', color:'var(--g600)', marginBottom:'1.5rem' }}>Join GRADSKOOL and start your prep journey</p>
            <form onSubmit={handleSignup}>
              <div className="field">
                <label>Full Name</label>
                <input placeholder="Your full name" value={signupForm.name}
                  onChange={e => setSignupForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="you@email.com" value={signupForm.email}
                  onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" placeholder="Min 6 characters" value={signupForm.password}
                  onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
              </div>
              <div className="field">
                <label>Study Track</label>
                <select value={signupForm.track} onChange={e => setSignupForm(p => ({ ...p, track: e.target.value }))}>
                  <option value="6H">6-Hour Track</option>
                  <option value="8H">8-Hour Track</option>
                  <option value="10H">10-Hour Track</option>
                </select>
              </div>
              {err && <p className="field err">{err}</p>}
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-red" style={{ flex:1 }} disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Create Account'}
                </button>
              </div>
            </form>
            <p style={{ textAlign:'center', marginTop:'1rem', fontSize:'0.85rem', color:'var(--g600)' }}>
              Already have an account? <button className="link-btn" onClick={() => openModal('login')}>Log in</button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
