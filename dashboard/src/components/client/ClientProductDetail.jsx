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
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const coordsStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setDeliveryCoords(coordsStr);

        // Nettoyer si le champ contenait déjà l'ancien format brut
        setDeliveryAddress((prev) => (prev && prev.startsWith('Position GPS') ? '' : prev));

        // Résolution de l'adresse lisible (quartier, ville) par géocodage inverse
        try {
          const res = await fetch(
            `https://api-bdc.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`
          );
          if (res.ok) {
            const data = await res.json();
            const parts = [];
            const admin = data.localityInfo?.administrative || [];
            const subDistrict = admin.find((a) => a.adminLevel === 7 || a.adminLevel === 8)?.name;
            if (subDistrict && subDistrict !== data.city) parts.push(subDistrict);
            if (data.locality && data.locality !== data.city && !parts.includes(data.locality)) parts.push(data.locality);
            if (data.city) parts.push(data.city);
            else if (data.principalSubdivision) parts.push(data.principalSubdivision);
            const readableAddress = parts.join(', ');

            if (readableAddress) {
              setDeliveryAddress((prev) => {
                if (!prev || prev.startsWith('Position GPS')) return readableAddress;
                return prev.includes(readableAddress) ? prev : `${prev} (${readableAddress})`;
              });
            }
          }
        } catch {
          // Si le géocodage inverse échoue, les coordonnées restent enregistrées dans deliveryCoords sans polluer le champ d'adresse
        } finally {
          setIsLocating(false);
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
    let orderRef = `CMD_COD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

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
      if (initRes?.reference) orderRef = initRes.reference;
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

  // Suggestions d'articles après la zone inférieure (même catégorie ou catalogue complémentaire)
  const categoryArticles = PRODUCTS.filter(
    (p) => p.id !== product.id && (p.subcategory === product.subcategory || p.c === product.c)
  );
  const otherArticles = PRODUCTS.filter(
    (p) => p.id !== product.id && p.subcategory !== product.subcategory && p.c !== product.c
  );
  const proposalArticles = [...categoryArticles, ...otherArticles].slice(0, 6);

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
  const isLibre = pay.mode === 'libre' || true; // Par défaut sur Takapay : option Cash ou Cagnotte Libre
  const cashPrice = Number(product.prix_cash || pay.prixCash || 0);
  const effectiveCashPrice = cashPrice > 0 ? cashPrice : currentPrice;

  // Choix du mode de commande : 'cash' ou 'cagnotte'
  const [orderMode, setOrderMode] = useState(isCash ? 'cash' : 'cagnotte');
  // Quantité en option cash (ajustable et libre, min 1) ; en cagnotte cela reste 1 article
  const [cashQuantity, setCashQuantity] = useState(1);

  // Cagnotte Libre : 3 choix avec différentes propositions
  // 'offer_10' (1er versement 10%), 'offer_15' (1er versement 15%), 'custom' (montant personnalisé selon le budget)
  const [cagnotteOption, setCagnotteOption] = useState('offer_10');
  const [customCagnotteAmount, setCustomCagnotteAmount] = useState('');

  const deposit10 = Math.max(500, Math.round(currentPrice * 0.10));
  const deposit15 = Math.max(500, Math.round(currentPrice * 0.15));
  const parsedCustomAmount = Number(customCagnotteAmount) > 0 ? Number(customCagnotteAmount) : 0;
  const effectiveFirstDeposit = cagnotteOption === 'offer_10'
    ? deposit10
    : cagnotteOption === 'offer_15'
      ? deposit15
      : (parsedCustomAmount > 0 ? parsedCustomAmount : deposit10);

  // Onglet actif dans la zone inférieure
  const [activeTab, setActiveTab] = useState('description'); // 'description' | 'modalites' | 'avis' | 'garantie'

  // Gestion des favoris avec persistance localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('takapay_user_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const isFavorite = favorites.includes(product.id);

  const toggleFavorite = () => {
    let next;
    if (isFavorite) {
      next = favorites.filter((id) => id !== product.id);
      if (onShowToast) onShowToast('Article retiré de vos favoris');
    } else {
      next = [...favorites, product.id];
      if (onShowToast) onShowToast('Article ajouté à vos favoris Takapay !');
    }
    setFavorites(next);
    try {
      localStorage.setItem('takapay_user_favorites', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('takapay_favorites_updated', { detail: next }));
    } catch { /* ignore */ }
  };

  // Liste des avis clients vérifiés et formulaire d'avis
  const [reviewsList, setReviewsList] = useState([
    { name: 'Koffi A.', city: 'Cotonou (Cadjehoun)', rating: 5, date: 'Il y a 3 jours', text: 'Produit 100% neuf, emballage soigné et livraison très rapide à Cotonou. Service Takapay irréprochable.' },
    { name: 'Bernadette D.', city: 'Abomey-Calavi', rating: 5, date: 'Il y a 1 semaine', text: 'Très satisfaite de mon achat. Les conseillers sont disponibles sur WhatsApp et répondent à la moindre question.' },
    { name: 'Rachid M.', city: 'Parakou', rating: 5, date: 'Il y a 2 semaines', text: 'J\'ai pu acquérir cet article en toute tranquillité. C\'est transparent et fiable pour nous au Bénin.' },
  ]);
  const [newReviewAuthor, setNewReviewAuthor] = useState(
    user?.nom ? `${user.prenom || ''} ${user.nom || ''}`.trim() : ''
  );
  const [newReviewCity, setNewReviewCity] = useState(user?.ville || 'Cotonou');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;
    const newRev = {
      name: newReviewAuthor.trim(),
      city: newReviewCity.trim() || 'Bénin',
      rating: Number(newReviewRating),
      date: 'À l\'instant',
      text: newReviewComment.trim(),
    };
    setReviewsList([newRev, ...reviewsList]);
    setNewReviewComment('');
    if (onShowToast) onShowToast('Merci ! Votre avis a été publié avec succès.');
  };

  // Partage rapide
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      if (onShowToast) onShowToast('Lien du produit copié dans le presse-papier !');
    } catch {
      if (onShowToast) onShowToast('Lien copié : ' + window.location.href);
    }
  };

  // Lien WhatsApp direct avec message pré-rempli
  const whatsappUrl = `https://wa.me/22990000000?text=${encodeURIComponent(
    `Bonjour Takapay, je suis intéressé(e) par l'article "${product.n}" affiché à ${formatFCFA(orderMode === 'cash' ? effectiveCashPrice * cashQuantity : currentPrice)} (Mode : ${orderMode === 'cash' ? `Cash Comptant - ${cashQuantity} article(s)` : `Cagnotte Libre - 1er versement : ${formatFCFA(effectiveFirstDeposit)}`}). Pouvez-vous me renseigner sur sa disponibilité et la livraison ?`
  )}`;

  // 1er versement minimum pour la cagnotte (10% par défaut)
  const basePrice = Number(product.p) > 0 ? Number(product.p) : 1;
  const priceRatio = currentPrice / basePrice;
  const minStart = hasCustomPrice
    ? Math.round(currentPrice * 0.1)
    : (pay.minimumStart ? Math.round(pay.minimumStart * priceRatio) : Math.round(currentPrice * 0.1));

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
      <div className="page-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          className="back-link"
          onClick={onBack}
        >
          ← Retour aux articles
        </button>

        <nav aria-label="Fil d'Ariane" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
          <span style={{ color: 'var(--tx)', opacity: 0.75 }}>Accueil</span>
          <span style={{ color: 'var(--mu)', opacity: 0.5 }}>/</span>
          <span style={{ color: 'var(--tx)', opacity: 0.85 }}>{categoryName}</span>
          <span style={{ color: 'var(--mu)', opacity: 0.5 }}>/</span>
          <span style={{ color: 'var(--r)', background: 'rgba(220, 38, 38, 0.08)', padding: '3px 10px', borderRadius: '8px', fontWeight: 700 }}>
            {subcategoryName}
          </span>
        </nav>
      </div>

      {/* =========================================================================
          GRILLE PRINCIPALE EN 3 COLONNES (GALERIE | FICHE PRODUIT | ASIDE INFOS)
          ========================================================================= */}
      <div className="product-layout-3col">
        {/* COLONNE 1 : GALERIE PHOTOS, VIDÉO & BADGES */}
        <div>
          <div className="product-gallery-card">
            {/* Bouton Favoris flottant */}
            <button
              type="button"
              className={`photo-favorite-badge ${isFavorite ? 'is-active' : ''}`}
              onClick={toggleFavorite}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-label="Favoris"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>

            {/* Badge de statut sur la photo */}
            <span className="photo-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px' }}>verified</span>
              <span>100% Neuf & Authentique</span>
            </span>

            <div className="product-gallery-box">
              {selectedGallery === 'video' && product.video ? (
                <video
                  src={resolveImageUrl(typeof product.video === 'string' ? product.video : product.video?.chemin)}
                  controls
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
          </div>

          {/* Vignettes de la galerie */}
          <div className="gallery-thumbs" style={{ marginTop: '12px' }}>
            {images.map((im, idx) => (
              <button
                key={idx}
                type="button"
                className={`gallery-thumb ${idx === selectedGallery ? 'on' : ''}`}
                onClick={() => setSelectedGallery(idx)}
                aria-label={`Vue ${idx + 1}`}
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
                  fontSize: '18px',
                }}
              >
                ▶
              </button>
            )}

            {images.length < 2 && !product.video && (
              <div className="gallery-more">
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '17px' }}>photo_camera</span>
                <span>Visuel vérifié Takapay</span>
              </div>
            )}
          </div>
        </div>

        {/* COLONNE 2 : FICHE CENTRALE DIRECTEMENT SUR LA PAGE SANS ENCADRÉ */}
        <div className="product-direct-page">
          {/* Marque / Catégorie & Badge Stock */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--r)' }}>
              {product.brand || categoryName} · {subcategoryName}
            </span>
            <span className="stock-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', padding: '4px 12px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              {product.stockCount !== null ? `${product.stockCount} en stock` : 'Disponible'}
            </span>
          </div>

          {/* Titre produit */}
          <h1 style={{ fontSize: '26px', fontWeight: 900, margin: '4px 0 10px', lineHeight: 1.25, color: 'var(--tx)' }}>
            {product.n}
          </h1>

          {/* Évaluation & Avis */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: 'var(--tx)' }}>4,8</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', color: '#f59e0b', gap: '1px' }}>
              {[...Array(5)].map((_, i) => (
                <span key={i} className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>star</span>
              ))}
            </span>
            <span style={{ color: 'var(--mu)', fontSize: '12px' }}>({reviewsList.length} avis vérifiés)</span>
            <span style={{ color: 'var(--mu)', opacity: 0.5 }}>•</span>
            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '14px' }}>verified</span>
              <span>Qualité certifiée Takapay</span>
            </span>
          </div>

          {/* Affichage du prix dynamique directement sur la page */}
          <div style={{ margin: '14px 0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '30px', fontWeight: 900, color: 'var(--r)', letterSpacing: '-0.5px' }}>
                {formatFCFA(orderMode === 'cash' ? (effectiveCashPrice * cashQuantity) : currentPrice)}
              </span>
              {currentOldPrice && (
                <s style={{ fontSize: '16px', color: 'var(--mu)', fontWeight: 500 }}>
                  {formatFCFA(orderMode === 'cash' ? (currentOldPrice * cashQuantity) : currentOldPrice)}
                </s>
              )}
              {discount > 0 && (
                <span style={{ fontSize: '11.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '99px', background: 'rgba(220, 38, 38, 0.12)', color: 'var(--r)' }}>
                  −{discount}% Promo
                </span>
              )}
              {orderMode === 'cash' && cashQuantity > 1 && (
                <span style={{ fontSize: '12.5px', color: 'var(--mu)', fontWeight: 600 }}>
                  ({cashQuantity} × {formatFCFA(effectiveCashPrice)})
                </span>
              )}
            </div>
          </div>

          {/* 3 Avantages clés vérifiés directement sur la page façon DK HomeTech */}
          <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--tx)', fontWeight: 600 }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '17px', color: 'var(--r)', flexShrink: 0 }}>check_circle</span>
              <span>Qualité vérifiée · Produit 100% neuf et authentique</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--tx)', fontWeight: 600 }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '17px', color: 'var(--r)', flexShrink: 0 }}>check_circle</span>
              <span>Livraison rapide partout au Bénin (Cotonou, Calavi, Parakou...)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--tx)', fontWeight: 600 }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '17px', color: 'var(--r)', flexShrink: 0 }}>check_circle</span>
              <span>Conseil magasin et accompagnement Takapay</span>
            </li>
          </ul>

          {/* Choix des déclinaisons de couleur directement sur la page */}
          {colors.length > 0 && (
            <div style={{ margin: '0 0 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'gap', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tx)' }}>
                  Couleur / Finition disponible :
                </span>
                <span style={{ fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                  Sélection : <strong style={{ color: 'var(--tx)' }}>{chosenColor?.name || 'Standard'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '99px',
                        border: isSelected ? '2px solid var(--r)' : '1.5px solid var(--bd)',
                        background: isSelected ? '#ffffff' : 'var(--cd)',
                        boxShadow: isSelected ? '0 2px 8px rgba(220, 38, 38, 0.15)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: c.hex,
                          border: '1px solid rgba(0,0,0,0.15)',
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 800 : 600, color: 'var(--tx)' }}>
                        {c.name}
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px', color: 'var(--r)' }}>check</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SÉLECTEUR DE FORMULE DIRECTEMENT SUR LA PAGE (CASH COMPTANT VS CAGNOTTE LIBRE) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tx)' }}>
                Choisissez votre formule d'acquisition :
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: orderMode === 'cash' ? 'rgba(30, 41, 59, 0.08)' : 'rgba(220, 38, 38, 0.1)', color: orderMode === 'cash' ? '#1e293b' : 'var(--r)' }}>
                {orderMode === 'cash' ? 'ACHAT COMPTANT' : 'ÉPARGNE LIBRE'}
              </span>
            </div>

            {/* Cartes de sélection du mode posées directement sur la page */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Option Cash */}
              <button
                type="button"
                onClick={() => setOrderMode('cash')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: orderMode === 'cash' ? '2px solid #1e293b' : '1.5px solid var(--bd)',
                  background: orderMode === 'cash' ? '#ffffff' : 'var(--cd)',
                  boxShadow: orderMode === 'cash' ? '0 4px 12px rgba(30, 41, 59, 0.08)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: orderMode === 'cash' ? '#1e293b' : 'var(--tx)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>payments</span>
                    <span>Option Cash</span>
                  </span>
                  {orderMode === 'cash' && (
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px', color: '#1e293b' }}>check</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>
                  Unitaire : <b>{formatFCFA(effectiveCashPrice)}</b>
                </div>
                <div style={{ fontSize: '11px', color: orderMode === 'cash' ? '#1e293b' : 'var(--mu)', marginTop: '2px', fontWeight: 700 }}>
                  Quantité ajustable au choix
                </div>
              </button>

              {/* Option Cagnotte Libre */}
              <button
                type="button"
                onClick={() => setOrderMode('cagnotte')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: orderMode === 'cagnotte' ? '2px solid var(--r)' : '1.5px solid var(--bd)',
                  background: orderMode === 'cagnotte' ? '#ffffff' : 'var(--cd)',
                  boxShadow: orderMode === 'cagnotte' ? '0 4px 12px rgba(220, 38, 38, 0.1)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: orderMode === 'cagnotte' ? 'var(--r)' : 'var(--tx)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>savings</span>
                    <span>Cagnotte Libre</span>
                  </span>
                  {orderMode === 'cagnotte' && (
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px', color: 'var(--r)' }}>check</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--mu)', marginTop: '4px' }}>
                  1er versement : <b>{formatFCFA(effectiveFirstDeposit)}</b>
                </div>
                <div style={{ fontSize: '11px', color: orderMode === 'cagnotte' ? 'var(--r)' : 'var(--mu)', marginTop: '2px', fontWeight: 700 }}>
                  3 propositions de versement
                </div>
              </button>
            </div>

            {/* Détails du mode actif posés directement sur la page */}
            {orderMode === 'cash' ? (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1.5px solid var(--bd)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>
                    Sélectionnez le nombre d'articles :
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--tx)', marginTop: '2px' }}>
                    Total : <strong style={{ color: 'var(--r)', fontSize: '13.5px' }}>{formatFCFA(effectiveCashPrice * cashQuantity)}</strong>
                  </div>
                </div>

                {/* Sélecteur de quantité stepper */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--sf)', padding: '4px', borderRadius: '99px', border: '1px solid var(--bd)' }}>
                  <button
                    type="button"
                    disabled={cashQuantity <= 1}
                    onClick={() => setCashQuantity((q) => Math.max(1, q - 1))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid var(--bd)',
                      background: '#ffffff',
                      color: 'var(--tx)',
                      fontWeight: 800,
                      fontSize: '15px',
                      cursor: cashQuantity <= 1 ? 'not-allowed' : 'pointer',
                      opacity: cashQuantity <= 1 ? 0.35 : 1,
                    }}
                    aria-label="Diminuer la quantité"
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
                      width: '44px',
                      textAlign: 'center',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '14.5px',
                      fontWeight: 900,
                      color: 'var(--tx)',
                    }}
                    aria-label="Quantité"
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
                      borderRadius: '50%',
                      border: '1px solid var(--bd)',
                      background: '#ffffff',
                      color: 'var(--tx)',
                      fontWeight: 800,
                      fontSize: '15px',
                      cursor: (product.stockCount && cashQuantity >= product.stockCount) ? 'not-allowed' : 'pointer',
                      opacity: (product.stockCount && cashQuantity >= product.stockCount) ? 0.35 : 1,
                    }}
                    aria-label="Augmenter la quantité"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              /* CAGNOTTE LIBRE : 3 CHOIX AVEC DIFFÉRENTES PROPOSITIONS */
              <div
                style={{
                  marginTop: '12px',
                  padding: '14px',
                  background: 'rgba(220, 38, 38, 0.03)',
                  borderRadius: '16px',
                  border: '1.5px solid rgba(220, 38, 38, 0.18)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--tx)' }}>
                    Choisissez votre proposition de versement :
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--r)', fontWeight: 800 }}>
                    Objectif : {formatFCFA(currentPrice)}
                  </span>
                </div>

                {/* 3 Cartes de proposition */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {/* Proposition 1 : 1er versement de 10% */}
                  <button
                    type="button"
                    onClick={() => setCagnotteOption('offer_10')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: cagnotteOption === 'offer_10' ? '2px solid var(--r)' : '1px solid var(--bd)',
                      background: cagnotteOption === 'offer_10' ? '#ffffff' : 'var(--cd)',
                      boxShadow: cagnotteOption === 'offer_10' ? '0 3px 10px rgba(220, 38, 38, 0.12)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: cagnotteOption === 'offer_10' ? 'var(--r)' : 'var(--tx)' }}>
                        Offre 10%
                      </span>
                      {cagnotteOption === 'offer_10' && (
                        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px', color: 'var(--r)' }}>check_circle</span>
                      )}
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 900, color: cagnotteOption === 'offer_10' ? 'var(--r)' : 'var(--tx)' }}>
                      {formatFCFA(deposit10)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--mu)', marginTop: '2px' }}>
                      1er versement
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--tx)', marginTop: '4px', fontWeight: 600 }}>
                      Reste : {formatFCFA(currentPrice - deposit10)}
                    </div>
                  </button>

                  {/* Proposition 2 : 1er versement de 15% */}
                  <button
                    type="button"
                    onClick={() => setCagnotteOption('offer_15')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: cagnotteOption === 'offer_15' ? '2px solid var(--r)' : '1px solid var(--bd)',
                      background: cagnotteOption === 'offer_15' ? '#ffffff' : 'var(--cd)',
                      boxShadow: cagnotteOption === 'offer_15' ? '0 3px 10px rgba(220, 38, 38, 0.12)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: cagnotteOption === 'offer_15' ? 'var(--r)' : 'var(--tx)' }}>
                        Offre 15%
                      </span>
                      {cagnotteOption === 'offer_15' && (
                        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px', color: 'var(--r)' }}>check_circle</span>
                      )}
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 900, color: cagnotteOption === 'offer_15' ? 'var(--r)' : 'var(--tx)' }}>
                      {formatFCFA(deposit15)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--mu)', marginTop: '2px' }}>
                      1er versement
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--tx)', marginTop: '4px', fontWeight: 600 }}>
                      Reste : {formatFCFA(currentPrice - deposit15)}
                    </div>
                  </button>

                  {/* Proposition 3 : Montant sur mesure selon son budget */}
                  <button
                    type="button"
                    onClick={() => setCagnotteOption('custom')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: cagnotteOption === 'custom' ? '2px solid var(--r)' : '1px solid var(--bd)',
                      background: cagnotteOption === 'custom' ? '#ffffff' : 'var(--cd)',
                      boxShadow: cagnotteOption === 'custom' ? '0 3px 10px rgba(220, 38, 38, 0.12)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: cagnotteOption === 'custom' ? 'var(--r)' : 'var(--tx)' }}>
                        Mon budget
                      </span>
                      {cagnotteOption === 'custom' && (
                        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px', color: 'var(--r)' }}>check_circle</span>
                      )}
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 900, color: cagnotteOption === 'custom' ? 'var(--r)' : 'var(--tx)' }}>
                      {parsedCustomAmount > 0 ? formatFCFA(parsedCustomAmount) : 'Sur-mesure'}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--mu)', marginTop: '2px' }}>
                      Montant libre
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--tx)', marginTop: '4px', fontWeight: 600 }}>
                      Selon vos moyens
                    </div>
                  </button>
                </div>

                {/* Champ de saisie si Proposition 3 (Mon budget) sélectionnée */}
                {cagnotteOption === 'custom' && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid var(--bd)',
                    }}
                  >
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--tx)', marginBottom: '6px' }}>
                      Indiquez combien vous souhaitez verser pour démarrer :
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min={500}
                        max={currentPrice}
                        value={customCagnotteAmount}
                        onChange={(e) => setCustomCagnotteAmount(e.target.value)}
                        placeholder={`Ex: ${deposit10}`}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1.5px solid var(--bd)',
                          fontSize: '14px',
                          fontWeight: 800,
                          color: 'var(--tx)',
                          background: 'var(--sf)',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--mu)' }}>FCFA</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--mu)' }}>
                      <span>Minimum : {formatFCFA(500)}</span>
                      {parsedCustomAmount > 0 && (
                        <span>
                          Solde restant : <strong style={{ color: 'var(--tx)' }}>{formatFCFA(Math.max(0, currentPrice - parsedCustomAmount))}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Règle de l'Option Cagnotte Libre */}
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    background: 'rgba(220, 38, 38, 0.05)',
                    borderRadius: '10px',
                    fontSize: '11.5px',
                    color: 'var(--tx)',
                    lineHeight: 1.45,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px', color: 'var(--r)', flexShrink: 0, marginTop: '1px' }}>savings</span>
                  <div>
                    <strong>Règle de récupération :</strong> le client récupère son article une fois la cagnotte atteinte ({formatFCFA(currentPrice)} épargnés). Sans intérêts ni pénalités.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACTIONS D'ACHAT DIRECT (PAS DE PANIER) */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Bouton d'action principal CTA rouge compact */}
            <button
              type="button"
              className="client-btn"
              style={{
                flex: 1,
                fontSize: '14px',
                padding: '11px 16px',
                borderRadius: '12px',
                fontWeight: 800,
                background: 'var(--r)',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                height: '44px',
              }}
              onClick={() => {
                if (orderMode === 'cash') {
                  setShowPaymentModal(true);
                  setPaymentModalStep('choice');
                } else {
                  onStartOrder(product, chosenColor, {
                    mode: 'cagnotte',
                    quantity: 1,
                    firstDeposit: effectiveFirstDeposit,
                    cagnotteOption,
                  });
                }
              }}
            >
              <span>Passer ma commande</span>
            </button>

            {/* Bouton vert avec logo WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#25D366',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                transition: 'transform 0.15s ease',
                flexShrink: 0,
              }}
              title="Commander sur WhatsApp"
              aria-label="WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.42a9.9 9.9 0 0 0 4.62 1.17h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Z" />
              </svg>
            </a>

            {/* Bouton Favoris inline */}
            <button
              type="button"
              onClick={toggleFavorite}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: isFavorite ? '2px solid var(--r)' : '1.5px solid var(--bd)',
                background: isFavorite ? 'rgba(220, 38, 38, 0.08)' : 'var(--cd)',
                color: isFavorite ? 'var(--r)' : 'var(--tx)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                flexShrink: 0,
              }}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-label="Favoris"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
          </div>

          <p className="auth-footnote" style={{ marginTop: '12px', textAlign: 'center', fontSize: '11.5px', color: 'var(--mu)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px' }}>lock</span>
            <span>{orderMode === 'cash' ? 'Règlement au choix : En ligne (MoMo, Carte) ou en espèces à la livraison.' : 'Paiement fractionné 100% sécurisé et garanti sans aucun risque.'}</span>
          </p>
        </div>

        {/* COLONNE 3 : ASIDE RÉASSURANCE & INFOS CLÉS FAÇON DK HOMETECH */}
        <aside className="product-aside">
          {/* Carte 1 : Livraison estimée au Bénin */}
          <div className="aside-info-card">
            <div className="aside-info-card-title">
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px', color: 'var(--r)' }}>local_shipping</span>
              <span>Livraison estimée</span>
            </div>
            <p className="aside-info-card-text">
              <strong>Cotonou & Calavi :</strong> 24–48 h (1 000 – 2 000 FCFA)
            </p>
            <p className="aside-info-card-text">
              <strong>Porto-Novo & Parakou :</strong> 48–72 h
            </p>
            <p className="aside-info-card-text" style={{ fontSize: '11.5px', color: '#16a34a', marginTop: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px' }}>check_circle</span>
              <span>Remise en main propre sécurisée</span>
            </p>
          </div>

          {/* Carte 2 : Flexibilité Takapay */}
          <div className="aside-info-card">
            <div className="aside-info-card-title">
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px', color: 'var(--r)' }}>savings</span>
              <span>Formule Takapay</span>
            </div>
            <p className="aside-info-card-text">
              <strong>Option Cash :</strong> Paiement intégral immédiat ou à la réception du colis.
            </p>
            <p className="aside-info-card-text" style={{ marginTop: '6px' }}>
              <strong>Option Cagnotte Libre :</strong> Le client récupère l'article une fois la cagnotte atteinte à 100%.
            </p>
          </div>

          {/* Carte 3 : Support & Service client */}
          <div className="aside-info-card">
            <div className="aside-info-card-title">
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px', color: 'var(--r)' }}>support_agent</span>
              <span>Besoin d'aide ?</span>
            </div>
            <p className="aside-info-card-text">
              Une question sur cet article ou sur votre commande ? Nos conseillers sont à votre écoute au Bénin.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '8px',
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--r)',
                textDecoration: 'none',
              }}
            >
              Contacter le support Takapay →
            </a>
          </div>

          {/* Carte 4 : Partager l'article */}
          <div className="aside-info-card">
            <div className="aside-info-card-title">
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>share</span>
              <span>Partager l'article</span>
            </div>
            <div className="aside-share-buttons">
              <button
                type="button"
                className="aside-share-btn"
                onClick={handleCopyLink}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px' }}>content_copy</span>
                <span>Copier le lien</span>
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Regarde cet article sur Takapay : ${product.n} - ${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="aside-share-btn"
              >
                WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="aside-share-btn"
              >
                Facebook
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* =========================================================================
          ZONE INFÉRIEURE : ONGLETS DÉTAILLÉS (DESCRIPTION | MODALITÉS | AVIS | GARANTIE)
          ========================================================================= */}
      <section className="product-tabs-section">
        {/* Navigation des onglets */}
        <div className="product-tabs-nav" role="tablist">
          <button
            type="button"
            className={`product-tab-btn ${activeTab === 'description' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('description')}
            role="tab"
            aria-selected={activeTab === 'description'}
          >
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>description</span>
            <span>Description & Spécifications</span>
          </button>
          <button
            type="button"
            className={`product-tab-btn ${activeTab === 'modalites' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('modalites')}
            role="tab"
            aria-selected={activeTab === 'modalites'}
          >
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>credit_card</span>
            <span>Modalités Cash & Cagnotte Libre</span>
          </button>
          <button
            type="button"
            className={`product-tab-btn ${activeTab === 'avis' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('avis')}
            role="tab"
            aria-selected={activeTab === 'avis'}
          >
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>star</span>
            <span>Avis clients ({reviewsList.length})</span>
          </button>
          <button
            type="button"
            className={`product-tab-btn ${activeTab === 'garantie' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('garantie')}
            role="tab"
            aria-selected={activeTab === 'garantie'}
          >
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>verified_user</span>
            <span>Garantie & Authenticité</span>
          </button>
        </div>

        {/* Panneau 1 : Description & Spécifications */}
        {activeTab === 'description' && (
          <div className="product-tab-panel">
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px', color: 'var(--tx)' }}>
              Présentation détaillée de l'article
            </h3>
            <p style={{ margin: '0 0 16px', lineHeight: 1.7, color: 'var(--mu)', whiteSpace: 'pre-line' }}>
              {product.d || "Cet article est certifié par Takapay et provient de notre réseau de distributeurs agréés au Bénin. Il offre une fiabilité remarquable et bénéficie d'une garantie constructeur intégrale."}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <div style={{ padding: '12px 14px', background: 'var(--sf)', borderRadius: '12px', border: '1px solid var(--bd)' }}>
                <small style={{ color: 'var(--mu)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Catégorie</small>
                <b style={{ color: 'var(--tx)', fontSize: '13.5px' }}>{categoryName}</b>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--sf)', borderRadius: '12px', border: '1px solid var(--bd)' }}>
                <small style={{ color: 'var(--mu)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Sous-catégorie</small>
                <b style={{ color: 'var(--tx)', fontSize: '13.5px' }}>{subcategoryName}</b>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--sf)', borderRadius: '12px', border: '1px solid var(--bd)' }}>
                <small style={{ color: 'var(--mu)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>État du produit</small>
                <b style={{ color: '#16a34a', fontSize: '13.5px' }}>Neuf sous scellé d'origine</b>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--sf)', borderRadius: '12px', border: '1px solid var(--bd)' }}>
                <small style={{ color: 'var(--mu)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Disponibilité</small>
                <b style={{ color: 'var(--tx)', fontSize: '13.5px' }}>{product.stockCount !== null ? `${product.stockCount} unités disponibles` : 'Disponible immédiatement'}</b>
              </div>
            </div>
          </div>
        )}

        {/* Panneau 2 : Modalités Cash & Cagnotte Libre */}
        {activeTab === 'modalites' && (
          <div className="product-tab-panel">
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 14px', color: 'var(--tx)' }}>
              Comment fonctionne l'acquisition sur Takapay ?
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Encadré Option Cash */}
              <div style={{ padding: '18px', background: 'var(--sf)', borderRadius: '16px', border: '1.5px solid var(--bd)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px', color: '#1e293b' }}>payments</span>
                  <b style={{ fontSize: '15px', color: '#1e293b' }}>1. Option Cash (Paiement comptant)</b>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--mu)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  Vous pouvez commander la quantité exacte d'articles souhaitée en un seul règlement.
                </p>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--tx)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Quantité libre : ajustez le nombre d'articles selon vos besoins.</li>
                  <li>Paiement immédiat en ligne (MTN MoMo, Celtiis, Moov, Carte).</li>
                  <li>Ou paiement en espèces directement au livreur à la réception.</li>
                  <li>Livraison express sous 24h à 48h au Bénin.</li>
                </ul>
              </div>

              {/* Encadré Cagnotte Libre */}
              <div style={{ padding: '18px', background: 'rgba(220, 38, 38, 0.04)', borderRadius: '16px', border: '1.5px solid rgba(220, 38, 38, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px', color: 'var(--r)' }}>savings</span>
                  <b style={{ fontSize: '15px', color: 'var(--r)' }}>2. Option Cagnotte Libre (Épargne progressive)</b>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--mu)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  Permet d'épargner sereinement pour 1 article sans stress financier.
                </p>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--tx)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Premier versement initial au choix (10%, 15% ou selon votre budget).</li>
                  <li>Cotisations libres : vous versez le montant de votre choix quand vous le désirez.</li>
                  <li><strong>Règle de récupération :</strong> le client récupère son article une fois la cagnotte atteinte à 100% ({formatFCFA(currentPrice)} épargnés).</li>
                  <li>Zéro pénalité et sécurité totale de vos fonds sur votre espace client.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Panneau 3 : Avis clients & Formulaire */}
        {activeTab === 'avis' && (
          <div className="product-tab-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--tx)' }}>
                  Avis et retours d'expérience clients
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--mu)', margin: '4px 0 0' }}>
                  Retours authentiques sur les produits, la conformité et la livraison au Bénin.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--sf)', padding: '6px 14px', borderRadius: '99px', border: '1px solid var(--bd)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', color: '#f59e0b', gap: '1px' }}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </span>
                <b style={{ fontSize: '13px', color: 'var(--tx)' }}>4,8 / 5</b>
              </div>
            </div>

            {/* Grille des avis */}
            <div className="reviews-grid">
              {reviewsList.map((rev, idx) => (
                <div key={idx} className="review-item-card">
                  <div className="review-item-header">
                    <div className="review-item-avatar">
                      {rev.name.charAt(0)}
                    </div>
                    <div>
                      <b style={{ fontSize: '13.5px', color: 'var(--tx)', display: 'block' }}>{rev.name}</b>
                      <small style={{ color: 'var(--mu)', fontSize: '11px' }}>{rev.city} · {rev.date}</small>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#f59e0b', gap: '1px', marginBottom: '6px' }}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '14px', fontVariationSettings: i < rev.rating ? "'FILL' 1" : "'FILL' 0" }}>
                        {i < rev.rating ? 'star' : 'star_outline'}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--tx)', margin: 0, lineHeight: 1.5 }}>
                    "{rev.text}"
                  </p>
                </div>
              ))}
            </div>

            {/* Formulaire pour laisser un avis */}
            <form onSubmit={handleAddReview} style={{ marginTop: '24px', padding: '18px', background: 'var(--sf)', borderRadius: '16px', border: '1px solid var(--bd)' }}>
              <b style={{ fontSize: '14px', color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>rate_review</span>
                <span>Partagez votre expérience sur cet article</span>
              </b>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  required
                  placeholder="Votre nom complet *"
                  value={newReviewAuthor}
                  onChange={(e) => setNewReviewAuthor(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--bd)', background: 'var(--cd)', color: 'var(--tx)', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Votre ville (ex: Cotonou, Calavi...)"
                  value={newReviewCity}
                  onChange={(e) => setNewReviewCity(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--bd)', background: 'var(--cd)', color: 'var(--tx)', fontSize: '13px' }}
                />
                <select
                  value={newReviewRating}
                  onChange={(e) => setNewReviewRating(Number(e.target.value))}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--bd)', background: 'var(--cd)', color: 'var(--tx)', fontSize: '13px' }}
                >
                  <option value={5}>5 étoiles (5 / 5)</option>
                  <option value={4}>4 étoiles (4 / 5)</option>
                  <option value={3}>3 étoiles (3 / 5)</option>
                  <option value={2}>2 étoiles (2 / 5)</option>
                  <option value={1}>1 étoile (1 / 5)</option>
                </select>
              </div>

              <textarea
                required
                rows={3}
                placeholder="Votre commentaire sur le produit ou la livraison…"
                value={newReviewComment}
                onChange={(e) => setNewReviewComment(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--bd)', background: 'var(--cd)', color: 'var(--tx)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '10px' }}
              />

              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--r)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                }}
              >
                Publier mon avis
              </button>
            </form>
          </div>
        )}

        {/* Panneau 4 : Garantie & Sécurité */}
        {activeTab === 'garantie' && (
          <div className="product-tab-panel">
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px', color: 'var(--tx)' }}>
              Les engagements qualité et sécurité Takapay
            </h3>
            <p style={{ margin: '0 0 14px', lineHeight: 1.65, color: 'var(--mu)' }}>
              Nous collaborons directement avec les grossistes et importateurs agréés au Bénin pour vous garantir une authenticité sans faille.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '16px', background: 'var(--sf)', borderRadius: '14px', border: '1px solid var(--bd)' }}>
                <b style={{ color: 'var(--tx)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px', color: 'var(--r)' }}>verified_user</span>
                  <span>Garantie Constructeur</span>
                </b>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--mu)', lineHeight: 1.5 }}>
                  Chaque article neuf dispose d'une garantie légale d'au moins 6 à 12 mois contre tout défaut de fabrication.
                </p>
              </div>
              <div style={{ padding: '16px', background: 'var(--sf)', borderRadius: '14px', border: '1px solid var(--bd)' }}>
                <b style={{ color: 'var(--tx)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px', color: 'var(--r)' }}>inventory_2</span>
                  <span>Contrôle avant expédition</span>
                </b>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--mu)', lineHeight: 1.5 }}>
                  Votre colis est soigneusement emballé et vérifié par nos équipes avant la remise au livreur.
                </p>
              </div>
              <div style={{ padding: '16px', background: 'var(--sf)', borderRadius: '14px', border: '1px solid var(--bd)' }}>
                <b style={{ color: 'var(--tx)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px', color: 'var(--r)' }}>support_agent</span>
                  <span>Assistance & SAV</span>
                </b>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--mu)', lineHeight: 1.5 }}>
                  Un support réactif au Bénin pour vous assister à tout moment après réception.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          APRÈS LA ZONE INFÉRIEURE : PROPOSITIONS D'ARTICLES AU CAS OÙ LE CLIENT EST INTÉRESSÉ
          ========================================================================= */}
      {proposalArticles.length > 0 && (
        <section className="product-proposals-section">
          <div className="product-proposals-header">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--r)', background: 'rgba(220, 38, 38, 0.08)', padding: '3px 10px', borderRadius: '8px', marginBottom: '6px' }}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>auto_awesome</span>
                <span>Recommandations pour vous</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--tx)', margin: 0 }}>
                Ces articles pourraient aussi vous intéresser
              </h2>
            </div>
            <button
              type="button"
              onClick={onBack}
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--r)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Voir tout le catalogue →
            </button>
          </div>

          <div className="product-proposals-grid">
            {proposalArticles.map((item) => {
              const itemDiscount = item.o && item.o > item.p ? Math.round((1 - item.p / item.o) * 100) : 0;
              return (
                <div
                  key={item.id}
                  className="proposal-item-card"
                  onClick={() => onSelectProduct(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectProduct(item.id);
                  }}
                >
                  <div className="proposal-img-box">
                    <img
                      src={item.im}
                      alt={item.n}
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.opacity = '0';
                      }}
                    />
                    {itemDiscount > 0 && (
                      <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--r)', color: '#fff', fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px' }}>
                        −{itemDiscount}%
                      </span>
                    )}
                  </div>

                  <div className="proposal-content-box">
                    <span style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                      {item.c || item.subcategory}
                    </span>
                    <div className="proposal-title" title={item.n}>
                      {item.n}
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 700, margin: '4px 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {item.payment?.mode === 'cash' ? (
                        <>
                          <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px' }}>payments</span>
                          <span>Paiement Cash</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px' }}>savings</span>
                          <span>Option Cagnotte Libre</span>
                        </>
                      )}
                    </div>

                    <div className="proposal-price">
                      {formatFCFA(item.p)}
                      {item.o && item.o > item.p && (
                        <s style={{ fontSize: '12px', color: 'var(--mu)', fontWeight: 500, marginLeft: '6px' }}>
                          {formatFCFA(item.o)}
                        </s>
                      )}
                    </div>

                    <div className="proposal-action">
                      <span>Découvrir l'article</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          BARRE D'ACTION MOBILE STICKY EN BAS
          ========================================================================= */}
      <div className="product-sticky-mobile-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          className="client-btn"
          style={{
            flex: 1,
            padding: '11px 14px',
            fontSize: '13.5px',
            fontWeight: 800,
            borderRadius: '12px',
            background: 'var(--r)',
            cursor: 'pointer',
            height: '42px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            if (orderMode === 'cash') {
              setShowPaymentModal(true);
              setPaymentModalStep('choice');
            } else {
              onStartOrder(product, chosenColor, {
                mode: 'cagnotte',
                quantity: 1,
                firstDeposit: effectiveFirstDeposit,
                cagnotteOption,
              });
            }
          }}
        >
          <span>Passer ma commande</span>
        </button>

        {/* Bouton vert avec logo WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#25D366',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          title="Commander sur WhatsApp"
          aria-label="WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.42a9.9 9.9 0 0 0 4.62 1.17h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Z" />
          </svg>
        </a>

        <button
          type="button"
          onClick={toggleFavorite}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: isFavorite ? '2px solid var(--r)' : '1.5px solid var(--bd)',
            background: isFavorite ? 'rgba(220, 38, 38, 0.08)' : 'var(--cd)',
            color: isFavorite ? 'var(--r)' : 'var(--tx)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Favoris"
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>
      </div>

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
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>payments</span>
                    <span>Modalité de règlement</span>
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
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>close</span>
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
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '24px' }}>smartphone</span>
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
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '24px' }}>local_shipping</span>
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
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 6px', color: 'var(--tx, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '22px', color: 'var(--r)' }}>local_shipping</span>
                  <span>Coordonnées de livraison</span>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px' }}>warning</span>
                    <span>{deliveryError}</span>
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
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '13px' }}>home</span>
                            <span>Profil : {user.adresse}</span>
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
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isLocating ? (
                            <>
                              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '13px' }}>hourglass_empty</span>
                              <span>Détection...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '13px' }}>location_on</span>
                              <span>Ma position</span>
                            </>
                          )}
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
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                          <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '11px', fontWeight: 600 }}>
                            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '13px' }}>check_circle</span>
                            <span>Position enregistrée avec succès pour la livraison</span>
                          </small>
                          <a
                            href={`https://www.google.com/maps?q=${deliveryCoords.replace(/\s+/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '13px' }}>open_in_new</span>
                            <span>Google Maps</span>
                          </a>
                        </div>
                        <iframe
                          title="Aperçu Google Maps de livraison"
                          width="100%"
                          height="130"
                          style={{
                            border: '1px solid var(--bd, #e2e8f0)',
                            borderRadius: '8px',
                            display: 'block',
                          }}
                          loading="lazy"
                          src={`https://maps.google.com/maps?q=${deliveryCoords.replace(/\s+/g, '')}&hl=fr&z=15&output=embed`}
                        />
                      </div>
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
                    <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '18px', color: '#1e40af' }}>info</span>
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
                    margin: '0 auto 16px',
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '38px', color: '#16a34a' }}>check_circle</span>
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '16px', color: 'var(--r)' }}>lightbulb</span>
                  <div>Cette commande a été ajoutée à vos <b>Cagnottes</b>. Vous pourrez y suivre son traitement et cliquer sur <b>« Oui, article reçu »</b> après réception.</div>
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
