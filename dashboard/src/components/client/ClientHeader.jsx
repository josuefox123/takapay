import { useState, useEffect } from 'react';
import Brand from '../public/Brand';

export default function ClientHeader({
  activeTab = 'home',
  onSelectTab,
  user = null,
  onOpenProfile,
  onOpenNotifications,
  onSelectCategory,
  onSearch,
  searchQuery = '',
  cagnotteCount = 0,
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [lang, setLang] = useState(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
      if (match && match[1]) {
        const val = decodeURIComponent(match[1]);
        if (val.toLowerCase().endsWith('/en')) {
          return 'EN';
        }
      }
    }
    return 'FR';
  });

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    const target = newLang === 'EN' ? '/fr/en' : '/fr/fr';
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    const host = window.location.hostname;

    document.cookie = `googtrans=${target}; expires=${expires}; path=/`;

    if (host && host.includes('.') && !host.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      document.cookie = `googtrans=${target}; expires=${expires}; path=/; domain=.${host}`;
      document.cookie = `googtrans=${target}; expires=${expires}; path=/; domain=${host}`;
    }

    if (newLang === 'FR') {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      if (host && host.includes('.')) {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${host}`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}`;
      }
      document.cookie = `googtrans=/fr/fr; expires=${expires}; path=/`;
    }

    window.location.reload();
  };
  const [favoriteToast, setFavoriteToast] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setCatTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setCatTick((t) => t + 1);
    window.addEventListener('takapay_categories_updated', handleUpdate);
    return () => window.removeEventListener('takapay_categories_updated', handleUpdate);
  }, []);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(localSearch.trim());
    }
  };

  const handleFavoritesClick = () => {
    setFavoriteToast(true);
    setTimeout(() => setFavoriteToast(false), 2400);
  };

  return (
    <header className="takapay-3sec-header">
      {/* =========================================================================
          VERSION DESKTOP (>= 960px) : 2 BARRES COMPLÈTES
          ========================================================================= */}
      <div className="client-desktop-header">
        {/* SECTION 1 : EMAIL & TÉLÉPHONE (GAUCHE) + RECHERCHE & ACTIONS (DROITE) */}
        <div className="takapay-header-sec1">
          <div className="sec1-left-contacts">
            <a href="mailto:contact@takapay.bj" className="sec1-contact-link" title="Écrivez-nous par email">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                mail
              </span>
              <span className="contact-text">contact@takapay.bj</span>
            </a>
            <a href="tel:+22990000000" className="sec1-contact-link" title="Appelez le service client">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                call
              </span>
              <span className="contact-text">+229 90 00 00 00</span>
            </a>
          </div>

          <div className="sec1-right-group">
            <form className="sec1-search-combo" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className="sec1-search-input"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Rechercher un produit, une catégorie..."
                aria-label="Rechercher un produit ou une catégorie"
              />

              {localSearch && (
                <button
                  type="button"
                  className="sec1-search-clear-btn"
                  onClick={() => {
                    setLocalSearch('');
                    if (onSearch) onSearch('');
                  }}
                  title="Effacer la recherche"
                  aria-label="Effacer la recherche"
                >
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>
                    close
                  </span>
                </button>
              )}

              <button type="submit" className="sec1-search-btn" title="Lancer la recherche" aria-label="Rechercher">
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>
                  search
                </span>
              </button>
            </form>

            <div className="sec1-actions-bar">
              <div className="sec1-location-pill" title="Localisation active : Bénin">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  location_on
                </span>
                <span>🇧🇯 Bénin</span>
              </div>

              <div className="sec1-lang-wrap" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.85 }}>
                  language
                </span>
                <select
                  className="sec1-lang-select"
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  aria-label="Choix de la langue"
                >
                  <option value="FR">FR</option>
                  <option value="EN">EN</option>
                </select>
              </div>

              <button
                type="button"
                className="sec1-action-icon-btn"
                onClick={handleFavoritesClick}
                title="Mes Favoris"
                aria-label="Favoris"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  favorite
                </span>
              </button>

              <button
                type="button"
                className="sec1-action-icon-btn"
                onClick={() => onSelectTab && onSelectTab('cag')}
                title="Mes Cagnottes & Cotisations"
                aria-label="Cagnottes"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  shopping_cart
                </span>
                {cagnotteCount > 0 && <span className="sec1-badge-count">{cagnotteCount}</span>}
              </button>

              <button
                type="button"
                className="sec1-action-icon-btn"
                onClick={onOpenNotifications || (() => onSelectTab && onSelectTab('notif'))}
                title="Mes Notifications"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '21px' }}>
                  notifications
                </span>
              </button>

              <button
                type="button"
                className="sec1-action-icon-btn"
                onClick={onOpenProfile}
                title={user ? `Mon Profil (${user.prenom || user.nom || user.n || 'Connecté'})` : 'Mon Profil'}
                aria-label="Profil utilisateur"
              >
                {user && (user.photo_profil || user.avatar) ? (
                  <img
                    src={user.photo_profil || user.avatar}
                    alt=""
                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : user ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--yellow, #f59e0b)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      lineHeight: 1,
                    }}
                  >
                    {(user.nom || user.prenom || user.n || 'T').trim().charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                    account_circle
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2 : LOGO TAKAPAY (GAUCHE) + MENU ACCUEIL, CATALOGUE, CAGNOTTE */}
        <div className="takapay-header-sec2">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Brand onClick={() => onSelectTab && onSelectTab('home')} />
          </div>

          <nav className="sec2-nav-menu" aria-label="Navigation principale Takapay">
            <button
              type="button"
              className={`sec2-nav-link ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => onSelectTab && onSelectTab('home')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                home
              </span>
              <span>Accueil</span>
            </button>

            <button
              type="button"
              className={`sec2-nav-link ${activeTab === 'shop' || activeTab === 'subcat' || activeTab === 'product' ? 'active' : ''}`}
              onClick={() => onSelectTab && onSelectTab('shop')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                storefront
              </span>
              <span>Catalogue</span>
            </button>

            <button
              type="button"
              className={`sec2-nav-link ${activeTab === 'cag' ? 'active' : ''}`}
              onClick={() => onSelectTab && onSelectTab('cag')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                savings
              </span>
              <span>Cagnotte</span>
              {cagnotteCount > 0 && (
                <span
                  style={{
                    background: '#c62828',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    marginLeft: '4px',
                    display: 'inline-block',
                  }}
                >
                  {cagnotteCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* =========================================================================
          VERSION MOBILE (< 960px) : BARRE ALLÉGÉE + MENU EN 3 TRAITS + RECHERCHE FLUIDE
          ========================================================================= */}
      <div className="client-mobile-header">
        <div className="client-mobile-topbar">
          <div className="client-mobile-brand-wrap">
            <Brand onClick={() => onSelectTab && onSelectTab('home')} />
          </div>

          <div className="client-mobile-actions">
            {/* Chariot pour la cagnotte */}
            <button
              type="button"
              className="client-mobile-icon-btn"
              onClick={() => onSelectTab && onSelectTab('cag')}
              title="Mes Cagnottes"
              aria-label="Cagnottes"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                shopping_cart
              </span>
              {cagnotteCount > 0 && <span className="client-mobile-badge">{cagnotteCount}</span>}
            </button>

            {/* Profil */}
            <button
              type="button"
              className="client-mobile-icon-btn"
              onClick={onOpenProfile}
              title="Mon Profil"
              aria-label="Profil"
            >
              {user && (user.photo_profil || user.avatar) ? (
                <img
                  src={user.photo_profil || user.avatar}
                  alt=""
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  account_circle
                </span>
              )}
            </button>

            {/* Bouton Menu en 3 traits (Hamburger) pour alléger le header */}
            <button
              type="button"
              className="client-hamburger-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu en trait'}
              aria-expanded={isMobileMenuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Ligne de recherche mobile fluide occupant 100% sans déborder */}
        <div className="client-mobile-search-row">
          <form className="sec1-search-combo mobile-combo" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="sec1-search-input"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Rechercher un produit, catégorie..."
              aria-label="Rechercher"
            />

            {localSearch && (
              <button
                type="button"
                className="sec1-search-clear-btn"
                onClick={() => {
                  setLocalSearch('');
                  if (onSearch) onSearch('');
                }}
                title="Effacer"
                aria-label="Effacer"
              >
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>
                  close
                </span>
              </button>
            )}

            <button type="submit" className="sec1-search-btn" aria-label="Rechercher">
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>
                search
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* =========================================================================
          TIROIR COULISSANT DU MENU EN 3 TRAITS (MENU MOBILE ALLÉGÉ)
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="client-drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="client-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="client-drawer-head">
              <div className="client-drawer-user-info">
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#c62828' }}>
                  account_circle
                </span>
                <div>
                  <b style={{ display: 'block', fontSize: '14px', color: '#1b1716' }}>
                    {user ? user.prenom ? `${user.prenom} ${user.nom || ''}` : user.nom || 'Client Connecté' : 'Espace Client Takapay'}
                  </b>
                  <small style={{ color: '#706966', fontSize: '11px' }}>
                    {user ? user.phone || user.telephone || user.email : 'Épargne progressive d\'achats'}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="client-drawer-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Fermer le menu"
              >
                ✕
              </button>
            </div>

            <div className="client-drawer-nav">
              <button
                type="button"
                className={`client-drawer-item ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => {
                  if (onSelectTab) onSelectTab('home');
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined">home</span>
                <span>Accueil</span>
              </button>

              <button
                type="button"
                className={`client-drawer-item ${activeTab === 'shop' || activeTab === 'subcat' || activeTab === 'product' ? 'active' : ''}`}
                onClick={() => {
                  if (onSelectTab) onSelectTab('shop');
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined">storefront</span>
                <span>Catalogue des produits</span>
              </button>

              <button
                type="button"
                className={`client-drawer-item ${activeTab === 'cag' ? 'active' : ''}`}
                onClick={() => {
                  if (onSelectTab) onSelectTab('cag');
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined">savings</span>
                <span>Mes Cagnottes & Versements</span>
                {cagnotteCount > 0 && <span className="drawer-badge">{cagnotteCount}</span>}
              </button>

              <button
                type="button"
                className={`client-drawer-item ${activeTab === 'pro' ? 'active' : ''}`}
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  else if (onSelectTab) onSelectTab('pro');
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined">person</span>
                <span>Mon Profil</span>
              </button>

              <button
                type="button"
                className={`client-drawer-item ${activeTab === 'notif' ? 'active' : ''}`}
                onClick={() => {
                  if (onOpenNotifications) onOpenNotifications();
                  else if (onSelectTab) onSelectTab('notif');
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined">notifications</span>
                <span>Notifications</span>
              </button>

              <button
                type="button"
                className="client-drawer-item"
                onClick={() => {
                  handleFavoritesClick();
                  setIsMobileMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined">favorite</span>
                <span>Mes Favoris</span>
              </button>
            </div>

            <div className="client-drawer-divider" />

            <div className="client-drawer-settings">
              <div className="drawer-setting-row">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#c62828' }}>
                  location_on
                </span>
                <span>Localisation : 🇧🇯 Bénin</span>
              </div>
              <div className="drawer-setting-row">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#c62828' }}>
                  language
                </span>
                <span>Langue :</span>
                <select
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="drawer-lang-select"
                >
                  <option value="FR">Français (FR)</option>
                  <option value="EN">English (EN)</option>
                </select>
              </div>
            </div>

            <div className="client-drawer-divider" />

            {/* Assistance directe sans aucun débordement */}
            <div className="client-drawer-contacts">
              <small className="drawer-contacts-title">Assistance & Service Clientèle</small>
              <a href="tel:+22990000000" className="drawer-contact-link">
                <span className="material-symbols-outlined">call</span>
                <span>+229 90 00 00 00</span>
              </a>
              <a href="mailto:contact@takapay.bj" className="drawer-contact-link">
                <span className="material-symbols-outlined">mail</span>
                <span>contact@takapay.bj</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3 : BANDE D'ANNONCE DÉFILANTE
          ========================================================================= */}
      <div className="takapay-header-sec3" aria-label="Bandeau d'annonces Takapay">
        <div className="sec3-badge-annonce">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            campaign
          </span>
          <span>ANNONCE</span>
        </div>

        <div className="sec3-ticker-wrap">
          <div className="sec3-ticker-content">
            ⚡ Takapay : Épargnez progressivement à votre rythme et sans intérêt pour acquérir vos articles indispensables ! Électroménager, motos, informatique, smartphones et vivres au Bénin · Récupérez vos produits dès le seuil de cotisation atteint !
          </div>
        </div>
      </div>

      {/* Toast rapide pour les favoris */}
      {favoriteToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            background: '#1e1b18',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 9999,
            animation: 'fadeInUp 0.25s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '18px' }}>
            favorite
          </span>
          <span>Article ajouté à vos favoris Takapay !</span>
        </div>
      )}
    </header>
  );
}

