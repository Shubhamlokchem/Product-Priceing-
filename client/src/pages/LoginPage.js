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

/* ── The walking businessman (3D-cartoon style: orange blazer, tie, grey trousers, briefcase), viewBox 0 0 120 220 ── */
const Person = () => (
 <svg viewBox="0 0 120 220" aria-hidden="true">
  <defs>
   <linearGradient id="lgBlazer" x1="0" x2="1"><stop offset="0" stopColor="#f7a05a" /><stop offset=".45" stopColor="#ee7d32" /><stop offset="1" stopColor="#c85a18" /></linearGradient>
   <linearGradient id="lgSleeve" x1="0" x2="1"><stop offset="0" stopColor="#f59a52" /><stop offset=".6" stopColor="#e5722a" /><stop offset="1" stopColor="#c45816" /></linearGradient>
   <linearGradient id="lgPants" x1="0" x2="1"><stop offset="0" stopColor="#8a929c" /><stop offset=".5" stopColor="#737b86" /><stop offset="1" stopColor="#5a616b" /></linearGradient>
   <radialGradient id="lgSkin" cx=".42" cy=".38" r=".7"><stop offset="0" stopColor="#ffe1c8" /><stop offset=".7" stopColor="#f6c7a3" /><stop offset="1" stopColor="#e9ae86" /></radialGradient>
   <linearGradient id="lgHair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a5a36" /><stop offset=".6" stopColor="#6b4226" /><stop offset="1" stopColor="#4e2f1a" /></linearGradient>
   <linearGradient id="lgBag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5427" /><stop offset="1" stopColor="#6a3d19" /></linearGradient>
   <linearGradient id="lgShoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a4a26" /><stop offset="1" stopColor="#4a2a12" /></linearGradient>
  </defs>
  <g className="lg-body">
   {/* back arm */}
   <g className="lg-arm-back">
    <path d="M36 57 q-3 25 -1 49 h11 q2 -24 0 -49 z" fill="url(#lgSleeve)" />
    <rect x="35" y="103" width="11.5" height="5" rx="2" fill="#f1f5f9" />
    <ellipse cx="40.8" cy="112.5" rx="5.2" ry="5.8" fill="url(#lgSkin)" />
   </g>
   {/* legs (slim grey trousers + brown shoes) */}
   <g className="lg-leg-b">
    <path d="M49 124 h13 l-1 72 h-11 z" fill="#646b75" />
    <path d="M46.5 195 h15 q6 1 6.5 6 h-22.5 q-1 -4 1 -6 z" fill="url(#lgShoe)" />
   </g>
   <g className="lg-leg-a">
    <path d="M58 124 h13 l-1 72 h-11 z" fill="url(#lgPants)" />
    <path d="M65 140 v52" stroke="#5f6670" strokeWidth=".8" />
    <path d="M57.5 195 h15 q6 1 6.5 6 h-22.5 q-1 -4 1 -6 z" fill="url(#lgShoe)" />
   </g>
   {/* neck, shirt, tie */}
   <path d="M55 42 h10 v10 h-10 z" fill="#efb893" />
   <path d="M48 50 L72 50 L69 94 L51 94 Z" fill="#f3f6fa" />
   <path d="M53 49 L60 56 L55 60 Z M67 49 L60 56 L65 60 Z" fill="#e2e8f0" />
   <path d="M58 55 h4 l1.3 4 -1.8 28 -1.5 3 -1.5 -3 -1.8 -28 z" fill="#3a4250" />
   <path d="M58.2 55 h3.6 l.6 2 h-4.8 z" fill="#2b313c" />
   {/* blazer (open V, lapels, buttons, pockets) */}
   <path d="M39 55 Q45 50 51 50 L60 93 L69 50 Q75 50 81 55 L87 128 Q76 135 63 133 L60 100 L57 133 Q44 135 33 128 Z" fill="url(#lgBlazer)" />
   <path d="M51 50 L60 93 L54 64 L46 55 Z" fill="#f59a52" /><path d="M69 50 L60 93 L66 64 L74 55 Z" fill="#c95a18" />
   <path d="M45 56 L53 66" stroke="#d96a22" strokeWidth="1" />
   <circle cx="61.5" cy="104" r="1.9" fill="#7c8490" /><circle cx="61.5" cy="116" r="1.9" fill="#7c8490" />
   <path d="M38 112 h13 v3 h-13 z" fill="#d96a22" opacity=".8" /><path d="M69 112 h13 v3 h-13 z" fill="#b8520f" opacity=".8" />
   <path d="M62 133 Q60 124 60 100" stroke="#b8520f" strokeWidth="1" fill="none" />
   {/* head — big friendly 3D-cartoon face */}
   <ellipse cx="40.5" cy="28" rx="3.6" ry="5" fill="#f1bd98" /><ellipse cx="79.5" cy="28" rx="3.6" ry="5" fill="#f1bd98" />
   <path d="M41 26 Q40 45 60 47 Q80 45 79 26 Q79 8 60 8 Q41 8 41 26 Z" fill="url(#lgSkin)" />
   {/* hair with swept-up quiff */}
   <path d="M40.5 25 Q38 12 46 6 Q52 -1 62 0 Q72 -1 77 6 Q82 12 79.5 25 Q77 15 72 13 Q64 10 55 12 Q47 13 44 18 Q42 21 40.5 25 Z" fill="url(#lgHair)" />
   <path d="M47 7 Q55 -5 70 0 Q62 0 57 5 Q52 8 47 7 Z" fill="#9a6a44" />
   <path d="M52 6 Q60 1 67 4" stroke="#b07a50" strokeWidth="1" fill="none" strokeLinecap="round" />
   {/* eyebrows (raised) */}
   <path d="M47.5 21 q4.5 -3.5 9 -1" stroke="#5a3620" strokeWidth="2.2" fill="none" strokeLinecap="round" />
   <path d="M63.5 20 q4.5 -2.5 9 1" stroke="#5a3620" strokeWidth="2.2" fill="none" strokeLinecap="round" />
   {/* big eyes */}
   <ellipse cx="52.5" cy="27.5" rx="4" ry="4.4" fill="#fff" /><ellipse cx="67.5" cy="27.5" rx="4" ry="4.4" fill="#fff" />
   <circle cx="53.3" cy="28.2" r="2.6" fill="#4a3222" /><circle cx="68.3" cy="28.2" r="2.6" fill="#4a3222" />
   <circle cx="53.3" cy="28.2" r="1.3" fill="#140c06" /><circle cx="68.3" cy="28.2" r="1.3" fill="#140c06" />
   <circle cx="54.2" cy="27" r=".9" fill="#fff" /><circle cx="69.2" cy="27" r=".9" fill="#fff" />
   <path d="M48.6 25.2 q3.9 -2.4 7.8 0" stroke="#5a3620" strokeWidth=".9" fill="none" />
   <path d="M63.6 25.2 q3.9 -2.4 7.8 0" stroke="#5a3620" strokeWidth=".9" fill="none" />
   {/* nose, cheeks, smile */}
   <path d="M59 31 q1.2 3 2.4 0.6" stroke="#dca07c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
   <ellipse cx="48.5" cy="35" rx="3" ry="1.8" fill="#f4a58a" opacity=".45" /><ellipse cx="71.5" cy="35" rx="3" ry="1.8" fill="#f4a58a" opacity=".45" />
   <path d="M55 38 Q60 42 65.5 37.5" stroke="#b5634a" strokeWidth="1.7" fill="none" strokeLinecap="round" />
   {/* front arm holding the briefcase */}
   <g className="lg-arm-front">
    <path d="M74 57 q3 25 1 49 h11 q-2 -24 0 -49 z" fill="url(#lgSleeve)" />
    <rect x="74.2" y="103" width="11.5" height="5" rx="2" fill="#f8fafc" />
    <ellipse cx="79.8" cy="112.5" rx="5.2" ry="5.8" fill="url(#lgSkin)" />
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
