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
  <svg viewBox="0 0 216 300" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
   {/* benzene ring */}
   <g transform="translate(22 18)"><polygon points="30,0 56,15 56,45 30,60 4,45 4,15" /><circle cx="30" cy="30" r="14" /></g>
   {/* erlenmeyer flask with liquid + bubbles */}
   <g transform="translate(118 8)">
    <path d="M24 0h26M29 0v30L6 78a6 6 0 0 0 5 9h52a6 6 0 0 0 5-9L45 30V0" />
    <path d="M14 62h46" /><circle cx="30" cy="72" r="3" /><circle cx="42" cy="68" r="2" /><circle cx="36" cy="52" r="2" />
   </g>
   {/* ball-and-stick molecule */}
   <g transform="translate(14 128)">
    <line x1="18" y1="22" x2="52" y2="40" /><line x1="52" y1="40" x2="74" y2="12" /><line x1="52" y1="40" x2="46" y2="76" />
    <circle cx="18" cy="22" r="10" /><circle cx="52" cy="40" r="12" /><circle cx="74" cy="12" r="7" /><circle cx="46" cy="76" r="8" />
   </g>
   {/* test tube */}
   <g transform="translate(150 118) rotate(18)"><path d="M0 0h20M3 0v70a7 7 0 0 0 14 0V0" /><path d="M3 44h14" /></g>
   {/* formulas */}
   <g stroke="none" fill="#fff" fontFamily="Segoe UI, sans-serif" fontWeight="800">
    <text x="104" y="232" fontSize="20">C₆H₆</text>
    <text x="16" y="262" fontSize="15">H₂SO₄</text>
    <text x="120" y="284" fontSize="15">NaOH</text>
   </g>
  </svg>
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
