import { TAKAPAY_CATEGORIES } from './takapayCategories';

export { TAKAPAY_CATEGORIES };

/**
 * Normalise l'URL d'une image pour assurer qu'elle est toujours accessible
 */
export const resolveImageUrl = (path) => {
  if (!path || typeof path !== 'string') return '/assets/campaign-deals.jpg';
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
  const price = Number(param.prix_total || param.prix_cash || p.prix || 0);
  const promo = param.promotion;
  const promoPercent = promo ? Number(promo.pourcentage_promo || 0) : 0;
  const discountedPrice = promoPercent > 0 ? Math.round(price * (1 - promoPercent / 100)) : price;
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
    primaryImg = '/assets/campaign-deals.jpg';
    imageList = [primaryImg];
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
    o: oldPrice,
    im: primaryImg,
    images: imageList.length > 0 ? imageList : [primaryImg],
    video: p.video || null,
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
          } else if (typeof p.couleur === 'string' && p.couleur.includes(',')) {
            return p.couleur.split(',').map((c) => {
              const name = c.trim();
              return { name, price: discountedPrice, rawPrice: price, oldPrice, hex: getColorHex(name), hasCustomPrice: false };
            });
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
  const customCats = getCustomCategories();
  const customSubs = getCustomSubcategories();

  const extraCats = [...customCats];
  if (Array.isArray(apiCategories)) {
    apiCategories.forEach((apiCat) => {
      const catNom = apiCat.nom || apiCat.name;
      if (!catNom) return;
      if (!extraCats.some((c) => String(c.id) === String(apiCat.id) || (c.nom && c.nom.toLowerCase() === catNom.toLowerCase()))) {
        extraCats.push(apiCat);
      }
    });
  }

  // Intégrer les nouvelles catégories créées
  extraCats.forEach((cat) => {
    const catName = cat.nom || cat.name;
    if (!catName) return;
    const exists = TAKAPAY_CATEGORIES.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    const subs = Array.isArray(cat.sous_categories)
      ? cat.sous_categories.map((s) => ({ name: s.nom || s.name, examples: '' }))
      : [];
    if (!exists) {
      TAKAPAY_CATEGORIES.push({
        id: `cat-${cat.id || Date.now()}`,
        name: catName,
        icon: cat.icon || '📦',
        image: cat.image || '/assets/category-accessories.jpg',
        subcategories: subs,
      });
    } else {
      if (cat.image) exists.image = cat.image;
      if (subs.length > 0 && exists.subcategories.length === 0) {
        exists.subcategories = subs;
      }
    }
  });

  // Intégrer les sous-catégories créées
  customSubs.forEach((sub) => {
    const parentCat = TAKAPAY_CATEGORIES.find(
      (c) => String(c.id) === String(sub.categorie_id) || c.name === sub.categorie_nom
    );
    if (parentCat && !parentCat.subcategories.some((s) => s.name === sub.nom)) {
      parentCat.subcategories.push({ name: sub.nom, examples: '' });
    }
  });

  // Reconstruire CATEGORIES
  const newCategories = [
    { id: 'Tous', name: 'Toutes', icon: '✨', image: '/assets/category-phones.jpg' },
    ...TAKAPAY_CATEGORIES.map((c) => ({
      id: c.name,
      name: c.name,
      icon: c.icon || '🛍️',
      image: c.image || `/assets/category-${
        c.id.includes('tele')
          ? 'phones'
          : c.id.includes('info')
          ? 'computers'
          : c.id.includes('moto')
          ? 'motorcycles'
          : c.id.includes('electro')
          ? 'appliances'
          : c.id.includes('audio')
          ? 'media'
          : 'accessories'
      }.jpg`,
      subcategories: c.subcategories || [],
    })),
  ];

  CATEGORIES.length = 0;
  CATEGORIES.push(...newCategories);

  // Mettre à jour SUBCATEGORIES_MAP
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
      if (Array.isArray(list) && list.length > 0) {
        rebuildCategories(list);
        return list;
      }
    }
  } catch {}
  return [];
};

if (typeof window !== 'undefined') {
  syncCategoriesFromDb();
  window.addEventListener('takapay_categories_updated', (e) => {
    rebuildCategories(e.detail ? [e.detail] : []);
  });
}

export const CAMPAIGNS = [
  {
    id: 1,
    kicker: 'PROMOTION -18%',
    title: 'Table à manger 6 places',
    subtitle: 'Bois massif',
    price: '165 000 FCFA',
    oldPrice: '200 000 FCFA',
    versement: 'Dès 20 500 FCFA par versement',
    desc: 'Bois massif d’iroko verni, confort et durabilité pour votre salle à manger.',
    btnText: 'J’en profite →',
    image: '/assets/campaign-deals.jpg',
    action: 'promos',
  },
  {
    id: 2,
    kicker: 'Électroménager & Froid',
    title: 'Réfrigérateur double battant pour la maison.',
    desc: 'Grand confort au quotidien : démarrez votre cagnotte et recevez votre équipement dès 40% cotisé.',
    btnText: 'Voir le réfrigérateur',
    image: '/assets/product-fridge.jpg',
    action: 'promos',
  },
  {
    id: 3,
    kicker: 'Deux roues & Mobilité',
    title: 'Moto neuve Haojue 110, roulez l’esprit libre.',
    desc: 'Votre moyen de déplacement fiable au Bénin, financé progressivement sans pression.',
    btnText: 'Découvrir la moto',
    image: '/assets/product-moto.jpg',
    action: 'promos',
  },
];

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

