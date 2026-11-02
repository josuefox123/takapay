import React, { useState, useEffect, useMemo } from 'react';
import { formatFCFA, discountPercentage, resolveImageUrl, PRODUCTS } from '../../data/clientStore';
import adminService from '../../services/adminService';
import welcomeBannerImg from '../../assets/imagetakapay.webp';

export default function ClientWelcomeModal({ isOpen, onClose, onSelectProduct, onShowAllPromos, products = [] }) {
  const [dbCarousels, setDbCarousels] = useState(() => {
    try {
      const cached = localStorage.getItem('takapay_public_carousels');
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    adminService
      .getCarousels(false)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setDbCarousels(data);
          try {
            localStorage.setItem('takapay_public_carousels', JSON.stringify(data));
          } catch {
            // Ignorer
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Bannière carrousel vedette provenant du backend
  const activeBanner = useMemo(() => {
    if (!Array.isArray(dbCarousels) || dbCarousels.length === 0) return null;
    return dbCarousels.find((c) => c.is_actif !== false && (c.image_url || c.image)) || dbCarousels[0];
  }, [dbCarousels]);

  // Produits en promotion réels venant de la base de données
  const deals = useMemo(() => {
    const list = Array.isArray(products) && products.length > 0 ? products : PRODUCTS;
    const discounted = list.filter((p) => p && p.o && Number(p.o) > Number(p.p));
    if (discounted.length > 0) return discounted.slice(0, 3);
    return list.slice(0, 3);
  }, [products]);

  if (!isOpen) return null;

  const bannerImgSrc = activeBanner?.image_url || activeBanner?.image
    ? resolveImageUrl(activeBanner.image_url || activeBanner.image)
    : welcomeBannerImg;

  const handleAction = () => {
    onClose();
    const prodId = activeBanner?.produit_id || activeBanner?.produit?.id || (deals.length > 0 ? deals[0].id : null);
    if (prodId && typeof onSelectProduct === 'function') {
      onSelectProduct(prodId);
    } else if (activeBanner?.lien) {
      if (activeBanner.lien.startsWith('http://') || activeBanner.lien.startsWith('https://')) {
        window.open(activeBanner.lien, '_blank');
      } else if (typeof onShowAllPromos === 'function') {
        onShowAllPromos();
      }
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
        style={{
          background: '#ffffff',
          color: '#1b1716',
          borderRadius: '24px',
          maxWidth: '760px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          position: 'relative',
        }}
      >
        {/* Photo de campagne venant du backend carrousel */}
        <div
          className="welcome-photo"
          role="button"
          tabIndex={0}
          onClick={handleAction}
          title={activeBanner?.titre || 'Découvrir la promotion'}
          style={{
            minHeight: '220px',
            maxHeight: '320px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            background: '#1b1716',
          }}
        >
          <img
            src={bannerImgSrc}
            alt={activeBanner?.titre || 'Campagne Takapay'}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '220px',
              maxHeight: '320px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        {/* Contenu et offres avec contraste garanti */}
        <div
          className="welcome-copy"
          style={{
            padding: '24px 28px',
            background: '#ffffff',
            color: '#1b1716',
            position: 'relative',
          }}
        >
          <button
            type="button"
            className="welcome-close"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f3ece7',
              border: 'none',
              fontSize: '22px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              color: '#1b1716',
            }}
          >
            ×
          </button>

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
            {activeBanner?.kicker || (deals.length > 0 && deals[0].o ? '🔥 PROMOTION DU MOMENT' : '🔥 OFFRE DU MOMENT')}
          </span>

          <h2
            id="welcome-title"
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#1b1716',
              margin: '0 0 8px',
              lineHeight: 1.25,
            }}
          >
            {activeBanner?.titre || (deals.length > 0 ? deals[0].n : 'Des réductions exclusives sur vos articles favoris')}
          </h2>

          <p
            style={{
              margin: '0 0 16px',
              color: '#4b443f',
              fontSize: '13.5px',
              lineHeight: 1.5,
            }}
          >
            {activeBanner?.description || (deals.length > 0 && deals[0].d ? deals[0].d : 'Profitez des prix barrés et commencez votre cagnotte dès aujourd’hui à votre propre rythme.')}
          </p>

          {deals.length > 0 && (
            <div className="welcome-deals" style={{ display: 'grid', gap: '8px', marginBottom: '18px' }}>
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #ece5df',
                      background: '#fffdfb',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={p.im}
                      alt={p.n}
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }}
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
            {activeBanner?.texte_bouton?.trim() || (activeBanner?.produit ? `Découvrir ${activeBanner.produit.nom || 'l’article'} →` : (deals.length > 0 ? `Découvrir ${deals[0].n || 'l’article'} →` : 'Découvrir toutes les promotions →'))}
          </button>
        </div>
      </div>
    </div>
  );
}
