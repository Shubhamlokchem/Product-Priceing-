import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import './LoginIntro.css';

/* ── Background chemistry shapes ── */
const Benzene = ({ s }) => (
 <svg width={s} height={s} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
  <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" /><circle cx="50" cy="50" r="22" />
 </svg>
);
const Molecule = ({ s }) => (
 <svg width={s} height={s} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
  <line x1="30" y1="35" x2="62" y2="52" /><line x1="62" y1="52" x2="78" y2="22" /><line x1="62" y1="52" x2="55" y2="84" />
  <circle cx="30" cy="35" r="12" fill="currentColor" fillOpacity=".25" /><circle cx="62" cy="52" r="14" fill="currentColor" fillOpacity=".35" />
  <circle cx="78" cy="22" r="8" /><circle cx="55" cy="84" r="9" />
 </svg>
);
const Flask = ({ s }) => (
 <svg width={s} height={s} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round">
  <path d="M38 8h24M42 8v28L16 84a6 6 0 0 0 5 8h58a6 6 0 0 0 5-8L58 36V8" /><path d="M26 66h48" /><circle cx="45" cy="76" r="4" /><circle cx="58" cy="72" r="3" />
 </svg>
);
const Tube = ({ s }) => (
 <svg width={s} height={s} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
  <path d="M38 6h24M42 6v74a8 8 0 0 0 16 0V6" /><path d="M42 52h16" />
 </svg>
);
const Atom = ({ s }) => (
 <svg width={s} height={s} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5">
  <ellipse cx="50" cy="50" rx="44" ry="16" /><ellipse cx="50" cy="50" rx="44" ry="16" transform="rotate(60 50 50)" />
  <ellipse cx="50" cy="50" rx="44" ry="16" transform="rotate(120 50 50)" /><circle cx="50" cy="50" r="7" fill="currentColor" />
 </svg>
);
const ITEMS = [
 [Benzene, 90, '6%', '10%', '18s', '0s', '15deg'], [Molecule, 110, '80%', '8%', '20s', '2s', '-12deg'],
 [Flask, 80, '12%', '70%', '16s', '1s', '10deg'], [Atom, 120, '84%', '62%', '22s', '0s', '25deg'],
 [Tube, 70, '28%', '85%', '15s', '3s', '-8deg'], [Benzene, 60, '64%', '84%', '17s', '1.5s', '-20deg'],
 [Molecule, 70, '42%', '6%', '19s', '4s', '14deg'], [Benzene, 130, '90%', '32%', '24s', '2s', '10deg'],
 [Flask, 56, '2%', '42%', '14s', '2.5s', '-10deg'], [Atom, 64, '24%', '28%', '21s', '1s', '-18deg'],
 [Tube, 54, '72%', '44%', '16s', '0.5s', '12deg'], [Molecule, 90, '52%', '72%', '23s', '3.5s', '-14deg'],
];
const FORMULAS = [
 ['C₆H₆', '18%', '48%', '26px', '17s', '0s'], ['H₂SO₄', '70%', '22%', '22px', '20s', '2s'],
 ['NaOH', '8%', '88%', '20px', '15s', '1s'], ['CH₃COOH', '76%', '78%', '20px', '22s', '3s'],
 ['C₃H₆O', '38%', '14%', '18px', '18s', '1.5s'], ['HCl', '92%', '52%', '24px', '16s', '0.5s'],
 ['C₂H₅OH', '4%', '24%', '18px', '21s', '2.5s'], ['NH₃', '58%', '92%', '22px', '19s', '4s'],
];
const BUBBLES = Array.from({ length: 16 }, (_, i) => ({
 left: `${(i * 6.3 + 3) % 100}%`, size: 6 + (i * 7) % 18, d: `${9 + (i * 3) % 10}s`, dl: `${(i * 1.3) % 9}s`,
}));
const SPARKS = [[-120, -80], [110, -95], [-150, 10], [150, 20], [-60, -140], [70, -150], [0, -170], [-100, 90], [110, 80]];

/* ── The walking scientist (lab coat + briefcase), viewBox 0 0 120 220 ── */
const Person = () => (
 <svg viewBox="0 0 120 220" aria-hidden="true">
  <g className="lg-body">
   {/* back arm */}
   <g className="lg-arm-back">
    <rect x="35" y="54" width="11" height="58" rx="5.5" fill="#dfe8f2" />
    <circle cx="40.5" cy="113" r="5.5" fill="#e7b58f" />
   </g>
   {/* legs */}
   <g className="lg-leg-b">
    <rect x="53" y="124" width="13" height="72" rx="6" fill="#1e3a5f" />
    <ellipse cx="62" cy="199" rx="11" ry="5" fill="#0f172a" />
   </g>
   <g className="lg-leg-a">
    <rect x="54" y="124" width="13" height="72" rx="6" fill="#274b78" />
    <ellipse cx="63" cy="199" rx="11" ry="5" fill="#111827" />
   </g>
   {/* torso: lab coat */}
   <path d="M40 52 Q60 44 80 52 L86 132 Q60 140 34 132 Z" fill="#ffffff" />
   <path d="M60 52 L60 134" stroke="#cbd5e1" strokeWidth="1.5" />
   <path d="M52 50 L60 64 L68 50" fill="#10b981" />
   <rect x="66" y="78" width="10" height="7" rx="1.5" fill="#1a6db5" />
   {/* head */}
   <rect x="55" y="40" width="10" height="10" rx="3" fill="#e7b58f" />
   <circle cx="60" cy="28" r="15" fill="#e7b58f" />
   <path d="M45 27 Q46 11 60 11 Q75 11 75 26 Q70 18 60 19 Q50 19 45 27 Z" fill="#2b2118" />
   <circle cx="66" cy="29" r="1.6" fill="#1f2937" />
   <path d="M64 35 Q67 37 70 35" stroke="#9a5a3c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
   {/* front arm holding the briefcase */}
   <g className="lg-arm-front">
    <rect x="74" y="54" width="11" height="58" rx="5.5" fill="#f1f5f9" />
    <circle cx="79.5" cy="113" r="5.5" fill="#e7b58f" />
    <g className="lg-bag">

     <path d="M78 118 v-4 a3 3 0 0 1 3 -3 h8 a3 3 0 0 1 3 3 v4" stroke="#3f2a14" strokeWidth="2.5" fill="none" />
     <rect x="72" y="124" width="26" height="20" rx="3" fill="#7c4a1e" />
     <circle className="lg-glow" cx="85" cy="122" r="12" fill="#fef9c3" style={{ mixBlendMode: 'screen' }} />
     <g className="lg-lid">
      <rect x="72" y="118" width="26" height="8" rx="3" fill="#9a5c26" />
      <rect x="83" y="122" width="4" height="4" rx="1" fill="#fcd34d" />
     </g>
    </g>
   </g>
  </g>
 </svg>
);