export const DEFAULT_CLIENT_USER = {
  n: 'Koffi DOSSOU',
  nom: 'Koffi DOSSOU',
  phone: '+229 0162180290',
  email: 'koffidossou@gmail.com',
  id: '+2290162180290',
  avatar: '/assets/koffi-avatar.jpg',
  isVerified: true,
  ville: 'Cotonou',
  adresse: 'Fidjrossè plage, maison Dossou',
};

export const DEFAULT_CAGNOTTE = {
  id: 'cag-1',
  product: {
    id: 1,
    n: 'iPhone 16 pro max',
    c: 'Téléphones',
    subcategory: 'iPhone',
    p: 450000,
    im: '/assets/product-iphone-16.jpg',
    variant: 'noir . 128 Go . 1 unité',
  },
  dateCommande: '10 oct 2026',
  prixTotal: 450000,
  montantVerse: 100000,
  resteAPayer: 350000,
  pourcentage: 25,
  prochainVersement: {
    montant: 50000,
    date: 'Le 10 novembre 2026',
  },
  dateFinEstimee: '30 juin 2027',
  moisRestants: 8,
  statut: 'active', // 'active' | 'completed'
  transactions: [
    {
      id: 'tx-1',
      reference: 'TK-MM-948102',
      titre: 'Versement',
      methode: 'MTN Mobile Money',
      date: '10/10/2026 13:45',
      montant: 100000,
      statut: 'Réussi',
      type: 'versement',
      periode: '30_jours',
      telephone: '+229 0162180290',
      client: 'Koffi DOSSOU',
    },
    {
      id: 'tx-2',
      reference: 'TK-MM-950244',
      titre: 'Versement',
      methode: 'MTN Mobile Money',
      date: '10/11/2026 18:30',
      montant: 50000,
      statut: 'Réussi',
      type: 'versement',
      periode: '7_jours',
      telephone: '+229 0162180290',
      client: 'Koffi DOSSOU',
    },
  ],
};

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

  const clientPhone = user?.phone || user?.telephone || '+229 0162180290';

  return {
    id: `cag-${Date.now()}`,
    product: {
      id: prod.id || Date.now(),
      n: prod.n || prod.nom || 'Article TakaPay',
      c: prod.c || prod.category || prod.categorie_nom || 'Catalogue',
      subcategory: prod.subcategory || prod.sous_categorie_nom || 'Article',
      p: totalOrderPrice,
      im: prod.im || (prod.images && prod.images[0]) || '/assets/category-phones.jpg',
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

export const getStoredCagnottes = (user = null) => {
  let list = [];
  try {
    const raw = localStorage.getItem('takapay-client-cagnottes');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch {}

  // Si aucune liste takapay-client-cagnottes mais des commandes enregistrées
  if (list.length === 0) {
    try {
      const ordersRaw = localStorage.getItem('takapay-client-orders');
      if (ordersRaw) {
        const ordersList = JSON.parse(ordersRaw);
        if (Array.isArray(ordersList) && ordersList.length > 0) {
          list = ordersList.map((ord) => createCagnotteFromOrder(ord, user));
        }
      }
    } catch {}
  }

  // Si toujours vide, inclure takapay-demo-cagnotte ou DEFAULT_CAGNOTTE
  if (list.length === 0) {
    try {
      const savedSingle = localStorage.getItem('takapay-demo-cagnotte');
      if (savedSingle) {
        const parsed = JSON.parse(savedSingle);
        if (parsed && parsed.product) list.push(parsed);
      }
    } catch {}
  }

  if (list.length === 0) {
    list.push(DEFAULT_CAGNOTTE);
  }

  return list;
};

export const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    category: 'paiements',
    title: 'Paiement réussi',
    description: 'Votre versement de 100 000 FCFA a été validé avec succès.',
    date: '10/10/2026 13:45',
    iconType: 'success',
  },
  {
    id: 'notif-2',
    category: 'cagnotte',
    title: 'Prochain versement',
    description: 'Votre prochain versement de 50 000 FCFA est prévu pour le 10 novembre 2026.',
    date: '05/11/2026',
    iconType: 'warning',
  },
  {
    id: 'notif-3',
    category: 'infos',
    title: 'Offre spéciale',
    description: "Profitez de -25% de réduction sur une sélection d'ordinateurs jusqu'au 31 décembre.",
    date: '15/10/2026',
    iconType: 'promo',
  },
];

