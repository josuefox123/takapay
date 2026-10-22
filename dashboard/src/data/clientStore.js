import { TAKAPAY_CATEGORIES } from './takapayCategories';

export { TAKAPAY_CATEGORIES };

/**
 * Normalise l'URL d'une image pour assurer qu'elle est toujours accessible
 */
export const resolveImageUrl = (path) => {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('/assets/')) {
    return path;
  }
  if (path.startsWith('/storage/')) {
    return path;
  }
  if (path.startsWith('produits/') || path.startsWith('categories/') || path.startsWith('documents/')) {
    return `/storage/${path}`;
  }
  return `/storage/produits/${path}`;
};

export const getColorHex = (name) => {
  if (!name || typeof name !== 'string') return '#374151';
  const n = name.trim().toLowerCase();
  if (n.includes('noir') || n.includes('black') || n.includes('sombre')) return '#18181b';
  if (n.includes('blanc') || n.includes('white') || n.includes('perle') || n.includes('neige')) return '#f8fafc';
  if (n.includes('gris') || n.includes('grey') || n.includes('gray') || n.includes('argent') || n.includes('silver')) return '#94a3b8';
  if (n.includes('bleu') || n.includes('blue') || n.includes('cobalt') || n.includes('azur') || n.includes('ocean')) return '#2563eb';
  if (n.includes('rouge') || n.includes('red') || n.includes('bordeaux') || n.includes('carmin')) return '#dc2626';
  if (n.includes('or') || n.includes('gold') || n.includes('dore') || n.includes('ambre')) return '#d97706';
  if (n.includes('vert') || n.includes('green') || n.includes('olive') || n.includes('emeraude')) return '#16a34a';
  if (n.includes('rose') || n.includes('pink')) return '#ec4899';
  if (n.includes('violet') || n.includes('purple') || n.includes('pourpre')) return '#8b5cf6';
  if (n.includes('orange')) return '#ea580c';
  if (n.includes('jaune') || n.includes('yellow')) return '#eab308';
  if (n.includes('marron') || n.includes('brown') || n.includes('chocolat')) return '#78350f';
  if (n.includes('titane') || n.includes('titanium')) return '#64748b';
  return '#4b5563';
};

/**
 * Convertit un produit issu de la base de données Laravel / du dashboard admin
 * vers le format attendu par les composants du portail client.
 */
