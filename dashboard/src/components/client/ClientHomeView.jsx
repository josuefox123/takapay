import { useState, useEffect } from 'react';
import ClientHeroCarousel from './ClientHeroCarousel';
import ClientProductCard from './ClientProductCard';
import { PRODUCTS, TAKAPAY_CATEGORIES, rebuildCategories } from '../../data/clientStore';
import { adminService } from '../../services/adminService';

export default function ClientHomeView({
  products = [],
  onSelectProduct,
  onSelectCategory,
  onSelectPromo,
  onGoCatalog,
}) {
  const [categories, setCategories] = useState(() => {
    if (Array.isArray(TAKAPAY_CATEGORIES) && TAKAPAY_CATEGORIES.length > 0) {
      return [...TAKAPAY_CATEGORIES];
    }
    try {
      const saved = localStorage.getItem('takapay_backend_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rebuildCategories(parsed);
          return [...TAKAPAY_CATEGORIES];
        }
      }
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    adminService.getCategories().then((cats) => {
      if (!isMounted) return;
      if (Array.isArray(cats) && cats.length > 0) {
        rebuildCategories(cats);
        try {
          localStorage.setItem('takapay_backend_categories', JSON.stringify(cats));
        } catch { /* ignore */ }
        setCategories([...TAKAPAY_CATEGORIES]);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const displayProducts = Array.isArray(products) && products.length > 0 ? products : PRODUCTS;
  const popular = displayProducts.slice(0, 8);

  return (
    <div>
      {/* 1. Carrousel d'accueil & articles dynamiques */}
      <ClientHeroCarousel
        products={displayProducts}
        onSelectProduct={onSelectProduct}
        onGoCatalog={onGoCatalog}
        onSelectPromo={onSelectPromo}
      />

      {/* 2. Représentation des catégories en cercle avec animation & bouton Voir Tout */}
      <div className="home-categories-section">
        <div className="home-categories-row">
          {categories.slice(0, 15).map((cat, idx) => (
            <button
              key={cat.id || cat.name}
              type="button"
              className="home-cat-circle-btn"
              onClick={() => onSelectCategory(cat.name)}
              title={`Explorer ${cat.name}`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div
                className="home-cat-circle-avatar"
                style={{ animationDelay: `${(idx % 6) * 0.35}s` }}
              >
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="home-cat-circle-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <span
                  className="home-cat-circle-fallback"
                  style={{ display: cat.image ? 'none' : 'flex' }}
                >
                  {cat.icon || '🛍️'}
                </span>
              </div>
              <span className="home-cat-circle-name">{cat.name}</span>
            </button>
          ))}

          {/* Bouton "View all" à la fin de la ligne : 4 rectangles dans un cercle */}
          <button
            type="button"
            className="home-cat-circle-btn home-cat-view-all"
            onClick={onGoCatalog}
            title="Voir toutes les catégories"
            style={{ animationDelay: `${Math.min(categories.length, 15) * 0.05}s` }}
          >
            <div
              className="home-cat-circle-avatar view-all-avatar"
              style={{ animationDelay: `${(Math.min(categories.length, 15) % 6) * 0.35}s` }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="four-rectangles-icon">
                <rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="currentColor" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="currentColor" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="currentColor" />
              </svg>
            </div>
            <span className="home-cat-circle-name">Voir tout</span>
          </button>
        </div>
      </div>

      {/* 3. Produits populaires */}
      <div className="client-sh">
        <div>
          <h2>Produits populaires</h2>
          <small>Modalités de paiement par article</small>
        </div>
        <button
          type="button"
          className="see-all"
          onClick={onGoCatalog}
        >
          Voir tout →
        </button>
      </div>

      {popular.length > 0 ? (
        <div className="client-grid">
          {popular.map((p) => (
            <ClientProductCard
              key={p.id}
              product={p}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            background: 'var(--cd)',
            border: '1.5px dashed var(--bd)',
            borderRadius: '20px',
            padding: '44px 20px',
            color: 'var(--mu)',
            margin: '16px 0',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📦</div>
          <strong style={{ fontSize: '16px', display: 'block', color: 'var(--tx)' }}>
            Aucun produit disponible pour le moment
          </strong>
          <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
            Les nouveaux articles créés dans le dashboard apparaîtront ici dès leur ajout.
          </p>
        </div>
      )}
    </div>
  );
}
