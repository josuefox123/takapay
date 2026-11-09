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
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Réinitialiser à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setProgress(0);
      setIsPaused(false);
    }
  }, [isOpen]);

  // Durée d'affichage de chaque affiche (5 secondes)
  const SLIDE_DURATION = 5000;
  const TICK_INTERVAL = 50;

  useEffect(() => {
    if (!isOpen || items.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % items.length);
          return 0;
        }
        return prev + (100 / (SLIDE_DURATION / TICK_INTERVAL));
      });
    }, TICK_INTERVAL);

    return () => clearInterval(timer);
  }, [isOpen, items.length, isPaused, currentIndex]);

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
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const goToPrev = (e) => {
    if (e) e.stopPropagation();
    setProgress(0);
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
        background: 'rgba(11, 15, 23, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="welcome-card"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-labelledby="welcome-title"
        style={{
          background: '#ffffff',
          color: '#1b1716',
          maxWidth: '520px',
          width: '100%',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Barres de progression fines en haut (style Story Instagram / Revolut) */}
        {items.length > 1 && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '14px',
              right: '54px',
              display: 'flex',
              gap: '6px',
              zIndex: 30,
            }}
          >
            {items.map((_, idx) => {
              let fillWidth = '0%';
              if (idx < currentIndex) fillWidth = '100%';
              else if (idx === currentIndex) fillWidth = `${Math.min(100, Math.max(0, progress))}%`;

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setProgress(0);
                    setCurrentIndex(idx);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Aller à l'affiche ${idx + 1}`}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '99px',
                    background: 'rgba(255, 255, 255, 0.35)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: fillWidth,
                      background: '#ffffff',
                      borderRadius: '99px',
                      transition: idx === currentIndex ? 'none' : 'width 0.2s ease',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Bouton de fermeture discret × */}
        <button
          type="button"
          className="welcome-close"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
          style={{
            position: 'absolute',
            top: '10px',
            right: '12px',
            zIndex: 35,
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            fontSize: '20px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
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
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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
            background: '#090d16',
            maxHeight: hasBottomDetails ? '380px' : '520px',
            minHeight: '260px',
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
                maxHeight: hasBottomDetails ? '380px' : '520px',
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
                background: 'var(--r, #dc2626)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                padding: '5px 12px',
                borderRadius: '99px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                zIndex: 10,
              }}
            >
              −{pct}% PROMO
            </span>
          )}
        </div>

        {/* Détails du bas : offre commerciale VS annonce pure */}
        {hasBottomDetails && (
          <div
            style={{
              background: '#ffffff',
              color: '#1b1716',
              padding: '20px 24px',
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
                  color: 'var(--r, #dc2626)',
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
                  color: '#1b1716',
                  margin: '0',
                  lineHeight: 1.25,
                  fontSize: '19px',
                }}
              >
                {current.titre || linkedProductName}
              </h2>
            )}

            {current.description && (
              <p
                style={{
                  margin: '4px 0 10px',
                  color: '#4b443f',
                  lineHeight: 1.5,
                  fontSize: '14px',
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
                  marginTop: '8px',
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
