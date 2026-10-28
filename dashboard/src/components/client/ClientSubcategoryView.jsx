import { useState, useEffect } from 'react';
import ClientProductCard from './ClientProductCard';
import { PRODUCTS } from '../../data/clientStore';

export default function ClientSubcategoryView({
  category,
  subcategory,
  products = [],
  isPromoOnly,
  isFavoritesOnly,
  onBack,
  onSelectProduct,
}) {
  const [favIds, setFavIds] = useState(() => {
    try {
      const stored = localStorage.getItem('takapay_user_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleFavUpdate = (e) => {
      setFavIds(e.detail || []);
    };
    window.addEventListener('takapay_favorites_updated', handleFavUpdate);
    return () => window.removeEventListener('takapay_favorites_updated', handleFavUpdate);
  }, []);

  const norm = (str) =>
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const subNorm = norm(subcategory);
  const catNorm = norm(category);

  const matchCategory = (prodCat, targetCat) => {
    if (!targetCat || targetCat === 'Tous') return true;
    const p = norm(prodCat);
    const t = norm(targetCat);
    if (p === t) return true;
    if (p && t && (p.includes(t) || t.includes(p))) return true;
    return false;
  };

  const matchSubcategory = (prodSub, targetSub) => {
    if (!targetSub || targetSub === 'Tous') return true;
    const p = norm(prodSub);
    const t = norm(targetSub);
    if (p === t) return true;
    if (p && t && (p.includes(t) || t.includes(p))) return true;
    return false;
  };

  const sourceProducts = Array.isArray(products) && products.length > 0 ? products : PRODUCTS;
  const list = sourceProducts.filter((p) => {
    if (isFavoritesOnly) return favIds.includes(p.id);
    if (isPromoOnly) return Boolean(p.o);
    const catOk = !category || category === 'Tous' || matchCategory(p.c, category);
    const subOk = !subcategory || matchSubcategory(p.subcategory, subcategory);
    return catOk && subOk;
  });

  const title = isFavoritesOnly
    ? 'Mes Favoris'
    : isPromoOnly
    ? 'Offres en Promotion'
    : subcategory || category;

  const subtitle = isFavoritesOnly
    ? 'Vos coups de cœur Takapay'
    : isPromoOnly
    ? 'Sélection spéciale TakaPay'
    : category;

  return (
    <div className="page-shell">
      <div className="page-top">
        <button
          type="button"
          className="back-link"
          onClick={onBack}
        >
          ← Retour
        </button>
      </div>

      <div className="client-sh" style={{ margin: '12px 0 20px' }}>
        <div>
          <h2>{title}</h2>
          <small>{subtitle} · {list.length} article{list.length === 1 ? '' : 's'}</small>
        </div>
      </div>

      {list.length > 0 ? (
        <div className="client-grid">
          {list.map((p) => (
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
            margin: '20px 0',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>
            {isFavoritesOnly ? '❤️' : '📦'}
          </div>
          <strong style={{ fontSize: '16px', display: 'block', color: 'var(--tx)' }}>
            {isFavoritesOnly
              ? "Vous n'avez pas encore d'article en favoris"
              : `Aucun article disponible pour le moment dans ${subcategory || category}`}
          </strong>
          <p style={{ margin: '6px 0 16px', fontSize: '13px' }}>
            {isFavoritesOnly
              ? "Cliquez sur l'icône cœur sur n'importe quel article du catalogue pour le retrouver ici facilement."
              : 'Les nouveaux articles créés dans cette catégorie apparaîtront automatiquement ici.'}
          </p>
          <button
            type="button"
            className="client-btn client-btn-secondary"
            onClick={onBack}
            style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '99px' }}
          >
            {isFavoritesOnly ? 'Explorer les articles' : "Explorer d'autres catégories"}
          </button>
        </div>
      )}

    </div>
  );
}
