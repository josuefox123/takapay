
/**
 * Glossaire Officiel TakaPay (Système Hybride i18n / Google Translate)
 * 
 * Permet à Google Translate de traduire 90% du site automatiquement,
 * tout en verrouillant et rectifiant les termes financiers et métier stratégiques.
 */

export const TAKAPAY_TERMS = {
  // Navigation & Accueil
  accueil: 'Home',

  // Cagnottes & Épargne (Option Target Savings)
  cagnotte: 'Target Savings',
  cagnottes: 'Target Savings',
  mes_cagnottes: 'My Target Savings',

  // Paiement & Échéances
  acompte: 'Down payment',
  acomptes: 'Down payments',
  echeance: 'Installment',
  echeances: 'Installments',
  cotisation: 'Contribution',
  cotisations: 'Contributions',
  versement: 'Deposit',
  versements: 'Deposits',
  reste_a_payer: 'Remaining balance',

  // Livraison
  remise_main_propre: 'In-person delivery',
  retrait_agence: 'Branch pickup',
  point_relais: 'Pickup point',
  financement_termine: 'Funding completed',

  // Catégories & Sous-catégories
  alimentation: 'Groceries & Food',
  ustensiles: 'Cookware & Utensils',
  electronique: 'Electronics & Gadgets',
  telephonie: 'Smartphones & Phones',
  electromenager: 'Home Appliances',
  jeux: 'Gaming & Entertainment',
  montres: 'Watches & Timepieces',
  mode: 'Fashion & Apparel',
  maison: 'Home & Living',
};

export const TAKAPAY_GLOSSARY_RULES = [
  // 1. Navigation & Accueil -> Home (Empêche Google de traduire par "Welcome" ou "Reception")
  {
    regex: /^\s*(Welcome|Reception|Accueil)\s*$/gi,
    replacement: 'Home',
  },
  {
    regex: /\b(Back to welcome|Go to welcome|Return to welcome)\b/gi,
    replacement: 'Back to Home',
  },
  {
    regex: /\b(Welcome page|Reception page)\b/gi,
    replacement: 'Home',
  },

  // 2. Cagnottes / Épargne -> Target Savings (Empêche layaway, fundraiser, kitty, jackpot, prize pool, money pot)
  {
    regex: /\b(my\s+)(layaways|fundraisers|kitties|jackpots|prize pools|money pots|cagnottes)\b/gi,
    replacement: (match, p1) => `${p1.charAt(0) === 'M' ? 'My' : 'my'} Target Savings`,
  },
  {
    regex: /\b(my\s+)(layaway|fundraiser|kitty|jackpot|prize pool|money pot|cagnotte)\b/gi,
    replacement: (match, p1) => `${p1.charAt(0) === 'M' ? 'My' : 'my'} Target Savings`,
  },
  {
    regex: /\b(Mes|mes|Ma|ma)\s+(cagnottes|cagnotte)\b/gi,
    replacement: (match, p1) => `${p1.charAt(0).toUpperCase() === 'M' ? 'My' : 'my'} Target Savings`,
  },
  {
    regex: /\b(Layaways|Fundraisers|Kitties|Jackpots|Prize pools|Money pots|Cagnottes)\b/g,
    replacement: 'Target Savings',
  },
  {
    regex: /\b(Layaway|Fundraiser|Kitty|Jackpot|Prize pool|Money pot|Cagnotte)\b/g,
    replacement: 'Target Savings',
  },
  {
    regex: /\b(layaways|fundraisers|kitties|jackpots|prize pools|money pots|cagnottes)\b/g,
    replacement: 'target savings',
  },
  {
    regex: /\b(layaway|fundraiser|kitty|jackpot|money pot|cagnotte)\b/g,
    replacement: 'target savings',
  },
  {
    regex: /\b(Fundraising|fundraising)\b/g,
    replacement: (match) => (match.charAt(0) === 'F' ? 'Target Savings' : 'target savings'),
  },
  {
    regex: /\b(layaway plan|fundraiser plan)\b/gi,
    replacement: 'target savings plan',
  },
  {
    regex: /\b(layaway plans|fundraiser plans)\b/gi,
    replacement: 'target savings plans',
  },

  // 3. Catégories & Sous-catégories
  // Nettoyage de sécurité contre d'éventuelles répétitions
  {
    regex: /\b(Groceries\s*&\s*)+Food\b/gi,
    replacement: 'Groceries & Food',
  },
  {
    regex: /\b(Cookware\s*&\s*)+Utensils\b/gi,
    replacement: 'Cookware & Utensils',
  },

  // Alimentation -> Groceries & Food (strict pour éviter toute récursion sur 'Food')
  {
    regex: /^\s*(Food|Feeding|Food supply|Food supplies|Alimentation)\s*$/gi,
    replacement: 'Groceries & Food',
  },
  {
    regex: /\b(Feeding|Food supply|Food supplies)\b/gi,
    replacement: 'Groceries & Food',
  },

  // Ustensiles -> Cookware & Utensils (strict pour éviter toute récursion sur 'Utensils')
  {
    regex: /^\s*(Utensils|Kitchen utensils|Ustensiles)\s*$/gi,
    replacement: 'Cookware & Utensils',
  },
  {
    regex: /\b(Kitchen utensils)\b/gi,
    replacement: 'Cookware & Utensils',
  },

  // Electronique -> Electronics & Gadgets
  {
    regex: /^\s*(Electronics|Electronic|Electronique)\s*$/gi,
    replacement: 'Electronics & Gadgets',
  },

  // Téléphonie -> Smartphones & Phones
  {
    regex: /^\s*(Phones|Telephony|Téléphonie)\s*$/gi,
    replacement: 'Smartphones & Phones',
  },
  {
    regex: /\b(Telephony|Téléphonie)\b/gi,
    replacement: 'Smartphones & Phones',
  },

  // Electromenager -> Home Appliances
  {
    regex: /^\s*(Household appliances|Household appliance|Electroménager|Electromenager)\s*$/gi,
    replacement: 'Home Appliances',
  },
  {
    regex: /\b(Household appliances|Household appliance)\b/gi,
    replacement: 'Home Appliances',
  },

  // Jeux -> Gaming & Entertainment
  {
    regex: /^\s*(Games|Game|Video Games|Jeux)\s*$/gi,
    replacement: 'Gaming & Entertainment',
  },

  // Montres -> Watches & Timepieces
  {
    regex: /^\s*(Watches|Watch|Montres)\s*$/gi,
    replacement: 'Watches & Timepieces',
  },

  // Mode -> Fashion & Apparel
  {
    regex: /^\s*(Fashion|Clothes|Clothing|Mode)\s*$/gi,
    replacement: 'Fashion & Apparel',
  },

  // Maison & Déco -> Home & Living
  {
    regex: /^\s*(House & Decor|Home decor|Maison & Déco)\s*$/gi,
    replacement: 'Home & Living',
  },

  // 4. Cotisations & Versements
  {
    regex: /\bmembership fees\b/gi,
    replacement: 'contributions',
  },
  {
    regex: /\bmembership fee\b/gi,
    replacement: 'contribution',
  },
  {
    regex: /\bdues\b/gi,
    replacement: 'contributions',
  },

  // 5. Échéances
  {
    regex: /\bdeadlines\b/gi,
    replacement: 'installments',
  },
  {
    regex: /\bdeadline\b/gi,
    replacement: 'installment',
  },
  {
    regex: /\bmaturities\b/gi,
    replacement: 'installments',
  },
  {
    regex: /\bmaturity\b/gi,
    replacement: 'installment',
  },

  // 6. Livraison & Remise en main propre
  {
    regex: /\b(hand delivery|delivery by hand|remittance in hand|hand to hand delivery)\b/gi,
    replacement: 'in-person delivery',
  },
  {
    regex: /\brelay point(s)?\b/gi,
    replacement: 'pickup point$1',
  },
  {
    regex: /\brelay agency\b/gi,
    replacement: 'pickup branch',
  },

  // 7. Slogan TakaPay
  {
    regex: /\b(Contribution to your own rhythm|Flexible layaway contributions)\b/gi,
    replacement: 'Flexible target savings contributions',
  },
  {
    regex: /\bRemaining balance\b/gi,
    replacement: 'Remaining balance',
  },
];

