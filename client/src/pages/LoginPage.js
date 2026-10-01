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

/* ── Fracture geometry: shards (in % of the card box) radiating from an impact point ── */
const makeShards = (cx, cy) => {
 const N = 9, inner = 24, outer = 160;
 let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
 const angs = Array.from({ length: N }, (_, i) => ((i + 0.25 + rnd() * 0.5) / N) * Math.PI * 2);
 const pt = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
 const midR = angs.map(() => inner * (0.75 + rnd() * 0.5));
 const shards = [];
 angs.forEach((a, i) => {
  const b = angs[(i + 1) % N];
  const p1 = pt(a, midR[i]), p2 = pt(b, midR[(i + 1) % N]);
  const o1 = pt(a, outer), o2 = pt(b, outer), om = pt((a + b + (b < a ? Math.PI * 2 : 0)) / 2, outer);
  shards.push([[cx, cy], p1, p2]);                 // inner triangle
  shards.push([p1, o1, om, o2, p2]);               // outer piece
 });
 return shards.map((poly, i) => {
  const c = poly.reduce((acc, [x, y]) => [acc[0] + x / poly.length, acc[1] + y / poly.length], [0, 0]);
  const dx = c[0] - cx, dy = c[1] - cy, len = Math.hypot(dx, dy) || 1;
  const dist = 260 + rnd() * 320;
  return {
   clip: `polygon(${poly.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(', ')})`,
   origin: `${c[0].toFixed(1)}% ${c[1].toFixed(1)}%`,
   tx: `${((dx / len) * dist).toFixed(0)}px`, ty: `${((dy / len) * dist).toFixed(0)}px`,
   rot: `${((rnd() - 0.5) * 220).toFixed(0)}deg`,
   dl: `${(0.12 + (i % 2) * 0.05 + rnd() * 0.06).toFixed(2)}s`,
  };
 });
};

