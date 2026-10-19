export default function AdminRecentTransactions({ transactions = [] }) {
  const getBadgeClass = (statut) => {
    switch (statut) {
      case 'reussi':
        return 's1';
      case 'en_attente':
        return 's2';
      case 'echoue':
        return 's3';
      default:
        return 's1';
    }
  };

  const getStatutLabel = (item) => {
    if (item.statut_label) return item.statut_label;
    switch (item.statut) {
      case 'reussi':
        return 'Réussi';
      case 'en_attente':
        return 'En attente';
      case 'echoue':
        return 'Échoué';
      default:
        return 'Réussi';
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
              <th>Échéance</th>
              <th>Montant (F)</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => {
              const badgeClass = tx.badge_class || getBadgeClass(tx.statut);
              const statutLabel = getStatutLabel(tx);

              return (
                <tr
                  key={tx.id || index}
                  className="admin-tr-anim"
                  style={{ '--i': index }}
                >
                  <td>
                    <b>{tx.commande}</b>
                    <span className="admin-sub-text">
                      {tx.client} · {tx.nb_articles} article{tx.nb_articles > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    {tx.article}
                    <span className="admin-sub-text">Cagnotte {tx.cagnotte}</span>
                  </td>
                  <td>
                    {tx.echeance || (tx.echeance_label ? tx.echeance_label : `${tx.echeance_actuelle} / ${tx.echeance_total}`)}
                    <span className="admin-progress-bar">
                      <i style={{ width: `${tx.progression}%` }} />
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {tx.montant.toLocaleString('fr-FR')}
                  </td>
                  <td>
                    <span className={`admin-badge ${badgeClass}`}>
                      {statutLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
