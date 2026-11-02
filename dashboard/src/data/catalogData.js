/**
 * Données du catalogue Takapay
 * Structurées en conformité avec les modèles backend Laravel :
 * Produit, Categorie, SousCategorie, ImageProduit, ParametreProduit, Promotion
 */

export const userProfile = {
  nom: "DOSSOU",
  prenom: "Koffi",
  salutation: "Bonjour, Koffi DOSSOU",
  bienvenue: "Bienvenue sur TAKAPAY",
  avatarUrl: null, // Initiales affichées avec anneau doré si pas d'image
};

export const bannerPromo = {
  id: 1,
  titre: "Promotion à ne pas manquer !",
  boutonText: "Découvrir",
  imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80", // Casque audio sans fil
  lien: "/app/produits",
};

export const homeFilterPills = [
  { id: "tous", label: "Tous" },
  { id: "offres", label: "Meilleures offres" },
  { id: "progressif", label: "Paiement progressive" },
];

export const homeMacroCategories = [
  {
    id: "telephones",
    nom: "Téléphones",
    slug: "telephones",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=500&q=80", // Smartphone rose/violet
  },
  {
    id: "vetements",
    nom: "Vêtements",
    slug: "vetements",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=500&q=80", // Portant vêtements & chapeau
  },
  {
    id: "cosmetiques",
    nom: "Cosmétiques",
    slug: "cosmetiques",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=500&q=80", // Bouteilles et maquillage
  },
];

export const allCategories = [
  {
    id: 1,
    nom: "Apple iPhone",
    slug: "apple-iphone",
    groupe: "telephones",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 2,
    nom: "HP Pavilion",
    slug: "hp-pavilion",
    groupe: "ordinateurs",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 3,
    nom: "LG Smart",
    slug: "lg-smart",
    groupe: "electromenager",
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 4,
    nom: "Frigo Hisense",
    slug: "frigo-hisense",
    groupe: "figc",
    image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 5,
    nom: "Moto Haojue",
    slug: "moto-haojue",
    groupe: "motos",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 6,
    nom: "Climatiseur Gree 1.5...",
    slug: "climatiseur-gree",
    groupe: "electromenager",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 7,
    nom: "Sac de sport",
    slug: "sac-de-sport",
    groupe: "sport",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 8,
    nom: "Stabilisateur",
    slug: "stabilisateur",
    groupe: "accessoires",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=500&q=80",
  },
];

export const categoryFilterPills = [
  { id: "tous", label: "Tous" },
  { id: "telephones", label: "Téléphones" },
  { id: "ordinateurs", label: "Ordinateurs" },
  { id: "motos", label: "Motos" },
  { id: "figc", label: "Figc..." },
];

/**
 * Formatage des montants FCFA
 */
export function formatFCFA(amount) {
  if (!amount && amount !== 0) return "";
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}
