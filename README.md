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

Les données structurées sont `Article` et `BreadcrumbList` : ces pages sont des guides de diffusion, pas une billetterie, une fiche VideoObject ou la preuve d’un direct. Aucun résultat enrichi Google ni positionnement n’est promis. La canonique est `https://streamgen.fr`, y compris sur les copies de prévisualisation. Les anciennes routes Astro ne sont pas redirigées arbitrairement vers l’accueil : une URL sans équivalent reçoit une 404. La mise à jour des fiches et de leur contenu éditorial reste indispensable au référencement.

## Déploiement

Le workflow GitHub vérifie les tests et génère `dist/`, puis déploie vers le projet Cloudflare Pages existant `streamgen` avec `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`. Aucun de ces secrets n’est copié dans les fichiers publics. Pour un autre projet Pages connecté à GitHub : preset None, commande `npm run build`, sortie `dist`. Pour un téléversement direct, publier le contenu de `dist/`. Le site ne dépend pas de l’hébergement Sites.

## Ce qui reste externe

Aucune collecte DeepSeek, X, scraping récurrent ou publication sociale n’est connectée. Une future collecte devra être exécutée hors du navigateur, à partir de sources autorisées, avec validation éditoriale avant publication des JSON. Le registre de sources constitue un point de départ, pas un engagement de disponibilité des API. Le pipeline historique Astro et ses automatisations restent dans l’historique Git, antérieur au commit `f2c1159`.

## Visuel

`public/assets/ping-hero.png` est une illustration générée avec l’outil intégré ImageGen. Elle ne représente pas un participant réel. Prompt : photographie éditoriale cinématographique d’un pongiste fictif, maillot bleu, coup droit, athlète à droite, salle bleu nuit, lumière de stade et reflets vert chartreuse, espace sombre à gauche, sans texte ni logo. Les polices Google Fonts sont facultatives avec repli système.
