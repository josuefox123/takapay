import { useState, useEffect } from 'react';
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
import { PRODUCTS, DEFAULT_CLIENT_USER, mapAdminProductToClient, getMergedProducts, refreshProductsFromStore } from '../../data/clientStore';
import { adminService } from '../../services/adminService';
import FloatingActionButtons from '../../components/public/FloatingActionButtons';
import './client.css';

export default function AppHome({ initialTab = 'home' }) {
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
  const [selectedCat, setSelectedCat] = useState('Tous');
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [isPromoOnly, setIsPromoOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Produit actif pour la vue détaillée
  const [activeProductId, setActiveProductId] = useState(1);
  const [selectedColorForOrder, setSelectedColorForOrder] = useState(null);

  // Utilisateur connecté & Cagnottes (sauvegarde en localStorage)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('takapay-client-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
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

  // Synchronisation en direct avec la base de données et le tableau de bord admin
  useEffect(() => {
    let isMounted = true;

    const loadLiveProducts = async () => {
      try {
        const liveItems = await adminService.getProduits();
        if (isMounted && Array.isArray(liveItems) && liveItems.length > 0) {
          const clientConverted = liveItems.map(mapAdminProductToClient).filter(Boolean);
          setProductsList((prev) => {
            const map = new Map();
            clientConverted.forEach((p) => map.set(p.id, p));
            prev.forEach((p) => {
              if (!map.has(p.id)) map.set(p.id, p);
            });
            const merged = Array.from(map.values());
            PRODUCTS.length = 0;
            PRODUCTS.push(...merged);
            return merged;
          });
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

  // Actions de navigation
  const handleSelectTab = (tab) => {
    setSearchQuery('');
    setPreviousView(view);
    if (tab === 'home') {
      setIsPromoOnly(false);
      setView('home');
    } else if (tab === 'shop') {
      setView('shop');
    } else if (tab === 'cag') {
      setView('cag');
    } else if (tab === 'pro') {
      setView('pro');
    } else if (tab === 'notif') {
      setView('notif');
    }
  };

  const handleOpenProduct = (id) => {
    setPreviousView(view);
    setActiveProductId(id);
    setView('product');
  };

  const handleSelectCategory = (catId) => {
    setIsPromoOnly(false);
    setSelectedCat(catId);
    setSelectedSubCat('');
    setView('shop');
  };

  const handleSelectSubcategory = (subName, categoryName) => {
    if (categoryName) {
      setSelectedCat(categoryName);
    }
    setSelectedSubCat(subName);
    setIsPromoOnly(false);
    setView('subcat');
  };

  const handleSelectPromo = () => {
    setIsPromoOnly(true);
    setSelectedSubCat('Promotions');
    setView('subcat');
  };

  const handleStartOrder = (product, color) => {
    setSelectedColorForOrder(color);
    setView('order');
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
    showToast(`Votre commande pour ${orderData.product.n} a été initiée avec succès !`);
    setView('cag');
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('takapay-client-user');
      localStorage.removeItem('takapay_client_token');
    } catch {
      // Ignorer
    }
    showToast('Vous avez été déconnecté.');
  };

  return (
    <>
      {/* En-tête officiel Takapay uniforme, adapté avec le menu client */}
      <Header
        isClient={true}
        activeTab={view}
        onSelectTab={handleSelectTab}
        user={user}
        onOpenProfile={() => {
          setPreviousView(view);
          setView('pro');
        }}
        onOpenNotifications={() => {
          setPreviousView(view);
          setView('notif');
        }}
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
        cagnotteCount={orders.length || 2}
      />

      {/* Contenu principal du portail client */}
      <main className="client-scope">
        <div className="client-w">
          {view === 'home' && (
            <ClientHomeView
              onSelectProduct={handleOpenProduct}
              onSelectCategory={handleSelectCategory}
              onSelectPromo={handleSelectPromo}
              onGoCatalog={() => handleSelectTab('shop')}
            />
          )}

          {view === 'shop' && (
            <ClientCatalogView
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
              category={selectedCat}
              subcategory={selectedSubCat}
              isPromoOnly={isPromoOnly}
              onBack={() => setView('shop')}
              onSelectProduct={handleOpenProduct}
            />
          )}

          {view === 'product' && (
            <ClientProductDetail
              productId={activeProductId}
              onBack={() => setView(previousView || 'shop')}
              onStartOrder={handleStartOrder}
              onSelectProduct={handleOpenProduct}
            />
          )}

          {view === 'order' && (
            <ClientOrderFlow
              product={productsList.find((p) => p.id === Number(activeProductId)) || PRODUCTS.find((p) => p.id === Number(activeProductId)) || PRODUCTS[0]}
              selectedColor={selectedColorForOrder}
              user={user}
              onUserAuthSuccess={handleUserAuthSuccess}
              onCompleteOrder={handleCompleteOrder}
              onBack={() => setView('product')}
            />
          )}

          {view === 'cag' && (
            <ClientCagnotteView
              user={user}
              onBack={() => setView(previousView || 'home')}
              onShowToast={showToast}
              onGoCatalog={() => handleSelectTab('shop')}
              onGoLogin={() => setView('pro')}
            />
          )}

          {view === 'pro' && (
            <ClientProfileView
              user={user}
              onLogout={handleLogout}
              onBack={() => setView(previousView || 'home')}
              onShowToast={showToast}
              onUpdateUser={handleUserAuthSuccess}
            />
          )}

          {view === 'notif' && (
            <ClientNotificationsView
              onBack={() => setView(previousView || 'home')}
              onGoCagnotte={() => setView('cag')}
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
