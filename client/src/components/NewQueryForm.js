import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

// "New Query" form shared by the user panel: pick existing products (search + checkboxes)
// and/or type new products, then send one query per product.
const EMPTY_FORM = { origin: '', message: '' };
const EMPTY_NEW = { productName: '', make: '', coo: '', grade: '', purity: '' };
const productLabel = p => [p.group, p.make, p.coo, p.grade, p.purity, p.itemPackage].filter(Boolean).join(' · ');

export default function NewQueryForm({ onDone, setMsg }) {
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

 // Load the product list once
 useEffect(() => { api.get('/products').then(r => setAllProducts(r.data)).catch(() => {}); }, []);

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

 // Send one query per selected / typed product
 const submitQuery = async e => {
  e.preventDefault();
  const typed = [...newItems, ...(newDraft.productName.trim() ? [{ ...newDraft, productName: newDraft.productName.trim() }] : [])];
  const existing = allProducts.filter(p => picked.has(p._id));
  if (!existing.length && !typed.length) { setMsg({ type: 'error', text: 'Select at least one product or type a new one.' }); return; }
  const payloads = [
   ...existing.map(p => ({
    productName: p.group, make: p.make || '', coo: p.coo || '', origin: form.origin,
    grade: p.grade || '', purity: p.purity || '', message: form.message,
   })),
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
   : { type: 'success', text: `${ok} ${ok === 1 ? 'query' : 'queries'} sent. Admin will reply soon.` });
  onDone(!failed);
 };

 const pickList = allProducts.filter(p => {
  const q = pickSearch.trim().toLowerCase();
  return !q || productLabel(p).toLowerCase().includes(q);
 });
 const totalChosen = picked.size + newItems.length + (newDraft.productName.trim() ? 1 : 0);
 const inp = { padding: '6px 9px', border: '1.5px solid #dbe3f4', borderRadius: 7, fontSize: 12, outline: 'none', background: '#fff' };

 return (
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
         {[['make','Make'],['coo','Origin'],['grade','Grade'],['purity','Purity']].map(([k, label]) => (
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
     placeholder="Region" style={{ ...inp, width: 90 }} />
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
 );
}
