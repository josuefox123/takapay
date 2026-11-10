import { useState, useEffect } from 'react';
import { resolveImageUrl } from '../../data/clientStore';

export default function ClientWelcomeModal({
  isOpen,
  onClose,
  onSelectProduct,
  onShowAllPromos,
  popupPromos = [],
  popupPromo = null,
}) {
  const items = Array.isArray(popupPromos) && popupPromos.length > 0
    ? popupPromos
    : (popupPromo ? [popupPromo] : []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Réinitialiser à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsPaused(false);
    }
  }, [isOpen]);

  // Défilement automatique doux (toutes les 6 secondes sans barre de progression agressive)
  useEffect(() => {
    if (!isOpen || items.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((idx) => (idx + 1) % items.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isOpen, items.length, isPaused]);

  if (!isOpen || items.length === 0) return null;

  const current = items[currentIndex] || items[0];
  const rawImg = current.image_popup_url || current.image_popup || '';
  const popupImage = rawImg.startsWith('http') || rawImg.startsWith('data:')
    ? rawImg
    : resolveImageUrl(rawImg);

  const pct = Number(current.pourcentage_promo || 0);
  const linkedProductId = current.produit_id || current.produit?.id || null;
  const linkedProductName = current.produit?.nom || null;
  const isCommercialOffer = pct > 0 || Boolean(linkedProductId);

  const goToNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const goToPrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleAction = () => {
    onClose();
    if (linkedProductId && typeof onSelectProduct === 'function') {
      onSelectProduct(linkedProductId);
    } else if (typeof onShowAllPromos === 'function') {
      onShowAllPromos();
    }
  };

  const hasBottomDetails = isCommercialOffer || Boolean(current.titre) || Boolean(current.description);

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
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="welcome-card"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-labelledby="welcome-title"
        style={{
          background: '#ffffff',
          color: '#0f172a',
          maxWidth: '520px',
          width: '100%',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          boxSizing: 'border-box',
        }}
      >
        {/* Bouton de fermeture discret × */}
        <button
          type="button"
          className="welcome-close"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: 35,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)',
            color: '#1e293b',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            fontSize: '18px',
            fontWeight: '700',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
          }}
        >
          ×
        </button>

        {/* Flèches de navigation latérale ‹ et › si plusieurs affiches */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Affiche précédente"
              style={{
                position: 'absolute',
                top: hasBottomDetails ? '38%' : '50%',
                left: '12px',
                transform: 'translateY(-50%)',
                zIndex: 25,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(6px)',
                color: '#1e293b',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Affiche suivante"
              style={{
                position: 'absolute',
                top: hasBottomDetails ? '38%' : '50%',
                right: '12px',
                transform: 'translateY(-50%)',
                zIndex: 25,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(6px)',
                color: '#1e293b',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
              }}
            >
              ›
            </button>
          </>
        )}

        {/* Conteneur de l'image / affiche */}
        <div
          role="button"
          tabIndex={0}
          onClick={isCommercialOffer ? handleAction : undefined}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && isCommercialOffer) {
              event.preventDefault();
              handleAction();
            }
          }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
            maxHeight: hasBottomDetails ? '360px' : '500px',
            minHeight: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isCommercialOffer ? 'pointer' : 'default',
          }}
        >
          {popupImage && (
            <img
              key={current.id || currentIndex}
              src={popupImage}
              alt={current.titre || 'Affiche Takapay'}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: hasBottomDetails ? '360px' : '500px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}

          {pct > 0 && (
            <span
              style={{
                position: 'absolute',
                bottom: '14px',
                left: '14px',
                background: 'var(--r, #c62828)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '12px',
                padding: '5px 12px',
                borderRadius: '99px',
                boxShadow: '0 4px 14px rgba(198, 40, 40, 0.45)',
                zIndex: 10,
                letterSpacing: '0.4px',
              }}
            >
              −{pct}% DE RÉDUCTION
            </span>
          )}
        </div>

        {/* Indicateurs discrets de navigation (points) au lieu de barres de progression */}
        {items.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 0 4px',
              background: '#ffffff',
            }}
          >
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Afficher l'affiche ${idx + 1}`}
                style={{
                  width: idx === currentIndex ? '22px' : '7px',
                  height: '7px',
                  borderRadius: '99px',
                  background: idx === currentIndex ? 'var(--r, #c62828)' : '#cbd5e1',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Détails du bas : offre commerciale VS annonce pure */}
        {hasBottomDetails && (
          <div
            style={{
              background: '#ffffff',
              color: '#0f172a',
              padding: items.length > 1 ? '10px 24px 24px' : '20px 24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {isCommercialOffer && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  color: 'var(--r, #c62828)',
                }}
              >
                {pct > 0 ? `OFFRE SPÉCIALE −${pct}%` : 'OFFRE DU MOMENT'}
              </span>
            )}

            {(current.titre || linkedProductName) && (
              <h2
                id="welcome-title"
                style={{
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0',
                  lineHeight: 1.3,
                  fontSize: '18px',
                }}
              >
                {current.titre || linkedProductName}
              </h2>
            )}

            {current.description && (
              <p
                style={{
                  margin: '4px 0 10px',
                  color: '#64748b',
                  lineHeight: 1.5,
                  fontSize: '13px',
                }}
              >
                {current.description}
              </p>
            )}

            {isCommercialOffer ? (
              <button
                type="button"
                className="client-btn"
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '15px',
                  fontWeight: 800,
                  borderRadius: '12px',
                  marginTop: '6px',
                  background: 'var(--r, #c62828)',
                  color: '#ffffff',
                  boxShadow: '0 6px 18px rgba(198, 40, 40, 0.35)',
                }}
                onClick={handleAction}
              >
                {linkedProductName ? `Découvrir ${linkedProductName} →` : 'Découvrir l’offre →'}
              </button>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  J'ai compris
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
