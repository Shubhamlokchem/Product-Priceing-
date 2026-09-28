import { useState, useEffect } from 'react';
import api from '../../api/axios';
import '../Dashboard.css';

export default function AdminQueries() {
 const [queries, setQueries] = useState([]);
 const [loading, setLoading] = useState(true);
 const [replyId, setReplyId] = useState(null);
 const [replyText, setReplyText] = useState('');
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState(null);
 const [filter, setFilter] = useState('all'); // 'all' | 'open' | 'replied'

 const load = async () => {
 setLoading(true);
 try { const r = await api.get('/queries'); setQueries(r.data); }
 catch { setMsg({ type: 'error', text: 'Failed to load queries' }); }
 finally { setLoading(false); }
 };

 useEffect(() => { load(); }, []);

 const submitReply = async (id) => {
 if (!replyText.trim()) return;
 setSaving(true);
 try {
 await api.put(`/queries/${id}/reply`, { reply: replyText });
 setReplyId(null); setReplyText('');
 setMsg({ type: 'success', text: 'Reply sent!' });
 load();
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send reply' }); }
 finally { setSaving(false); }
 };

 const displayed = queries.filter(q => filter === 'all' || q.status === filter);
 const openCount = queries.filter(q => q.status === 'open').length;
 const repliedCount = queries.filter(q => q.status === 'replied').length;

 return (
 <div>
 {/* ── Sticky compact header row ── */}
 <div className="sticky-page-header">
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a3a6b', flexShrink: 0 }}>Queries</h2>
  <div style={{ flex: 1 }} />
  {/* Stats inline */}
  <span style={{ fontSize: 12, color: '#6b7280' }}>Total: <strong style={{ color: '#1a3a6b' }}>{queries.length}</strong></span>
  <span style={{ fontSize: 12, color: '#e8a020', fontWeight: 600 }}>Open: {openCount}</span>
  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Replied: {repliedCount}</span>
  {/* Filter pills */}
  <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
   {[['all','All'],['open','Open'],['replied','Replied']].map(([val, label]) => (
    <button key={val} onClick={() => setFilter(val)}
     style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
      background: filter === val ? '#1a3a6b' : 'transparent',
      color: filter === val ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>{label}</button>
   ))}
  </div>
 </div>
 </div>{/* /sticky-page-header */}

 {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}

 {loading ? <div className="spinner">Loading queries...</div> : displayed.length === 0 ? (
  <div className="card"><div className="empty-state"><p style={{ fontSize: 13 }}>No {filter !== 'all' ? filter : ''} queries found.</p></div></div>
 ) : (
  displayed.map(q => {
   const replied = q.status === 'replied';
   const details = [['Make', q.make], ['COO', q.coo], ['Origin', q.origin], ['Grade', q.grade], ['Purity', q.purity]].filter(([, v]) => v);
   return (
    <div key={q._id} style={{ marginBottom: 10, border: `1px solid ${replied ? '#bbf7d0' : '#fde68a'}`, borderLeft: `4px solid ${replied ? '#16a34a' : '#e8a020'}`, borderRadius: 10, background: '#fff', overflow: 'hidden' }}>

     {/* ── Row 1: product name + status + user + time ── */}
     <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>{q.productName}</span>
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
       background: replied ? '#dcfce7' : '#fef3c7', color: replied ? '#15803d' : '#92400e' }}>
       {replied ? 'Replied' : 'Open'}
      </span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{q.user?.name}</span>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>{q.user?.email}</span>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(q.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
     </div>

     {/* ── Row 2: product specs + message + reply inline ── */}
     <div style={{ padding: '8px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* Specs chips */}
      {details.length > 0 && (
       <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        {details.map(([label, val]) => (
         <span key={label} style={{ fontSize: 11, background: '#f0f5ff', color: '#1a3a6b', borderRadius: 6, padding: '3px 8px', fontWeight: 600 }}>
          <span style={{ color: '#9ca3af', fontWeight: 400 }}>{label}: </span>{val}
         </span>
        ))}
       </div>
      )}

      {/* Message bubble */}
      {q.message && (
       <div style={{ flex: 1, minWidth: 180, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: '5px 10px', fontSize: 12, color: '#374151' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginRight: 6 }}>MSG</span>{q.message}
       </div>
      )}

      {/* Reply / replied */}
      {replied ? (
       <div style={{ flex: 1, minWidth: 180, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 7, padding: '5px 10px', fontSize: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginRight: 6 }}>REPLY</span>
        <span style={{ color: '#374151' }}>{q.reply}</span>
        <button onClick={() => { setReplyId(q._id); setReplyText(q.reply); }}
         style={{ marginLeft: 10, fontSize: 11, color: '#1a3a6b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
       </div>
      ) : replyId === q._id ? (
       <div style={{ flex: 1, minWidth: 240 }}>
        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type reply…" rows={2}
         style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #d1d5db', borderRadius: 7, fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
         <button className="btn btn-primary btn-sm" onClick={() => submitReply(q._id)} disabled={saving}>{saving ? 'Sending…' : 'Send'}</button>
         <button className="btn btn-danger btn-sm" onClick={() => { setReplyId(null); setReplyText(''); }}>Cancel</button>
        </div>
       </div>
      ) : (
       <button className="btn btn-sm btn-accent" style={{ flexShrink: 0, padding: '4px 12px', fontSize: 12 }}
        onClick={() => { setReplyId(q._id); setReplyText(''); }}>Reply</button>
      )}
     </div>

    </div>
   );
  })
 )}
 </div>
 );
}
