import AdminIcon from './AdminIcon';
import logoImg from '../../assets/logo.png';

export default function AdminSidebar({
  activeTab = 'dashboard',
  onSelectTab,
  onLogout,
  unreadSupportCount = 0,
}) {
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'grid' },
    { id: 'support', label: 'Support & Chat', icon: 'message', badge: unreadSupportCount },
    { id: 'produits', label: 'Produits', icon: 'box' },
    { id: 'promotions', label: 'Promotions', icon: 'tag' },
    { id: 'carousels', label: 'Bannières Carrousel', icon: 'image' },
    { id: 'cagnottes', label: 'Cagnottes', icon: 'wallet' },
    { id: 'commandes', label: 'Commandes', icon: 'cart' },
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
            style={{
              height: '38px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: '10px',
                }}
              >
                <AdminIcon name={item.icon} size={18} />
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '12px',
                      marginLeft: 'auto',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
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