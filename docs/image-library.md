# Bibliothèque d’illustrations

Toutes les fiches reçoivent une illustration : priorité au thème reconnu, puis une image générique d’ambiance pour les thèmes inconnus. La sélection se fait localement dans eventVisual ; aucun appel à une banque d’images depuis le navigateur ni coût d’API n’est ajouté à la collecte.

Neuf photos de Wikimedia Commons complètent les quatre illustrations IA existantes : badminton, gymnastique, sports aquatiques, voile, judo, espace, cuisine, studio de créateur, ambiance générique. Les fichiers sont hébergés localement en WebP. Les images déjà générées gardent leur nature IA, sans être présentées comme des photos libres.

IMAGE_LIBRARY dans public/event-utils.mjs est le registre de référence : fichier, titre, auteur, licence et lien de licence, page source Commons, nature et modifications apportées. Le build publie /credits-images/ et /image-credits.json. Chaque carte et fiche renvoie vers son crédit. Les licences CC BY-SA restent appliquées aux adaptations des photos concernées ; cela ne place pas le site entier sous cette licence.

Les métadonnées ont été lues via l’API officielle Commons (imageinfo/extmetadata), puis chaque visuel a été contrôlé. Les sources exactes sont dans le registre. La conversion WebP/redimensionnement et le recadrage d’affichage sont signalés. Les crédits distinguent les photos CC BY/CC BY-SA, CC0, domaine public et images générées.

Une image illustre une discipline ou une ambiance ; elle n’annonce pas qu’une personne photographiée participe à l’événement. Ne pas utiliser les visuels comme preuve de participants, de lieu exact ou de diffusion.

Pour ajouter une discipline : choisir un fichier réutilisable, vérifier sa page et sa licence, stocker localement l’image, compléter son entrée de registre avec l’attribution, puis ajouter sa règle de correspondance. En attendant, le fallback conserve une illustration et son crédit. Les erreurs de chargement des cartes utilisent ce même fallback avec un crédit adapté.

## Visuels directement liés aux événements

Priorité aux entrées documentées d’événement : affiche officielle PGW 2026 et capture réelle Worlds 2025. L’affiche provient de la rubrique « Les affiches officielles » de l’espace presse PGW (https://www.parisgamesweek.com/fr/espace-presse), document horizontal public https://drive.google.com/file/d/1_dUHzXmd-pofl0pMeag8q1z-Wx2qcrcK/view. Sa mise à disposition presse est utilisée pour une présentation éditoriale de la PGW ; ce support protégé n’est pas qualifié de libre de droits. Le PDF a été rendu en WebP, sans modification du contenu. Il n’est associé qu’aux fiches PGW de 2026, pas aux éditions futures.

La capture IG vs T1 — Worlds 2025 Play-in est de Fomos Esports, sous CC BY 3.0 selon https://commons.wikimedia.org/wiki/File:IG_vs_T1_-_2025_Worlds_Play-in.jpg. Elle est affichée comme archive 2025 ; ni les équipes ni la scène ne sont présentées comme celles du rendez-vous 2026. Titre, auteur, licence, source Commons et publication d’origine sont conservés dans les crédits.

Pour les autres événements, la bibliothèque de discipline reste le recours. Aucun scraper ne considère une image Open Graph comme une autorisation de republication. De nouveaux supports officiels demandent une provenance et des conditions documentées avant ajout au registre. Une clé visualKey permet ensuite de les associer aux données d’un événement, sans modifier le rendu du site.

## Contexte du créateur et du programme

Un stream régulier n’est pas une compétition sportive. Le collecteur utilise LIVE pour les créateurs et JEU pour l’esport, au lieu du libellé SPORT appliqué autrefois à tous les programmes. Les vignettes affichent toujours le visuel résolu et non cet ancien code graphique.

La cuisine explicitement annoncée dans le titre ou la discipline passe avant le portrait du créateur. Un stream de ZeratoR est identifié par le nom exact de l’organisateur ou le préfixe du titre ; sa photographie au ZEVENT 2025 remplace alors l’illustration générique. Source : https://commons.wikimedia.org/wiki/File:ZeratoR_lors_du_ZEVENT_2025_-_06.jpg, auteur Mickaël Schauli, CC BY-SA 4.0, 5 septembre 2025. Le crédit indique qu’il s’agit du portrait d’identité du créateur, pas d’une photo du stream annoncé.

Un autre créateur n’hérite pas de ce portrait. Un jeu coopératif en stream n’hérite pas d’une arène esport parce qu’il est un jeu vidéo. Sans visuel vérifié plus précis, le studio de créateur reste le recours neutre. Les visuels officiels d’événement restent prioritaires sur ces règles de recours.

## Ajout autonome

Depuis l’intégration de `scripts/collect-images.mjs`, la collecte planifiée recherche et attribue aussi des visuels sans intervention : sources officielles avec licence explicite attachée à l’image et Wikimedia Commons. Le registre automatique complète la bibliothèque manuelle dans les crédits. Les vérifications d’identité, édition, licence et téléchargement ainsi que les limites sont documentées dans `docs/automatic-images.md`. Les simples aperçus restent non publiés tant que leurs droits et leur contexte ne sont pas établis ; le recours générique reste disponible automatiquement.
