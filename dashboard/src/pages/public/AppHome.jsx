import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Header from '../../components/public/Header';
import ClientHomeView from '../../components/client/ClientHomeView';
import ClientCatalogView from '../../components/client/ClientCatalogView';
import ClientSubcategoryView from '../../components/client/ClientSubcategoryView';
import ClientProductDetail from '../../components/client/ClientProductDetail';
import ClientOrderFlow from '../../components/client/ClientOrderFlow';
import ClientCagnotteView from '../../components/client/ClientCagnotteView';
import ClientProfileView from '../../components/client/ClientProfileView';
import ClientNotificationsView from '../../components/client/ClientNotificationsView';
import ClientWelcomeModal from '../../components/client/ClientWelcomeModal';
import ClientCookieBanner from '../../components/client/ClientCookieBanner';
import { PRODUCTS, DEFAULT_CLIENT_USER, mapAdminProductToClient, getMergedProducts, refreshProductsFromStore, createCagnotteFromOrder, getStoredCagnottes, mapBackendCagnotteToClient, rebuildCategories } from '../../data/clientStore';
import { adminService } from '../../services/adminService';
import FloatingActionButtons from '../../components/public/FloatingActionButtons';
import './client.css';

export default function AppHome({ initialTab = 'home' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId, category: routeCategory } = useParams();

  // Navigation & vues : 'home' | 'shop' | 'subcat' | 'product' | 'order' | 'cag' | 'pro' | 'notif'
  const [view, setView] = useState(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [previousView, setPreviousView] = useState('home');

  // Produits synchronisés en temps réel avec la base de données et le tableau de bord admin
  const [productsList, setProductsList] = useState(getMergedProducts);

  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setView(initialTab);
  }

  // Sélection Catalogue
  const [selectedCat, setSelectedCat] = useState(() => {
    if (routeCategory) {
      try {
        return decodeURIComponent(routeCategory);
      } catch {
        return routeCategory;
      }
    }
    return 'Tous';
  });
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [isPromoOnly, setIsPromoOnly] = useState(false);
  const [isFavoritesOnly, setIsFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Produit actif pour la vue détaillée
  const [activeProductId, setActiveProductId] = useState(() => {
    if (routeId && !Number.isNaN(Number(routeId))) {
      return Number(routeId);
    }
    return 1;
  });
  const [selectedColorForOrder, setSelectedColorForOrder] = useState(null);
  const [orderOptions, setOrderOptions] = useState({ mode: 'cagnotte', quantity: 1 });

  // Utilisateur connecté & Cagnottes (sauvegarde en localStorage)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('takapay-client-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [cagnotteCount, setCagnotteCount] = useState(() => {
    try {
      const saved = localStorage.getItem('takapay-client-user');
      const savedUser = saved ? JSON.parse(saved) : null;
      const list = getStoredCagnottes(savedUser);
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  });

  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('takapay-client-orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cagnotteKey, setCagnotteKey] = useState(0);
  const [currentCagnotte, setCurrentCagnotte] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Modal de bienvenue
  const [showWelcome, setShowWelcome] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Notification Toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  // Affichage du modal promo après 500ms si non vu cette session
  useEffect(() => {
    try {
      const seen = sessionStorage.getItem('takapay-welcome-seen');
      if (!seen) {
        const timer = setTimeout(() => {
          setShowWelcome(true);
          sessionStorage.setItem('takapay-welcome-seen', 'true');
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignorer
    }
  }, []);

  // Synchronisation bidirectionnelle avec les routes URL
  useEffect(() => {
    const p = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const subParam = searchParams.get('sub');
    const isPromoParam = searchParams.get('promo') === '1';

    const productMatch = p.match(/^\/app\/produits?\/([^/]+)/);
    const orderMatch = p.match(/^\/app\/commande(?:\/([^/]+))?/);
    const categoryMatch = p.match(/^\/app\/categories\/([^/]+)/);

    if (productMatch) {
      const pId = Number(productMatch[1]);
      if (!Number.isNaN(pId)) {
        setActiveProductId(pId);
      }
      setIsFavoritesOnly(false);
      setView('product');
    } else if (orderMatch) {
      if (orderMatch[1]) {
        const pId = Number(orderMatch[1]);
        if (!Number.isNaN(pId)) {
          setActiveProductId(pId);
        }
      }
      setIsFavoritesOnly(false);
      setView('order');
    } else if (categoryMatch) {
      try {
        setSelectedCat(decodeURIComponent(categoryMatch[1]));
      } catch {
        setSelectedCat(categoryMatch[1]);
      }
      setIsFavoritesOnly(false);
      if (subParam) {
        try {
          setSelectedSubCat(decodeURIComponent(subParam));
        } catch {
          setSelectedSubCat(subParam);
        }
        setIsPromoOnly(false);
        setView('subcat');
      } else {
        setSelectedSubCat('');
        setIsPromoOnly(false);
        setView('shop');
      }
    } else if (p === '/app/produits' || p === '/app/categories' || p === '/catalogue') {
      setIsFavoritesOnly(false);
      if (subParam) {
        try {
          setSelectedSubCat(decodeURIComponent(subParam));
        } catch {
          setSelectedSubCat(subParam);
        }
        setIsPromoOnly(false);
        setView('subcat');
      } else if (isPromoParam) {
        setSelectedSubCat('Promotions');
        setIsPromoOnly(true);
        setView('subcat');
      } else {
        setSelectedSubCat('');
        setIsPromoOnly(false);
        setView('shop');
      }
    } else if (p === '/app/favoris') {
      setIsFavoritesOnly(true);
      setIsPromoOnly(false);
      setSelectedSubCat('Mes Favoris');
      setView('subcat');
    } else if (p === '/app/cagnotte') {
      setIsFavoritesOnly(false);
      setView('cag');
    } else if (p === '/app/profil') {
      setIsFavoritesOnly(false);
      setView('pro');
    } else if (p === '/app/notifications') {
      setIsFavoritesOnly(false);
      setView('notif');
    } else if (p === '/connexion') {
      setIsFavoritesOnly(false);
      setView('order');
    } else if (p === '/app') {
      setIsFavoritesOnly(false);
      setView('home');
    }
  }, [location.pathname, location.search]);

  // Synchronisation réactive du compteur de cagnottes pour l'utilisateur connecté
  useEffect(() => {
    if (!user?.id) {
      setCagnotteCount(0);
      return;
    }
    const currentList = getStoredCagnottes(user);
    setCagnotteCount(currentList.length);

    const handleCagUpdate = () => {
      if (!user?.id) {
        setCagnotteCount(0);
        return;
      }
      const list = getStoredCagnottes(user);
      if (Array.isArray(list)) {
        setCagnotteCount(list.length);
      }
    };
    window.addEventListener('takapay_cagnotte_updated', handleCagUpdate);
    return () => window.removeEventListener('takapay_cagnotte_updated', handleCagUpdate);
  }, [user]);

  // Synchronisation des notifications non lues filtrées pour l'utilisateur connecté
  useEffect(() => {
    let isMounted = true;
    const fetchNotifs = async () => {
      if (!user?.id) {
        if (isMounted) setUnreadNotifCount(0);
        return;
      }
      try {
        const notifs = await adminService.getNotifications(user.id);
        if (isMounted && Array.isArray(notifs)) {
          const userNotifs = notifs.filter((n) => String(n.utilisateur_id) === String(user.id));
          const unread = userNotifs.filter((n) => n.statut === 'non_lu').length;
          setUnreadNotifCount(unread);
        }
      } catch {
        // En cas d'erreur réseau, ne rien faire
      }
    };

    fetchNotifs();

    const handleNotifUpdate = () => {
      fetchNotifs();
    };

    window.addEventListener('takapay_notification_updated', handleNotifUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('takapay_notification_updated', handleNotifUpdate);
    };
  }, [user]);

  // Chargement initial des catégories depuis l'API
  useEffect(() => {
    adminService.getCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length > 0) {
        rebuildCategories(cats);
        window.dispatchEvent(new CustomEvent('takapay_categories_updated', { detail: cats }));
      }
    }).catch(() => {});
  }, []);

  // Synchronisation des cagnottes réelles de l'utilisateur connecté depuis le backend
  useEffect(() => {
    let isMounted = true;
    if (!user?.id) {
      setCagnotteCount(0);
      return;
    }

    const loadUserCagnottes = async () => {
      try {
        const live = await adminService.getCagnottes(user.id);
        if (isMounted && Array.isArray(live)) {
          const converted = live.map(mapBackendCagnotteToClient).filter(Boolean);
          try {
            localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(converted));
          } catch { /* ignore */ }
          const merged = getStoredCagnottes(user);
          setCagnotteCount(merged.length);
          setCagnotteKey((k) => k + 1);
        }
      } catch { /* ignore */ }
    };

    loadUserCagnottes();

    const handleCagnotteUpdated = () => {
      loadUserCagnottes();
      setCagnotteKey((k) => k + 1);
    };
    window.addEventListener('takapay_cagnotte_updated', handleCagnotteUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('takapay_cagnotte_updated', handleCagnotteUpdated);
    };
  }, [user]);

  // Synchronisation en direct des produits du catalogue avec la base de données
  useEffect(() => {
    let isMounted = true;

    const loadLiveProducts = async () => {
      try {
        const liveItems = await adminService.getProduits();
        if (isMounted && Array.isArray(liveItems)) {
          const clientConverted = liveItems.map(mapAdminProductToClient).filter(Boolean);
          PRODUCTS.length = 0;
          PRODUCTS.push(...clientConverted);
          try {
            localStorage.setItem('takapay_cached_products', JSON.stringify(clientConverted));
          } catch { /* ignore */ }
          setProductsList(clientConverted);
        }
      } catch {
        // En cas d'indisponibilité du backend, conserve les produits en mémoire
      }
    };

    loadLiveProducts();

    const handleProductsUpdated = () => {
      refreshProductsFromStore();
      loadLiveProducts();
    };

    window.addEventListener('takapay_products_updated', handleProductsUpdated);
    window.addEventListener('storage', handleProductsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('takapay_products_updated', handleProductsUpdated);
      window.removeEventListener('storage', handleProductsUpdated);
    };
  }, []);

  // Défilement en haut lors du changement de vue
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // Gestion du thème
  const handleToggleTheme = () => {
    const current = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = current === 'dark' ? 'light' : 'dark';
  };

  // Actions de navigation avec mise à jour des routes
  const handleSelectTab = (tab) => {
    setSearchQuery('');
    setPreviousView(view);
    if (tab === 'home') {
      setIsPromoOnly(false);
      setIsFavoritesOnly(false);
      setView('home');
      navigate('/app');
    } else if (tab === 'shop') {
      setIsPromoOnly(false);
      setIsFavoritesOnly(false);
      setView('shop');
      navigate('/app/produits');
    } else if (tab === 'fav') {
      setIsFavoritesOnly(true);
      setIsPromoOnly(false);
      setSelectedSubCat('Mes Favoris');
      setView('subcat');
      navigate('/app/favoris');
    } else if (tab === 'cag') {
      setIsFavoritesOnly(false);
      setView('cag');
      navigate('/app/cagnotte');
    } else if (tab === 'pro') {
      setIsFavoritesOnly(false);
      setView('pro');
      navigate('/app/profil');
    } else if (tab === 'notif') {
      setIsFavoritesOnly(false);
      setView('notif');
      navigate('/app/notifications');
    }
  };

  const handleOpenProduct = (idOrProduct) => {
    const id = typeof idOrProduct === 'object' && idOrProduct !== null ? idOrProduct.id : idOrProduct;
    setPreviousView(view);
    setActiveProductId(id);
    setView('product');
    navigate(`/app/produits/${id}`);
  };

  const handleSelectCategory = (catId) => {
    setIsPromoOnly(false);
    setIsFavoritesOnly(false);
    setSelectedCat(catId);
    setSelectedSubCat('');
    setView('shop');
    if (catId && catId !== 'Tous') {
      navigate(`/app/categories/${encodeURIComponent(catId)}`);
    } else {
      navigate('/app/produits');
    }
  };

  const handleSelectSubcategory = (subName, categoryName) => {
    setPreviousView(view);
    if (categoryName) {
      setSelectedCat(categoryName);
    }
    setSelectedSubCat(subName);
    setIsPromoOnly(false);
    setIsFavoritesOnly(false);
    setView('subcat');
    if (categoryName && categoryName !== 'Tous') {
      navigate(`/app/categories/${encodeURIComponent(categoryName)}?sub=${encodeURIComponent(subName)}`);
    } else {
      navigate(`/app/produits?sub=${encodeURIComponent(subName)}`);
    }
  };

  const handleSelectPromo = () => {
    setPreviousView(view);
    setIsPromoOnly(true);
    setIsFavoritesOnly(false);
    setSelectedSubCat('Promotions');
    setView('subcat');
    navigate('/app/produits?promo=1');
  };

  const handleBackFromSubcategory = () => {
    setIsFavoritesOnly(false);
    setIsPromoOnly(false);
    setSelectedSubCat('');
    if (previousView === 'home') {
      setView('home');
      navigate('/app');
    } else if (selectedCat && selectedCat !== 'Tous') {
      setView('shop');
      navigate(`/app/categories/${encodeURIComponent(selectedCat)}`);
    } else {
      setView('shop');
      navigate('/app/produits');
    }
  };

  const handleStartOrder = (product, color, options = {}) => {
    setSelectedColorForOrder(color);
    setOrderOptions({
      mode: options.mode || 'cagnotte',
      quantity: options.quantity || 1,
      initialDeposit: options.firstDeposit || options.deposit || options.initialDeposit || null,
    });
    const pId = product?.id || activeProductId;
    if (pId) {
      setActiveProductId(pId);
      setView('order');
      navigate(`/app/commande/${pId}`);
    } else {
      setView('order');
      navigate('/app/commande');
    }
  };

  const handleUserAuthSuccess = (loggedUser, customMsg) => {
    setUser(loggedUser);
    try {
      localStorage.setItem('takapay-client-user', JSON.stringify(loggedUser));
    } catch {
      // Ignorer
    }
    showToast(customMsg || `Bienvenue ${loggedUser.prenom || loggedUser.nom || loggedUser.n || 'chez TakaPay'} !`);
  };

 const handleCompleteOrder = (orderData) => {
  const updated = [orderData, ...orders];
  setOrders(updated);

  try {
    localStorage.setItem('takapay-client-orders', JSON.stringify(updated));
  } catch {
    // Ignorer
  }

  const newCagnotte = createCagnotteFromOrder(orderData, user);
  setCurrentCagnotte(newCagnotte);

  let allCagnottes = [];
  try {
    const raw = localStorage.getItem('takapay_backend_cagnottes');
    if (raw) allCagnottes = JSON.parse(raw);
  } catch { /* ignore */ }
  if (!Array.isArray(allCagnottes)) allCagnottes = [];

  const updatedCagnottes = [newCagnotte, ...allCagnottes.filter((c) => c && c.id !== newCagnotte.id)];
  setCagnotteCount(updatedCagnottes.length);
  try {
    localStorage.setItem('takapay_backend_cagnottes', JSON.stringify(updatedCagnottes));
    localStorage.removeItem('takapay-client-cagnottes');
    localStorage.removeItem('takapay-demo-cagnotte');
  } catch {
    // Ignorer
  }

  try {
    window.dispatchEvent(new CustomEvent('takapay_cagnotte_updated', { detail: updatedCagnottes }));
  } catch {
    // Ignorer
  }

  setCagnotteKey((k) => k + 1);
  const isCashOrder = Boolean(orderData?.isCash || orderData?.isCod || orderData?.type_commande === 'cash');
  if (isCashOrder) {
    showToast(`Votre commande pour ${orderData.product?.n || 'l’article'} a été enregistrée avec succès !`);
    setView('pro');
    navigate('/app/profil');
  } else {
    showToast(`Votre cagnotte pour ${orderData.product?.n || 'l’article'} a été initiée avec succès !`);
    setView('cag');
    navigate('/app/cagnotte');
  }
};

  const handleLogout = () => {
    setUser(null);
    setCagnotteCount(0);
    try {
      localStorage.removeItem('takapay-client-user');
      localStorage.removeItem('takapay_client_token');
      localStorage.removeItem('takapay_backend_cagnottes');
    } catch {
      // Ignorer
    }
    showToast('Vous avez été déconnecté.');
  };

  const handleBackNavigation = (fallbackPath = '/app') => {
    if (fallbackPath === '/app') {
      setView('home');
    } else if (fallbackPath.startsWith('/app/produits') || fallbackPath.startsWith('/app/categories')) {
      setView('shop');
    } else if (fallbackPath.startsWith('/app/cagnotte')) {
      setView('cag');
    } else if (fallbackPath.startsWith('/app/profil')) {
      setView('pro');
    } else if (fallbackPath.startsWith('/app/notifications')) {
      setView('notif');
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <>
      {/* En-tête officiel Takapay uniforme, adapté avec le menu client */}
      <Header
        isClient={true}
        activeTab={view}
        onSelectTab={handleSelectTab}
        user={user}
        onOpenProfile={() => handleSelectTab('pro')}
        onOpenNotifications={() => handleSelectTab('notif')}
        onToggleTheme={handleToggleTheme}
        onSelectCategory={handleSelectCategory}
        onSelectSubcategory={handleSelectSubcategory}
        onSelectPromo={handleSelectPromo}
        onSearch={(query, cat) => {
          if (cat && cat !== 'Tous') {
            setSelectedCat(cat);
          }
          setSearchQuery(query);
          setView('shop');
        }}
        searchQuery={searchQuery}
        cagnotteCount={cagnotteCount}
        unreadNotifCount={unreadNotifCount}
      />

      {/* Contenu principal du portail client */}
      <main className="client-scope">
        <div className="client-w">
          {view === 'home' && (
            <ClientHomeView
              products={productsList}
              onSelectProduct={handleOpenProduct}
              onSelectCategory={handleSelectCategory}
              onSelectPromo={handleSelectPromo}
              onGoCatalog={() => handleSelectTab('shop')}
            />
          )}

          {view === 'shop' && (
            <ClientCatalogView
              products={productsList}
              selectedCategory={selectedCat}
              onSelectCategory={handleSelectCategory}
              onSelectSubcategory={handleSelectSubcategory}
              onSelectPromo={handleSelectPromo}
              isPromoOnly={isPromoOnly}
              onSelectProduct={handleOpenProduct}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}

          {view === 'subcat' && (
            <ClientSubcategoryView
              category={isFavoritesOnly ? 'Mes Favoris' : selectedCat}
              subcategory={isFavoritesOnly ? 'Mes Favoris' : selectedSubCat}
              products={productsList}
              isPromoOnly={isPromoOnly}
              isFavoritesOnly={isFavoritesOnly}
              onBack={handleBackFromSubcategory}
              onSelectProduct={handleOpenProduct}
            />
          )}

          {view === 'product' && (
            <ClientProductDetail
              productId={activeProductId}
              product={productsList.find((p) => p.id === Number(activeProductId)) || PRODUCTS.find((p) => p.id === Number(activeProductId))}
              user={user}
              onShowToast={showToast}
              onBack={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else if (previousView === 'home') {
                  setView('home');
                  navigate('/app');
                } else if (previousView === 'subcat' && isFavoritesOnly) {
                  setView('subcat');
                  navigate('/app/favoris');
                } else if (previousView === 'subcat' && selectedSubCat) {
                  setView('subcat');
                  if (selectedCat && selectedCat !== 'Tous') {
                    navigate(`/app/categories/${encodeURIComponent(selectedCat)}?sub=${encodeURIComponent(selectedSubCat)}`);
                  } else {
                    navigate(`/app/produits?sub=${encodeURIComponent(selectedSubCat)}`);
                  }
                } else if (selectedCat && selectedCat !== 'Tous') {
                  setView('shop');
                  navigate(`/app/categories/${encodeURIComponent(selectedCat)}`);
                } else {
                  setView('shop');
                  navigate('/app/produits');
                }
              }}
              onStartOrder={handleStartOrder}
              onSelectProduct={handleOpenProduct}
            />
          )}

          {view === 'order' && (
            <ClientOrderFlow
              product={productsList.find((p) => p.id === Number(activeProductId)) || PRODUCTS.find((p) => p.id === Number(activeProductId)) || PRODUCTS[0]}
              selectedColor={selectedColorForOrder}
              initialOrderType={orderOptions.mode}
              initialQuantity={orderOptions.quantity}
              initialDeposit={orderOptions.initialDeposit}
              user={user}
              onUserAuthSuccess={handleUserAuthSuccess}
              onCompleteOrder={handleCompleteOrder}
              onBack={() => {
                if (activeProductId) {
                  setView('product');
                  navigate(`/app/produits/${activeProductId}`);
                } else {
                  setView('shop');
                  navigate('/app/produits');
                }
              }}
            />
          )}

          {view === 'cag' && (
            <ClientCagnotteView
              user={user}
              onBack={() => handleBackNavigation('/app')}
              onShowToast={showToast}
              onGoCatalog={() => handleSelectTab('shop')}
              onGoLogin={() => handleSelectTab('pro')}
            />
          )}

          {view === 'pro' && (
            <ClientProfileView
              user={user}
              onLogout={handleLogout}
              onBack={() => handleBackNavigation('/app')}
              onShowToast={showToast}
              onUpdateUser={handleUserAuthSuccess}
            />
          )}

          {view === 'notif' && (
            <ClientNotificationsView
              user={user}
              onBack={() => handleBackNavigation('/app')}
              onGoCagnotte={() => handleSelectTab('cag')}
              onGoCatalog={() => handleSelectTab('shop')}
            />
          )}
        </div>
      </main>

      {/* Modal Popup des promotions du moment */}
      <ClientWelcomeModal
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        onSelectProduct={handleOpenProduct}
        onShowAllPromos={handleSelectPromo}
      />

      {/* Bannière de consentement Cookies & Notifications */}
      <ClientCookieBanner onShowToast={showToast} />

      {/* Toast flottant */}
      {toastMessage && (
        <div className="client-toast" role="status">
          {toastMessage}
        </div>
      )}

      {/* Boutons d'action flottants : Retour en haut & Service Clientèle */}
      <FloatingActionButtons />
    </>
  );
}
