# Collecte autonome des visuels

La tâche GitHub `collect.yml` exécute `collect-images.mjs` après la collecte des événements, toutes les quatre heures. Aucun nouvel abonnement, aucune clé supplémentaire, aucun appel LLM pour sélectionner une image. Les nouvelles fiches entrent automatiquement dans cette étape.

## Recherche et validation

1. Regrouper les fiches par créateur ou édition d’événement, pour ne pas refaire une recherche pour chaque journée du même tournoi.
2. Garder en priorité les affiches d’édition courante et portraits déjà validés dans la bibliothèque locale.
3. Examiner la source officielle enregistrée de la fiche : Open Graph/Twitter sont seulement des candidates. Une image peut être publiée automatiquement si le même ImageObject contient une licence CC compatible, un auteur, le sujet et une édition cohérente.
4. Rechercher sur Wikimedia Commons via son API officielle. Le nom doit correspondre exactement à une identité dans le titre, le nom d’objet ou les catégories. Une mention dans une description ne suffit pas : elle pourrait parler d’un autre événement historique.
5. Vérifier licence, auteur, année, format et provenance. Refuser NC/ND, licence absente, incohérences entre le millésime du fichier et la date originale, image future, SVG/PDF et noms de fichiers d’icônes ou cartes. Les anciens visuels sont explicitement étiquetés Archives avec leur année.
6. Télécharger sur une liste d’hôtes HTTPS limitée, contrôler le format et la taille, nommer le fichier par son empreinte. Conserver attribution, source et licence. Associer le visuel à l’identifiant de la fiche.
7. Valider le catalogue et construire les pages. Le workflow commite données et images puis déploie le SHA exact.

La reconnaissance utilise les noms et métadonnées des sources ; ce n’est pas une reconnaissance visuelle universelle. Une absence ou une contradiction entraîne le maintien de l’illustration de secours, sans validation humaine requise pour que le site continue à fonctionner. Aucun simple og:image n’est traité comme une autorisation de republication.

## Limites de coût et de stockage

- Au plus six nouveaux sujets examinés par exécution, cache par sujet pendant une journée UTC. Les sujets suivants passent lors des exécutions suivantes.
- Quatre nouveaux fichiers au maximum par jour UTC dans l’état versionné ; aucune API payante d’images.
- Maximum deux Mo par téléchargement, 80 fichiers automatiques et 24 Mo de stockage automatique. Si une limite est atteinte, les images existantes et recours continuent à fonctionner.
- Pas de suppression automatique des pages d’archives ou de leurs images déjà associées.

Les fichiers sont dans `public/assets/auto-images/`, le registre dans `public/automatic-images.json`, et l’état de recherche dans `data/image-cache.json`. Le cache évite de refaire la recherche pour chaque fiche d’une même série. Une collecte d’événements conserve sourceImage ; le collecteur d’images réapplique les associations même après une nouvelle édition du catalogue.

## Traçabilité

`/image-collection-status.json` affiche les contrôles, échecs, sélections et aperçus restés sans licence. `/credits-images/` et `/image-credits.json` incluent les images automatiques avec leurs auteurs et licences. `work/images-run.json` est conservé 14 jours dans les artefacts Actions. Les erreurs d’une banque d’images ne bloquent pas les autres événements.

Les affiches protégées mises à disposition dans un espace presse, déjà validées séparément, ne sont pas requalifiées en licence libre par ce collecteur. Les photos d’archives n’attestent pas les participants ou les affiches d’une nouvelle édition.
