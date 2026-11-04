import { useState, useEffect, useMemo } from 'react';
import AdminIcon from './AdminIcon';
import { adminService } from '../../services/adminService';

export default function AdminTransactionsView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState('tous');
  const [flowFilter, setFlowFilter] = useState('tous'); // 'tous' | 'encaissements' | 'remboursements'
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

  const isRefundTx = (tx) =>
    tx.type === 'remboursement' ||
    Boolean(tx.is_refund) ||
    String(tx.reference_externe || '').startsWith('REM-') ||
    String(tx.reference_externe || '').includes('ANNUL');

  // Transactions confirmées avec succès
  const successfulTransactions = useMemo(
    () => transactions.filter((tx) => tx.statut === 'succes' || tx.statut === 'reussi'),
    [transactions]
  );

  // 1. Encaissements réels (paiements reçus des clients)
  const paymentTransactions = useMemo(
    () => successfulTransactions.filter((tx) => !isRefundTx(tx)),
    [successfulTransactions]
  );

  // 2. Remboursements effectués (argent renvoyé aux clients après annulation)
  const refundTransactions = useMemo(
    () => successfulTransactions.filter((tx) => isRefundTx(tx)),
    [successfulTransactions]
  );

  // Totaux comptables stricts
  const totalEncaisse = useMemo(
    () => paymentTransactions.reduce((acc, tx) => acc + (parseFloat(tx.montant) || 0), 0),
    [paymentTransactions]
  );

  const totalRembourse = useMemo(
    () => refundTransactions.reduce((acc, tx) => acc + (parseFloat(tx.montant) || 0), 0),
    [refundTransactions]
  );

  const soldeNet = totalEncaisse - totalRembourse;

  const livraisonTransactions = useMemo(
    () =>
      paymentTransactions.filter(
        (tx) =>
          tx.type === 'paiement_livraison' ||
          tx.type === 'commande_cash' ||
          tx.moyen_paiement === 'livraison'
      ),
    [paymentTransactions]
  );

  const paiementsCashCount = paymentTransactions.filter(
    (tx) =>
      tx.type === 'paiement_livraison' ||
      tx.type === 'commande_cash' ||
      tx.moyen_paiement === 'livraison' ||
      !tx.cagnotte_id
  ).length;

  const cotisationsCagnottesCount = paymentTransactions.filter(
    (tx) =>
      Boolean(tx.cagnotte_id) &&
      tx.type !== 'paiement_livraison' &&
      tx.type !== 'commande_cash'
  ).length;

  // Filtrage combiné (Recherche, Opérateur, Type de flux)
  const filtered = transactions.filter((tx) => {
    const isRefund = isRefundTx(tx);
    const s = search.toLowerCase();
    const ref = (tx.reference_externe || '').toLowerCase();
    const article = (tx.article || tx.cagnotte?.produit_nom || '').toLowerCase();
    const client = (tx.client_nom || '').toLowerCase();
    const clientTel = (tx.client_tel || '').toLowerCase();

    const matchSearch =
      ref.includes(s) ||
      article.includes(s) ||
      client.includes(s) ||
      clientTel.includes(s);

    const matchProvider =
      providerFilter === 'tous' || (tx.moyen_paiement || '').includes(providerFilter);

    const isLivraison =
      tx.type === 'paiement_livraison' ||
      tx.type === 'commande_cash' ||
      tx.moyen_paiement === 'livraison';

    const matchFlow =
      flowFilter === 'tous' ||
      (flowFilter === 'encaissements' && !isRefund) ||
      (flowFilter === 'remboursements' && isRefund) ||
      (flowFilter === 'livraisons' && isLivraison && !isRefund);

    return matchSearch && matchProvider && matchFlow;
  });

  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, lastPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="admin-header-title">Flux des Transactions</h1>
        <p className="admin-header-sub">
          Historique audité séparant les encaissements clients et les remboursements d’annulation
        </p>
      </div>

      {/* Cartes KPI : Distinction nette Encaissements vs Remboursements vs Solde Net */}
      <div className="admin-kpi-grid" style={{ marginTop: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Total encaissé (Paiements)</span>
            <i style={{ color: '#16a34a' }}><AdminIcon name="wallet" size={16} /></i>
          </div>
          <b style={{ color: '#16a34a' }}>{totalEncaisse.toLocaleString('fr-FR')} F</b>
          <span className="admin-sub-text" style={{ marginTop: '4px', display: 'block' }}>
            {paymentTransactions.length} règlement{paymentTransactions.length > 1 ? 's' : ''} client{paymentTransactions.length > 1 ? 's' : ''}
          </span>
        </div>

        <div
          className="admin-kpi-card"
          style={{
            borderColor: totalRembourse > 0 ? '#fca5a5' : 'var(--line)',
            background: totalRembourse > 0 ? '#fff1f2' : 'var(--surface)',
          }}
        >
          <div className="admin-kpi-header">
            <span style={{ color: totalRembourse > 0 ? '#dc2626' : 'inherit' }}>
              Total remboursé (Annulations)
            </span>
            <i style={{ color: '#dc2626' }}><AdminIcon name="swap" size={16} /></i>
          </div>
          <b style={{ color: totalRembourse > 0 ? '#dc2626' : 'inherit' }}>
            {totalRembourse.toLocaleString('fr-FR')} F
          </b>
          <span className="admin-sub-text" style={{ marginTop: '4px', display: 'block', color: totalRembourse > 0 ? '#b91c1c' : 'inherit' }}>
            {refundTransactions.length} remboursement{refundTransactions.length > 1 ? 's' : ''} renvoyé{refundTransactions.length > 1 ? 's' : ''}
          </span>
        </div>

        <div
          className="admin-kpi-card"
          style={{
            borderColor: '#bbf7d0',
            background: '#f0fdf4',
          }}
        >
          <div className="admin-kpi-header">
            <span style={{ color: '#15803d', fontWeight: 600 }}>Solde net réel en caisse</span>
            <i style={{ color: '#16a34a' }}><AdminIcon name="check" size={16} /></i>
          </div>
          <b style={{ color: '#15803d' }}>{soldeNet.toLocaleString('fr-FR')} F</b>
          <span className="admin-sub-text" style={{ marginTop: '4px', display: 'block', color: '#166534' }}>
            Combien reste en caisse
          </span>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span>Ventilation des paiements</span>
            <i><AdminIcon name="tag" size={16} /></i>
          </div>
          <b>{cotisationsCagnottesCount} cagnottes · {paiementsCashCount} cash</b>
          <span className="admin-sub-text" style={{ marginTop: '4px', display: 'block' }}>
            {successfulTransactions.length} opération{successfulTransactions.length > 1 ? 's' : ''} au total
          </span>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div
        className="admin-panel"
        style={{
          marginBottom: '20px',
          padding: '16px 20px',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            minWidth: '240px',
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
          value={flowFilter}
          onChange={(e) => {
            setFlowFilter(e.target.value);
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
            fontWeight: 600,
          }}
        >
          <option value="tous">Tous les flux ({transactions.length})</option>
          <option value="encaissements">Encaissements / Paiements ({paymentTransactions.length})</option>
          <option value="livraisons">Paiements à la livraison ({livraisonTransactions.length})</option>
          <option value="remboursements">Remboursements d'annulation ({refundTransactions.length})</option>
        </select>

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

      {/* Tableau des transactions */}
      <div className="admin-panel">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>
            Chargement des transactions...
          </p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--mut)', padding: '24px' }}>
            Aucune transaction trouvée.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Référence & Flux</th>
                  <th>Article & Cagnotte</th>
                  <th>Client / Destinataire</th>
                  <th>Montant</th>
                  <th>Opérateur / Moyen</th>
                  <th>Date & Heure</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((tx) => {
                  const isRefund = isRefundTx(tx);
                  const montant = parseFloat(tx.montant) || 0;

                  return (
                    <tr
                      key={tx.id}
                      style={{
                        background: isRefund ? 'rgba(254, 242, 242, 0.35)' : 'inherit',
                      }}
                    >
                      {/* Référence & Nature */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <strong style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            {tx.reference_externe || `TXN-${tx.id}`}
                          </strong>
                          <div>
                            {isRefund && (
                              <span
                                className="admin-badge"
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fca5a5',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                Remboursement (Sortant)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Article & Cagnotte */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>
                            {tx.article || tx.cagnotte?.produit_nom || 'Article Takapay'}
                          </span>
                          <span className="admin-sub-text">
                            {tx.cagnotte_id ? (
                              <>
                                Cagnotte : <b>{tx.cagnotte_nom || `CG-${tx.cagnotte_id}`}</b>
                                {isRefund && (
                                  <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: '6px' }}>
                                    (Annulée)
                                  </span>
                                )}
                              </>
                            ) : (
                              'Commande directe'
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Client / Destinataire */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>
                            {tx.client_nom || 'Client Takapay'}
                          </span>
                          <span className="admin-sub-text">
                            {tx.client_tel || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Montant (signé) */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <b
                            style={{
                              fontSize: '14.5px',
                              fontWeight: 700,
                              color: isRefund ? '#dc2626' : '#16a34a',
                            }}
                          >
                            {isRefund ? '- ' : '+ '}
                            {montant.toLocaleString('fr-FR')} F
                          </b>
                          <span
                            className="admin-sub-text"
                            style={{
                              color: isRefund ? '#dc2626' : 'var(--mut)',
                              fontSize: '11px',
                            }}
                          >
                            {isRefund ? 'Argent renvoyé (95%)' : 'Paiement reçu'}
                          </span>
                        </div>
                      </td>

                      {/* Opérateur / Moyen */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>
                            {tx.moyen_paiement || 'Mobile Money'}
                          </span>
                          <span className="admin-sub-text">
                            {tx.prestataire || 'FEEXPAY'}
                          </span>
                        </div>
                      </td>

                      {/* Date & Heure */}
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--mut)' }}>
                          {formatDate(tx.date)}
                        </span>
                      </td>

                      {/* Statut */}
                      <td>
                        <span
                          className={`admin-badge ${
                            tx.statut === 'succes' || tx.statut === 'reussi'
                              ? isRefund
                                ? 's3'
                                : 's1'
                              : tx.statut === 'en_attente'
                              ? 's2'
                              : 's3'
                          }`}
                          style={
                            isRefund
                              ? {
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  borderColor: '#fca5a5',
                                }
                              : {}
                          }
                        >
                          {tx.statut === 'succes' || tx.statut === 'reussi'
                            ? isRefund
                              ? 'Remboursé'
                              : 'Réussi'
                            : tx.statut === 'en_attente'
                            ? 'En attente'
                            : 'Échec'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
