import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const Home = lazy(() => import('./pages/public/Home.jsx'));
const Splash = lazy(() => import('./pages/public/Splash.jsx'));
const AppHome = lazy(() => import('./pages/public/AppHome.jsx'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div role="status" style={{ padding: 24, textAlign: 'center' }}>Chargement…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/app" element={<AppHome initialTab="home" />} />
          <Route path="/app/produits" element={<AppHome initialTab="shop" />} />
          <Route path="/app/categories" element={<AppHome initialTab="shop" />} />
          <Route path="/app/cagnotte" element={<AppHome initialTab="cag" />} />
          <Route path="/app/profil" element={<AppHome initialTab="pro" />} />
          <Route path="/app/notifications" element={<AppHome initialTab="notif" />} />
          <Route path="/app/favoris" element={<AppHome initialTab="subcat" />} />
          <Route path="/app/*" element={<AppHome initialTab="home" />} />
          <Route path="/catalogue" element={<Navigate to="/app/produits" replace />} />
          <Route path="/connexion" element={<AppHome initialTab="order" />} />

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/connexion" element={<AdminLogin />} />
          <Route path="/admin/login" element={<Navigate to="/admin/connexion" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/:tab" element={<AdminDashboard />} />

          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}