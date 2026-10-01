import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import '../Dashboard.css';

const REFRESH_SEC = 7;

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
     <span style={{ fontSize: 12, fontWeight: 800, color: '#bae6fd', letterSpacing: 1.6, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99, background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(125,211,252,0.35)' }}>Live Price Index</span>
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
 'Update today\'s Cost, Market & Target prices in Manage Products before quoting',
 'Check Cost vs Target before every quote — protect our margin',
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
  .map(i => `★ ${i.product.group}${i.product.make ? ' · ' + i.product.make : ''} — ₹${i.price.toLocaleString()}/${i.product.unit}`);
 const parts = [...notes, ...starred];
 const text = parts.length ? parts.join('   •   ') : RIBBON_MESSAGES.join('   ✦   ');
 return (
  <div style={{ background: 'transparent', color: '#0a2a5e', padding: '9px 0', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 800 }}>
   <div style={{ display: 'inline-block', animation: `ticker ${Math.max(25, Math.round(text.length * 0.11))}s linear infinite`, paddingLeft: '100%' }}>
    {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
   </div>
   <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
  </div>
 );
}

/* ── Group row for normal view ── */
function GroupRow({ group, groupItems }) {
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
    {/* Latest prices preview */}
    <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
     {groupItems.filter(i => i.price !== null).slice(0, 3).map(i => (
      <span key={i.product._id} style={{ fontSize: 11, background: '#e8f5e9', color: '#15803d', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
       {i.product.make || i.product.grade || '—'} ₹{i.price.toLocaleString()}
      </span>
     ))}
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
       <tr><th>Make</th><th>COO</th><th>Grade</th><th>Purity</th><th>Package</th><th>Unit</th><th style={{ color: '#64748b' }}>Cost (₹)</th><th style={{ color: '#e8a020' }}>Market (₹)</th><th style={{ color: '#7c3aed' }}>Target (₹)</th><th>Notes</th><th>Updated</th></tr>
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
         <td style={{ verticalAlign: 'middle', color: '#475569', fontWeight: 600 }}>{item.cost != null ? `₹${Number(item.cost).toLocaleString()}` : <span className="no-price">—</span>}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.price !== null
          ? <span className="price-highlight">₹{item.price.toLocaleString()}<span className="currency">/{item.product.unit}</span></span>
          : <span className="no-price">—</span>}
         </td>
         <td style={{ verticalAlign: 'middle', color: '#7c3aed', fontWeight: 600 }}>{item.target != null ? `₹${Number(item.target).toLocaleString()}` : <span className="no-price">—</span>}</td>
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
 const [filterProducts, setFilterProducts] = useState(new Set());
 const [showProductDD, setShowProductDD] = useState(false);
 const [productSearch, setProductSearch] = useState('');
 const [tvMode, setTvMode] = useState(false);   // TV 1: Price Board
 const [tv2Mode, setTv2Mode] = useState(false); // TV 2: Price Board 2 (airport style)
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
 const [ribbonDraft, setRibbonDraft] = useState('');
 const [ribbonSaving, setRibbonSaving] = useState(false);
 const ribbonRef = useRef(null);
 const loadRibbon = useCallback(() => { api.get('/settings/ribbon').then(r => setRibbonText(r.data?.text || '')).catch(() => {}); }, []);
 useEffect(() => { loadRibbon(); const t = setInterval(loadRibbon, 30000); return () => clearInterval(t); }, [loadRibbon]);
 useEffect(() => {
  const h = e => { if (ribbonRef.current && !ribbonRef.current.contains(e.target)) setShowRibbonEd(false); };
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
  const headers = ['group','make','coo','grade','purity','package','unit','cost','market','target','notes','ex','date'];
  const rows = displayItems
   .filter(i => i.price !== null)
   .map(i => [
    i.product.group, i.product.make||'', i.product.coo||'', i.product.grade||'',
    i.product.purity||'', i.product.itemPackage||'', i.product.unit||'',
    i.cost ?? '', i.price, i.target ?? '', i.notes||'', i.ex||'', fmtDate(i.updatedAt||i.date)||date,
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
  const boardH = window.innerHeight - HDR_H - FOOT_H - COLHDR_H - TICK_H - 12;
  // Single column; when the screen is full the rest goes to the next screen (auto-flip every 20 s)
  const twoCols = false;
  // At least 25 products per screen: rows shrink to fit on small screens, stay 34px where there is room
  const MIN_ROWS = 25;
  const perPanel = Math.max(MIN_ROWS, Math.floor(boardH / 34));
  const ROW_H2 = Math.floor((boardH / perPanel) * 10) / 10;
  const perPage = perPanel;
  const pages2 = Math.max(1, Math.ceil(rows2.length / perPage));
  const cur2 = tv2Page % pages2;
  const pageRows = rows2.slice(cur2 * perPage, cur2 * perPage + perPage);
  const panels = [pageRows];
  // text columns flex, short columns fixed so headers + values always show in full
  // Column definitions — Board 2 shows all of them
  const DEF2 = [
   { h: 'SR NO.',  get: (it, n) => n, w: ['80px', '60px'], always: true, align: 'center', st: { color: '#fcd34d', fontWeight: 900 } },
   { h: 'PRODUCT', get: it => it.product.group,       w: ['minmax(0,3.2fr)', 'minmax(0,2.4fr)'], always: true, wrap: true, st: { color: '#fff', fontWeight: 900 } },
   { h: 'MAKE',    get: it => it.product.make,        w: ['minmax(0,1.5fr)', 'minmax(0,1.3fr)'], wrap: true, st: { color: '#fde68a' } },
   { h: 'COO',     get: it => it.product.coo,         w: ['minmax(0,1fr)', 'minmax(0,0.9fr)'],   wrap: true },
   { h: 'GRADE',   get: it => it.product.grade,       w: ['minmax(0,1fr)', 'minmax(0,1.1fr)'],   wrap: true, st: { color: '#c4b5fd' } },
   { h: 'PURITY',  get: it => it.product.purity,      w: ['90px', '58px'],  st: { color: '#7dd3fc' } },
   { h: 'PACK',    get: it => it.product.itemPackage, w: ['100px', '60px'], wrap: true, st: { color: '#a7f3d0' } },
   { h: 'COST ₹',   get: it => (it.cost != null ? Number(it.cost).toLocaleString() : ''),     w: ['110px', '76px'], align: 'right', st: { color: '#cbd5e1' } },
   { h: 'MARKET ₹', get: it => it.price.toLocaleString(), w: ['120px', '80px'], always: true, align: 'right', price: true },
   { h: 'TARGET ₹', get: it => (it.target != null ? Number(it.target).toLocaleString() : ''), w: ['110px', '76px'], align: 'right', st: { color: '#c4b5fd', fontWeight: 900 } },
   { h: 'UNIT',    get: it => it.product.unit,        w: ['70px', '46px'],  always: true, align: 'center', st: { color: '#93c5fd' } },
   { h: 'EX',      get: it => it.ex,                  w: ['92px', '60px'],  align: 'center' },
   { h: 'DATE',    get: it => fmtDate(it.updatedAt || it.date), w: ['90px', '58px'], always: true, align: 'center', date: true },
  ];
  const cols2 = DEF2; // Board 2 always shows every column (empty values show as —)
  const FS = Math.max(11, Math.min(18, Math.round(ROW_H2 * 0.58 * 2) / 2));   // text fills the row height (no wasted space)
  // fixed (px) columns grow with the text size so big-screen text still fits
  const COLS = cols2.map(d => { const w = d.w[twoCols ? 1 : 0]; return w.endsWith('px') ? `${Math.round(parseFloat(w) * Math.max(1, FS / 14))}px` : w; }).join(' ');
  const mono = "'Consolas','Roboto Mono','Courier New',monospace";
  const cell = { whiteSpace: 'nowrap', overflow: 'hidden', padding: twoCols ? '0 5px' : '0 8px' };
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

    {/* Board panels */}
    <div style={{ flex: 1, display: 'flex', gap: PANEL_GAP, padding: '4px 6px', minHeight: 0 }}>
     {rows2.length === 0 ? (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fcd34d', fontFamily: mono, fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>NO PRICES AVAILABLE</div>
     ) : panels.map((pRows, pi) => (
      <div key={pi} style={{ flex: 1, minWidth: 0, background: '#0a2a5e', border: '2px solid #1e4f9a', borderRadius: 6, overflow: 'hidden', boxShadow: '0 0 0 4px #020b1c, 0 10px 30px rgba(0,0,0,0.5)' }}>
       {/* Column headers */}
       <div style={{ display: 'grid', gridTemplateColumns: COLS, height: COLHDR_H, alignItems: 'center', background: 'linear-gradient(180deg, #fcd34d, #f59e0b)', color: '#0a1f45', fontWeight: 900, fontSize: Math.max(11, FS - 1.5), letterSpacing: 1, fontFamily: mono }}>
        {cols2.map(d => <div key={d.h} style={{ ...cell, textAlign: d.align || 'left' }}>{d.h}</div>)}
       </div>
       {/* Rows */}
       {pRows.map((it, ri) => {
        const isToday = it.date === today;
        const srNo = cur2 * perPage + ri + 1;   // continues across screens
        return (
         <div key={it.product._id} style={{ display: 'grid', gridTemplateColumns: COLS, height: ROW_H2, alignItems: 'center', background: ri % 2 ? '#0d3470' : '#0b2c62', borderTop: '1px solid rgba(147,197,253,0.12)', fontFamily: mono, fontSize: FS, fontWeight: 700, color: '#e0f2fe', textTransform: 'uppercase' }}>
          {cols2.map(d => (
           <div key={d.h} title={d.h === 'PRODUCT' ? it.product.group : undefined}
            style={{ ...cell, ...(d.wrap ? wrap : {}), textAlign: d.align || 'left', ...(d.st || {}),
             ...(d.price ? { color: '#4ade80', fontWeight: 900, fontSize: FS + 2 } : {}),
             ...(d.date ? { color: isToday ? '#4ade80' : '#fbbf24' } : {}) }}>
            {d.get(it, srNo) || '—'}
           </div>
          ))}
         </div>
        );
       })}
      </div>
     ))}
    </div>

    {/* Ticker (same as Price Board 1) */}
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
  const availH = window.innerHeight - TOP_BAR_H - TICKER_H - DOTS_H - PAD_V;

  // Card height depends on its rows → pack cards into 5 columns, new page when full
  const HEAD_H = 32, ROW_H = 28, ROW_H2L = 40;   // row grows to 2 lines when text needs it
  // Card columns — each card shows only the ones it has data for
  const DEF1 = [
   { h: 'MAKE',   get: it => it.product.make,        w: 'minmax(0,1.4fr)', st: { fontSize: 13.5, fontWeight: 800, color: '#0f1f3d' } },
   { h: 'COO',    get: it => it.product.coo,         w: 'minmax(0,1fr)',   st: { color: '#475569' } },
   { h: 'GRADE',  get: it => it.product.grade,       w: 'minmax(0,1fr)',   st: { color: '#6d28d9' } },
   { h: 'PURITY', get: it => it.product.purity,      w: 'minmax(0,0.9fr)', st: { color: '#0369a1' } },
   { h: 'PACK',   get: it => it.product.itemPackage, w: 'minmax(0,1fr)',   st: { color: '#065f46' } },
   { h: 'EX',     get: it => it.ex,                  w: 'minmax(0,0.9fr)', st: { color: '#1d4ed8' } },
  ];
  // Fixed grid: 4 columns × 3 rows of equal-size cards (12 per page).
  // Each card shows only the columns it has data for, sized to its own content.
  const GRID_COLS = 4, GRID_ROWS = 3;
  const mctx = document.createElement('canvas').getContext('2d');
  const tw = (t, font, ls = 0) => { mctx.font = font; const str = String(t ?? ''); return Math.ceil(mctx.measureText(str).width + ls * str.length); };
  const F_ROW = "700 12px 'Segoe UI', sans-serif", F_MAKE = "800 13.5px 'Segoe UI', sans-serif", F_HDR = "800 9.5px 'Segoe UI', sans-serif";
  const F_SMALLP = "800 13px 'Segoe UI', sans-serif", F_BIGP = "900 18px 'Segoe UI', sans-serif";
  const CGAP = 6, UNIT_W = 38, DATE_W = 52;
  const hdrW = h => tw(h, F_HDR, 0.6);
  const maxOf = (arr, f) => arr.reduce((m, x) => Math.max(m, f(x)), 0);
  const txt = (d, it) => String(d.get(it) || '—').toUpperCase();
  const fnt = d => (d.h === 'MAKE' ? F_MAKE : F_ROW);
  const cardInnerW = (window.innerWidth - 20 - GAP * (GRID_COLS - 1)) / GRID_COLS - 20;
  const cellH = Math.floor((availH - GAP * (GRID_ROWS - 1)) / GRID_ROWS);

  const layoutFor = gItems => {
   const cols = DEF1.filter(d => gItems.some(it => d.get(it)));
   const hasCost = gItems.some(it => it.cost != null);
   const hasTarget = gItems.some(it => it.target != null);
   const colW = cols.map(d => Math.min(200, Math.max(hdrW(d.h), maxOf(gItems, it => tw(txt(d, it), fnt(d))))) + 2);
   const costW = hasCost ? Math.max(hdrW('COST'), maxOf(gItems, it => tw(it.cost != null ? `₹${Number(it.cost).toLocaleString()}` : '—', F_SMALLP))) + 2 : 0;
   const mktW = Math.max(hdrW('MARKET ₹'), maxOf(gItems, it => tw(`₹${it.price.toLocaleString()}`, F_BIGP))) + 2;
   const tgtW = hasTarget ? Math.max(hdrW('TARGET'), maxOf(gItems, it => tw(it.target != null ? `₹${Number(it.target).toLocaleString()}` : '—', F_SMALLP))) + 2 : 0;
   const nCols = cols.length + (hasCost ? 1 : 0) + 1 + (hasTarget ? 1 : 0) + 2;
   const fixedW = costW + mktW + tgtW + UNIT_W + DATE_W + CGAP * (nCols - 1);
   // every text column must fit its longest single word (words never split)
   const minW = cols.map(d => Math.min(150, Math.max(hdrW(d.h.split(' ')[0]), maxOf(gItems, it => maxOf(txt(d, it).split(/\s+/), w => tw(w, fnt(d)))))) + 2);
   const reqMin = minW.reduce((a, b) => a + b, 0) + fixedW;
   // if the card is too narrow, shrink this card's table a little instead of cutting text
   const scale = Math.min(1, cardInnerW / reqMin);
   const innerW = cardInnerW / scale;
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
    `${UNIT_W}px`, `${DATE_W}px`,
   ].join(' ');
   const colhdrH = cols.some((d, i) => hdrW(d.h) > colPx[i]) ? 30 : 22;
   const rowH = it => (cols.some((d, i) => tw(txt(d, it), fnt(d)) > colPx[i] + 1) ? ROW_H2L : ROW_H);
   return { cols, hasCost, hasTarget, grid, colhdrH, rowH, scale };
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
   <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at top, #123a78 0%, #0a1f45 60%, #07162f 100%)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

    <TvTopBar height={TOP_BAR_H} date={date} live={liveCount} countdown={countdown}
     page={curPage} pages={totalPages} pageCountdown={tvCountdown} progressPct={progressPct}
     onPrev={() => { setTvPage(p => (p - 1 + totalPages) % totalPages); setTvCountdown(TV_PAGE_SEC); }}
     onNext={() => { setTvPage(p => (p + 1) % totalPages); setTvCountdown(TV_PAGE_SEC); }}
     onExit={() => setTvMode(false)} />

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
             <span style={{ fontWeight: 800, color: '#fff', fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={group}>{group}{part && <span style={{ color: '#bae6fd', fontWeight: 700, marginLeft: 6 }}>({part})</span>}</span>
             <span style={{ flexShrink: 0, fontSize: 11, color: '#0b3f8c', background: '#bae6fd', padding: '1px 8px', borderRadius: 99, fontWeight: 800, marginLeft: 6 }}>{total}</span>
            </div>
            {(() => {
             const { cols, hasCost, hasTarget, grid, colhdrH, rowH, scale } = L;
             const cellS = { minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
             const wrapS = { minWidth: 0, overflow: 'hidden', whiteSpace: 'normal', lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'normal', overflowWrap: 'normal' };
             return (
              <div style={{ zoom: scale }}>
               {/* Column headers (only the columns this card uses) */}
               <div style={{ display: 'grid', gridTemplateColumns: grid, columnGap: CGAP, alignItems: 'center', height: colhdrH, padding: '0 10px', background: '#e8f0fb', lineHeight: 1.1, borderBottom: '1px solid #d6e2f3', fontSize: 9.5, fontWeight: 800, color: '#0b3f8c', letterSpacing: 0.6 }}>
                {cols.map(d => <span key={d.h} style={wrapS}>{d.h}</span>)}
                {hasCost && <span style={{ ...cellS, textAlign: 'right' }}>COST</span>}
                <span style={{ ...cellS, textAlign: 'right' }}>MARKET ₹</span>
                {hasTarget && <span style={{ ...cellS, textAlign: 'right' }}>TARGET</span>}
                <span style={{ ...cellS, textAlign: 'center' }}>UNIT</span>
                <span style={{ ...cellS, textAlign: 'right' }}>DATE</span>
               </div>
               {/* Rows */}
               {gItems.map((item, idx) => (
                <div key={item.product._id} style={{ display: 'grid', gridTemplateColumns: grid, columnGap: CGAP, alignItems: 'center', height: rowH(item), padding: '0 10px', borderTop: idx ? '1px solid #e6edf7' : 'none', background: idx % 2 ? '#f3f7fd' : '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                 {cols.map(d => (
                  <span key={d.h} title={d.get(item) || ''} style={{ ...wrapS, ...d.st, ...(d.get(item) ? {} : { color: '#cbd5e1' }) }}>{d.get(item) || '—'}</span>
                 ))}
                 {hasCost && <span style={{ fontSize: 13, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap', textAlign: 'right' }}>{item.cost != null ? `₹${Number(item.cost).toLocaleString()}` : '—'}</span>}
                 <span style={{ fontSize: 18, fontWeight: 900, color: '#15803d', letterSpacing: -0.3, whiteSpace: 'nowrap', textAlign: 'right' }}>₹{item.price.toLocaleString()}</span>
                 {hasTarget && <span style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed', whiteSpace: 'nowrap', textAlign: 'right' }}>{item.target != null ? `₹${Number(item.target).toLocaleString()}` : '—'}</span>}
                 <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', borderRadius: 4, textAlign: 'center', padding: '1px 0' }}>{item.product.unit}</span>
                 <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap', textAlign: 'right', textTransform: 'none' }}>{fmtDate(item.updatedAt || item.date) || ''}</span>
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

    {/* ── Ticker ── */}
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
     {showGroupDD && (
      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 220, maxHeight: 280, overflowY: 'auto', padding: '6px 0' }}>
       <div style={{ padding: '4px 12px 6px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Groups</span>
        {filterGroups.size > 0 && <button onClick={() => setFilterGroups(new Set())} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear</button>}
       </div>
       {groups.map(g => (
        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, background: filterGroups.has(g) ? '#f0f5ff' : 'transparent', color: filterGroups.has(g) ? '#1a3a6b' : '#374151' }}>
         <input type="checkbox" checked={filterGroups.has(g)} onChange={() => toggleGroup(g)} style={{ accentColor: '#1a3a6b', cursor: 'pointer' }} />
         {g}
        </label>
       ))}
      </div>
     )}
    </div>


    {/* Export */}
    <button onClick={exportPrices} style={{ padding: '6px 12px', background: '#fff', color: '#16a34a', border: '1.5px solid #bbf7d0', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>↓ Export CSV</button>

    {/* Refresh */}
    <button onClick={loadData} style={{ padding: '6px 12px', background: '#f0f5ff', color: '#1a3a6b', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>↻ Refresh</button>

    {/* Ribbon announcement editor */}
    <div style={{ position: 'relative', flexShrink: 0 }} ref={ribbonRef}>
     <button onClick={() => { setRibbonDraft(ribbonText); setShowRibbonEd(v => !v); }}
      title="TV ribbon announcement"
      style={{ position: 'relative', padding: '6px 10px', background: ribbonText ? '#fef3c7' : '#fff', color: '#92400e', border: `1.5px solid ${ribbonText ? '#f59e0b' : '#e5e7eb'}`, borderRadius: 7, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>
      📢
      {ribbonText && <span style={{ position: 'absolute', top: -4, right: -4, width: 9, height: 9, borderRadius: 99, background: '#f59e0b', border: '2px solid #fff' }} />}
     </button>
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

    {/* TV buttons */}
    <button onClick={() => setTvMode(true)} title="Full-screen live price board"
     style={{ padding: '6px 12px', background: 'linear-gradient(135deg,#0b3f8c,#1d6fd1)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(11,63,140,0.25)', whiteSpace: 'nowrap' }}>
     📺 Price Board 1
    </button>
    <button onClick={() => setTv2Mode(true)} title="Airport-style full-screen price board"
     style={{ padding: '6px 12px', background: 'linear-gradient(135deg,#0e7490,#38bdf8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(14,116,144,0.25)', whiteSpace: 'nowrap' }}>
     ✈️ Price Board 2
    </button>
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
     <GroupRow key={group} group={group} groupItems={groupItems} />
    ))
   )}
  </div>
 );
}
