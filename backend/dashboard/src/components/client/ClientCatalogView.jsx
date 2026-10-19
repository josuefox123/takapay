import { useState, useEffect } from 'react';
import ClientProductCard from './ClientProductCard';
import { CATEGORIES, SUBCATEGORIES_MAP, PRODUCTS } from '../../data/clientStore';

export default function ClientCatalogView({
  selectedCategory,
  onSelectCategory,
  onSelectSubcategory,
  onSelectPromo,
  isPromoOnly,
  onSelectProduct,
  searchQuery,
  onSearchChange,
}) {
  const [, setCatTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setCatTick((t) => t + 1);
    window.addEventListener('takapay_categories_updated', handleUpdate);
    return () => window.removeEventListener('takapay_categories_updated', handleUpdate);
  }, []);

  // Construire la liste des sous-catégories à afficher en cartes
  let subcatCards;
  const norm = (str) =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const matchCat = (a, b) => {
    if (!a || !b) return false;
    const na = norm(a);
    const nb = norm(b);
    return na === nb || na.includes(nb) || nb.includes(na);
  };

  if (isPromoOnly) {
    const promoCount = PRODUCTS.filter((p) => p.o).length;
    subcatCards = [
      {
        name: 'Promotions en cours',
        category: 'Offres spéciales',
        image: PRODUCTS.find((p) => p.o)?.im || '/assets/campaign-deals.jpg',
        count: promoCount,
        icon: '🏷️',
      },
    ];
  } else if (selectedCategory === 'Tous') {
    // Si 'Tous' est sélectionné, afficher les macro-catégories sous forme de cartes d'exploration
    subcatCards = CATEGORIES.filter((c) => c.id !== 'Tous').map((cat) => ({
      name: cat.name,
      category: 'Catégorie',
      image: cat.image,
      count: PRODUCTS.filter((p) => matchCat(p.c, cat.name)).length,
      icon: cat.icon,
      isMacro: true,
    }));
  } else {
    // Pour une catégorie précise, lister ses sous-catégories
    const subs = SUBCATEGORIES_MAP[selectedCategory] || [];
    subcatCards = subs.map((subName) => {
      const matchProducts = PRODUCTS.filter(
        (p) => matchCat(p.c, selectedCategory) && matchCat(p.subcategory, subName)
      );
      return {
        name: subName,
        category: selectedCategory,
        image: matchProducts[0]?.im || '/assets/category-phones.jpg',
        count: matchProducts.length,
        icon: CATEGORIES.find((c) => c.id === selectedCategory)?.icon || '🛍️',
        isMacro: false,
      };
    });
  }

  // Filtrage des produits si recherche active
  const filteredProducts = PRODUCTS.filter((p) => {
    if (isPromoOnly && !p.o) return false;
    if (selectedCategory !== 'Tous' && !matchCat(p.c, selectedCategory)) return false;
    if (searchQuery.trim()) {
      const q = norm(searchQuery);
      return (
        norm(p.n).includes(q) ||
        norm(p.c).includes(q) ||
        norm(p.subcategory || '').includes(q) ||
        norm(p.d).includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* En-tête du catalogue */}
      <div className="client-sh">
        <div>
          <h2>
            {isPromoOnly ? 'Offres du moment' : selectedCategory !== 'Tous' ? `Catalogue · ${selectedCategory}` : 'Catalogue des articles'}
          </h2>
          <small>
            {searchQuery
              ? `Résultats pour « ${searchQuery} » (${filteredProducts.length} articles trouvés)`
              : selectedCategory !== 'Tous'
                ? 'Choisissez une sous-catégorie pour voir les fiches correspondantes'
                : 'Explorez par catégorie ou sous-catégorie pour trouver votre produit idéal'}
          </small>
        </div>
      </div>

      {/* Onglets des catégories (Chips) */}
      <div className="chips">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`chip ${!isPromoOnly && selectedCategory === cat.id ? 'on' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}

        <button
          type="button"
          className={`chip ${isPromoOnly ? 'on' : ''}`}
          onClick={onSelectPromo}
        >
          🏷 Promotions
        </button>
      </div>

      {/* Cartes des sous-catégories si pas de recherche active */}
      {!searchQuery && subcatCards.length > 0 && (
        <>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--mu)', margin: '14px 0 6px', letterSpacing: '.4px' }}>
            {isPromoOnly ? 'Sélection en promotion' : selectedCategory === 'Tous' ? 'Univers disponibles' : 'Sous-catégories'}
          </div>

          <div className="subcategory-grid">
            {subcatCards.map((sub, i) => (
              <button
                key={i}
                type="button"
                className="subcategory-card"
                onClick={() => {
                  if (sub.isMacro) {
                    onSelectCategory(sub.name);
                  } else {
                    onSelectSubcategory(sub.name);
                  }
                }}
              >
                <span className="subcategory-image">
                  <img
                    src={sub.image}
                    alt={sub.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/assets/category-phones.jpg';
                    }}
                  />
                  <span className="subcategory-count">
                    {sub.count} article{sub.count === 1 ? '' : 's'}
                  </span>
                </span>

                <span className="subcategory-copy">
                  <small>{sub.category}</small>
                  <b>{sub.icon} {sub.name}</b>
                  <span>Explorer →</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Liste des produits (si recherche ou si sous-catégorie ouverte) */}
      {searchQuery && (
        <div style={{ marginTop: '20px' }}>
          {filteredProducts.length > 0 ? (
            <div className="client-grid">
              {filteredProducts.map((p) => (
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
                padding: '48px 20px',
                color: 'var(--mu)',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔍</div>
              <strong style={{ fontSize: '16px', display: 'block', color: 'var(--tx)' }}>
                Aucun article trouvé pour « {searchQuery} »
              </strong>
              <p style={{ margin: '6px 0 16px', fontSize: '13px' }}>
                Essayez un autre terme de recherche ou explorez nos catégories ci-dessus.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
