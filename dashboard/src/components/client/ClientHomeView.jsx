import { useState, useEffect, useMemo } from 'react';
import ClientHeroCarousel from './ClientHeroCarousel';
import ClientProductCard from './ClientProductCard';
import { PRODUCTS, TAKAPAY_CATEGORIES, rebuildCategories } from '../../data/clientStore';

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
    const handleCategoriesUpdated = (event) => {
      if (Array.isArray(event.detail)) rebuildCategories(event.detail);
      setCategories([...TAKAPAY_CATEGORIES]);
    };
    window.addEventListener('takapay_categories_updated', handleCategoriesUpdated);
    return () => window.removeEventListener('takapay_categories_updated', handleCategoriesUpdated);
  }, []);

  const displayProducts = Array.isArray(products) && products.length > 0 ? products : PRODUCTS;
  const popular = displayProducts.slice(0, 8);

  // Produits en promotion réelle (remise ou promotion active)
  const promoProducts = useMemo(() => {
    const pool = Array.isArray(displayProducts) ? displayProducts : [];
    return pool.filter(
      (p) =>
        (p.o && Number(p.o) > Number(p.p)) ||
        Boolean(p.promotion) ||
        Boolean(p.is_promo) ||
        (p.o && Number(p.o) > 0)
    );
  }, [displayProducts]);

  // Rayon par catégorie réelle : on garde uniquement le rayon Alimentation
  const categorySections = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];
    const pool = Array.isArray(displayProducts) ? displayProducts : [];
    return categories
      .filter((cat) => {
        const catName = (cat.name || cat.nom || '').trim().toLowerCase();
        return catName === 'alimentation';
      })
      .map((cat) => {
        const catName = cat.name || cat.nom;
        const items = pool.filter((p) => {
          const pCat = p.c || p.category || p.categorie || '';
          return pCat.toLowerCase() === (catName || '').toLowerCase();
        });
        return { name: catName, items };
      })
      .filter((sec) => sec.items.length > 0);
  }, [categories, displayProducts]);

  return (
    <div>
      {/* 1. Carrousel d'accueil & articles dynamiques */}
      <ClientHeroCarousel
        products={displayProducts}
        onSelectProduct={onSelectProduct}
        onGoCatalog={onGoCatalog}
        onSelectPromo={onSelectPromo}
      />

      {/* 2. Bande de réassurance (4 piliers Takapay - Pleine Largeur) */}
      <section className="home-reassurance-bar" aria-label="Engagements et garanties Takapay">
        <div className="home-reassurance-grid">
          <div className="home-reassurance-item">
            <div className="home-reassurance-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div className="home-reassurance-text">
              <strong>Paiement sécurisé</strong>
              <span>MTN MoMo & Moov Money via FeexPay</span>
            </div>
          </div>

          <div className="home-reassurance-item">
            <div className="home-reassurance-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            <div className="home-reassurance-text">
              <strong>Cagnotte 100% libre</strong>
              <span>Cotisez à votre rythme, 0 frais cachés</span>
            </div>
          </div>

          <div className="home-reassurance-item">
            <div className="home-reassurance-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="home-reassurance-text">
              <strong>Livraison garantie</strong>
              <span>Partout au Bénin dès 100% ou comptant</span>
            </div>
          </div>

          <div className="home-reassurance-item">
            <div className="home-reassurance-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="home-reassurance-text">
              <strong>Assistance directe</strong>
              <span>Support WhatsApp & appel dédié</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Nos Catégories (Nom en dessous, agrandissement au hover) */}
      {categories.length > 0 && (
        <section className="home-categories-cards-section" aria-label="Catégories d'articles">
          <div className="client-sh" style={{ marginBottom: '18px' }}>
            <div>
              <h2>Nos Catégories</h2>
              <small>Explorez notre catalogue par univers d'articles</small>
            </div>
          </div>

          <div className="home-categories-grid">
            {categories.map((cat) => (
              <button
                key={cat.id || cat.name}
                type="button"
                className="home-category-item"
                onClick={() => onSelectCategory(cat.name)}
                title={`Explorer la catégorie ${cat.name}`}
              >
                <div className="home-category-card">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="home-category-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="home-category-card-fallback"
                    style={{ display: cat.image ? 'none' : 'flex' }}
                  >
                    <span style={{ fontSize: '40px' }}>{cat.icon || '🛍️'}</span>
                  </div>
                </div>
                <span className="home-category-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. Rayon Promotions (en premier) */}
      <section className="home-promos-section" style={{ marginBottom: '36px' }} aria-label="Rayon Promotions">
        <div className="client-sh">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--r, #c62828)' }}>🔥</span> Rayon Promotions
            </h2>
            <small>Profitez de nos offres exclusives et réductions immédiates</small>
          </div>
          <button
            type="button"
            className="see-all"
            onClick={onSelectPromo || onGoCatalog}
          >
            Voir toutes les promotions →
          </button>
        </div>

        {promoProducts.length > 0 ? (
          <div className="client-grid">
            {promoProducts.slice(0, 8).map((p) => (
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
              padding: '36px 20px',
              color: 'var(--mu)',
              margin: '12px 0',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏷️</div>
            <strong style={{ fontSize: '15px', display: 'block', color: 'var(--tx)' }}>
              Aucune promotion disponible pour le moment
            </strong>
            <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
              Les articles avec remise apparaîtront ici dès leur activation dans le dashboard.
            </p>
          </div>
        )}
      </section>

      {/* 5. Produits populaires (puis produits populaires) */}
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
          Voir tout le catalogue →
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

      {/* 5. Bannière intermédiaire de réassurance cagnotte libre */}
      <section className="home-promo-strip" aria-label="Avantages de la cagnotte Takapay">
        <div className="home-promo-strip-content">
          <h3>Épargnez sans contrainte, recevez votre colis à 100 %</h3>
          <p>
            Avec Takapay, vous n'êtes soumis à aucune échéance mensuelle obligatoire. Cotisez selon vos disponibilités par MTN MoMo ou Moov Money en toute liberté et sans frais cachés.
          </p>
        </div>
        <button
          type="button"
          className="home-promo-strip-btn"
          onClick={onGoCatalog}
        >
          Explorer le catalogue
        </button>
      </section>

      {/* 6. Rayons par catégorie réelle existante */}
      {categorySections.map(({ name, items }) => (
        <section key={name} style={{ marginBottom: '36px' }}>
          <div className="client-sh">
            <div>
              <h2>Rayon {name}</h2>
              <small>{items.length} article{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}</small>
            </div>
            <button
              type="button"
              className="see-all"
              onClick={() => onSelectCategory(name)}
            >
              Voir tout le rayon →
            </button>
          </div>
          <div className="client-grid">
            {items.slice(0, 4).map((p) => (
              <ClientProductCard
                key={p.id}
                product={p}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </section>
      ))}

      {/* 7. Footer officiel Takapay */}
      <footer className="client-footer">
        <div className="client-footer-grid">
          <div className="client-footer-brand">
            <h4>
              <span style={{ color: 'var(--r)' }}>TAKAPAY</span> BÉNIN
            </h4>
            <p>
              La solution béninoise d'achat progressif et d'épargne libre pour tous vos équipements, appareils et produits du quotidien.
            </p>
            <div className="client-footer-badges">
              <span className="client-footer-badge">🔒 Paiements sécurisés</span>
              <span className="client-footer-badge">📱 MTN MoMo</span>
              <span className="client-footer-badge">⚡ Moov Money</span>
              <span className="client-footer-badge">🚀 FeexPay</span>
            </div>
          </div>

          <div className="client-footer-col">
            <h5>Engagements & Garanties</h5>
            <ul>
              <li><span>✓ Cagnotte 100% libre sans intérêts</span></li>
              <li><span>✓ 0 frais cachés sur les versements</span></li>
              <li><span>✓ Livraison à domicile & points relais</span></li>
              <li><span>✓ Remboursement garanti en cas d'annulation</span></li>
            </ul>
          </div>

          <div className="client-footer-col">
            <h5>Assistance & Contacts</h5>
            <ul>
              <li>
                <a href="tel:+2290190000000">📞 Appel direct : +229 01 90 00 00</a>
              </li>
              <li>
                <a href="https://wa.me/2290190000000" target="_blank" rel="noopener noreferrer">💬 Service WhatsApp</a>
              </li>
              <li>
                <span>📍 Cotonou, République du Bénin</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="client-footer-bottom">
          <span>© {new Date().getFullYear()} Takapay. Tous droits réservés.</span>
          <span>Achetez au comptant ou constituez votre cagnotte à votre rythme.</span>
        </div>
      </footer>
    </div>
  );
}
