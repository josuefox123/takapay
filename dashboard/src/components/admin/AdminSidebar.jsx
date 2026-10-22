import AdminIcon from './AdminIcon';
import logoImg from '../../assets/logo.png';

export default function AdminSidebar({ activeTab = 'dashboard', onSelectTab, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'grid' },
    { id: 'produits', label: 'Produits', icon: 'box' },
    { id: 'promotions', label: 'Promotions', icon: 'tag' },
    { id: 'cagnottes', label: 'Cagnottes', icon: 'wallet' },
    { id: 'documents', label: 'Documents', icon: 'file' },
    { id: 'utilisateurs', label: 'Utilisateurs', icon: 'users' },
    { id: 'transactions', label: 'Transactions', icon: 'swap' },
    { id: 'livraisons', label: 'Livraisons', icon: 'truck' },
  ];

  return (
    <aside className="admin-aside">
      <div>
        <div style={{ padding: '0 8px', marginBottom: '28px' }}>
          <img
            src={logoImg}
            alt="Takapay"
            style={{ height: '38px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>

        <nav aria-label="Navigation principale administrateur">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab && onSelectTab(item.id)}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <AdminIcon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
        <button
          type="button"
          onClick={onLogout}
          className="admin-nav-item"
          style={{ color: 'var(--r)' }}
          title="Se déconnecter"
        >
          <AdminIcon name="logout" size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
