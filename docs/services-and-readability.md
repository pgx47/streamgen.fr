# Lisibilité et repères de diffusion

Filtres : textes 14–15 px, cases 19 px, lignes cliquables au moins 44 px, contrastes renforcés et focus clavier visible. Panneau 260 px sur grand écran, 230 px en format intermédiaire et grille de filtres mobile. Les cartes et fiches utilisent des tailles de lecture plus grandes ; les hauteurs des bannières restent adaptables au texte.

Les références structurées aux diffuseurs, plateformes et sources affichent une icône avec leur nom dans les filtres, cartes, bannières, aperçus, fiches statiques et registre des sources. Les favicons officiels disponibles sont stockés localement dans public/assets/services : Twitch, YouTube, CANAL+, france.tv, L’Équipe, NASA+, Formula 1, Capcom France et IJF. Les domaines non reconnus ont une icône de site, les chaînes non identifiées une icône TV. Ces icônes génériques ne sont pas présentées comme un logo officiel.

Aucun fournisseur d’icônes n’est appelé depuis le navigateur. Les icônes sont décoratives (alt vide/aria-hidden) car les noms restent visibles et accessibles. Ajouter un nouveau logo demande un asset local et une entrée dans serviceIcon ; un connecteur inconnu conserve automatiquement le repère générique.
