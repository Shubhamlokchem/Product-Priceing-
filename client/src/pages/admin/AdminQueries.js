import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import '../Dashboard.css';

const EMPTY_FORM = { origin: '', message: '' };
const EMPTY_NEW = { productName: '', make: '', coo: '', grade: '', purity: '' };
const productLabel = p => [p.group, p.make, p.coo, p.grade, p.purity, p.itemPackage].filter(Boolean).join(' · ');

export default function AdminQueries() {
 const [queries, setQueries] = useState([]);
 const [loading, setLoading] = useState(true);
 const [replyId, setReplyId] = useState(null);
 const [replyText, setReplyText] = useState('');
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState(null);
 const [filter, setFilter] = useState('all'); // 'all' | 'open' | 'replied'
 const [showForm, setShowForm] = useState(false);
 const [form, setForm] = useState(EMPTY_FORM);
 const [submitting, setSubmitting] = useState(false);
 const [allProducts, setAllProducts] = useState([]);
 const [picked, setPicked] = useState(new Set());      // selected existing product ids
 const [newItems, setNewItems] = useState([]);         // typed new products (with own details)
 const [newDraft, setNewDraft] = useState(EMPTY_NEW);
 const [showPicker, setShowPicker] = useState(false);
 const [pickSearch, setPickSearch] = useState('');
 const pickerRef = useRef(null);
 const newNameRef = useRef(null);

 // Load product list when the form opens
 useEffect(() => {
  if (showForm && !allProducts.length) api.get('/products').then(r => setAllProducts(r.data)).catch(() => {});
 }, [showForm, allProducts.length]);

 // Close picker on outside click
 useEffect(() => {
  const h = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
  document.addEventListener('mousedown', h);
  return () => document.removeEventListener('mousedown', h);
 }, []);

 const togglePick = id => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
 const addNewItem = () => {
  const name = newDraft.productName.trim();
  if (!name) return;
  setNewItems(a => [...a, { ...newDraft, productName: name }]);
  setNewDraft(EMPTY_NEW);
  setTimeout(() => newNameRef.current?.focus(), 0); // ready for the next one
 };
 const resetForm = () => { setForm(EMPTY_FORM); setPicked(new Set()); setNewItems([]); setNewDraft(EMPTY_NEW); setPickSearch(''); };

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

 // Admin: send one query per selected / typed product
 const submitQuery = async e => {
  e.preventDefault();
  const typed = [...newItems, ...(newDraft.productName.trim() ? [{ ...newDraft, productName: newDraft.productName.trim() }] : [])];
  const existing = allProducts.filter(p => picked.has(p._id));
  if (!existing.length && !typed.length) { setMsg({ type: 'error', text: 'Select at least one product or type a new one.' }); return; }
  const payloads = [
   // Existing products: details come from the product itself
   ...existing.map(p => ({
    productName: p.group, make: p.make || '', coo: p.coo || '', origin: form.origin,
    grade: p.grade || '', purity: p.purity || '', message: form.message,
   })),
   // New products: their own typed details
   ...typed.map(n => ({ ...n, origin: form.origin, message: form.message })),
  ];
  setSubmitting(true); setMsg(null);
  let ok = 0, failed = 0;
  for (const body of payloads) {
   try { await api.post('/queries', body); ok++; } catch { failed++; }
  }
  setSubmitting(false);
  setMsg(failed
   ? { type: 'error', text: `${ok} of ${payloads.length} queries sent. ${failed} failed.` }
   : { type: 'success', text: `${ok} ${ok === 1 ? 'query' : 'queries'} sent.` });
  if (!failed) { resetForm(); setShowForm(false); }
  load();
 };

 const pickList = allProducts.filter(p => {
  const q = pickSearch.trim().toLowerCase();
  return !q || productLabel(p).toLowerCase().includes(q);
 });
 const totalChosen = picked.size + newItems.length + (newDraft.productName.trim() ? 1 : 0);
 const inp = { padding: '6px 9px', border: '1.5px solid #dbe3f4', borderRadius: 7, fontSize: 12, outline: 'none', background: '#fff' };

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
  <button onClick={() => { setShowForm(v => !v); setMsg(null); if (showForm) resetForm(); }}
   style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
    border: showForm ? '1.5px solid #fca5a5' : 'none', background: showForm ? '#fef2f2' : '#1a3a6b', color: showForm ? '#dc2626' : '#fff' }}>
   {showForm ? '✕ Cancel' : '+ New Query'}
  </button>
 </div>
 </div>{/* /sticky-page-header */}

 {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}

 {showForm && (
  <form onSubmit={submitQuery} style={{ marginBottom: 12, border: '1px solid #dbe3f4', borderLeft: '4px solid #1a3a6b', borderRadius: 10, padding: '10px 12px', background: '#fff', boxShadow: '0 2px 8px rgba(26,58,107,0.06)' }}>
   {/* Single compact row */}
   <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <div style={{ position: 'relative' }} ref={pickerRef}>
     <button type="button" onClick={() => setShowPicker(v => !v)}
      style={{ ...inp, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, minWidth: 200,
       color: totalChosen ? '#1a3a6b' : '#6b7280', borderColor: showPicker || totalChosen ? '#1a3a6b' : '#dbe3f4' }}>
      <span style={{ flex: 1, textAlign: 'left' }}>{totalChosen ? `${totalChosen} product${totalChosen > 1 ? 's' : ''} chosen` : 'Choose products'}</span>
      {totalChosen > 0 && <span style={{ background: '#1a3a6b', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 99 }}>{totalChosen}</span>}
      <span style={{ fontSize: 10 }}>▾</span>
     </button>

     {showPicker && (
      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.14)', width: 400, overflow: 'hidden' }}>
       {/* Search */}
       <div style={{ padding: 8, display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid #f1f3f7' }}>
        <input autoFocus value={pickSearch} onChange={e => setPickSearch(e.target.value)} placeholder="🔍 Search products…" style={{ ...inp, flex: 1 }} />
        {picked.size > 0 && <button type="button" onClick={() => setPicked(new Set())}
         style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear</button>}
       </div>
       {/* Checkbox list */}
       <div style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
        {pickList.length === 0
         ? <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{allProducts.length ? 'No match — add it as a new product below.' : 'Loading products…'}</div>
         : pickList.map(p => (
          <label key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, background: picked.has(p._id) ? '#eef3ff' : 'transparent', color: '#374151' }}>
           <input type="checkbox" checked={picked.has(p._id)} onChange={() => togglePick(p._id)} style={{ accentColor: '#1a3a6b', cursor: 'pointer' }} />
           <strong style={{ color: '#1a3a6b', fontWeight: 600 }}>{p.group}</strong>
           <span style={{ color: '#9ca3af', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[p.make, p.coo, p.grade, p.purity].filter(Boolean).join(' · ')}
           </span>
          </label>
         ))}
       </div>
       {/* Add new product(s) */}
       <div style={{ padding: 8, background: '#fffbeb', borderTop: '1px solid #fde68a' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
         <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4 }}>New products</span>
         {newItems.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: '#e8a020', color: '#fff', padding: '0 6px', borderRadius: 99, fontWeight: 700 }}>{newItems.length} added</span>}
        </div>

        {/* Already-added new products */}
        {newItems.length > 0 && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6, maxHeight: 90, overflowY: 'auto' }}>
          {newItems.map((n, i) => (
           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, background: '#fff', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 8px', color: '#92400e' }}>
            <span style={{ fontWeight: 700 }}>{i + 1}.</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
             <strong>{n.productName}</strong>{[n.make, n.coo, n.grade, n.purity].filter(Boolean).map(v => ` · ${v}`).join('')}
            </span>
            <span onClick={() => setNewItems(a => a.filter((_, j) => j !== i))} title="Remove"
             style={{ cursor: 'pointer', color: '#dc2626', fontSize: 14, lineHeight: 1 }}>×</span>
           </div>
          ))}
         </div>
        )}

        {/* Entry row */}
        <div style={{ display: 'flex', gap: 5 }}>
         <input ref={newNameRef} value={newDraft.productName} onChange={e => setNewDraft(d => ({ ...d, productName: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewItem(); } }}
          placeholder={newItems.length ? 'Next product name…' : 'Product name *'} style={{ ...inp, flex: 1 }} />
         <button type="button" onClick={addNewItem} title="Add this product"
          style={{ padding: '0 12px', background: '#e8a020', color: '#fff', border: 'none', borderRadius: 7, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: newDraft.productName.trim() ? 1 : 0.55 }}>
          +
         </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginTop: 5 }}>
         {[['make','Make'],['coo','COO'],['grade','Grade'],['purity','Purity']].map(([k, label]) => (
          <input key={k} value={newDraft[k]} onChange={e => setNewDraft(d => ({ ...d, [k]: e.target.value }))}
           onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewItem(); } }}
           placeholder={label} style={{ ...inp, minWidth: 0 }} />
         ))}
        </div>
        <div style={{ fontSize: 10, color: '#a16207', marginTop: 5 }}>Type a name → press <b>+</b> or Enter. Repeat to add more.</div>
       </div>
      </div>
     )}
    </div>

    <input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
     placeholder="Message / notes (sent with every product)" style={{ ...inp, flex: 1, minWidth: 220 }} />
    <input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
     placeholder="Origin" style={{ ...inp, width: 90 }} />
    <button type="submit" disabled={submitting}
     style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#1a3a6b,#2451a0)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(26,58,107,0.25)' }}>
     {submitting ? 'Sending…' : totalChosen > 1 ? `Send ${totalChosen} Queries` : 'Send'}
    </button>
   </div>

   {/* Chosen products as chips */}
   {(picked.size > 0 || newItems.length > 0) && (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
     {allProducts.filter(p => picked.has(p._id)).map(p => (
      <span key={p._id} style={{ fontSize: 11, background: '#eef3ff', color: '#1a3a6b', padding: '3px 4px 3px 9px', borderRadius: 99, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
       {productLabel(p)}
       <span onClick={() => togglePick(p._id)} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 13, lineHeight: 1, padding: '0 3px' }}>×</span>
      </span>
     ))}
     {newItems.map((n, i) => (
      <span key={i} style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '3px 4px 3px 9px', borderRadius: 99, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
       <span style={{ fontSize: 9, background: '#e8a020', color: '#fff', padding: '0 5px', borderRadius: 4 }}>NEW</span>
       {[n.productName, n.make, n.coo, n.grade, n.purity].filter(Boolean).join(' · ')}
       <span onClick={() => setNewItems(a => a.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: '#b45309', fontSize: 13, lineHeight: 1, padding: '0 3px' }}>×</span>
      </span>
     ))}
    </div>
   )}
  </form>
 )}

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
      {replyId === q._id ? (
       <div style={{ flex: 1, minWidth: 240 }}>
        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type reply…" rows={2}
         style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #d1d5db', borderRadius: 7, fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
         <button className="btn btn-primary btn-sm" onClick={() => submitReply(q._id)} disabled={saving}>{saving ? 'Sending…' : 'Send'}</button>
         <button className="btn btn-danger btn-sm" onClick={() => { setReplyId(null); setReplyText(''); }}>Cancel</button>
        </div>
       </div>
      ) : replied ? (
       <div style={{ flex: 1, minWidth: 180, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 7, padding: '5px 10px', fontSize: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginRight: 6 }}>REPLY</span>
        <span style={{ color: '#374151' }}>{q.reply}</span>
        <button onClick={() => { setReplyId(q._id); setReplyText(q.reply); }}
         style={{ marginLeft: 10, fontSize: 11, color: '#1a3a6b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
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
