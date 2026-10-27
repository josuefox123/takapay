import { useState, useEffect } from 'react';
import { formatFCFA, discountPercentage, formatClientDate, PRODUCTS, resolveImageUrl, createCagnotteFromOrder } from '../../data/clientStore';
import { adminService } from '../../services/adminService';

export default function ClientProductDetail({
  productId,
  product: propProduct,
  user: propUser,
  onShowToast,
  onBack,
  onStartOrder,
  onSelectProduct,
}) {
  const product = propProduct || PRODUCTS.find((p) => p.id === Number(productId)) || PRODUCTS[0];
  const [selectedGallery, setSelectedGallery] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);

  // Utilisateur connecté
  const user = propUser || (() => {
    try {
      const saved = localStorage.getItem('takapay-client-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  // Modal de choix (Payer maintenant vs Payer à la livraison)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalStep, setPaymentModalStep] = useState('choice'); // 'choice' | 'delivery_form' | 'success'
  const [deliveryAddress, setDeliveryAddress] = useState(user?.adresse || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.telephone || user?.phone || '');
  const [deliveryCustomerName, setDeliveryCustomerName] = useState(
    user?.nom ? `${user.prenom || ''} ${user.nom || ''}`.trim() : (user?.n || '')
  );
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [completedOrderInfo, setCompletedOrderInfo] = useState(null);

  useEffect(() => {
    if (user) {
      if (!deliveryAddress && user.adresse) setDeliveryAddress(user.adresse);
      if (!deliveryPhone && (user.telephone || user.phone)) setDeliveryPhone(user.telephone || user.phone);
      if (!deliveryCustomerName && (user.prenom || user.nom || user.n)) {
        setDeliveryCustomerName(`${user.prenom || ''} ${user.nom || ''}`.trim() || user.n || '');
      }
    }
  }, [user]);

  const handleChoosePayNow = () => {
    setShowPaymentModal(false);
    setPaymentModalStep('choice');
    onStartOrder(product, chosenColor, {
      mode: orderMode,
      quantity: orderMode === 'cash' ? cashQuantity : 1,
    });
  };

  const handleChoosePayOnDelivery = () => {
    setPaymentModalStep('delivery_form');
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setDeliveryError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setIsLocating(true);
    setDeliveryError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const coordsStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setDeliveryCoords(coordsStr);
        if (!deliveryAddress || deliveryAddress.startsWith('Position GPS :')) {
          setDeliveryAddress(`Position GPS : [${coordsStr}]`);
        }
      },
      () => {
        setIsLocating(false);
        setDeliveryError("Impossible d'obtenir votre position. Veuillez saisir votre adresse manuellement.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleDeliveryOrderSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!deliveryAddress.trim()) {
      setDeliveryError('Veuillez renseigner votre adresse de livraison.');
      return;
    }
    if (!deliveryPhone.trim()) {
      setDeliveryError('Veuillez renseigner un numéro de téléphone joignable par le livreur.');
      return;
    }
    setDeliveryError('');
    setDeliverySubmitting(true);

    const effectiveQty = orderMode === 'cash' ? cashQuantity : 1;
    const effectiveTotal = orderMode === 'cash' ? (effectiveCashPrice * cashQuantity) : currentPrice;
    const orderRef = `CMD_COD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    let commandeId = null;
    let backendCagnotteId = null;
    try {
      const initRes = await adminService.initiatePayment({
        amount: effectiveTotal,
        produit_id: product?.id,
        type_paiement: 'cash',
        quantite: effectiveQty,
        moyen_paiement: 'livraison',
        user_id: user?.id,
        adresse_livraison: deliveryAddress.trim(),
        telephone_livraison: deliveryPhone.trim(),
        note_livraison: deliveryNote.trim(),
        coordonnees_gps: deliveryCoords,
      });
      if (initRes?.commande_id) commandeId = initRes.commande_id;
      if (initRes?.cagnotte_id) backendCagnotteId = initRes.cagnotte_id;
    } catch (err) {
      console.warn('Backend initiation COD fallback to local:', err);
    }

    const orderData = {
      product: { ...product, p: currentPrice },
      selectedColor: chosenColor,
      isCash: true,
      isCod: true,
      mode_reglement: 'livraison',
      quantity: effectiveQty,
      totalPrice: effectiveTotal,
      deliveryAddress: deliveryAddress.trim(),
      deliveryPhone: deliveryPhone.trim(),
      deliveryNote: deliveryNote.trim(),
      deliveryCoords,
      reference: orderRef,
      commandeId,
      backendId: backendCagnotteId,
      telephone: deliveryPhone.trim(),
      date: new Date().toISOString(),
    };

    const newCagnotte = createCagnotteFromOrder(orderData, user || {
      n: deliveryCustomerName.trim() || 'Client TakaPay',
      phone: deliveryPhone.trim(),
      adresse: deliveryAddress.trim(),
    });

    let allCagnottes = [];
    try {
      const raw = localStorage.getItem('takapay_backend_cagnottes');
      if (raw) allCagnottes = JSON.parse(raw);
    } catch { /* ignore */ }
    if (!Array.isArray(allCagnottes)) allCagnottes = [];
    const updatedCagnottes = [newCagnotte, ...allCagnottes.filter((c) => c && c.id !== newCagnotte.id)];
    try {
      localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(updatedCagnottes));
    } catch { /* ignore */ }

    let allOrders = [];
    try {
      const rawOrders = localStorage.getItem('takapay-client-orders');
      if (rawOrders) allOrders = JSON.parse(rawOrders);
    } catch { /* ignore */ }
    if (!Array.isArray(allOrders)) allOrders = [];
    try {
      localStorage.setItem('takapay-client-orders', JSON.stringify([orderData, ...allOrders]));
    } catch { /* ignore */ }

    window.dispatchEvent(new CustomEvent('takapay_cagnotte_updated', { detail: newCagnotte }));

    setCompletedOrderInfo({
      reference: orderRef,
      totalPrice: effectiveTotal,
      quantity: effectiveQty,
      productName: product.n,
      colorName: chosenColor?.name,
      address: deliveryAddress.trim(),
      phone: deliveryPhone.trim(),
    });

    setDeliverySubmitting(false);
    setPaymentModalStep('success');
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentModalStep('choice');
    setDeliveryError('');
  };

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
  const effectiveCashPrice = cashPrice > 0 ? cashPrice : currentPrice;

  // Choix du mode de commande : 'cagnotte' ou 'cash'
  const [orderMode, setOrderMode] = useState(isCash ? 'cash' : 'cagnotte');
  // Quantité en option cash (libre et ajustable, min 1) ; les autres modes restent à 1
  const [cashQuantity, setCashQuantity] = useState(1);

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

          {/* 5. PRIX DYNAMIQUE DU PRODUIT (SYNCHRONISÉ AVEC LA COULEUR ET LE MODE) */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '32px', fontWeight: 900, color: orderMode === 'cash' ? '#1e293b' : 'var(--r)', letterSpacing: '-0.5px' }}>
                {formatFCFA(orderMode === 'cash' ? (effectiveCashPrice * cashQuantity) : currentPrice)}
              </span>
              {currentOldPrice && (
                <s style={{ fontSize: '18px', color: 'var(--mu)', fontWeight: 500 }}>
                  {formatFCFA(orderMode === 'cash' ? (currentOldPrice * cashQuantity) : currentOldPrice)}
                </s>
              )}
              {discount > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '99px', background: 'rgba(220, 38, 38, 0.12)', color: 'var(--r)' }}>
                  −{discount}%
                </span>
              )}
              {orderMode === 'cash' && cashQuantity > 1 && (
                <span style={{ fontSize: '13px', color: 'var(--mu)', fontWeight: 600 }}>
                  ({cashQuantity} × {formatFCFA(effectiveCashPrice)})
                </span>
              )}
            </div>
            {hasCustomPrice && (
              <div style={{ fontSize: '12px', color: 'var(--mu)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>✨</span>
                <span>Tarif ajusté spécifiquement pour la déclinaison <strong>{chosenColor.name}</strong></span>
              </div>
            )}

            {/* SÉLECTEUR DE MODE DE RÈGLEMENT (CASH VS CAGNOTTE) & QUANTITÉ */}
            <div style={{ marginTop: '16px', padding: '16px', borderRadius: '16px', background: 'var(--sf)', border: '1.5px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tx)' }}>
                  Mode de règlement souhaité :
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: orderMode === 'cash' ? 'rgba(30, 41, 59, 0.08)' : 'rgba(220, 38, 38, 0.1)', color: orderMode === 'cash' ? '#1e293b' : 'var(--r)' }}>
                  {orderMode === 'cash' ? 'COMPTANT' : 'ÉCHELONNÉ'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: !isCash ? '1fr 1fr' : '1fr', gap: '10px' }}>
                {!isCash && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderMode('cagnotte');
                      setShowPaymentModal(true);
                      setPaymentModalStep('choice');
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: orderMode === 'cagnotte' ? '2px solid var(--r)' : '1.5px solid var(--bd)',
                      background: orderMode === 'cagnotte' ? 'rgba(220, 38, 38, 0.06)' : 'var(--cd)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: orderMode === 'cagnotte' ? 'var(--r)' : 'var(--tx)' }}>
                        🎯 Mode Cagnotte
                      </span>
                      {orderMode === 'cagnotte' && <span style={{ color: 'var(--r)', fontWeight: 800 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>
                      1er versement : <b>{formatFCFA(minStart)}</b>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--tx)', marginTop: '2px', fontWeight: 600 }}>
                      Quantité : 1 article
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOrderMode('cash')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: orderMode === 'cash' ? '2px solid #1e293b' : '1.5px solid var(--bd)',
                    background: orderMode === 'cash' ? 'rgba(30, 41, 59, 0.06)' : 'var(--cd)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: orderMode === 'cash' ? '#1e293b' : 'var(--tx)' }}>
                      💵 Option Cash (Comptant)
                    </span>
                    {orderMode === 'cash' && <span style={{ color: '#1e293b', fontWeight: 800 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>
                    Prix unitaire : <b>{formatFCFA(effectiveCashPrice)}</b>
                  </div>
                  <div style={{ fontSize: '11px', color: orderMode === 'cash' ? '#1e293b' : 'var(--mu)', marginTop: '2px', fontWeight: 700 }}>
                    Quantité ajustable
                  </div>
                </button>
              </div>

              {/* Sélecteur de quantité interactif affiché uniquement en option Cash */}
              {orderMode === 'cash' ? (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    background: 'rgba(30, 41, 59, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(30, 41, 59, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                      Quantité souhaitée (Paiement Cash) :
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--tx)', marginTop: '2px' }}>
                      {cashQuantity} × {formatFCFA(effectiveCashPrice)} = <strong style={{ color: '#1e293b', fontSize: '13px' }}>{formatFCFA(effectiveCashPrice * cashQuantity)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg)', padding: '4px', borderRadius: '10px', border: '1px solid var(--bd)' }}>
                    <button
                      type="button"
                      disabled={cashQuantity <= 1}
                      onClick={() => setCashQuantity((q) => Math.max(1, q - 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid var(--bd)',
                        background: 'var(--cd)',
                        color: 'var(--tx)',
                        fontWeight: 800,
                        cursor: cashQuantity <= 1 ? 'not-allowed' : 'pointer',
                        opacity: cashQuantity <= 1 ? 0.4 : 1,
                      }}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={1}
                      max={product.stockCount && product.stockCount > 0 ? product.stockCount : 99}
                      value={cashQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val) || val < 1) setCashQuantity(1);
                        else {
                          const maxStock = product.stockCount && product.stockCount > 0 ? product.stockCount : 99;
                          setCashQuantity(Math.min(val, maxStock));
                        }
                      }}
                      style={{
                        width: '50px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--tx)',
                      }}
                    />

                    <button
                      type="button"
                      disabled={Boolean(product.stockCount && cashQuantity >= product.stockCount)}
                      onClick={() => {
                        const maxStock = product.stockCount && product.stockCount > 0 ? product.stockCount : 99;
                        setCashQuantity((q) => Math.min(maxStock, q + 1));
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid var(--bd)',
                        background: 'var(--cd)',
                        color: 'var(--tx)',
                        fontWeight: 800,
                        cursor: (product.stockCount && cashQuantity >= product.stockCount) ? 'not-allowed' : 'pointer',
                        opacity: (product.stockCount && cashQuantity >= product.stockCount) ? 0.4 : 1,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--mu)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>ℹ️</span>
                  <span>En mode cagnotte, la commande porte sur <strong>1 article</strong> pour assurer votre suivi de cotisation individuel.</span>
                </div>
              )}
            </div>
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
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: orderMode === 'cash' ? '#1e293b' : isLibre ? '#2563eb' : 'var(--r)' }} />
                <b style={{ fontSize: '14px', color: 'var(--tx)', letterSpacing: '-0.2px' }}>
                  Modalités financières · {orderMode === 'cash' ? `Paiement comptant (${cashQuantity} ${cashQuantity > 1 ? 'articles' : 'article'})` : isLibre ? 'Cotisation libre' : 'Paiement échelonné'}
                </b>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '99px', background: orderMode === 'cash' ? 'rgba(30, 41, 59, 0.08)' : 'rgba(220, 38, 38, 0.1)', color: orderMode === 'cash' ? '#1e293b' : 'var(--r)' }}>
                {orderMode === 'cash' ? 'ACHAT COMPTANT' : 'CAGNOTTE TAKAPAY'}
              </span>
            </div>

            <div className="payment-grid" style={{ gap: '12px' }}>
              {orderMode === 'cash' ? (
                <>
                  <div className="payment-item">
                    <small>Quantité commandée</small>
                    <b style={{ color: '#1e293b' }}>{cashQuantity} {cashQuantity > 1 ? 'articles' : 'article'}</b>
                  </div>
                  <div className="payment-item">
                    <small>Prix unitaire comptant</small>
                    <b>{formatFCFA(effectiveCashPrice)}</b>
                  </div>
                  <div className="payment-item">
                    <small>Montant total à régler ({cashQuantity} × {formatFCFA(effectiveCashPrice)})</small>
                    <b style={{ color: '#1e293b', fontSize: '15px' }}>{formatFCFA(effectiveCashPrice * cashQuantity)}</b>
                  </div>
                  <div className="payment-item">
                    <small>Fréquence</small>
                    <b>En un seul règlement intégral</b>
                  </div>
                </>
              ) : isLibre ? (
                <>
                  <div className="payment-item">
                    <small>Quantité souscrite</small>
                    <b>1 article</b>
                  </div>
                  <div className="payment-item">
                    <small>1 er versement minimum</small>
                    <b>{formatFCFA(minStart)}</b>
                  </div>
                  <div className="payment-item">
                    <small>Versements suivants</small>
                    <b>Libres (selon votre convenance)</b>
                  </div>
                  <div className="payment-item">
                    <small>Fin estimée</small>
                    <b>Selon vos versements</b>
                  </div>
                </>
              ) : (
                <>
                  <div className="payment-item">
                    <small>Quantité souscrite</small>
                    <b>1 article</b>
                  </div>
                  <div className="payment-item">
                    <small>Prix total ({chosenColor?.name || 'Prix de base'})</small>
                    <b style={{ color: 'var(--r)' }}>{formatFCFA(currentPrice)}</b>
                  </div>
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
            {orderMode !== 'cash' && !isLibre && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'var(--cd)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--bd)' }}>
                <strong style={{ fontSize: '13px', color: 'var(--tx)' }}>
                  Recevez l'article dès {formatFCFA(deliveryThreshold)} cotisés
                </strong>
              </div>
            )}

            <small className="payment-hint" style={{ marginTop: '12px', display: 'block', fontSize: '11px', color: 'var(--mu)', lineHeight: 1.5 }}>
              {orderMode === 'cash'
                ? 'Règlement direct sécurisé pour la quantité choisie et expédition prioritaire garantie.'
                : isLibre
                  ? 'Vous démarrez avec le premier versement minimum pour 1 article, puis vous cotisez à votre rythme en toute liberté.'
                  : 'Échéancier transparent et sécurisé. Chaque versement est comptabilisé en direct dans votre espace cagnotte.'}
            </small>
          </div>

          {/* 7. BOUTON DE COMMANDE */}
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="client-btn w100"
              style={{
                fontSize: '16px',
                padding: '16px',
                borderRadius: '14px',
                fontWeight: 800,
                background: orderMode === 'cash' ? '#1e293b' : undefined,
              }}
              onClick={() => {
                setShowPaymentModal(true);
                setPaymentModalStep('choice');
              }}
            >
              {orderMode === 'cash'
                ? 'Commander au comptant'
                : 'Passer une commande'}
            </button>
            <p className="auth-footnote" style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--mu)' }}>
              🔒 Règlement flexible : Immédiat par Mobile Money ou en espèces à la livraison.
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

      {/* POPUP MODAL : CHOIX DU MODE DE RÈGLEMENT & LIVRAISON */}
      {showPaymentModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deliverySubmitting) {
              handleClosePaymentModal();
            }
          }}
        >
          <div
            style={{
              background: 'var(--sf, #ffffff)',
              color: 'var(--tx, #0f172a)',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1.5px solid var(--bd, #e2e8f0)',
              position: 'relative',
              padding: '26px',
            }}
          >
            {/* ÉTAPE 1 : CHOIX ENTRE MAINTENANT ET LIVRAISON */}
            {paymentModalStep === 'choice' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(220, 38, 38, 0.08)',
                      color: 'var(--r, #dc2626)',
                    }}
                  >
                    🎯 Modalité de règlement
                  </span>
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      border: '1px solid var(--bd, #e2e8f0)',
                      background: 'var(--cd, #f8fafc)',
                      color: 'var(--tx, #0f172a)',
                      fontSize: '16px',
                      fontWeight: 700,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 8px', color: 'var(--tx, #0f172a)', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                  Voulez-vous payer maintenant ou à la livraison ?
                </h2>
                <p style={{ fontSize: '13.5px', color: 'var(--mu, #64748b)', margin: '0 0 22px', lineHeight: 1.5 }}>
                  Choisissez votre préférence pour valider la commande de <b>{product.n}</b> ({chosenColor?.name || 'Standard'}).
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Option 1 : Payer maintenant */}
                  <button
                    type="button"
                    onClick={handleChoosePayNow}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '18px',
                      borderRadius: '16px',
                      border: '2px solid var(--bd, #e2e8f0)',
                      background: 'var(--cd, #f8fafc)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--r, #dc2626)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(220, 38, 38, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--bd, #e2e8f0)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'rgba(220, 38, 38, 0.1)',
                        color: 'var(--r, #dc2626)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '22px',
                        flexShrink: 0,
                      }}
                    >
                      📱
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--tx, #0f172a)' }}>
                          Payer maintenant
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(220, 38, 38, 0.1)', color: 'var(--r, #dc2626)' }}>
                          Mobile Money
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--mu, #64748b)', margin: 0, lineHeight: 1.45 }}>
                        Payez en ligne de façon instantanée et sécurisée via MTN Mobile Money ou Moov Money.
                      </p>
                    </div>
                  </button>

                  {/* Option 2 : Payer à la livraison */}
                  <button
                    type="button"
                    onClick={handleChoosePayOnDelivery}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '18px',
                      borderRadius: '16px',
                      border: '2px solid #16a34a',
                      background: 'rgba(22, 163, 74, 0.04)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#15803d';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(22, 163, 74, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#16a34a';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'rgba(22, 163, 74, 0.12)',
                        color: '#16a34a',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '22px',
                        flexShrink: 0,
                      }}
                    >
                      🚚
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a' }}>
                          Payer à la livraison
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#16a34a', color: '#ffffff' }}>
                          Espèces au livreur
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--mu, #64748b)', margin: 0, lineHeight: 1.45 }}>
                        Réglez en espèces directement auprès du livreur au moment de la réception de votre article.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : FORMULAIRE DE LIVRAISON */}
            {paymentModalStep === 'delivery_form' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentModalStep('choice')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--mu, #64748b)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    ← Changer de mode
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid var(--bd, #e2e8f0)',
                      background: 'var(--cd, #f8fafc)',
                      color: 'var(--tx, #0f172a)',
                      fontSize: '14px',
                      fontWeight: 700,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 6px', color: 'var(--tx, #0f172a)' }}>
                  🚚 Coordonnées de livraison
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--mu, #64748b)', margin: '0 0 16px' }}>
                  Renseignez vos coordonnées pour permettre au livreur de vous contacter et de vous acheminer l'article.
                </p>

                {/* Récapitulatif montant */}
                <div
                  style={{
                    background: 'var(--cd, #f8fafc)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    border: '1px solid var(--bd, #e2e8f0)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tx, #0f172a)' }}>
                      {product.n}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--mu, #64748b)' }}>
                      Couleur : {chosenColor?.name || 'Standard'} · Qté : {orderMode === 'cash' ? cashQuantity : 1}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--mu, #64748b)' }}>Total à payer :</div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#16a34a' }}>
                      {formatFCFA(orderMode === 'cash' ? (effectiveCashPrice * cashQuantity) : currentPrice)}
                    </div>
                  </div>
                </div>

                {deliveryError && (
                  <div
                    style={{
                      background: 'rgba(220, 38, 38, 0.08)',
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                      color: '#dc2626',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      marginBottom: '14px',
                    }}
                  >
                    ⚠️ {deliveryError}
                  </div>
                )}

                <form onSubmit={handleDeliveryOrderSubmit}>
                  {/* Nom complet */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--tx, #0f172a)' }}>
                      Nom & Prénom(s)
                    </label>
                    <input
                      type="text"
                      value={deliveryCustomerName}
                      onChange={(e) => setDeliveryCustomerName(e.target.value)}
                      placeholder="Ex: Jean Paul Dossou"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--bd, #e2e8f0)',
                        background: 'var(--sf, #ffffff)',
                        color: 'var(--tx, #0f172a)',
                        fontSize: '13.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Adresse de livraison */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--tx, #0f172a)' }}>
                        Adresse de livraison *
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {user?.adresse && (
                          <button
                            type="button"
                            onClick={() => setDeliveryAddress(user.adresse)}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--bd, #e2e8f0)',
                              background: 'var(--cd, #f8fafc)',
                              color: 'var(--tx, #0f172a)',
                              cursor: 'pointer',
                            }}
                          >
                            🏠 Profil : {user.adresse}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #16a34a',
                            background: 'rgba(22, 163, 74, 0.08)',
                            color: '#16a34a',
                            cursor: isLocating ? 'wait' : 'pointer',
                          }}
                        >
                          {isLocating ? '⏳ Détection...' : '📍 Ma position'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Quartier, rue, numéro de maison, repère"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--bd, #e2e8f0)',
                        background: 'var(--sf, #ffffff)',
                        color: 'var(--tx, #0f172a)',
                        fontSize: '13.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                    {deliveryCoords && (
                      <small style={{ display: 'block', marginTop: '4px', color: '#16a34a', fontSize: '11px', fontWeight: 600 }}>
                        ✓ Coordonnées GPS capturées : {deliveryCoords}
                      </small>
                    )}
                  </div>

                  {/* Numéro pour le livreur */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--tx, #0f172a)' }}>
                      Numéro à contacter par le livreur *
                    </label>
                    <input
                      type="tel"
                      required
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      placeholder="Ex: 97000000 ou 61000000"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--bd, #e2e8f0)',
                        background: 'var(--sf, #ffffff)',
                        color: 'var(--tx, #0f172a)',
                        fontSize: '13.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <small style={{ display: 'block', marginTop: '4px', color: 'var(--mu, #64748b)', fontSize: '11px' }}>
                      Le livreur vous joindra directement sur ce numéro avant son passage.
                    </small>
                  </div>

                  {/* Note pour le livreur */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--tx, #0f172a)' }}>
                      Note d'information (facultatif)
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="Ex: Portail bleu à côté de la pharmacie, sonner au portail..."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--bd, #e2e8f0)',
                        background: 'var(--sf, #ffffff)',
                        color: 'var(--tx, #0f172a)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Message informatif officiel sur la disponibilité */}
                  <div
                    style={{
                      background: 'rgba(37, 99, 235, 0.08)',
                      border: '1px solid rgba(37, 99, 235, 0.25)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      marginBottom: '18px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>ℹ️</span>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#1e40af', lineHeight: 1.45, fontWeight: 600 }}>
                      La disponibilité de l'article vous sera communiquée par l'équipe en charge dans quelques instants.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={deliverySubmitting}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: deliverySubmitting ? 'wait' : 'pointer',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                    }}
                  >
                    {deliverySubmitting ? 'Enregistrement de la commande...' : 'Valider ma commande à la livraison →'}
                  </button>
                </form>
              </div>
            )}

            {/* ÉTAPE 3 : CONFIRMATION & BRAVO */}
            {paymentModalStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'rgba(22, 163, 74, 0.12)',
                    color: '#16a34a',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '34px',
                    margin: '0 auto 16px',
                  }}
                >
                  🎉
                </div>

                <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 10px', color: '#16a34a' }}>
                  Bravo !
                </h2>

                <div
                  style={{
                    background: 'rgba(22, 163, 74, 0.08)',
                    border: '1.5px solid rgba(22, 163, 74, 0.25)',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '15px', fontWeight: 800, color: '#15803d', margin: 0, lineHeight: 1.5 }}>
                    Vous serez contacté sur la disponibilité du produit et la livraison dans quelques instants.
                  </p>
                </div>

                {completedOrderInfo && (
                  <div
                    style={{
                      background: 'var(--cd, #f8fafc)',
                      border: '1px solid var(--bd, #e2e8f0)',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      marginBottom: '20px',
                      textAlign: 'left',
                      fontSize: '12.5px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--mu, #64748b)' }}>Référence :</span>
                      <b style={{ color: 'var(--tx, #0f172a)' }}>{completedOrderInfo.reference}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--mu, #64748b)' }}>Article :</span>
                      <b>{completedOrderInfo.productName} ({completedOrderInfo.colorName || 'Standard'})</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--mu, #64748b)' }}>Montant à régler au livreur :</span>
                      <b style={{ color: '#16a34a', fontSize: '13.5px' }}>{formatFCFA(completedOrderInfo.totalPrice)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--mu, #64748b)' }}>Téléphone livreur :</span>
                      <b>{completedOrderInfo.phone}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--mu, #64748b)' }}>Adresse :</span>
                      <span style={{ maxWidth: '60%', textAlign: 'right', fontWeight: 600 }}>{completedOrderInfo.address}</span>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.04)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: 'var(--mu, #64748b)',
                    lineHeight: 1.45,
                    marginBottom: '22px',
                  }}
                >
                  💡 Cette commande a été ajoutée à vos <b>Cagnottes</b>. Vous pourrez y suivre son traitement et cliquer sur <b>« Oui, article reçu »</b> après réception.
                </div>

                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#1e293b',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Fermer et revenir aux détails du produit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
