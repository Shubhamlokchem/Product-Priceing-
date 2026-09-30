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

/* ── The walking businessman (orange blazer + briefcase), viewBox 0 0 120 220 ── */
const Person = () => (
 <svg viewBox="0 0 120 220" aria-hidden="true">
  <defs>
   <linearGradient id="lgBlazer" x1="0" x2="1"><stop offset="0" stopColor="#f08a3c" /><stop offset=".55" stopColor="#e8742a" /><stop offset="1" stopColor="#c95d1c" /></linearGradient>
   <linearGradient id="lgSleeve" x1="0" x2="1"><stop offset="0" stopColor="#f3954a" /><stop offset="1" stopColor="#cf6420" /></linearGradient>
   <linearGradient id="lgPants" x1="0" x2="1"><stop offset="0" stopColor="#7b8491" /><stop offset="1" stopColor="#5b636f" /></linearGradient>
   <radialGradient id="lgSkin" cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#fbd7b8" /><stop offset="1" stopColor="#e9b48f" /></radialGradient>
   <linearGradient id="lgBag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5427" /><stop offset="1" stopColor="#6a3d19" /></linearGradient>
  </defs>
  <g className="lg-body">
   {/* back arm */}
   <g className="lg-arm-back">
    <rect x="35" y="54" width="12" height="54" rx="6" fill="url(#lgSleeve)" />
    <rect x="35.5" y="104" width="11" height="5" rx="2" fill="#f1f5f9" />
    <circle cx="41" cy="113" r="5.5" fill="url(#lgSkin)" />
   </g>
   {/* legs */}
   <g className="lg-leg-b">
    <rect x="49" y="124" width="14" height="72" rx="6" fill="#5b636f" />
    <path d="M47 194 h16 a6 6 0 0 1 4 6 v1 h-22 v-3 a4 4 0 0 1 2 -4z" fill="#4a2c14" />
   </g>
   <g className="lg-leg-a">
    <rect x="58" y="124" width="14" height="72" rx="6" fill="url(#lgPants)" />
    <path d="M58 194 h16 a6 6 0 0 1 4 6 v1 h-22 v-3 a4 4 0 0 1 2 -4z" fill="#5b3a1e" />
   </g>
   {/* shirt + tie */}
   <path d="M49 50 L71 50 L68 90 L52 90 Z" fill="#eef2f7" />
   <path d="M58 52 h4 l1.5 5 -2 26 -1.5 3 -1.5 -3 -2 -26 z" fill="#374151" />
   {/* blazer */}
   <path d="M40 54 Q45 50 50 50 L60 92 L70 50 Q75 50 80 54 L86 130 Q72 136 62 134 L60 96 L58 134 Q48 136 34 130 Z" fill="url(#lgBlazer)" />
   <path d="M50 50 L59 88 L53 58 L46 53 Z" fill="#d0661f" /><path d="M70 50 L61 88 L67 58 L74 53 Z" fill="#b95616" />
   <circle cx="60" cy="102" r="1.8" fill="#6b7280" /><circle cx="60" cy="114" r="1.8" fill="#6b7280" />
   <path d="M44 100 h9" stroke="#b95616" strokeWidth="1.5" strokeLinecap="round" />
   {/* head */}
   <rect x="55" y="40" width="10" height="11" rx="3" fill="#e9b48f" />
   <ellipse cx="43.5" cy="28" rx="3" ry="4.5" fill="#e9b48f" /><ellipse cx="76.5" cy="28" rx="3" ry="4.5" fill="#e9b48f" />
   <ellipse cx="60" cy="27" rx="16.5" ry="18" fill="url(#lgSkin)" />
   <path d="M43.5 24 Q42 9 56 7 Q66 3 73 10 Q79 16 76.5 25 Q73 15 63 16 Q58 12 52 15 Q46 17 43.5 24 Z" fill="#6b4226" />
   <path d="M55 8 Q62 1 70 7 Q64 6 60 10 Z" fill="#7d4f2e" />
   <path d="M49 22 q4 -2.5 8 0" stroke="#4a2c14" strokeWidth="1.8" fill="none" strokeLinecap="round" />
   <path d="M63 22 q4 -2.5 8 0" stroke="#4a2c14" strokeWidth="1.8" fill="none" strokeLinecap="round" />
   <ellipse cx="53" cy="28" rx="3.2" ry="3.6" fill="#fff" /><ellipse cx="67" cy="28" rx="3.2" ry="3.6" fill="#fff" />
   <circle cx="53.6" cy="28.6" r="2" fill="#3b2a1a" /><circle cx="67.6" cy="28.6" r="2" fill="#3b2a1a" />
   <circle cx="54.2" cy="27.8" r=".7" fill="#fff" /><circle cx="68.2" cy="27.8" r=".7" fill="#fff" />
   <path d="M59 33 q1 2 2.5 0" stroke="#d99a76" strokeWidth="1.2" fill="none" strokeLinecap="round" />
   <path d="M54.5 37 Q60 41.5 65.5 37" stroke="#a0522d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
   {/* front arm holding the briefcase */}
   <g className="lg-arm-front">
    <rect x="73" y="54" width="12" height="54" rx="6" fill="url(#lgSleeve)" />
    <rect x="73.5" y="104" width="11" height="5" rx="2" fill="#f8fafc" />
    <circle cx="79.5" cy="113" r="5.5" fill="url(#lgSkin)" />
    <g className="lg-bag">
     <path d="M78 118 v-4 a3 3 0 0 1 3 -3 h8 a3 3 0 0 1 3 3 v4" stroke="#3f2a14" strokeWidth="2.5" fill="none" />
     <rect x="72" y="124" width="26" height="20" rx="3" fill="url(#lgBag)" />
     <rect x="72" y="131" width="26" height="1.5" fill="#4a2a10" opacity=".5" />
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

 // Play the intro every time the login page opens (incl. after logout); off for reduced-motion users
 const [skip, setSkip] = useState(() =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
 );
 const [introDone, setIntroDone] = useState(skip);

 useEffect(() => {
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
      <img src="/logo.png" alt="Lok Chemicals" className="auth-logo-img" style={{ maxHeight: 58 }} />
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
     <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#9ca3af' }}>Contact your admin to create an account.</p>
    </div>
   </div>

   {!introDone && <button className="lg-skip-btn" onClick={skipIntro}>Skip ⏭</button>}
   <div className="lg-tagline">LOK CHEMICALS · CHEMICALS · SOLVENTS · POLYMERS · SINCE 1995</div>
  </div>
 );
}
