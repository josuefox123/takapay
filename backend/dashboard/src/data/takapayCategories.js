/**
 * Référentiel officiel complet des 17 catégories et sous-catégories Takapay
 * Extrait fidèlement du document PDF fourni
 */
export const TAKAPAY_CATEGORIES = [
  {
    id: 'informatique-multimedia',
    name: 'Informatique & Multimédia',
    icon: '💻',
    subcategories: [
      { name: 'Ordinateurs', examples: 'portables, ordinateurs de bureau, tout-en-un, Mac' },
      { name: 'Tablettes', examples: 'Android, iPad, tablettes enfants' },
      { name: 'Accessoires informatique', examples: 'souris, claviers, sacs PC, hubs USB, chargeurs' },
      { name: 'Stockage', examples: 'clés USB, disques durs, cartes mémoire' },
      { name: 'Réseau', examples: 'routeurs, câbles RJ45, switchs, répéteurs Wi-Fi' },
      { name: 'Imprimantes & consommables', examples: 'imprimantes, encres, papier' },
    ],
  },
  {
    id: 'telephonie',
    name: 'Téléphonie',
    icon: '📱',
    subcategories: [
      { name: 'Smartphones', examples: 'Android, iPhone, téléphones basiques' },
      { name: 'Accessoires', examples: 'coques, protections d’écran, écouteurs, power banks, câbles' },
      { name: 'Objets connectés', examples: 'montres connectées, bracelets' },
    ],
  },
  {
    id: 'electromenager',
    name: 'Électroménager',
    icon: '🧊',
    subcategories: [
      { name: 'Froid', examples: 'réfrigérateurs, congélateurs, mini-frigos' },
      { name: 'Cuisine', examples: 'mixeurs, moulinettes, blenders, bouilloires, cuisinières, plaques, fours, robots' },
      { name: 'Entretien', examples: 'machines à laver, fers à repasser, aspirateurs' },
      { name: 'Climatisation & ventilation', examples: 'climatiseurs, ventilateurs, brasseurs d’air' },
    ],
  },
  {
    id: 'audio-video',
    name: 'Audio & Vidéo',
    icon: '📺',
    subcategories: [
      { name: 'Téléviseurs', examples: 'TV LED, Smart TV, supports muraux' },
      { name: 'Son', examples: 'enceintes, barres de son, home cinéma, casques' },
      { name: 'Photo & vidéo', examples: 'appareils photo, caméras de surveillance, trépieds' },
    ],
  },
  {
    id: 'alimentation-boissons',
    name: 'Alimentation & Boissons',
    icon: '🍚',
    subcategories: [
      { name: 'Céréales & féculents', examples: 'sacs de riz, farine, pâtes, semoule, maïs' },
      { name: 'Huiles & condiments', examples: 'huile végétale, huile de palme, sel, épices, cubes, concentré de tomate' },
      { name: 'Produits de base', examples: 'sucre, lait, café, thé, conserves' },
      { name: 'Boissons', examples: 'eau, jus, sodas, boissons énergétiques' },
      { name: 'Produits frais & surgelés', examples: 'poisson, viande, légumes' },
    ],
  },
  {
    id: 'jouets-jeux',
    name: 'Jouets & Jeux',
    icon: '🧸',
    subcategories: [
      { name: 'Jouets enfants', examples: 'poupées, voitures, peluches, jeux de construction' },
      { name: 'Jeux éducatifs', examples: 'puzzles, jeux de société, livres d’éveil' },
      { name: 'Jeux vidéo', examples: 'consoles, manettes, jeux' },
      { name: 'Jeux d’extérieur', examples: 'ballons, trottinettes, piscines gonflables' },
    ],
  },
  {
    id: 'motos-scooters',
    name: 'Motos & Scooters',
    icon: '🏍️',
    subcategories: [
      { name: 'Motos', examples: 'motos neuves, d’occasion, scooters' },
      { name: 'Pièces détachées', examples: 'pneus, batteries, plaquettes de frein, bougies' },
      { name: 'Équipements', examples: 'casques, gants, antivols, huile moteur' },
    ],
  },
  {
    id: 'velos',
    name: 'Vélos',
    icon: '🚲',
    subcategories: [
      { name: 'Vélos', examples: 'VTT, vélos de ville, vélos enfants, vélos électriques' },
      { name: 'Accessoires', examples: 'casques, cadenas, pompes, sonnettes, éclairage' },
      { name: 'Pièces', examples: 'pneus, chambres à air, chaînes, selles' },
    ],
  },
  {
    id: 'automobile',
    name: 'Automobile',
    icon: '🚗',
    subcategories: [
      { name: 'Pièces auto', examples: 'batteries, filtres, amortisseurs, pneus' },
      { name: 'Accessoires', examples: 'autoradios, housses de sièges, tapis, GPS' },
      { name: 'Entretien', examples: 'huiles, liquides, produits de nettoyage' },
    ],
  },
  {
    id: 'mode-accessoires',
    name: 'Mode & Accessoires',
    icon: '👗',
    subcategories: [
      { name: 'Femme', examples: 'robes, abayas, hijabs, ensembles, chaussures, sacs à main' },
      { name: 'Homme', examples: 'chemises, pantalons, boubous, chaussures' },
      { name: 'Enfant', examples: 'vêtements, chaussures, uniformes scolaires' },
      { name: 'Accessoires', examples: 'montres, bijoux, ceintures, lunettes' },
    ],
  },
  {
    id: 'beaute-sante',
    name: 'Beauté & Santé',
    icon: '💄',
    subcategories: [
      { name: 'Soins', examples: 'crèmes, huiles, savons, parfums' },
      { name: 'Maquillage', examples: 'fond de teint, rouges à lèvres, vernis' },
      { name: 'Cheveux', examples: 'perruques, mèches, produits capillaires, lisseurs' },
      { name: 'Santé', examples: 'tensiomètres, thermomètres, vitamines' },
    ],
  },
  {
    id: 'maison-decoration',
    name: 'Maison & Décoration',
    icon: '🛋️',
    subcategories: [
      { name: 'Meubles', examples: 'canapés, lits, tables, armoires, chaises' },
      { name: 'Literie', examples: 'matelas, draps, oreillers, couvertures' },
      { name: 'Cuisine & vaisselle', examples: 'casseroles, assiettes, couverts, marmites' },
      { name: 'Éclairage', examples: 'ampoules, lampes, panneaux solaires, onduleurs' },
    ],
  },
  {
    id: 'bricolage-outillage',
    name: 'Bricolage & Outillage',
    icon: '🔨',
    subcategories: [
      { name: 'Outils', examples: 'perceuses, marteaux, tournevis, scies' },
      { name: 'Matériaux', examples: 'peinture, ciment, câbles électriques, tuyaux' },
      { name: 'Sécurité', examples: 'cadenas, serrures, extincteurs' },
    ],
  },
  {
    id: 'bebe-maternite',
    name: 'Bébé & Maternité',
    icon: '🍼',
    subcategories: [
      { name: 'Alimentation', examples: 'lait infantile, biberons, petits pots' },
      { name: 'Hygiène', examples: 'couches, lingettes, savons' },
      { name: 'Équipement', examples: 'poussettes, lits bébé, sièges auto' },
    ],
  },
  {
    id: 'sport-loisirs',
    name: 'Sport & Loisirs',
    icon: '⚽',
    subcategories: [
      { name: 'Fitness', examples: 'haltères, tapis de yoga, bancs de musculation' },
      { name: 'Sports d’équipe', examples: 'ballons, maillots, chaussures' },
      { name: 'Camping', examples: 'tentes, lampes torches, glacières' },
    ],
  },
  {
    id: 'scolaire-bureau',
    name: 'Scolaire & Bureau',
    icon: '📚',
    subcategories: [
      { name: 'Fournitures', examples: 'cahiers, stylos, sacs d’école, calculatrices' },
      { name: 'Mobilier de bureau', examples: 'chaises, bureaux, classeurs' },
    ],
  },
  {
    id: 'agriculture-animaux',
    name: 'Agriculture & Animaux',
    icon: '🌱',
    subcategories: [
      { name: 'Agriculture', examples: 'engrais, semences, pulvérisateurs' },
      { name: 'Animaux', examples: 'aliments pour chiens, chats, volailles, accessoires' },
    ],
  },
];
