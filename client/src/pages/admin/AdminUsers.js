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
 const { user: me } = useAuth();
 const isMe = u => !!me && (String(u._id) === String(me.id || me._id) || (u.email && u.email === me.email));

 const load = async () => {
 try {
 const { data } = await api.get('/auth/users');
 setUsers(data);
 } catch { setMsg({ type: 'error', text: 'Failed to load users' }); }
 finally { setLoading(false); }
 };

 useEffect(() => { load(); }, []);

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

 return (
 <div>
 {/* ── Sticky compact header row ── */}
 <div className="sticky-page-header">
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a3a6b', flexShrink: 0 }}>Create / Manage IDs</h2>
  <div style={{ flex: 1 }} />
  {/* Stats inline */}
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
 <table>
 <thead>
 <tr>
 <th>#</th>
 <th>Name</th>
 <th>Email (Login ID)</th>
 <th>Role</th>
 <th>Created</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((u, i) => (
 <>
 <tr key={u._id}>
 <td style={{ color: '#9ca3af' }}>{i + 1}</td>
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
 <td style={{ fontSize: 13, color: '#718096' }}>
 {new Date(u.createdAt).toLocaleDateString('en-IN')}
 </td>
 <td>
 <div style={{ display: 'flex', gap: 6 }}>
 <button className="btn btn-sm btn-primary"
 onClick={() => { setResetId(resetId === u._id ? null : u._id); setNewPwd(''); }}>
 Reset Pwd
 </button>
 <button className="btn btn-sm btn-danger"
 onClick={() => deactivate(u._id, u.name)}>
 Remove
 </button>
 </div>
 </td>
 </tr>
 {resetId === u._id && (
 <tr key={u._id + '_reset'} style={{ background: '#fffbeb' }}>
 <td colSpan={6}>
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
