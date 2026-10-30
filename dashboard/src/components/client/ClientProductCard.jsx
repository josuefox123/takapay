import { useState, useEffect } from 'react';
import { formatFCFA, discountPercentage } from '../../data/clientStore';

export default function ClientProductCard({ product, onSelect }) {
  const discount = discountPercentage(product);

  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const favs = localStorage.getItem('takapay_user_favorites');
      return favs ? JSON.parse(favs).includes(product.id) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleFavUpdate = () => {
      try {
        const favs = localStorage.getItem('takapay_user_favorites');
        setIsFavorite(favs ? JSON.parse(favs).includes(product.id) : false);
      } catch { /* ignore */ }
    };
    window.addEventListener('takapay_favorites_updated', handleFavUpdate);
    return () => window.removeEventListener('takapay_favorites_updated', handleFavUpdate);
  }, [product.id]);

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    try {
      const raw = localStorage.getItem('takapay_user_favorites');
      const list = raw ? JSON.parse(raw) : [];
      let updated;
      if (list.includes(product.id)) {
        updated = list.filter((id) => id !== product.id);
      } else {
        updated = [...list, product.id];
      }
      localStorage.setItem('takapay_user_favorites', JSON.stringify(updated));
      setIsFavorite(updated.includes(product.id));
      window.dispatchEvent(new CustomEvent('takapay_favorites_updated', { detail: updated }));
    } catch { /* ignore */ }
  };

  return (
    <div
      className="client-card"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(product.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(product.id);
        }
      }}
      aria-label={`Voir ${product.n}`}
      style={{ cursor: 'pointer' }}
    >
      {product.o && discount > 0 && (
        <span className="tag">Promo −{discount}%</span>
      )}

      <div className="ph">
        <button
          type="button"
          onClick={handleToggleFavorite}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-label="Favoris"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 4,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isFavorite ? 'var(--r, #dc2626)' : 'var(--mu, #6e6663)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>

        <img
          src={product.im}
          alt={product.n}
          decoding="async"
          onError={(e) => {
            e.target.style.opacity = '0';
          }}
        />
      </div>

      <div className="in">
        <h3>{product.n}</h3>
        
        {/* Prix de versement / seuil : récupération à 100% en mode libre */}
        <div className="card-price-monthly">
          {product.payment?.mode === 'libre'
            ? 'Cotisation libre · Récupération à 100%'
            : `À partir de ${formatFCFA(product.seuilLivraison ?? product.payment?.seuilLivraison ?? product.seuil_livraison ?? Math.round(product.p * 0.4))}`}
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
    </div>
  );
}