export default function LoginPage() {
 const { login } = useAuth();
 const navigate = useNavigate();
 const [form, setForm] = useState({ email: '', password: '' });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const [showPwd, setShowPwd] = useState(false);
 const emailRef = useRef(null);

 // Play the intro once per browser session (and never for reduced-motion users)
 const [skip, setSkip] = useState(() => {
  let seen = false;
  try { seen = sessionStorage.getItem('lgIntroSeen') === '1'; } catch { /* ignore */ }
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return seen || reduced;
 });
 const [introDone, setIntroDone] = useState(skip);

 useEffect(() => {
  try { sessionStorage.setItem('lgIntroSeen', '1'); } catch { /* ignore */ }
  if (introDone) { emailRef.current?.focus(); return; }
  const t = setTimeout(() => setIntroDone(true), 3700);
  return () => clearTimeout(t);
 }, [introDone]);

 const skipIntro = () => { setSkip(true); setIntroDone(true); };

 const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

 const submit = async e => {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
   const user = await login(form.email, form.password);
   navigate(user.role === 'admin' ? '/admin' : '/dashboard');
  } catch (err) {
   setError(err.response?.data?.message || 'Login failed. Check your email and password.');
  } finally { setLoading(false); }
 };

 return (
  <div className={`lg-bg ${skip ? 'lg-skip' : ''}`}>
   {/* hexagon pattern */}
   <svg className="lg-hexgrid" width="100%" height="100%" aria-hidden="true">
    <defs>
     <pattern id="lghex" width="56" height="97" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
      <path d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z M28 64 L28 97" fill="none" stroke="#fff" strokeWidth="1.2" />
     </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#lghex)" />
   </svg>

   {/* floating chemistry */}
   {ITEMS.map(([C, s, l, t, d, dl, r], i) => (
    <div key={i} className="lg-item" style={{ left: l, top: t, '--d': d, '--dl': dl, '--r': r }}><C s={s} /></div>
   ))}
   {FORMULAS.map(([f, l, t, fs, d, dl], i) => (
    <div key={f} className="lg-formula" style={{ left: l, top: t, '--fs': fs, '--d': d, '--dl': dl, '--r': i % 2 ? '-6deg' : '6deg' }}>{f}</div>
   ))}
   {BUBBLES.map((b, i) => (
    <span key={i} className="lg-bubble" style={{ left: b.left, width: b.size, height: b.size, '--d': b.d, '--dl': b.dl }} />
   ))}

   <div className="lg-stage">
    {!introDone && (
     <div className="lg-person"><Person /><div className="lg-shadow" /></div>
    )}
    {!introDone && SPARKS.map(([x, y], i) => (
     <span key={i} className="lg-spark" style={{ '--x': `${x}px`, '--y': `${y}px`, animationDelay: `${2.8 + i * 0.03}s` }} />
    ))}

    <div className="lg-card">
     <div className="auth-logo">
      <img src="/logo.png" alt="Lok Chemicals" className="auth-logo-img" style={{ maxHeight: 84 }} />
      <h1>Lok Chemicals</h1>
      <p>Pricing CRM Dashboard</p>
     </div>
     <form onSubmit={submit}>
      <div className="form-group">
       <label>Email Address</label>
       <input ref={emailRef} name="email" type="email" value={form.email} onChange={handle}
        placeholder="Enter your email" required autoComplete="email" />
      </div>
      <div className="form-group">
       <label>Password</label>
       <div style={{ position: 'relative' }}>
        <input name="password" type={showPwd ? 'text' : 'password'} value={form.password} onChange={handle}
         placeholder="Enter your password" required autoComplete="current-password"
         style={{ width: '100%', paddingRight: 42, boxSizing: 'border-box' }} />
        <button type="button" onClick={() => setShowPwd(v => !v)}
         title={showPwd ? 'Hide password' : 'Show password'} aria-label={showPwd ? 'Hide password' : 'Show password'}
         style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
         {showPwd ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
         ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
         )}
        </button>
       </div>
      </div>
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
     </form>
     <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#9ca3af' }}>Contact your admin to create an account.</p>
    </div>
   </div>

   {!introDone && <button className="lg-skip-btn" onClick={skipIntro}>Skip ⏭</button>}
   <div className="lg-tagline">LOK CHEMICALS · CHEMICALS · SOLVENTS · POLYMERS · SINCE 1995</div>
  </div>
 );
}
