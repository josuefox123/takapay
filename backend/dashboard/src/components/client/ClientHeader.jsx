import { useState, useEffect } from 'react';
import Brand from '../public/Brand';
import { TAKAPAY_CATEGORIES } from '../../data/takapayCategories';

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
  const [selectedCat, setSelectedCat] = useState('Tous');
  const [lang, setLang] = useState('FR');
  const [favoriteToast, setFavoriteToast] = useState(false);
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
      onSearch(localSearch.trim(), selectedCat);
    }
  };

  const handleCategoryChange = (e) => {
    const catName = e.target.value;
    setSelectedCat(catName);
    if (onSelectCategory && catName !== 'Tous') {
      onSelectCategory(catName);
    }
  };

  const handleFavoritesClick = () => {
    setFavoriteToast(true);
    setTimeout(() => setFavoriteToast(false), 2400);
  };

  return (
    <header className="takapay-3sec-header">
      {/* =========================================================================
          SECTION 1 : EMAIL & TÉLÉPHONE (GAUCHE) + RECHERCHE & ACTIONS (DROITE)
          ========================================================================= */}
      <div className="takapay-header-sec1">
        {/* À gauche : Email et Numéro */}
        <div className="sec1-left-contacts">
          <a href="mailto:contact@takapay.bj" className="sec1-contact-link" title="Écrivez-nous par email">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              mail
            </span>
            <span>contact@takapay.bj</span>
          </a>
          <a href="tel:+22990000000" className="sec1-contact-link" title="Appelez le service client">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              call
            </span>
            <span>+229 90 00 00 00</span>
          </a>
        </div>

        {/* À droite sur la même ligne : Recherche filtrée par catégorie + Position + Langue + Favoris + Chariot + Profil */}
        <div className="sec1-right-group">
          {/* Barre de recherche avec sélecteur de catégorie placé devant */}
          <form className="sec1-search-combo" onSubmit={handleSearchSubmit}>
            <select
              className="sec1-category-select"
              value={selectedCat}
              onChange={handleCategoryChange}
              aria-label="Filtrer par catégorie"
              title="Sélectionnez une catégorie"
            >
              <option value="Tous">Toutes catégories</option>
              {TAKAPAY_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              className="sec1-search-input"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Rechercher un produit, sous-catégorie..."
              aria-label="Rechercher un produit ou sous-catégorie"
            />

            <button type="submit" className="sec1-search-btn" title="Lancer la recherche" aria-label="Rechercher">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                search
              </span>
            </button>
          </form>

          {/* Localisation avec drapeau béninois (mot 'Position' retiré) */}
          <div className="sec1-location-pill" title="Localisation active : Bénin">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              location_on
            </span>
            <span>🇧🇯 Bénin</span>
          </div>

          {/* Sélecteur de langue en français ou en anglais */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.85 }}>
              language
            </span>
            <select
              className="sec1-lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Choix de la langue"
            >
              <option value="FR">FR</option>
              <option value="EN">EN</option>
            </select>
          </div>

          {/* Coeur pour les favoris */}
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

          {/* Chariot pour la cagnotte */}
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

          {/* Notifications (placé juste avant le profil) */}
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

          {/* Icône / Avatar pour le profil */}
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

      {/* =========================================================================
          SECTION 2 : LOGO TAKAPAY (GAUCHE) + MENU ACCUEIL, CATALOGUE, CAGNOTTE
          ========================================================================= */}
      <div className="takapay-header-sec2">
        {/* Logo Takapay */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Brand onClick={() => onSelectTab && onSelectTab('home')} />
        </div>

        {/* Menu contenant Accueil, Catalogue et Cagnotte vers la droite */}
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
          </button>
        </nav>
      </div>

      {/* =========================================================================
          SECTION 3 : BANDE D'ANNONCE DÉFILANTE (ANNONCE EN ROUGE + MESSAGE MOBILE)
          ========================================================================= */}
      <div className="takapay-header-sec3" aria-label="Bandeau d'annonces Takapay">
        {/* Tag Annonce en rouge */}
        <div className="sec3-badge-annonce">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            campaign
          </span>
          <span>ANNONCE</span>
        </div>

        {/* Message d'utilité de Takapay qui défile */}
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
