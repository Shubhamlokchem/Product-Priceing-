import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { defaultTarget, storedTargetText, parseTarget } from '../../utils/target';
import '../Dashboard.css';

const EMPTY = { group: '', make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', cost: '', price: '', target: '', notes: '', ex: '' };

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
 const today = new Date().toLocaleDateString('en-CA'); // local date (IST), YYYY-MM-DD

 const [date, setDate] = useState(today);
 const isPastDate = date !== today;
 const [showAllOnDate, setShowAllOnDate] = useState(false);
 useEffect(() => { setShowAllOnDate(false); }, [date]);
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
 const [, setNewGroupMode] = useState(false);
 const [expandedGroups, setExpandedGroups] = useState(new Set());
 const [addingInGroup, setAddingInGroup] = useState(null); // group name being added to
 const [inlineForm, setInlineForm] = useState({ make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', notes: '', ex: '' });
 const [showBulkDD, setShowBulkDD] = useState(false);
 const [, setBulkAction] = useState(null); // null | 'delete'|'grade'|'coo'|'make'|'purity'|'unit'|'clearPrice'
 const [, setBulkValue] = useState('');
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
  latestMap[e.product._id] = { price: e.price ?? '', cost: e.cost ?? '', target: storedTargetText(e.target, e.targetMax), notes: e.notes || '', ex: e.ex || '', updatedAt: e.updatedAt || null, entryDate: e.date || null };
 });

 const pm = {}, om = {};
 priceRes.data.forEach(e => {
 pm[e.product._id] = { price: e.price ?? '', cost: e.cost ?? '', target: storedTargetText(e.target, e.targetMax), notes: e.notes || '', ex: e.ex || '', updatedAt: e.updatedAt || null, entryDate: e.date || null };
 om[e.product._id] = e.price;
 });

 // Only for TODAY: products with no price yet show their latest known price as a reference.
 // For past dates we show exactly what was saved on that date — nothing carried over.
 if (date === new Date().toLocaleDateString('en-CA')) prodRes.data.forEach(p => {
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
 if ((inlineForm.price && !isNaN(Number(inlineForm.price))) || inlineForm.cost || inlineForm.target) {
  await api.post('/prices', {
   productId: newProduct._id,
   price: inlineForm.price !== '' ? Number(inlineForm.price) : null,
   cost: inlineForm.cost || null,
   ...parseTarget(inlineForm.target, inlineForm.price),
   notes: inlineForm.notes || '',
   ex: inlineForm.ex || '',
   date
  });
 }
 setAddingInGroup(null);
 setInlineForm({ make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', cost: '', target: '', notes: '', ex: '' });
 loadData(true);
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Add failed' }); }
 };

 // Priority star (shown on the TV live ribbon) — updates instantly, saved on the server
 const toggleStar = async (p) => {
  const val = !p.starred;
  setProducts(ps => ps.map(x => (x._id === p._id ? { ...x, starred: val } : x)));
  try { await api.put(`/products/${p._id}`, { starred: val }); }
  catch { setProducts(ps => ps.map(x => (x._id === p._id ? { ...x, starred: !val } : x))); setMsg({ type: 'error', text: 'Could not update priority' }); }
 };

 // Delete product
 const deleteProduct = async (id) => {
 if (!window.confirm('Remove this product?')) return;
 try { await api.delete(`/products/${id}`); loadData(true); }
 catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Delete failed' }); }
 };

 // Add new product
 const submitAdd = async e => {
 e.preventDefault(); setMsg(null);
 try {
 const { data: newProduct } = await api.post('/products', addForm);
 // If a price was entered, save it for the selected date
 if ((addForm.price && !isNaN(Number(addForm.price))) || addForm.cost || addForm.target) {
  await api.post('/prices', {
   productId: newProduct._id,
   price: addForm.price !== '' ? Number(addForm.price) : null,
   cost: addForm.cost || null,
   ...parseTarget(addForm.target, addForm.price),
   notes: addForm.notes || '',
   date
  });
 }
 setMsg({ type: 'success', text: 'Product added' + (addForm.price || addForm.cost || addForm.target ? ' with prices' : '') });
 setAddForm(EMPTY); setShowAddForm(false); setNewGroupMode(false);
 loadData(true);
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Add failed' }); }
 };

 // Save all prices for selected date
 const savePrices = async () => {
 setSaving(true); setMsg(null);
 try {
 const toSave = products.filter(p => {
 const pm = priceMap[p._id] || {};
 const filled = v => v !== '' && v !== undefined && v !== null;
 const had = origMap[p._id] != null;
 return !pm.isLatest && (filled(pm.price) || filled(pm.cost) || filled(pm.target) || had);
 });
 if (!toSave.length) { setSaving(false); return; }

 const prices = toSave.map(p => {
 const raw = priceMap[p._id]?.price;
 return {
 productId: p._id,
 price: (raw !== '' && raw !== undefined) ? parseFloat(raw) : null,
 cost: priceMap[p._id]?.cost ?? null,
 ...parseTarget(priceMap[p._id]?.target, raw),
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
  await api.post('/prices', { productId, price: (raw !== '' && raw !== undefined) ? parseFloat(raw) : null, cost: priceMap[productId]?.cost ?? null, ...parseTarget(priceMap[productId]?.target, raw), notes: priceMap[productId]?.notes || '', ex: priceMap[productId]?.ex || '', date });
  setMsg({ type: 'success', text: 'Price saved!' });
  loadData(true);
 } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Save failed' }); }
 };

 // Bulk actions on selected products
 const executeBulkAction = async (action, value) => {
  const targets = bulkTargets.map(p => p._id);
  if (!targets.length) { setMsg({ type: 'error', text: 'No products selected.' }); return; }
  if (action === 'delete') {
   if (!window.confirm(`Delete ${targets.length} product(s)? This cannot be undone.`)) return;
   try {
    const { data } = await api.post('/products/bulk-delete', { ids: targets });
    setSelectedProducts(new Set()); setBulkAction(null);
    setMsg({ type: 'success', text: `${data.count} products deleted.` }); loadData(true);
   } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Bulk delete failed.' }); loadData(true); }
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
   const { data } = await api.post('/products/bulk-update', { ids: targets, field, value: value.trim() });
   setBulkAction(null); setBulkValue('');
   setMsg({ type: 'success', text: `${field} updated for ${data.count} products.` }); loadData(true);
  } catch (err) { setMsg({ type: 'error', text: err.response?.data?.message || 'Bulk update failed.' }); }
 };

 // Export all products + their prices for the selected date (re-upload this file to update prices)
 const exportProducts = () => {
  const headers = ['id','group','make','origin','grade','purity','package','unit','cost','market','target','ex','notes'];
  const rows = products.map(p => {
   const e = priceMap[p._id] || {};
   return [p._id, p.group, p.make||'', p.coo||'', p.grade||'', p.purity||'', p.itemPackage||'', p.unit||'kg',
    e.cost ?? '', e.price ?? '', e.target || defaultTarget(e.price), e.ex || '', e.notes || ''];
  });
  downloadCSV(headers, rows, `products-${date}.csv`);
 };

 const downloadSampleCSV = () => {
  const sample = `group,make,origin,grade,purity,package,unit,cost,market,target\nCITRIC ACID,JUNGBUNZLAUER,Germany,Food Grade,99.5%,25kg Bag,kg,95,110,130 - 160\nACETONE,SHELL,Netherlands,,,,litre,,82,\nSODIUM HYDROXIDE,BASF,Germany,Technical,,200kg Drum,kg,,,`;
  const blob = new Blob([sample], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sample-products.csv'; a.click(); URL.revokeObjectURL(a.href);
 };

 // Split one CSV line, respecting "quoted, values"
 const splitCSVLine = line => {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
   const c = line[i];
   if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
   else if (c === ',' && !q) { out.push(cur); cur = ''; }
   else cur += c;
  }
  out.push(cur);
  return out.map(v => v.trim());
 };

 // "1,22,500" / "₹ 555" → 122500 / 555 ; blank → null
 const toNum = v => {
  const t = String(v ?? '').replace(/[₹,\s]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
 };
 const sameNum = (a, b) => (a === '' || a == null ? null : Number(a)) === (b == null ? null : Number(b));

 // Parse CSV → new products / price-unit updates for existing products / unchanged rows
 const handleImportFile = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
   const lines = ev.target.result.trim().split(/\r?\n/);
   const hdrs = splitCSVLine(lines[0].replace(/^﻿/, '')).map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
   const rows = lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
     const vals = splitCSVLine(line);
     const o = Object.fromEntries(hdrs.map((h,i) => [h, vals[i]||'']));
     if (o.coo === undefined && o.origin !== undefined) o.coo = o.origin; // 'origin' column = COO (old files with 'coo' still work)
     return o;
    })
    .filter(r => r.group);

   // A product is identified by its id (from Export) or by group + make + COO + grade + purity + package (unit can change)
   const keyOf = x => [x.group, x.make, x.coo, x.grade, x.purity, x.itemPackage ?? x.package ?? x.itempackage].map(norm).join('|');
   const byId = Object.fromEntries(products.map(p => [p._id, p]));
   const byKey = {}; products.forEach(p => { byKey[keyOf(p)] = p; });

   const unique = [], updates = [], duplicates = [];
   const seenNew = new Set(), seenIds = new Set();
   rows.forEach(row => {
    const prod = (row.id && byId[row.id]) || byKey[keyOf(row)];
    const nums = { cost: toNum(row.cost), price: toNum(row.market ?? row.price), target: null };
    // target can be a range ("12 - 15") or one number; blank = no change; same as the default = automatic
    if (String(row.target ?? '').trim()) {
     const mkt = nums.price ?? (prod ? priceMap[prod._id]?.price : null);
     const t = parseTarget(row.target, mkt);
     nums.target = storedTargetText(t.target, t.targetMax);
    }
    if (!prod) {
     const k = keyOf(row);
     if (seenNew.has(k)) { duplicates.push(row); return; }
     seenNew.add(k); unique.push({ ...row, ...nums });
     return;
    }
    if (seenIds.has(prod._id)) { duplicates.push(row); return; }
    seenIds.add(prod._id);
    const cur = priceMap[prod._id] || {};
    const changes = [];
    const newUnit = (row.unit || '').trim();
    if (newUnit && norm(newUnit) !== norm(prod.unit)) changes.push({ f: 'Unit', from: prod.unit, to: newUnit });
    [['cost','Cost'],['price','Market']].forEach(([k, label]) => {
     if (nums[k] !== null && !sameNum(cur[k], nums[k])) changes.push({ f: label, from: cur[k] === '' || cur[k] == null ? '—' : cur[k], to: nums[k] });
    });
    if (nums.target !== null && nums.target !== (cur.target || '')) changes.push({ f: 'Target', from: cur.target || 'Auto', to: nums.target || 'Auto' });
    if (row.ex && row.ex !== (cur.ex || '')) changes.push({ f: 'EX', from: cur.ex || '—', to: row.ex });
    if (row.notes && row.notes !== (cur.notes || '')) changes.push({ f: 'Notes', from: cur.notes || '—', to: row.notes });
    if (changes.length) updates.push({ row, prod, nums, newUnit, changes });
    else duplicates.push(row);
   });
   setImportModal({ unique, updates, duplicates, loading: false });
  };
  reader.readAsText(file);
  e.target.value = '';
 };

 // Create new products and apply price / unit updates (prices are saved for the selected date)
 const submitImport = async () => {
  const news = importModal?.unique || [], ups = importModal?.updates || [];
  const total = news.length + ups.length;
  if (!total) return;
  setImportModal(m => ({ ...m, loading: true, done: 0, total }));
  let ok = 0, failed = 0;
  const tick = () => setImportModal(m => (m ? { ...m, done: ok + failed } : m));
  const bulk = [];

  for (const row of news) {
   try {
    const { data: np } = await api.post('/products', {
     group: row.group, make: row.make||'', coo: row.coo||'',
     grade: row.grade||'', purity: row.purity||'',
     itemPackage: row.package||row.itempackage||'', unit: row.unit||'kg',
    });
    if (row.price !== null || row.cost !== null || row.target !== null)
     bulk.push({ productId: np._id, price: row.price, cost: row.cost, ...parseTarget(row.target, row.price), ex: row.ex || '', notes: row.notes || '' });
    ok++;
   } catch { failed++; }
   tick();
  }

  for (const u of ups) {
   try {
    if (u.newUnit && norm(u.newUnit) !== norm(u.prod.unit)) await api.put(`/products/${u.prod._id}`, { unit: u.newUnit });
    const cur = priceMap[u.prod._id] || {};
    const keep = v => (v === '' || v === undefined ? null : v);
    const priceTouched = u.changes.some(c => ['Cost', 'Market', 'Target', 'EX', 'Notes'].includes(c.f));
    if (priceTouched) bulk.push({
     productId: u.prod._id,
     price:  u.nums.price  ?? keep(cur.price),
     cost:   u.nums.cost   ?? keep(cur.cost),
     ...parseTarget(u.nums.target ?? cur.target, u.nums.price ?? cur.price),
     ex: u.row.ex || cur.ex || '', notes: u.row.notes || cur.notes || '',
    });
    ok++;
   } catch { failed++; }
   tick();
  }

  if (bulk.length) {
   try { await api.post('/prices/bulk', { date, prices: bulk }); }
   catch { setMsg({ type: 'error', text: 'Products saved, but saving prices failed — please try again.' }); setImportModal(null); loadData(true); return; }
  }
  setMsg(failed
   ? { type: 'error', text: `${ok} of ${total} rows done (${news.length} new, ${ups.length} updates). ${failed} failed — please check and try again.` }
   : { type: 'success', text: `Import done for ${date}: ${news.length} new product${news.length !== 1 ? 's' : ''} added, ${ups.length} updated.` });
  setImportModal(null);
  loadData(true);
 };

 const toggleExpand = g => setExpandedGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
 const toggleFilterGroup = g => setFilterGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });

 const filledV = v => v !== '' && v !== undefined && v !== null;
 const pricedOnDate = p => { const e = priceMap[p._id]; return !!e && !e.isLatest && (filledV(e.price) || filledV(e.cost) || filledV(e.target)); };
 const filtered = products.filter(p => {
 if (isPastDate && !showAllOnDate && !pricedOnDate(p)) return false;
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
 // Bulk actions apply to ticked products; if none ticked, to the products currently shown (respects filters/search)
 const bulkTargets = selectedProducts.size > 0 ? products.filter(p => selectedProducts.has(p._id)) : filtered;
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
     onChange={e => setSelectedProducts(e.target.checked ? new Set(filtered.map(p => p._id)) : new Set())}
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
   <input type="date" value={date} onChange={e => setDate(e.target.value || today)} max={today}
    style={{ padding: '6px 8px', border: `1.5px solid ${isPastDate ? '#f59e0b' : '#e5e7eb'}`, borderRadius: 7, fontSize: 12, flexShrink: 0, background: isPastDate ? '#fffbeb' : '#fff' }} />
   {isPastDate && (
    <>
     <button onClick={() => setShowAllOnDate(v => !v)}
      title={showAllOnDate ? 'Show only products priced on this date' : 'Show all products to add/edit prices for this date'}
      style={{ padding: '6px 10px', border: '1.5px solid #fde68a', borderRadius: 7, fontSize: 11.5, background: showAllOnDate ? '#fef3c7' : '#fff', color: '#92400e', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
      {showAllOnDate ? 'Only priced' : 'Show all products'}
     </button>
     <button onClick={() => setDate(today)}
      style={{ padding: '6px 10px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 11.5, background: '#fff', color: '#1a3a6b', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
      Today
     </button>
    </>
   )}

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
     {selectedProducts.size > 0 && <span style={{ background: '#1a3a6b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>{bulkTargets.length}</span>}
    </button>

    {showBulkDD && (() => {
     const I = ({ d }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
     const tile = (bg, fg, bd) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: bg, color: fg, border: `1px solid ${bd}`, borderRadius: 9, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s, box-shadow .12s' });
     const hover = { onMouseEnter: e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.08)'; }, onMouseLeave: e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } };
     return (
      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 400, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 14px 36px rgba(15,40,80,0.16)', width: 236, padding: 8 }}>
       {/* Add product */}
       <button onClick={() => { setShowAddForm(v => !v); setMsg(null); setShowBulkDD(false); }}
        style={{ width: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: showAddForm ? '1px solid #fca5a5' : 'none', borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
         background: showAddForm ? '#fef2f2' : 'linear-gradient(135deg,#1d58a8,#1a6db5 55%,#0e9f7a)', color: showAddForm ? '#dc2626' : '#fff', boxShadow: showAddForm ? 'none' : '0 3px 10px rgba(14,138,108,0.25)' }}>
        {showAddForm ? '✕ Cancel' : <><I d={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} /> Add Product</>}
       </button>

       {/* CSV tiles */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}>
        <button onClick={downloadSampleCSV} title="Download a sample CSV" style={tile('#faf5ff', '#7c3aed', '#e9d5ff')} {...hover}>
         <I d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>} />Sample
        </button>
        <button onClick={() => { importRef.current?.click(); setShowBulkDD(false); }} title="Import products / update prices from CSV" style={tile('#eff6ff', '#1d4ed8', '#bfdbfe')} {...hover}>
         <I d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>} />Import
        </button>
        <button onClick={() => { exportProducts(); setShowBulkDD(false); }} title="Export products with prices" style={tile('#ecfdf5', '#047857', '#a7f3d0')} {...hover}>
         <I d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>} />Export
        </button>
       </div>

       {/* Bulk actions */}
       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 2px 5px', fontSize: 9.5, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase' }}>
        <span>Bulk actions</span>
        <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 7px', borderRadius: 99, textTransform: 'none', letterSpacing: 0 }}>
         {selectedProducts.size > 0 ? `${bulkTargets.length} selected` : `all ${bulkTargets.length} shown`}
        </span>
       </div>
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={() => { executeBulkAction('clearPrice', ''); setShowBulkDD(false); }} {...hover}
         style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 4px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 9, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
         <I d={<><path d="M20 20H7L3 16l10-10 7 7-3.5 3.5" /><path d="M6 11l7 7" /></>} />Clear Prices
        </button>
        <button onClick={() => { executeBulkAction('delete', ''); setShowBulkDD(false); }} {...hover}
         style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 4px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 9, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
         <I d={<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>} />Delete
        </button>
       </div>
      </div>
     );
    })()}
   </div>

   {/* Expand / Collapse all */}
   {(() => {
    const keys = Object.keys(grouped);
    const allOpen = keys.length > 0 && keys.every(g => expandedGroups.has(g));
    return (
     <button onClick={() => setExpandedGroups(allOpen ? new Set() : new Set(keys))}
      title={allOpen ? 'Collapse all products' : 'Expand all products'}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1.5px solid ${allOpen ? '#1a3a6b' : '#e5e7eb'}`, borderRadius: 7, fontSize: 12, background: allOpen ? '#f0f5ff' : '#fff', cursor: 'pointer', color: allOpen ? '#1a3a6b' : '#6b7280', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
       {allOpen
        ? <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>
        : <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>}
      </svg>
      {allOpen ? 'Collapse' : 'Expand'}
     </button>
    );
   })()}

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
        {' · '}<span style={{ color: '#1d4ed8', fontWeight: 600 }}>{importModal.updates.length} to update</span>
        {importModal.duplicates.length > 0 && <> · <span style={{ color: '#6b7280', fontWeight: 600 }}>{importModal.duplicates.length} unchanged (skipped)</span></>}
        <span style={{ marginLeft: 6, color: '#b45309' }}>· prices saved for {date}</span>
       </div>
      </div>
      <button onClick={() => setImportModal(null)} disabled={importModal.loading} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✕</button>
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

      {/* Updates to existing products */}
      {importModal.updates.length > 0 && (
       <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
         ✎ Will be updated ({importModal.updates.length})
        </div>
        {importModal.updates.map((u, i) => (
         <div key={i} style={{ fontSize: 12, padding: '5px 10px', background: '#eff6ff', borderRadius: 6, marginBottom: 3, color: '#1e3a8a', border: '1px solid #bfdbfe' }}>
          <strong>{u.prod.group}</strong>{u.prod.make ? ` · ${u.prod.make}` : ''}{u.prod.coo ? ` (${u.prod.coo})` : ''}
          <span style={{ marginLeft: 6 }}>
           {u.changes.map((c, j) => (
            <span key={j} style={{ marginRight: 8, whiteSpace: 'nowrap' }}><b>{c.f}:</b> <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{String(c.from)}</span> → <b style={{ color: '#15803d' }}>{String(c.to)}</b></span>
           ))}
          </span>
         </div>
        ))}
       </div>
      )}

      {/* Unchanged */}
      {importModal.duplicates.length > 0 && (
       <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
        {importModal.duplicates.length} row{importModal.duplicates.length > 1 ? 's are' : ' is'} already up to date — skipped.
       </div>
      )}

      {importModal.unique.length === 0 && importModal.updates.length === 0 && importModal.duplicates.length === 0 && (
       <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>No valid rows found in CSV.</div>
      )}
     </div>

     {/* Import progress */}
     {importModal.loading && importModal.total > 0 && (() => {
      const pct = Math.round((importModal.done / importModal.total) * 100);
      return (
       <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#1a3a6b', marginBottom: 5 }}>
         <span>Importing… {importModal.done} / {importModal.total}</span>
         <span>{pct}%</span>
        </div>
        <div style={{ height: 10, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
         <div style={{ height: '100%', width: `${pct}%`, background: '#16a34a', borderRadius: 99, transition: 'width 0.2s' }} />
        </div>
       </div>
      );
     })()}

     {/* Footer buttons */}
     <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
      {(() => {
       const n = importModal.unique.length + importModal.updates.length;
       const label = [importModal.unique.length ? `Add ${importModal.unique.length} new` : '', importModal.updates.length ? `Update ${importModal.updates.length}` : ''].filter(Boolean).join(' + ');
       return (
        <button onClick={submitImport} disabled={importModal.loading || !n}
         style={{ flex: 1, padding: '9px', background: n ? '#16a34a' : '#e5e7eb', color: n ? '#fff' : '#9ca3af', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: n ? 'pointer' : 'default' }}>
         {importModal.loading ? `Importing… ${importModal.total ? Math.round((importModal.done / importModal.total) * 100) : 0}%` : (n ? label : 'Nothing to import')}
        </button>
       );
      })()}
      <button onClick={() => setImportModal(null)} disabled={importModal.loading}
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
     <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Product</div>
     <span style={{ fontSize: 11, color: '#9ca3af' }}>Type a new product below, or add many at once with Bulk Import</span>
     <div style={{ flex: 1 }} />
     <button type="button" onClick={downloadSampleCSV}
      style={{ padding: '5px 10px', background: '#faf5ff', color: '#7c3aed', border: '1.5px solid #ddd6fe', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
      ⬇ Sample CSV
     </button>
     <button type="button" onClick={() => importRef.current?.click()}
      style={{ padding: '5px 12px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
      ↑ Bulk Import CSV
     </button>
    </div>
    <form onSubmit={submitAdd}>
     <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {/* Product name — always typed (new product) */}
      <input value={addForm.group} onChange={e => setAddForm(f => ({ ...f, group: e.target.value }))} placeholder="Product name *" required
       style={{ padding: '6px 9px', border: '1.5px solid #1a6db5', borderRadius: 7, fontSize: 12, width: 190, fontWeight: 600 }} />
      {[['make','Make'],['coo','Origin'],['grade','Grade'],['purity','Purity'],['itemPackage','Pkg']].map(([field, label]) => (
       <input key={field} value={addForm[field]} onChange={e => setAddForm(f => ({ ...f, [field]: e.target.value }))}
        placeholder={label} style={{ padding: '6px 9px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 12, width: 80 }} />
      ))}
      <select value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} required
       style={{ padding: '6px 9px', border: '1.5px solid #c7d7fa', borderRadius: 7, fontSize: 12, width: 75 }}>
       {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      {/* Prices (optional): 1. Cost  2. Market  3. Target */}
      <input value={addForm.cost} onChange={e => setAddForm(f => ({ ...f, cost: e.target.value }))}
       placeholder="Cost ₹" type="number" min="0" step="0.01"
       style={{ padding: '6px 9px', border: '1.5px solid #cbd5e1', borderRadius: 7, fontSize: 12, width: 85 }} />
      <input value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
       placeholder="Market ₹" type="number" min="0" step="0.01"
       style={{ padding: '6px 9px', border: '1.5px solid #f59e0b', borderRadius: 7, fontSize: 12, width: 90, background: '#fffbeb' }} />
      <input value={addForm.target} onChange={e => setAddForm(f => ({ ...f, target: e.target.value }))}
       placeholder={defaultTarget(addForm.price) ? `Target ${defaultTarget(addForm.price)}` : 'Target ₹'} type="text" className="target-input" title="Target range. Leave empty for automatic: market +2.5% to +5%"
       style={{ padding: '6px 9px', border: '1.5px solid #c4b5fd', borderRadius: 7, fontSize: 12, width: 110 }} />
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
  {loading && products.length === 0 ? <div className="spinner">Loading...</div> : isPastDate && !showAllOnDate && Object.keys(grouped).length === 0 ? (
   <div style={{ background: '#fff', border: '1px dashed #fcd34d', borderRadius: 10, padding: '28px 16px', textAlign: 'center', color: '#92400e', fontSize: 13 }}>
    No prices were saved on <b>{date}</b>. Click <b>Show all products</b> to add prices for this date, or <b>Today</b> to go back.
   </div>
  ) : (
  Object.entries(grouped).map(([group, items]) => {
  const isOpen = expandedGroups.has(group);
  const pv = p => { const v = priceMap[p._id]?.price; return v !== '' && v !== undefined && v !== null; };
  const nToday = items.filter(p => pv(p) && !priceMap[p._id]?.isLatest).length;
  const nAny = items.filter(pv).length;
  const accent = nToday > 0 ? '#16a34a' : nAny > 0 ? '#e8a020' : '#cbd5e1';
  return (
  <div key={group} style={{ marginBottom: 5, border: `1px solid ${isOpen ? '#c7d7fa' : '#e8ecf3'}`, borderLeft: `4px solid ${accent}`, borderRadius: 9, overflow: 'hidden', background: '#fff', boxShadow: isOpen ? '0 3px 12px rgba(26,58,107,0.08)' : 'none' }}>
   {/* Group header */}
   <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer', background: isOpen ? '#f3f7ff' : '#fff', borderBottom: isOpen ? '1px solid #e5e7eb' : 'none', transition: 'background 0.15s' }}
    onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#f8faff'; }}
    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = '#fff'; }}>
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
    <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '1px 7px', borderRadius: 999 }}>{items.length}</span>
    <div style={{ flex: 1 }} />
    </div>{/* /clickable expand area */}
   </div>

 {isOpen && (
 <div className="table-wrap">
 <table className="mp-table">
 <thead>
 <tr>
 <th style={{ width: 32, padding: '8px 6px' }} />
 <th>Make</th><th>Origin</th><th>EX</th><th>Grade</th><th>Purity</th><th style={{ whiteSpace: 'nowrap' }}>Pkg</th><th>Unit</th>
 <th style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Cost (₹)</th><th style={{ color: '#e8a020', whiteSpace: 'nowrap' }}>Market (₹) *</th><th style={{ color: '#7c3aed', whiteSpace: 'nowrap' }}>Target (₹)</th><th>Notes</th><th style={{ whiteSpace: 'nowrap' }}>Last Update</th><th style={{ width: 120 }}>Actions</th>
 </tr>
 </thead>
 <tbody>
 {items.map(p => {
 const isEditing = editingId === p._id;
 // EX location — always editable (sits right after Origin)
 const exCell = (
 <td>
 <select value={priceMap[p._id]?.ex ?? ''}
  onChange={e => handlePrice(p._id, 'ex', e.target.value)}
  style={{ padding: '4px 6px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: 12, minWidth: 90, background: priceMap[p._id]?.ex ? '#f0f5ff' : '#fff', color: priceMap[p._id]?.ex ? '#1a3a6b' : '#9ca3af' }}>
  <option value="">EX…</option>
  {EX_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
 </select>
 </td>
 );
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
 {exCell}
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
 {exCell}
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
 {/* Cost input */}
 <td>
 <input type="number" step="0.01" min="0" className="price-input" placeholder="—"
  value={priceMap[p._id]?.cost ?? ''} title="Our cost price"
  style={{ borderColor: '#cbd5e1', background: priceMap[p._id]?.isLatest && priceMap[p._id]?.cost !== '' ? '#fffbeb' : undefined }}
  onChange={e => handlePrice(p._id, 'cost', e.target.value)} />
 </td>
 {/* Market price input — always editable */}
 <td>
 <input type="number" step="0.01" min="0" className="price-input"
 placeholder="—"
 value={priceMap[p._id]?.price ?? ''}
 title={priceMap[p._id]?.isLatest ? `Last price: ₹${priceMap[p._id]?.price} (${fmtDate(priceMap[p._id]?.updatedAt || priceMap[p._id]?.entryDate)})` : ''}
 style={{ borderColor: priceMap[p._id]?.isLatest ? '#fbbf24' : undefined, background: priceMap[p._id]?.isLatest ? '#fffbeb' : undefined }}
 onChange={e => handlePrice(p._id, 'price', e.target.value)} />
 </td>
 {/* Target input */}
 <td>
 <input type="text" inputMode="decimal" className="price-input target-input"
  placeholder={defaultTarget(priceMap[p._id]?.price) || '—'}
  value={priceMap[p._id]?.target ?? ''}
  title={priceMap[p._id]?.target ? 'Target range (edited). Clear the box to go back to the automatic range.' : 'Automatic target range: market +2.5% to +5%. Type to change, e.g. 12 - 15'}
  style={{ minWidth: 124, borderColor: '#c4b5fd', background: priceMap[p._id]?.isLatest && priceMap[p._id]?.target !== '' ? '#fffbeb' : undefined }}
  onFocus={e => { if (!priceMap[p._id]?.target && defaultTarget(priceMap[p._id]?.price)) { handlePrice(p._id, 'target', defaultTarget(priceMap[p._id]?.price)); setTimeout(() => e.target.select(), 0); } }}
  onChange={e => handlePrice(p._id, 'target', e.target.value)} />
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
              <button title={p.starred ? 'Priority — shown on the TV live ribbon (click to remove)' : 'Mark as priority (show on TV live ribbon)'}
               onClick={() => toggleStar(p)}
               style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', background: p.starred ? '#fef3c7' : '#fff', border: `1.5px solid ${p.starred ? '#f59e0b' : '#e5e7eb'}`, borderRadius: 6, cursor: 'pointer' }}>
               <svg width="15" height="15" viewBox="0 0 24 24" fill={p.starred ? '#f59e0b' : 'none'} stroke={p.starred ? '#f59e0b' : '#9ca3af'} strokeWidth="2" strokeLinejoin="round"><polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.3 5.8 21 7.2 14 2 9.3 8.9 8.6 12 2" /></svg>
              </button>
              <button title="Save price" className="btn btn-sm btn-accent" style={{ padding: '5px 8px', display: 'flex', alignItems: 'center' }} onClick={() => saveRowPrice(p._id)}><IconCheck /></button>
              <button title="Edit product details" className="btn btn-sm btn-primary" style={{ padding: '5px 8px', display: 'flex', alignItems: 'center' }} onClick={() => { setEditingId(p._id); setEditMap(m => ({ ...m, [p._id]: { make: p.make, coo: p.coo, grade: p.grade, purity: p.purity, itemPackage: p.itemPackage, unit: p.unit } })); }}><IconEdit /></button>
              <button title="Add variant" className="btn btn-sm" style={{ background: '#f0fff4', color: '#16a34a', border: '1.5px solid #86efac', padding: '5px 8px', display: 'flex', alignItems: 'center' }} onClick={() => { setAddingInGroup(addingInGroup === group ? null : group); setInlineForm({ make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', cost: '', target: '', notes: '', ex: '' }); }}><IconPlus /></button>
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
            <input list={`dl-coo-${group}`} placeholder="Origin" value={inlineForm.coo} onChange={e => setInlineForm(f => ({ ...f, coo: e.target.value }))}
             style={{ width: 70, padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12 }} />
            <datalist id={`dl-coo-${group}`}>{[...new Set(items.map(p=>p.coo).filter(Boolean))].map(v=><option key={v} value={v}/>)}</datalist>
           </td>
           <td>
            <select value={inlineForm.ex || ''} onChange={e => setInlineForm(f => ({ ...f, ex: e.target.value }))}
             style={{ padding: '4px 6px', border: '1.5px solid #16a34a', borderRadius: 6, fontSize: 12, minWidth: 90 }}>
             <option value="">EX…</option>
             {EX_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
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
            <input type="number" min="0" step="0.01" placeholder="Cost ₹" value={inlineForm.cost || ''} onChange={e => setInlineForm(f => ({ ...f, cost: e.target.value }))}
             style={{ width: 75, padding: '4px 6px', border: '1.5px solid #cbd5e1', borderRadius: 6, fontSize: 12 }} />
           </td>
           <td>
            <input type="number" min="0" step="0.01" placeholder="Market ₹" value={inlineForm.price} onChange={e => setInlineForm(f => ({ ...f, price: e.target.value }))}
             style={{ width: 80, padding: '4px 6px', border: '1.5px solid #f59e0b', borderRadius: 6, fontSize: 12, background: '#fffbeb' }} />
           </td>
           <td>
            <input type="text" className="target-input" placeholder={defaultTarget(inlineForm.price) || 'Target ₹'} title="Target range. Leave empty for automatic: market +2.5% to +5%" value={inlineForm.target || ''} onChange={e => setInlineForm(f => ({ ...f, target: e.target.value }))}
             style={{ width: 92, padding: '4px 6px', border: '1.5px solid #c4b5fd', borderRadius: 6, fontSize: 12 }} />
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
             <button title="Cancel" className="btn btn-sm btn-danger" style={{ padding: '5px 8px' }} onClick={() => { setAddingInGroup(null); setInlineForm({ make: '', coo: '', grade: '', purity: '', itemPackage: '', unit: 'kg', price: '', cost: '', target: '', notes: '', ex: '' }); }}><IconX /></button>
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
