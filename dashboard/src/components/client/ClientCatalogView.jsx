import { useState, useEffect } from 'react';
import ClientProductCard from './ClientProductCard';
import { CATEGORIES, SUBCATEGORIES_MAP, PRODUCTS, rebuildCategories, resolveImageUrl } from '../../data/clientStore';

export default function ClientCatalogView({
  products = PRODUCTS,
  selectedCategory = 'Tous',
  onSelectCategory,
  onSelectSubcategory,
  onSelectPromo,
  isPromoOnly,
  onSelectProduct,
  searchQuery,
  onSearchChange,
}) {
  const [categoriesList, setCategoriesList] = useState(() => {
    return CATEGORIES.length > 0 ? [...CATEGORIES] : [{ id: 'Tous', name: 'Toutes', icon: '✨' }];
  });
  const [subcategoriesMap, setSubcategoriesMap] = useState(() => ({ ...SUBCATEGORIES_MAP }));
  const [liveProducts, setLiveProducts] = useState(() => {
    return Array.isArray(products) && products.length > 0 ? products : [...PRODUCTS];
  });

  useEffect(() => {
    const handleCatUpdate = (e) => {
      const cats = e.detail;
      if (Array.isArray(cats)) {
        rebuildCategories(cats);
      }
      setCategoriesList([...CATEGORIES]);
      setSubcategoriesMap({ ...SUBCATEGORIES_MAP });
    };

    const handlePrdUpdate = () => {
      setLiveProducts(PRODUCTS.length > 0 ? [...PRODUCTS] : (products || []));
    };

    window.addEventListener('takapay_categories_updated', handleCatUpdate);
    window.addEventListener('takapay_products_updated', handlePrdUpdate);
    return () => {
      window.removeEventListener('takapay_categories_updated', handleCatUpdate);
      window.removeEventListener('takapay_products_updated', handlePrdUpdate);
    };
  }, []);

  useEffect(() => {
    if (Array.isArray(products) && products.length > 0) {
      setLiveProducts(products);
    }
  }, [products]);

  const norm = (str) =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();

  const matchCat = (a, b) => {
    if (!a || !b) return false;
    const na = norm(a);
    const nb = norm(b);
    return na === nb || na.includes(nb) || nb.includes(na);
  };

  // Construction dynamique des cartes de sous-catégories ou macro-catégories
  let subcatCards = [];

  if (isPromoOnly) {
    const promoCount = liveProducts.filter((p) => p.o).length;
    subcatCards = [
      {
        name: 'Promotions en cours',
        category: 'Offres spéciales',
        image: liveProducts.find((p) => p.o)?.im || '',
        count: promoCount,
        icon: '🏷️',
      },
    ];
  } else if (selectedCategory === 'Tous') {
    // Si 'Tous' est sélectionné, lister l'ensemble des sous-catégories de toutes les catégories
    const allSubs = [];
    categoriesList
      .filter((c) => c.id !== 'Tous')
      .forEach((cat) => {
        const subObjs = cat.subcategories || [];
        const subs = subcategoriesMap[cat.name] || subcategoriesMap[cat.id] || subObjs.map((s) => (typeof s === 'string' ? s : s.name));
        subs.forEach((subName) => {
          const matchProducts = liveProducts.filter(
            (p) => matchCat(p.c, cat.name) && matchCat(p.subcategory, subName)
          );

          const subObj = subObjs.find((s) => (typeof s === 'string' ? s : s.name) === subName);
          let subImg = '';
          if (subObj && subObj.image) {
            subImg = resolveImageUrl(subObj.image);
          } else if (matchProducts[0]?.im) {
            subImg = matchProducts[0].im;
          } else if (cat.image) {
            subImg = cat.image;
          } else {
            subImg = '/assets/logo-icon.png';
          }

          allSubs.push({
            name: subName,
            category: cat.name,
            image: subImg,
            count: matchProducts.length,
            icon: cat.icon || '🛍️',
            isMacro: false,
          });
        });
      });

    if (allSubs.length > 0) {
      subcatCards = allSubs;
    } else {
      subcatCards = categoriesList
        .filter((c) => c.id !== 'Tous')
        .map((cat) => ({
          name: cat.name,
          category: 'Catégorie',
          image: cat.image || '/assets/logo-icon.png',
          count: liveProducts.filter((p) => matchCat(p.c, cat.name)).length,
          icon: cat.icon || '🛍️',
          isMacro: true,
        }));
    }
  } else {
    // Pour une catégorie précise, lister ses sous-catégories réelles avec leurs images
    const currentCatObj = categoriesList.find((c) => c.id === selectedCategory || c.name === selectedCategory);
    const subObjs = currentCatObj?.subcategories || [];
    const subs = subcategoriesMap[selectedCategory] || subObjs.map((s) => (typeof s === 'string' ? s : s.name));

    subcatCards = subs.map((subName) => {
      const matchProducts = liveProducts.filter(
        (p) => matchCat(p.c, selectedCategory) && matchCat(p.subcategory, subName)
      );

      // Chercher l'image réelle de la sous-catégorie
      const subObj = subObjs.find((s) => (typeof s === 'string' ? s : s.name) === subName);
      let subImg = '';
      if (subObj && subObj.image) {
        subImg = resolveImageUrl(subObj.image);
      } else if (matchProducts[0]?.im) {
        subImg = matchProducts[0].im;
      } else if (currentCatObj?.image) {
        subImg = currentCatObj.image;
      } else {
        subImg = '/assets/logo-icon.png';
      }

      return {
        name: subName,
        category: selectedCategory,
        image: subImg,
        count: matchProducts.length,
        icon: currentCatObj?.icon || '🛍️',
        isMacro: false,
      };
    });
  }

  // Filtrage des articles pour la grille
  const filteredProducts = liveProducts.filter((p) => {
    if (isPromoOnly && !p.o) return false;
    if (selectedCategory !== 'Tous' && !matchCat(p.c, selectedCategory)) return false;
    if (searchQuery && searchQuery.trim()) {
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
            {isPromoOnly
              ? 'Offres du moment'
              : selectedCategory !== 'Tous'
                ? `Catalogue · ${selectedCategory}`
                : 'Catalogue des sous-catégories'}
          </h2>
          <small>
            {searchQuery
              ? `Résultats pour « ${searchQuery} » (${filteredProducts.length} articles trouvés)`
              : 'Cliquez sur une sous-catégorie pour découvrir ses articles'}
          </small>
        </div>
      </div>

      {/* Onglets des catégories (Chips) synchronisés avec la base de données */}
      <div className="chips">
        {categoriesList.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`chip ${!isPromoOnly && (selectedCategory === cat.id || selectedCategory === cat.name) ? 'on' : ''}`}
            onClick={() => onSelectCategory(cat.id === 'Tous' ? 'Tous' : cat.name)}
          >
            {cat.icon || '🛍️'} {cat.name}
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

      {/* Mention en l'absence de sous-catégories pour la catégorie sélectionnée */}
      {!searchQuery && selectedCategory !== 'Tous' && !isPromoOnly && subcatCards.length === 0 && (
        <div
          style={{
            margin: '20px 0 24px',
            padding: '24px 20px',
            borderRadius: '16px',
            background: 'rgba(0, 0, 0, 0.02)',
            border: '1.5px dashed #d1d5db',
            textAlign: 'center',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '32px', color: '#9ca3af', marginBottom: '8px', display: 'block' }}
          >
            category
          </span>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tx, #1f2937)', marginBottom: '4px' }}>
            Aucune sous-catégorie disponible pour cette catégorie
          </div>
          <div style={{ fontSize: '13px', color: 'var(--mu, #6b7280)' }}>
            Veuillez sélectionner une autre catégorie.
          </div>
        </div>
      )}

      {/* Cartes des sous-catégories */}
      {!searchQuery && subcatCards.length > 0 && (
        <>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--mu)', margin: '14px 0 8px', letterSpacing: '.4px' }}>
            {isPromoOnly ? 'Sélection en promotion' : 'Sous-catégories disponibles'}
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
                    onSelectSubcategory(sub.name, sub.category);
                  }
                }}
              >
                <span className="subcategory-image">
                  <img
                    src={sub.image}
                    alt={sub.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/assets/logo-icon.png';
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

      {/* Si recherche textuelle active, afficher les résultats correspondants */}
      {searchQuery && searchQuery.trim() ? (
        <div style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--tx)', margin: 0 }}>
              Résultats de recherche ({filteredProducts.length})
            </h3>
          </div>

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
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📦</div>
              <strong style={{ fontSize: '16px', display: 'block', color: 'var(--tx)' }}>
                Aucun article trouvé pour « {searchQuery} »
              </strong>
              <p style={{ margin: '6px 0 16px', fontSize: '13px' }}>
                Essayez d’autres termes de recherche ou parcourez nos sous-catégories ci-dessus.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
