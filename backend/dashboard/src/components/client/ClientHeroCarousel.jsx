import { useState, useEffect } from 'react';
import { CAMPAIGNS } from '../../data/clientStore';

export default function ClientHeroCarousel({ onSelectPromo }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAMPAIGNS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

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
              e.target.src = '/assets/category-phones.jpg';
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
