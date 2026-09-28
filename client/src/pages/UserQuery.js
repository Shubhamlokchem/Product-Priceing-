import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import './Dashboard.css';

const links = [
 { to: '/dashboard', label: 'Daily Prices', icon: '' },
 { to: '/dashboard/compare', label: 'Compare Prices', icon: '' },
 { to: '/dashboard/queries', label: 'My Queries', icon: '' },
];

const EMPTY_FORM = { productName: '', make: '', coo: '', origin: '', grade: '', purity: '', message: '' };

export default function UserQuery() {
 const [form, setForm] = useState(EMPTY_FORM);
 const [queries, setQueries] = useState([]);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [msg, setMsg] = useState(null);
 const [showForm, setShowForm] = useState(false);

 const loadQueries = async () => {
 try { const r = await api.get('/queries/mine'); setQueries(r.data); }
 catch { /* silent */ }
 finally { setLoading(false); }
 };

 useEffect(() => { loadQueries(); }, []);

 const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

 const submit = async e => {
 e.preventDefault();
 if (!form.productName.trim()) { setMsg({ type: 'error', text: 'Product name is required.' }); return; }
 setSubmitting(true); setMsg(null);
 try {
 await api.post('/queries', form);
 setMsg({ type: 'success', text: 'Query submitted! Admin will reply soon.' });
 setForm(EMPTY_FORM);
 setShowForm(false);
 loadQueries();
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Submission failed' }); }
 finally { setSubmitting(false); }
 };

 const openCount = queries.filter(q => q.status === 'open').length;
 const repliedCount = queries.filter(q => q.status === 'replied').length;

 return (
 <div className="dashboard-layout">
 <Sidebar links={links} />
 <main className="dashboard-main">
 <div className="page-header">
 <h2> My Queries</h2>
 </div>

 <div className="stat-grid">
 <div className="stat-card"><div className="stat-label">Total Sent</div><div className="stat-value">{queries.length}</div></div>
 <div className="stat-card accent"><div className="stat-label">Pending Reply</div><div className="stat-value">{openCount}</div></div>
 <div className="stat-card success"><div className="stat-label">Replied</div><div className="stat-value">{repliedCount}</div></div>
 </div>

 {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}

 {/* New query button / form */}
 {!showForm ? (
 <div style={{ marginBottom: 20 }}>
 <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Query</button>
 </div>
 ) : (
 <div className="card" style={{ marginBottom: 24 }}>
 <h3 style={{ marginBottom: 18, color: '#1a3a6b' }}>Submit a Product Query</h3>
 <form onSubmit={submit}>
 <div className="form-grid">
 <div className="form-field" style={{ gridColumn: 'span 2' }}>
 <label>Product Name *</label>
 <input name="productName" value={form.productName} onChange={handle} placeholder="e.g. Acetonitrile" required />
 </div>
 <div className="form-field">
 <label>Make / Brand</label>
 <input name="make" value={form.make} onChange={handle} placeholder="e.g. BASF" />
 </div>
 <div className="form-field">
 <label>COO (Country of Origin)</label>
 <input name="coo" value={form.coo} onChange={handle} placeholder="e.g. Germany" />
 </div>
 <div className="form-field">
 <label>Origin</label>
 <input name="origin" value={form.origin} onChange={handle} placeholder="e.g. EU" />
 </div>
 <div className="form-field">
 <label>Grade</label>
 <input name="grade" value={form.grade} onChange={handle} placeholder="e.g. Industrial, AR" />
 </div>
 <div className="form-field">
 <label>Purity</label>
 <input name="purity" value={form.purity} onChange={handle} placeholder="e.g. 99.5%" />
 </div>
 <div className="form-field" style={{ gridColumn: 'span 2' }}>
 <label>Message / Notes</label>
 <textarea
 name="message"
 value={form.message}
 onChange={handle}
 placeholder="Any specific requirements, quantity, delivery terms..."
 rows={3}
 style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
 />
 </div>
 </div>
 <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
 <button type="submit" className="btn btn-primary" disabled={submitting}>
 {submitting ? 'Submitting...' : ' Submit Query'}
 </button>
 <button type="button" className="btn btn-danger" onClick={() => { setShowForm(false); setMsg(null); }}>Cancel</button>
 </div>
 </form>
 </div>
 )}

 {/* My queries list */}
 {loading ? <div className="spinner">Loading...</div> : queries.length === 0 ? (
 <div className="card">
 <div className="empty-state">
 <div className="empty-icon"></div>
 <p>No queries yet. Click <strong>+ New Query</strong> to submit one.</p>
 </div>
 </div>
 ) : (
 queries.map(q => (
 <div key={q._id} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${q.status === 'replied' ? '#16a34a' : '#e8a020'}` }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
 <div>
 <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 15 }}>{q.productName}</span>
 <span style={{
 marginLeft: 10, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
 background: q.status === 'replied' ? '#dcfce7' : '#fef3c7',
 color: q.status === 'replied' ? '#16a34a' : '#92400e',
 }}>
 {q.status === 'replied' ? ' Replied' : ' Pending'}
 </span>
 </div>
 <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(q.createdAt).toLocaleString('en-IN')}</span>
 </div>

 {/* Details */}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, background: '#f8fafc', padding: '8px 12px', borderRadius: 8, marginBottom: 10 }}>
 {[['Make', q.make], ['COO', q.coo], ['Origin', q.origin], ['Grade', q.grade], ['Purity', q.purity]].map(([label, val]) => val ? (
 <div key={label}>
 <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
 <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3a6b' }}>{val}</div>
 </div>
 ) : null)}
 </div>

 {q.message && (
 <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
 <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>YOUR MESSAGE: </span>{q.message}
 </div>
 )}

 {q.status === 'replied' && (
 <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
 <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'block', marginBottom: 4 }}>
 ADMIN REPLY · {q.repliedBy?.name} · {new Date(q.repliedAt).toLocaleString('en-IN')}
 </span>
 {q.reply}
 </div>
 )}
 </div>
 ))
 )}
 </main>
 </div>
 );
}
