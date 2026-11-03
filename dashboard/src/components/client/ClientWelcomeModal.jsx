import { useMemo } from 'react';
import { formatFCFA, discountPercentage, resolveImageUrl, PRODUCTS } from '../../data/clientStore';

export default function ClientWelcomeModal({ isOpen, onClose, onSelectProduct, onShowAllPromos, products = [] }) {
  // Produits en promotion réels venant de la base de données
  const deals = useMemo(() => {
    const list = Array.isArray(products) && products.length > 0 ? products : PRODUCTS;
    return list.filter((p) => p && discountPercentage(p) > 0).slice(0, 3);
  }, [products]);

  if (!isOpen || deals.length === 0) return null;

  const featuredDeal = deals[0];
  const rawFeaturedImage = featuredDeal.im || featuredDeal.images?.[0];
  const featuredImagePath = typeof rawFeaturedImage === 'string'
    ? rawFeaturedImage
    : rawFeaturedImage?.chemin || rawFeaturedImage?.url || '';
  const featuredImage = resolveImageUrl(featuredImagePath);

  const handleAction = () => {
    onClose();
    if (featuredDeal.id && typeof onSelectProduct === 'function') {
      onSelectProduct(featuredDeal.id);
    } else if (typeof onShowAllPromos === 'function') {
      onShowAllPromos();
    }
  };

  return (
    <div
      className="welcome-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 12, 11, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="welcome-card"
        aria-labelledby="welcome-title"
        style={{
          background: '#ffffff',
          color: '#1b1716',
        }}
      >
        <button
          type="button"
          className="welcome-close"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
        >
          ×
        </button>

        {/* Visuel principal lié au premier article réellement en promotion */}
        <div
          className="welcome-photo"
          role="button"
          tabIndex={0}
          onClick={handleAction}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleAction();
            }
          }}
          title={`Découvrir ${featuredDeal.n}`}
          style={{
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {featuredImage && (
            <img
              src={featuredImage}
              alt={featuredDeal.n}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                event.currentTarget.nextSibling.style.display = 'flex';
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
          <div
            className="welcome-photo-fallback"
            aria-label="Image du produit non disponible"
            style={{ display: featuredImage ? 'none' : 'flex' }}
          >
            <span className="material-symbols-outlined notranslate" translate="no">sell</span>
          </div>
        </div>

        {/* Contenu et offres avec contraste garanti */}
        <div
          className="welcome-copy"
          style={{
            background: '#ffffff',
            color: '#1b1716',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'var(--r, #dc2626)',
              marginBottom: '6px',
            }}
          >
            PROMOTION DU MOMENT
          </span>

          <h2
            id="welcome-title"
            style={{
              fontWeight: 800,
              color: '#1b1716',
              margin: '0 0 8px',
              lineHeight: 1.25,
            }}
          >
            {featuredDeal.n}
          </h2>

          <p
            style={{
              margin: '0 0 16px',
              color: '#4b443f',
              lineHeight: 1.5,
            }}
          >
            {featuredDeal.d || 'Profitez de cette réduction et commencez votre cagnotte à votre rythme.'}
          </p>

          {deals.length > 0 && (
            <div className="welcome-deals">
              {deals.map((p) => {
                const disc = discountPercentage(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="welcome-deal"
                    onClick={() => {
                      onClose();
                      onSelectProduct(p.id);
                    }}
                  >
                    <img
                      src={p.im}
                      alt={p.n}
                    />
                    <div className="welcome-deal-copy" style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: '13.5px', color: '#1b1716', display: 'block' }}>{p.n}</b>
                      <small style={{ color: '#6b6661', fontSize: '11.5px', marginTop: '2px', display: 'block' }}>
                        <strong style={{ color: 'var(--r, #dc2626)', fontWeight: 800 }}>{formatFCFA(p.p)}</strong>
                        <s style={{ marginLeft: '6px', color: '#9c938f' }}>{formatFCFA(p.o)}</s>
                      </small>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#ffffff',
                        background: 'var(--r, #dc2626)',
                        padding: '3px 8px',
                        borderRadius: '99px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      −{disc}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            className="client-btn"
            style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800 }}
            onClick={handleAction}
          >
            Découvrir {featuredDeal.n || 'cet article'} →
          </button>
        </div>
      </div>
    </div>
  );
}
