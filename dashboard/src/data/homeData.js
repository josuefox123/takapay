export const navData = {
  links: [
    { label: "Comment ça marche ?", href: "#comment-ca-marche" },
    { label: "La confiance", href: "#securite" },
  ],
  cta: {
    label: "Commencer",
    href: "/splash",
  },
};

export const heroData = {
  eyebrow: "TAKAPAY · BÉNIN",
  titleLine1: "Épargnez à votre rythme.",
  titleLine2: "Achetez en confiance.",
  description:
    "Choisissez la cotisation libre ou le paiement comptant. Vos paiements sont sécurisés et chaque contribution est suivie.",
  ctaButton: {
    label: "Comment ça marche ?",
    href: "#comment-ca-marche",
  },
  chips: [
    "Sans intérêts ni pénalités",
    "Paiements sécurisés",
    "Montants en FCFA",
  ],
};

export const stepsData = {
  title: "Comment ça marche ?",
  steps: [
    {
      number: "01",
      icon: "bag",
      title: "Choisissez votre article",
      description:
        "Parcourez les articles disponibles et voyez leur prix en FCFA. Le montant de votre objectif est connu d’avance.",
      accent: false,
    },
    {
      number: "02",
      icon: "coins",
      title: "Choisissez comment payer",
      description:
        "Cotisez librement au montant et au moment qui vous conviennent, ou payez le prix comptant en une fois. Chaque article a sa propre cagnotte.",
      accent: true,
    },
    {
      number: "03",
      icon: "spark",
      title: "Recevez votre article après paiement complet",
      description:
        "Pour une cotisation libre, votre article est prêt lorsque le prix total est atteint. En paiement comptant, il est réglé en une fois. La livraison est organisée après paiement intégral.",
      accent: false,
    },
  ],
};

export const waysToPayData = {
  eyebrow: "MODES DE PAIEMENT",
  title: "Deux façons de payer",
  description:
    "Choisissez la formule qui vous convient : cotisez librement jusqu’au prix total ou réglez votre achat comptant en une seule fois.",
  options: [
    {
      id: "libre",
      icon: "spark",
      title: "Cotisation libre",
      description:
        "Versez quand vous le souhaitez et au montant qui vous convient, jusqu’à atteindre le prix total de l’article.",
    },
    {
      id: "comptant",
      icon: "coins",
      title: "Paiement comptant",
      description:
        "Réglez le prix total en une seule fois pour finaliser votre commande.",
    },
  ],
};

export const productSectionData = {
  title: "Le quotidien mérite de belles envies.",
  description:
    "Un projet utile ou une envie de longue date : vous choisissez ce qui entre dans votre prochaine cagnotte.",
  badgeText: "Une cagnotte\npar article.",
};

export const securityData = {
  title: "Votre argent avance avec des règles claires.",
  description:
    "Un objectif d’achat défini, un prix figé au lancement de la cagnotte et un historique de versements. Les paiements sont initiés à votre demande.",

  privacyHref: "#securite",
  points: [
    {
      title: "Pas d’intérêts, pas de pénalités",
      description: "L’épargne d’achat n’est pas un crédit à la consommation.",
    },
    {
      title: "Un prix connu d’avance",
      description: "Votre prix est figé au lancement de la cagnotte.",
    },
    {
      title: "Des versements suivis",
      description: "Les paiements échoués ne sont pas comptabilisés.",
    },
  ],
};

export const faqData = {
  title: "Questions fréquentes",
  items: [
    {
      question: "Quels modes de paiement sont proposés ?",
      answer:
        "Vous pouvez choisir la cotisation libre, en versant le montant que vous souhaitez jusqu’à atteindre le prix total, ou le paiement comptant, réglé en une seule fois.",
    },
    {
      question: "En cotisation libre, dois-je respecter un calendrier ?",
      answer:
        "Non. Vous choisissez quand effectuer vos versements et leur montant. Votre cagnotte progresse à chaque paiement confirmé, jusqu’au prix total de l’article.",
    },
    {
      question: "Quand mon article est-il prêt à être livré ?",
      answer:
        "Après le paiement intégral du prix de l’article. En cotisation libre, cela signifie que le total de la cagnotte doit atteindre le prix affiché ; en paiement comptant, le règlement se fait en une fois. Les modalités de livraison sont ensuite précisées pour votre commande.",
    },
    {
      question: "Un paiement en attente ou échoué est-il ajouté à ma cagnotte ?",
      answer:
        "Non. Seuls les paiements confirmés sont comptabilisés. Consultez le statut de la transaction et l’historique de votre cagnotte pour vérifier qu’un versement a bien été pris en compte.",
    },
    {
      question: "Le prix de l’article peut-il changer après mon premier versement ?",
      answer:
        "Le prix est figé au lancement de la cagnotte. Si le prix du produit change ensuite, votre cagnotte conserve le prix défini au départ.",
    },
    {
      question: "Quelle garantie est proposée sur un article ?",
      answer:
        "La durée de garantie dépend de l’article. Consultez sa fiche produit : lorsqu’une garantie spécifique est proposée, sa durée y est indiquée. Aucune durée générale ne s’applique à tous les articles.",
    },
    {
      question: "Takapay est-il un crédit ?",
      answer:
        "Non. La cotisation libre vous permet de mettre progressivement de côté pour un achat, sans intérêts ni pénalités. Vous pouvez aussi payer l’article comptant ; Takapay ne propose pas de crédit.",
    },
  ],
};

export const downloadData = {
  title: "Takapay est disponible.",
  description:
    "Installez l’application dès maintenant, choisissez votre premier article et lancez votre cagnotte.",
  openButton: "Ouvrir Takapay",
  installButton: "Installer sur mon téléphone",
  installedText: "Application installée ✓",
};

export const iosGuideData = {
  title: "Ajouter à l'écran d'accueil (iPhone)",
  subtitle:
    "Installez Takapay sur votre iPhone en quelques secondes sans passer par l'App Store :",
  steps: [
    {
      number: "1",
      title: "Ouvrez dans Safari",
      description: "Assurez-vous d’être sur le navigateur Safari sur votre iPhone.",
    },
    {
      number: "2",
      title: "Appuyez sur Partager",
      description: "Touchez l'icône de partage (le carré avec la flèche vers le haut) en bas de l'écran.",
    },
    {
      number: "3",
      title: "Sur l'écran d'accueil",
      description: "Faites défiler vers le bas et sélectionnez « Sur l'écran d'accueil ».",
    },
    {
      number: "4",
      title: "Confirmez l'ajout",
      description: "Appuyez sur « Ajouter » en haut à droite. Takapay apparaît comme une vraie application !",
    },
  ],
};

export const footerData = {
  tagline: "Le plaisir d’acheter, sans devoir tout payer d’un coup.",
  location: "Pensé au Bénin · Montants en FCFA (XOF)",
  linksTitle1: "Takapay",
  links1: [
    { label: "Comment ça marche ?", href: "#comment-ca-marche" },
    { label: "L’application", href: "#application" },
  ],
  linksTitle2: "Informations",
  links2: [
    { label: "Confidentialité", href: "#securite" },
    { label: "Conditions générales", href: "#securite" },
    { label: "Contact : sinustic@gmail.com", href: "mailto:sinustic@gmail.com" },
  ],
  copyright: "© 2026 SinusTic · Takapay. Tous droits réservés.",
};
