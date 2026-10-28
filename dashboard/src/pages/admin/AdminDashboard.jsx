import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminKpiCards from '../../components/admin/AdminKpiCards';
import AdminRecoveryChart from '../../components/admin/AdminRecoveryChart';
import AdminPendingDocuments from '../../components/admin/AdminPendingDocuments';
import AdminRecentTransactions from '../../components/admin/AdminRecentTransactions';
import AdminWatchlist from '../../components/admin/AdminWatchlist';
import AdminToast from '../../components/admin/AdminToast';

import AdminProductsView from '../../components/admin/AdminProductsView';
import AdminPromotionsView from '../../components/admin/AdminPromotionsView';
import AdminCarouselView from '../../components/admin/AdminCarouselView';
import AdminCagnottesView from '../../components/admin/AdminCagnottesView';
import AdminCommandesView from '../../components/admin/AdminCommandesView';
import AdminDocumentsView from '../../components/admin/AdminDocumentsView';
import AdminUsersView from '../../components/admin/AdminUsersView';
import AdminTransactionsView from '../../components/admin/AdminTransactionsView';
import AdminLivraisonsView from '../../components/admin/AdminLivraisonsView';
import AdminSupportView from '../../components/admin/AdminSupportView';

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

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  useEffect(() => {
    let isMounted = true;

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

    return () => {
      isMounted = false;
    };
  }, []);

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
    <div className="admin-scope">
      <div className="admin-dashboard-layout">
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
          unreadSupportCount={unreadSupportCount}
        />

        <main className="admin-main">
          {activeTab === 'dashboard' && (
            <>
              <h1 className="admin-header-title">Bonjour, {prenom}</h1>
              <p className="admin-header-sub">
                Voici l'état de la plateforme aujourd'hui
              </p>

              <AdminKpiCards kpis={kpis} />

              <div className="admin-row">
                <AdminRecoveryChart recouvrement={stats?.recouvrement} />
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
        </main>
      </div>

      <AdminToast message={toastMessage} isVisible={toastVisible} />
    </div>
  );
}