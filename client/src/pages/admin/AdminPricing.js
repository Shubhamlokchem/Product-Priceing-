import { Fragment, useState, useEffect, useCallback, useRef } from 'react';
import NoSleep from 'nosleep.js';
import api from '../../api/axios';
import { targetText } from '../../utils/target';
import '../Dashboard.css';
// Target shown everywhere: saved range if the admin typed one, otherwise market +2% to +5%
// Version of the TV boards. Hover over "LIVE PRICE INDEX" on a board to see which version the site is running.
const BOARD_VERSION = '08 Oct 2026 · 3:10 pm (target rounding by first decimal)';

// Smart-TV browsers usually have no Screen Wake Lock, and only a real playing video stops their screensaver.
// NoSleep plays a tiny silent video for that. It must be started from the click / remote "OK" press that opens the board.
let noSleep = null;
const keepAwakeOn = () => { try { if (!noSleep) noSleep = new NoSleep(); noSleep.enable().catch(() => {}); } catch { /* not supported */ } };
const keepAwakeOff = () => { try { noSleep?.disable(); } catch { /* ignore */ } };

// Keep the TV / monitor awake while a price board is open (no mouse or keyboard activity needed).
// 1) Screen Wake Lock (Chrome, Edge, newer smart-TV browsers)  2) fallback: a tiny silent looping video,
// which stops most other browsers from dimming or sleeping.
function useKeepAwake(active) {
 useEffect(() => {
  if (!active) return undefined;
  let lock = null, video = null, timer = null, stopped = false;
  const request = async () => {
   try {
    if (!stopped && 'wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
   } catch { /* not allowed right now — the video fallback below still runs */ }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') { request(); video?.play?.().catch(() => {}); keepAwakeOn(); } };
  // any remote / key / click on the board also re-arms it (helps TVs that drop the video after a while)
  const onInput = () => keepAwakeOn();
  document.addEventListener('keydown', onInput); document.addEventListener('click', onInput);
  request();
  try {
   const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
   const ctx = canvas.getContext('2d');
   if (canvas.captureStream && ctx) {
    timer = setInterval(() => { ctx.fillStyle = ctx.fillStyle === '#000001' ? '#000000' : '#000001'; ctx.fillRect(0, 0, 2, 2); }, 1000);
    video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.loop = true;
    video.srcObject = canvas.captureStream(1);
    Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0.01', bottom: '0', right: '0', pointerEvents: 'none', zIndex: '1' });
    document.body.appendChild(video);
    video.play().catch(() => {});
   }
  } catch { /* fallback not available */ }
  document.addEventListener('visibilitychange', onVisible);
  document.addEventListener('fullscreenchange', onVisible);
  return () => {
   stopped = true;
   document.removeEventListener('keydown', onInput); document.removeEventListener('click', onInput);
   keepAwakeOff();
   document.removeEventListener('visibilitychange', onVisible);
   document.removeEventListener('fullscreenchange', onVisible);
   if (timer) clearInterval(timer);
   try { lock?.release?.(); } catch { /* already released */ }
   try { video?.pause(); video?.remove(); } catch { /* ignore */ }
  };
 }, [active]);
}

// Up / down arrow after the market price: compares with the previous priced day in the price history.
// The slot always takes the same width, so prices stay lined up whether or not a row has an arrow.
function TrendArrow({ item, size = '0.72em' }) {
 const cur = Number(item?.price), prev = Number(item?.prevPrice);
 const has = item?.price != null && item?.prevPrice != null && !isNaN(cur) && !isNaN(prev) && cur !== prev;
 const up = has && cur > prev;
 return (
  <span title={has ? `${up ? 'Up' : 'Down'} from ₹${prev.toLocaleString()}${item.prevDate ? ` on ${fmtDate(item.prevDate)}` : ''}` : undefined}
   style={{ display: 'inline-block', width: '1.1em', marginLeft: '0.2em', textAlign: 'center', fontSize: size, lineHeight: 1, verticalAlign: 'middle', color: up ? '#22c55e' : '#ef4444', fontWeight: 900 }}>
   {has ? (up ? '▲' : '▼') : ''}
  </span>
 );
}

// Text columns that read better left aligned on the TV boards
const LEFT_COLS = new Set(['PRODUCT', 'MAKE', 'ORIGIN', 'EX']);
const tgtOf = it => targetText(it.target, it.targetMax, it.price);

const REFRESH_SEC = 7;

// Proper case for TV boards: "ADIPIC ACID" -> "Adipic Acid", "1-BROMO 3-CHLORO" -> "1-Bromo 3-Chloro".
// Short codes stay in capitals (USA, UK, BASF, KH, PVC …); numbers / % / ₹ are untouched.
const KEEP_CAPS = new Set(['ISO','USA','UK','UAE','EU','KSA','BASF','KH','LG','SK','SKC','INEOS','PVC','PET','HDPE','LDPE','LLDPE','PP','PE','MEG','DEG','TEG','IPA','MEK','DMF','DMSO','THF','EDTA','PEG','PPG','LAB','LABSA','SLES','SLS','CAS','HSN','FOB','CIF','CFR','EXW','GST','DCS','LR','AR','IP','BP','USP','EP','NF','JP']);
const properCase = (v) => String(v ?? '').replace(/[A-Za-z][A-Za-z']*/g, w => {
 const up = w.toUpperCase();
 if (KEEP_CAPS.has(up)) return up;
 return up.charAt(0) + up.slice(1).toLowerCase();
});

const fmtDate = (d) => {
 if (!d) return null;
 const dt = new Date(d);
 return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // "07 Sep"
};

/* ── Shared TV top bar (Price Board 1 & 2): compact, same info ── */
function TvTopBar({ height, date, live, countdown, page, pages, pageCountdown, progressPct, onPrev, onNext, onExit }) {
 const [now, setNow] = useState(new Date());
 useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
 // full-screen toggle (browser Fullscreen API)
 const [isFs, setIsFs] = useState(!!document.fullscreenElement);
 useEffect(() => { const h = () => setIsFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);
 const toggleFs = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
 };
 const glass = { background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 99 };
 const sep = <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.22)' }} />;
 const navB = { width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 };
 return (
  <div style={{ height, flexShrink: 0, position: 'relative', background: 'linear-gradient(90deg, #08234f 0%, #0b3f8c 50%, #0f5fae 100%)', boxShadow: '0 4px 16px rgba(0,0,0,0.35), inset 0 -1px 0 rgba(255,255,255,0.08)' }}>
   <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px' }}>
    {/* brand */}
    <div style={{ width: 36, height: 36, flexShrink: 0, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(0,0,0,0.3)' }}>
     <img src="/logo.png" alt="Lok Chemicals" style={{ width: 29, height: 'auto' }} />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
     <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: 0.4 }}>Lok Chemicals</span>
     <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
     <span style={{ fontSize: 12, fontWeight: 800, color: '#bae6fd', letterSpacing: 1.6, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99, background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(125,211,252,0.35)' }} title={`Version ${BOARD_VERSION}`}>Live Price Index</span>
    </div>

    <div style={{ flex: 1 }} />

    {/* everything in one rounded glass box: live · refresh · page · clock · exit */}
    <div style={{ ...glass, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '3px 5px 3px 12px', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
     <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4ade80', fontWeight: 900, fontSize: 11.5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'tvpulse 1.4s infinite' }} />{live} LIVE
     </span>
     {sep}
     <span style={{ fontSize: 11.5, fontWeight: 700, color: countdown <= 3 ? '#fecaca' : '#bae6fd', fontVariantNumeric: 'tabular-nums' }}>↻ {countdown}s</span>
     {pages > 1 && <>
      {sep}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
       <button onClick={onPrev} style={navB} aria-label="Previous page">‹</button>
       <span style={{ fontSize: 12, color: '#fff', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{page + 1} / {pages}</span>
       <button onClick={onNext} style={navB} aria-label="Next page">›</button>
       <span style={{ fontSize: 11, color: '#fcd34d', fontWeight: 900, minWidth: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pageCountdown}s</span>
      </span>
     </>}
     {sep}
     <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
       {`${now.toLocaleDateString('en-GB', { weekday: 'short' })}, ${String(now.getDate()).padStart(2, '0')} ${now.toLocaleDateString('en-GB', { month: 'short' })} ${now.getFullYear()}`}
      </span>
      <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
       {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
     </span>
     <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.(); onExit(); }} title="Exit" aria-label="Exit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0, borderRadius: 9, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
     </button>
     <button onClick={toggleFs} title={isFs ? 'Exit full screen' : 'Full screen'} aria-label={isFs ? 'Exit full screen' : 'Full screen'}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0, borderRadius: 9, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.45)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}>
      {isFs ? (
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
      ) : (
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
      )}
     </button>
    </div>
   </div>
   {/* page progress line */}
   <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.08)' }}>
    {progressPct != null && <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#38bdf8,#4ade80,#fcd34d)', transition: 'width 1s linear' }} />}
   </div>
   <style>{`@keyframes tvpulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
  </div>
 );
}

/* ── Price ticker ── */
// Internal office display (team-facing). Shown only when no product is starred ⭐ in Manage Products.
const RIBBON_MESSAGES = [
 'Good day, Team Lok Chemicals!',
 'Update today\'s Market & Target prices in Manage Products before quoting',
 'Check the Target range before every quote — protect our margin',
 'Market prices move fast — confirm the latest rate with Purchase before committing',
 'Star ⭐ priority products in Manage Products to show them on this ribbon',
 'Reply to open customer queries on time — every quick reply builds trust',
 'Safety first — follow PESO guidelines at every warehouse',
 'One team · one goal — let\'s make today count!',
]
function PriceTicker({ items, notice = '' }) {
 // 1) manual announcement (📢)  2) products starred ⭐ in Manage Products  3) default team messages
 const notes = notice.split(/\r?\n/).map(t => t.trim()).filter(Boolean).map(t => `📢 ${t}`);
 const starred = items.filter(i => i.price !== null && i.product?.starred)
  .map(i => `★ ${properCase(i.product.group)}${i.product.make ? ' · ' + properCase(i.product.make) : ''} — ₹${i.price.toLocaleString()}/${i.product.unit}`);
 const parts = [...notes, ...starred];
 const SEP = '   •   ';
 const PRIORITY_LABEL = 'Focus Products of the Day';
 const text = parts.length ? parts.join(SEP) + (starred.length ? PRIORITY_LABEL : '') : RIBBON_MESSAGES.join('   ✦   ');
 // One pass of the ribbon: announcements, then a bold "priority" tag in front of the starred products
 const run = !parts.length ? text : (
  <>
   {notes.join(SEP)}{notes.length && starred.length ? SEP : ''}
   {starred.length > 0 && (
    <>
     <span style={{ display: 'inline-block', background: '#0b3f8c', color: '#fff', fontSize: 12.5, fontWeight: 700, letterSpacing: 0.4, padding: '3px 12px', borderRadius: 4, marginRight: 12, verticalAlign: 'middle' }}>{PRIORITY_LABEL}</span>
     {starred.join(SEP)}
    </>
   )}
  </>
 );
 // Constant scroll speed (pixels per second) so short and long ribbons move equally fast
 const TICKER_PX_PER_SEC = 150;
 const runRef = useRef(null);
 const [dur, setDur] = useState(20);
 useEffect(() => {
  const measure = () => { const el = runRef.current; if (el) setDur(Math.max(6, (el.offsetWidth / 2) / TICKER_PX_PER_SEC)); };
  measure(); window.addEventListener('resize', measure);
  return () => window.removeEventListener('resize', measure);
 }, [text]);
 return (
  <div style={{ background: 'transparent', color: '#0a2a5e', padding: '9px 0', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 800 }}>
   <div ref={runRef} style={{ display: 'inline-block', animation: `ticker ${dur.toFixed(1)}s linear infinite`, paddingLeft: '100%' }}>
    {run}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{run}
   </div>
   <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
  </div>
 );
}

/* ── Price conditions: one fixed bold line at the top centre of both TV boards, under the top bar (not a column) ── */
const PRICE_TERMS = ['Subject to payment & delivery terms', 'Subject to relation with customer', 'Subject to last price to customer'];
const TERMS_H = 26;
function PriceTerms() {
 return (
  <div style={{ height: TERMS_H, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '0 12px', background: '#061a3d', borderBottom: '1px solid rgba(147,197,253,0.25)', color: '#fff', fontSize: 13.5, fontWeight: 800, letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden' }}>
   <span style={{ color: '#fcd34d', fontWeight: 900, letterSpacing: 1, fontSize: 12.5 }}>PRICES ARE</span>
   {PRICE_TERMS.map(t => <span key={t}><span style={{ color: '#fcd34d', marginRight: 4 }}>*</span>{t}</span>)}
  </div>
 );
}

/* ── Group row for normal view ── */
function GroupRow({ group, groupItems, showCost = true }) {
 const [open, setOpen] = useState(false);
 const priced = groupItems.filter(i => i.price !== null).length;
 return (
  <div style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
   {/* Group header */}
   <div onClick={() => setOpen(v => !v)}
    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', background: open ? '#f0f5ff' : '#fafafa', borderBottom: open ? '1px solid #e5e7eb' : 'none', transition: 'background 0.15s' }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a3a6b" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
     <polyline points="9 18 15 12 9 6"/>
    </svg>
    <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>{group}</span>
    {groupItems.some(i => i.product?.starred) && <span title="Priority product (starred in Manage Products)" style={{ display: 'inline-flex' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" style={{ flexShrink: 0 }}><polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.3 5.8 21 7.2 14 2 9.3 8.9 8.6 12 2" /></svg></span>}
    <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 7px', borderRadius: 999 }}>{groupItems.length}</span>
    <span style={{ fontSize: 11, fontWeight: 600, color: priced > 0 ? '#16a34a' : '#d1d5db', marginLeft: 2 }}>
     {priced}/{groupItems.length} priced
    </span>
    {/* Last updated date (prices hidden until expanded) */}
    <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
     {/* Most recent updated date for this group */}
     {(() => {
      const dates = groupItems.map(i => i.updatedAt || i.date).filter(Boolean);
      const latest = dates.sort().at(-1);
      return latest ? <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginLeft: 4, whiteSpace: 'nowrap' }}>{fmtDate(latest)}</span> : null;
     })()}
    </div>
   </div>

   {/* Expanded table */}
   {open && (
    <div className="table-wrap">
     <table>
      <thead>
       <tr><th>Make</th><th>Origin</th><th>Grade</th><th>Purity</th><th>Package</th><th>Unit</th>{showCost && <th style={{ color: '#64748b' }}>Cost (₹)</th>}<th style={{ color: '#e8a020' }}>Market (₹)</th><th style={{ color: '#7c3aed' }}>Target (₹)</th><th>Notes</th><th>Updated</th></tr>
      </thead>
      <tbody>
       {groupItems.map(item => (
        <tr key={item.product._id} style={{ background: item.price !== null ? undefined : '#fafafa', verticalAlign: 'middle' }}>
         <td style={{ verticalAlign: 'middle' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
           {item.product.starred && <span title="Priority" style={{ display: 'inline-flex' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" style={{ flexShrink: 0 }}><polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.3 5.8 21 7.2 14 2 9.3 8.9 8.6 12 2" /></svg></span>}
           {item.product.make || '—'}
          </span>
         </td>
         <td style={{ verticalAlign: 'middle' }}>{item.product.coo || '—'}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.product.grade || '—'}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.product.purity || '—'}</td>
         <td style={{ fontSize: 11, verticalAlign: 'middle' }}>{item.product.itemPackage || '—'}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.product.unit}</td>
         {showCost && <td style={{ verticalAlign: 'middle', color: '#475569', fontWeight: 600 }}>{item.cost != null ? `₹${Number(item.cost).toLocaleString()}` : <span className="no-price">—</span>}</td>}
         <td style={{ verticalAlign: 'middle' }}>{item.price !== null
          ? <span className="price-highlight" style={{ whiteSpace: 'nowrap' }}>₹{item.price.toLocaleString()}<span className="currency">/{item.product.unit}</span><TrendArrow item={item} size="0.8em" /></span>
          : <span className="no-price">—</span>}
         </td>
         <td style={{ verticalAlign: 'middle', color: '#7c3aed', fontWeight: 600 }}>{tgtOf(item) ? <span style={{ whiteSpace: 'nowrap' }}>₹{tgtOf(item)}</span> : <span className="no-price">—</span>}</td>
         <td style={{ fontSize: 11, color: '#6b7280', verticalAlign: 'middle' }}>{item.notes || '—'}</td>
         <td style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap', fontWeight: 600, verticalAlign: 'middle', textAlign: 'center' }}>{fmtDate(item.updatedAt || item.date) || '—'}</td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
   )}
  </div>
 );
}

export default function AdminPricing() {
 const today = new Date().toLocaleDateString('en-CA'); // local date (IST), YYYY-MM-DD
 const [date, setDate] = useState(today);
 const [items, setItems] = useState([]);
 const [groups, setGroups] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [countdown, setCountdown] = useState(REFRESH_SEC);
 const [filterGroups, setFilterGroups] = useState(new Set());
 const [showGroupDD, setShowGroupDD] = useState(false);
 const [groupSearch, setGroupSearch] = useState('');
 const [filterProducts, setFilterProducts] = useState(new Set());
 const [showProductDD, setShowProductDD] = useState(false);
 const [productSearch, setProductSearch] = useState('');
 const [tvMode, setTvMode] = useState(false);   // TV 1: Price Board
 const [tv2Mode, setTv2Mode] = useState(false); // TV 2: Price Board 2 (airport style)
 useKeepAwake(tvMode || tv2Mode);                // the screen must not sleep while a board is showing
 const TV2_PAGE_SEC = 15;
 const [tv2Page, setTv2Page] = useState(0);
 const [tv2Countdown, setTv2Countdown] = useState(TV2_PAGE_SEC);
 useEffect(() => {
  if (!tv2Mode) { setTv2Page(0); setTv2Countdown(TV2_PAGE_SEC); return; }
  const t = setInterval(() => setTv2Countdown(c => { if (c <= 1) { setTv2Page(p => p + 1); return TV2_PAGE_SEC; } return c - 1; }), 1000);
  return () => clearInterval(t);
 }, [tv2Mode]);
 const [tvPage, setTvPage] = useState(0);
 const TV_PAGE_SEC = 15;        // seconds before auto-advance
 const [tvCountdown, setTvCountdown] = useState(TV_PAGE_SEC);
 const [latestItems, setLatestItems] = useState([]); // always-latest prices for TV mode
 const groupDDRef = useRef(null);
 const productDDRef = useRef(null);

 useEffect(() => {
  const h = e => {
   if (groupDDRef.current && !groupDDRef.current.contains(e.target)) setShowGroupDD(false);
   if (productDDRef.current && !productDDRef.current.contains(e.target)) setShowProductDD(false);
  };
  document.addEventListener('mousedown', h);
  return () => document.removeEventListener('mousedown', h);
 }, []);

 // TV ribbon announcement (saved on the server, shared by every screen)
 const [ribbonText, setRibbonText] = useState('');
 const [showRibbonEd, setShowRibbonEd] = useState(false);
 const [showMenu, setShowMenu] = useState(false);
 const [ribbonDraft, setRibbonDraft] = useState('');
 const [ribbonSaving, setRibbonSaving] = useState(false);
 const ribbonRef = useRef(null);
 const loadRibbon = useCallback(() => { api.get('/settings/ribbon').then(r => setRibbonText(r.data?.text || '')).catch(() => {}); }, []);
 useEffect(() => { loadRibbon(); const t = setInterval(loadRibbon, 30000); return () => clearInterval(t); }, [loadRibbon]);
 useEffect(() => {
  const h = e => { if (ribbonRef.current && !ribbonRef.current.contains(e.target)) { setShowRibbonEd(false); setShowMenu(false); } };
  document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
 }, []);
 const saveRibbon = async (text) => {
  setRibbonSaving(true);
  try { const r = await api.put('/settings/ribbon', { text }); setRibbonText(r.data?.text || ''); setShowRibbonEd(false); }
  catch (err) { setError(err.response?.data?.message || 'Could not save the ribbon text'); }
  finally { setRibbonSaving(false); }
 };

 const loadData = useCallback(async (showSpinner = false) => {
  if (showSpinner) setLoading(true);
  setError('');
  try {
   const [priceRes, grpRes, latestRes] = await Promise.all([
    api.get(`/prices/date/${date}`),
    api.get('/products/groups'),
    api.get('/prices/latest'),
   ]);
   setItems(priceRes.data);
   setGroups(grpRes.data);
   setLatestItems(latestRes.data);
   setCountdown(REFRESH_SEC);
  } catch (err) { setError(err.response?.data?.message || 'Failed to load'); }
  finally { if (showSpinner) setLoading(false); }
 }, [date]);

 useEffect(() => { loadData(true); }, [loadData]);

 useEffect(() => {
  const t = setInterval(() => setCountdown(c => { if (c <= 1) { loadData(false); return REFRESH_SEC; } return c - 1; }), 1000);
  return () => clearInterval(t);
 }, [loadData]);

 // TV page auto-advance
 useEffect(() => {
  if (!tvMode) { setTvPage(0); setTvCountdown(TV_PAGE_SEC); return; }
  const t = setInterval(() => {
   setTvCountdown(c => {
    if (c <= 1) {
     setTvPage(p => p + 1); // will wrap in render
     return TV_PAGE_SEC;
    }
    return c - 1;
   });
  }, 1000);
  return () => clearInterval(t);
 }, [tvMode]);

 const toggleGroup = g => setFilterGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
 const toggleProduct = id => setFilterProducts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

 const exportPrices = () => {
  const headers = ['group','make','origin','grade','purity','package','unit','market','target','notes','ex','date'];
  const rows = displayItems
   .filter(i => i.price !== null)
   .map(i => [
    i.product.group, i.product.make||'', i.product.coo||'', i.product.grade||'',
    i.product.purity||'', i.product.itemPackage||'', i.product.unit||'',
    i.price, tgtOf(i), i.notes||'', i.ex||'', fmtDate(i.updatedAt||i.date)||date,
   ]);
  const lines = [headers, ...rows].map(r =>
   r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `prices-${date}.csv`; a.click();
  URL.revokeObjectURL(a.href);
 };

 const displayItems = items;
 const usingLatest = false;

 const filtered = displayItems.filter(item => {
  if (item.price === null) return false;
  return filterGroups.size === 0 || filterGroups.has(item.product?.group);
 });

 const grouped = filtered.reduce((acc, item) => {
  const g = item.product?.group || 'Other';
  if (!acc[g]) acc[g] = [];
  acc[g].push(item);
  return acc;
 }, {});

 const pricedCount = displayItems.filter(i => i.price !== null).length;

 /* ══ TV 2: PRICE BOARD 2 — airport departures style ══ */
 if (tv2Mode) {
  const rows2 = latestItems
   .filter(i => i.price !== null)
   .sort((a, b) => (a.product.group || '').localeCompare(b.product.group || '') ||
    (a.product.make || '').localeCompare(b.product.make || '', undefined, { numeric: true, sensitivity: 'base' }));
  const HDR_H = 56, COLHDR_H = 28, FOOT_H = 0, PANEL_GAP = 12;   // footer removed
  const TICK_H = 34;
  const boardH = window.innerHeight - HDR_H - FOOT_H - COLHDR_H - TICK_H - TERMS_H - 12;
  // Single column; when the screen is full the rest goes to the next screen (auto-flip every 20 s)
  const twoCols = false;
  // At least 25 products per screen: rows shrink to fit on small screens, stay 34px where there is room
  const ROWS_PER_SCREEN = 20;   // exactly 20 products on every screen; rows stretch to fill the height
  const perPanel = ROWS_PER_SCREEN;
  const ROW_H2 = Math.floor((boardH / perPanel) * 10) / 10;
  const perPage = perPanel;
  const pages2 = Math.max(1, Math.ceil(rows2.length / perPage));
  const cur2 = tv2Page % pages2;
  const pageRows = rows2.slice(cur2 * perPage, cur2 * perPage + perPage);
  const panels = [pageRows];
  // text columns flex, short columns fixed so headers + values always show in full
  // Column definitions — Board 2 shows all of them
  const DEF2 = [
   { h: 'SR NO.',  get: (it, n) => n, w: ['80px', '60px'], always: true, align: 'center', st: { color: '#fcd34d', fontWeight: 400 } },
   { h: 'PRODUCT', get: it => it.product.group,       w: ['minmax(0,3.2fr)', 'minmax(0,2.4fr)'], always: true, wrap: true, st: { color: '#fff', fontWeight: 400 } },
   { h: 'MAKE',    get: it => it.product.make,        w: ['minmax(0,1.5fr)', 'minmax(0,1.3fr)'], wrap: true, st: { color: '#fde68a', fontWeight: 400 } },
   { h: 'ORIGIN',  get: it => it.product.coo,         w: ['minmax(0,1fr)', 'minmax(0,0.9fr)'],   wrap: true, st: { fontWeight: 400 } },
   { h: 'EX',      get: it => it.ex,                  w: ['92px', '60px'],  align: 'center' },
   { h: 'GRADE',   get: it => it.product.grade,       w: ['minmax(0,1fr)', 'minmax(0,1.1fr)'],   wrap: true, st: { color: '#c4b5fd', fontWeight: 400 } },
   { h: 'PURITY',  get: it => it.product.purity,      w: ['90px', '58px'],  st: { color: '#7dd3fc', fontWeight: 400 } },
   { h: 'PACK',    get: it => it.product.itemPackage, w: ['100px', '60px'], wrap: true, st: { color: '#a7f3d0' } },
   { h: 'MARKET ₹', get: it => it.price.toLocaleString(), w: ['120px', '80px'], always: true, align: 'right', price: true },
   { h: 'TARGET ₹', get: it => tgtOf(it), w: ['110px', '76px'], align: 'right', st: { color: '#c4b5fd', fontWeight: 400 } },
   { h: 'UNIT',    get: it => it.product.unit,        w: ['70px', '46px'],  always: true, align: 'center', st: { color: '#93c5fd' } },
   { h: 'LAST UPDATE', get: it => fmtDate(it.updatedAt || it.date), w: ['90px', '58px'], always: true, align: 'center', date: true },
  ];
  // A column with no data in any product is hidden (checked across the whole board, so screens stay consistent)
  const cols2 = DEF2.filter(d => d.always || rows2.some((it, i) => { const v = d.get(it, i + 1); return v !== '' && v !== null && v !== undefined; }));
  const mono = "'Segoe UI','Inter',Arial,sans-serif";   // clean, readable TV font
  // Column widths come from the real text (measured), so words are never cut.
  // If everything doesn't fit the screen width, the font shrinks a little until it does.
  const mctx2 = document.createElement('canvas').getContext('2d');
  const tw2 = (t, font, ls = 0) => { mctx2.font = font; const str = String(t ?? ''); return mctx2.measureText(str).width + ls * str.length; };
  const PADX = twoCols ? 10 : 30;   // breathing room between columns
  const boardW = window.innerWidth - 12 - 4;
  const needFor = fs => cols2.map(d => {
   const hdr = tw2(d.h, `900 ${Math.max(11, fs - 1.5)}px ${mono}`, 1);
   const font = d.price ? `400 ${fs + 2}px ${mono}` : `${d.st?.fontWeight || 400} ${fs}px ${mono}`;
   const val = rows2.reduce((m, it, i) => Math.max(m, tw2(properCase(String(d.get(it, i + 1) || '—')), font)), 0) + (d.price ? (fs + 2) * 1.0 : 0);   // + room for the up / down arrow
   return Math.ceil(Math.max(hdr, val) + PADX + 2);
  });
  let FS = Math.max(11, Math.min(22, Math.round(ROW_H2 * 0.58 * 2) / 2));   // text fills the row height
  let need = needFor(FS);
  for (let k = 0; k < 8 && need.reduce((a, b) => a + b, 0) > boardW && FS > 10; k++) {
   FS = Math.max(10, Math.floor(FS * boardW / need.reduce((a, b) => a + b, 0) * 2) / 2);
   need = needFor(FS);
  }
  // spare width goes to the text columns (product gets the most), so the board fills the screen
  const spare = Math.max(0, boardW - need.reduce((a, b) => a + b, 0));
  // spare width is spread over every column (product gets the most) so columns sit evenly apart
  const share = { PRODUCT: 3, MAKE: 1.5, 'SR NO.': 0.3 };
  const shareOf = d => share[d.h] ?? 1;
  const shareSum = cols2.reduce((a, d) => a + shareOf(d), 0) || 1;
  const COLS = cols2.map((d, i) => `${Math.floor(need[i] + spare * shareOf(d) / shareSum)}px`).join(' ');
  const cell = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: twoCols ? '0 5px' : '0 12px' };
  // long text (product / make / coo / grade / pack) may wrap to 2 lines in 2-column mode
  const wrap = twoCols ? { whiteSpace: 'normal', lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'break-word' } : {};

  return (
   <div style={{ position: 'fixed', inset: 0, background: '#04122b', zIndex: 1000, display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
    <TvTopBar height={HDR_H} date={date} live={rows2.length} countdown={countdown}
     page={cur2} pages={pages2} pageCountdown={tv2Countdown}
     progressPct={pages2 > 1 ? ((TV2_PAGE_SEC - tv2Countdown) / TV2_PAGE_SEC) * 100 : null}
     onPrev={() => { setTv2Page(p => (p - 1 + pages2) % pages2); setTv2Countdown(TV2_PAGE_SEC); }}
     onNext={() => { setTv2Page(p => (p + 1) % pages2); setTv2Countdown(TV2_PAGE_SEC); }}
     onExit={() => setTv2Mode(false)} />
    <PriceTerms />


    {/* Board panels */}
    <div style={{ flex: 1, display: 'flex', gap: PANEL_GAP, padding: '4px 6px', minHeight: 0 }}>
     {rows2.length === 0 ? (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fcd34d', fontFamily: mono, fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>NO PRICES AVAILABLE</div>
     ) : panels.map((pRows, pi) => (
      <div key={pi} style={{ flex: 1, minWidth: 0, background: '#0a2a5e', border: '2px solid #1e4f9a', borderRadius: 6, overflow: 'hidden', boxShadow: '0 0 0 4px #020b1c, 0 10px 30px rgba(0,0,0,0.5)' }}>
       {/* Column headers */}
       <div style={{ display: 'grid', gridTemplateColumns: COLS, height: COLHDR_H, alignItems: 'center', background: 'linear-gradient(180deg, #fcd34d, #f59e0b)', color: '#0a1f45', fontWeight: 900, fontSize: Math.max(11, FS - 1.5), letterSpacing: 1, fontFamily: mono, textTransform: 'uppercase' }}>
        {cols2.map(d => <div key={d.h} style={{ ...cell, textAlign: LEFT_COLS.has(d.h) ? 'left' : 'center' }}>{d.h}</div>)}
       </div>
       {/* Rows */}
       {pRows.map((it, ri) => {
        const isToday = it.date === today;
        const srNo = cur2 * perPage + ri + 1;   // continues across screens
        return (
         <div key={it.product._id} style={{ display: 'grid', gridTemplateColumns: COLS, height: ROW_H2, alignItems: 'center', background: ri % 2 ? '#0d3470' : '#0b2c62', borderTop: '1px solid rgba(147,197,253,0.12)', fontFamily: mono, fontSize: FS, fontWeight: 400, color: '#e0f2fe', fontVariantNumeric: 'tabular-nums' }}>
          {cols2.map(d => (
           <div key={d.h} title={d.h === 'PRODUCT' ? it.product.group : undefined}
            style={{ ...cell, ...(d.wrap ? wrap : {}), textAlign: LEFT_COLS.has(d.h) ? 'left' : 'center', ...(d.st || {}),
             ...(d.price ? { color: '#4ade80', fontWeight: 400, fontSize: FS + 2 } : {}),
             ...(d.date ? { color: isToday ? '#4ade80' : '#fbbf24' } : {}) }}>
            {d.get(it, srNo) ? properCase(String(d.get(it, srNo))) : <span style={{ color: 'rgba(147,197,253,0.35)' }}>—</span>}
            {d.price && <TrendArrow item={it} />}
           </div>
          ))}
         </div>
        );
       })}
      </div>
     ))}
    </div>


    {/* Live ribbon (bottom of the screen) */}
    <div style={{ height: TICK_H, flexShrink: 0, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderTop: '2px solid #fcd34d', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
     <span style={{ flexShrink: 0, background: '#0b3f8c', color: '#fff', fontSize: 12, fontWeight: 900, letterSpacing: 1, padding: '8px 14px', zIndex: 1 }}>● LIVE</span>
     <div style={{ flex: 1, overflow: 'hidden' }}><PriceTicker items={latestItems} notice={ribbonText} /></div>
    </div>

   </div>
  );
 }

 /* ══ TV MODE ══ */
 if (tvMode) {
  const tvGrouped = latestItems.filter(i => i.price !== null).reduce((acc, item) => {
   const g = item.product?.group || 'Other';
   if (!acc[g]) acc[g] = [];
   acc[g].push(item);
   return acc;
  }, {});
  // Sort groups by number of priced entries descending (most entries first)
  // Within each group, sort products alphanumerically by make
  const allGroups = Object.entries(tvGrouped)
   .sort((a, b) => b[1].length - a[1].length)
   .map(([group, gItems]) => [
    group,
    [...gItems].sort((a, b) => (a.product.make || '').localeCompare(b.product.make || '', undefined, { numeric: true, sensitivity: 'base' }))
   ]);

  // Fixed 5 columns × 3 rows
  const GAP = 8;
  const TOP_BAR_H = 56;
  const TICKER_H  = 40;
  const DOTS_H    = 24;
  const PAD_V     = 16;
  const availH = window.innerHeight - TOP_BAR_H - TICKER_H - TERMS_H - DOTS_H - PAD_V;

  // Card height depends on its rows → pack cards into 5 columns, new page when full
  const HEAD_H = 32, ROW_H = 28, ROW_H2L = 40;   // row grows to 2 lines when text needs it
  // Card columns — each card shows only the ones it has data for
  const DEF1 = [
   { h: 'MAKE',   get: it => it.product.make,        w: 'minmax(0,1.4fr)', st: { fontSize: 13.5, fontWeight: 400, color: '#0f1f3d' } },
   { h: 'ORIGIN', get: it => it.product.coo,         w: 'minmax(0,1fr)',   st: { color: '#475569', fontWeight: 400 } },
   { h: 'EX',     get: it => it.ex,                  w: 'minmax(0,0.9fr)', st: { color: '#1d4ed8' } },
   { h: 'GRADE',  get: it => it.product.grade,       w: 'minmax(0,1fr)',   st: { color: '#6d28d9', fontWeight: 400 } },
   { h: 'PURITY', get: it => it.product.purity,      w: 'minmax(0,0.9fr)', st: { color: '#0369a1', fontWeight: 400 } },
   { h: 'PACK',   get: it => it.product.itemPackage, w: 'minmax(0,1fr)',   st: { color: '#065f46' } },
  ];
  // Fixed grid: 4 columns × 3 rows of equal-size cards (12 per page).
  // Each card shows only the columns it has data for, sized to its own content.
  const GRID_COLS = 4, GRID_ROWS = 3;
  const mctx = document.createElement('canvas').getContext('2d');
  const tw = (t, font, ls = 0) => { mctx.font = font; const str = String(t ?? ''); return Math.ceil(mctx.measureText(str).width + ls * str.length); };
  const F_HDR = "800 9.5px 'Segoe UI', sans-serif";
  const F_SMALLP = "400 13px 'Segoe UI', sans-serif", F_BIGP = "400 18px 'Segoe UI', sans-serif";
  const CGAP = 6, UNIT_W = 38, DATE_W = 76;
  const hdrW = h => tw(h, F_HDR, 0.6);
  const maxOf = (arr, f) => arr.reduce((m, x) => Math.max(m, f(x)), 0);
  const txt = (d, it) => properCase(String(d.get(it) || '—'));
  const fnt = d => `${d.st?.fontWeight || 400} ${d.h === 'MAKE' ? 13.5 : 12}px 'Segoe UI', sans-serif`;
  const CARD_PAD = 7;   // left/right padding inside a card row
  const cardW = (window.innerWidth - 20 - GAP * (GRID_COLS - 1)) / GRID_COLS - 2;
  const cellH = Math.floor((availH - GAP * (GRID_ROWS - 1)) / GRID_ROWS);

  const layoutFor = gItems => {
   const cols = DEF1.filter(d => gItems.some(it => d.get(it)));
   const hasCost = false;   // cost is not shown on the TV boards
   const hasTarget = gItems.some(it => tgtOf(it));
   const colW = cols.map(d => Math.min(200, Math.max(hdrW(d.h), maxOf(gItems, it => tw(txt(d, it), fnt(d))))) + 2);
   const costW = hasCost ? Math.max(hdrW('COST ₹'), maxOf(gItems, it => tw(it.cost != null ? `₹${Number(it.cost).toLocaleString()}` : '—', F_SMALLP))) + 2 : 0;
   // Same date / same unit for the whole card → shown once (date in the card header, unit in the MARKET header)
   const dateSet = new Set(gItems.map(it => fmtDate(it.updatedAt || it.date) || ''));
   const unitSet = new Set(gItems.map(it => properCase(it.product.unit || '')));
   const showDate = dateSet.size > 1, showUnit = unitSet.size > 1;
   const oneDate = showDate ? '' : [...dateSet][0];
   const mktHdr = showUnit ? 'MARKET ₹' : `MARKET ₹/${String([...unitSet][0] || '').toUpperCase()}`;
   const mktW = Math.max(hdrW(mktHdr), maxOf(gItems, it => tw(`₹${it.price.toLocaleString()}`, F_BIGP)) + 18) + 2;   // + room for the up / down arrow
   const tgtW = hasTarget ? Math.max(hdrW('TARGET ₹'), maxOf(gItems, it => tw(tgtOf(it) ? `₹${tgtOf(it)}` : '—', F_SMALLP))) + 2 : 0;
   const nCols = cols.length + (hasCost ? 1 : 0) + 1 + (hasTarget ? 1 : 0) + (showUnit ? 1 : 0) + (showDate ? 1 : 0);
   const fixedW = costW + mktW + tgtW + (showUnit ? UNIT_W : 0) + (showDate ? DATE_W : 0) + CGAP * (nCols - 1);
   // every text column must fit its longest single word (words never split)
   const minW = cols.map(d => Math.min(150, Math.max(hdrW(d.h.split(' ')[0]), maxOf(gItems, it => maxOf(txt(d, it).split(/\s+/), w => tw(w, fnt(d)))))) + 2);
   const reqMin = minW.reduce((a, b) => a + b, 0) + fixedW;
   // if the card is too narrow, shrink this card's table a little instead of cutting text
   // shrink when the card is too narrow; grow (up to 1.35×) on big TVs so text is easier to read
   const scale = Math.min(1.35, cardW / (reqMin + 2 * CARD_PAD));
   const innerW = cardW / scale - 2 * CARD_PAD;
   const textAvail = innerW - fixedW;
   // start every column at its minimum, share the extra space towards each column's full width
   let colPx = [...minW];
   let extra = textAvail - colPx.reduce((a, b) => a + b, 0);
   const want = colW.map((w, i) => Math.max(0, w - minW[i]));
   const wantSum = want.reduce((a, b) => a + b, 0);
   if (extra > 0 && wantSum > 0) { const give = Math.min(extra, wantSum); colPx = colPx.map((w, i) => w + (give * want[i]) / wantSum); extra -= give; }
   if (extra > 0 && colPx.length) colPx[0] += extra;
   const grid = [
    ...colPx.map(w => `${Math.floor(w)}px`),
    ...(hasCost ? [`${costW}px`] : []),
    cols.length ? `${mktW}px` : `minmax(${mktW}px, 1fr)`,
    ...(hasTarget ? [`${tgtW}px`] : []),
    ...(showUnit ? [`${UNIT_W}px`] : []), ...(showDate ? [`${DATE_W}px`] : []),
   ].join(' ');
   const colhdrH = cols.some((d, i) => hdrW(d.h) > colPx[i]) ? 30 : 22;
   const rowH = it => (cols.some((d, i) => tw(txt(d, it), fnt(d)) > colPx[i] + 1) ? ROW_H2L : ROW_H);
   return { cols, hasCost, hasTarget, grid, colhdrH, rowH, scale, showDate, showUnit, oneDate, mktHdr };
  };

  // Split each product into equal-size cards; a product with more rows continues: "(1/2)", "(2/2)"
  const chunks = [];
  allGroups.forEach(([group, gItems]) => {
   const L = layoutFor(gItems);
   const bodyH = (cellH - HEAD_H - 2) / L.scale - L.colhdrH;   // in the card's (possibly scaled) units
   const parts = []; let cur = [], used = 0;
   gItems.forEach(it => {
    const h = L.rowH(it);
    if (cur.length && used + h > bodyH) { parts.push(cur); cur = []; used = 0; }
    cur.push(it); used += h;
   });
   if (cur.length) parts.push(cur);
   parts.forEach((items, i) => chunks.push({ key: `${group}#${i}`, group, items, total: gItems.length, part: parts.length > 1 ? `${i + 1}/${parts.length}` : '', L }));
  });
  const perPage1 = GRID_COLS * GRID_ROWS;
  const pages = [];
  for (let i = 0; i < chunks.length; i += perPage1) pages.push(chunks.slice(i, i + perPage1));

  const totalPages = pages.length;
  const curPage = totalPages > 0 ? tvPage % totalPages : 0;
  const pageCards1 = pages[curPage] || [];
  const progressPct = ((TV_PAGE_SEC - tvCountdown) / TV_PAGE_SEC) * 100;
  const liveCount = latestItems.filter(i => i.price !== null).length;

  return (
   <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at top, #123a78 0%, #0a1f45 60%, #07162f 100%)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Segoe UI','Inter',Arial,sans-serif" }}>

    <TvTopBar height={TOP_BAR_H} date={date} live={liveCount} countdown={countdown}
     page={curPage} pages={totalPages} pageCountdown={tvCountdown} progressPct={progressPct}
     onPrev={() => { setTvPage(p => (p - 1 + totalPages) % totalPages); setTvCountdown(TV_PAGE_SEC); }}
     onNext={() => { setTvPage(p => (p + 1) % totalPages); setTvCountdown(TV_PAGE_SEC); }}
     onExit={() => setTvMode(false)} />
    <PriceTerms />


    {/* ── 5 × 3 Grid ── */}
    <div style={{ flex: 1, padding: `${PAD_V / 2}px 10px`, minHeight: 0 }}>
     {allGroups.length === 0
      ? (
       <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#93c5fd' }}>
        <div style={{ width: 90, height: 90, background: '#fff', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9 }}>
         <img src="/logo.png" alt="" style={{ width: 72 }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e0f2fe' }}>No prices available</div>
        <div style={{ fontSize: 14, color: '#7dd3fc' }}>Prices will appear here automatically as soon as they are updated.</div>
       </div>
      ) : <>
       <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0,1fr))`, gridTemplateRows: `repeat(${GRID_ROWS}, ${cellH}px)`, gap: GAP, height: availH, overflow: 'hidden' }}>
        {pageCards1.map(({ key, group, items: gItems, total, part, L }) => (
           <div key={key} style={{ background: '#ffffff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.30)', height: cellH, minWidth: 0 }}>
            {/* Header */}
            <div style={{ height: HEAD_H, background: 'linear-gradient(90deg, #0b3f8c, #1d6fd1)', padding: '0 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontWeight: 400, color: '#fff', fontSize: 14, letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={group}>{properCase(group)}{part && <span style={{ color: '#bae6fd', fontWeight: 700, marginLeft: 6 }}>({part})</span>}</span>
             <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 6 }}>
              {L.oneDate && <span style={{ fontSize: 11, color: '#fde68a', fontWeight: 800, whiteSpace: 'nowrap' }}>{L.oneDate}</span>}
              <span style={{ fontSize: 11, color: '#0b3f8c', background: '#bae6fd', padding: '1px 8px', borderRadius: 99, fontWeight: 800 }}>{total}</span>
             </span>
            </div>
            {(() => {
             const { cols, hasCost, hasTarget, grid, colhdrH, rowH, scale, showDate, showUnit, mktHdr } = L;
             const cellS = { textAlign: 'center', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
             const wrapS = { textAlign: 'center', minWidth: 0, overflow: 'hidden', whiteSpace: 'normal', lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'normal', overflowWrap: 'normal' };
             return (
              <div style={{ zoom: scale }}>
               {/* Column headers (only the columns this card uses) */}
               <div style={{ display: 'grid', gridTemplateColumns: grid, columnGap: CGAP, alignItems: 'center', height: colhdrH, padding: `0 ${CARD_PAD}px`, background: '#e8f0fb', lineHeight: 1.1, borderBottom: '1px solid #d6e2f3', fontSize: 9.5, fontWeight: 800, color: '#0b3f8c', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {cols.map(d => <span key={d.h} style={{ ...wrapS, textAlign: LEFT_COLS.has(d.h) ? 'left' : 'center' }}>{d.h}</span>)}
                {hasCost && <span style={{ ...cellS, textAlign: 'center' }}>COST ₹</span>}
                <span style={{ ...cellS, textAlign: 'center' }}>{mktHdr}</span>
                {hasTarget && <span style={{ ...cellS, textAlign: 'center' }}>TARGET ₹</span>}
                {showUnit && <span style={{ ...cellS, textAlign: 'center' }}>UNIT</span>}
                {showDate && <span style={{ ...cellS, textAlign: 'center' }}>LAST UPDATE</span>}
               </div>
               {/* Rows */}
               {gItems.map((item, idx) => (
                <div key={item.product._id} style={{ display: 'grid', gridTemplateColumns: grid, columnGap: CGAP, alignItems: 'center', height: rowH(item), padding: `0 ${CARD_PAD}px`, borderTop: idx ? '1px solid #e6edf7' : 'none', background: idx % 2 ? '#f3f7fd' : '#fff', fontSize: 12, fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>
                 {cols.map(d => (
                  <span key={d.h} title={d.get(item) || ''} style={{ ...wrapS, textAlign: LEFT_COLS.has(d.h) ? 'left' : 'center', ...d.st, ...(d.get(item) ? {} : { color: '#cbd5e1' }) }}>{properCase(d.get(item) || '—')}</span>
                 ))}
                 {hasCost && <span style={{ fontSize: 13, fontWeight: 400, color: '#475569', whiteSpace: 'nowrap', textAlign: 'center' }}>{item.cost != null ? `₹${Number(item.cost).toLocaleString()}` : '—'}</span>}
                 <span style={{ fontSize: 18, fontWeight: 400, color: '#15803d', letterSpacing: -0.3, whiteSpace: 'nowrap', textAlign: 'center' }}>₹{item.price.toLocaleString()}<TrendArrow item={item} /></span>
                 {hasTarget && <span style={{ fontSize: 13, fontWeight: 400, color: '#7c3aed', whiteSpace: 'nowrap', textAlign: 'center' }}>{tgtOf(item) ? `₹${tgtOf(item)}` : '—'}</span>}
                 {showUnit && <span style={{ fontSize: 11, fontWeight: 400, color: '#0369a1', background: '#e0f2fe', borderRadius: 4, textAlign: 'center', padding: '1px 0' }}>{properCase(item.product.unit)}</span>}
                 {showDate && <span style={{ fontSize: 11, fontWeight: 400, color: '#b45309', whiteSpace: 'nowrap', textAlign: 'center' }}>{fmtDate(item.updatedAt || item.date) || ''}</span>}
                </div>
               ))}
              </div>
             );
            })()}
           </div>
        ))}
       </div>
       {/* Page dots */}
       {totalPages > 1 && (
        <div style={{ height: DOTS_H, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
         {Array.from({ length: totalPages }).map((_, i) => (
          <button key={i} onClick={() => { setTvPage(i); setTvCountdown(TV_PAGE_SEC); }}
           style={{ width: i === curPage ? 26 : 9, height: 9, borderRadius: 5, background: i === curPage ? '#38bdf8' : 'rgba(186,230,253,0.35)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
         ))}
        </div>
       )}
      </>}
    </div>

    {/* Live ribbon (bottom of the screen) */}
    <div style={{ flexShrink: 0, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderTop: '2px solid #fcd34d', display: 'flex', alignItems: 'center' }}>
     <span style={{ flexShrink: 0, background: '#0b3f8c', color: '#fff', fontSize: 12, fontWeight: 900, letterSpacing: 1, padding: '10px 14px', zIndex: 1 }}>● LIVE</span>
     <div style={{ flex: 1, overflow: 'hidden' }}><PriceTicker items={latestItems} notice={ribbonText} /></div>
    </div>
    <style>{`@keyframes tvpulse{0%,100%{opacity:1}50%{opacity:.25}}`}</style>
   </div>
  );
 }

 /* ══ NORMAL VIEW ══ */
 return (
  <div>
   {/* ── Sticky compact header row ── */}
   <div className="sticky-page-header">
   <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a3a6b', flexShrink: 0 }}>Dashboard</h2>
    <div style={{ flex: 1 }} />

    {/* Inline stats */}
    <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>Total: <strong style={{ color: '#1a3a6b' }}>{Object.keys(grouped).length}</strong></span>
    <span style={{ fontSize: 12, color: countdown <= 10 ? '#dc2626' : '#9ca3af', flexShrink: 0 }}>↻ {countdown}s</span>

    {/* Date */}
    <input type="date" value={date} onChange={e => setDate(e.target.value)} max={today}
     style={{ padding: '6px 9px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, flexShrink: 0 }} />

    {/* Group filter */}
    <div style={{ position: 'relative', flexShrink: 0 }} ref={groupDDRef}>
     <button onClick={() => setShowGroupDD(v => !v)}
      style={{ padding: '6px 12px', border: `1.5px solid ${filterGroups.size ? '#1a3a6b' : '#e5e7eb'}`, borderRadius: 7, fontSize: 12, background: '#fff', cursor: 'pointer', color: filterGroups.size ? '#1a3a6b' : '#9ca3af', fontWeight: filterGroups.size ? 600 : 400, whiteSpace: 'nowrap' }}>
      {filterGroups.size === 0 ? 'All Groups' : `${filterGroups.size} group${filterGroups.size > 1 ? 's' : ''}`} ▾
     </button>
     {showGroupDD && (() => {
      const q = groupSearch.trim().toLowerCase();
      const shown = q ? groups.filter(g => String(g).toLowerCase().includes(q)) : groups;
      const allOn = shown.length > 0 && shown.every(g => filterGroups.has(g));
      const someOn = !allOn && shown.some(g => filterGroups.has(g));
      const toggleAll = () => setFilterGroups(prev => {
       const n = new Set(prev);
       if (allOn) shown.forEach(g => n.delete(g)); else shown.forEach(g => n.add(g));
       return n;
      });
      return (
      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 250, overflow: 'hidden' }}>
       <div style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ position: 'relative' }}>
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.4" strokeLinecap="round" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
         <input value={groupSearch} onChange={e => setGroupSearch(e.target.value)} placeholder="Search group…" autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 26px 6px 28px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none' }} />
         {groupSearch && <button onClick={() => setGroupSearch('')} title="Clear search" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 2 }}>✕</button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
         <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: shown.length ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, color: '#1a3a6b', padding: '0 4px' }}>
          <input type="checkbox" checked={allOn} disabled={!shown.length} ref={el => { if (el) el.indeterminate = someOn; }} onChange={toggleAll} style={{ accentColor: '#1a3a6b', cursor: 'pointer', width: 14, height: 14 }} />
          {q ? `Select all results (${shown.length})` : `Select all (${groups.length})`}
         </label>
         {filterGroups.size > 0 && <button onClick={() => setFilterGroups(new Set())} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear ({filterGroups.size})</button>}
        </div>
       </div>
       <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
        {shown.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>No group matches “{groupSearch}”</div>}
        {shown.map(g => (
         <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, background: filterGroups.has(g) ? '#f0f5ff' : 'transparent', color: filterGroups.has(g) ? '#1a3a6b' : '#374151' }}>
          <input type="checkbox" checked={filterGroups.has(g)} onChange={() => toggleGroup(g)} style={{ accentColor: '#1a3a6b', cursor: 'pointer', width: 14, height: 14, flexShrink: 0 }} />
          {g}
         </label>
        ))}
       </div>
      </div>
      );
     })()}
    </div>


    {/* Actions menu: Export, Refresh, Ribbon, Price Board 1 & 2 */}
    <div style={{ position: 'relative', flexShrink: 0 }} ref={ribbonRef}>
     <button onClick={() => { setShowMenu(v => !v); setShowRibbonEd(false); }} title="Actions" aria-label="Actions"
      style={{ position: 'relative', width: 34, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showMenu || showRibbonEd ? 'linear-gradient(135deg,#1d58a8,#0e9f7a)' : '#fff', color: showMenu || showRibbonEd ? '#fff' : '#1d58a8', border: `1.5px solid ${showMenu || showRibbonEd ? 'transparent' : '#c7d7fa'}`, borderRadius: 8, cursor: 'pointer', padding: 0, boxShadow: '0 1px 4px rgba(15,40,80,0.08)' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/></svg>
      {ribbonText && <span style={{ position: 'absolute', top: -4, right: -4, width: 9, height: 9, borderRadius: 99, background: '#f59e0b', border: '2px solid #fff' }} />}
     </button>
     {showMenu && !showRibbonEd && (
      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 300, width: 210, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 14px 36px rgba(15,40,80,0.18)', padding: 6 }}>
       {[
        { icon: '↓', label: 'Export CSV', color: '#16a34a', bg: '#f0fdf4', act: () => { setShowMenu(false); exportPrices(); } },
        { icon: '↻', label: 'Refresh', color: '#1d58a8', bg: '#eff6ff', act: () => { setShowMenu(false); loadData(); } },
        { icon: '📢', label: 'Ribbon announcement', color: '#92400e', bg: '#fef3c7', dot: !!ribbonText, act: () => { setRibbonDraft(ribbonText); setShowMenu(false); setShowRibbonEd(true); } },
        { icon: '📺', label: 'Price Board 1', color: '#0b3f8c', bg: '#e0ecff', sep: true, act: () => { keepAwakeOn(); setShowMenu(false); setTvMode(true); } },
        { icon: '✈️', label: 'Price Board 2', color: '#0e7490', bg: '#e0f7fd', act: () => { keepAwakeOn(); setShowMenu(false); setTv2Mode(true); } },
       ].filter(Boolean).map(it => (
        <Fragment key={it.label}>
         {it.sep && <div style={{ height: 1, background: '#eef2f7', margin: '4px 6px' }} />}
         <button onClick={it.act}
          onMouseEnter={e => { e.currentTarget.style.background = '#f5f8fd'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: '#1f2937' }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: it.bg, color: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{it.icon}</span>
          <span style={{ flex: 1 }}>{it.label}</span>
          {it.dot && <span title="Announcement is live" style={{ width: 7, height: 7, borderRadius: 99, background: '#f59e0b' }} />}
         </button>
        </Fragment>
       ))}
      </div>
     )}
     {showRibbonEd && (
      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 300, width: 340, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 14px 36px rgba(15,40,80,0.18)', padding: 12 }}>
       <div style={{ fontSize: 12, fontWeight: 800, color: '#1a3a6b', marginBottom: 2 }}>📢 TV ribbon announcement</div>
       <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Shown first on the gold ribbon of Price Board 1 &amp; 2. One message per line.</div>
       <textarea value={ribbonDraft} onChange={e => setRibbonDraft(e.target.value)} rows={4} autoFocus
        placeholder={'e.g. Office closed on Saturday\nNew ACETONE stock arrived at Bhiwandi'}
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
       <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button onClick={() => saveRibbon(ribbonDraft)} disabled={ribbonSaving}
         style={{ flex: 1, padding: '7px', background: 'linear-gradient(135deg,#1d58a8,#0e9f7a)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
         {ribbonSaving ? 'Saving…' : 'Save & show'}
        </button>
        {ribbonText && (
         <button onClick={() => saveRibbon('')} disabled={ribbonSaving}
          style={{ padding: '7px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Clear
         </button>
        )}
       </div>
      </div>
     )}
    </div>
   </div>
   </div>{/* /sticky-page-header */}

   {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

   {usingLatest && (
    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
     <span>ℹ</span> No prices entered for <strong>{date}</strong> — showing latest available prices below.
    </div>
   )}

   {loading ? (
    <div className="spinner">Loading...</div>
   ) : Object.keys(grouped).length === 0 ? (
    <div className="card"><div className="empty-state"><p style={{ fontSize: 13 }}>No prices available.</p></div></div>
   ) : (
    Object.entries(grouped).map(([group, groupItems]) => (
     <GroupRow key={group} group={group} groupItems={groupItems} showCost={false} />
    ))
   )}
  </div>
 );
}
