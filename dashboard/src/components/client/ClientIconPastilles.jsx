import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TAKAPAY_CATEGORIES } from '../../data/takapayCategories';

export default function ClientIconPastilles({
  onSelectCategory,
  onSelectPromo,
  onGoCatalog,
}) {
  const trackRef = useRef(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    window.addEventListener('takapay_categories_updated', handleUpdate);
    return () => window.removeEventListener('takapay_categories_updated', handleUpdate);
  }, []);

  const handleScroll = (offset) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleClickCategory = (item) => {
    if (item.isPromo) {
      if (onSelectPromo) onSelectPromo();
    } else {
      if (onSelectCategory) onSelectCategory(item.category);
    }
  };

  const handleViewAll = () => {
    if (onGoCatalog) {
      onGoCatalog();
    } else if (onSelectCategory) {
      onSelectCategory('Tous');
    }
  };

  const cards = [
    ...TAKAPAY_CATEGORIES.map((c) => {
      let bg = '#FEF3C7';
      const id = String(c.id || c.name).toLowerCase();
      if (id.includes('tele')) bg = '#FEE2E2';
      else if (id.includes('info')) bg = '#DBEAFE';
      else if (id.includes('electro')) bg = '#CCFBF1';
      else if (id.includes('audio')) bg = '#EDE9FE';
      else if (id.includes('alim')) bg = '#FEF3C7';
      else if (id.includes('bebe')) bg = '#FCE7F3';
      else if (id.includes('mode')) bg = '#FCE7F3';
      else if (id.includes('moto')) bg = '#FFEDD5';
      else if (id.includes('velo')) bg = '#E0F2FE';
      else if (id.includes('maison')) bg = '#ECFCCB';
      else if (id.includes('beaute')) bg = '#FFE4E6';
      else if (id.includes('jouet')) bg = '#FEF9C3';
      else if (id.includes('sport')) bg = '#E0E7FF';
      else if (id.includes('scol') || id.includes('ecole')) bg = '#F3E8FF';
      else if (id.includes('auto')) bg = '#F1F5F9';
      else if (id.includes('brico')) bg = '#E2E8F0';
      else if (id.includes('agri')) bg = '#DCFCE7';

      return {
        id: c.id,
        name: c.name,
        symbol: c.icon || '🛍️',
        category: c.name,
        bgTint: bg,
      };
    }),
    {
      id: 'promos',
      name: 'Promotions',
      symbol: '🏷️',
      category: 'Promotions',
      isPromo: true,
      bgTint: '#FEE2E2',
    },
  ];

  return (
    <section className="shop-by-category-section">
      <div className="shop-by-cat-header">
        <h2 className="shop-by-title">Acheter par catégorie</h2>

        <div className="cat-track-nav-arrows">
          <button
            type="button"
            className="cat-track-arrow-btn"
            onClick={() => handleScroll(-320)}
            aria-label="Défiler les catégories vers la gauche"
            title="Précédent"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="cat-track-arrow-btn"
            onClick={() => handleScroll(320)}
            aria-label="Défiler les catégories vers la droite"
            title="Suivant"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="shop-by-cat-track" ref={trackRef}>
        {cards.map((item) => (
          <button
            key={item.id}
            type="button"
            className="cat-circle-card"
            onClick={() => handleClickCategory(item)}
          >
            <div
              className="cat-avatar-circle"
              style={{ backgroundColor: item.bgTint }}
            >
              <span className="cat-avatar-symbol" role="img" aria-label={item.name}>
                {item.symbol}
              </span>
            </div>
            <span className="cat-circle-name">{item.name}</span>
          </button>
        ))}

        <button
          type="button"
          className="cat-circle-card view-all-card"
          onClick={handleViewAll}
          title="Voir toutes les catégories"
        >
          <div className="cat-avatar-circle view-all-circle">
            <ChevronRight size={30} className="view-all-arrow" />
          </div>
          <span className="cat-circle-name view-all-text">Tout voir</span>
        </button>
      </div>
    </section>
  );
}
