import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({ links }) {
 const { user, logout } = useAuth();

 return (
 <aside className="sidebar">
 <div className="sidebar-header">
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
