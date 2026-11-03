import { useState, useEffect } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';

export default function AdminTransactionsView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState('tous');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    let isMounted = true;
    adminService.getTransactions().then((data) => {
      if (isMounted) {
        setTransactions(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = transactions.filter((tx) => {
    const matchSearch = (tx.reference_externe || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.cagnotte?.produit_nom || tx.article || '').toLowerCase().includes(search.toLowerCase());
    const matchProvider = providerFilter === 'tous' || (tx.moyen_paiement || '').includes(providerFilter);
    return matchSearch && matchProvider;
  });

  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, lastPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const successfulTransactions = transactions.filter(
    (tx) => tx.statut === 'succes' || tx.statut === 'reussi'
  );

  const totalMontant = successfulTransactions.reduce(
    (acc, tx) => acc + (parseFloat(tx.montant) || 0),
    0
  );

  const paiementsCashCount = successfulTransactions.filter(
    (tx) =>
      tx.type === 'paiement_livraison' ||
      tx.type === 'commande_cash' ||
      tx.moyen_paiement === 'livraison' ||
      !tx.cagnotte_id
  ).length;

  const cotisationsCagnottesCount = successfulTransactions.filter(
    (tx) =>
      Boolean(tx.cagnotte_id) &&
      tx.type !== 'paiement_livraison' &&
      tx.type !== 'commande_cash'
  ).length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="admin-header-title">Flux des Transactions</h1>
        <p className="admin-header-sub">
          Historique audité des versements Mobile Money et règlements de cagnottes
        </p>
      </div>

      {/* Cartes KPI */}
      <div className="admin-kpi-grid" style={{ marginTop: 0 }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Volume total encaissé</span>
            <i><AdminIcon name="wallet" size={16} /></i>
          </div>
          <b>{totalMontant.toLocaleString('fr-FR')} F</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Règlements réussis</span>
            <i><AdminIcon name="check" size={16} /></i>
          </div>
          <b>{successfulTransactions.length}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Paiements Cash direct</span>
            <i><AdminIcon name="cart" size={16} /></i>
          </div>
          <b>{paiementsCashCount}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Cotisations Cagnottes</span>
            <i><AdminIcon name="box" size={16} /></i>
          </div>
          <b>{cotisationsCagnottesCount}</b>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="admin-panel" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par référence, produit..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontSize: '13px',
            font: 'inherit',
          }}
        />

        <select
          value={providerFilter}
          onChange={(e) => {
            setProviderFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontSize: '13px',
            font: 'inherit',
          }}
        >
          <option value="tous">Tous les opérateurs</option>
          <option value="MTN">MTN MoMo</option>
          <option value="Moov">Moov Money</option>
          <option value="Celtiis">Celtiis Cash</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Chargement des transactions...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>Aucune transaction trouvée.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Cagnotte / Article</th>
                  <th>Montant</th>
                  <th>Opérateur / Moyen</th>
                  <th>Date & Heure</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <strong>{tx.reference_externe || `TXN-${tx.id}`}</strong>
                      <span className="admin-sub-text">Bénin · Devise XOF</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{tx.cagnotte?.produit_nom || tx.article || 'Cagnotte Takapay'}</span>
                      <span className="admin-sub-text">Cagnotte: {tx.cagnotte?.code || tx.cagnotte_nom || `CG-${tx.id}`}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {parseFloat(tx.montant).toLocaleString('fr-FR')} F
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{tx.moyen_paiement}</span>
                      <span className="admin-sub-text">{tx.prestataire || 'Mobile Money'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{tx.date || 'Récemment'}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${tx.statut === 'succes' || tx.statut === 'reussi' ? 's1' : tx.statut === 'en_attente' ? 's2' : 's3'}`}>
                        {tx.statut === 'succes' || tx.statut === 'reussi' ? 'Succès' : tx.statut === 'en_attente' ? 'En attente' : 'Échec'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Barre de pagination */}
        {!loading && filtered.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '20px',
              marginTop: '20px',
              borderTop: '1px solid var(--line)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--mut)' }}>
              Affichage de <strong>{paginated.length}</strong> sur <strong>{filtered.length}</strong> transaction{filtered.length > 1 ? 's' : ''} (Page {currentPage} sur {lastPage})
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: currentPage <= 1 ? 'var(--bg)' : 'var(--card)',
                  color: currentPage <= 1 ? 'var(--mut)' : 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: currentPage <= 1 ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                &larr; Précédent
              </button>

              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'var(--soft)',
                  color: 'var(--r)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {currentPage} / {lastPage}
              </span>

              <button
                type="button"
                disabled={currentPage >= lastPage}
                onClick={() => setPage((prev) => Math.min(prev + 1, lastPage))}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: currentPage >= lastPage ? 'var(--bg)' : 'var(--card)',
                  color: currentPage >= lastPage ? 'var(--mut)' : 'var(--ink)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: currentPage >= lastPage ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: currentPage >= lastPage ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                Suivant &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
