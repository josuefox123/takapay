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
const AdminPartenairesView = lazy(() => import('../../components/admin/AdminPartenairesView'));
const AdminCagnottesView = lazy(() => import('../../components/admin/AdminCagnottesView'));
const AdminCommandesView = lazy(() => import('../../components/admin/AdminCommandesView'));
const AdminDocumentsView = lazy(() => import('../../components/admin/AdminDocumentsView'));
const AdminUsersView = lazy(() => import('../../components/admin/AdminUsersView'));
const AdminTransactionsView = lazy(() => import('../../components/admin/AdminTransactionsView'));
const AdminLivraisonsView = lazy(() => import('../../components/admin/AdminLivraisonsView'));
const AdminSupportView = lazy(() => import('../../components/admin/AdminSupportView'));
const AdminProfileView = lazy(() => import('../../components/admin/AdminProfileView'));

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
    'partenaires',
    'cagnottes',
    'commandes',
    'documents',
    'utilisateurs',
    'transactions',
    'livraisons',
    'profil',
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

  // Changement de mot de passe obligatoire (première connexion)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [changePwdError, setChangePwdError] = useState('');

  const handleUpdateFirstPassword = async (e) => {
    e.preventDefault();
    setChangePwdError('');
    if (!newPassword || newPassword.length < 8) {
      setChangePwdError('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePwdError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setChangePwdLoading(true);
    try {
      const res = await adminService.updatePassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      const updatedUser = res.user || res.data || res;
      const mergedUser = { ...adminUser, ...updatedUser, must_change_password: false };
      setAdminUser(mergedUser);
      try {
        localStorage.setItem('takapay_admin_user', JSON.stringify(mergedUser));
      } catch {}
      showToast('Votre mot de passe a été défini avec succès !');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.errors
        ? Object.values(err.errors).flat().join(' ')
        : (err.message || 'Erreur lors de la mise à jour du mot de passe.');
      setChangePwdError(msg);
    } finally {
      setChangePwdLoading(false);
    }
  };

  const handleForceLogout = () => {
    adminService.logout();
    navigate('/admin/connexion', { replace: true });
  };

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
    let isRefreshing = false;
    if (activeTab !== 'dashboard') return () => { isMounted = false; };

    const refreshStats = () => {
      if (isRefreshing) return;
      isRefreshing = true;

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
        })
        .finally(() => {
          isRefreshing = false;
        });
    };

    const handleStorageUpdate = (event) => {
      if (event.key === 'takapay_dashboard_stats_updated') refreshStats();
    };

    refreshStats();
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshStats();
    }, 15000);
    window.addEventListener('focus', refreshStats);
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('takapay:dashboard-stats-updated', refreshStats);
    document.addEventListener('visibilitychange', refreshStats);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshStats);
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('takapay:dashboard-stats-updated', refreshStats);
      document.removeEventListener('visibilitychange', refreshStats);
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

          {activeTab === 'partenaires' && (
            <AdminPartenairesView onShowToast={showToast} />
          )}

          {activeTab === 'cagnottes' && <AdminCagnottesView />}

          {activeTab === 'commandes' && (
            <AdminCommandesView onShowToast={showToast} />
          )}

          {activeTab === 'documents' && (
            <AdminDocumentsView onShowToast={showToast} />
          )}

          {activeTab === 'utilisateurs' && (
            <AdminUsersView onShowToast={showToast} currentUser={adminUser} />
          )}

          {activeTab === 'transactions' && <AdminTransactionsView />}

          {activeTab === 'livraisons' && (
            <AdminLivraisonsView onShowToast={showToast} />
          )}
          {activeTab === 'profil' && (
            <AdminProfileView
              currentUser={adminUser}
              onUserUpdate={(updated) => {
                setAdminUser(updated);
                try {
                  localStorage.setItem('takapay_admin_user', JSON.stringify(updated));
                } catch {}
              }}
              onShowToast={showToast}
            />
          )}
          </Suspense>
        </main>
      </div>

      {/* Modal de changement de mot de passe obligatoire lors de la première connexion */}
      {adminUser?.must_change_password && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            backdropFilter: 'blur(10px)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1.5px solid var(--line)',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '36px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--soft)',
                  color: 'var(--r)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                  fontSize: '28px',
                }}
              >
                🔒
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                Première connexion : Définissez votre mot de passe
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--mut)', lineHeight: 1.5 }}>
                Pour des raisons de sécurité, vous devez remplacer le mot de passe temporaire par un mot de passe personnel avant d'accéder au tableau de bord.
              </p>
            </div>

            {changePwdError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: '18px',
                  fontSize: '13px',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {changePwdError}
              </div>
            )}

            <form onSubmit={handleUpdateFirstPassword}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Nouveau mot de passe *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Confirmez le nouveau mot de passe *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--line)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={changePwdLoading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--r)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: changePwdLoading ? 'not-allowed' : 'pointer',
                  opacity: changePwdLoading ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
                  marginBottom: '16px',
                }}
              >
                {changePwdLoading ? 'Enregistrement...' : 'Enregistrer et continuer'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleForceLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--mut)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminToast message={toastMessage} isVisible={toastVisible} />
    </div>
  );
}