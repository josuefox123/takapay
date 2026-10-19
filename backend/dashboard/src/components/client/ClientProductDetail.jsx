import { useState } from 'react';
import { formatFCFA, discountPercentage, formatClientDate, PRODUCTS } from '../../data/clientStore';

export default function ClientProductDetail({
  productId,
  onBack,
  onStartOrder,
  onSelectProduct,
}) {
  const product = PRODUCTS.find((p) => p.id === Number(productId)) || PRODUCTS[0];
  const [selectedGallery, setSelectedGallery] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);

  const images = (product.images && product.images.length > 0) ? product.images : [product.im];
  const currentImage = images[Math.min(selectedGallery, images.length - 1)];
  const discount = discountPercentage(product);

  // Produits similaires
  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && (p.subcategory === product.subcategory || p.c === product.c)
  ).slice(0, 4);

  const colors = product.colors || [];
  const chosenColor = colors[selectedColor];

  // Rendu des modalités financières de paiement
  const renderPaymentBox = () => {
    const pay = product.payment || {};
    const isCash = pay.mode === 'cash';
    const isLibre = pay.mode === 'libre';

    return (
      <div className="payment-box">
        <div className="payment-head">
          <b>
            Mode de paiement · {isCash ? 'Comptant' : isLibre ? 'Cotisation libre' : 'Paiement échelonné'}
          </b>
          {pay.demo && <span className="payment-demo">PARAMÈTRE FINANCIER DÉDIÉ</span>}
        </div>

        <div className="payment-grid">
          {isCash ? (
            <>
              <div className="payment-item">
                <small>Montant total à régler</small>
                <b>{formatFCFA(product.p)}</b>
              </div>
              <div className="payment-item">
                <small>Fréquence</small>
                <b>En un seul règlement</b>
              </div>
            </>
          ) : isLibre ? (
            <>
              <div className="payment-item">
                <small>Minimum pour démarrer</small>
                <b>{formatFCFA(pay.minimumStart || 5000)}</b>
              </div>
              <div className="payment-item">
                <small>Versements suivants</small>
                <b>À votre rythme</b>
              </div>
              <div className="payment-item">
                <small>Fin estimée</small>
                <b>Selon vos versements</b>
              </div>
              <div className="payment-item">
                <small>Seuil de livraison</small>
                <b>Dès 40% cotisé</b>
              </div>
            </>
          ) : (
            <>
              <div className="payment-item">
                <small>Prix total de l'article</small>
                <b>{formatFCFA(product.p)}</b>
              </div>
              <div className="payment-item">
                <small>1er versement minimum</small>
                <b>{formatFCFA(pay.minimumStart || 30000)}</b>
              </div>
              <div className="payment-item">
                <small>Versement périodique</small>
                <b>{formatFCFA(pay.installmentAmount || 25000)} / {pay.frequency || 'mois'}</b>
              </div>
              <div className="payment-item">
                <small>Fin estimée</small>
                <b>{pay.estimatedEnd || 'À confirmer'}</b>
              </div>
            </>
          )}
        </div>

        <small className="payment-hint">
          {isLibre
            ? 'Vous démarrez avec le premier versement, puis vous cotisez librement sans échéance fixe.'
            : isCash
              ? 'Règlement direct et livraison rapide garantie.'
              : 'Échéancier transparent et sécurisé. Suivi de chaque versement en direct dans votre espace cagnotte.'}
        </small>
      </div>
    );
  };

  return (
    <div className="page-shell">
      {/* Bouton retour */}
      <div className="page-top">
        <button
          type="button"
          className="back-link"
          onClick={onBack}
        >
          ← Retour aux articles
        </button>
      </div>

      <div className="product-layout">
        {/* Colonne gauche : Galerie photos */}
        <div>
          <div className="gallery-main">
            {selectedGallery === 'video' && product.video ? (
              <video
                src={typeof product.video === 'string' ? product.video : product.video?.chemin}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '16px' }}
                autoPlay
              />
            ) : (
              <img
                src={currentImage}
                alt={product.n}
                onError={(e) => {
                  e.target.src = '/assets/category-phones.jpg';
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

        {/* Colonne droite : Fiche détaillée */}
        <div className="product-info">
          <div className="product-meta">
            <span className="client-card" style={{ display: 'inline', border: 'none', boxShadow: 'none' }}>
              <span className="st" style={{ margin: 0 }}>
                {product.c} · {product.subcategory}
              </span>
            </span>

            <span className="stock-tag">
              {product.stockCount !== null ? `${product.stockCount} en stock` : 'Stock à confirmer'}
            </span>
          </div>

          <h1>{product.n}</h1>
          <p className="product-desc">{product.d}</p>

          <div className="product-availability">
            <div>
              <small>Stock disponible</small>
              <b>{product.stockCount !== null ? `${product.stockCount} unités` : 'À confirmer'}</b>
            </div>
            <div>
              <small>Disponibilité</small>
              <b>{product.availabilityDuration || 'À confirmer'}</b>
            </div>
          </div>

          <div className="product-price">
            {formatFCFA(product.p)}
            {product.o && <s>{formatFCFA(product.o)}</s>}
          </div>

          {/* Bannière validité de la promo */}
          {product.o && discount > 0 && (
            <div className="promo-validity">
              <b>Promotion spéciale −{discount}%</b>
              <span>Début : {formatClientDate(product.promotion?.startDate)}</span>
              <span>Fin : {formatClientDate(product.promotion?.endDate)}</span>
            </div>
          )}

          {/* Choix des couleurs */}
          {colors.length > 0 && (
            <div className="variants">
              <div className="variants-head">
                <b>Choisissez une couleur</b>
                <small>Sélection disponible</small>
              </div>

              <div className="color-list">
                {colors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`color-choice ${selectedColor === i ? 'on' : ''}`}
                    onClick={() => setSelectedColor(i)}
                  >
                    <span className="color-dot" style={{ background: c.hex }} />
                    <span>{c.name}</span>
                    {selectedColor === i && ' ✓'}
                  </button>
                ))}
              </div>

              <small className="color-selected">
                Couleur sélectionnée : <b>{chosenColor?.name || 'Standard'}</b>
              </small>
            </div>
          )}

          {/* Encadré des modalités financières */}
          {renderPaymentBox()}

          {/* Bouton de commande */}
          <div style={{ marginTop: '22px' }}>
            <button
              type="button"
              className="client-btn w100"
              style={{ fontSize: '16px', padding: '16px' }}
              onClick={() => onStartOrder(product, chosenColor)}
            >
              Passer une commande
            </button>
            <p className="auth-footnote">
              Paiement flexible et 100% sécurisé via MTN Mobile Money ou Moov Money.
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
                      e.target.src = '/assets/category-phones.jpg';
                    }}
                  />
                  {item.o && <span className="similar-promo-badge">Promo</span>}
                </div>
                <div className="similar-copy">
                  <b>{item.n}</b>
                  <div className="similar-from-price">
                    À partir de {formatFCFA(item.seuilLivraison ?? item.payment?.seuilLivraison ?? item.seuil_livraison ?? Math.round(item.p * 0.4))}
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
