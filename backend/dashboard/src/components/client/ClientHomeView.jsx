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

      <div className="client-grid">
        {popular.map((p) => (
          <ClientProductCard
            key={p.id}
            product={p}
            onSelect={onSelectProduct}
          />
        ))}
      </div>
    </div>
  );
}
