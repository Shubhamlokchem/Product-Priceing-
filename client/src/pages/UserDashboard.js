import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AdminPricing from './admin/AdminPricing';
import AdminHistory from './admin/AdminHistory';
import PriceCompare from './PriceCompare';
import UserQuery from './UserQuery';
import './Dashboard.css';

// User panel: the same pages and look as the admin panel, but view only.
// No Manage Products, no Create / Manage IDs. Users can send queries.
const links = [
 { to: '/dashboard', label: 'Dashboard', icon: '' },
 { to: '/dashboard/history', label: 'Price History', icon: '' },
 { to: '/dashboard/compare', label: 'Compare Prices', icon: '' },
 { to: '/dashboard/queries', label: 'Queries', icon: '' },
];

export default function UserDashboard() {
 return (
 <div className="dashboard-layout">
 <Sidebar links={links} />
 <main className="dashboard-main">
 <Routes>
 <Route index element={<AdminPricing />} />
 <Route path="history" element={<AdminHistory />} />
 <Route path="compare" element={<PriceCompare adminMode />} />
 <Route path="queries" element={<UserQuery />} />
 <Route path="*" element={<Navigate to="/dashboard" replace />} />
 </Routes>
 </main>
 </div>
 );
}
