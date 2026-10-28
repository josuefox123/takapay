import { useState, useEffect, useMemo } from 'react';
import { formatFCFA, discountPercentage, PRODUCTS } from '../../data/clientStore';
import welcomeBannerImg from '../../assets/imagetakapay.webp';

export default function ClientHeroCarousel({
  products = [],
  onSelectProduct,
  onGoCatalog,
  onSelectPromo,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Construction des diapositives : 1. Bienvenue, 2. Articles (promotions ou catalogue)
  const slides = useMemo(() => {
    // 1. Slide d'accueil / bienvenue
    const welcomeSlide = {
      id: 'slide-welcome',
      isWelcome: true,
      image: welcomeBannerImg,
      kicker: 'TAKAPAY BÉNIN',
      kickerBg: 'var(--r)',
      kickerColor: '#ffffff',
      title: 'Épargnez progressivement pour vos achats',
      descPrefix: 'Cotisez à votre convenance en toute liberté et sans intérêt.',
      priceText: 'Catalogue en ligne ouvert à tous.',
      btnText: 'Découvrir le catalogue →',
      action: () => {
        if (typeof onGoCatalog === 'function') onGoCatalog();
        else if (typeof onSelectPromo === 'function') onSelectPromo();
      },
    };

    // 2. Sélection des articles de la base
    const pool = Array.isArray(products) && products.length > 0 ? products : PRODUCTS;
    const validProducts = (pool || []).filter((p) => p && p.im);

    // Priorité absolue aux articles en promotion active
    const promoProducts = validProducts
      .filter((p) => discountPercentage(p) > 0)
      .sort((a, b) => discountPercentage(b) - discountPercentage(a));

    let chosenArticles = [];
    if (promoProducts.length > 0) {
      chosenArticles = [...promoProducts.slice(0, 3)];
      // Si moins de 3 promotions, complète avec les autres articles du catalogue
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
      const cleanDesc = rawDesc ? (rawDesc.endsWith('.') ? rawDesc : `${rawDesc}.`) : '';

      return {
        id: `slide-prod-${p.id}`,
        isWelcome: false,
        product: p,
        image: p.im,
        kicker,
        kickerBg: isPromo ? 'var(--r)' : '#facc15',
        kickerColor: isPromo ? '#ffffff' : '#1b1716',
        title: p.n,
        descPrefix: cleanDesc,
        priceText: `Disponible dès ${formatFCFA(minPrice)} de 1er versement.`,
        btnText: 'Voir cet article →',
        action: () => {
          if (typeof onSelectProduct === 'function') onSelectProduct(p.id);
        },
      };
    });

    return [welcomeSlide, ...articleSlides];
  }, [products, onGoCatalog, onSelectPromo, onSelectProduct]);

  // Défilement automatique toutes les 5 secondes
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  // Si aucun slide, sécurité
  if (slides.length === 0) return null;

  return (
    <div className="client-carousel" aria-label="Campagnes et articles en vedette TakaPay">
      {/* Piste de défilement horizontal fluide de droite à gauche */}
      <div
        className="client-carousel-track"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {slides.map((s, idx) => (
          <article
            key={s.id}
            className={`client-slide ${idx === currentIndex ? 'active' : ''}`}
          >
            {/* Image d'arrière-plan floutée teintée */}
            <img className="client-slide-bg" src={s.image} alt="" aria-hidden="true" />

            {/* Contenu principal : Visuel complet et animé à gauche + Textes à droite */}
            <div className="client-slide-content">
              <div className={`client-slide-visual ${s.isWelcome ? 'welcome-visual' : ''}`}>
                <img
                  src={s.image}
                  alt={s.title}
                  className={`client-slide-hero-img ${s.isWelcome ? 'welcome-img' : ''}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  onError={(e) => {
                    e.target.style.opacity = '0';
                  }}
                />
              </div>

              <div className="client-slide-overlay-copy">
                <span
                  className="client-slide-kicker"
                  style={{
                    background: s.kickerBg,
                    color: s.kickerColor,
                  }}
                >
                  {s.kicker}
                </span>

                <h1>{s.title}</h1>

                <p style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {s.descPrefix && (
                    <span style={{ color: '#44403c', fontSize: '17px', lineHeight: 1.55 }}>
                      {s.descPrefix}
                    </span>
                  )}
                  {s.priceText && (
                    <span style={{ color: 'var(--r)', fontWeight: 900, fontSize: '19px' }}>
                      {s.priceText}
                    </span>
                  )}
                </p>

                <button
                  type="button"
                  className="client-btn"
                  onClick={s.action}
                  style={{
                    cursor: 'pointer',
                    fontWeight: 800,
                    padding: '13px 26px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    alignSelf: 'flex-start',
                    width: 'fit-content',
                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.28)',
                  }}
                >
                  {s.btnText}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Puces de défilement dans le coin à droite (sans les flèches < et >) */}
      {slides.length > 1 && (
        <div className="client-slide-controls">
          <div className="client-slide-dots">
            {slides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                className={`client-slide-dot ${dotIdx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Aller au slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
