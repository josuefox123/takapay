import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/public/Home.jsx';
import Splash from './pages/public/Splash.jsx';
import AppHome from './pages/public/AppHome.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/splash" element={<Splash />} />
        <Route path="/app" element={<AppHome initialTab="home" />} />
        <Route path="/app/produits" element={<AppHome initialTab="shop" />} />
        <Route path="/app/categories" element={<AppHome initialTab="shop" />} />
        <Route path="/app/cagnotte" element={<AppHome initialTab="cag" />} />
        <Route path="/app/profil" element={<AppHome initialTab="pro" />} />
        <Route path="/app/notifications" element={<AppHome initialTab="notif" />} />
        <Route path="/catalogue" element={<Navigate to="/app/produits" replace />} />
        <Route path="/connexion" element={<AppHome initialTab="order" />} />

        {/* Routes Administration Takapay */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/connexion" element={<AdminLogin />} />
        <Route path="/admin/login" element={<Navigate to="/admin/connexion" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/:tab" element={<AdminDashboard />} />

        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}