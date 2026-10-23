# Takapay — Guide Complet d'Installation & d'Architecture

Bienvenue sur le projet **Takapay**. Ce dépôt regroupe à la fois le backend d'API REST (Laravel 11 / PHP 8.3) et l'application frontend (React 19 / Vite / Tailwind CSS), comprenant le site vitrine public, le portail client (PWA avec achat par cagnotte) et le back-office d'administration.

---

## Sommaire

1. [Architecture du Projet](#architecture-du-projet)
2. [Prérequis Système](#prérequis-système)
3. [Installation & Démarrage Pas à Pas](#installation--démarrage-pas-à-pas)
   - [A. Configuration du Backend (Laravel)](#a-configuration-du-backend-laravel)
   - [B. Configuration du Frontend (React / Vite)](#b-configuration-du-frontend-react--vite)
4. [Espaces Applicatifs & Navigation](#espaces-applicatifs--navigation)
5. [Authentification & Sécurité Client](#authentification--sécurité-client)
6. [Comptes & Données de Test](#comptes--données-de-test)
7. [Commandes Utiles & Tests](#commandes-utiles--tests)
8. [Résolution des Problèmes Fréquents](#résolution-des-problèmes-fréquents)

---

## 1. Architecture du Projet

Le projet est structuré en deux parties principales :

```text
backend/
├── app/                      # Code source Laravel (Contrôleurs API, Modèles, Requests, Resources)
│   ├── Http/
│   │   ├── Controllers/Api/  # AuthController, AdminController, ProduitController, etc.
│   │   ├── Middleware/       # Middleware d'authentification et de sécurité
│   │   ├── Requests/         # Validation des entrées formulaires et API
│   │   └── Resources/        # Formatage JSON des réponses Eloquent
│   └── Models/               # User, Produit, Commande, Cagnotte, Livraison, etc.
├── config/                   # Configuration Laravel (Sanctum, Database, Cors...)
├── database/
│   ├── migrations/           # Schémas de base de données (Users, Produits, Cagnottes...)
│   └── seeders/              # Données de test et catégories initiales
├── routes/
│   └── api.php               # Points d'entrée de l'API REST (/api/...)
└── dashboard/                # Application Frontend React (Vite)
    ├── public/               # Images, icônes PWA et ressources statiques
    │   └── assets/           # Catalogue produits et bannières
    ├── src/
    │   ├── components/
    │   │   ├── client/       # Portail client (Catalogue, Tunnel d'achat, Profil, Cagnotte)
    │   │   ├── admin/        # Composants du tableau de bord d'administration
    │   │   ├── public/       # Composants du site vitrine public
    │   │   └── ui/           # Composants réutilisables
    │   ├── pages/
    │   │   ├── admin/        # Pages admin (Produits, Commandes, Livraisons, KYC, Audit)
    │   │   └── public/       # Pages publiques et client (Home, AppHome, Splash)
    │   ├── services/         # Clients API HTTP (auth, produits, commandes...)
    │   ├── App.jsx           # Définition des routes React Router
    │   └── index.css         # Styles globaux & Tailwind CSS
    └── package.json          # Dépendances frontend
```

---

## 2. Prérequis Système

Avant de commencer, assurez-vous d'avoir installé sur votre machine :

- **PHP** : >= 8.3 (avec extensions : `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `curl`)
- **Composer** : >= 2.5
- **MySQL** ou **MariaDB** : >= 8.0 (ou SQLite pour tests rapides)
- **Node.js** : >= 18.x
- **npm** : >= 9.x

---

## 3. Installation & Démarrage Pas à Pas

### A. Configuration du Backend (Laravel)

Ouvrez un premier terminal à la racine du backend (`/backend`) :

1. **Installer les dépendances PHP :**
   ```bash
   composer install
   ```

2. **Configurer l'environnement :**
   Copiez le fichier d'exemple et générez la clé d'application :
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. **Configurer la base de données et les mots de passe dans `.env` :**
   Modifiez les variables de connexion à votre base MySQL locale et définissez les mots de passe souhaités pour les comptes administrateurs :
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=takapay
   DB_USERNAME=votre_utilisateur
   DB_PASSWORD=votre_mot_de_passe

   # Mots de passe personnalisés des comptes créés par le seeder
   SUPER_ADMIN_PASSWORD=password123
   ADMIN_PASSWORD=password123
   ```
   *(Créez au préalable la base `takapay` dans votre serveur MySQL : `CREATE DATABASE takapay;`)*

   > [!NOTE]
   > Si vous ne définissez pas `SUPER_ADMIN_PASSWORD` et `ADMIN_PASSWORD` dans votre fichier `.env`, le seeder générera automatiquement un mot de passe aléatoire temporaire et l'affichera dans le terminal lors du `php artisan db:seed`. Il est donc fortement recommandé de les renseigner dans votre `.env`.

4. **Créer le lien symbolique de stockage :**
   ```bash
   php artisan storage:link
   ```

5. **Exécuter les migrations et les seeders :**
   Cette commande crée toutes les tables, injecte les 17 catégories officielles et initialise les comptes administrateurs avec les mots de passe de votre `.env` :
   ```bash
   php artisan migrate --seed
   ```

6. **Lancer le serveur backend :**
   ```bash
   php artisan serve --port=8000
   ```
   L'API est accessible sur `http://localhost:8000/api`.

---

### B. Configuration du Frontend (React / Vite)

Ouvrez un second terminal dans le dossier `dashboard` :

1. **Accéder au dossier frontend :**
   ```bash
   cd dashboard
   ```

2. **Installer les dépendances Node.js :**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   Le frontend démarre sur `http://localhost:5173`.

4. *(Optionnel)* **Tester la compilation de production :**
   ```bash
   npm run build
   npm run preview
   ```

---

## 4. Espaces Applicatifs & Navigation

Une fois l'application lancée (`http://localhost:5173`) :

| URL | Description | Rôle / Accès |
|---|---|---|
| `/` | **Site Vitrine Public** | Présentation de Takapay, fonctionnement, liens de téléchargement |
| `/app` | **Portail Client (PWA)** | Catalogue des produits, tunnel d'achat par cagnotte, profil, cagnottes actives |
| `/admin` | **Tableau de Bord Admin** | Statistiques globales, métriques financières, gestion des commandes |
| `/admin/products` | **Gestion Produits** | Ajout, modification, suppression et stock des articles |
| `/admin/orders` | **Gestion Commandes** | Suivi des commandes clients et paiements |
| `/admin/deliveries` | **Suivi Livraisons** | Attribution des colis et statut des livraisons |
| `/admin/delivery-persons` | **Gestion Livreurs** | Répertoire des livreurs partenaires |
| `/admin/kyc` | **Vérification KYC** | Validation des pièces d'identité clients |
| `/admin/audit` | **Journal d'Audit** | Historique des actions d'administration |

---

## 5. Authentification & Sécurité Client

- **Inscription & Connexion Client :**
  - Identifiant : **Numéro de téléphone** (format local ou international)
  - Mot de passe : **Code PIN à 6 chiffres**
  - Option alternative : **Connexion Google OAuth** (`/api/auth/google`)
- **Stockage sécurisé :**
  - Le code PIN est directement haché avec l'algorithme sécurisé **Bcrypt** dans la colonne `password` de la table `users`.
  - Aucun code PIN n'est stocké en texte clair.
- **Accès restreint au Profil & à la Cagnotte :**
  - Un utilisateur non connecté accédant à l'onglet "Profil" ou "Cagnotte" est invité à se connecter ou à créer son compte.
  - La déconnexion vide le token Sanctum local (`localStorage`) et réinitialise l'affichage de manière dynamique.

---

## 6. Données & Comptes de Test

Lors de l'exécution de `php artisan migrate --seed` :
- Les **17 catégories d'articles officielles** (Téléphonie, Électroménager, Informatique, etc.) ainsi que leurs sous-catégories sont automatiquement créées.
- Deux comptes administrateurs sont initialisés avec les identifiants suivants :

| Rôle | Email / Identifiant | Téléphone | Mot de passe |
|---|---|---|---|
| **Super Administrateur** | `admin@takapay.bj` | `+22990000000` | Valeur de `SUPER_ADMIN_PASSWORD` dans `.env` *(ex: `password123`)* |
| **Admin / Gestionnaire** | `manager@takapay.bj` | `+22990000001` | Valeur de `ADMIN_PASSWORD` dans `.env` *(ex: `password123`)* |

> [!TIP]
> Pour vous connecter au tableau de bord administrateur (`http://localhost:5173/admin`), utilisez l'un de ces deux comptes avec le mot de passe que vous avez configuré dans votre `.env`.

### Création d'un compte Client (Acheteur) :
1. Rendez-vous sur `http://localhost:5173/app`
2. Cliquez sur l'onglet **Profil** ou lancez une commande sur un article.
3. Renseignez votre nom, prénom, numéro de téléphone et choisissez un code PIN à 6 chiffres (ou utilisez la connexion Google).

---

## 7. Commandes Utiles & Tests

### Backend (dans `/backend`)

- **Exécuter les tests unitaires et d'intégration :**
  ```bash
  php artisan test
  ```
- **Nettoyer les caches Laravel :**
  ```bash
  php artisan optimize:clear
  ```
- **Lister toutes les routes API :**
  ```bash
  php artisan route:list --path=api
  ```
- **Réinitialiser complètement la base de données :**
  ```bash
  php artisan migrate:fresh --seed
  ```

### Frontend (dans `/dashboard`)

- **Démarrage en développement :**
  ```bash
  npm run dev
  ```
- **Compilation de production :**
  ```bash
  npm run build
  ```

---

## 8. Résolution des Problèmes Fréquents

1. **Erreur de connexion MySQL (`Access denied` ou `Connection refused`) :**
   - Vérifiez que votre serveur MySQL est démarré (`sudo systemctl status mysql` ou via XAMPP/WAMP).
   - Assurez-vous que le nom de la base dans `.env` (`takapay`) existe bien.

2. **Images des produits non affichées :**
   - Assurez-vous d'avoir exécuté `php artisan storage:link`.
   - Les images statiques du catalogue frontend se situent dans `dashboard/public/assets/`.

3. **Erreurs de dépendances Composer ou extensions PHP manquantes :**
   - Vérifiez vos extensions PHP : `php -m`.
   - Assurez-vous d'activer `pdo_mysql` et `curl` dans votre `php.ini`.

4. **Port 8000 ou 5173 déjà utilisé :**
   - Spécifiez un autre port si nécessaire :
     - Backend : `php artisan serve --port=8001`
     - Frontend : `npm run dev -- --port 5174`
