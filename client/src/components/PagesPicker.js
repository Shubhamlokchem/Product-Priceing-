import { useState, useRef, useEffect } from 'react';
import { USER_PAGES } from '../utils/pages';

// Compact dropdown with a checkbox per page. value = list of page keys.
export default function PagesPicker({ value, onChange, disabled, size = 'sm' }) {
 const [open, setOpen] = useState(false);
 const ref = useRef(null);
 useEffect(() => {
  if (!open) return;
  const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
  document.addEventListener('mousedown', h);
  return () => document.removeEventListener('mousedown', h);
 }, [open]);

 const all = USER_PAGES.length;
 const n = value.length;
 const toggle = k => onChange(value.includes(k) ? value.filter(x => x !== k) : USER_PAGES.map(p => p.key).filter(x => x === k || value.includes(x)));
 const big = size === 'md';

 return (
  <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
   <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
    title={USER_PAGES.filter(p => value.includes(p.key)).map(p => p.label).join(', ') || 'No pages'}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', cursor: 'pointer',
     padding: big ? '9px 12px' : '3px 8px', fontSize: big ? 14 : 11, fontWeight: 700, borderRadius: big ? 8 : 99,
     border: `1.5px solid ${n ? '#c4b5fd' : '#fca5a5'}`, background: n ? '#f5f3ff' : '#fef2f2', color: n ? '#6d28d9' : '#b91c1c',
     width: big ? '100%' : undefined, justifyContent: big ? 'space-between' : undefined }}>
    <span>{n === all ? 'All pages' : n === 0 ? 'No pages' : `${n}/${all} pages`}</span>
    <span style={{ fontSize: 9 }}>▼</span>
   </button>
   {open && (
    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50, minWidth: 190, background: '#fff',
     border: '1px solid #e2e8f0', borderRadius: 9, boxShadow: '0 8px 24px rgba(15,23,42,0.15)', padding: 6 }}>
     <label style={row}>
      <input type="checkbox" checked={n === all} ref={el => { if (el) el.indeterminate = n > 0 && n < all; }}
       onChange={e => onChange(e.target.checked ? USER_PAGES.map(p => p.key) : [])} style={box} />
      <b>All pages</b>
     </label>
     <div style={{ height: 1, background: '#f1f5f9', margin: '3px 0' }} />
     {USER_PAGES.map(p => (
      <label key={p.key} style={row}>
       <input type="checkbox" checked={value.includes(p.key)} onChange={() => toggle(p.key)} style={box} />
       {p.label}
      </label>
     ))}
    </div>
   )}
  </div>
 );
}
const row = { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', fontSize: 12.5, color: '#1e293b', cursor: 'pointer', borderRadius: 6, whiteSpace: 'nowrap' };
const box = { accentColor: '#6d28d9', width: 14, height: 14, cursor: 'pointer' };
