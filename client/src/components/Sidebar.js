import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

// Simple line icons, chosen by menu label (works for admin + user menus)
const P = {
 dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
 products: <><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>,
 history: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
 compare: <><line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="13"/><line x1="22" y1="20" x2="2" y2="20"/></>,
 queries: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></>,
 users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
 logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
};
const iconFor = label => {
 const l = label.toLowerCase();
 if (l.includes('product')) return P.products;
 if (l.includes('history')) return P.history;
 if (l.includes('compare')) return P.compare;
 if (l.includes('quer')) return P.queries;
 if (l.includes('id') || l.includes('user')) return P.users;
 return P.dashboard; // Dashboard / Daily Prices
};
const Icon = ({ children }) => (
 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

export default function Sidebar({ links }) {
 const { user, logout } = useAuth();

 return (
 <aside className="sidebar">
 <div className="sidebar-header">
  <div className="sidebar-brand">
   <div className="sidebar-brand-logo"><img src="/logo.png" alt="Lok Chemicals" /></div>
   <div>
    <div className="sidebar-brand-name">Lok Chemicals</div>
    <div className="sidebar-brand-sub">Pricing CRM</div>
   </div>
  </div>
 </div>

 <div className="sidebar-watermark" aria-hidden="true">
  <img src="/logo.png" alt="" />
  <span>LOK CHEMICALS</span>
 </div>

 <nav className="sidebar-nav">
  <div className="nav-section-label">Menu</div>
  {links.map(({ to, label }) => (
   <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
    <span className="nav-icon"><Icon>{iconFor(label)}</Icon></span>
    {label}
   </NavLink>
  ))}
 </nav>

  <div className="sidebar-user-only sidebar-user-bottom">
   <div className="user-name-full" title={user?.name || user?.email}>{user?.name || user?.email}</div>
   <div className="user-role-badge">{user?.role}</div>
   <button className="signout-icon-btn" onClick={logout} title="Sign out" aria-label="Sign out">
    <Icon>{P.logout}</Icon>
   </button>
  </div>
 </aside>
 );
}
