import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import '../Dashboard.css';

const EMPTY = { name: '', email: '', password: '', role: 'user' };

export default function AdminUsers() {
 const [users, setUsers] = useState([]);
 const [form, setForm] = useState(EMPTY);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [msg, setMsg] = useState(null);
 const [showForm, setShowForm] = useState(false);
 const [resetId, setResetId] = useState(null);
 const [newPwd, setNewPwd] = useState('');
 const [filterRole, setFilterRole] = useState('');
 const [roleSaving, setRoleSaving] = useState(null);
 const [selected, setSelected] = useState(new Set());   // ticked account ids
 const [ipEdit, setIpEdit] = useState(null);            // null | account id | 'bulk'
 const [ipList, setIpList] = useState([]);              // IPs being edited (as separate chips)
 const [ipDraft, setIpDraft] = useState('');            // the IP being typed
 const [ipMode, setIpMode] = useState('add');           // bulk: 'add' | 'replace'
 const [ipSaving, setIpSaving] = useState(false);
 const [myIp, setMyIp] = useState('');
 const { user: me } = useAuth();
 const isMe = u => !!me && (String(u._id) === String(me.id || me._id) || (u.email && u.email === me.email));

 const load = async () => {
 try {
 const { data } = await api.get('/auth/users');
 setUsers(data);
 } catch { setMsg({ type: 'error', text: 'Failed to load users' }); }
 finally { setLoading(false); }
 };

 useEffect(() => { load(); api.get('/auth/my-ip').then(r => setMyIp(r.data?.ip || '')).catch(() => {}); }, []);

 const toggleSel = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
 const openIpEdit = (key, list) => { setIpEdit(key); setIpList(list); setIpDraft(''); setIpMode('add'); setResetId(null); setMsg(null); };
 // Add what is typed (one IP, or several separated by space / comma) as separate chips
 const pushIps = text => {
 const parts = String(text || '').split(/[\s,;]+/).map(x => x.trim()).filter(Boolean);
 if (parts.length) setIpList(l => [...l, ...parts.filter(x => !l.includes(x))].filter((x, i, a) => a.indexOf(x) === i));
 setIpDraft('');
 };
 const pendingIps = () => [...ipList, ...ipDraft.split(/[\s,;]+/).map(x => x.trim()).filter(x => x && !ipList.includes(x))];

 // Save allowed login IPs for one account (replace) or for all ticked accounts (add / replace)
 const saveIps = async (ids, ips, mode) => {
 setIpSaving(true); setMsg(null);
 try {
 const { data } = await api.put('/auth/users/ips', { ids, ips, mode });
 setMsg({ type: 'success', text: data.message });
 setIpEdit(null); setIpList([]); setIpDraft('');
 load();
 } catch (err) {
 setMsg({ type: 'error', text: err.response?.data?.message || 'Could not save the IP addresses' });
 } finally { setIpSaving(false); }
 };

 const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

 const submit = async e => {
 e.preventDefault();
 setMsg(null);
 setSaving(true);
 try {
 const { data } = await api.post('/auth/create-user', form);
 setMsg({ type: 'success', text: `Account created for ${data.user.email}` });
 setForm(EMPTY);
 setShowForm(false);
 load();
 } catch (err) {
 setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create account' });
 } finally { setSaving(false); }
 };

 const deactivate = async (id, name) => {
 if (!window.confirm(`Deactivate account for ${name}?`)) return;
 try {
 await api.delete(`/auth/users/${id}`);
 setMsg({ type: 'success', text: 'Account deactivated' });
 load();
 } catch (err) {
 setMsg({ type: 'error', text: err.response?.data?.message || 'Failed' });
 }
 };

 const changeRole = async (u, role) => {
 if (role === u.role) return;
 const what = role === 'admin' ? 'an Admin (full access)' : 'a User (admin access removed)';
 if (!window.confirm(`Make ${u.name} ${what}?`)) return;
 setRoleSaving(u._id); setMsg(null);
 try {
 await api.put(`/auth/users/${u._id}/role`, { role });
 setMsg({ type: 'success', text: `${u.name} is now ${role === 'admin' ? 'an Admin' : 'a User'}. It applies the next time they log in.` });
 load();
 } catch (err) {
 setMsg({ type: 'error', text: err.response?.data?.message || 'Could not change the role' });
 } finally { setRoleSaving(null); }
 };

 const resetPassword = async (id) => {
 if (!newPwd || newPwd.length < 4) {
 setMsg({ type: 'error', text: 'Password must be at least 4 characters' });
 return;
 }
 try {
 await api.put(`/auth/users/${id}/reset-password`, { password: newPwd });
 setMsg({ type: 'success', text: 'Password reset successfully' });
 setResetId(null);
 setNewPwd('');
 } catch (err) {
 setMsg({ type: 'error', text: err.response?.data?.message || 'Reset failed' });
 }
 };

 const adminCount = users.filter(u => u.role === 'admin').length;
 const userCount = users.filter(u => u.role === 'user').length;

 const filtered = users.filter(u => !filterRole || u.role === filterRole);
 // Checkbox that carries the Sr No. inside it (filled blue when ticked)
 const numBox = (on, part) => ({ minWidth: 24, height: 24, padding: '0 4px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontSize: 12, fontWeight: 700,
  border: `1.5px solid ${on || part ? '#1a3a6b' : '#94a3b8'}`, background: on ? '#1a3a6b' : part ? '#dbe7ff' : '#fff', color: on ? '#fff' : '#334155', transition: 'all 0.12s' });
 const selIds = filtered.filter(u => selected.has(u._id)).map(u => u._id);
 const allOn = filtered.length > 0 && selIds.length === filtered.length;
 const someOn = selIds.length > 0 && !allOn;

 // Compact one-line IP editor: each IP is its own chip (× removes it), type the next one and press Enter or +
 const ipEditor = ({ title, bulk, onSave }) => (
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
 <span style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', whiteSpace: 'nowrap' }}>{title}</span>
 {bulk && (
 <select value={ipMode} onChange={e => setIpMode(e.target.value)} style={{ padding: '4px 6px', border: '1.5px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600 }}>
 <option value="add">Add these IPs</option>
 <option value="replace">Replace with these IPs</option>
 <option value="remove">Delete these IPs</option>
 </select>
 )}
 <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', flex: 1, minWidth: 260, padding: '3px 6px', background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 8 }}>
 {ipList.map(ip => (
 <span key={ip} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#0e7490', background: '#ecfeff', border: '1px solid #a5f3fc', padding: '1px 3px 1px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
 {ip}
 <span onClick={() => setIpList(l => l.filter(x => x !== ip))} title="Remove this IP" style={{ cursor: 'pointer', color: '#dc2626', fontSize: 14, lineHeight: 1, padding: '0 3px' }}>×</span>
 </span>
 ))}
 <input value={ipDraft} autoFocus onChange={e => { const v = e.target.value; if (/[\s,;]$/.test(v)) pushIps(v); else setIpDraft(v); }}
 onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); pushIps(ipDraft); } if (e.key === 'Backspace' && !ipDraft && ipList.length) setIpList(l => l.slice(0, -1)); }}
 onPaste={e => { const t = e.clipboardData.getData('text'); if (/[\s,;]/.test(t)) { e.preventDefault(); pushIps(t); } }}
 placeholder={ipList.length ? 'Next IP…' : 'Type an IP, press Enter (e.g. 203.0.113.7 or 203.0.113.*)'}
 style={{ flex: 1, minWidth: 150, border: 'none', outline: 'none', fontSize: 12, padding: '4px 2px', background: 'transparent' }} />
 <button type="button" onClick={() => pushIps(ipDraft)} title="Add this IP"
 style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: '#1d58a8', color: '#fff', fontWeight: 800, cursor: 'pointer', lineHeight: 1, opacity: ipDraft.trim() ? 1 : 0.45 }}>+</button>
 </div>
 {myIp && !ipList.includes(myIp) && (
 <button type="button" onClick={() => pushIps(myIp)} title={`Add the IP you are using now (${myIp})`}
 style={{ fontSize: 11, fontWeight: 700, color: '#1d58a8', background: '#fff', border: '1px solid #93c5fd', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ My IP</button>
 )}
 <button type="button" className="btn btn-sm btn-accent" disabled={ipSaving} onClick={onSave}>{ipSaving ? 'Saving…' : 'Save'}</button>
 <button type="button" className="btn btn-sm btn-danger" onClick={() => { setIpEdit(null); setIpList([]); setIpDraft(''); }}>Cancel</button>
 </div>
 );

 return (
 <div>
 {/* ── Sticky compact header row ── */}
 <div className="sticky-page-header">
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a3a6b', flexShrink: 0 }}>Create / Manage IDs</h2>
  <div style={{ flex: 1 }} />
  {/* Stats inline */}
  {myIp && <span title="The IP address you are using right now" style={{ fontSize: 11, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: 99 }}>Your IP: <strong>{myIp}</strong></span>}
  <span style={{ fontSize: 12, color: '#6b7280' }}>Total: <strong style={{ color: '#1a3a6b' }}>{users.length}</strong></span>
  <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>Admins: {adminCount}</span>
  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Users: {userCount}</span>
  {/* Role filter */}
  <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
   style={{ padding: '6px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, background: '#fff', flexShrink: 0 }}>
   <option value="">All Roles</option>
   <option value="admin">Admin</option>
   <option value="user">User</option>
  </select>
  {/* Bulk IP: add / replace / delete IPs on all ticked accounts in one go */}
  <button onClick={() => { if (!selIds.length) { setMsg({ type: 'error', text: 'Tick the accounts first (or use Select all), then click Bulk IP.' }); return; } openIpEdit('bulk', []); }}
   style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 7, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
    background: selIds.length ? '#0e7490' : '#fff', color: selIds.length ? '#fff' : '#0e7490', border: '1.5px solid #0e7490' }}>
   Bulk IP{selIds.length ? ` (${selIds.length})` : ''}
  </button>
  {/* Create button */}
  {!showForm && (
   <button className="btn btn-primary" onClick={() => { setShowForm(true); setMsg(null); }}
    style={{ padding: '6px 14px', fontSize: 12, flexShrink: 0 }}>+ New Account</button>
  )}
 </div>
 </div>{/* /sticky-page-header */}

 {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

 {/* Create form */}
 {showForm ? (
 <div className="card" style={{ marginBottom: 20 }}>
 <h3 style={{ marginBottom: 20, color: '#1a3a6b', fontSize: 16 }}>Create New Account</h3>
 <form onSubmit={submit}>
 <div className="form-grid">
 <div className="form-field">
 <label>Full Name *</label>
 <input name="name" value={form.name} onChange={handle}
 placeholder="e.g. Rahul Sharma" required />
 </div>
 <div className="form-field">
 <label>Email Address (Login ID) *</label>
 <input name="email" type="email" value={form.email} onChange={handle}
 placeholder="e.g. rahul@lokchem.com" required />
 </div>
 <div className="form-field">
 <label>Password *</label>
 <input name="password" type="password" value={form.password} onChange={handle}
 placeholder="Set a password" required minLength={4} />
 </div>
 <div className="form-field">
 <label>Account Role *</label>
 <select name="role" value={form.role} onChange={handle}>
 <option value="user">User</option>
 <option value="admin">Admin — Full access</option>
 </select>
 </div>
 </div>

 <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
 <button type="submit" className="btn btn-primary" disabled={saving}>
 {saving ? 'Creating...' : '+ Create Account'}
 </button>
 <button type="button" className="btn btn-danger"
 onClick={() => { setShowForm(false); setForm(EMPTY); setMsg(null); }}>
 Cancel
 </button>
 </div>
 </form>
 </div>
 ) : null}

 {/* User table */}
 <div className="card">
 {loading ? (
 <div className="spinner">Loading accounts...</div>
 ) : filtered.length === 0 ? (
 <div className="empty-state">
 <div className="empty-icon"></div>
 <p>No accounts match the selected filters.</p>
 </div>
 ) : (
 <div className="table-wrap">
 {/* Bulk IP editor (one compact line) */}
 {ipEdit === 'bulk' && selIds.length > 0 && (
 <div style={{ padding: '4px 10px', marginBottom: 8, background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 9 }}>
 {ipEditor({
 title: `${selIds.length} account${selIds.length > 1 ? 's' : ''}:`,
 bulk: true,
 onSave: () => {
 const ips = pendingIps();
 if (!ips.length && ipMode !== 'replace') { setMsg({ type: 'error', text: 'Type at least one IP address.' }); return; }
 if (!ips.length && !window.confirm(`Remove ALL IP addresses from ${selIds.length} account(s)? They will be able to log in from any network.`)) return;
 saveIps(selIds, ips, ipMode);
 },
 })}
 </div>
 )}
 <table>
 <thead>
 <tr>
 <th style={{ whiteSpace: 'nowrap' }}>
 <label title="Select all" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
 <input type="checkbox" checked={allOn} onChange={e => setSelected(e.target.checked ? new Set(filtered.map(u => u._id)) : new Set())}
 style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
 <span style={numBox(allOn, someOn)}>{allOn ? '✓' : someOn ? '–' : ''}</span>
 All
 </label>
 </th>
 <th>Name</th>
 <th>Email (Login ID)</th>
 <th>Role</th>
 <th>IP Addresses</th>
 <th>Created</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((u, i) => (
 <>
 <tr key={u._id} style={{ background: selected.has(u._id) ? '#f0f5ff' : undefined }}>
 <td style={{ whiteSpace: 'nowrap' }}>
 <label title={selected.has(u._id) ? 'Unselect' : 'Select'} style={{ display: 'inline-flex', cursor: 'pointer' }}>
 <input type="checkbox" checked={selected.has(u._id)} onChange={() => toggleSel(u._id)}
 style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
 <span style={numBox(selected.has(u._id))}>{i + 1}</span>
 </label>
 </td>
 <td><div className="product-name">{u.name}</div></td>
 <td style={{ color: '#2d3748' }}>{u.email}</td>
 <td>
 {isMe(u) ? (
 <span className="badge" title="You cannot change your own role" style={{ background: '#fef3c7', color: '#92400e' }}>
 {u.role === 'admin' ? 'Admin' : 'User'} (you)
 </span>
 ) : (
 <select value={u.role} disabled={roleSaving === u._id} onChange={e => changeRole(u, e.target.value)}
 title="Change this account's role"
 style={{ padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
 border: `1.5px solid ${u.role === 'admin' ? '#fcd34d' : '#93c5fd'}`,
 background: u.role === 'admin' ? '#fef3c7' : '#dbeafe',
 color: u.role === 'admin' ? '#92400e' : '#1e40af' }}>
 <option value="admin">Admin</option>
 <option value="user">User</option>
 </select>
 )}
 </td>
 <td>
 <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', maxWidth: 320 }}>
 {(u.allowedIps || []).length === 0
 ? <span style={{ fontSize: 11, color: '#9ca3af' }}>Any IP</span>
 : u.allowedIps.map(ip => (
 <span key={ip} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600, color: '#0e7490', background: '#ecfeff', border: '1px solid #a5f3fc', padding: '1px 3px 1px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
 {ip}
 <span title="Delete this IP" onClick={() => { if (window.confirm(`Delete IP ${ip} from ${u.name}?`)) saveIps([u._id], [ip], 'remove'); }}
 style={{ cursor: 'pointer', color: '#dc2626', fontSize: 14, lineHeight: 1, padding: '0 3px' }}>×</span>
 </span>
 ))}
 <button onClick={() => (ipEdit === u._id ? setIpEdit(null) : openIpEdit(u._id, [...(u.allowedIps || [])]))}
 title="Add or change the IP addresses this account can log in from"
 style={{ fontSize: 11, fontWeight: 700, color: '#1d58a8', background: '#fff', border: '1px dashed #93c5fd', borderRadius: 99, padding: '1px 9px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
 {(u.allowedIps || []).length ? '+ Add / Edit' : '+ Add IP'}
 </button>
 </div>
 </td>
 <td style={{ fontSize: 13, color: '#718096' }}>
 {new Date(u.createdAt).toLocaleDateString('en-IN')}
 </td>
 <td>
 <div style={{ display: 'flex', gap: 6 }}>
 <button className="btn btn-sm btn-primary"
 onClick={() => { setResetId(resetId === u._id ? null : u._id); setNewPwd(''); setIpEdit(null); }}>
 Reset Pwd
 </button>
 <button className="btn btn-sm btn-danger"
 onClick={() => deactivate(u._id, u.name)}>
 Remove
 </button>
 </div>
 </td>
 </tr>
 {ipEdit === u._id && (
 <tr key={u._id + '_ips'} style={{ background: '#f0f9ff' }}>
 <td colSpan={7} style={{ padding: '4px 12px' }}>{ipEditor({
 title: `${u.name}:`,
 onSave: () => saveIps([u._id], pendingIps(), 'replace'),
 })}</td>
 </tr>
 )}
 {resetId === u._id && (
 <tr key={u._id + '_reset'} style={{ background: '#fffbeb' }}>
 <td colSpan={7}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
 <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>New password for {u.name}:</span>
 <input type="password" placeholder="Enter new password"
 value={newPwd} onChange={e => setNewPwd(e.target.value)}
 style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 14, width: 220 }} />
 <button className="btn btn-sm btn-accent" onClick={() => resetPassword(u._id)}>Confirm Reset</button>
 <button className="btn btn-sm btn-danger" onClick={() => { setResetId(null); setNewPwd(''); }}>Cancel</button>
 </div>
 </td>
 </tr>
 )}
 </>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 );
}
