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
  <div style={{ background: '#e8a020', color: '#1a3a6b', padding: '8px 0', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 }}>
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
  const TV_ROWS = 3;
  const GAP = 6;
  const TOP_BAR_H = 56;
  const TICKER_H  = 38;
  const DOTS_H    = 22;
  const PAD_V     = 8;
  const cardsPerPage = TV_COLS * TV_ROWS; // exactly 15 cards per page
  const availH = window.innerHeight - TOP_BAR_H - TICKER_H - DOTS_H - PAD_V;

  const pages = [];
  for (let i = 0; i < allGroups.length; i += cardsPerPage) {
   pages.push(allGroups.slice(i, i + cardsPerPage));
  }

  const totalPages = pages.length;
  const curPage = totalPages > 0 ? tvPage % totalPages : 0;
  const pageGroups = pages[curPage] || [];
  // Progress bar width
  const progressPct = ((TV_PAGE_SEC - tvCountdown) / TV_PAGE_SEC) * 100;

  return (
   <div style={{ position: 'fixed', inset: 0, background: '#1e2d45', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

    {/* ── Top bar ── */}
    <div style={{ background: '#1a3a6b', borderBottom: '3px solid #e8a020' }}>
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px' }}>
      <div>
       <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>Live Product Prices</div>
       <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span>{date}</span><span>•</span>
        <span style={{ color: '#4ade80', fontWeight: 600 }}>● {latestItems.filter(i => i.price !== null).length} Live</span><span>•</span>
        <span style={{ color: countdown <= 10 ? '#fca5a5' : 'rgba(255,255,255,0.5)' }}>↻ {countdown}s</span>
       </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
       {/* Page indicator */}
       {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
         <button onClick={() => { setTvPage(p => (p - 1 + totalPages) % totalPages); setTvCountdown(TV_PAGE_SEC); }}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
         <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, minWidth: 40, textAlign: 'center' }}>{curPage + 1} / {totalPages}</span>
         <button onClick={() => { setTvPage(p => (p + 1) % totalPages); setTvCountdown(TV_PAGE_SEC); }}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
         <span style={{ fontSize: 11, color: '#e8a020', fontWeight: 700 }}>{tvCountdown}s</span>
        </div>
       )}
       <LiveClock />
       <button onClick={() => setTvMode(false)} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Exit</button>
      </div>
     </div>
     {/* Progress bar */}
     {totalPages > 1 && (
      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)' }}>
       <div style={{ height: '100%', background: '#e8a020', width: `${progressPct}%`, transition: 'width 1s linear' }} />
      </div>
     )}
    </div>

    {/* ── 5 × 3 Grid ── */}
    <div style={{ padding: `${PAD_V/2}px 8px` }}>
     {allGroups.length === 0
      ? <div style={{ textAlign: 'center', marginTop: 80, color: '#9ca3af', fontSize: 16 }}>No prices available</div>
      : <>
       <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${TV_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${TV_ROWS}, 1fr)`,
        gap: GAP,
        height: availH,
       }}>
        {pageGroups.map(([group, gItems]) => (
         <div key={group} style={{ display: 'flex', flexDirection: 'column', background: '#f5f7fa', borderRadius: 8, overflow: 'hidden', border: '1px solid #dde3ec' }}>
          {/* Header */}
          <div style={{ flexShrink: 0, background: '#e8ecf2', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dde3ec' }}>
           <span style={{ fontWeight: 700, color: '#1e2d45', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={group}>{group}</span>
           <span style={{ flexShrink: 0, fontSize: 10, color: '#4a5568', background: 'rgba(0,0,0,0.08)', padding: '1px 6px', borderRadius: 99, fontWeight: 700, marginLeft: 6 }}>{gItems.length}</span>
          </div>
          {/* Product rows — equal height */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
           {gItems.map((item, idx) => (
            <div key={item.product._id} style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: idx < gItems.length - 1 ? '1px solid #dde3ec' : 'none', gap: 6, minHeight: 0, overflow: 'hidden', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.04)' }}>
             {/* Name + COO */}
             <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#1e2d45', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
               {item.product.make || '—'}
               {item.product.coo ? <span style={{ color: '#64748b', fontWeight: 700, fontSize: 11 }}> · {item.product.coo}</span> : ''}
              </div>
              {(item.product.grade || item.product.purity || item.product.itemPackage || item.ex || item.notes) && (
               <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap', overflow: 'hidden' }}>
                {item.product.grade && <span style={{ fontSize: 9, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '1px 5px', borderRadius: 4 }}>{item.product.grade}</span>}
                {item.product.purity && <span style={{ fontSize: 9, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '1px 5px', borderRadius: 4 }}>{item.product.purity}</span>}
                {item.product.itemPackage && <span style={{ fontSize: 9, fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '1px 5px', borderRadius: 4 }}>{item.product.itemPackage}</span>}
                {item.ex && <span style={{ fontSize: 9, fontWeight: 700, color: '#2563eb', letterSpacing: 0.3, textTransform: 'uppercase' }}>EX {item.ex}</span>}
                {item.notes && <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>{item.notes}</span>}
               </div>
              )}
             </div>
             {/* Unit · Price · Date — right side, all on one line */}
             <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 12, color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.product.unit}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', letterSpacing: -0.5 }}>₹{item.price.toLocaleString()}</span>
              <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700, marginLeft: 3, letterSpacing: 0.2 }}>{fmtDate(item.updatedAt || item.date) || ''}</span>
             </div>
            </div>
           ))}
          </div>
         </div>
        ))}
       </div>
       {/* Page dots — fixed at bottom */}
       {totalPages > 1 && (
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 6, padding: '6px 0 2px' }}>
         {Array.from({ length: totalPages }).map((_, i) => (
          <button key={i} onClick={() => { setTvPage(i); setTvCountdown(TV_PAGE_SEC); }}
           style={{ width: i === curPage ? 24 : 8, height: 8, borderRadius: 4, background: i === curPage ? '#1a3a6b' : '#c7d7fa', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
         ))}
        </div>
       )}
      </>}
    </div>

    {/* ── Ticker ── */}
    <div style={{ background: '#e8a020', borderTop: '2px solid #d4900e' }}>
     <PriceTicker items={latestItems} />
    </div>
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
    <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>Total: <strong style={{ color: '#1a3a6b' }}>{items.length}</strong></span>
    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, flexShrink: 0 }}>Priced: {pricedCount}</span>
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
