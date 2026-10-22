---
trigger: always_on
---

# Règles de développement React — Projet Takapay

## 1. Principes fondamentaux
- Respecter strictement les règles officielles de React et des React Hooks.
- Privilégier un code simple, lisible, réutilisable et facile à maintenir.
- Séparer les responsabilités entre les composants d'interface, la logique métier et les appels à l'API.
- Privilégier la composition des composants plutôt que l'héritage.
- Respecter la structure et les conventions déjà établies dans le projet.
- Examiner le code existant avant de créer, modifier ou supprimer des fichiers.

## 2. Utilisation des Hooks React
- Appeler les Hooks uniquement au niveau supérieur des composants fonctionnels et des Hooks personnalisés, jamais dans des conditions, des boucles ou des fonctions imbriquées.
- Utiliser `useState` pour les états locaux et les mises à jour fonctionnelles lorsque le nouvel état dépend du précédent.
- Utiliser `useEffect` uniquement lorsqu'une synchronisation avec un système externe est nécessaire.
- Déclarer correctement les dépendances des effets et nettoyer les abonnements, écouteurs et autres ressources lorsque nécessaire.
- Éviter les effets inutiles, les boucles de rendu et les dépendances manquantes.
- Utiliser `useContext` pour partager des données entre plusieurs composants lorsque cela est pertinent.
- Utiliser `useReducer` lorsque la gestion de l'état devient complexe.
- Utiliser `useRef` pour conserver des valeurs qui ne nécessitent pas de nouveau rendu ou pour accéder au DOM.
- Créer des Hooks personnalisés lorsque la logique doit être réutilisée. Leur nom doit commencer par `use`.
- Gérer correctement les états de chargement, les erreurs et les opérations asynchrones dans les Hooks concernés.

## 3. Performance
- Ne pas utiliser systématiquement `useMemo` et `useCallback`. Les employer lorsqu'ils apportent un bénéfice réel.
- Éviter les optimisations prématurées.
- Utiliser `useTransition` et `useDeferredValue` uniquement lorsque le besoin le justifie.
- Ne pas ajouter de complexité uniquement pour réduire le nombre de rendus.

## 4. Architecture des composants
- Garder les composants petits, cohérents et centrés sur une responsabilité claire.
- Utiliser la composition et la propriété `children` pour créer des composants flexibles.
- Construire des composants réutilisables lorsque plusieurs parties de l'application partagent réellement la même interface ou le même comportement.
- Séparer les pages, les composants partagés, les Hooks personnalisés et les services API lorsque cela améliore la lisibilité.
- Éviter les composants trop volumineux, les duplications de code et les abstractions inutiles.
- Utiliser des propriétés clairement nommées et une interface cohérente entre les composants.
- Ne pas créer systématiquement des composants distincts pour chaque élément HTML.
- Privilégier les solutions React modernes et simples. Utiliser les patterns avancés comme Compound Components, Render Props et Higher-Order Components uniquement lorsqu'ils répondent à un besoin réel.
- Choisir entre les composants contrôlés et non contrôlés en fonction des besoins du formulaire.

## 5. Context et partage de données
- Utiliser Context lorsque des données doivent être partagées entre plusieurs composants éloignés dans l'arbre React.
- Créer des Providers et des Hooks de consommation clairs lorsque cela est pertinent.
- Séparer les contextes par domaine lorsque leurs responsabilités sont différentes.
- Gérer explicitement les cas où un Hook dépend d'un Provider absent.
- Mémoriser les valeurs de Context uniquement lorsque cela apporte un bénéfice réel.
- Éviter le prop drilling excessif, sans remplacer systématiquement les propriétés par Context.
- Ne jamais considérer le Context React comme un mécanisme de sécurité ou d'autorisation côté serveur.

## 6. Gestion des erreurs
- Utiliser des Error Boundaries pour isoler les erreurs de rendu des parties critiques de l'interface lorsque cela est nécessaire.
- Prévoir une interface de secours claire et compréhensible pour l'utilisateur.
- Journaliser les erreurs de manière appropriée, sans exposer de données sensibles.
- Traiter séparément les erreurs de requêtes HTTP, de validation des formulaires et les erreurs de rendu.
- Ne pas afficher les détails techniques internes ou les informations confidentielles à l'utilisateur.
- Ne pas prétendre qu'une Error Boundary intercepte toutes les erreurs JavaScript ou les erreurs asynchrones.

## 7. Qualité du code et outils
- Utiliser ESLint avec les règles React Hooks pour détecter les erreurs courantes.
- Respecter les conventions de nommage et de formatage du projet.
- Utiliser TypeScript uniquement si le projet est configuré pour cela ou si sa migration est explicitement demandée.
- Documenter les composants complexes et leurs propriétés lorsque cela facilite leur utilisation.
- Écrire des tests pour les fonctionnalités importantes lorsque l'environnement de test est disponible.
- Utiliser Storybook uniquement si le projet en a besoin et si sa configuration est pertinente.
- Ne pas installer de dépendances supplémentaires sans justification.
- Vérifier les changements réalisés et signaler les éventuelles erreurs ou vérifications qui restent à effectuer.

## 8. Application au projet Takapay
- Utiliser React pour construire une interface modulaire, cohérente, responsive et accessible.
- Utiliser Tailwind CSS pour le style, en respectant la version et la configuration déjà présentes dans le projet.
- Privilégier une interface sobre, professionnelle et cohérente avec l'identité visuelle de Takapay.
- Séparer les appels à l'API Laravel de la présentation lorsque cela est pertinent.
- Centraliser les appels API dans des services réutilisables lorsque cela simplifie le projet.
- Gérer les états de chargement, les erreurs, les résultats vides et les réponses inattendues de l'API.
- Ne jamais inventer les routes, les champs ou les formats de réponse de l'API : examiner le code existant et respecter les contrats disponibles.
- Ne jamais considérer les contrôles de l'interface comme un remplacement de la validation, de l'authentification ou de l'autorisation côté Laravel.
- Ne jamais exposer de mots de passe, de secrets, de clés privées ou de jetons sensibles dans le code source public.
- Réutiliser les composants existants avant d'en créer de nouveaux.
- Ne pas réécrire des parties fonctionnelles du projet sans nécessité.

## 9. Consignes de travail pour l'assistant IA
- Avant toute modification, examiner les fichiers concernés et comprendre leur rôle dans l'architecture existante.
- Choisir la solution la plus simple qui répond correctement au besoin.
- Ne pas introduire de patterns avancés, d'optimisations ou d'abstractions sans raison concrète.
- Ne pas modifier des fichiers ou des fonctionnalités sans rapport avec la tâche demandée.
- Préserver les changements existants et le travail des autres contributeurs.
- Expliquer brièvement les choix techniques importants et les notions nouvelles afin de favoriser l'apprentissage du développeur.
- Procéder étape par étape lorsque la tâche est complexe.
- Après une modification, résumer les fichiers concernés, les changements effectués et les tests réellement exécutés.
- Ne jamais affirmer qu'un test a réussi s'il n'a pas été exécuté ou si son résultat n'a pas été vérifié.