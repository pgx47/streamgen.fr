# StreamGen

Prototype français indépendant, entièrement statique : `public/index.html`, `style.css`, `wow.css`, `app.js` et `events.json`. Aucun serveur applicatif, base, clé API, flux vidéo ou service Sites n’est nécessaire à son fonctionnement. 25 événements fictifs. Les polices Google Fonts sont facultatives et disposent de polices de repli système.

## Prévisualiser
Depuis ce dossier : `npm run dev` (ou `python3 -m http.server 4173 --directory public`), puis ouvrir http://localhost:4173. Utiliser HTTP plutôt qu’un double clic : le chargement du JSON utilise fetch.

## Données
Remplacer `public/events.json`. Les identifiants `id` doivent rester stables (favoris et URL `#event=sg-001`). Le modèle conserve catégories, participants, organisateur, présence française, horaires source, options de diffusion, restrictions, sources, collecte, vérification, confirmation, report/annulation et popularité simulée. `demoSchedule.dayOffset` et `time` génèrent des dates relatives au jour de consultation à Paris, y compris les changements d’heure. Les statuts sont explicitement simulés ; l’heure ne confirme jamais un direct. Un onglet ouvert à minuit doit être rechargé pour actualiser les jours de démonstration.

Pour des données réelles, remplacer la résolution `demoSchedule` dans app.js par les champs ISO `start` et `end` issus de votre collecte, valider les URL officielles et adapter les mentions de démonstration et les options de diffusion. Ne pas simplement masquer le bandeau : le prototype n’effectue aucune vérification réelle. Les URL de source et de diffusion sont actuellement nulles pour éviter des faux liens. Le bouton de diffusion explique cette absence. Les exports ICS sont marqués fictifs ; les reports et annulations sont exportés avec STATUS:CANCELLED pour ne pas proposer l’ancien horaire comme confirmé.

## Hébergement GitHub + Cloudflare Pages
Placer les sources dans un dépôt GitHub, connecter ce dépôt à Cloudflare Pages, choisir le preset « None », utiliser la commande de build `npm run build` et indiquer `dist` comme dossier publié. Aucun secret ni variable d’environnement. Ce dépôt ne contient aucune dépendance à Sites. Une autre solution consiste à téléverser directement le contenu de dist dans un projet Pages. Les routes de fiches utilisent un hash et ne nécessitent aucune réécriture.

## Fonctions
Recherche sur tous les jours ; filtres OR dans chaque famille et AND entre familles ; agenda de J à J+8 ; favoris localStorage sur tous les jours ; détails accessibles via dialog natif et URL partageable ; copie du lien ; calendrier ICS ; comptes à rebours réactualisés toutes les 30 secondes. Les favoris sont propres au navigateur et à l’origine du site. Aucune synchronisation inter-appareils.

## Connexions à développer
Un pipeline externe devra collecter les sources autorisées, éventuellement utiliser DeepSeek pour extraire les annonces, vérifier les diffuseurs puis publier le JSON. Aucun appel DeepSeek, X ou autre API n’est implémenté. Aucun faux état d’IA connectée. Aucun partenaire, prix, score numérique, affiliation ou VPN actif. Le modèle pourra être étendu par des champs `commercial` pour une affiliation ou une sélection sponsorisée explicitement étiquetée, et `vpnContext` uniquement avec justification documentée (sans garantie d’accès).

## Direction visuelle — édition 02
Affiche photographique de tennis de table générée avec l’outil intégré ImageGen : `public/assets/ping-hero.png`. L’image illustre un sportif fictif. Le fichier `wow.css` contient la nouvelle direction éditoriale et les adaptations mobiles.

Prompt utilisé (outil intégré, sans API externe) : « Wide cinematic editorial sports magazine photograph for StreamGen. Fictional male table-tennis athlete in a dark blue jersey, powerful forehand, body on right half, table entering bottom right, tiny white ball frozen, overhead stadium spotlights, atmospheric haze, deep ink navy arena, muted chartreuse rim lighting, orange-red racket. Left 45 percent dark negative space. Authentic skin and textile detail, fine film grain. No text, logos, watermark, real person or video player. »

## Dépôt GitHub et production
Le code éditable est dans `public/`. `npm run build` le copie vers `dist/` sans dépendance. Le workflow `.github/workflows/deploy.yml` déploie ce dossier sur le projet Cloudflare Pages existant `streamgen`, branche `main`, avec les secrets existants `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`. Le domaine reste géré dans Cloudflare.

Cette version remplace l’ancien site Astro et ses automations (collecte, guides, actualités, alertes et tweets). Aucun appel externe de collecte ou de publication sociale n’est actif. L’ancien code reste dans l’historique Git, notamment le commit `5a5d514`. Pour le restaurer, créer un commit de retour avec Git plutôt que de réécrire l’historique.
