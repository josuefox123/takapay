export default function AdminWatchlist({ items = [] }) {
  const defaultItems = [
    { label: 'Cagnottes prêtes à livrer', valeur: 0, pulse: false },
    { label: 'Commandes Cash à préparer', valeur: 0, pulse: false },
    { label: 'Demandes d’annulation / remb.', valeur: 0, pulse: false },
  ];

  const list = items.length > 0 ? items : defaultItems;

  return (
    <div className="admin-panel">
      <h3>À surveiller</h3>
      <ul className="admin-watchlist">
        {list.map((item, index) => (
          <li key={item.label || index}>
            <span>{item.label}</span>
            <b style={{ color: Number(item.valeur) > 0 ? 'var(--r)' : 'inherit' }}>{item.valeur}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
