import { useState, useEffect, useMemo } from 'react';
import { formatFCFA, discountPercentage, PRODUCTS, resolveImageUrl } from '../../data/clientStore';
import { adminService } from '../../services/adminService';
import welcomeBannerImg from '../../assets/imagetakapay.webp';

export default function ClientHeroCarousel({
  products = [],
  onSelectProduct,
  onGoCatalog,
  onSelectPromo,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [dbCarousels, setDbCarousels] = useState(() => {
    try {
      const cached = localStorage.getItem('takapay_public_carousels');
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Charger les bannières dynamiques configurées par l'administrateur
  useEffect(() => {
    let isMounted = true;
    adminService
      .getCarousels(false)
      .then((data) => {
        if (isMounted) {
          setDbCarousels(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Construction des diapositives
  const slides = useMemo(() => {
    // 1. Si l'administrateur a configuré des bannières carrousel dans la base, on les utilise en priorité
    if (dbCarousels.length > 0) {
      return dbCarousels.map((item) => {
        const hasProd = item.produit;

        return {
          id: `carousel-db-${item.id}`,
          isDb: true,
          image: resolveImageUrl(item.image_url) || welcomeBannerImg,
          kicker: item.kicker ? item.kicker.trim() : null,
          title: item.titre ? item.titre.trim() : null,
          description: item.description ? item.description.trim() : null,
          priceText: hasProd
            ? `Disponible dès ${formatFCFA(hasProd.paiement?.demarrage_minimum || hasProd.prix_vente || 5000)} de 1er versement.`
            : null,
          btnText: item.texte_bouton ? item.texte_bouton.trim() : null,
          action: () => {
            if (hasProd && typeof onSelectProduct === 'function') {
              onSelectProduct(hasProd);
            } else if (item.lien) {
              if (item.lien.startsWith('http://') || item.lien.startsWith('https://')) {
                window.open(item.lien, '_blank');
              } else if (typeof onGoCatalog === 'function') {
                onGoCatalog();
              }
            } else if (typeof onGoCatalog === 'function') {
              onGoCatalog();
            } else if (typeof onSelectPromo === 'function') {
              onSelectPromo();
            }
          },
        };
      });
    }

    // 2. Repli par défaut si aucune bannière n'est encore configurée dans le dashboard admin
    const welcomeSlide = {
      id: 'slide-welcome',
      isDb: false,
      image: welcomeBannerImg,
      kicker: 'TAKAPAY BÉNIN',
      title: 'Épargnez progressivement pour vos achats',
      description: 'Cotisez à votre convenance en toute liberté et sans intérêt. Catalogue en ligne ouvert à tous.',
      priceText: null,
      btnText: 'Découvrir le catalogue →',
      action: () => {
        if (typeof onGoCatalog === 'function') onGoCatalog();
        else if (typeof onSelectPromo === 'function') onSelectPromo();
      },
    };

    const pool = Array.isArray(products) && products.length > 0 ? products : PRODUCTS;
    const validProducts = (pool || []).filter((p) => p && p.im);

    const promoProducts = validProducts
      .filter((p) => discountPercentage(p) > 0)
      .sort((a, b) => discountPercentage(b) - discountPercentage(a));

    let chosenArticles = [];
    if (promoProducts.length > 0) {
      chosenArticles = [...promoProducts.slice(0, 3)];
      if (chosenArticles.length < 3) {
        const remaining = validProducts.filter((p) => !chosenArticles.some((c) => c.id === p.id));
        chosenArticles.push(...remaining.slice(0, 3 - chosenArticles.length));
      }
    } else {
      chosenArticles = validProducts.slice(0, 3);
    }

    const articleSlides = chosenArticles.map((p) => {
      const discount = discountPercentage(p);
      const isPromo = discount > 0;
      const kicker = isPromo
        ? `🔥 PROMOTION −${discount}%`
        : (p.c || p.subcategory || 'ARTICLE TAKAPAY').toUpperCase();

      const minPrice = p.payment?.minimumStart || p.p;
      const rawDesc = (p.d || '').trim();

      return {
        id: `slide-prod-${p.id}`,
        isDb: false,
        product: p,
        image: p.im,
        kicker,
        title: p.n,
        description: rawDesc ? (rawDesc.endsWith('.') ? rawDesc : `${rawDesc}.`) : '',
        priceText: `Disponible dès ${formatFCFA(minPrice)} de 1er versement.`,
        btnText: 'Voir cet article →',
        action: () => {
          if (typeof onSelectProduct === 'function') onSelectProduct(p.id);
        },
      };
    });

    return [welcomeSlide, ...articleSlides];
  }, [dbCarousels, products, onGoCatalog, onSelectPromo, onSelectProduct]);

  // Diapositives étendues pour une boucle infinie continue (clone de la première slide en fin de piste)
  const extendedSlides = useMemo(() => {
    if (slides.length <= 1) return slides;
    return [
      ...slides,
      {
        ...slides[0],
        id: `${slides[0].id}-loop-clone`,
      },
    ];
  }, [slides]);

  // Défilement automatique continu toutes les 6 secondes (toujours vers l'avant, pas de rembobinage)
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length]);

  // Réinitialisation instantanée et invisible à la première slide une fois la transition du clone terminée
  const handleTransitionEnd = () => {
    if (currentIndex >= slides.length) {
      setIsTransitioning(false);
      setCurrentIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
    }
  };

  const handleDotClick = (dotIdx) => {
    setIsTransitioning(true);
    setCurrentIndex(dotIdx);
  };

  if (slides.length === 0) return null;

  const activeDot = currentIndex % slides.length;

  return (
    <div className="client-carousel" aria-label="Campagnes et bannières en vedette TakaPay">
      {/* Piste de défilement horizontal fluide en boucle infinie */}
      <div
        className="client-carousel-track"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: isTransitioning
            ? 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)'
            : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extendedSlides.map((s, idx) => {
          const hasContent = Boolean(s.kicker || s.title || s.description || s.priceText || s.btnText);
          const isCurrentActive = (idx % slides.length) === activeDot;

          return (
            <article
              key={s.id}
              className={`client-slide client-slide-panoramic ${isCurrentActive ? 'active' : ''} ${!hasContent ? 'is-pure-image' : ''}`}
              onClick={!hasContent && s.action ? s.action : undefined}
              style={{ cursor: !hasContent && s.action ? 'pointer' : 'default' }}
            >
              {/* Arrière-plan flouté en couleur (remplit harmonieusement l'espace à gauche et à droite) */}
              <img
                src={s.image}
                alt=""
                aria-hidden="true"
                className="client-slide-backdrop-blur"
              />

              {/* Image adaptée aux dimensions naturelles */}
              <img
                src={s.image}
                alt={s.title || 'Bannière TakaPay'}
                className="client-slide-full-bg"
                loading={idx === 0 ? 'eager' : 'lazy'}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />

              {/* Si du contenu textuel est configuré, on l'affiche */}
              {hasContent && (
                <div className="client-slide-panoramic-content">
                  <div className="client-slide-overlay-box">
                    {s.kicker && (
                      <span className="client-slide-kicker">
                        {s.kicker}
                      </span>
                    )}

                    {s.title && (
                      <h1 className="client-slide-title">
                        {s.title}
                      </h1>
                    )}

                    {s.description && (
                      <p className="client-slide-desc">
                        {s.description}
                      </p>
                    )}

                    {s.priceText && (
                      <div className="client-slide-price">
                        {s.priceText}
                      </div>
                    )}

                    {s.btnText && (
                      <button
                        type="button"
                        className="client-btn client-slide-btn"
                        onClick={s.action}
                      >
                        {s.btnText}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Puces de navigation */}
      {slides.length > 1 && (
        <div className="client-slide-controls">
          <div className="client-slide-dots">
            {slides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                className={`client-slide-dot ${dotIdx === activeDot ? 'active' : ''}`}
                onClick={() => handleDotClick(dotIdx)}
                aria-label={`Aller au slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
