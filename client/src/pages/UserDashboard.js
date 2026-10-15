import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AdminPricing from './admin/AdminPricing';
import AdminProducts from './admin/AdminProducts';
import AdminHistory from './admin/AdminHistory';
import AdminQueries from './admin/AdminQueries';
import PriceCompare from './PriceCompare';
import { useAuth } from '../context/AuthContext';
import { pagesOf } from '../utils/pages';
import api from '../api/axios';
import './Dashboard.css';

// User panel: shows only the pages the admin ticked for this account on Create / Manage IDs.
// Create / Manage IDs itself is never available to users.
const ALL = [
 { key: 'dashboard', to: '/dashboard', path: null, label: 'Dashboard', el: <AdminPricing /> },
 { key: 'products', to: '/dashboard/products', path: 'products', label: 'Manage Products', el: <AdminProducts /> },
 { key: 'history', to: '/dashboard/history', path: 'history', label: 'Price History', el: <AdminHistory /> },
 { key: 'compare', to: '/dashboard/compare', path: 'compare', label: 'Compare Prices', el: <PriceCompare /> },
 { key: 'queries', to: '/dashboard/queries', path: 'queries', label: 'Queries', el: <AdminQueries /> },
];

export default function UserDashboard() {
 const { user, commitUser } = useAuth();

 // Refresh page access from the server, so changes by the admin apply without logging out
 useEffect(() => {
  api.get('/auth/me').then(({ data }) => {
   const cur = JSON.parse(localStorage.getItem('user') || 'null');
   if (JSON.stringify(cur?.pages ?? null) !== JSON.stringify(data.user.pages ?? null) || cur?.role !== data.user.role) {
    localStorage.setItem('user', JSON.stringify(data.user));
    commitUser(data.user);
   }
  }).catch(() => {});
 }, []);

 const allowed = pagesOf(user);
 const pages = ALL.filter(p => allowed.includes(p.key));
 const links = pages.map(({ to, label }) => ({ to, label, icon: '' }));
 const home = pages[0];

 return (
 <div className="dashboard-layout">
 <Sidebar links={links} />
 <main className="dashboard-main">
 {!home ? (
  <div className="card" style={{ marginTop: 40, textAlign: 'center', color: '#64748b' }}>
   No pages have been given to your account yet. Please contact the admin.
  </div>
 ) : (
 <Routes>
 {pages.map(p => p.path === null
  ? <Route key={p.key} index element={p.el} />
  : <Route key={p.key} path={p.path} element={p.el} />)}
 {!allowed.includes('dashboard') && <Route index element={<Navigate to={home.to} replace />} />}
 <Route path="*" element={<Navigate to={home.to} replace />} />
 </Routes>
 )}
 </main>
 </div>
 );
}
