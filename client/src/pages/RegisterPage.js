import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', role: 'user', adminKey: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form.username, form.password, form.role, form.adminKey);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">₹</div>
          <h1>PricingHub</h1>
          <p>Create your account</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handle} placeholder="Choose a username" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="Create a password" required />
          </div>
          <div className="form-group">
            <label>Account Type</label>
            <select name="role" value={form.role} onChange={handle}>
              <option value="user">User (View Prices)</option>
              <option value="admin">Admin (Manage Prices)</option>
            </select>
          </div>
          {form.role === 'admin' && (
            <div className="form-group">
              <label>Admin Secret Key</label>
              <input name="adminKey" type="password" value={form.adminKey} onChange={handle} placeholder="Enter admin secret key" />
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Sign In</Link></p>
      </div>
    </div>
  );
}
