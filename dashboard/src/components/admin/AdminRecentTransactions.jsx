export default function AdminRecentTransactions({ transactions = [] }) {
  const getBadgeClass = (statut) => {
    switch (statut) {
      case 'reussi':
      case 'succes':
        return 's1';
      case 'en_attente':
        return 's2';
      case 'echoue':
      case 'rembourse':
        return 's3';
      default:
        return 's1';
    }
  };

  const getStatutLabel = (tx) => {
    if (tx.statut_label) return tx.statut_label;
    switch (tx.statut) {
      case 'reussi':
      case 'succes':
        return 'Réussi';
      case 'en_attente':
        return 'En attente';
      case 'echoue':
        return 'Échoué';
      case 'rembourse':
        return 'Remboursé';
      default:
        return tx.statut || '—';
    }
  };

  return (
    <div className="admin-panel">
      <h3>Derniers versements</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Article · Cagnotte</th>
              <th>Progression</th>
              <th>Montant (F)</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => {
              const badgeClass = getBadgeClass(tx.statut);
              const statutLabel = getStatutLabel(tx);

              const reference = tx.commande_reference || '—';
              const article = tx.article || '—';
              const cagnotte = tx.cagnotte_nom || '—';
              const montant = Number(tx.montant ?? 0);
              const progression = Math.min(
                100,
                Math.max(0, Math.round(Number(tx.progression) || 0))
              );

              return (
                <tr
                  key={tx.id || index}
                  className="admin-tr-anim"
                  style={{ '--i': index }}
                >
                  {/* Commande : référence + client */}
                  <td>
                    <b><code>{reference}</code></b>
                    {(tx.client || tx.nb_articles) && (
                      <span className="admin-sub-text">
                        {tx.client || '—'}
                        {tx.nb_articles != null
                          ? ` · ${tx.nb_articles} article${tx.nb_articles > 1 ? 's' : ''}`
                          : ''}
                      </span>
                    )}
                  </td>

                  {/* Article · Cagnotte */}
                  <td>
                    {article}
                    <span className="admin-sub-text">Cagnotte {cagnotte}</span>
                  </td>

                  {/* Progression : % + barre */}
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: '110px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {progression}%
                      </span>
                      <span
                        className="admin-progress-bar"
                        style={{ display: 'block', width: '100%' }}
                      >
                        <i
                          style={{
                            width: `${progression}%`,
                            display: 'block',
                            height: '100%',
                            background:
                              progression >= 100
                                ? '#16a34a'
                                : progression >= 50
                                ? '#f59e0b'
                                : '#dc2626',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </span>
                    </div>
                  </td>

                  <td style={{ fontWeight: 600 }}>
                    {montant.toLocaleString('fr-FR')}
                  </td>

                  <td>
                    <span className={`admin-badge ${badgeClass}`}>
                      {statutLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: '24px',
                    color: 'var(--mut)',
                  }}
                >
                  Aucun versement enregistré pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}