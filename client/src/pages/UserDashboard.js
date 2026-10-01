import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import './Dashboard.css';

const LINKS = [
 { to: '/dashboard', label: 'Daily Prices', icon: '' },
 { to: '/dashboard/compare', label: 'Compare Prices', icon: '' },
 { to: '/dashboard/queries', label: 'My Queries', icon: '' },
];

export default function UserDashboard() {
 const today = new Date().toISOString().split('T')[0];

 const [prices, setPrices] = useState([]);
 const [groups, setGroups] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [filterGroup, setFilterGroup] = useState('');
 const [selectedDate, setSelectedDate] = useState(''); // '' = latest
 const [selected, setSelected] = useState(null); // for history chart
 const [history, setHistory] = useState([]);

 const displayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

 // Load groups once on mount for the filter dropdown
 useEffect(() => {
 api.get('/products/groups').then(r => setGroups(r.data)).catch(() => {});
 }, []);

 const loadPrices = useCallback(async () => {
 if (!selectedDate) {
 setPrices([]);
 setLoading(false);
 return;
 }
 setLoading(true);
 setSelected(null);
 try {
 const priceRes = await api.get(`/prices/date/${selectedDate}`);
 // Only show products that have a price on this date
 setPrices(priceRes.data.filter(i => i.price !== null));
 } catch { /* silent */ }
 finally { setLoading(false); }
 }, [selectedDate]);

 useEffect(() => { loadPrices(); }, [loadPrices]);

 useEffect(() => {
 if (!selected) return;
 api.get(`/prices/history/${selected.product._id}`)
 .then(r => setHistory(r.data.reverse()));
 }, [selected]);

 const filtered = prices.filter(item => {
 const matchGroup = !filterGroup || item.product?.group === filterGroup;
 const q = search.toLowerCase();
 const matchSearch = !q ||
 item.product?.group?.toLowerCase().includes(q) ||
 item.product?.make?.toLowerCase().includes(q) ||
 item.product?.coo?.toLowerCase().includes(q) ||
 item.product?.grade?.toLowerCase().includes(q);
 return matchGroup && matchSearch;
 });

 const grouped = filtered.reduce((acc, item) => {
 const g = item.product?.group || 'Other';
 if (!acc[g]) acc[g] = [];
 acc[g].push(item);
 return acc;
 }, {});

 const pricesWithValue = filtered.filter(i => i.price !== null).length;
 const updatedToday = prices.filter(i => i.date === today).length;

 return (
 <div className="dashboard-layout">
 <Sidebar links={LINKS} />
 <main className="dashboard-main">
 <div className="page-header">
 <h2> Live Product Prices</h2>
 </div>

 {/* Stats */}
 <div className="stat-grid">
 <div className="stat-card">
 <div className="stat-label">Total Products</div>
 <div className="stat-value">{prices.length}</div>
 </div>
 <div className="stat-card accent">
 <div className="stat-label">Updated Today</div>
 <div className="stat-value">{updatedToday}</div>
 </div>
 <div className="stat-card success">
 <div className="stat-label">Prices Available</div>
 <div className="stat-value">{pricesWithValue}</div>
 </div>
 <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
 <div className="stat-label">Viewing</div>
 <div className="stat-value" style={{ fontSize: 14 }}>
 {selectedDate || displayDate}
 </div>
 </div>
 </div>

 {/* Filters row */}
 <div className="card" style={{ marginBottom: 20 }}>
 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
 {/* Date filter */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
 <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}> Date:</span>
 <input
 type="date"
 value={selectedDate}
 onChange={e => setSelectedDate(e.target.value)}
 max={today}
 style={{ padding: '8px 10px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
 />
 {selectedDate && (
 <button
 onClick={() => setSelectedDate('')}
 style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
 >
 Clear
 </button>
 )}
 </div>

 {/* Group filter */}
 <select
 value={filterGroup}
 onChange={e => setFilterGroup(e.target.value)}
 style={{ padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, minWidth: 200 }}
 >
 <option value="">All Chemical Groups ({groups.length})</option>
 {groups.map(g => <option key={g} value={g}>{g}</option>)}
 </select>

 {/* Search */}
 <input
 style={{ padding: '9px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, flex: 1, minWidth: 180 }}
 placeholder=" Search name, make, origin, grade..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 />

 <span style={{ fontSize: 13, color: '#9ca3af', flexShrink: 0 }}>
 {filtered.length} products
 </span>
 </div>
 </div>

 {/* Price table grouped by chemical group */}
 {loading ? (
 <div className="spinner">Loading prices...</div>
 ) : !selectedDate ? (
 <div className="card">
 <div className="empty-state">
 <div className="empty-icon"></div>
 <p style={{ marginTop: 10, color: '#718096', fontSize: 14 }}>Select a date to view prices</p>
 </div>
 </div>
 ) : filtered.length === 0 ? (
 <div className="card">
 <div className="empty-state">
 <div className="empty-icon"></div>
 <p style={{ marginTop: 10, color: '#718096', fontSize: 14 }}>No prices found for {selectedDate}</p>
 </div>
 </div>
 ) : (
 Object.entries(grouped).map(([group, items]) => (
 <div key={group} className="card" style={{ marginBottom: 16 }}>
 <div style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
 {group}
 <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, background: '#f3f4f6', padding: '2px 8px', borderRadius: 999 }}>
 {items.length} variant{items.length !== 1 ? 's' : ''}
 </span>
 <span style={{ fontSize: 11, color: items.some(i => i.price !== null) ? '#16a34a' : '#9ca3af', fontWeight: 500, marginLeft: 4 }}>
 {items.filter(i => i.price !== null).length}/{items.length} priced
 </span>
 </div>
 <div className="table-wrap">
 <table>
 <thead>
 <tr>
 <th>Make</th>
 <th>Origin</th>
 <th>Grade</th>
 <th>Purity</th>
 <th>Package</th>
 <th>Unit</th>
 <th>Price (₹)</th>
 <th>Date</th>
 <th>Notes</th>
 </tr>
 </thead>
 <tbody>
 {items.map(item => (
 <tr
 key={item.product._id}
 onClick={() => setSelected(selected?.product._id === item.product._id ? null : item)}
 style={{ cursor: 'pointer', background: selected?.product._id === item.product._id ? '#f0f5ff' : undefined }}
 >
 <td>{item.product.make || <span className="no-price">—</span>}</td>
 <td>{item.product.coo || <span className="no-price">—</span>}</td>
 <td>{item.product.grade || <span className="no-price">—</span>}</td>
 <td>{item.product.purity || <span className="no-price">—</span>}</td>
 <td style={{ fontSize: 12 }}>{item.product.itemPackage || <span className="no-price">—</span>}</td>
 <td>{item.product.unit}</td>
 <td>
 {item.price !== null
 ? <span className="price-highlight">₹{item.price.toLocaleString()}<span className="currency">/{item.product.unit}</span></span>
 : <span className="no-price">—</span>}
 </td>
 <td style={{ fontSize: 12, color: '#6c757d' }}>{item.date || <span className="no-price">—</span>}</td>
 <td style={{ fontSize: 12, color: '#6c757d' }}>{item.notes || '—'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 ))
 )}

 {/* Inline history chart when row clicked */}
 {selected && history.length > 0 && (
 <div className="card" style={{ marginTop: 8 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
 <h3 style={{ color: '#1a3a6b', fontSize: 15 }}>
 {selected.product.group}
 {selected.product.make ? ` · ${selected.product.make}` : ''}
 {selected.product.coo ? ` (${selected.product.coo})` : ''}
 </h3>
 <button onClick={() => setSelected(null)} style={{ background: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}></button>
 </div>
 <ResponsiveContainer width="100%" height={220}>
 <LineChart data={history.map(e => ({ date: e.date, price: e.price }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
 <XAxis dataKey="date" tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <Tooltip formatter={v => [`₹${v}`, 'Price']} />
 <Line type="monotone" dataKey="price" stroke="#1a3a6b" strokeWidth={2.5} dot={{ r: 4, fill: '#e8a020' }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 )}
 </main>
 </div>
 );
}
