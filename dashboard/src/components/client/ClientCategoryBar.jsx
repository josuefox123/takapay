import { useState, useRef, useEffect } from 'react';
import { TAKAPAY_CATEGORIES } from '../../data/takapayCategories';
import { rebuildCategories } from '../../data/clientStore';
import { adminService } from '../../services/adminService';

/**
 * Barre de navigation des catégories et sous-catégories Takapay
 * Conforme à la maquette et au document PDF des 17 catégories.
 * - Ligne 1 : Bouton "Toutes les catégories" + Barre de recherche + Liens Promotions/Nouveautés
 * - Ligne 2 : Noms de catégories alignés horizontalement
 * - Menu déroulant au survol/clic de chaque catégorie pour afficher ses sous-catégories
 * - Le clic sur une sous-catégorie affiche ses produits.
 */
export default function ClientCategoryBar({
  onSelectCategory,
  onSelectSubcategory,
  onSelectPromo,
  onSearch,
  searchQuery = '',
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showAllCategoriesMenu, setShowAllCategoriesMenu] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [, setCatTick] = useState(0);
  const containerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    const handleUpdate = () => setCatTick((t) => t + 1);
    window.addEventListener('takapay_categories_updated', handleUpdate);

    if (TAKAPAY_CATEGORIES.length === 0) {
      adminService.getCategories().then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          rebuildCategories(cats);
          setCatTick((t) => t + 1);
        }
      }).catch(() => {});
    }

    return () => window.removeEventListener('takapay_categories_updated', handleUpdate);
  }, []);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setActiveDropdown(null);
        setShowAllCategoriesMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnterCategory = (catId) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveDropdown(catId);
  };

  const handleMouseLeaveCategory = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  const handleSubcategoryClick = (subName, categoryName) => {
    setActiveDropdown(null);
    setShowAllCategoriesMenu(false);
    if (onSelectSubcategory) {
      onSelectSubcategory(subName, categoryName);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(localSearch.trim());
    }
  };

  return (
    <div className="client-category-bar-root" ref={containerRef}>
      {/* 1. LIGNE DE RECHERCHE & BOUTON TOUTES LES CATÉGORIES (Conforme à l'image) */}
      <div className="cat-search-row">
        <div className="cat-search-row-inner">
          {/* Bouton rouge Toutes les catégories */}
          <div className="all-cats-btn-wrapper">
            <button
              type="button"
              className={`all-cats-btn ${showAllCategoriesMenu ? 'active' : ''}`}
              onClick={() => {
                setShowAllCategoriesMenu((prev) => !prev);
                setActiveDropdown(null);
              }}
              aria-expanded={showAllCategoriesMenu}
            >
              <span className="all-cats-icon">☰</span>
              <span>Toutes les catégories</span>
            </button>

            {/* Mega menu "Toutes les catégories" */}
            {showAllCategoriesMenu && (
              <div className="all-cats-mega-menu">
                <div className="mega-menu-header">
                  <strong>Tous les univers Takapay ({TAKAPAY_CATEGORIES.length})</strong>
                  <small>Cliquez sur une sous-catégorie pour voir ses articles</small>
                </div>
                <div className="mega-menu-grid">
                  {TAKAPAY_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="mega-menu-col">
                      <div className="mega-cat-title">
                        <span className="mega-cat-icon">{cat.icon}</span>
                        <b>{cat.name}</b>
                      </div>
                      <ul className="mega-subcats-list">
                        {cat.subcategories.map((sub) => (
                          <li key={sub.name}>
                            <button
                              type="button"
                              className="mega-subcat-link"
                              onClick={() => handleSubcategoryClick(sub.name, cat.name)}
                            >
                              <span className="subcat-bullet">·</span>
                              <span className="subcat-name">{sub.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Formulaire de recherche central */}
          <form className="cat-search-form" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="cat-search-input"
              placeholder="Rechercher un article, un produit, une catégorie"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            <button type="submit" className="cat-search-submit-btn">
              Rechercher
            </button>
          </form>

          {/* Liens rapides à droite */}
          <div className="cat-quick-links">
            <button
              type="button"
              className="quick-link promo"
              onClick={onSelectPromo}
            >
              Promotions
            </button>
            <button
              type="button"
              className="quick-link new"
              onClick={() => {
                if (onSelectCategory) onSelectCategory('Tous');
              }}
            >
              Nouveautés
            </button>
          </div>
        </div>
      </div>

      {/* 2. LIGNE DES CATÉGORIES ALIGNÉES HORIZONTALEMENT (Conforme à l'image) */}
      <div className="cat-nav-strip">
        <div className="cat-nav-strip-inner">
          <ul className="cat-nav-list" role="menubar">
            {TAKAPAY_CATEGORIES.map((cat) => {
              const isOpen = activeDropdown === cat.id;

              return (
                <li
                  key={cat.id}
                  className={`cat-nav-item ${isOpen ? 'dropdown-open' : ''}`}
                  onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                  onMouseLeave={handleMouseLeaveCategory}
                >
                  <button
                    type="button"
                    className="cat-nav-btn"
                    onClick={() => {
                      setActiveDropdown(isOpen ? null : cat.id);
                      setShowAllCategoriesMenu(false);
                    }}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                  >
                    <span className="cat-label">{cat.name}</span>
                    <span className="cat-arrow">▾</span>
                  </button>

                  {/* Menu déroulant des sous-catégories pour cette catégorie */}
                  {isOpen && (
                    <div
                      className="cat-dropdown-menu"
                      onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                      onMouseLeave={handleMouseLeaveCategory}
                    >
                      <div className="dropdown-header">
                        <span className="dropdown-icon">{cat.icon}</span>
                        <div>
                          <strong className="dropdown-title">{cat.name}</strong>
                          <span className="dropdown-sub-count">
                            {cat.subcategories.length} sous-catégories
                          </span>
                        </div>
                      </div>

                      <div className="dropdown-subcats-grid">
                        {cat.subcategories.map((sub) => (
                          <button
                            key={sub.name}
                            type="button"
                            className="dropdown-subcat-item"
                            onClick={() => handleSubcategoryClick(sub.name, cat.name)}
                          >
                            <div className="subcat-title-row">
                              <span className="subcat-indicator">▸</span>
                              <strong className="subcat-title">{sub.name}</strong>
                            </div>
                            {sub.examples && (
                              <p className="subcat-examples">{sub.examples}</p>
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="dropdown-footer">
                        <button
                          type="button"
                          className="view-all-subcat-btn"
                          onClick={() => {
                            if (onSelectCategory) onSelectCategory(cat.name);
                            setActiveDropdown(null);
                          }}
                        >
                          Voir tous les articles de {cat.name} →
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
