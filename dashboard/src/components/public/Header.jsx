import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Brand from './Brand';
import Icon from './Icon';
import ClientHeader from '../client/ClientHeader';
import { navData } from '../../data/homeData';

export default function Header({
  isClient = false,
  activeTab = 'home',
  onSelectTab,
  user = null,
  onOpenProfile,
  onOpenNotifications,
  onToggleTheme,
  onSelectCategory,
  onSelectSubcategory,
  onSelectPromo,
  onSearch,
  searchQuery = '',
  cagnotteCount = 0,
  unreadNotifCount = 0,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isClientPortal = isClient || location.pathname.startsWith('/app');

  // Si l'utilisateur est dans l'espace client / application Takapay
  if (isClientPortal) {
    return (
      <ClientHeader
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        user={user}
        onOpenProfile={onOpenProfile}
        onOpenNotifications={onOpenNotifications}
        onToggleTheme={onToggleTheme}
        onSelectCategory={onSelectCategory}
        onSelectSubcategory={onSelectSubcategory}
        onSelectPromo={onSelectPromo}
        onSearch={onSearch}
        searchQuery={searchQuery}
        cagnotteCount={cagnotteCount}
        unreadNotifCount={unreadNotifCount}
      />
    );
  }

  // Header public d'origine, strictement intact pour la page d'accueil
  return (
    <header className="site-header">
      <div className="nav-shell">
        <Brand />

        <button
          className="menu-toggle"
          type="button"
          aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`main-nav ${isMenuOpen ? 'nav-open' : ''}`}
          aria-label="Navigation principale"
        >
          {navData.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link
            to={navData.cta.href}
            onClick={() => setIsMenuOpen(false)}
            className="nav-cta"
          >
            <span>{navData.cta.label}</span>
            <Icon name="arrow" size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
