import { lazy, Suspense, useCallback, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminKpiCards from '../../components/admin/AdminKpiCards';
import AdminRecoveryChart from '../../components/admin/AdminRecoveryChart';
import AdminPendingDocuments from '../../components/admin/AdminPendingDocuments';
import AdminRecentTransactions from '../../components/admin/AdminRecentTransactions';
import AdminWatchlist from '../../components/admin/AdminWatchlist';
import AdminToast from '../../components/admin/AdminToast';

const AdminProductsView = lazy(() => import('../../components/admin/AdminProductsView'));
const AdminPromotionsView = lazy(() => import('../../components/admin/AdminPromotionsView'));
const AdminCarouselView = lazy(() => import('../../components/admin/AdminCarouselView'));
const AdminCagnottesView = lazy(() => import('../../components/admin/AdminCagnottesView'));
const AdminCommandesView = lazy(() => import('../../components/admin/AdminCommandesView'));
const AdminDocumentsView = lazy(() => import('../../components/admin/AdminDocumentsView'));
const AdminUsersView = lazy(() => import('../../components/admin/AdminUsersView'));
const AdminTransactionsView = lazy(() => import('../../components/admin/AdminTransactionsView'));
const AdminLivraisonsView = lazy(() => import('../../components/admin/AdminLivraisonsView'));
const AdminSupportView = lazy(() => import('../../components/admin/AdminSupportView'));

import { adminService } from '../../services/adminService';
import './admin.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { tab } = useParams();

  const validTabs = [
    'dashboard',
    'support',
    'produits',
    'promotions',
    'carousels',
    'cagnottes',
    'commandes',
    'documents',
    'utilisateurs',
    'transactions',
    'livraisons',
  ];

  const initialActive = tab && validTabs.includes(tab) ? tab : 'dashboard';
  const [activeTab, setActiveTab] = useState(initialActive);

  useEffect(() => {
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  const handleSelectTab = (newTab) => {
    setActiveTab(newTab);
    navigate(`/admin/${newTab}`);
  };

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('takapay_admin_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('takapay_admin_theme', next);
    } catch { /* ignore */ }
  };

  const [adminUser, setAdminUser] = useState(() => adminService.getUser());
  const [stats, setStats] = useState(null);
  const [kpis, setKpis] = useState({
    encaisse_ce_mois: 0,
    cagnottes_actives: 0,
    documents_a_valider: 0,
    nouveaux_utilisateurs: 0,
  });

  // Vérification de la session admin et mise à jour de l'utilisateur
  useEffect(() => {
    const token = adminService.getToken();
    if (!token) {
      navigate('/admin/connexion', { replace: true });
      return;
    }

    fetch('/api/me', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          adminService.logout();
          navigate('/admin/connexion', { replace: true });
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data) {
          const user = data.user || data.data || data;
          if (user?.role !== 'super_admin' && user?.role !== 'admin') {
            adminService.logout();
            navigate('/admin/connexion', { replace: true });
            return;
          }
          setAdminUser(user);
          try {
            localStorage.setItem('takapay_admin_user', JSON.stringify(user));
          } catch {}
        }
      })
      .catch(() => {});
  }, [navigate]);

  // Toast flottant
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  const refreshUnreadSupport = () => {
    adminService
      .getSupportUnreadCount()
      .then((count) => setUnreadSupportCount(count || 0))
      .catch(() => {});
  };

  useEffect(() => {
    refreshUnreadSupport();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshUnreadSupport();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (activeTab !== 'dashboard') return () => { isMounted = false; };

    const refreshStats = () => {
      adminService
        .getDashboardStats()
        .then((data) => {
          if (isMounted) {
            setStats(data);
            if (data?.kpis) setKpis(data.kpis);
          }
        })
        .catch(() => {
          if (isMounted) showToast('Impossible de charger les statistiques');
        });
    };

    refreshStats();
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshStats();
    }, 30000);
    window.addEventListener('focus', refreshStats);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshStats);
    };
  }, [activeTab, showToast]);

  const handleLogout = () => {
    adminService.logout();
    navigate('/admin/connexion', { replace: true });
  };

  const handleDocumentAction = (doc, isApproved) => {
    setKpis((prev) => ({
      ...prev,
      documents_a_valider: Math.max(0, prev.documents_a_valider - 1),
    }));

    adminService.verifyDocument(doc.id, isApproved);
    showToast(isApproved ? 'Document validé' : 'Document rejeté');
  };

  const prenom = adminUser?.prenom || adminUser?.nom || 'Admin';

  return (
    <div className="admin-scope" data-theme={theme}>
      <div className="admin-dashboard-layout">
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
          unreadSupportCount={unreadSupportCount}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="admin-main">
          <Suspense fallback={<div role="status" style={{ padding: 24 }}>Chargement de la page…</div>}>
          {activeTab === 'dashboard' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
                <div>
                  <h1 className="admin-header-title">Bonjour, {prenom}</h1>
                  <p className="admin-header-sub">
                    Voici l'état de la plateforme aujourd'hui
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    border: '1.5px solid var(--line)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                  title={theme === 'dark' ? 'Activer le fond clair' : 'Activer le fond sombre'}
                >
                  <span style={{ fontSize: '16px' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span>{theme === 'dark' ? 'Fond Clair' : 'Fond Sombre'}</span>
                </button>
              </div>

              <AdminKpiCards kpis={kpis} />

              <div className="admin-row">
                <AdminRecoveryChart recouvrement={stats?.recouvrement} kpis={kpis} />
                <AdminPendingDocuments
                  documents={stats?.documents || []}
                  onAction={handleDocumentAction}
                />
              </div>

              <div className="admin-row">
                <AdminRecentTransactions
                  transactions={stats?.derniers_versements || []}
                />
                <AdminWatchlist items={stats?.a_surveiller || []} />
              </div>
            </>
          )}

          {activeTab === 'support' && (
            <AdminSupportView
              onShowToast={showToast}
              onUnreadCountChange={(c) => setUnreadSupportCount(c)}
            />
          )}

          {activeTab === 'produits' && (
            <AdminProductsView onShowToast={showToast} />
          )}

          {activeTab === 'promotions' && (
            <AdminPromotionsView onShowToast={showToast} />
          )}

          {activeTab === 'carousels' && (
            <AdminCarouselView onShowToast={showToast} />
          )}

          {activeTab === 'cagnottes' && <AdminCagnottesView />}

          {activeTab === 'commandes' && (
            <AdminCommandesView onShowToast={showToast} />
          )}

          {activeTab === 'documents' && (
            <AdminDocumentsView onShowToast={showToast} />
          )}

          {activeTab === 'utilisateurs' && (
            <AdminUsersView onShowToast={showToast} />
          )}

          {activeTab === 'transactions' && <AdminTransactionsView />}

          {activeTab === 'livraisons' && (
            <AdminLivraisonsView onShowToast={showToast} />
          )}
          </Suspense>
        </main>
      </div>

      <AdminToast message={toastMessage} isVisible={toastVisible} />
    </div>
  );
}