/**
 * Glossaire Officiel TakaPay (Système Hybride i18n / Google Translate)
 * 
 * Permet à Google Translate de traduire 90% du site automatiquement,
 * tout en verrouillant et rectifiant les termes financiers et métier stratégiques.
 */

export const TAKAPAY_TERMS = {
  // Termes clés Français -> Anglais officiel
  cagnotte: 'Layaway',
  cagnottes: 'Layaways',
  acompte: 'Down payment',
  acomptes: 'Down payments',
  echeance: 'Installment',
  echeances: 'Installments',
  cotisation: 'Contribution',
  cotisations: 'Contributions',
  reste_a_payer: 'Remaining balance',
  remise_main_propre: 'In-person delivery',
  retrait_agence: 'Branch pickup',
  point_relais: 'Pickup point',
  financement_termine: 'Funding completed',
};

export const TAKAPAY_GLOSSARY_RULES = [
  // 1. Cagnottes / Épargne (Empêche Google de traduire par "kitty", "jackpot" ou "prize pool")
  {
    regex: /\b(my\s+)?(kitties|jackpots|prize pools)\b/gi,
    replacement: (match, p1) => (p1 ? `${p1}layaways` : 'layaways'),
  },
  {
    regex: /\b(my\s+)?(kitty|jackpot)\b/gi,
    replacement: (match, p1) => (p1 ? `${p1}layaway` : 'layaway'),
  },
  {
    regex: /\bKitties\b/g,
    replacement: 'Layaways',
  },
  {
    regex: /\bKitty\b/g,
    replacement: 'Layaway',
  },
  {
    regex: /\bkitties\b/g,
    replacement: 'layaways',
  },
  {
    regex: /\bkitty\b/g,
    replacement: 'layaway',
  },

  // 2. Cotisations & Versements (Empêche Google de traduire par "membership fee" ou "dues")
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

  // 3. Échéances (Empêche Google de traduire par "deadline" ou "maturity")
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

  // 4. Livraison & Remise en main propre
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

  // 5. Vocabulaire spécifique TakaPay
  {
    regex: /\bContribution to your own rhythm\b/gi,
    replacement: 'Flexible layaway contributions',
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

