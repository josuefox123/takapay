import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

export default function AdminLivraisonsView({ onShowToast }) {
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('tous');

  useEffect(() => {
    let isMounted = true;
    adminService.getLivraisons().then((data) => {
      if (isMounted) {
        setLivraisons(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateStatus = (livraisonId, nextStatus) => {
    setLivraisons((prev) =>
      prev.map((l) => (l.id === livraisonId ? { ...l, statut: nextStatus } : l))
    );
    onShowToast(`Statut de la livraison mis à jour : ${nextStatus}`);
  };

  const filtered = livraisons.filter((l) => {
    if (statusFilter === 'tous') return true;
    return l.statut === statusFilter;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="admin-header-title">Expéditions & Livraisons</h1>
        <p className="admin-header-sub">
          Suivi des remises d'articles aux bénéficiaires et assignation des livreurs
        </p>
      </div>

      {/* Filtres de statut */}
      <div className="admin-panel" style={{ marginBottom: '20px', padding: '14px 20px', display: 'flex', gap: '10px' }}>
        {['tous', 'en_attente', 'en_cours', 'livree'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`admin-nav-item ${statusFilter === s ? 'active' : ''}`}
            style={{ width: 'auto', padding: '8px 16px', borderRadius: '99px', fontSize: '13px' }}
          >
            {s === 'tous'
              ? 'Toutes les livraisons'
              : s === 'en_attente'
              ? 'En préparation'
              : s === 'en_cours'
              ? 'En cours d’acheminement'
              : 'Livrées'}
          </button>
        ))}
      </div>

      {/* Tableau des livraisons */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Chargement des livraisons...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Aucune livraison trouvée.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Référence & Date</th>
                  <th>Article / Cagnotte</th>
                  <th>Bénéficiaire & Adresse</th>
                  <th>Livreur assigné</th>
                  <th>Frais (FCFA)</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((liv) => (
                  <tr key={liv.id}>
                    <td>
                      <strong>{liv.reference_suivi || `LIV-${liv.id}`}</strong>
                      <span className="admin-sub-text">Prévue: {liv.date_prevue || 'À définir'}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{liv.cagnotte?.produit_nom || 'Article Takapay'}</span>
                      <span className="admin-sub-text">Cagnotte: {liv.cagnotte?.code || 'CG-00'}</span>
                    </td>
                    <td>
                      <strong>{liv.client?.nom || 'Client Takapay'}</strong>
                      <span className="admin-sub-text">
                        {liv.adresse?.ville || 'Bénin'}, {liv.adresse?.quartier || ''} · {liv.client?.telephone}
                      </span>
                    </td>
                    <td>
                      {liv.livreur ? (
                        <div>
                          <strong>{liv.livreur.nom}</strong>
                          <span className="admin-sub-text">
                            {liv.livreur.type_vehicule} · {liv.livreur.telephone}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--mut)', fontSize: '12px', fontStyle: 'italic' }}>
                          Non assigné
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {(liv.frais_livraison || 0).toLocaleString('fr-FR')} F
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${liv.statut === 'livree' ? 's1' : liv.statut === 'en_cours' ? 's2' : 's3'}`}
                      >
                        {liv.statut === 'livree'
                          ? 'Livrée'
                          : liv.statut === 'en_cours'
                          ? 'En cours'
                          : 'En attente'}
                      </span>
                    </td>
                    <td>
                      {liv.statut !== 'livree' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(liv.id, liv.statut === 'en_attente' ? 'en_cours' : 'livree')}
                          className="admin-btn-ok"
                          style={{
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {liv.statut === 'en_attente' ? 'Démarrer' : 'Valider remise'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
