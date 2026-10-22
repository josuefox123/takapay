import { useState } from 'react';
import { formatFCFA, discountPercentage, formatClientDate, PRODUCTS, resolveImageUrl } from '../../data/clientStore';

export default function ClientProductDetail({
  productId,
  product: propProduct,
  onBack,
  onStartOrder,
  onSelectProduct,
}) {
  const product = propProduct || PRODUCTS.find((p) => p.id === Number(productId)) || PRODUCTS[0];
  const [selectedGallery, setSelectedGallery] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);

  const images = (product.images && product.images.length > 0) ? product.images : [product.im];
  const currentImage = images[Math.min(selectedGallery, images.length - 1)];

  // Produits similaires
  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && (p.subcategory === product.subcategory || p.c === product.c)
  ).slice(0, 4);

  const colors = product.colors || [];
  const chosenColor = colors[selectedColor] || colors[0];

  // Calcul du prix dynamique selon la couleur sélectionnée
  const hasCustomPrice = Boolean(chosenColor?.hasCustomPrice && chosenColor?.price);
  const currentPrice = hasCustomPrice ? Number(chosenColor.price) : Number(product.p || 0);
  const currentOldPrice = chosenColor?.oldPrice !== undefined && chosenColor?.oldPrice !== null
    ? chosenColor.oldPrice
    : (!hasCustomPrice ? product.o : null);

  const discount = currentOldPrice && currentOldPrice > currentPrice
    ? Math.round((1 - currentPrice / currentOldPrice) * 100)
    : 0;

  // Modalités financières dynamiquement recalculées selon le prix de la couleur choisie
  const pay = product.payment || {};
  const isCash = pay.mode === 'cash';
  const isLibre = pay.mode === 'libre';
  const cashPrice = Number(product.prix_cash || pay.prixCash || 0);

  // 1er versement minimum (10% par défaut ou valeur proportionnelle)
  const basePrice = Number(product.p) > 0 ? Number(product.p) : 1;
  const priceRatio = currentPrice / basePrice;
  const minStart = hasCustomPrice
    ? Math.round(currentPrice * 0.1)
    : (pay.minimumStart ? Math.round(pay.minimumStart * priceRatio) : Math.round(currentPrice * 0.1));

  // Durée de disponibilité catalogue en mois (pour calculs échelonnés)
  const durationMonths = Number(product.duree || (product.availabilityDuration ? parseInt(product.availabilityDuration) : 6) || 6);

  // Versement périodique échelonné
  const remainingToPay = Math.max(0, currentPrice - minStart);
  const installmentAmount = hasCustomPrice
    ? Math.round(remainingToPay / durationMonths)
    : (pay.installmentAmount ? Math.round(pay.installmentAmount * priceRatio) : Math.round(remainingToPay / durationMonths));

  // Durée estimée calculée mathématiquement
  const estimatedPeriods = installmentAmount > 0 ? Math.ceil(remainingToPay / installmentAmount) : durationMonths;
  const freqLabel = pay.frequency === 'hebdomadaire' ? 'semaines' : pay.frequency === 'journaliere' ? 'jours' : 'mois';
  const estimatedDurationText = isLibre ? 'Libre (à votre rythme)' : `${estimatedPeriods} ${freqLabel}`;

  // Seuil de livraison anticipée (40%)
  const deliveryThreshold = Math.round(currentPrice * 0.4);

  // Catégorie et sous-catégorie sécurisées
  const categoryName =
    product.c ||
    product.category ||
    product.categorie_nom ||
    product.categorie?.nom ||
    product.sous_categorie?.categorie?.nom ||
    'Catalogue';

  const subcategoryName =
    product.subcategory ||
    product.sous_categorie_nom ||
    (typeof product.sous_categorie === 'string' ? product.sous_categorie : product.sous_categorie?.nom) ||
    'Article';

  return (
    <div className="page-shell">
      {/* Barre supérieure : Retour & Fil d'Ariane Catégorie / Sous-catégorie */}
      <div className="page-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <button
          type="button"
          className="back-link"
          onClick={onBack}
        >
          ← Retour aux articles
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
          <span style={{ color: 'var(--tx)', opacity: 0.75 }}>{categoryName}</span>
          <span style={{ color: 'var(--mu)', opacity: 0.5 }}>›</span>
          <span style={{ color: 'var(--r)', background: 'rgba(220, 38, 38, 0.08)', padding: '3px 10px', borderRadius: '8px', fontWeight: 700 }}>
            {subcategoryName}
          </span>
        </div>
      </div>

      <div className="product-layout">
        {/* Colonne gauche : Galerie photos & vidéo */}
        <div>
          <div className="gallery-main">
            {selectedGallery === 'video' && product.video ? (
              <video
                src={resolveImageUrl(typeof product.video === 'string' ? product.video : product.video?.chemin)}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '16px' }}
                autoPlay
              />
            ) : (
              <img
                src={currentImage}
                alt={product.n}
                onError={(e) => {
                  e.target.style.opacity = '0';
                }}
              />
            )}
          </div>

          <div className="gallery-thumbs">
            {images.map((im, idx) => (
              <button
                key={idx}
                type="button"
                className={`gallery-thumb ${idx === selectedGallery ? 'on' : ''}`}
                onClick={() => setSelectedGallery(idx)}
              >
                <img src={im} alt="" />
              </button>
            ))}

            {product.video && (
              <button
                type="button"
                className={`gallery-thumb ${selectedGallery === 'video' ? 'on' : ''}`}
                onClick={() => setSelectedGallery('video')}
                title="Lire la vidéo du produit"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  background: '#1c1b22',
                  color: '#fff',
                  fontSize: '20px',
                }}
              >
                ▶
              </button>
            )}

            {images.length < 2 && !product.video && (
              <div className="gallery-more">
                <span>📷</span>
                <span>Visuels officiels vérifiés TakaPay</span>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : Fiche détaillée réorganisée */}
        <div className="product-info">
          {/* 1. INFORMATIONS DE CATÉGORIE ET SOUS-CATÉGORIE AU DÉBUT */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: 'var(--tx)', opacity: 0.75 }}>{categoryName}</span>
              <span style={{ color: 'var(--mu)', opacity: 0.5 }}>›</span>
              <span style={{ color: 'var(--r)', background: 'rgba(220, 38, 38, 0.08)', padding: '3px 10px', borderRadius: '8px', fontWeight: 700 }}>
                {subcategoryName}
              </span>
            </div>
            <span className="stock-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              {product.stockCount !== null ? `${product.stockCount} disponibles` : 'En stock'}
            </span>
          </div>

          {/* 2. TITRE DU PRODUIT ET DESCRIPTION */}
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 10px', lineHeight: 1.25, color: 'var(--tx)' }}>
            {product.n}
          </h1>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--mu)', margin: '0 0 18px' }}>
            {product.d}
          </p>

          {/* 3. DISPONIBILITÉ & STOCK */}
          <div className="product-availability" style={{ margin: '0 0 20px' }}>
            <div>
              <small>Stock disponible</small>
              <b>{product.stockCount !== null ? `${product.stockCount} unités vérifiées` : 'Disponible'}</b>
            </div>
            <div>
              <small>Disponibilité offre</small>
              <b>{product.availabilityDuration || `${durationMonths} mois`}</b>
            </div>
          </div>

          {/* 4. CHOIX DES COULEURS (PLACÉ AVANT LE PRIX SELON LA DEMANDE) */}
          {colors.length > 0 && (
            <div style={{ margin: '0 0 20px', padding: '16px', background: 'var(--sf)', borderRadius: '16px', border: '1.5px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 800, color: 'var(--tx)', letterSpacing: '-0.2px' }}>
                  🎨 Choisissez une couleur / déclinaison *
                </label>
                <span style={{ fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                  Sélection : <strong style={{ color: 'var(--tx)' }}>{chosenColor?.name || 'Standard'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {colors.map((c, i) => {
                  const isSelected = selectedColor === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedColor(i)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--r)' : '1.5px solid var(--bd)',
                        background: isSelected ? 'var(--cd)' : 'var(--bg)',
                        boxShadow: isSelected ? '0 4px 14px rgba(220, 38, 38, 0.15)' : 'none',
                        transform: isSelected ? 'translateY(-1px)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease-in-out',
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: c.hex,
                          border: '1.5px solid rgba(0,0,0,0.15)',
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: 'var(--tx)' }}>
                        {c.name}
                      </span>
                      {isSelected && (
                        <span style={{ color: 'var(--r)', fontWeight: 800, fontSize: '14px', marginLeft: '2px' }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. PRIX DYNAMIQUE DU PRODUIT (SYNCHRONISÉ AVEC LA COULEUR) */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--r)', letterSpacing: '-0.5px' }}>
                {formatFCFA(currentPrice)}
              </span>
              {currentOldPrice && (
                <s style={{ fontSize: '18px', color: 'var(--mu)', fontWeight: 500 }}>
                  {formatFCFA(currentOldPrice)}
                </s>
              )}
              {discount > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '99px', background: 'rgba(220, 38, 38, 0.12)', color: 'var(--r)' }}>
                  −{discount}%
                </span>
              )}
            </div>
            {hasCustomPrice && (
              <div style={{ fontSize: '12px', color: 'var(--mu)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>✨</span>
                <span>Tarif ajusté spécifiquement pour la déclinaison <strong>{chosenColor.name}</strong></span>
              </div>
            )}
            {cashPrice > 0 && (
              <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(22, 163, 74, 0.08)', borderRadius: '10px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>
                  💵 Option achat comptant (Cash) :
                </span>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#16a34a' }}>
                  {formatFCFA(cashPrice)}
                </span>
              </div>
            )}
          </div>

          {/* Bannière validité de la promo */}
          {currentOldPrice && discount > 0 && (
            <div className="promo-validity" style={{ margin: '0 0 18px' }}>
              <b>Promotion spéciale −{discount}%</b>
              <span>Début : {formatClientDate(product.promotion?.startDate)}</span>
              <span>Fin : {formatClientDate(product.promotion?.endDate)}</span>
            </div>
          )}

          {/* 6. ENCADRÉ TOTAL DES DÉTAILS ET MODALITÉS FINANCIÈRES */}
          <div className="payment-box" style={{ margin: '0 0 20px', padding: '18px 20px', borderRadius: '16px', border: '1.5px solid var(--bd)', background: 'var(--sf)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isLibre ? '#2563eb' : 'var(--r)' }} />
                <b style={{ fontSize: '14px', color: 'var(--tx)', letterSpacing: '-0.2px' }}>
                  Modalités financières · {isCash ? 'Paiement comptant' : isLibre ? 'Cotisation libre' : 'Paiement échelonné'}
                </b>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '99px', background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}>
                PARAMÈTRES DÉDIÉS
              </span>
            </div>

            <div className="payment-grid" style={{ gap: '12px' }}>
              {isCash ? (
                <>
                  <div className="payment-item">
                    <small>Montant total à régler</small>
                    <b>{formatFCFA(currentPrice)}</b>
                  </div>
                  <div className="payment-item">
                    <small>Fréquence</small>
                    <b>En un seul règlement</b>
                  </div>
                </>
              ) : isLibre ? (
                <>
                  <div className="payment-item">
                    <small>1 er versement minimum</small>
                    <b>{formatFCFA(minStart)}</b>
                  </div>
                  <div className="payment-item">
                    <small>Versements suivants</small>
                    <b>Libres (selon votre convenance)</b>
                  </div>
                  <div className="payment-item">
                    <small>Seuil de récupération</small>
                    <b style={{ color: '#16a34a' }}>Aucun seuil à atteindre</b>
                  </div>
                  <div className="payment-item">
                    <small>Fin estimée</small>
                    <b>Selon vos versements</b>
                  </div>
                </>
              ) : (
                <>
                  <div className="payment-item">
                    <small>Prix total ({chosenColor?.name || 'Prix de base'})</small>
                    <b style={{ color: 'var(--r)' }}>{formatFCFA(currentPrice)}</b>
                  </div>
                  {cashPrice > 0 && (
                    <div className="payment-item">
                      <small>Prix au comptant (Cash)</small>
                      <b style={{ color: '#16a34a' }}>{formatFCFA(cashPrice)}</b>
                    </div>
                  )}
                  <div className="payment-item">
                    <small>1 er versement minimum</small>
                    <b>{formatFCFA(minStart)}</b>
                  </div>
                  <div className="payment-item">
                    <small>Versement périodique</small>
                    <b>{formatFCFA(installmentAmount)} / {pay.frequency || 'mois'}</b>
                  </div>
                  <div className="payment-item">
                    <small>Fin estimée (calculée)</small>
                    <b>{estimatedDurationText}</b>
                  </div>
                </>
              )}
            </div>

            {/* Seuil de livraison anticipée en mode échelonné */}
            {!isCash && !isLibre && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'var(--cd)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--bd)' }}>
                <strong style={{ fontSize: '13px', color: 'var(--tx)' }}>
                  Recevez l'article dès {formatFCFA(deliveryThreshold)} cotisés
                </strong>
              </div>
            )}

            <small className="payment-hint" style={{ marginTop: '12px', display: 'block', fontSize: '11px', color: 'var(--mu)', lineHeight: 1.5 }}>
              {isLibre
                ? 'Vous démarrez avec le premier versement minimum, puis vous cotisez à votre convenance en toute liberté.'
                : isCash
                  ? 'Règlement direct sécurisé et expédition prioritaire garantie.'
                  : 'Échéancier transparent et sécurisé. Chaque versement est comptabilisé en direct dans votre espace cagnotte.'}
            </small>
          </div>

          {/* 7. BOUTON DE COMMANDE */}
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="client-btn w100"
              style={{ fontSize: '16px', padding: '16px', borderRadius: '14px', fontWeight: 800 }}
              onClick={() => onStartOrder(product, chosenColor)}
            >
              Passer une commande
            </button>
            <p className="auth-footnote" style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--mu)' }}>
              🔒 Paiement 100% sécurisé via MTN Mobile Money ou Moov Money avec confirmation instantanée.
            </p>
          </div>
        </div>
      </div>

      {/* Produits similaires suggérés */}
      {related.length > 0 && (
        <section className="similar">
          <div className="similar-head">
            <div>
              <h2>Autres articles suggérés</h2>
              <small>Rubrique : {product.subcategory}</small>
            </div>
          </div>

          <div className="similar-grid">
            {related.map((item) => (
              <button
                key={item.id}
                type="button"
                className="similar-card"
                onClick={() => onSelectProduct(item.id)}
              >
                <div className="similar-img-box">
                  <img
                    src={item.im}
                    alt={item.n}
                    onError={(e) => {
                      e.target.style.opacity = '0';
                    }}
                  />
                  {item.o && <span className="similar-promo-badge">Promo</span>}
                </div>
                <div className="similar-copy">
                  <b>{item.n}</b>
                  <div className="similar-from-price">
                    {item.payment?.mode === 'libre'
                      ? 'Cotisation libre · Sans seuil'
                      : `À partir de ${formatFCFA(item.seuilLivraison ?? item.payment?.seuilLivraison ?? item.seuil_livraison ?? Math.round(item.p * 0.4))}`}
                  </div>
                  <div className="similar-total-price">
                    Total : {formatFCFA(item.p)}
                  </div>
                  <div className="similar-footer-row">
                    <span className="card-detail-action">
                      Voir détails →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
