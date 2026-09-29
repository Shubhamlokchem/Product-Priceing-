import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function LoginPage() {
 const { login } = useAuth();
 const navigate = useNavigate();
 const [form, setForm] = useState({ email: '', password: '' });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const [showPwd, setShowPwd] = useState(false);

 const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

 const submit = async e => {
 e.preventDefault();
 setError('');
 setLoading(true);
 try {
 const user = await login(form.email, form.password);
 navigate(user.role === 'admin' ? '/admin' : '/dashboard');
 } catch (err) {
 setError(err.response?.data?.message || 'Login failed. Check your email and password.');
 } finally { setLoading(false); }
 };

 return (
 <div className="auth-bg">
 <div className="auth-card">
 <div className="auth-logo">
 <div className="logo-icon">₹</div>
 <h1>PricingHub</h1>
 <p>Product Pricing Dashboard</p>
 </div>
 <form onSubmit={submit}>
 <div className="form-group">
 <label>Email Address</label>
 <input
 name="email"
 type="email"
 value={form.email}
 onChange={handle}
 placeholder="Enter your email"
 required
 autoComplete="email"
 />
 </div>
 <div className="form-group">
 <label>Password</label>
 <div style={{ position: 'relative' }}>
 <input
 name="password"
 type={showPwd ? 'text' : 'password'}
 value={form.password}
 onChange={handle}
 placeholder="Enter your password"
 required
 style={{ width: '100%', paddingRight: 42, boxSizing: 'border-box' }}
 />
 <button type="button" onClick={() => setShowPwd(v => !v)}
  title={showPwd ? 'Hide password' : 'Show password'} aria-label={showPwd ? 'Hide password' : 'Show password'}
  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
  {showPwd ? (
   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
   </svg>
  ) : (
   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
   </svg>
  )}
 </button>
 </div>
 </div>
 {error && <div className="auth-error">{error}</div>}
 <button className="auth-btn" disabled={loading}>
 {loading ? 'Signing in...' : 'Sign In'}
 </button>
 </form>
 <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9ca3af' }}>
 Contact your admin to create an account.
 </p>
 </div>
 </div>
 );
}
