import { useState, useEffect } from 'react';
import { CAMPAIGNS } from '../../data/clientStore';

export default function ClientHeroCarousel({ onSelectPromo }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!CAMPAIGNS || CAMPAIGNS.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAMPAIGNS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  if (!CAMPAIGNS || CAMPAIGNS.length === 0) {
    return (
      <div className="client-carousel" aria-label="Bienvenue sur TakaPay" style={{ height: 'auto', minHeight: '190px' }}>
        <article className="client-slide active" style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #1b1716 0%, #2f2522 100%)', borderRadius: '24px', padding: '32px 28px' }}>
          <div style={{ maxWidth: '640px', color: '#ffffff' }}>
            <span style={{ display: 'inline-block', background: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              TAKAPAY BÉNIN
            </span>
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 30px)', fontWeight: 800, margin: '0 0 8px', color: '#ffffff', lineHeight: 1.25 }}>
              Épargnez progressivement pour vos achats
            </h1>
            <p style={{ fontSize: '13.5px', color: '#dcd3ce', margin: 0, lineHeight: 1.5 }}>
              Cotisez à votre convenance en toute liberté et sans intérêt. Les articles et offres créés dans le tableau de bord apparaîtront ici en direct.
            </p>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="client-carousel" aria-label="Campagnes promotionnelles TakaPay">
      {CAMPAIGNS.map((c, idx) => (
        <article
          key={c.id}
          className={`client-slide ${idx === currentIndex ? 'active' : ''}`}
        >
          {/* Image de fond plein espace */}
          <img
            src={c.image}
            alt={c.title}
            className="client-slide-bg-img"
            loading={idx === 0 ? 'eager' : 'lazy'}
            onError={(e) => {
              e.target.style.opacity = '0';
            }}
          />

          {/* Dégradé de contraste pour lisibilité du texte */}
          <div className="client-slide-scrim" />

          {/* Contenu textuel superposé sur l'image */}
          <div className="client-slide-overlay-copy">
            <span className="client-slide-kicker">{c.kicker}</span>
            <h1>{c.title}</h1>
            <p>{c.desc}</p>
            <button
              type="button"
              className="client-btn"
              onClick={onSelectPromo}
            >
              {c.btnText}
            </button>
          </div>

          {/* Puces de navigation du carrousel */}
          <div className="client-slide-dots">
            {CAMPAIGNS.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                className={`client-slide-dot ${dotIdx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Aller au slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
