# Bibliothèque d’illustrations

Toutes les fiches reçoivent une illustration : priorité au thème reconnu, puis une image générique d’ambiance pour les thèmes inconnus. La sélection se fait localement dans eventVisual ; aucun appel à une banque d’images depuis le navigateur ni coût d’API n’est ajouté à la collecte.

Neuf photos de Wikimedia Commons complètent les quatre illustrations IA existantes : badminton, gymnastique, sports aquatiques, voile, judo, espace, cuisine, studio de créateur, ambiance générique. Les fichiers sont hébergés localement en WebP. Les images déjà générées gardent leur nature IA, sans être présentées comme des photos libres.

IMAGE_LIBRARY dans public/event-utils.mjs est le registre de référence : fichier, titre, auteur, licence et lien de licence, page source Commons, nature et modifications apportées. Le build publie /credits-images/ et /image-credits.json. Chaque carte et fiche renvoie vers son crédit. Les licences CC BY-SA restent appliquées aux adaptations des photos concernées ; cela ne place pas le site entier sous cette licence.

Les métadonnées ont été lues via l’API officielle Commons (imageinfo/extmetadata), puis chaque visuel a été contrôlé. Les sources exactes sont dans le registre. La conversion WebP/redimensionnement et le recadrage d’affichage sont signalés. Les crédits distinguent les photos CC BY/CC BY-SA, CC0, domaine public et images générées.

Une image illustre une discipline ou une ambiance ; elle n’annonce pas qu’une personne photographiée participe à l’événement. Ne pas utiliser les visuels comme preuve de participants, de lieu exact ou de diffusion.

Pour ajouter une discipline : choisir un fichier réutilisable, vérifier sa page et sa licence, stocker localement l’image, compléter son entrée de registre avec l’attribution, puis ajouter sa règle de correspondance. En attendant, le fallback conserve une illustration et son crédit. Les erreurs de chargement des cartes utilisent ce même fallback avec un crédit adapté.
