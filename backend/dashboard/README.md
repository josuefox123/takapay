# Takapay — Site web public

## Présentation

Takapay est une plateforme d'achat d'articles par cagnotte, permettant aux clients de planifier leurs paiements ou de contribuer librement à leur cagnotte, au Bénin.

Ce projet concerne le développement du site web public de Takapay. Il vise à présenter la solution, expliquer son fonctionnement et orienter les visiteurs vers le téléchargement de l'application mobile.

## Objectifs

- Présenter Takapay et son fonctionnement.
- Mettre en avant les avantages de la plateforme.
- Expliquer les étapes d'utilisation du service.
- Faciliter l'accès aux liens de téléchargement de l'application mobile.
- Informer les visiteurs sur la politique de confidentialité.

## Technologies utilisées

- **React** : création des interfaces utilisateur.
- **Vite** : environnement de développement et outil de compilation.
- **Tailwind CSS** : stylisation et mise en page.
- **React Router** : navigation entre les pages.
- **Lucide React** : bibliothèque d'icônes.

## Structure du projet

```text
src/
├── assets/          # Images et ressources graphiques
├── components/
│   ├── public/      # Composants propres au site public
│   └── ui/          # Composants d'interface réutilisables
    └── admin        # Composants propres au site admin
├── layouts/         # Mises en page communes
├── pages/           # Pages du site
├── App.jsx          # Définition des routes
├── main.jsx         # Point d'entrée de l'application
└── index.css        # Styles globaux et Tailwind CSS
```

Cette structure évoluera selon les besoins du projet.


## Installation

### Prérequis

- Node.js
- npm

### Installer les dépendances

Depuis le dossier du projet frontend :

```bash
npm install
```

### Lancer le serveur de développement

```bash
npm run dev
```

Vite fournit l'adresse locale permettant d'afficher le site dans un navigateur.

### Générer la version de production

```bash
npm run build
```

### Vérifier la version de production

```bash
npm run preview
```

## État d'avancement

Le site public est en cours de développement. Les interfaces, les composants et la navigation sont mis en place progressivement.

La connexion aux services du backend Laravel et les liens définitifs de téléchargement de l'application mobile restent à intégrer ou à vérifier selon l'avancement du projet.

## Équipe

**Développement : SinusTic**
