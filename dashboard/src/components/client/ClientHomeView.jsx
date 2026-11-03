import { useState, useEffect, useMemo } from 'react';
import ClientHeroCarousel from './ClientHeroCarousel';
import ClientPartnersStrip from './ClientPartnersStrip';
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
    <div className="client-home-page">
      {/* 1. Carrousel d'accueil & articles dynamiques */}
      <ClientHeroCarousel
        products={displayProducts}
        onSelectProduct={onSelectProduct}
        onGoCatalog={onGoCatalog}
        onSelectPromo={onSelectPromo}
      />

      <ClientPartnersStrip />

      {/* Conteneur centré pour les sections de contenu */}
      <div className="home-content-container">
        {/* 3. Nos Catégories (Nom en dessous, agrandissement au hover) */}
      {categories.length > 0 && (
        <section id="nos-categories" className="home-categories-cards-section" aria-label="Catégories d'articles">
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
                    <span
                      className="material-symbols-outlined notranslate"
                      translate="no"
                      style={{ fontSize: '38px', color: 'var(--r, #c62828)' }}
                    >
                      category
                    </span>
                  </div>
                </div>
                <span className="home-category-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. Promotions actives (en premier) */}
      <section className="home-promos-section" style={{ marginBottom: '36px' }} aria-label="Promotions actives">
        <div className="client-sh">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="material-symbols-outlined notranslate"
                translate="no"
                style={{ color: 'var(--r, #c62828)', fontSize: '24px' }}
              >
                local_fire_department
              </span>
              Promotions actives
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
            <span
              className="material-symbols-outlined notranslate"
              translate="no"
              style={{ fontSize: '38px', color: 'var(--mu, #706966)', display: 'block', margin: '0 auto 8px' }}
            >
              sell
            </span>
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
          <span
            className="material-symbols-outlined notranslate"
            translate="no"
            style={{ fontSize: '38px', color: 'var(--mu, #706966)', display: 'block', margin: '0 auto 8px' }}
          >
            inventory_2
          </span>
          <strong style={{ fontSize: '16px', display: 'block', color: 'var(--tx)' }}>
            Aucun produit disponible pour le moment
          </strong>
          <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
            Les nouveaux articles créés dans le dashboard apparaîtront ici dès leur ajout.
          </p>
        </div>
      )}

      <ReassuranceBar />

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
      </div>

      {/* 7. Footer officiel Takapay épuré */}
      <footer className="client-footer">
        <div className="client-footer-grid">
          {/* Colonne 1 : À propos & Paiement */}
          <div className="client-footer-brand">
            <h4>
              <span style={{ color: 'var(--r)' }}>TAKAPAY</span> BÉNIN
            </h4>
            <p>
              Plateforme d'achat progressif et d'épargne 100% libre. Achetez au comptant ou constituez votre cagnotte à votre rythme.
            </p>
            <div className="client-footer-badges">
              <span className="client-footer-badge">
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>verified_user</span>
                Paiement sécurisé via FeexPay
              </span>
            </div>
          </div>

          {/* Colonne 2 : Navigation */}
          <div className="client-footer-col">
            <h5>Navigation</h5>
            <ul>
              <li>
                <button type="button" onClick={onGoCatalog}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>storefront</span>
                  Boutique & Catalogue
                </button>
              </li>
              <li>
                <button type="button" onClick={onSelectPromo || onGoCatalog}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>local_fire_department</span>
                  Promotions actives
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('nos-categories');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>category</span>
                  Nos Catégories
                </button>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Assistance & Contacts */}
          <div className="client-footer-col">
            <h5>Assistance & Contacts</h5>
            <ul>
              <li>
                <a href="tel:+2290190000000">
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>call</span>
                  +229 01 90 00 00
                </a>
              </li>
              <li>
                <a href="https://wa.me/2290190000000" target="_blank" rel="noopener noreferrer">
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>chat</span>
                  Assistance WhatsApp dédiée
                </a>
              </li>
              <li>
                <span>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>location_on</span>
                  Cotonou, République du Bénin
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Droits réservés centrés */}
        <div className="client-footer-bottom">
          <span>© {new Date().getFullYear()} Takapay Bénin. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}

function ReassuranceBar() {
  return (
    <section className="home-reassurance-bar" aria-label="Engagements et garanties Takapay">
      <div className="home-reassurance-grid">
        <div className="home-reassurance-item">
          <div className="home-reassurance-icon">
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '28px' }}>
              credit_card
            </span>
          </div>
          <div className="home-reassurance-text">
            <strong>Paiement sécurisé</strong>
            <span>MTN MoMo & Moov Money via FeexPay</span>
          </div>
        </div>

        <div className="home-reassurance-item">
          <div className="home-reassurance-icon">
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '28px' }}>
              savings
            </span>
          </div>
          <div className="home-reassurance-text">
            <strong>Cagnotte 100% libre</strong>
            <span>Cotisez à votre rythme, 0 frais cachés</span>
          </div>
        </div>

        <div className="home-reassurance-item">
          <div className="home-reassurance-icon">
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '28px' }}>
              local_shipping
            </span>
          </div>
          <div className="home-reassurance-text">
            <strong>Livraison garantie</strong>
            <span>Partout au Bénin dès 100% ou comptant</span>
          </div>
        </div>

        <div className="home-reassurance-item">
          <div className="home-reassurance-icon">
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '28px' }}>
              support_agent
            </span>
          </div>
          <div className="home-reassurance-text">
            <strong>Assistance directe</strong>
            <span>Support WhatsApp & appel dédié</span>
          </div>
        </div>
      </div>
    </section>
  );
}
