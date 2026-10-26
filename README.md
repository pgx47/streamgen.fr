# StreamGen — agenda sourcé des directs

Site statique en français : HTML, CSS et JavaScript, sans serveur applicatif ni clé API publique. Les données réelles sont éditées dans `public/events.json`, les références dans `public/sources.json`. Aucun lien affilié, faux résultat, flux vidéo ou score de popularité n’est intégré.

## Prévisualiser et vérifier

Node 22+ pour générer les pages, Python 3 pour la prévisualisation. Aucune installation de paquet nécessaire.

- `npm run dev` : génère le site puis sert `dist/` sur http://localhost:4173.
- `npm run check` : vérification de syntaxe.
- `npm test` : règles de dates, statuts, filtres, calendrier et pages HTML générées.
- `npm run build` : valide les données puis génère le site complet dans `dist/`.

Ne pas servir `public/` directement : les pages SEO sont générées au build. Un hébergement par simple double clic ne permet pas le chargement JSON.

## Contenus réels et mise à jour

Première sélection manuelle : 27 rendez-vous, dont une annonce passée conservée en archives, et 22 références officielles consultées le 25 octobre 2026. La sélection n’est pas exhaustive et n’est pas actualisée automatiquement.

Les dates `start`/`end` sont des dates ISO absolues avec fuseau. `date` est la date française du rendez-vous. Pour une date sans heure, `start` vaut null : l’affichage dit « horaire à confirmer » et le calendrier utilise une journée entière. `end` reste null sans information explicite ; aucune durée standard n’est créée. `schedule` contient les différentes sessions d’une même journée. L’horaire d’une session sportive n’implique pas sa diffusion intégrale.

Chaque source fournit une URL, une portée et une date réelle de consultation. Les options de diffusion portent leurs propres restrictions, accès (`free`, `subscription`, `unknown`) et nécessité de compte (`true`, `false`, `null` si inconnue). Une donnée inconnue ne passe pas les filtres « Gratuit » ou « Sans compte ». Les liens `information` ouvrent le programme du diffuseur, pas un faux lecteur de l’événement.

`frenchPresence` est true uniquement lorsqu’une présence française est annoncée. Lire `frenchNote` : pour le WTT, les frères Lebrun sont annoncés au tournoi ; leur présence à chaque session n’est pas affirmée. Les finalistes, adversaires et résultats ne sont jamais déduits des tirages supposés. Aucun flux n’est surveillé : un horaire dépassé affiche « Début prévu », pas « En direct confirmé » ou « Terminé ». Un contrôle manuel explicite est nécessaire pour ces statuts.

Mettre à jour les données et les sources ensemble, en conservant les identifiants et slugs stables. Ne pas modifier `lastVerified` ou `checkedAt` sans nouvelle consultation. Après 48 h, les fiches signalent que les informations sont à revérifier. L’agenda vide reste honnête : pas de déplacement artificiel des dates.

## Pages et SEO

Le build génère `/evenements/<slug>/index.html`, l’index `/evenements/`, `/sources/`, `sitemap.xml`, `robots.txt` et une véritable page 404. Chaque fiche contient son contenu dans le HTML initial, un H1, un titre, une description, une URL canonique et ses liens de source. Les liens de fiches sont de vrais `<a href>`. L’aperçu modal reste disponible mais les liens copiés mènent à la page complète. Les anciens liens hash fonctionnent pour les identifiants réels ; les favoris fictifs ne sont pas réattribués aux vrais événements.

Les données structurées sont `Article`, `BreadcrumbList` et, pour les rendez-vous avec heure connue, `Event` ou `SportsEvent` : ces pages sont des guides de diffusion, pas une billetterie, une fiche VideoObject ou la preuve d’un direct. Aucun résultat enrichi Google ni positionnement n’est promis. La canonique est `https://streamgen.fr`, y compris sur les copies de prévisualisation. Les anciennes routes Astro ne sont pas redirigées arbitrairement vers l’accueil : une URL sans équivalent reçoit une 404. La mise à jour des fiches et de leur contenu éditorial reste indispensable au référencement.

## Déploiement

Le workflow GitHub vérifie les tests et génère `dist/`, puis déploie vers le projet Cloudflare Pages existant `streamgen` avec `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`. Aucun de ces secrets n’est copié dans les fichiers publics. Pour un autre projet Pages connecté à GitHub : preset None, commande `npm run build`, sortie `dist`. Pour un téléversement direct, publier le contenu de `dist/`. Le site ne dépend pas de l’hébergement Sites.

## Automatisation en place et limites

La collecte GitHub fonctionne toutes les quatre heures : calendriers officiels,
Riot, france.tv sport, Red Bull, YouTube, Liquipedia, PGL, Lichess, Oengus,
start.gg, PandaScore, CERN, ARTE Concert et spatial. Les accès et limites varient
par source ; les rapports indiquent les échecs et les absences de données.
DeepSeek intervient comme extracteur et traducteur borné, avec budget quotidien.
Il ne constitue pas encore une rédaction éditoriale complète des fiches.

Chaque collecteur continue indépendamment des autres. Le catalogue passe le
build avant publication ; les erreurs de processus restent signalées après
sauvegarde des données valides. Voir `docs/collection.md`.

Les favoris sont locaux. Les notifications actuelles nécessitent le site ouvert.
Les push lorsque le site est fermé, la synchronisation entre appareils, les
mesures de popularité réelles, la publication sociale et l'affiliation ne sont
pas implémentés. X n'est pas connecté.

## Visuels et abonnements

Les photos de contexte et d'archive, les logos et les images d'événement validées
sont crédités sur `/credits-images/`. Un recours de discipline n'est pas une
photo de l'édition annoncée. La collecte d'images vérifie provenance et licence ;
elle ne garantit pas une affiche spécifique à chaque rendez-vous.

Google Calendar, Outlook et les exports ICS sont disponibles sur les fiches.
`/calendriers/` expose les abonnements ICS par thème et le flux RSS. Les hubs
`/sport/`, `/esport/`, `/espace-sciences/`, `/francais/` et `/semaine/` complètent
le maillage interne. L'indexation et la croissance SEO restent à mesurer.

## Première collecte automatique

`node scripts/collect.mjs` découvre les pages datées du calendrier officiel WTT Montpellier et vérifie les deux sessions de chaque journée déjà publiée. Les éditions nouvelles deviennent des candidats dans le rapport Actions, sans héritage automatique des droits TV. Le workflow `Collect official calendars` est planifié toutes les quatre heures à la minute 17 UTC, avec une publication au maximum quotidienne en l’absence de changement horaire. Les déclenchements GitHub peuvent être retardés.

Une panne conserve le catalogue précédent et fait échouer le job. Les collectes partielles préservent les autres fiches. `scheduleVerifiedAt` ne concerne que les horaires ; `lastVerified` et les conditions de diffusion ne sont pas rajeunis artificiellement. Les résultats sont accessibles dans les artefacts Actions `collection-report` et dans `collection-status.json` après une publication réussie. Ni les flux live ni les autres catégories ne sont contrôlés par ce premier connecteur.

Le bot pousse les données puis appelle explicitement le workflow réutilisable de déploiement : les commits du GITHUB_TOKEN ne déclenchent pas eux-mêmes les workflows push. Chaque déploiement contrôle ensuite la version publique et le chargement du catalogue.
