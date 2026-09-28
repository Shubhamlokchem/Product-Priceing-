import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import PriceCompare from './pages/PriceCompare';
import UserQuery from './pages/UserQuery';

// Standard auth guard
const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const { user } = useAuth();
  const home = user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={home} /> : <LoginPage />} />
        <Route path="/admin/*" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
        <Route path="/dashboard/compare" element={<PrivateRoute><PriceCompare /></PrivateRoute>} />
        <Route path="/dashboard/queries" element={<PrivateRoute><UserQuery /></PrivateRoute>} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
