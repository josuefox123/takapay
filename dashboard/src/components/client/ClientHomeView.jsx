import ClientHeroCarousel from './ClientHeroCarousel';
import ClientProductCard from './ClientProductCard';
import { PRODUCTS } from '../../data/clientStore';

export default function ClientHomeView({
  onSelectProduct,
  onSelectCategory,
  onSelectPromo,
  onGoCatalog,
  onSearch,
}) {
  const popular = PRODUCTS.slice(0, 8);

  return (
    <div>
      {/* 1. Carrousel des articles en promotion (à la place de la photo d'accueil) */}
      <ClientHeroCarousel onSelectPromo={onSelectPromo} />

      {/* 2. Produits populaires */}
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
