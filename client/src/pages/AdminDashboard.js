import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AdminPricing from './admin/AdminPricing';
import AdminProducts from './admin/AdminProducts';
import AdminHistory from './admin/AdminHistory';
import AdminUsers from './admin/AdminUsers';
import AdminQueries from './admin/AdminQueries';
import PriceCompare from './PriceCompare';
import './Dashboard.css';

const links = [
 { to: '/admin', label: 'Dashboard', icon: '' },
 { to: '/admin/products', label: 'Manage Products', icon: '' },
 { to: '/admin/history', label: 'Price History', icon: '' },
 { to: '/admin/compare', label: 'Compare Prices', icon: '' },
 { to: '/admin/queries', label: 'Queries', icon: '' },
 { to: '/admin/users', label: 'Create / Manage IDs', icon: '' },
];

export default function AdminDashboard() {
 return (
 <div className="dashboard-layout">
 <Sidebar links={links} />
 <main className="dashboard-main">
 <Routes>
 <Route index element={<AdminPricing />} />
 <Route path="products" element={<AdminProducts />} />
 <Route path="history" element={<AdminHistory />} />
 <Route path="compare" element={<PriceCompare adminMode />} />
 <Route path="queries" element={<AdminQueries />} />
 <Route path="users" element={<AdminUsers />} />
 <Route path="*" element={<Navigate to="/admin" replace />} />
 </Routes>
 </main>
 </div>
 );
}
