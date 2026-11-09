import { useState, useEffect, useMemo, useRef } from 'react';
import { formatFCFA, discountPercentage, PRODUCTS, resolveImageUrl } from '../../data/clientStore';
import { adminService } from '../../services/adminService';
import welcomeBannerImg from '../../assets/imagetakapay.webp';

export default function ClientHeroCarousel({
  products = [],
  onSelectProduct,
  onGoCatalog,
  onSelectPromo,
}) {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
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
        const hasText = Boolean(
          (item.kicker && item.kicker.trim()) ||
          (item.titre && item.titre.trim()) ||
          (item.description && item.description.trim()) ||
          (item.texte_bouton && item.texte_bouton.trim())
        );

        let action = null;
        if (hasProd && typeof onSelectProduct === 'function') {
          action = () => onSelectProduct(hasProd.id || hasProd);
        } else if (item.lien && item.lien.trim()) {
          const rawLink = item.lien.trim();
          action = () => {
            if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
              window.open(rawLink, '_blank');
            } else if (typeof onGoCatalog === 'function') {
              onGoCatalog();
            }
          };
        }

        return {
          id: `carousel-db-${item.id}`,
          isDb: true,
          hasTextOverlay: hasText,
          image: resolveImageUrl(item.image_url) || welcomeBannerImg,
          kicker: item.kicker ? item.kicker.trim() : null,
          title: item.titre ? item.titre.trim() : null,
          description: item.description ? item.description.trim() : null,
          priceText: hasText && hasProd
            ? `Disponible dès ${formatFCFA(hasProd.paiement?.demarrage_minimum || hasProd.prix_vente || 5000)} de 1er versement.`
            : null,
          btnText: item.texte_bouton ? item.texte_bouton.trim() : null,
          action,
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
  // Diapositives étendues avec clones aux deux extrémités pour une boucle infinie continue et fluide
  const extendedSlides = useMemo(() => {
    if (slides.length <= 1) return slides;
    return [
      {
        ...slides[slides.length - 1],
        id: `${slides[slides.length - 1].id}-clone-start`,
      },
      ...slides,
      {
        ...slides[0],
        id: `${slides[0].id}-clone-end`,
      },
    ];
  }, [slides]);

  // Réajuster l'index si la liste des diapositives change
  useEffect(() => {
    if (slides.length > 1) {
      setCurrentIndex((prev) => (prev < 1 || prev > slides.length ? 1 : prev));
    } else {
      setCurrentIndex(0);
    }
  }, [slides.length]);

  const touchStartX = useRef(0);

  // Défilement automatique continu toutes les 5.5 secondes
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;

      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 5500);

    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  // Si l'utilisateur revient sur l'onglet, réaligner proprement
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return;
      if (currentIndex > slides.length || currentIndex < 1) {
        setIsTransitioning(false);
        setCurrentIndex(1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [currentIndex, slides.length]);

  // Réinitialisation instantanée et invisible lorsqu'on atteint l'un des deux clones
  const handleTransitionEnd = (e) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;

    if (slides.length > 1) {
      if (currentIndex >= slides.length + 1) {
        // Fin de piste -> saut instantané vers la première vraie slide (index 1)
        setIsTransitioning(false);
        setCurrentIndex(1);
      } else if (currentIndex <= 0) {
        // Début de piste -> saut instantané vers la dernière vraie slide (index slides.length)
        setIsTransitioning(false);
        setCurrentIndex(slides.length);
      }
    }
  };

  // Réactivation de la transition CSS après le repositionnement sans transition
  useEffect(() => {
    if (!isTransitioning) {
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    }
  }, [isTransitioning]);

  const handleDotClick = (dotIdx) => {
    setIsTransitioning(true);
    setCurrentIndex(dotIdx + 1);
  };

  const handlePrev = () => {
    if (!isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const endX = e.changedTouches[0].clientX;
      const diff = touchStartX.current - endX;
      if (diff > 45) {
        handleNext();
      } else if (diff < -45) {
        handlePrev();
      }
    }
  };

  if (slides.length === 0) return null;

  const activeDot = slides.length <= 1 ? 0 : (currentIndex - 1 + slides.length) % slides.length;

  return (
    <div
      className="client-carousel"
      aria-label="Campagnes et bannières en vedette TakaPay"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Piste de défilement horizontal fluide en boucle infinie */}
      <div
        className="client-carousel-track"
        style={{
          transform: slides.length <= 1 ? 'none' : `translateX(-${currentIndex * 100}%)`,
          transition: isTransitioning
            ? 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)'
            : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extendedSlides.map((s, idx) => {
          const hasContent = Boolean(s.kicker || s.title || s.description || s.btnText);
          const isCurrentActive = slides.length <= 1 ? true : ((idx - 1 + slides.length) % slides.length === activeDot);
          const isClickable = Boolean(s.action);

          return (
            <article
              key={`${s.id}-${idx}`}
              className={`client-slide client-slide-panoramic ${isCurrentActive ? 'active' : ''} ${!hasContent ? 'is-pure-image' : ''}`}
              onClick={isClickable && (!hasContent || !s.btnText) ? s.action : undefined}
              style={{ cursor: isClickable && (!hasContent || !s.btnText) ? 'pointer' : 'default' }}
            >
              {/* Image prenant 100% de la largeur et de la hauteur de l'écran */}
              <img
                src={s.image}
                alt={s.title || 'Bannière TakaPay'}
                className="client-slide-full-bg"
                loading={idx <= 2 ? 'eager' : 'lazy'}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          if (s.action) s.action();
                        }}
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

      {/* Flèches de navigation gauche / droite */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="client-carousel-nav-btn prev"
            onClick={handlePrev}
            aria-label="Diapositive précédente"
          >
            ‹
          </button>
          <button
            type="button"
            className="client-carousel-nav-btn next"
            onClick={handleNext}
            aria-label="Diapositive suivante"
          >
            ›
          </button>
        </>
      )}

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
