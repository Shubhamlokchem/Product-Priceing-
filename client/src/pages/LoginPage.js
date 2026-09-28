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
 <input
 name="password"
 type="password"
 value={form.password}
 onChange={handle}
 placeholder="Enter your password"
 required
 />
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
