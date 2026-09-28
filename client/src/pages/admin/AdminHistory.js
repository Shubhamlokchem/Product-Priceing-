import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../../api/axios';
import '../Dashboard.css';

const CustomTooltip = ({ active, payload, label }) => {
 if (!active || !payload?.length) return null;
 return (
 <div style={{ background: '#1a3a6b', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#fff', boxShadow: '0 4px 16px rgba(30,58,95,0.25)' }}>
 <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 4 }}>{label}</div>
 <div style={{ fontSize: 18, fontWeight: 700 }}>₹{payload[0].value?.toLocaleString()}</div>
 </div>
 );
};

export default function AdminHistory() {
 const [products, setProducts] = useState([]);
 const [groups, setGroups] = useState([]);
 const [selected, setSelected] = useState('');
 const [history, setHistory] = useState([]);
 const [loading, setLoading] = useState(false);
 const [search, setSearch] = useState('');
 const [showDropdown, setShowDropdown] = useState(false);

 useEffect(() => {
 Promise.all([api.get('/products'), api.get('/products/groups')]).then(([pr, gr]) => {
 setProducts(pr.data);
 setGroups(gr.data);
 });
 }, []);

 useEffect(() => {
 if (!selected) { setHistory([]); return; }
 setLoading(true);
 api.get(`/prices/history/${selected}`)
 .then(r => setHistory(r.data.reverse()))
 .finally(() => setLoading(false));
 }, [selected]);

 const chartData = history.filter(e => e.price != null).map(e => ({ date: e.date, price: e.price }));
 const selectedProduct = products.find(p => p._id === selected);

 // Group products by chemical group for the grouped <select>
 const groupedProducts = groups.reduce((acc, g) => {
 acc[g] = products.filter(p => p.group === g);
 return acc;
 }, {});

 const filteredProducts = search
 ? products.filter(p => {
  const q = search.toLowerCase();
  return p.group?.toLowerCase().includes(q) || p.make?.toLowerCase().includes(q) || p.coo?.toLowerCase().includes(q) || p.grade?.toLowerCase().includes(q);
 })
 : products;

 // Stats
 const prices = chartData.map(d => d.price);
 const maxPrice = prices.length ? Math.max(...prices) : null;
 const minPrice = prices.length ? Math.min(...prices) : null;
 const latestPrice = chartData.length ? chartData[chartData.length - 1].price : null;
 const firstPrice = chartData.length ? chartData[0].price : null;
 const totalChange = (latestPrice != null && firstPrice != null) ? latestPrice - firstPrice : null;

 return (
 <div>
 {/* ── Sticky header + product selector in one row ── */}
 <div className="sticky-page-header">
 <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
  <div style={{ flexShrink: 0 }}>
   <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a3a6b' }}>Price History</h2>
  </div>
  <div style={{ flex: 1 }} />

  {/* Searchable product dropdown */}
  <div style={{ position: 'relative', flexShrink: 0 }}>
   <div onClick={() => setShowDropdown(o => !o)}
    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: `1.5px solid ${selected ? '#1a3a6b' : '#e5e7eb'}`, borderRadius: 8, cursor: 'pointer', background: selected ? '#f0f5ff' : '#fff', minWidth: 240 }}>
    {selected && selectedProduct ? (
     <span style={{ fontSize: 12, fontWeight: 600, color: '#1a3a6b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {selectedProduct.group}{selectedProduct.make ? ` · ${selectedProduct.make}` : ''}{selectedProduct.coo ? ` (${selectedProduct.coo})` : ''}
     </span>
    ) : (
     <span style={{ fontSize: 12, color: '#9ca3af', flex: 1 }}>Select a product…</span>
    )}
    {selected && (
     <span onClick={e => { e.stopPropagation(); setSelected(''); setSearch(''); setHistory([]); setShowDropdown(false); }}
      style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1, cursor: 'pointer' }}>×</span>
    )}
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
   </div>

   {showDropdown && (
    <div style={{ position: 'absolute', zIndex: 300, top: 'calc(100% + 4px)', right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.12)', minWidth: 300 }}>
     {/* Search inside */}
     <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
      <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
       placeholder="Search group, make, COO…"
       style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
     </div>
     <div style={{ maxHeight: 260, overflowY: 'auto' }}>
      {filteredProducts.length === 0 ? (
       <div style={{ padding: '12px 14px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>No products found</div>
      ) : filteredProducts.slice(0, 60).map(p => (
       <div key={p._id} onClick={() => { setSelected(p._id); setSearch(''); setShowDropdown(false); }}
        style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f9fafb', background: selected === p._id ? '#e8f0fe' : 'transparent' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f0f5ff'}
        onMouseLeave={e => e.currentTarget.style.background = selected === p._id ? '#e8f0fe' : 'transparent'}>
        <div style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 11 }}>{p.group}</div>
        <div style={{ color: '#6b7280', fontSize: 11 }}>{[p.make, p.coo, p.grade].filter(Boolean).join(' / ') || '—'}</div>
       </div>
      ))}
     </div>
    </div>
   )}
   {showDropdown && <div onClick={() => setShowDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />}
  </div>
 </div>
 </div>{/* /sticky-page-header */}

 {!selected ? (
 <div className="card">
 <div className="empty-state">
 <div className="empty-icon"></div>
 <p>Search and select a product above to view its price history.</p>
 </div>
 </div>
 ) : loading ? (
 <div className="spinner">Loading history...</div>
 ) : history.length === 0 ? (
 <div className="card">
 <div className="empty-state">
 <div className="empty-icon"></div>
 <p>No price history found for this product.</p>
 </div>
 </div>
 ) : (
 <>
 <div className="stat-grid" style={{ marginBottom: 20 }}>
 <div className="stat-card" style={{ borderLeftColor: '#1a3a6b' }}>
 <div className="stat-label">Latest Price</div>
 <div className="stat-value" style={{ color: '#1a3a6b' }}>
 {latestPrice != null ? `₹${latestPrice.toLocaleString()}` : '—'}
 </div>
 </div>
 <div className="stat-card" style={{ borderLeftColor: '#16a34a' }}>
 <div className="stat-label">Highest</div>
 <div className="stat-value" style={{ color: '#16a34a' }}>
 {maxPrice != null ? `₹${maxPrice.toLocaleString()}` : '—'}
 </div>
 </div>
 <div className="stat-card" style={{ borderLeftColor: '#dc2626' }}>
 <div className="stat-label">Lowest</div>
 <div className="stat-value" style={{ color: '#dc2626' }}>
 {minPrice != null ? `₹${minPrice.toLocaleString()}` : '—'}
 </div>
 </div>
 <div className="stat-card" style={{ borderLeftColor: totalChange > 0 ? '#16a34a' : totalChange < 0 ? '#dc2626' : '#9ca3af' }}>
 <div className="stat-label">Overall Change</div>
 <div className="stat-value" style={{ fontSize: 18, color: totalChange > 0 ? '#16a34a' : totalChange < 0 ? '#dc2626' : '#9ca3af' }}>
 {totalChange != null ? `${totalChange > 0 ? '' : totalChange < 0 ? '' : '='} ₹${Math.abs(totalChange).toLocaleString()}` : '—'}
 </div>
 </div>
 </div>

 <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #f8faff 0%, #fff 100%)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
 <div>
 <div style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 15 }}>Price Trend</div>
 <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{history.length} data point{history.length !== 1 ? 's' : ''}</div>
 </div>
 </div>
 <ResponsiveContainer width="100%" height={280}>
 <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
 <CartesianGrid strokeDasharray="4 4" stroke="#e8f0fe" />
 <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
 <Tooltip content={<CustomTooltip />} />
 {minPrice != null && <ReferenceLine y={minPrice} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} />}
 {maxPrice != null && <ReferenceLine y={maxPrice} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1.5} />}
 <Line type="monotone" dataKey="price" stroke="#1a3a6b" strokeWidth={3}
 dot={{ r: 5, fill: '#e8a020', stroke: '#1a3a6b', strokeWidth: 2 }}
 activeDot={{ r: 7, fill: '#e8a020', stroke: '#fff', strokeWidth: 2 }} />
 </LineChart>
 </ResponsiveContainer>
 <div style={{ display: 'flex', gap: 20, marginTop: 8, justifyContent: 'center' }}>
 <span style={{ fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
 <span style={{ width: 24, height: 2, display: 'inline-block', borderTop: '2px dashed #16a34a' }} /> Highest
 </span>
 <span style={{ fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
 <span style={{ width: 24, height: 2, display: 'inline-block', borderTop: '2px dashed #dc2626' }} /> Lowest
 </span>
 </div>
 </div>

 <div className="card">
 <div style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 14, marginBottom: 14 }}>Price Log</div>
 <div className="table-wrap">
 <table>
 <thead>
 <tr><th>#</th><th>Date</th><th>Price (₹)</th><th>Notes</th><th>Change</th></tr>
 </thead>
 <tbody>
 {[...history].reverse().map((e, i, arr) => {
 const prev = arr[i + 1];
 const diff = (prev && e.price != null && prev.price != null) ? e.price - prev.price : null;
 return (
 <tr key={e._id}>
 <td style={{ color: '#9ca3af', fontSize: 12 }}>{arr.length - i}</td>
 <td style={{ fontWeight: 600, color: '#374151' }}>{e.date}</td>
 <td>
 {e.price != null
 ? <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 15 }}>₹{e.price.toLocaleString()}</span>
 : <span className="no-price">—</span>}
 </td>
 <td style={{ fontSize: 13, color: '#6b7280' }}>{e.notes || '—'}</td>
 <td>
 {diff === null ? <span className="no-price">—</span> :
 diff > 0 ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#dcfce7', color:'#15803d', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}> ₹{Math.abs(diff).toFixed(2)}</span>
 : diff < 0 ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#fee2e2', color:'#dc2626', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}> ₹{Math.abs(diff).toFixed(2)}</span>
 : <span style={{ background:'#f3f4f6', color:'#9ca3af', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>= No change</span>}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </>
 )}
 </div>
 );
}