export const mapAdminProductToClient = (p) => {
  if (!p) return null;
  if (p.n && p.p !== undefined && p.c && p.images && p.images.length > 0) {
    return p;
  }

  const param = p.parametre_produit || {};
  const price = Number(param.prix_total || p.prix_total || p.prix || 0);
  const cashPrice = param.prix_cash !== undefined && param.prix_cash !== null && param.prix_cash !== '' && Number(param.prix_cash) > 0
    ? Number(param.prix_cash)
    : (p.prix_cash && Number(p.prix_cash) > 0 ? Number(p.prix_cash) : price);
  const promo = param.promotion;
  const promoPercent = promo ? Number(promo.pourcentage_promo || 0) : 0;
  const discountedPrice = promoPercent > 0 ? Math.round(price * (1 - promoPercent / 100)) : price;
  const discountedCashPrice = promoPercent > 0 ? Math.round(cashPrice * (1 - promoPercent / 100)) : cashPrice;
  const oldPrice = promoPercent > 0 ? price : null;

  // Récupérer les images réelles du produit depuis image_produits (MySQL) ou images (formulaire admin)
  const rawImages = Array.isArray(p.image_produits) && p.image_produits.length > 0
    ? p.image_produits
    : Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : [];

  let primaryImg = '';
  let imageList = [];

  if (rawImages.length > 0) {
    // Trier par position croissante
    const sorted = [...rawImages].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));

    // L'image principale est marquée avec is_principal
    const principalItem = sorted.find((img) => img.is_principal === true || img.is_principal === 1 || img.is_principal === '1');
    const principalChemin = principalItem ? (principalItem.chemin || principalItem.url) : null;

    const allPaths = sorted.map((im) => (typeof im === 'string' ? im : im.chemin || im.url)).filter(Boolean);

    const rawPrimary = principalChemin || allPaths[0] || '';
    primaryImg = resolveImageUrl(rawPrimary);

    // L'image principale vient en premier, toutes les images secondaires viennent en bas
    const secondaryPaths = allPaths.filter((path) => path !== rawPrimary).map(resolveImageUrl);
    imageList = primaryImg ? [primaryImg, ...secondaryPaths] : allPaths.map(resolveImageUrl);
  } else if (p.im) {
    primaryImg = resolveImageUrl(p.im);
    imageList = [primaryImg];
  }

  if (!primaryImg) {
    primaryImg = '';
    imageList = [];
  }

  const subcategoryName =
    p.sous_categorie_nom ||
    (typeof p.sous_categorie === 'string'
      ? p.sous_categorie
      : p.sous_categorie?.nom || p.subcategory || 'Articles');

  const categoryName =
    p.categorie_nom ||
    p.sous_categorie?.categorie?.nom ||
    p.categorie?.nom ||
    (typeof p.c === 'string' ? p.c : null) ||
    subcategoryName;

  const seuilLivraisonVal = Number(
    param.seuil_livraison || p.seuil_livraison || Math.round(discountedPrice * 0.4)
  );

  return {
    id: p.id || Date.now(),
    n: p.nom || p.name || p.n || 'Article TakaPay',
    c: categoryName,
    subcategory: subcategoryName,
    p: discountedPrice,
    prix_cash: discountedCashPrice,
    prix_total: discountedPrice,
    o: oldPrice,
    im: primaryImg,
    video: p.video ? (typeof p.video === 'string' ? resolveImageUrl(p.video) : (p.video.chemin ? resolveImageUrl(p.video.chemin) : p.video)) : null,
    stockCount: p.stock !== undefined ? Number(p.stock) : 15,
    availabilityDuration: p.duree ? `${p.duree} mois de disponibilité` : 'Disponible',
    duree: Number(p.duree || 6),
    d: p.description || p.d || 'Article de qualité certifiée disponible sur TakaPay.',
    colors: (() => {
      if (p.couleur) {
        try {
          if (typeof p.couleur === 'string' && (p.couleur.startsWith('[') || p.couleur.startsWith('{'))) {
            const arr = JSON.parse(p.couleur);
            if (Array.isArray(arr) && arr.length > 0) {
              return arr.map((c) => {
                const cName = typeof c === 'string' ? c : (c.nom || c.name || 'Standard');
                const hasCustom = typeof c === 'object' && c.prix !== undefined && c.prix !== null && c.prix !== '' && Number(c.prix) > 0;
                const rawCPrice = hasCustom ? Number(c.prix) : price;
                const cDiscountedPrice = promoPercent > 0 ? Math.round(rawCPrice * (1 - promoPercent / 100)) : rawCPrice;
                const cOldPrice = promoPercent > 0 ? rawCPrice : null;
                return {
                  name: cName,
                  price: cDiscountedPrice,
                  rawPrice: rawCPrice,
                  oldPrice: cOldPrice,
                  hasCustomPrice: hasCustom,
                  hex: getColorHex(cName),
                };
              });
            }
          } else if (typeof p.couleur === 'string') {
            const parts = p.couleur.split(',').map((c) => c.trim()).filter(Boolean);
            if (parts.length > 0) {
              return parts.map((part) => {
                let cName = part;
                let customPrice = null;
                const matchParen = part.match(/^([^()]+)\s*\(([^)]+)\)$/);
                const matchColon = part.match(/^([^:]+)\s*:\s*(\d+)/);
                if (matchParen) {
                  cName = matchParen[1].trim();
                  const numStr = matchParen[2].replace(/[^\d]/g, '');
                  if (numStr) customPrice = Number(numStr);
                } else if (matchColon) {
                  cName = matchColon[1].trim();
                  customPrice = Number(matchColon[2]);
                }
                const hasCustom = customPrice !== null && customPrice > 0;
                const rawCPrice = hasCustom ? customPrice : price;
                const cDiscountedPrice = promoPercent > 0 ? Math.round(rawCPrice * (1 - promoPercent / 100)) : rawCPrice;
                const cOldPrice = promoPercent > 0 ? rawCPrice : null;
                return {
                  name: cName,
                  price: cDiscountedPrice,
                  rawPrice: rawCPrice,
                  oldPrice: cOldPrice,
                  hasCustomPrice: hasCustom,
                  hex: getColorHex(cName),
                };
              });
            }
          }
        } catch { /* ignore */ }
        return [{ name: p.couleur, price: discountedPrice, rawPrice: price, oldPrice, hex: getColorHex(p.couleur), hasCustomPrice: false }];
      }
      return p.colors || [{ name: 'Standard', price: discountedPrice, rawPrice: price, oldPrice, hex: '#374151', hasCustomPrice: false }];
    })(),
    seuilLivraison: seuilLivraisonVal,
    payment: {
      mode: param.mode_paiement === 'libre' ? 'libre' : 'echelon',
      minimumStart: Number(param.prix_minimum || Math.round(price * 0.1)),
      installmentAmount: param.mode_paiement === 'libre' ? null : Number(param.prix_echelonne || Math.round(price / Math.max(1, p.duree || 6))),
      frequency: param.mode_paiement === 'libre' ? null : (param.frequence || 'mensuelle'),
      estimatedEnd: param.mode_paiement === 'libre' ? null : `${p.duree || 6} mois`,
      seuilLivraison: seuilLivraisonVal,
      prixCash: discountedCashPrice,
      demo: true,
    },
    isLiveFromDb: true,
  };
};