export default function LoginPage() {
 const { login, commitUser } = useAuth();
 const navigate = useNavigate();
 const [form, setForm] = useState(() => {
  let email = '';
  try { email = localStorage.getItem('lgRememberEmail') || ''; } catch { /* ignore */ }
  return { email, password: '' };
 });
 const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem('lgRememberEmail'); } catch { return false; } });
 const [error, setError] = useState('');
 const [info, setInfo] = useState('');
 const [loading, setLoading] = useState(false);
 const [showPwd, setShowPwd] = useState(false);
 const [shatter, setShatter] = useState(null); // { rect, shards, impact }
 const emailRef = useRef(null);
 const cardRef = useRef(null);

 // Intro plays every time the login page opens (incl. after logout); off for reduced-motion users
 const [skip, setSkip] = useState(() =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
 );
 const [introDone, setIntroDone] = useState(skip);

 useEffect(() => {
  if (introDone) { (form.email ? null : emailRef.current)?.focus(); return; }
  const t = setTimeout(() => setIntroDone(true), 3700);
  return () => clearTimeout(t);
 }, [introDone]);

 const skipIntro = () => { setSkip(true); setIntroDone(true); };
 const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

 const submit = async e => {
  e.preventDefault();
  setError(''); setInfo('');
  setLoading(true);
  try {
   const user = await login(form.email, form.password, true);
   try { remember ? localStorage.setItem('lgRememberEmail', form.email) : localStorage.removeItem('lgRememberEmail'); } catch { /* ignore */ }
   const go = () => { commitUser(user); navigate(user.role === 'admin' ? '/admin' : '/dashboard'); };
   const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const rect = cardRef.current?.getBoundingClientRect();
   if (reduced || !rect) { go(); return; }
   // impact point = the LOGIN button
   const btn = cardRef.current.querySelector('.lg-btn')?.getBoundingClientRect();
   const cx = btn ? ((btn.left + btn.width / 2 - rect.left) / rect.width) * 100 : 50;
   const cy = btn ? ((btn.top + btn.height / 2 - rect.top) / rect.height) * 100 : 60;
   setShatter({ rect, shards: makeShards(cx, cy), impact: [cx, cy] });
   setTimeout(go, 1150);
  } catch (err) {
   setError(err.response?.data?.message || 'Login failed. Check your email and password.');
   setLoading(false);
  }
 };

 // The card's face (also re-used, frozen, inside every flying shard)
 const face = (live) => (
  <>
   <div className="lg-head">
    <div className="lg-head-logo"><img src="/logo.png" alt="Lok Chemicals" /></div>
    <div className="lg-title">LOGIN</div>
    <div className="lg-sub">Lok Chemicals · Pricing CRM</div>
   </div>
   {live && error && <div className="lg-msg err">{error}</div>}
   {live && info && <div className="lg-msg info">{info}</div>}
   <div className="lg-field">
    <input ref={live ? emailRef : undefined} name="email" type="email" value={form.email} onChange={live ? handle : undefined} readOnly={!live} tabIndex={live ? 0 : -1}
     placeholder="Email address" aria-label="Email address" required={live} autoComplete="email" />
    <span className="lg-ico" aria-hidden="true">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.2" /><path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" /></svg>
    </span>
   </div>
   <div className="lg-field">
    <input name="password" type={showPwd ? 'text' : 'password'} value={form.password} onChange={live ? handle : undefined} readOnly={!live} tabIndex={live ? 0 : -1}
     placeholder="Password" aria-label="Password" required={live} autoComplete="current-password" />
    <button type="button" className="lg-ico" onClick={live ? () => setShowPwd(v => !v) : undefined} tabIndex={live ? 0 : -1}
     title={showPwd ? 'Hide password' : 'Show password'} aria-label={showPwd ? 'Hide password' : 'Show password'}>
     {showPwd ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
     ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.2" /></svg>
     )}
    </button>
   </div>
   <button className="lg-btn" disabled={live && loading} tabIndex={live ? 0 : -1}>{live && loading && !shatter ? 'SIGNING IN…' : 'LOGIN'}</button>
   <div className="lg-row">
    <label><input type="checkbox" checked={remember} onChange={live ? e => setRemember(e.target.checked) : undefined} readOnly={!live} tabIndex={live ? 0 : -1} /> Remember me</label>
    <button type="button" tabIndex={live ? 0 : -1} onClick={live ? () => { setError(''); setInfo('Please contact your admin to reset your password.'); } : undefined}>Forgot password?</button>
   </div>
  </>
 );

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

    <form ref={cardRef} className="lg-card" onSubmit={submit} style={shatter ? { visibility: 'hidden' } : undefined}>
     {face(true)}
    </form>
   </div>

   {/* ── Fracture: the card shatters into glass pieces after a successful login ── */}
   {shatter && (
    <>
     <div className="lg-flash" style={{ '--fx': `${shatter.rect.left + (shatter.rect.width * shatter.impact[0]) / 100}px`, '--fy': `${shatter.rect.top + (shatter.rect.height * shatter.impact[1]) / 100}px` }} />
     <div className="lg-shatter" style={{ left: shatter.rect.left, top: shatter.rect.top, width: shatter.rect.width, height: shatter.rect.height }}>
      {shatter.shards.map((sh, i) => (
       <div key={i} className="lg-shard" style={{ clipPath: sh.clip, WebkitClipPath: sh.clip, transformOrigin: sh.origin, '--tx': sh.tx, '--ty': sh.ty, '--rot': sh.rot, '--dl': sh.dl }}>
        <div className="lg-card">{face(false)}</div>
       </div>
      ))}
      <svg className="lg-cracks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
       {shatter.shards.filter((_, i) => i % 2 === 1).map((sh, i) => {
        const pts = sh.clip.replace(/polygon\(|\)|%/g, '').split(',').map(p => p.trim().split(' ').map(Number));
        return <polyline key={i} points={`${shatter.impact[0]},${shatter.impact[1]} ${pts[0][0]},${pts[0][1]} ${pts[1][0]},${pts[1][1]}`} fill="none" stroke="#fff" strokeWidth=".6" vectorEffect="non-scaling-stroke" />;
       })}
      </svg>
     </div>
    </>
   )}

   {!introDone && <button className="lg-skip-btn" onClick={skipIntro}>Skip ⏭</button>}
   <div className="lg-tagline">LOK CHEMICALS · CHEMICALS · SOLVENTS · POLYMERS · SINCE 1995</div>
  </div>
 );
}
