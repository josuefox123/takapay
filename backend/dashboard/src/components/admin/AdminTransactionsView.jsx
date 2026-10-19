import { useState, useEffect } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';

export default function AdminTransactionsView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState('tous');
  const [search, setSearch] = useState('');

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
      (tx.cagnotte?.produit_nom || '').toLowerCase().includes(search.toLowerCase());
    const matchProvider = providerFilter === 'tous' || (tx.moyen_paiement || '').includes(providerFilter);
    return matchSearch && matchProvider;
  });

  const totalMontant = transactions
    .filter((tx) => tx.statut === 'succes' || tx.statut === 'reussi')
    .reduce((acc, tx) => acc + (parseFloat(tx.montant) || 0), 0);

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
            <span>Transactions traitées</span>
            <i><AdminIcon name="swap" size={16} /></i>
          </div>
          <b>{transactions.length}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Règlements réussis</span>
            <i><AdminIcon name="check" size={16} /></i>
          </div>
          <b>{transactions.filter((t) => t.statut === 'succes').length}</b>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>En attente / Rejetées</span>
            <i><AdminIcon name="cal" size={16} /></i>
          </div>
          <b>{transactions.filter((t) => t.statut !== 'succes').length}</b>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="admin-panel" style={{ marginBottom: '20px', padding: '16px 20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par référence, produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
          onChange={(e) => setProviderFilter(e.target.value)}
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
                {filtered.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <strong>{tx.reference_externe || `TXN-${tx.id}`}</strong>
                      <span className="admin-sub-text">Bénin · Devise XOF</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{tx.cagnotte?.produit_nom || 'Cagnotte Takapay'}</span>
                      <span className="admin-sub-text">Cagnotte: {tx.cagnotte?.code || `CG-${tx.id}`}</span>
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
                      <span className={`admin-badge ${tx.statut === 'succes' ? 's1' : tx.statut === 'en_attente' ? 's2' : 's3'}`}>
                        {tx.statut === 'succes' ? 'Succès' : tx.statut === 'en_attente' ? 'En attente' : 'Échec'}
                      </span>
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