export const getStoredCustomProducts = () => {
  try {
    const raw = localStorage.getItem('takapay_created_products');
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.map(mapAdminProductToClient).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const CATEGORIES = [];
export const SUBCATEGORIES_MAP = {};

const getCustomCategories = () => {
  try {
    const raw = localStorage.getItem('takapay_created_categories');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getCustomSubcategories = () => {
  try {
    const raw = localStorage.getItem('takapay_created_subcategories');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const rebuildCategories = (apiCategories = []) => {
  let list = Array.isArray(apiCategories) && apiCategories.length > 0 ? apiCategories : [];
  if (list.length === 0) {
    try {
      const raw = localStorage.getItem('takapay_backend_categories');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      }
    } catch { /* ignore */ }
  }

  // Mettre à jour TAKAPAY_CATEGORIES strictement avec les catégories réelles issues de l'API / BD
  TAKAPAY_CATEGORIES.length = 0;

  list.forEach((cat) => {
    const catNom = (cat.nom || cat.name || '').trim();
    if (!catNom) return;

    const subs = Array.isArray(cat.sous_categories)
      ? cat.sous_categories.map((s) => ({
          id: s.id,
          name: s.nom || s.name,
          image: s.image ? resolveImageUrl(s.image) : null,
          examples: '',
        }))
      : [];

    TAKAPAY_CATEGORIES.push({
      id: String(cat.id || catNom),
      name: catNom,
      icon: cat.icon || '🛍️',
      image: resolveImageUrl(cat.image),
      subcategories: subs,
    });
  });

  // Reconstruire CATEGORIES pour le catalogue (avec pastille 'Tous' si des catégories existent)
  const newCategories = TAKAPAY_CATEGORIES.length > 0
    ? [
        { id: 'Tous', name: 'Toutes', icon: '✨', image: '/assets/logo-icon.png' },
        ...TAKAPAY_CATEGORIES.map((c) => ({
          id: c.name,
          name: c.name,
          icon: c.icon,
          image: c.image,
          subcategories: c.subcategories || [],
        })),
      ]
    : [];

  CATEGORIES.length = 0;
  CATEGORIES.push(...newCategories);

  // Mettre à jour le dictionnaire de sous-catégories
  Object.keys(SUBCATEGORIES_MAP).forEach((k) => delete SUBCATEGORIES_MAP[k]);
  TAKAPAY_CATEGORIES.forEach((cat) => {
    SUBCATEGORIES_MAP[cat.name] = (cat.subcategories || []).map((s) => s.name);
  });
};

// Initialisation immédiate
rebuildCategories();

// Récupération asynchrone depuis la base de données
export const syncCategoriesFromDb = async () => {
  try {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const json = await res.json();
      const list = json.data || json;
      if (Array.isArray(list)) {
        try {
          if (list.length > 0) {
            localStorage.setItem('takapay_backend_categories', JSON.stringify(list));
          } else {
            localStorage.removeItem('takapay_backend_categories');
          }
        } catch { /* ignore */ }
        rebuildCategories(list);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: list }));
        }
        return list;
      }
    }
  } catch { }
  return [];
};

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('takapay_created_products');
    localStorage.removeItem('takapay_created_categories');
    localStorage.removeItem('takapay_created_subcategories');
    localStorage.removeItem('takapay_backend_categories');
    localStorage.removeItem('takapay_backend_cagnottes');
    localStorage.removeItem('takapay-notifications');
    localStorage.removeItem('takapay-demo-cagnotte');
  } catch { /* ignore */ }
  syncCategoriesFromDb();
  window.addEventListener('takapay_categories_updated', (e) => {
    rebuildCategories(e.detail ? [e.detail] : []);
  });
}

