import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({ links }) {
 const { user, logout } = useAuth();

 return (
 <aside className="sidebar">
 <div className="sidebar-header">
 <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 4px 12px' }}>
  <img src="/logo.png" alt="Lok Chemicals" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
  <div style={{ lineHeight: 1.15 }}>
   <div style={{ fontSize: 14, fontWeight: 800, color: '#0b4a9a', letterSpacing: 0.2 }}>Lok Chemicals</div>
   <div style={{ fontSize: 10, color: '#8a99b3', fontWeight: 600 }}>Pricing CRM</div>
  </div>
 </div>
 <div className="sidebar-user-only">
 <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}</div>
 <div>
 <div className="user-name">{user?.name || user?.email}</div>
 <div className="user-role-badge">{user?.role}</div>
 </div>
 </div>
 </div>

 <nav className="sidebar-nav">
 {links.map(({ to, label, icon }) => (
 <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
 <span className="nav-icon">{icon}</span>
 {label}
 </NavLink>
 ))}
 </nav>

 <button className="logout-btn" onClick={logout}>
 <span></span> Sign Out
 </button>
 </aside>
 );
}
