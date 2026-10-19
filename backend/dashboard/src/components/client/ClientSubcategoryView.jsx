import ClientProductCard from './ClientProductCard';
import { PRODUCTS } from '../../data/clientStore';

export default function ClientSubcategoryView({
  category,
  subcategory,
  isPromoOnly,
  onBack,
  onSelectProduct,
}) {
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

  const list = PRODUCTS.filter((p) => {
    if (isPromoOnly) return Boolean(p.o);
    const catOk = !category || category === 'Tous' || matchCategory(p.c, category);
    const subOk = !subcategory || matchSubcategory(p.subcategory, subcategory);
    return catOk && subOk;
  });

  const title = isPromoOnly ? 'Offres en Promotion' : subcategory || category;
  const subtitle = isPromoOnly ? 'Sélection spéciale TakaPay' : category;

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
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📦</div>
          <strong style={{ fontSize: '16px', display: 'block', color: 'var(--tx)' }}>
            Aucun article disponible pour le moment dans {subcategory || category}
          </strong>
          <p style={{ margin: '6px 0 16px', fontSize: '13px' }}>
            Les nouveaux articles créés dans cette catégorie apparaîtront automatiquement ici.
          </p>
          <button
            type="button"
            className="client-btn client-btn-secondary"
            onClick={onBack}
            style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '99px' }}
          >
            Explorer d'autres catégories
          </button>
        </div>
      )}

      {/* Bouton inférieur pour revenir au catalogue */}
      <div style={{ marginTop: '40px', marginBottom: '24px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          className="client-btn client-btn-secondary"
          onClick={onBack}
          style={{
            padding: '13px 32px',
            fontSize: '15px',
            borderRadius: '99px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--cd)',
            border: '1.5px solid var(--bd)',
            color: 'var(--tx)',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          <span>←</span>
          <span>Retour au catalogue</span>
        </button>
      </div>
    </div>
  );
}
