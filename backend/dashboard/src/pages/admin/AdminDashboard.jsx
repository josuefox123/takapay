import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminKpiCards from '../../components/admin/AdminKpiCards';
import AdminRecoveryChart from '../../components/admin/AdminRecoveryChart';
import AdminPendingDocuments from '../../components/admin/AdminPendingDocuments';
import AdminRecentTransactions from '../../components/admin/AdminRecentTransactions';
import AdminWatchlist from '../../components/admin/AdminWatchlist';
import AdminToast from '../../components/admin/AdminToast';

import AdminProductsView from '../../components/admin/AdminProductsView';
import AdminPromotionsView from '../../components/admin/AdminPromotionsView';
import AdminCagnottesView from '../../components/admin/AdminCagnottesView';
import AdminDocumentsView from '../../components/admin/AdminDocumentsView';
import AdminUsersView from '../../components/admin/AdminUsersView';
import AdminTransactionsView from '../../components/admin/AdminTransactionsView';
import AdminLivraisonsView from '../../components/admin/AdminLivraisonsView';

import { adminService } from '../../services/adminService';
import './admin.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminUser] = useState(() => adminService.getUser());
  const [stats, setStats] = useState(null);
  const [kpis, setKpis] = useState({
    encaisse_ce_mois: 4820000,
    cagnottes_actives: 212,
    documents_a_valider: 3,
    nouveaux_utilisateurs: 41,
  });

  // Gestion du Toast flottant
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 2400);
  };

  useEffect(() => {
    let isMounted = true;

    // Chargement des données du tableau de bord
    adminService.getDashboardStats().then((data) => {
      if (isMounted) {
        setStats(data);
        if (data?.kpis) {
          setKpis(data.kpis);
        }
      }
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
    // Décrémenter le compteur de documents à valider
    setKpis((prev) => ({
      ...prev,
      documents_a_valider: Math.max(0, prev.documents_a_valider - 1),
    }));

    // Appel API backend asynchrone
    adminService.verifyDocument(doc.id, isApproved);

    // Notification toast
    showToast(isApproved ? 'Document validé' : 'Document rejeté');
  };

  const prenom = adminUser?.prenom || 'Aureliane';

  return (
    <div className="admin-scope">
      <div className="admin-dashboard-layout">
        {/* Volet latéral Navigation avec logo Takapay */}
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onLogout={handleLogout}
        />

        {/* Contenu Principal dynamique selon l'onglet actif */}
        <main className="admin-main">
          {activeTab === 'dashboard' && (
            <>
              {/* En-tête */}
              <h1 className="admin-header-title">Bonjour, {prenom}</h1>
              <p className="admin-header-sub">
                Voici l'état de la plateforme aujourd'hui
              </p>

              {/* 4 Cartes KPI avec animation de comptage progressif */}
              <AdminKpiCards kpis={kpis} />

              {/* Rangée 1 : Graphique Recouvrement (2fr) + Documents à valider (1fr) */}
              <div className="admin-row">
                <AdminRecoveryChart recouvrement={stats?.recouvrement} />
                <AdminPendingDocuments
                  documents={stats?.documents || []}
                  onAction={handleDocumentAction}
                />
              </div>

              {/* Rangée 2 : Tableau Derniers Versements (2fr) + À surveiller (1fr) */}
              <div className="admin-row">
                <AdminRecentTransactions
                  transactions={stats?.derniers_versements || []}
                />
                <AdminWatchlist items={stats?.a_surveiller || []} />
              </div>
            </>
          )}

          {activeTab === 'produits' && (
            <AdminProductsView onShowToast={showToast} />
          )}

          {activeTab === 'promotions' && (
            <AdminPromotionsView onShowToast={showToast} />
          )}

          {activeTab === 'cagnottes' && (
            <AdminCagnottesView />
          )}

          {activeTab === 'documents' && (
            <AdminDocumentsView onShowToast={showToast} />
          )}

          {activeTab === 'utilisateurs' && (
            <AdminUsersView onShowToast={showToast} />
          )}

          {activeTab === 'transactions' && (
            <AdminTransactionsView />
          )}

          {activeTab === 'livraisons' && (
            <AdminLivraisonsView onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Toast Flottant */}
      <AdminToast message={toastMessage} isVisible={toastVisible} />
    </div>
  );
}
