import { formatFCFA, discountPercentage } from '../../data/clientStore';

export default function ClientProductCard({ product, onSelect }) {
  const discount = discountPercentage(product);

  return (
    <button
      type="button"
      className="client-card"
      onClick={() => onSelect(product.id)}
      aria-label={`Voir ${product.n}`}
    >
      {product.o && discount > 0 && (
        <span className="tag">Promo −{discount}%</span>
      )}

      <div className="ph">
        <img
          src={product.im}
          alt={product.n}
          loading="lazy"
          onError={(e) => {
            e.target.src = '/assets/category-phones.jpg';
          }}
        />
      </div>

      <div className="in">
        <h3>{product.n}</h3>
        
        {/* Prix de seuil de livraison en ROUGE bien visible */}
        <div className="card-price-monthly">
          À partir de {formatFCFA(product.seuilLivraison ?? product.payment?.seuilLivraison ?? product.seuil_livraison ?? Math.round(product.p * 0.4))}
        </div>

        <div className="pr">
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--mu)', marginRight: '4px' }}>Total :</span>
          {formatFCFA(product.p)}
          {product.o && <s>{formatFCFA(product.o)}</s>}
        </div>

        <div className="card-footer-row">
          <span className="st">
            {product.stockCount !== null ? `${product.stockCount} en stock` : 'Stock à confirmer'}
          </span>
          <span className="card-detail-action">
            Voir détails →
          </span>
        </div>
      </div>
    </button>
  );
}
