# Contenus réels StreamGen

Objectif : remplacer la démonstration par un agenda sourcé, sans présenter une donnée inconnue comme confirmée.

1. Rassembler les calendriers et annonces de diffuseurs officiels dans public/sources.json ; conserver leurs URL, portée et date de consultation.
2. Remplacer public/events.json par des dates ISO absolues. Date seule si l’horaire manque ; null pour les conditions ou participations inconnues. Ne jamais créer un match ou un résultat absent des sources.
3. Tester d’abord les règles de dates Paris (changement d’heure), les statuts sans confirmation live, les conditions inconnues et l’export calendrier sans fin inventée.
4. Isoler ces règles dans public/event-utils.mjs. Adapter app.js : filtrage par date réelle, rubriques éditoriales sans faux indicateur de popularité, sources détaillées, liens officiels et calendrier réel.
5. Ajouter une vue des sources et des archives pour les annonces passées (créateurs). Signaler la fraîcheur des données et les limites de couverture.
6. Vérifier les données au build, les tests, les liens de ressources locales et le rendu navigateur/mobile. Publier sur GitHub main, attendre Cloudflare, vérifier le domaine de production. Aligner ensuite la copie Sites et l’export téléchargeable.
