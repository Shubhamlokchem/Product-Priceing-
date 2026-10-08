import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AdminPricing from './admin/AdminPricing';
import AdminProducts from './admin/AdminProducts';
import AdminQueries from './admin/AdminQueries';
import './Dashboard.css';

// User panel: only Dashboard, Manage Products and Queries — with the same rights as admin on these pages
// (edit, delete, import, export, ribbon, reply to queries). No Price History, Compare Prices or Create / Manage IDs.
const links = [
 { to: '/dashboard', label: 'Dashboard', icon: '' },
 { to: '/dashboard/products', label: 'Manage Products', icon: '' },
 { to: '/dashboard/queries', label: 'Queries', icon: '' },
];

export default function UserDashboard() {
 return (
 <div className="dashboard-layout">
 <Sidebar links={links} />
 <main className="dashboard-main">
 <Routes>
 <Route index element={<AdminPricing />} />
 <Route path="products" element={<AdminProducts />} />
 <Route path="queries" element={<AdminQueries />} />
 <Route path="*" element={<Navigate to="/dashboard" replace />} />
 </Routes>
 </main>
 </div>
 );
}