/**
 * Vérifie si la page est actuellement affichée en anglais
 */
export function isEnglishActive() {
  if (typeof document === 'undefined') return false;
  return (
    document.documentElement.classList.contains('translated-ltr') ||
    document.body.classList.contains('translated-ltr') ||
    document.cookie.includes('googtrans=/fr/en') ||
    document.cookie.includes('googtrans=%2Ffr%2Fen') ||
    document.cookie.includes('googtrans=/en/en')
  );
}

/**
 * Helper React optionnel pour afficher directement un terme stratégique selon la langue
 */
export function tTerm(termKey, fallbackFrench) {
  if (isEnglishActive() && TAKAPAY_TERMS[termKey]) {
    return TAKAPAY_TERMS[termKey];
  }
  return fallbackFrench;
}

let isApplying = false;

/**
 * Parcourt les nœuds texte visibles et applique les règles du glossaire
 */
export function applyGlossary(root = document.body) {
  if (typeof window === 'undefined' || !root || isApplying) return;
  if (!isEnglishActive()) return;

  isApplying = true;
  try {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node || !node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest('.notranslate, [translate="no"], [data-no-glossary]')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      let text = currentNode.nodeValue;
      let modified = false;

      for (const rule of TAKAPAY_GLOSSARY_RULES) {
        if (rule.regex.test(text)) {
          text = text.replace(rule.regex, rule.replacement);
          modified = true;
        }
      }

      if (modified && currentNode.nodeValue !== text) {
        currentNode.nodeValue = text;
      }
    }
  } catch {
    // Ignorer silencieusement
  } finally {
    isApplying = false;
  }
}

let isWatcherStarted = false;

/**
 * Initialise l'observateur automatique pour appliquer le glossaire dès que Google traduit
 */
export function initGlossaryWatcher() {
  if (typeof window === 'undefined' || isWatcherStarted) return;
  isWatcherStarted = true;

  let timer = null;
  const scheduleGlossary = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      applyGlossary(document.body);
    }, 120);
  };

  const observer = new MutationObserver(() => {
    if (isEnglishActive() && !isApplying) {
      scheduleGlossary();
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  window.addEventListener('takapay_language_changed', () => {
    setTimeout(() => applyGlossary(document.body), 150);
    setTimeout(() => applyGlossary(document.body), 600);
    setTimeout(() => applyGlossary(document.body), 1200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleGlossary);
  } else {
    scheduleGlossary();
  }
}

