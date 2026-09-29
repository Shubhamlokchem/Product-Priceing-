import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import '../Dashboard.css';

const EMPTY = { group: '', make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', notes: '', ex: '' };

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const downloadCSV = (headers, rows, filename) => {
 const lines = [headers, ...rows].map(r =>
  r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
 );
 const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
 const a = document.createElement('a');
 a.href = URL.createObjectURL(blob); a.download = filename; a.click();
 URL.revokeObjectURL(a.href);
};
const fmtDate = (d) => {
 if (!d) return null;
 return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // "07 Sep"
};
const UNITS = ['kg', 'mt', 'drum', 'tanker', 'litre', 'piece', 'pack', 'bag', 'bottle'];
const EX_LOCATIONS = ['Kandla', 'Mundra', 'Nava Sheva', 'Hazira', 'Chennai', 'Bhiwandi'];

// SVG icon components
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function AdminProducts() {
 const today = new Date().toISOString().split('T')[0];

 const [date, setDate] = useState(today);
 const [products, setProducts] = useState([]);
 const [groups, setGroups] = useState([]);
 const [priceMap, setPriceMap] = useState({}); // { productId: { price, notes } }
 const [origMap, setOrigMap] = useState({}); // prices that existed on load
 const [editMap, setEditMap] = useState({}); // inline product field edits
 const [editingId, setEditingId] = useState(null); // which row is in edit mode
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState(null);
 const [search, setSearch] = useState('');
 const [filterGroups, setFilterGroups] = useState(new Set());
 const [showGroupDD, setShowGroupDD] = useState(false);
 const [showProductDD, setShowProductDD] = useState(false);
 const [filterProducts, setFilterProducts] = useState(new Set()); // view filter (All Products dropdown)
 const [selectedProducts, setSelectedProducts] = useState(new Set()); // checkbox selection for bulk
 const [productSearch, setProductSearch] = useState('');
 const [showAddForm, setShowAddForm] = useState(false);
 const [addForm, setAddForm] = useState(EMPTY);
 const [newGroupMode, setNewGroupMode] = useState(false);
 const [expandedGroups, setExpandedGroups] = useState(new Set());
 const [addingInGroup, setAddingInGroup] = useState(null); // group name being added to
 const [inlineForm, setInlineForm] = useState({ make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', notes: '', ex: '' });
 const [showBulkDD, setShowBulkDD] = useState(false);
 const [bulkAction, setBulkAction] = useState(null); // null | 'delete'|'grade'|'coo'|'make'|'purity'|'unit'|'clearPrice'
 const [bulkValue, setBulkValue] = useState('');
 const [importModal, setImportModal] = useState(null); // null | { duplicates, unique, loading }
 const groupDDRef = useRef(null);
 const productDDRef = useRef(null);
 const bulkDDRef = useRef(null);
 const importRef = useRef(null);
 const scrollRef = useRef(null);

 // Close dropdowns on outside click
 useEffect(() => {
 const h = e => {
  if (groupDDRef.current && !groupDDRef.current.contains(e.target)) setShowGroupDD(false);
  if (productDDRef.current && !productDDRef.current.contains(e.target)) setShowProductDD(false);
  if (bulkDDRef.current && !bulkDDRef.current.contains(e.target)) { setShowBulkDD(false); }
 };
 document.addEventListener('mousedown', h);
 return () => document.removeEventListener('mousedown', h);
 }, []);

 // Load products + today's prices (preserves scroll position by default)
 const loadData = useCallback(async (preserve = false) => {
 if (preserve) scrollRef.current = window.scrollY;
 setLoading(true); setMsg(null);
 try {
 const [prodRes, priceRes, grpRes, latestRes] = await Promise.all([
 api.get('/products'),
 api.get(`/prices/date/${date}`),
 api.get('/products/groups'),
 api.get('/prices/latest'),
 ]);
 setProducts(prodRes.data);
 setGroups(grpRes.data);

 // Build latest price map for fallback display
 const latestMap = {};
 latestRes.data.forEach(e => {
  latestMap[e.product._id] = { price: e.price ?? '', notes: e.notes || '', ex: e.ex || '', updatedAt: e.updatedAt || null, entryDate: e.date || null };
 });

 const pm = {}, om = {};
 priceRes.data.forEach(e => {
 pm[e.product._id] = { price: e.price ?? '', notes: e.notes || '', ex: e.ex || '', updatedAt: e.updatedAt || null, entryDate: e.date || null };
 om[e.product._id] = e.price;
 });

 // For products with no price today, show latest non-null price as reference
 prodRes.data.forEach(p => {
  const todayPrice = pm[p._id]?.price;
  const latest = latestMap[p._id];
  if ((todayPrice === null || todayPrice === '' || todayPrice === undefined) && latest?.price !== null && latest?.price !== '' && latest?.price !== undefined) {
   pm[p._id] = { ...pm[p._id], ...latest, isLatest: true };
  }
 });

 setPriceMap(pm);
 setOrigMap(om);
 setEditMap({});
 setEditingId(null);
 } catch { setMsg({ type: 'error', text: 'Failed to load data' }); }
 finally { setLoading(false); }
 }, [date]);

 useEffect(() => { loadData(); }, [loadData]);

 // Restore scroll after data reload
 useEffect(() => {
 if (!loading && scrollRef.current !== null) {
  const y = scrollRef.current;
  scrollRef.current = null;
  requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
 }
 }, [loading]);

 // Price / notes change — clear isLatest flag when user edits
 const handlePrice = (id, field, val) =>
 setPriceMap(p => ({ ...p, [id]: { ...p[id], [field]: val, isLatest: false } }));

 // Inline product field change
 const handleEdit = (id, field, val) =>
 setEditMap(m => ({ ...m, [id]: { ...m[id], [field]: val } }));

 // Save inline product edit
 const saveProductEdit = async (id) => {
 try {
 await api.put(`/products/${id}`, editMap[id] || {});
 setMsg({ type: 'success', text: 'Product updated' });
 setEditingId(null);
 loadData(true);
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' }); }
 };

 // Add variant inline within a group
 const submitInlineAdd = async (group) => {
 setMsg(null);
 try {
 const { data: newProduct } = await api.post('/products', { ...inlineForm, group });
 // Save price for selected date if entered
 if (inlineForm.price && !isNaN(Number(inlineForm.price))) {
  await api.post('/prices', {
   productId: newProduct._id,
   price: Number(inlineForm.price),
   notes: inlineForm.notes || '',
   ex: inlineForm.ex || '',
   date
  });
 }
 setAddingInGroup(null);
 setInlineForm({ make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', notes: '', ex: '' });
 loadData(true);
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Add failed' }); }
 };

 // Delete product
 const deleteProduct = async (id) => {
 if (!window.confirm('Remove this product?')) return;
 try { await api.delete(`/products/${id}`); loadData(true); }
 catch { setMsg({ type: 'error', text: 'Delete failed' }); }
 };

 // Add new product
 const submitAdd = async e => {
 e.preventDefault(); setMsg(null);
 try {
 const { data: newProduct } = await api.post('/products', addForm);
 // If a price was entered, save it for the selected date
 if (addForm.price && !isNaN(Number(addForm.price))) {
  await api.post('/prices', {
   productId: newProduct._id,
   price: Number(addForm.price),
   notes: addForm.notes || '',
   date
  });
 }
 setMsg({ type: 'success', text: 'Product added' + (addForm.price ? ' with price' : '') });
 setAddForm(EMPTY); setShowAddForm(false); setNewGroupMode(false);
 loadData(true);
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Add failed' }); }
 };

 // Save all prices for selected date
 const savePrices = async () => {
 setSaving(true); setMsg(null);
 try {
 const toSave = products.filter(p => {
 const cur = priceMap[p._id]?.price;
 const had = origMap[p._id] != null;
 const isLatest = priceMap[p._id]?.isLatest;
 return !isLatest && ((cur !== '' && cur !== undefined) || had);
 });
 if (!toSave.length) { setSaving(false); return; }

 const prices = toSave.map(p => {
 const raw = priceMap[p._id]?.price;
 return {
 productId: p._id,
 price: (raw !== '' && raw !== undefined) ? parseFloat(raw) : null,
 notes: priceMap[p._id]?.notes || '',
 ex: priceMap[p._id]?.ex || '',
 };
 });
 await api.post('/prices/bulk', { date, prices });
 setMsg({ type: 'success', text: ` ${prices.length} prices saved for ${date}` });
 loadData(true);
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed' }); }
 finally { setSaving(false); }
 };

 // Save price for a single row
 const saveRowPrice = async (productId) => {
 const raw = priceMap[productId]?.price;
 try {
  await api.post('/prices', { productId, price: (raw !== '' && raw !== undefined) ? parseFloat(raw) : null, notes: priceMap[productId]?.notes || '', ex: priceMap[productId]?.ex || '', date });
  setMsg({ type: 'success', text: 'Price saved!' });
  loadData(true);
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed' }); }
 };

 // Bulk actions on selected products
 const executeBulkAction = async (action, value) => {
  const targets = selectedProducts.size > 0 ? [...selectedProducts] : products.map(p => p._id);
  if (!targets.length) { setMsg({ type: 'error', text: 'No products selected.' }); return; }
  if (action === 'delete') {
   if (!window.confirm(`Delete ${targets.length} product(s)? This cannot be undone.`)) return;
   try {
    await Promise.all(targets.map(id => api.delete(`/products/${id}`)));
    setSelectedProducts(new Set()); setBulkAction(null);
    setMsg({ type: 'success', text: `${targets.length} products deleted.` }); loadData(true);
   } catch { setMsg({ type: 'error', text: 'Bulk delete failed.' }); }
   return;
  }
  if (action === 'clearPrice') {
   if (!window.confirm(`Clear prices for ${targets.length} product(s) on ${date}?`)) return;
   try {
    await api.post('/prices/bulk', { date, prices: targets.map(id => ({ productId: id, price: null, notes: '' })) });
    setBulkAction(null);
    setMsg({ type: 'success', text: 'Prices cleared.' }); loadData(true);
   } catch { setMsg({ type: 'error', text: 'Failed to clear prices.' }); }
   return;
  }
  // Field update actions: grade, coo, make, purity, unit
  if (!value.trim()) { setMsg({ type: 'error', text: 'Enter a value.' }); return; }
  const fieldMap = { grade: 'grade', coo: 'coo', make: 'make', purity: 'purity', unit: 'unit' };
  const field = fieldMap[action];
  try {
   const updates = targets.map(id => {
    const p = products.find(x => x._id === id);
    return api.put(`/products/${id}`, { ...p, [field]: value.trim() });
   });
   await Promise.all(updates);
   setBulkAction(null); setBulkValue('');
   setMsg({ type: 'success', text: `${field} updated for ${targets.length} products.` }); loadData(true);
  } catch { setMsg({ type: 'error', text: 'Bulk update failed.' }); }
 };

 // Export all products as CSV
 const exportProducts = () => {
  const headers = ['group','make','coo','grade','purity','package','unit'];
  const rows = products.map(p => [p.group, p.make||'', p.coo||'', p.grade||'', p.purity||'', p.itemPackage||'', p.unit||'kg']);
  downloadCSV(headers, rows, 'products.csv');
 };

 // Parse imported CSV and detect duplicates
 const handleImportFile = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
   const lines = ev.target.result.trim().split(/\r?\n/);
   const hdrs = lines[0].split(',').map(h => h.replace(/"/g,'').trim().toLowerCase());
   const rows = lines.slice(1)
    .map(line => {
     const vals = line.split(',').map(v => v.replace(/"/g,'').trim());
     return Object.fromEntries(hdrs.map((h,i) => [h, vals[i]||'']));
    })
    .filter(r => r.group);
   const duplicates = [], unique = [];
   rows.forEach(row => {
    const isDup = products.some(p =>
     norm(p.group) === norm(row.group) && norm(p.make||'') === norm(row.make||'')
    );
    (isDup ? duplicates : unique).push(row);
   });
   setImportModal({ duplicates, unique, loading: false });
  };
  reader.readAsText(file);
  e.target.value = '';
 };

 // Upload unique products from import
 const submitImport = async () => {
  if (!importModal?.unique.length) return;
  setImportModal(m => ({ ...m, loading: true }));
  try {
   let ok = 0;
   for (const row of importModal.unique) {
    await api.post('/products', {
     group: row.group, make: row.make||'', coo: row.coo||'',
     grade: row.grade||'', purity: row.purity||'',
     itemPackage: row.package||row.itempackage||'', unit: row.unit||'kg',
    });
    ok++;
   }
   setMsg({ type: 'success', text: `${ok} products imported successfully.` });
   setImportModal(null);
   loadData(true);
  } catch (err) {
   setMsg({ type: 'error', text: err.response?.data?.message || 'Import failed' });
   setImportModal(m => ({ ...m, loading: false }));
  }
 };

 const toggleExpand = g => setExpandedGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
 const toggleFilterGroup = g => setFilterGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });

 const filtered = products.filter(p => {
 const matchGroup = filterGroups.size === 0 || filterGroups.has(p.group);
 const matchProduct = filterProducts.size === 0 || filterProducts.has(p.group);
 const q = norm(search);
 return matchGroup && matchProduct && (!q ||
  norm(p.group).includes(q) ||
  norm(p.make||'').includes(q) ||
  norm(p.coo||'').includes(q) ||
  norm(p.grade||'').includes(q) ||
  norm(p.purity||'').includes(q) ||
  norm(p.itemPackage||'').includes(q) ||
  norm(p.unit||'').includes(q)
 );
 });

 const grouped = filtered.reduce((acc, p) => { if (!acc[p.group]) acc[p.group] = []; acc[p.group].push(p); return acc; }, {});
 const pricedCount = products.filter(p => priceMap[p._id]?.price !== '' && priceMap[p._id]?.price !== undefined).length;
 // Count groups that have at least one product selected
 const allGrouped = products.reduce((acc, p) => { if (!acc[p.group]) acc[p.group] = []; acc[p.group].push(p); return acc; }, {});
 const selectedGroupCount = Object.values(allGrouped).filter(items => items.some(p => selectedProducts.has(p._id))).length;

 return (
 <div>
  {/* ── Sticky compact header row ── */}
  <div className="sticky-page-header">
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
   <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a3a6b', flexShrink: 0 }}>Manage Products</h2>

   {/* ── Unique product count + Select All ── */}
   <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: selectedProducts.size > 0 ? '#f0f5ff' : '#f3f4f6', border: `1.5px solid ${selectedProducts.size > 0 ? '#c7d7fa' : '#e5e7eb'}`, borderRadius: 8, cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}>
    <input type="checkbox"
     checked={selectedGroupCount === groups.length && groups.length > 0}
     ref={el => { if (el) el.indeterminate = selectedGroupCount > 0 && selectedGroupCount < groups.length; }}
     onChange={e => setSelectedProducts(e.target.checked ? new Set(products.map(p => p._id)) : new Set())}
     style={{ accentColor: '#1a3a6b', cursor: 'pointer', width: 15, height: 15 }} />
    <span style={{ fontSize: 12, fontWeight: 600, color: selectedProducts.size > 0 ? '#1a3a6b' : '#6b7280', whiteSpace: 'nowrap' }}>
     {selectedProducts.size > 0
      ? `${selectedGroupCount} / ${groups.length} selected`
      : `${groups.length} Products`}
    </span>
    {selectedProducts.size > 0 && (
     <span onClick={e => { e.preventDefault(); e.stopPropagation(); setSelectedProducts(new Set()); }}
      style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, padding: '0 2px', cursor: 'pointer', lineHeight: 1 }}>✕</span>
    )}
   </label>

   <div style={{ flex: 1 }} />

   {/* Date */}
   <input type="date" value={date} onChange={e => setDate(e.target.value)} max={today}
    style={{ padding: '6px 8px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, flexShrink: 0 }} />

   {/* Product multi-select search */}
   <div style={{ position: 'relative', flexShrink: 0 }} ref={productDDRef}>
    <button onClick={() => { setShowProductDD(v => !v); setProductSearch(''); }}
     style={{ padding: '6px 12px', border: `1.5px solid ${filterProducts.size ? '#1a3a6b' : '#e5e7eb'}`, borderRadius: 7, fontSize: 12, background: filterProducts.size ? '#f0f5ff' : '#fff', cursor: 'pointer', color: filterProducts.size ? '#1a3a6b' : '#9ca3af', fontWeight: filterProducts.size ? 600 : 400, whiteSpace: 'nowrap', minWidth: 140 }}>
     {filterProducts.size === 0 ? `🔍 All Products (${groups.length})` : `✓ ${filterProducts.size} selected`} ▾
    </button>
    {showProductDD && (
     <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 300, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.13)', width: 300 }}>
      {/* Search input */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
       <input autoFocus value={productSearch} onChange={e => setProductSearch(e.target.value)}
        placeholder="Search products…"
        style={{ flex: 1, padding: '5px 9px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: 12, outline: 'none' }} />
       {filterProducts.size > 0 && (
        <button onClick={() => setFilterProducts(new Set())}
         style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Clear all</button>
       )}
      </div>
      {/* Select all */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
       <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 600 }}>
        <input type="checkbox"
         checked={filterProducts.size === groups.length && groups.length > 0}
         ref={el => { if (el) el.indeterminate = filterProducts.size > 0 && filterProducts.size < groups.length; }}
         onChange={e => setFilterProducts(e.target.checked ? new Set(groups) : new Set())}
         style={{ accentColor: '#1a3a6b', cursor: 'pointer', width: 14, height: 14 }} />
        Select all ({groups.length})
       </label>
       {filterProducts.size > 0 && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>{filterProducts.size} selected</span>}
      </div>
      {/* Product list — unique group names only */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
       {groups
        .filter(g => !productSearch || g.toLowerCase().includes(productSearch.toLowerCase()))
        .map(g => {
         const checked = filterProducts.has(g);
         return (
          <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, background: checked ? '#f0f5ff' : 'transparent', borderBottom: '1px solid #f9fafb' }}
           onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f8faff'; }}
           onMouseLeave={e => { e.currentTarget.style.background = checked ? '#f0f5ff' : 'transparent'; }}>
           <input type="checkbox" checked={checked}
            onChange={() => setFilterProducts(prev => { const n = new Set(prev); checked ? n.delete(g) : n.add(g); return n; })}
            style={{ accentColor: '#1a3a6b', cursor: 'pointer', flexShrink: 0, width: 14, height: 14 }} />
           <span style={{ color: checked ? '#1a3a6b' : '#1f2937', fontWeight: checked ? 700 : 500 }}>{g}</span>
          </label>
         );
        })}
      </div>
     </div>
    )}
   </div>

   {/* ── Combined Actions Panel ── */}
   <input ref={importRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportFile} />
   <div style={{ position: 'relative', flexShrink: 0 }} ref={bulkDDRef}>
    <button onClick={() => { setShowBulkDD(v => !v); setBulkAction(null); setBulkValue(''); }}
     title="Actions"
     style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1.5px solid ${showBulkDD ? '#1a3a6b' : '#e5e7eb'}`, borderRadius: 7, fontSize: 12, background: showBulkDD ? '#f0f5ff' : '#fff', cursor: 'pointer', color: showBulkDD ? '#1a3a6b' : '#6b7280', fontWeight: 600 }}>
     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
     Actions
     {selectedProducts.size > 0 && <span style={{ background: '#1a3a6b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>{selectedProducts.size}</span>}
    </button>

    {showBulkDD && (
     <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 400, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.14)', width: 280, overflow: 'hidden' }}>

      {/* Add Product */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #f3f4f6' }}>
       <button onClick={() => { setShowAddForm(v => !v); setMsg(null); setShowBulkDD(false); }}
        style={{ width: '100%', padding: '8px', background: showAddForm ? '#fef2f2' : '#1a3a6b', color: showAddForm ? '#dc2626' : '#fff', border: showAddForm ? '1.5px solid #fca5a5' : 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        {showAddForm ? '✕ Cancel Add Product' : '+ Add Product'}
       </button>
      </div>

      {/* CSV section */}
      <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #f3f4f6' }}>
       <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>CSV</div>
       <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => {
         const sample = `group,make,coo,grade,purity,package,unit\nCITRIC ACID,JUNGBUNZLAUER,Germany,Food Grade,99.5%,25kg Bag,kg\nACETONE,SHELL,Netherlands,,,,litre\nSODIUM HYDROXIDE,BASF,Germany,Technical,,200kg Drum,kg`;
         const blob = new Blob([sample], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample-products.csv'; a.click(); URL.revokeObjectURL(a.href);
        }} style={{ flex: 1, padding: '7px 6px', background: '#faf5ff', color: '#7c3aed', border: '1.5px solid #ddd6fe', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
         ⬇ Sample
        </button>
        <button onClick={() => { importRef.current?.click(); setShowBulkDD(false); }}
         style={{ flex: 1, padding: '7px 6px', background: '#f0f9ff', color: '#0369a1', border: '1.5px solid #bae6fd', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
         ↑ Import
        </button>
        <button onClick={() => { exportProducts(); setShowBulkDD(false); }}
         style={{ flex: 1, padding: '7px 6px', background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
         ↓ Export
        </button>
       </div>
      </div>

      {/* Bulk actions section */}
      <div style={{ padding: '8px 14px 6px' }}>
       <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        Bulk Actions
        <span style={{ fontSize: 10, color: '#c0c9d8', fontWeight: 400, marginLeft: 6, textTransform: 'none' }}>
         {selectedProducts.size > 0 ? `(${selectedProducts.size} selected)` : `(all ${products.length})`}
        </span>
       </div>
      </div>

      {!bulkAction ? (
       <div style={{ paddingBottom: 6 }}>
        {[
         { key: 'grade',      label: '✏️ Change Grade',    color: '#1a3a6b' },
         { key: 'coo',        label: '✏️ Change COO',      color: '#1a3a6b' },
         { key: 'make',       label: '✏️ Change Make',     color: '#1a3a6b' },
         { key: 'purity',     label: '✏️ Change Purity',   color: '#1a3a6b' },
         { key: 'unit',       label: '✏️ Change Unit',     color: '#1a3a6b' },
         { key: 'clearPrice', label: '🗑 Clear Prices',    color: '#b45309' },
         { key: 'delete',     label: '🗑 Delete Products', color: '#dc2626' },
        ].map(({ key, label, color }) => (
         <button key={key}
          onClick={() => { if (key === 'delete' || key === 'clearPrice') { executeBulkAction(key, ''); setShowBulkDD(false); } else setBulkAction(key); }}
          style={{ width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 12, color, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          {label}
         </button>
        ))}
       </div>
      ) : (
       <div style={{ padding: '6px 14px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3a6b', marginBottom: 8, textTransform: 'uppercase' }}>
         Set {bulkAction} for {selectedProducts.size > 0 ? selectedProducts.size : products.length} products
        </div>
        {bulkAction === 'unit' ? (
         <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          style={{ width: '100%', padding: '6px 9px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, marginBottom: 8 }}>
          <option value="">Select unit…</option>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
         </select>
        ) : (
         <input autoFocus value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          placeholder={`New ${bulkAction} value…`}
          onKeyDown={e => { if (e.key === 'Enter') { executeBulkAction(bulkAction, bulkValue); setShowBulkDD(false); } }}
          style={{ width: '100%', padding: '6px 9px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
        )}
        <div style={{ display: 'flex', gap: 6 }}>
         <button onClick={() => { executeBulkAction(bulkAction, bulkValue); setShowBulkDD(false); }}
          style={{ flex: 1, padding: '6px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Apply</button>
         <button onClick={() => setBulkAction(null)}
          style={{ padding: '6px 10px', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Back</button>
        </div>
       </div>
      )}
     </div>
    )}
   </div>

  </div>
  </div>{/* /sticky-page-header */}

  {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

  {/* ── Import Review Modal ── */}
  {importModal && (
   <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 580, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
     {/* Modal header */}
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
       <div style={{ fontSize: 15, fontWeight: 700, color: '#1a3a6b' }}>Import Preview</div>
       <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
        <span style={{ color: '#16a34a', fontWeight: 600 }}>{importModal.unique.length} new</span>
        {importModal.duplicates.length > 0 && <> · <span style={{ color: '#dc2626', fontWeight: 600 }}>{importModal.duplicates.length} duplicate{importModal.duplicates.length > 1 ? 's' : ''} (will be skipped)</span></>}
       </div>
      </div>
      <button onClick={() => setImportModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✕</button>
     </div>

     {/* Scrollable list */}
     <div style={{ overflowY: 'auto', flex: 1 }}>
      {/* New / unique */}
      {importModal.unique.length > 0 && (
       <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
         ✓ Will be imported ({importModal.unique.length})
        </div>
        {importModal.unique.map((r, i) => (
         <div key={i} style={{ fontSize: 12, padding: '5px 10px', background: '#f0fdf4', borderRadius: 6, marginBottom: 3, color: '#15803d', border: '1px solid #bbf7d0' }}>
          <strong>{r.group}</strong>{r.make ? ` · ${r.make}` : ''}{r.coo ? ` (${r.coo})` : ''}{r.grade ? ` · ${r.grade}` : ''}{r.purity ? ` · ${r.purity}` : ''}
         </div>
        ))}
       </div>
      )}

      {/* Duplicates */}
      {importModal.duplicates.length > 0 && (
       <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
         ⚠ Already exist — will be skipped ({importModal.duplicates.length})
        </div>
        {importModal.duplicates.map((r, i) => (
         <div key={i} style={{ fontSize: 12, padding: '5px 10px', background: '#fef2f2', borderRadius: 6, marginBottom: 3, color: '#b91c1c', border: '1px solid #fecaca' }}>
          <strong>{r.group}</strong>{r.make ? ` · ${r.make}` : ''}{r.coo ? ` (${r.coo})` : ''}{r.grade ? ` · ${r.grade}` : ''}
         </div>
        ))}
       </div>
      )}

      {importModal.unique.length === 0 && importModal.duplicates.length === 0 && (
       <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>No valid rows found in CSV.</div>
      )}
     </div>

     {/* Footer buttons */}
     <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
      <button onClick={submitImport}
       disabled={importModal.loading || !importModal.unique.length}
       style={{ flex: 1, padding: '9px', background: importModal.unique.length ? '#16a34a' : '#e5e7eb', color: importModal.unique.length ? '#fff' : '#9ca3af', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: importModal.unique.length ? 'pointer' : 'default' }}>
       {importModal.loading ? 'Importing…' : `Import ${importModal.unique.length} New Product${importModal.unique.length !== 1 ? 's' : ''}`}
      </button>
      <button onClick={() => setImportModal(null)}
       style={{ padding: '9px 20px', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
       Cancel
      </button>
     </div>
    </div>
   </div>
  )}

  {/* Add Product Form — compact inline card */}
  {showAddForm && (
   <div style={{ marginBottom: 14, border: '1.5px solid #c7d7fa', borderRadius: 10, padding: '12px 16px', background: '#f8faff' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Product</div>
    <form onSubmit={submitAdd}>
     <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {/* Group */}
      <div style={{ display: 'flex', gap: 5 }}>
       {newGroupMode
        ? <input value={addForm.group} onChange={e => setAddForm(f => ({ ...f, group: e.target.value }))} placeholder="New group name" required
           style={{ padding: '6px 9px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 12, width: 150 }} />
        : <select value={addForm.group} onChange={e => setAddForm(f => ({ ...f, group: e.target.value }))} required
           style={{ padding: '6px 9px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 12, minWidth: 150 }}>
           <option value="">Group *</option>
           {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>}
       <button type="button" onClick={() => { setNewGroupMode(v => !v); setAddForm(f => ({ ...f, group: '' })); }}
        style={{ padding: '6px 9px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 11, background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', color: '#1a3a6b', fontWeight: 600 }}>
        {newGroupMode ? 'Existing' : '+ New'}
       </button>
      </div>
      {[['make','Make'],['coo','COO'],['grade','Grade'],['purity','Purity'],['itemPackage','Pkg']].map(([field, label]) => (
       <input key={field} value={addForm[field]} onChange={e => setAddForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={label} style={{ padding: '6px 9px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 12, width: 80 }} />
      ))}
      <select value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} required
       style={{ padding: '6px 9px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 12, width: 75 }}>
       {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      {/* Price (optional) */}
      <input value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
       placeholder="Price ₹" type="number" min="0" step="0.01"
       style={{ padding: '6px 9px', border: '1.5px solid #f59e0b', borderRadius: 7, fontSize: 12, width: 90, background: '#fffbeb' }} />
      {/* Notes (optional) */}
      <input value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
       placeholder="Note"
       style={{ padding: '6px 9px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 12, width: 110 }} />
      <button type="submit" style={{ padding: '6px 16px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
     </div>
    </form>
   </div>
  )}

  {/* Product + Price table grouped */}
  {loading ? <div className="spinner">Loading...</div> : (
  Object.entries(grouped).map(([group, items]) => {
  const isOpen = expandedGroups.has(group);
  const pricedInGroup = items.filter(p => priceMap[p._id]?.price !== '' && priceMap[p._id]?.price !== undefined).length;
  return (
  <div key={group} style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
   {/* Group header */}
   <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', background: isOpen ? '#f0f5ff' : '#fafafa', borderBottom: isOpen ? '1px solid #e5e7eb' : 'none', transition: 'background 0.15s' }}>
    {/* Group checkbox — selects all products in this group */}
    <input type="checkbox"
     checked={items.every(p => selectedProducts.has(p._id))}
     ref={el => { if (el) el.indeterminate = items.some(p => selectedProducts.has(p._id)) && !items.every(p => selectedProducts.has(p._id)); }}
     onChange={e => {
      setSelectedProducts(prev => {
       const n = new Set(prev);
       if (e.target.checked) items.forEach(p => n.add(p._id));
       else items.forEach(p => n.delete(p._id));
       return n;
      });
     }}
     onClick={e => e.stopPropagation()}
     style={{ accentColor: '#1a3a6b', cursor: 'pointer', width: 15, height: 15, flexShrink: 0 }} />
    <div onClick={() => toggleExpand(group)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a3a6b" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
     <polyline points="9 18 15 12 9 6"/>
    </svg>
    <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>{group}</span>
    <div style={{ flex: 1, display: 'flex', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
     {items.filter(p => priceMap[p._id]?.price).slice(0, 3).map(p => (
      <span key={p._id} style={{ fontSize: 11, background: '#e8f5e9', color: '#15803d', padding: '2px 7px', borderRadius: 6, fontWeight: 700 }}>
       {p.make || p.grade || '—'} ₹{Number(priceMap[p._id].price).toLocaleString()}
      </span>
     ))}
    </div>
    </div>{/* /clickable expand area */}
   </div>

 {isOpen && (
 <div className="table-wrap">
 <table>
 <thead>
 <tr>
 <th style={{ width: 32, padding: '8px 6px' }} />
 <th>Make</th><th>COO</th><th>Grade</th><th>Purity</th><th style={{ whiteSpace: 'nowrap' }}>Pkg</th><th>Unit</th>
 <th style={{ color: '#e8a020', whiteSpace: 'nowrap' }}>Price (₹) *</th><th>EX</th><th>Notes</th><th style={{ whiteSpace: 'nowrap' }}>Updated</th><th style={{ width: 120 }}>Actions</th>
 </tr>
 </thead>
 <tbody>
 {items.map(p => {
 const isEditing = editingId === p._id;
 const ev = editMap[p._id] || {};
 return (
 <tr key={p._id} style={{ background: isEditing ? '#fffbeb' : selectedProducts.has(p._id) ? '#f0f5ff' : undefined }}>
 {/* Row checkbox */}
 <td style={{ textAlign: 'center', padding: '0 6px' }}>
  <input type="checkbox"
   checked={selectedProducts.has(p._id)}
   onChange={() => setSelectedProducts(prev => { const n = new Set(prev); n.has(p._id) ? n.delete(p._id) : n.add(p._id); return n; })}
   style={{ accentColor: '#1a3a6b', cursor: 'pointer', width: 14, height: 14 }} />
 </td>
 {/* Editable product fields */}
 {isEditing ? (
 <>
 <td><input value={ev.make ?? p.make} onChange={e => handleEdit(p._id, 'make', e.target.value)}
 style={{ width: 90, padding: '4px 6px', border: '1.5px solid #2558a8', borderRadius: 6, fontSize: 12 }} /></td>
 <td><input value={ev.coo ?? p.coo} onChange={e => handleEdit(p._id, 'coo', e.target.value)}
 style={{ width: 70, padding: '4px 6px', border: '1.5px solid #2558a8', borderRadius: 6, fontSize: 12 }} /></td>
 <td><input value={ev.grade ?? p.grade} onChange={e => handleEdit(p._id, 'grade', e.target.value)}
 style={{ width: 60, padding: '4px 6px', border: '1.5px solid #2558a8', borderRadius: 6, fontSize: 12 }} /></td>
 <td><input value={ev.purity ?? p.purity} onChange={e => handleEdit(p._id, 'purity', e.target.value)}
 style={{ width: 70, padding: '4px 6px', border: '1.5px solid #2558a8', borderRadius: 6, fontSize: 12 }} /></td>
 <td><input value={ev.itemPackage ?? p.itemPackage} onChange={e => handleEdit(p._id, 'itemPackage', e.target.value)}
 style={{ width: 70, padding: '4px 6px', border: '1.5px solid #2558a8', borderRadius: 6, fontSize: 12 }} /></td>
 <td>
 <select value={ev.unit ?? p.unit} onChange={e => handleEdit(p._id, 'unit', e.target.value)}
 style={{ padding: '4px 6px', border: '1.5px solid #2558a8', borderRadius: 6, fontSize: 12 }}>
 {UNITS.map(u => <option key={u}>{u}</option>)}
 </select>
 </td>
 </>
 ) : (
 <>
 <td>{p.make || '—'}</td>
 <td>{p.coo || '—'}</td>
 <td>{p.grade || '—'}</td>
 <td>{p.purity || '—'}</td>
 <td style={{ fontSize: 11 }}>{p.itemPackage || '—'}</td>
 <td>
  <select value={p.unit} onChange={async e => {
   const newUnit = e.target.value;
   // Optimistic update — no reload, instant UI change
   setProducts(prev => prev.map(x => x._id === p._id ? { ...x, unit: newUnit } : x));
   try { await api.put(`/products/${p._id}`, { ...p, unit: newUnit }); }
   catch {
    // Revert on failure
    setProducts(prev => prev.map(x => x._id === p._id ? { ...x, unit: p.unit } : x));
    setMsg({ type: 'error', text: 'Unit update failed' });
   }
  }} style={{ padding: '3px 6px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: 12, background: '#fff', cursor: 'pointer' }}>
   {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
  </select>
 </td>
 </>
 )}
 {/* Price input — always editable */}
 <td>
 <input type="number" step="0.01" min="0" className="price-input"
 placeholder="—"
 value={priceMap[p._id]?.price ?? ''}
 title={priceMap[p._id]?.isLatest ? `Last price: ₹${priceMap[p._id]?.price} (${fmtDate(priceMap[p._id]?.updatedAt || priceMap[p._id]?.entryDate)})` : ''}
 style={{ borderColor: priceMap[p._id]?.isLatest ? '#fbbf24' : undefined, background: priceMap[p._id]?.isLatest ? '#fffbeb' : undefined }}
 onChange={e => handlePrice(p._id, 'price', e.target.value)} />
 </td>
 {/* EX location — always editable */}
 <td>
 <select value={priceMap[p._id]?.ex ?? ''}
  onChange={e => handlePrice(p._id, 'ex', e.target.value)}
  style={{ padding: '4px 6px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: 12, minWidth: 90, background: priceMap[p._id]?.ex ? '#f0f5ff' : '#fff', color: priceMap[p._id]?.ex ? '#1a3a6b' : '#9ca3af' }}>
  <option value="">EX…</option>
  {EX_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
 </select>
 </td>
 {/* Notes — always editable */}
 <td>
 <input type="text" className="notes-input" placeholder="Note"
 value={priceMap[p._id]?.notes ?? ''}
 onChange={e => handlePrice(p._id, 'notes', e.target.value)} />
 </td>
 {/* Last updated — show updatedAt if available, else entry date */}
 <td style={{ fontSize: 13, whiteSpace: 'nowrap', textAlign: 'center', fontWeight: 600, color: priceMap[p._id]?.isLatest ? '#b45309' : '#6b7280' }}>
  {priceMap[p._id]?.price !== '' && priceMap[p._id]?.price !== null && priceMap[p._id]?.price !== undefined
   ? <>{fmtDate(priceMap[p._id]?.updatedAt || priceMap[p._id]?.entryDate) || '—'}{priceMap[p._id]?.isLatest && <span style={{ fontSize: 10, marginLeft: 3, color: '#b45309' }}>↑prev</span>}</>
   : '—'}
 </td>
 {/* Actions */}
 <td>
            {isEditing ? (
             <div style={{ display: 'flex', gap: 3 }}>
              <button title="Save changes" className="btn btn-sm btn-accent" onClick={() => saveProductEdit(p._id)} style={{ padding: '5px 8px', display: 'flex', alignItems: 'center' }}><IconCheck /></button>
              <button title="Cancel edit" className="btn btn-sm btn-danger" onClick={() => { setEditingId(null); setEditMap(m => { const n = {...m}; delete n[p._id]; return n; }); }} style={{ padding: '5px 8px', display: 'flex', alignItems: 'center' }}><IconX /></button>
             </div>
            ) : (
             <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap' }}>
              <button title="Save price" className="btn btn-sm btn-accent" style={{ padding: '5px 8px', display: 'flex', alignItems: 'center' }} onClick={() => saveRowPrice(p._id)}><IconCheck /></button>
              <button title="Edit product details" className="btn btn-sm btn-primary" style={{ padding: '5px 8px', display: 'flex', alignItems: 'center' }} onClick={() => { setEditingId(p._id); setEditMap(m => ({ ...m, [p._id]: { make: p.make, coo: p.coo, grade: p.grade, purity: p.purity, itemPackage: p.itemPackage, unit: p.unit } })); }}><IconEdit /></button>
              <button title="Add variant" className="btn btn-sm" style={{ background: '#f0fff4', color: '#16a34a', border: '1.5px solid #86efac', padding: '5px 8px', display: 'flex', alignItems: 'center' }} onClick={() => { setAddingInGroup(addingInGroup === group ? null : group); setInlineForm({ make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', notes: '', ex: '' }); }}><IconPlus /></button>
              <button title="Delete product" className="btn btn-sm btn-danger" style={{ padding: '5px 8px', display: 'flex', alignItems: 'center' }} onClick={() => deleteProduct(p._id)}><IconTrash /></button>
             </div>
            )}
 </td>
 </tr>
 );
 })}
 {/* Inline add row */}
         {addingInGroup === group && (
          <tr style={{ background: '#f0fff4', borderTop: '2px solid #86efac' }}>
           {/* empty checkbox cell */}
           <td />
           <td>
            <input list={`dl-make-${group}`} placeholder="Make" value={inlineForm.make} onChange={e => setInlineForm(f => ({ ...f, make: e.target.value }))}
             style={{ width: 90, padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12 }} />
            <datalist id={`dl-make-${group}`}>{[...new Set(items.map(p=>p.make).filter(Boolean))].map(v=><option key={v} value={v}/>)}</datalist>
           </td>
           <td>
            <input list={`dl-coo-${group}`} placeholder="COO" value={inlineForm.coo} onChange={e => setInlineForm(f => ({ ...f, coo: e.target.value }))}
             style={{ width: 70, padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12 }} />
            <datalist id={`dl-coo-${group}`}>{[...new Set(items.map(p=>p.coo).filter(Boolean))].map(v=><option key={v} value={v}/>)}</datalist>
           </td>
           <td>
            <input list={`dl-grade-${group}`} placeholder="Grade" value={inlineForm.grade} onChange={e => setInlineForm(f => ({ ...f, grade: e.target.value }))}
             style={{ width: 60, padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12 }} />
            <datalist id={`dl-grade-${group}`}>{[...new Set(items.map(p=>p.grade).filter(Boolean))].map(v=><option key={v} value={v}/>)}</datalist>
           </td>
           <td>
            <input list={`dl-purity-${group}`} placeholder="Purity" value={inlineForm.purity} onChange={e => setInlineForm(f => ({ ...f, purity: e.target.value }))}
             style={{ width: 70, padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12 }} />
            <datalist id={`dl-purity-${group}`}>{[...new Set(items.map(p=>p.purity).filter(Boolean))].map(v=><option key={v} value={v}/>)}</datalist>
           </td>
           <td>
            <input list={`dl-pkg-${group}`} placeholder="Pkg" value={inlineForm.itemPackage} onChange={e => setInlineForm(f => ({ ...f, itemPackage: e.target.value }))}
             style={{ width: 60, padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12 }} />
            <datalist id={`dl-pkg-${group}`}>{[...new Set(items.map(p=>p.itemPackage).filter(Boolean))].map(v=><option key={v} value={v}/>)}</datalist>
           </td>
           <td>
            <select value={inlineForm.unit} onChange={e => setInlineForm(f => ({ ...f, unit: e.target.value }))}
             style={{ padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12 }}>
             {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
           </td>
           <td>
            <input type="number" min="0" step="0.01" placeholder="Price ₹" value={inlineForm.price} onChange={e => setInlineForm(f => ({ ...f, price: e.target.value }))}
             style={{ width: 80, padding: '4px 6px', border: '1.5px solid #f59e0b', borderRadius: 6, fontSize: 12, background: '#fffbeb' }} />
           </td>
           <td>
            <select value={inlineForm.ex || ''} onChange={e => setInlineForm(f => ({ ...f, ex: e.target.value }))}
             style={{ padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12, minWidth: 90 }}>
             <option value="">EX…</option>
             {EX_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
           </td>
           <td>
            <input placeholder="Note" value={inlineForm.notes} onChange={e => setInlineForm(f => ({ ...f, notes: e.target.value }))}
             style={{ width: 100, padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12 }} />
           </td>
           {/* empty Updated cell */}
           <td />
           <td>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
             <button title="Add product permanently — grade &amp; make saved forever, only price needs updating next time" className="btn btn-sm btn-accent" style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, whiteSpace: 'nowrap' }} onClick={() => submitInlineAdd(group)}><IconCheck /> Add</button>
             <button title="Cancel" className="btn btn-sm btn-danger" style={{ padding: '5px 8px' }} onClick={() => { setAddingInGroup(null); setInlineForm({ make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', notes: '', ex: '' }); }}><IconX /></button>
            </div>
           </td>
          </tr>
         )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
 })
 )}

 </div>
 );
}
