import { resolveImageUrl } from '../../data/clientStore';

export default function ClientWelcomeModal({
  isOpen,
  onClose,
  onSelectProduct,
  onShowAllPromos,
  popupPromo = null,
}) {
  if (!isOpen || !popupPromo) return null;

  const rawImg = popupPromo.image_popup_url || popupPromo.image_popup || '';
  const popupImage = rawImg.startsWith('http') || rawImg.startsWith('data:')
    ? rawImg
    : resolveImageUrl(rawImg);

  if (!popupImage) return null;

  const pct = Number(popupPromo.pourcentage_promo || 0);
  const linkedProductId = popupPromo.produit_id || popupPromo.produit?.id || null;
  const linkedProductName = popupPromo.produit?.nom || null;

  const handleAction = () => {
    onClose();
    if (linkedProductId && typeof onSelectProduct === 'function') {
      onSelectProduct(linkedProductId);
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
          maxWidth: '520px',
          width: '100%',
          borderRadius: '22px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
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

        {/* Image personnalisée du Popup envoyée depuis le Back-Office */}
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
          style={{
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            background: '#0f172a',
            maxHeight: '360px',
          }}
        >
          <img
            src={popupImage}
            alt={popupPromo.titre || 'Offre promotionnelle TakaPay'}
            style={{
              width: '100%',
              maxHeight: '360px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {pct > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '14px',
                left: '14px',
                background: 'var(--r, #dc2626)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                padding: '5px 12px',
                borderRadius: '99px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
              }}
            >
              −{pct}% PROMO
            </span>
          )}
        </div>

        {/* Texte & bouton d'action */}
        <div
          className="welcome-copy"
          style={{
            background: '#ffffff',
            color: '#1b1716',
            padding: '22px 24px',
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
            {pct > 0 ? `OFFRE SPÉCIALE −${pct}%` : 'OFFRE DU MOMENT'}
          </span>

          {(popupPromo.titre || linkedProductName) && (
            <h2
              id="welcome-title"
              style={{
                fontWeight: 800,
                color: '#1b1716',
                margin: '0 0 8px',
                lineHeight: 1.25,
                fontSize: '20px',
              }}
            >
              {popupPromo.titre || linkedProductName}
            </h2>
          )}

          {popupPromo.description && (
            <p
              style={{
                margin: '0 0 18px',
                color: '#4b443f',
                lineHeight: 1.5,
                fontSize: '14px',
              }}
            >
              {popupPromo.description}
            </p>
          )}

          <button
            type="button"
            className="client-btn"
            style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, marginTop: popupPromo.description ? 0 : '10px' }}
            onClick={handleAction}
          >
            {linkedProductName ? `Découvrir ${linkedProductName} →` : 'Découvrir l’offre →'}
          </button>
        </div>
      </div>
    </div>
  );
}
