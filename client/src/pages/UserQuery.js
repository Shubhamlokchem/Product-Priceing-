import { useState, useEffect } from 'react';
import api from '../api/axios';
import NewQueryForm from '../components/NewQueryForm';
import './Dashboard.css';

export default function UserQuery() {
 const [queries, setQueries] = useState([]);
 const [loading, setLoading] = useState(true);
 const [msg, setMsg] = useState(null);
 const [showForm, setShowForm] = useState(false);

 const loadQueries = async () => {
 try { const r = await api.get('/queries/mine'); setQueries(r.data); }
 catch { /* silent */ }
 finally { setLoading(false); }
 };

 useEffect(() => { loadQueries(); }, []);

 const openCount = queries.filter(q => q.status === 'open').length;
 const repliedCount = queries.filter(q => q.status === 'replied').length;

 return (
 <div>
 {/* Sticky compact header row — same look as the admin pages */}
 <div className="sticky-page-header">
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a3a6b', flexShrink: 0 }}>Queries</h2>
  <div style={{ flex: 1 }} />
  <span style={{ fontSize: 12, color: '#6b7280' }}>Sent: <strong style={{ color: '#1a3a6b' }}>{queries.length}</strong></span>
  <span style={{ fontSize: 12, color: '#b45309', fontWeight: 600 }}>Pending: {openCount}</span>
  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Replied: {repliedCount}</span>
  <button onClick={() => { setShowForm(v => !v); setMsg(null); }}
   style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
    border: showForm ? '1.5px solid #fca5a5' : 'none', background: showForm ? '#fef2f2' : '#1a3a6b', color: showForm ? '#dc2626' : '#fff' }}>
   {showForm ? '✕ Cancel' : '+ New Query'}
  </button>
 </div>
 </div>

 {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}

 {/* New query button / form */}
 {showForm && <NewQueryForm setMsg={setMsg} onDone={ok => { if (ok) setShowForm(false); loadQueries(); }} />}

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
 {[['Make', q.make], ['Origin', q.coo], ['Region', q.origin], ['Grade', q.grade], ['Purity', q.purity]].map(([label, val]) => val ? (
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
 </div>
 );
}
