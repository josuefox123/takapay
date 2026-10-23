export default function AdminWatchlist({ items = [] }) {
  const defaultItems = [
    { label: 'Versements en retard', valeur: 0, pulse: false },
    { label: 'Cagnottes prêtes à livrer', valeur: 0, pulse: false },
    { label: 'Produits en rupture', valeur: 0, pulse: false },
  ];

  const list = items.length > 0 ? items : defaultItems;

  return (
    <div className="admin-panel">
      <h3>À surveiller</h3>
      <ul className="admin-watchlist">
        {list.map((item, index) => (
          <li key={item.label || index}>
            <span>{item.label}</span>
            <b>{item.valeur}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
