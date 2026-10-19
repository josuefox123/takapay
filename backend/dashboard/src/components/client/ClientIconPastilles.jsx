import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TAKAPAY_CATEGORIES } from '../../data/takapayCategories';

/**
 * Section "Acheter par catégorie" avec les symboles emblématiques
 * (🍚 bol de riz pour l'alimentation, 🍼 biberon pour bébé, 📱 smartphone, 💻 ordi, etc.)
 * placés dans de grands cercles épurés (88px) comme sur les maquettes,
 * sans kicker "SHOP BY CATEGORY" ni sélecteurs superflus, avec défilement fluide.
 */
export const CATEGORY_SYMBOL_CARDS = [
  ...TAKAPAY_CATEGORIES.map((c) => {
    // Teintes de fond douces et élégantes selon l'univers
    let bg = '#FEF3C7';
    if (c.id.includes('tele')) bg = '#FEE2E2';
    else if (c.id.includes('info')) bg = '#DBEAFE';
    else if (c.id.includes('electro')) bg = '#CCFBF1';
    else if (c.id.includes('audio')) bg = '#EDE9FE';
    else if (c.id.includes('alim')) bg = '#FEF3C7'; // Bol de riz 🍚
    else if (c.id.includes('bebe')) bg = '#FCE7F3'; // Biberon 🍼
    else if (c.id.includes('mode')) bg = '#FCE7F3';
    else if (c.id.includes('moto')) bg = '#FFEDD5';
    else if (c.id.includes('velo')) bg = '#E0F2FE';
    else if (c.id.includes('maison')) bg = '#ECFCCB';
    else if (c.id.includes('beaute')) bg = '#FFE4E6';
    else if (c.id.includes('jouet')) bg = '#FEF9C3';
    else if (c.id.includes('sport')) bg = '#E0E7FF';
    else if (c.id.includes('scol')) bg = '#F3E8FF';
    else if (c.id.includes('auto')) bg = '#F1F5F9';
    else if (c.id.includes('brico')) bg = '#E2E8F0';
    else if (c.id.includes('agri')) bg = '#DCFCE7';

    return {
      id: c.id,
      name: c.name,
      symbol: c.icon, // 🍚, 🍼, 📱, 💻, etc.
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

export default function ClientIconPastilles({
  onSelectCategory,
  onSelectPromo,
  onGoCatalog,
}) {
  const trackRef = useRef(null);

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

  return (
    <section className="shop-by-category-section">
      {/* En-tête épuré : Titre seul "Acheter par catégorie" */}
      <div className="shop-by-cat-header">
        <h2 className="shop-by-title">Acheter par catégorie</h2>

        {/* Flèches de défilement horizontal */}
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

      {/* Rangée horizontale des cercles avec symboles intégrés */}
      <div className="shop-by-cat-track" ref={trackRef}>
        {CATEGORY_SYMBOL_CARDS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="cat-circle-card"
            onClick={() => handleClickCategory(item)}
          >
            {/* Grand cercle de 88px avec le symbole adapté (🍚 bol de riz, 🍼 biberon, 📱 smartphone...) */}
            <div
              className="cat-avatar-circle"
              style={{ backgroundColor: item.bgTint }}
            >
              <span className="cat-avatar-symbol" role="img" aria-label={item.name}>
                {item.symbol}
              </span>
            </div>

            {/* Nom de la catégorie en police lisible et agrandie (15px bold) */}
            <span className="cat-circle-name">{item.name}</span>
          </button>
        ))}

        {/* Bouton rond "Tout voir" (>) à la fin de la rangée */}
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