export const CAMPAIGNS = [];

export const PRODUCTS = [];

export const getMergedProducts = () => {
  const custom = getStoredCustomProducts();
  const existingIds = new Set(custom.map((c) => c.id));
  const remainingBase = BASE_PRODUCTS.filter((b) => !existingIds.has(b.id));
  return [...custom, ...remainingBase];
};

export const BASE_PRODUCTS = PRODUCTS;

export const refreshProductsFromStore = () => {
  const merged = getMergedProducts();
  PRODUCTS.length = 0;
  PRODUCTS.push(...merged);
  return PRODUCTS;
};

export const formatFCFA = (val) => {
  if (val === null || val === undefined || val === '') return 'À confirmer';
  const num = Number(val);
  return Number.isFinite(num) ? `${Math.round(num).toLocaleString('fr-FR')} FCFA` : 'À confirmer';
};

export const discountPercentage = (p) => {
  if (!p || !p.o || p.o <= p.p) return 0;
  return Math.round((1 - p.p / p.o) * 100);
};

export const formatClientDate = (value) => {
  if (!value) return 'À confirmer';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const DEFAULT_CLIENT_USER = null;


export const DEFAULT_CAGNOTTE = null;


export const createCagnotteFromOrder = (orderData, user = null) => {
  const prod = orderData?.product || {};
  const initialPaid = Number(orderData?.initialAmount) || 0;
  const totalOrderPrice = Number(orderData?.totalPrice) || Number(prod.p) || 0;
  const remaining = Math.max(0, totalOrderPrice - initialPaid);
  const percent = totalOrderPrice > 0 ? Math.min(100, Math.round((initialPaid / totalOrderPrice) * 100)) : 100;
  const now = new Date();
  const dateFormatted =
    now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const clientName =
    user?.n ||
    `${user?.prenom || ''} ${user?.nom || ''}`.trim() ||
    orderData?.user?.n ||
    'Client TakaPay';

  const clientPhone = user?.phone || user?.telephone || orderData?.telephone || '';
  const clientEmail = user?.email || orderData?.email || '';
  const clientUserId = user?.id ? String(user.id) : (clientPhone || null);

  return {
    id: `cag-${Date.now()}`,
    userId: clientUserId,
    userPhone: clientPhone,
    userEmail: clientEmail,
    isReal: true,
    product: {
      id: prod.id || Date.now(),
      n: prod.n || prod.nom || 'Article TakaPay',
      c: prod.c || prod.category || prod.categorie_nom || 'Catalogue',
      subcategory: prod.subcategory || prod.sous_categorie_nom || 'Article',
      p: totalOrderPrice,
      im: prod.im || (prod.images && prod.images[0]) || '',
      variant: orderData?.selectedColor?.name
        ? `${orderData.selectedColor.name} · 1 unité`
        : 'Standard · 1 unité',
    },
    dateCommande: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
    prixTotal: totalOrderPrice,
    montantVerse: initialPaid,
    resteAPayer: remaining,
    pourcentage: percent,
    prochainVersement: {
      montant: prod.payment?.installmentAmount || Math.round(totalOrderPrice * 0.1),
      date: 'Le mois prochain',
    },
    dateFinEstimee: `${prod.duree || 6} mois`,
    moisRestants: prod.duree || 6,
    statut: remaining === 0 ? 'completed' : 'active',
    transactions: [
      {
        id: `tx-${Date.now()}`,
        reference: `TK-${orderData?.provider === 'Moov' ? 'MOOV' : 'MM'}-${Math.floor(100000 + Math.random() * 900000)}`,
        titre: 'Premier versement (Acompte)',
        methode: orderData?.provider === 'Moov' ? 'Moov Money' : 'MTN Mobile Money',
        date: dateFormatted,
        montant: initialPaid,
        statut: 'Réussi',
        type: 'versement',
        periode: 'aujourdhui',
        telephone: clientPhone,
        client: clientName,
      },
    ],
  };
};

export const mapBackendCagnotteToClient = (c) => {
  if (!c) return null;
  const prod = c.produit || {};
  const total = Number(c.prix_unitaire || prod.parametre_produit?.prix_total || 0);
  const paid = Number(c.montant_verse || 0);
  const remaining = Math.max(0, total - paid);
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const rawImages = Array.isArray(prod.image_produits) && prod.image_produits.length > 0
    ? prod.image_produits
    : [];
  let primaryImg = '';
  if (rawImages.length > 0) {
    const sorted = [...rawImages].sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
    const principalItem = sorted.find((img) => img.is_principal === true || img.is_principal === 1 || img.is_principal === '1');
    primaryImg = resolveImageUrl(principalItem ? (principalItem.chemin || principalItem.url) : (sorted[0]?.chemin || sorted[0]?.url));
  } else if (prod.im) {
    primaryImg = resolveImageUrl(prod.im);
  }
  if (!primaryImg) primaryImg = '';

  const txs = Array.isArray(c.transactions) ? c.transactions.map((t) => ({
    id: `tx-${t.id}`,
    reference: t.reference_externe || `TK-${t.id}`,
    titre: 'Versement cagnotte',
    methode: t.moyen_paiement || c.moyen_paiement || 'MTN Mobile Money',
    date: t.date ? new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Récemment',
    montant: Number(t.montant || 0),
    statut: t.statut === 'succes' || t.statut === 'reussi' ? 'Réussi' : (t.statut || 'Réussi'),
    type: 'versement',
    periode: 'aujourdhui',
  })) : [];

  return {
    id: `cag-${c.id}`,
    backendId: c.id,
    userId: c.utilisateur_id ? String(c.utilisateur_id) : null,
    userPhone: c.client_tel || null,
    product: {
      id: prod.id || Date.now(),
      n: prod.nom || 'Article TakaPay',
      c: prod.sous_categorie?.categorie?.nom || 'Article',
      subcategory: prod.sous_categorie?.nom || 'Article',
      p: total,
      im: primaryImg,
      variant: (() => {
      if (!prod.couleur) return 'Standard · 1 unité';
      try {
        if (typeof prod.couleur === 'string' && (prod.couleur.startsWith('[') || prod.couleur.startsWith('{'))) {
          const parsed = JSON.parse(prod.couleur);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstItem = parsed[0];
            const col = typeof firstItem === 'string' ? firstItem : (firstItem.nom || firstItem.name || 'Standard');
            return `${col} · 1 unité`;
          }
        } else if (typeof prod.couleur === 'string') {
          const first = prod.couleur.split(',')[0].trim();
          const clean = first.replace(/\([^)]*\)/g, '').replace(/:.*$/, '').trim();
          return `${clean || 'Standard'} · 1 unité`;
        }
      } catch { /* ignore */ }
      return 'Standard · 1 unité';
    })(),
    },
    dateCommande: c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Récemment',
    prixTotal: total,
    montantVerse: paid,
    resteAPayer: remaining,
    pourcentage: percent,
    prochainVersement: {
      montant: Math.round(total * 0.1),
      date: 'Le mois prochain',
    },
    dateFinEstimee: '6 mois',
    moisRestants: 6,
    statut: c.statut === 'terminee' || percent >= 100 ? 'completed' : 'active',
    transactions: txs.length > 0 ? txs : [
      {
        id: `tx-init-${c.id}`,
        reference: `TK-INIT-${c.id}`,
        titre: 'Versement initial',
        methode: c.moyen_paiement || 'MTN Mobile Money',
        date: c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : 'Récemment',
        montant: paid,
        statut: 'Réussi',
        type: 'versement',
        periode: 'aujourdhui',
      }
    ],
  };
};

export const getStoredCagnottes = (_user = null) => {
  // Nettoyage immédiat et strict du localStorage contre toute ancienne cagnotte fictive
  try {
    localStorage.removeItem('takapay-demo-cagnotte');
    localStorage.removeItem('takapay-client-cagnottes');
  } catch { /* ignore */ }

  // Lire UNIQUEMENT les cagnottes réelles issues du backend / dashboard admin
  let backendList = [];
  try {
    const rawBackend = localStorage.getItem('takapay_backend_cagnottes');
    if (rawBackend) {
      const parsed = JSON.parse(rawBackend);
      if (Array.isArray(parsed)) backendList = parsed;
    }
  } catch { /* ignore */ }

  // Filtre strict : Ne conserver que les cagnottes authentiques du dashboard admin
  return backendList.filter((c) => c && (c.backendId || c.id));
};


export const DEFAULT_NOTIFICATIONS = [];


