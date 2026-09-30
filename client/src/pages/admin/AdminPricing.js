import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import '../Dashboard.css';

const REFRESH_SEC = 7;

const fmtDate = (d) => {
 if (!d) return null;
 const dt = new Date(d);
 return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // "07 Sep"
};

/* ── Live clock ── */
function LiveClock() {
 const [now, setNow] = useState(new Date());
 useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
 return (
  <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.9)' }}>
   <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>
    {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
   </div>
   <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
    {now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
   </div>
  </div>
 );
}

/* ── Price ticker ── */
function PriceTicker({ items }) {
 const priced = items.filter(i => i.price !== null);
 if (!priced.length) return null;
 const text = priced.map(i => `${i.product.group}${i.product.make ? ' · ' + i.product.make : ''} — ₹${i.price.toLocaleString()}/${i.product.unit}`).join('   •   ');
 return (
  <div style={{ background: 'transparent', color: '#0a2a5e', padding: '9px 0', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 800 }}>
   <div style={{ display: 'inline-block', animation: 'ticker 50s linear infinite', paddingLeft: '100%' }}>
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
       <tr><th>Make</th><th>COO</th><th>Grade</th><th>Purity</th><th>Package</th><th>Unit</th><th>Price (₹)</th><th>Notes</th><th>Updated</th></tr>
      </thead>
      <tbody>
       {groupItems.map(item => (
        <tr key={item.product._id} style={{ background: item.price !== null ? undefined : '#fafafa', verticalAlign: 'middle' }}>
         <td style={{ verticalAlign: 'middle' }}>{item.product.make || '—'}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.product.coo || '—'}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.product.grade || '—'}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.product.purity || '—'}</td>
         <td style={{ fontSize: 11, verticalAlign: 'middle' }}>{item.product.itemPackage || '—'}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.product.unit}</td>
         <td style={{ verticalAlign: 'middle' }}>{item.price !== null
          ? <span className="price-highlight">₹{item.price.toLocaleString()}<span className="currency">/{item.product.unit}</span></span>
          : <span className="no-price">—</span>}
         </td>
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
 const today = new Date().toISOString().split('T')[0];
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
 const [tvMode, setTvMode] = useState(false);
 const [tvPage, setTvPage] = useState(0);
 const TV_PAGE_SEC = 20;        // seconds before auto-advance
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
  const headers = ['group','make','coo','grade','purity','package','unit','price','notes','ex','date'];
  const rows = displayItems
   .filter(i => i.price !== null)
   .map(i => [
    i.product.group, i.product.make||'', i.product.coo||'', i.product.grade||'',
    i.product.purity||'', i.product.itemPackage||'', i.product.unit||'',
    i.price, i.notes||'', i.ex||'', fmtDate(i.updatedAt||i.date)||date,
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
  const TV_COLS = 5;
  const GAP = 8;
  const TOP_BAR_H = 70;
  const TICKER_H  = 40;
  const DOTS_H    = 24;
  const PAD_V     = 16;
  const availH = window.innerHeight - TOP_BAR_H - TICKER_H - DOTS_H - PAD_V;

  // Card height depends on its rows → pack cards into 5 columns, new page when full
  const HEAD_H = 34, ROW_H = 34, ROW_TAG_H = 46;
  const hasTags = it => !!(it.product.grade || it.product.purity || it.product.itemPackage || it.ex || it.notes);
  const cardH = gItems => HEAD_H + gItems.reduce((h, it) => h + (hasTags(it) ? ROW_TAG_H : ROW_H), 0) + 2;
  const pages = [];
  let cols = null, colH = null;
  const newPage = () => { cols = Array.from({ length: TV_COLS }, () => []); colH = Array(TV_COLS).fill(0); pages.push(cols); };
  allGroups.forEach(entry => {
   const h = Math.min(cardH(entry[1]), availH);
   if (!cols) newPage();
   // shortest column that still has room
   let best = -1;
   colH.forEach((ch, i) => { if (ch + h + (ch ? GAP : 0) <= availH && (best === -1 || ch < colH[best])) best = i; });
   if (best === -1) { newPage(); best = 0; }
   cols[best].push(entry);
   colH[best] += h + (colH[best] ? GAP : 0);
  });

  const totalPages = pages.length;
  const curPage = totalPages > 0 ? tvPage % totalPages : 0;
  const pageCols = pages[curPage] || [];
  const progressPct = ((TV_PAGE_SEC - tvCountdown) / TV_PAGE_SEC) * 100;
  const liveCount = latestItems.filter(i => i.price !== null).length;
  const navBtn = { width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
   <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at top, #123a78 0%, #0a1f45 60%, #07162f 100%)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

    {/* ── Top bar ── */}
    <div style={{ height: TOP_BAR_H, flexShrink: 0, background: 'linear-gradient(90deg, #0a2a5e, #0b3f8c 60%, #1d6fd1)', boxShadow: '0 4px 18px rgba(0,0,0,0.35)', position: 'relative' }}>
     <div style={{ height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
       <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
        <img src="/logo.png" alt="Lok Chemicals" style={{ width: 40, height: 'auto' }} />
       </div>
       <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: 0.4, lineHeight: 1.1 }}>
         Live Product Prices <span style={{ fontSize: 13, fontWeight: 700, color: '#7dd3fc', marginLeft: 6, letterSpacing: 1 }}>LOK CHEMICALS</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 5 }}>
         <span style={{ fontSize: 12, color: '#e0f2fe', background: 'rgba(255,255,255,0.12)', padding: '2px 10px', borderRadius: 99, fontWeight: 600 }}>{date}</span>
         <span style={{ fontSize: 12, color: '#052e16', background: '#4ade80', padding: '2px 10px', borderRadius: 99, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: '#052e16', animation: 'tvpulse 1.4s infinite' }} />{liveCount} LIVE
         </span>
         <span style={{ fontSize: 12, color: countdown <= 3 ? '#fecaca' : '#bae6fd', fontWeight: 600 }}>↻ {countdown}s</span>
        </div>
       </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
       {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.18)', padding: '5px 10px', borderRadius: 99 }}>
         <button onClick={() => { setTvPage(p => (p - 1 + totalPages) % totalPages); setTvCountdown(TV_PAGE_SEC); }} style={navBtn}>‹</button>
         <span style={{ fontSize: 14, color: '#fff', fontWeight: 700, minWidth: 54, textAlign: 'center' }}>Page {curPage + 1}/{totalPages}</span>
         <button onClick={() => { setTvPage(p => (p + 1) % totalPages); setTvCountdown(TV_PAGE_SEC); }} style={navBtn}>›</button>
         <span style={{ fontSize: 12, color: '#fcd34d', fontWeight: 800, minWidth: 26 }}>{tvCountdown}s</span>
        </div>
       )}
       <LiveClock />
       <button onClick={() => setTvMode(false)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>✕ Exit</button>
      </div>
     </div>
     {/* Page progress */}
     <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.08)' }}>
      {totalPages > 1 && <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#fcd34d)', width: `${progressPct}%`, transition: 'width 1s linear' }} />}
     </div>
    </div>

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
       <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TV_COLS}, minmax(0, 1fr))`, gap: GAP, height: availH, alignItems: 'start' }}>
        {pageCols.map((colGroups, ci) => (
         <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: GAP, minWidth: 0, maxHeight: availH, overflow: 'hidden' }}>
          {colGroups.map(([group, gItems]) => (
           <div key={group} style={{ background: '#ffffff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.30)', flexShrink: 0 }}>
            {/* Header */}
            <div style={{ height: HEAD_H, background: 'linear-gradient(90deg, #0b3f8c, #1d6fd1)', padding: '0 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontWeight: 800, color: '#fff', fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={group}>{group}</span>
             <span style={{ flexShrink: 0, fontSize: 11, color: '#0b3f8c', background: '#bae6fd', padding: '1px 8px', borderRadius: 99, fontWeight: 800, marginLeft: 6 }}>{gItems.length}</span>
            </div>
            {/* Rows: name | price | unit | date — fixed columns so everything lines up */}
            {gItems.map((item, idx) => {
             const tags = hasTags(item);
             const name = item.product.make || item.product.coo || item.product.grade || '';
             return (
              <div key={item.product._id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto 38px 50px', alignItems: 'center', columnGap: 8, height: tags ? ROW_TAG_H : ROW_H, padding: '0 11px', borderTop: idx ? '1px solid #e6edf7' : 'none', background: idx % 2 ? '#f3f7fd' : '#fff' }}>
               {/* Name + tags */}
               <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: name ? '#0f1f3d' : '#94a3b8', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                 {name || 'Standard'}
                 {item.product.make && item.product.coo ? <span style={{ color: '#475569', fontWeight: 700, fontSize: 12 }}> · {item.product.coo}</span> : ''}
                </div>
                {tags && (
                 <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', marginTop: 2 }}>
                  {item.product.grade && <span style={{ fontSize: 10, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '0 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{item.product.grade}</span>}
                  {item.product.purity && <span style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '0 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{item.product.purity}</span>}
                  {item.product.itemPackage && <span style={{ fontSize: 10, fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '0 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{item.product.itemPackage}</span>}
                  {item.ex && <span style={{ fontSize: 10, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>EX {item.ex}</span>}
                  {item.notes && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.notes}</span>}
                 </div>
                )}
               </div>
               {/* Price */}
               <span style={{ fontSize: 18, fontWeight: 900, color: '#15803d', letterSpacing: -0.3, whiteSpace: 'nowrap', textAlign: 'right' }}>₹{item.price.toLocaleString()}</span>
               {/* Unit */}
               <span style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', borderRadius: 4, textAlign: 'center', padding: '1px 0', textTransform: 'uppercase' }}>{item.product.unit}</span>
               {/* Last updated */}
               <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap', textAlign: 'right' }}>{fmtDate(item.updatedAt || item.date) || ''}</span>
              </div>
             );
            })}
           </div>
          ))}
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
     <div style={{ flex: 1, overflow: 'hidden' }}><PriceTicker items={latestItems} /></div>
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

    {/* TV button */}
    <button onClick={() => setTvMode(true)}
     style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#1a3a6b,#2558a8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(26,58,107,0.25)' }}>
     TV
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
