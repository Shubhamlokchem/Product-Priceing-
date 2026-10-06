import { useState, useEffect, useCallback } from 'react';
import {
 LineChart, Line, AreaChart, Area, BarChart, Bar,
 ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
 Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../api/axios';
import './Dashboard.css';

const CHART_TYPES = [
 { value: 'line',    label: 'Line' },
 { value: 'bar',     label: 'Bar' },
 { value: 'area',    label: 'Area' },
 { value: 'step',    label: 'Step' },
 { value: 'table',   label: 'Table' },
];

const COLORS = ['#1a3a6b','#e8a020','#16a34a','#dc2626','#7c3aed','#0891b2'];

/* ── Chart renderer ── */
function PriceChart({ data, chartType, labels }) {
 const multi = labels && labels.length > 1;
 const tip   = <Tooltip formatter={(v, n) => [`₹${Number(v).toLocaleString()}`, n]} />;
 const grid  = <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />;
 const xAxis = <XAxis dataKey="date" tick={{ fontSize: 10 }} />;
 const yAxis = <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${Number(v).toLocaleString()}`} width={68} />;

 if (chartType === 'table') {
  const cols = multi ? labels : ['price'];
  return (
   <div className="table-wrap">
    <table>
     <thead><tr><th>Date</th>{cols.map(c => <th key={c}>{c}</th>)}{!multi && <th>Change</th>}{!multi && <th>Notes</th>}</tr></thead>
     <tbody>
      {[...data].reverse().map((row, i, arr) => {
       const prev = arr[i + 1];
       const diff = !multi && prev ? row.price - (prev.price ?? 0) : null;
       return (
        <tr key={row.date}>
         <td style={{ fontWeight: 500 }}>{row.date}</td>
         {cols.map(c => (
          <td key={c}>{row[c] != null
           ? <span className="price-highlight">₹{Number(row[c]).toLocaleString()}</span>
           : <span className="no-price">—</span>}
          </td>
         ))}
         {!multi && <td>{diff == null ? '—' : <span style={{ color: diff >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{diff >= 0 ? '+' : ''}₹{diff.toLocaleString()}</span>}</td>}
         {!multi && <td style={{ color: '#9ca3af', fontSize: 11 }}>{row.notes || '—'}</td>}
        </tr>
       );
      })}
     </tbody>
    </table>
   </div>
  );
 }

 const common = { data, margin: { top: 6, right: 18, left: 4, bottom: 4 } };

 if (chartType === 'bar') return (
  <ResponsiveContainer width="100%" height={300}>
   <BarChart {...common}>{grid}{xAxis}{yAxis}{tip}{multi && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
    {multi
     ? labels.map((l,i) => <Bar key={l} dataKey={l} fill={COLORS[i % COLORS.length]} radius={[3,3,0,0]} />)
     : <Bar dataKey="price" fill="#1a3a6b" radius={[3,3,0,0]} />}
   </BarChart>
  </ResponsiveContainer>
 );

 if (chartType === 'area') return (
  <ResponsiveContainer width="100%" height={300}>
   <AreaChart {...common}>{grid}{xAxis}{yAxis}{tip}
    <defs>{(multi ? labels : ['price']).map((l,i) => (
     <linearGradient key={l} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor={COLORS[i % COLORS.length]} stopOpacity={0.18}/>
      <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
     </linearGradient>
    ))}</defs>
    {multi && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
    {multi
     ? labels.map((l,i) => <Area key={l} type="monotone" dataKey={l} stroke={COLORS[i%COLORS.length]} strokeWidth={2} fill={`url(#g${i})`} dot={{ r:2 }} connectNulls />)
     : <Area type="monotone" dataKey="price" stroke="#1a3a6b" strokeWidth={2.5} fill="url(#g0)" dot={{ r:3, fill:'#e8a020' }} connectNulls />}
   </AreaChart>
  </ResponsiveContainer>
 );

 if (chartType === 'step') return (
  <ResponsiveContainer width="100%" height={300}>
   <LineChart {...common}>{grid}{xAxis}{yAxis}{tip}{multi && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
    {multi
     ? labels.map((l,i) => <Line key={l} type="stepAfter" dataKey={l} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={{ r:2 }} connectNulls />)
     : <Line type="stepAfter" dataKey="price" stroke="#7c3aed" strokeWidth={2.5} dot={{ r:3, fill:'#7c3aed' }} connectNulls />}
   </LineChart>
  </ResponsiveContainer>
 );

 // default line
 return (
  <ResponsiveContainer width="100%" height={300}>
   <LineChart {...common}>{grid}{xAxis}{yAxis}{tip}{multi && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
    {multi
     ? labels.map((l,i) => <Line key={l} type="monotone" dataKey={l} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={{ r:2 }} connectNulls />)
     : <Line type="monotone" dataKey="price" stroke="#1a3a6b" strokeWidth={2.5} dot={{ r:3, fill:'#e8a020', stroke:'#1a3a6b', strokeWidth:1.5 }} connectNulls />}
   </LineChart>
  </ResponsiveContainer>
 );
}

/* ── Compact Product Slot ── */
function ProductSlot({ label, color, allProducts, value, onChange }) {
 const [search, setSearch] = useState('');
 const [open,   setOpen]   = useState(false);

 const list = allProducts.filter(p => {
  if (!search) return true;
  const q = search.toLowerCase();
  return p.group?.toLowerCase().includes(q) || p.make?.toLowerCase().includes(q) || p.coo?.toLowerCase().includes(q) || p.grade?.toLowerCase().includes(q);
 });

 const pick = (p) => { onChange(p); setSearch(''); setOpen(false); };
 const displayLabel = value
  ? `${value.group}${value.make ? ' · ' + value.make : ''}${value.coo ? ' (' + value.coo + ')' : ''}`
  : '';

 return (
  <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
   {/* Trigger button */}
   <div onClick={() => setOpen(o => !o)}
    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', border: `1.5px solid ${value ? color : '#e5e7eb'}`, borderRadius: 8, cursor: 'pointer', background: value ? color + '08' : '#fff', minHeight: 36 }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
    {value ? (
     <span style={{ fontSize: 12, fontWeight: 600, color: '#1a3a6b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
    ) : (
     <span style={{ fontSize: 12, color: '#9ca3af', flex: 1 }}>{label}</span>
    )}
    {value && (
     <span onClick={e => { e.stopPropagation(); onChange(null); }}
      style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>×</span>
    )}
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
   </div>

   {/* Dropdown panel */}
   {open && (
    <div style={{ position: 'absolute', zIndex: 400, top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.12)', minWidth: 260 }}>
     {/* Search inside dropdown */}
     <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
      <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
       placeholder="Search group, make, origin…"
       style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
     </div>
     {/* Results */}
     <div style={{ maxHeight: 220, overflowY: 'auto' }}>
      {list.length === 0 ? (
       <div style={{ padding: '12px 14px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No products found</div>
      ) : list.slice(0, 40).map(p => (
       <div key={p._id} onClick={() => pick(p)}
        style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f9fafb', display: 'flex', flexDirection: 'column', gap: 1 }}
        onMouseEnter={e => e.currentTarget.style.background = color + '10'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 11 }}>{p.group}</span>
        <span style={{ color: '#6b7280', fontSize: 11 }}>{[p.make, p.coo, p.grade, p.purity].filter(Boolean).join(' / ') || '—'}</span>
       </div>
      ))}
     </div>
    </div>
   )}
   {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 399 }} />}
  </div>
 );
}

/* ── Diff Mode container ── */
function DiffMode({ allProducts, fromDate, toDate, chartType }) {
 const [prodA, setProdA] = useState(null);
 const [prodB, setProdB] = useState(null);
 const [chartData, setChartData] = useState([]);
 const [labels,    setLabels]    = useState([]);
 const [loading,   setLoading]   = useState(false);

 const load = useCallback(async () => {
  if (!prodA || !prodB) { setChartData([]); setLabels([]); return; }
  setLoading(true);
  try {
   const ids = [prodA._id, prodB._id].join(',');
   const { data } = await api.get('/prices/compare-products', { params: { ids, from: fromDate, to: toDate } });
   setChartData(data.rows || []);
   setLabels(data.labels || []);
  } catch { setChartData([]); setLabels([]); }
  finally { setLoading(false); }
 }, [prodA, prodB, fromDate, toDate]);

 useEffect(() => { load(); }, [load]);

 return (
  <>
   {/* Two product slots — compact single row */}
   <div className="card" style={{ marginBottom: 14, padding: '10px 14px' }}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
     <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap' }}>Compare</span>
     <ProductSlot label="Select Product A…" color="#1a3a6b" allProducts={allProducts} value={prodA} onChange={setProdA} />
     <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 700, flexShrink: 0 }}>—</span>
     <ProductSlot label="Select Product B…" color="#e8a020" allProducts={allProducts} value={prodB} onChange={setProdB} />
    </div>
   </div>

   {/* Chart */}
   {!prodA || !prodB ? (
    <div className="card"><div className="empty-state"><p style={{ fontSize: 13 }}>Select a product in both slots above to compare.</p></div></div>
   ) : loading ? (
    <div className="spinner">Loading...</div>
   ) : chartData.length === 0 ? (
    <div className="card"><div className="empty-state"><p style={{ fontSize: 13 }}>No price data for selected products in this date range.</p></div></div>
   ) : (
    <div className="card">
     <PriceChart data={chartData} chartType={chartType} labels={labels} />
    </div>
   )}
  </>
 );
}

/* ── Main ── */
export default function PriceCompare({ adminMode }) {
 const today     = new Date().toISOString().split('T')[0];
 const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

 const [mode,       setMode]       = useState('same');   // 'same' | 'diff'
 const [groups,     setGroups]     = useState([]);
 const [allProducts,setAllProducts]= useState([]);
 const [selGroup,   setSelGroup]   = useState('');
 const [fromDate,   setFromDate]   = useState(thirtyAgo);
 const [toDate,     setToDate]     = useState(today);
 const [chartType,  setChartType]  = useState('line');

 // SAME mode
 const [selProduct, setSelProduct] = useState('');
 const [history,    setHistory]    = useState([]);


 const [loading, setLoading] = useState(false);

 useEffect(() => {
  api.get('/products/groups').then(r => setGroups(r.data)).catch(() => {});
  api.get('/products').then(r => setAllProducts(r.data)).catch(() => {});
 }, []);

 const setRange = (days) => {
  setFromDate(new Date(Date.now() - days * 86400000).toISOString().split('T')[0]);
  setToDate(today);
 };

 // SAME: products in selected group
 const groupProducts = selGroup ? allProducts.filter(p => p.group === selGroup) : [];

 // SAME: load history
 const loadHistory = useCallback(async () => {
  if (!selProduct) { setHistory([]); return; }
  setLoading(true);
  try {
   const { data } = await api.get(`/prices/history/${selProduct}`);
   setHistory(data.filter(e => e.date >= fromDate && e.date <= toDate).reverse());
  } catch { setHistory([]); }
  finally { setLoading(false); }
 }, [selProduct, fromDate, toDate]);

 useEffect(() => { if (mode === 'same') loadHistory(); }, [mode, loadHistory]);

 const productInfo = groupProducts.find(p => p._id === selProduct);
 const prices      = history.map(e => e.price).filter(v => v != null);
 const latestPrice = prices.length ? prices[prices.length - 1] : null;
 const change      = prices.length > 1 ? prices[prices.length - 1] - prices[0] : null;
 const minPrice    = prices.length ? Math.min(...prices) : null;
 const maxPrice    = prices.length ? Math.max(...prices) : null;

 const selStyle = (v) => ({
  padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 7, border: 'none',
  background: mode === v ? '#1a3a6b' : '#f3f4f6',
  color:      mode === v ? '#fff'    : '#6b7280',
  transition: 'all 0.15s',
 });

 const content = (
  <div>
   {/* ── Sticky header + Filter row ── */}
   <div className="sticky-page-header">
   <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a3a6b', whiteSpace: 'nowrap', flexShrink: 0 }}>Price Compare</h2>

    {/* Mode toggle */}
    <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
     <button style={selStyle('same')} onClick={() => { setMode('same'); setSelected([]); }}>Same Product</button>
     <button style={selStyle('diff')} onClick={() => { setMode('diff'); setSelProduct(''); setHistory([]); }}>Diff Products</button>
    </div>

    <div style={{ flex: 1 }} />

    {/* Filter icon */}
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
     <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>

    {/* Group (same mode only) */}
    {mode === 'same' && (
     <select value={selGroup} onChange={e => { setSelGroup(e.target.value); setSelProduct(''); }}
      style={{ padding: '6px 9px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, minWidth: 140, background: '#fff', flexShrink: 0 }}>
      <option value="">All Groups</option>
      {groups.map(g => <option key={g} value={g}>{g}</option>)}
     </select>
    )}

    {/* From */}
    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} max={toDate}
     style={{ padding: '6px 8px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, flexShrink: 0 }} />

    {/* To */}
    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate} max={today}
     style={{ padding: '6px 8px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, flexShrink: 0 }} />

    {/* Quick Range */}
    <select defaultValue="" onChange={e => { if (e.target.value) setRange(Number(e.target.value)); e.target.value = ''; }}
     style={{ padding: '6px 9px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, minWidth: 110, background: '#fff', flexShrink: 0 }}>
     <option value="" disabled>Quick Range</option>
     <option value="7">Last 7 days</option>
     <option value="15">Last 15 days</option>
     <option value="30">Last 30 days</option>
     <option value="45">Last 45 days</option>
     <option value="90">Last 90 days</option>
    </select>

    {/* Chart Type */}
    <select value={chartType} onChange={e => setChartType(e.target.value)}
     style={{ padding: '6px 9px', border: '1.5px solid #1a3a6b', borderRadius: 7, fontSize: 12, minWidth: 100, background: '#fff', color: '#1a3a6b', fontWeight: 600, flexShrink: 0 }}>
     {CHART_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
    </select>
   </div>
   </div>{/* /sticky-page-header */}

   {/* ══ SAME PRODUCT MODE ══ */}
   {mode === 'same' && (
    <>
     {/* Product picker */}
     {selGroup && groupProducts.length > 0 && (
      <div className="card" style={{ marginBottom: 14, padding: '10px 14px' }}>
       <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Select variant</div>
       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {groupProducts.map(p => {
         const label = [p.make, p.coo, p.grade, p.purity, p.itemPackage].filter(Boolean).join(' / ') || p._id;
         const active = selProduct === p._id;
         return (
          <button key={p._id} onClick={() => setSelProduct(active ? '' : p._id)}
           style={{ padding: '5px 12px', border: `1.5px solid ${active ? '#1a3a6b' : '#e5e7eb'}`, borderRadius: 20, fontSize: 12, cursor: 'pointer', background: active ? '#1a3a6b' : '#fff', color: active ? '#fff' : '#374151', fontWeight: active ? 600 : 400, transition: 'all 0.15s' }}>
           {label}
          </button>
         );
        })}
       </div>
      </div>
     )}

     {!selGroup ? (
      <div className="card"><div className="empty-state"><p style={{ fontSize: 13 }}>Select a chemical group from the filter above.</p></div></div>
     ) : !selProduct ? (
      <div className="card"><div className="empty-state"><p style={{ fontSize: 13 }}>Click a variant above to view its price history.</p></div></div>
     ) : loading ? (
      <div className="spinner">Loading...</div>
     ) : history.length === 0 ? (
      <div className="card"><div className="empty-state"><p style={{ fontSize: 13 }}>No price data in this date range.</p></div></div>
     ) : (
      <>
       {/* Product label */}
       <div style={{ marginBottom: 12, padding: '8px 14px', background: '#f0f5ff', borderRadius: 8, border: '1.5px solid #c7d7f8', fontSize: 12, color: '#1a3a6b', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
        <span>{selGroup}{productInfo?.make ? ` · ${productInfo.make}` : ''}{productInfo?.coo ? ` (${productInfo.coo})` : ''}</span>
        <span style={{ color: '#9ca3af', fontWeight: 400 }}>{history.length} entries</span>
       </div>
       {/* Stats */}
       <div className="stat-grid" style={{ marginBottom: 14 }}>
        {[
         { label: 'Latest', value: latestPrice != null ? `₹${latestPrice.toLocaleString()}` : '—', color: undefined },
         { label: 'Change', value: change == null ? '—' : `${change >= 0 ? '+' : ''}₹${change.toLocaleString()}`, color: change == null ? undefined : change >= 0 ? '#16a34a' : '#dc2626' },
         { label: 'Lowest',  value: minPrice != null ? `₹${minPrice.toLocaleString()}` : '—',  color: '#16a34a' },
         { label: 'Highest', value: maxPrice != null ? `₹${maxPrice.toLocaleString()}` : '—',  color: '#dc2626' },
        ].map(s => (
         <div key={s.label} className="stat-card">
          <div className="stat-label">{s.label}</div>
          <div className="stat-value" style={{ fontSize: 18, color: s.color }}>{s.value}</div>
         </div>
        ))}
       </div>
       <div className="card">
        <PriceChart data={history} chartType={chartType} />
       </div>
      </>
     )}
    </>
   )}

   {/* ══ DIFF PRODUCTS MODE ══ */}
   {mode === 'diff' && (
    <DiffMode
     allProducts={allProducts} fromDate={fromDate} toDate={toDate}
     chartType={chartType} COLORS={COLORS}
    />
   )}
  </div>
 );

 return content;
}
