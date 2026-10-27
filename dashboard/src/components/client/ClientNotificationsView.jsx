import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const getStoredUser = () => {
  try {
    const saved = localStorage.getItem('takapay-client-user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export default function ClientNotificationsView({
  user: propUser,
  onBack,
  onGoCagnotte,
  onGoCatalog,
}) {
  const user = propUser || getStoredUser();
  const [activeFilter, setActiveFilter] = useState('Tous'); // 'Tous' | 'Paiements' | 'Cagnotte' | 'Infos'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const loadNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await adminService.getNotifications(user.id);
      if (Array.isArray(data)) {
        // Filtrage strict par utilisateur connecté
        const userNotifs = data
          .filter((n) => String(n.utilisateur_id) === String(user.id))
          .map((item) => ({
            id: item.id,
            utilisateur_id: item.utilisateur_id,
            title: item.titre,
            description: item.message,
            date: item.date_formattee || (item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : 'Récemment'),
            category: item.type === 'cagnotte' ? 'cagnotte' : (item.type === 'paiements' ? 'paiements' : 'infos'),
            statut: item.statut || 'non_lu',
            unread: item.statut !== 'lu',
            iconType: item.type === 'paiements' ? 'success' : (item.type === 'cagnotte' ? 'warning' : 'info'),
          }));
        setNotifications(userNotifs);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const handleOpenDetail = async (notif) => {
    setSelectedNotif(notif);
    if (notif.unread) {
      try {
        await adminService.markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, unread: false, statut: 'lu' } : n))
        );
        window.dispatchEvent(new CustomEvent('takapay_notification_updated'));
      } catch {
        // Ignorer
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await adminService.markAllNotificationsAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false, statut: 'lu' })));
      window.dispatchEvent(new CustomEvent('takapay_notification_updated'));
    } catch {
      // Ignorer
    }
  };

  // Filtrage selon la catégorie
  const filtered = notifications.filter((item) => {
    if (activeFilter === 'Tous') return true;
    if (activeFilter === 'Paiements') return item.category === 'paiements';
    if (activeFilter === 'Cagnotte') return item.category === 'cagnotte';
    if (activeFilter === 'Infos') return item.category === 'infos';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getIcon = (type) => {
    if (type === 'success') {
      return (
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#dcfce7',
            color: '#15803d',
            display: 'grid',
            placeItems: 'center',
            fontSize: '18px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    }
    if (type === 'warning') {
      return (
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#fef3c7',
            color: '#b45309',
            display: 'grid',
            placeItems: 'center',
            fontSize: '18px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
      );
    }
    return (
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: '#ffedd5',
          color: '#c2410c',
          display: 'grid',
          placeItems: 'center',
          fontSize: '18px',
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* 1. Bouton retour & Titre */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Retour"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1.5px solid #ece5de',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#1b1716',
                fontWeight: 800,
              }}
            >
              ‹
            </button>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1b1716', margin: 0, letterSpacing: '-0.5px' }}>
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '99px',
                  }}
                >
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', color: '#706966', fontSize: '13.5px' }}>
              Toutes vos alertes de versements, commandes et réceptions d'articles.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid #e2dad0',
              background: '#ffffff',
              color: '#1b1716',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <span>✓</span> Tout marquer comme lu
          </button>
        )}
      </div>

      {/* 2. Filtres par catégorie (Photo 3) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['Tous', 'Paiements', 'Cagnotte', 'Infos'].map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              style={{
                padding: '8px 20px',
                borderRadius: '99px',
                border: isActive ? 'none' : '1px solid #e8e0d6',
                background: isActive ? '#dc2626' : '#ffffff',
                color: isActive ? '#ffffff' : '#2b2624',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 2px 8px rgba(220, 38, 38, 0.25)' : 'none',
                transition: 'all .15s',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 3. Liste des notifications */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#8c8580', fontSize: '14px' }}>
            Chargement de vos notifications...
          </div>
        )}

        {!loading && filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenDetail(item)}
            style={{
              background: item.unread ? '#fffaf5' : '#ffffff',
              borderRadius: '20px',
              border: item.unread ? '1.5px solid #fdba74' : '1px solid #ece5df',
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              boxShadow: item.unread ? '0 4px 16px rgba(234, 88, 12, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'transform .15s, box-shadow .15s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = item.unread ? '0 4px 16px rgba(234, 88, 12, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)';
            }}
          >
            {getIcon(item.iconType)}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item.unread && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#ea580c',
                        display: 'inline-block',
                      }}
                      title="Non lue"
                    />
                  )}
                  <b style={{ fontSize: '15px', color: '#1b1716' }}>{item.title}</b>
                </div>
                <span style={{ fontSize: '11px', color: '#8c8580', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {item.date}
                </span>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#4b443f',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {item.description}
              </p>
            </div>

            <span style={{ color: '#a09895', fontSize: '20px', fontWeight: 600, marginLeft: '6px' }}>
              ›
            </span>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#8c8580', fontSize: '14px' }}>
            Aucune notification dans cette catégorie.
          </div>
        )}
      </div>

      {/* 4. Modal détail de notification */}
      {selectedNotif && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNotif(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              padding: 'clamp(18px, 4vw, 24px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              color: '#1b1716',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {getIcon(selectedNotif.iconType)}
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 800, margin: 0 }}>{selectedNotif.title}</h3>
                  <small style={{ color: '#8c8580', fontSize: '11.5px' }}>{selectedNotif.date}</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#706966' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#3b3532', lineHeight: 1.6, margin: '0 0 22px' }}>
              {selectedNotif.description}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              {(selectedNotif.category === 'cagnotte' || selectedNotif.category === 'paiements') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotif(null);
                    if (onGoCagnotte) onGoCagnotte();
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                  }}
                >
                  Voir ma cagnotte
                </button>
              )}

              {selectedNotif.category === 'infos' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotif(null);
                    if (onGoCatalog) onGoCatalog();
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                  }}
                >
                  Découvrir les offres
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                style={{
                  padding: '12px 18px',
                  background: '#f2ece6',
                  color: '#1b1716',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
