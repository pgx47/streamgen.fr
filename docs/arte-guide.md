# Guide ARTE autonome

Collecte de huit jours glissants (aujourd’hui et sept jours suivants), toutes les quatre heures, depuis les pages officielles du guide TV ARTE. Le parseur lit les données JSON du document ; il n’exécute aucun code distant.

`availability.upcomingDate` est l’horaire annoncé d’antenne. `availability.start/end` sont des dates de disponibilité en replay et ne définissent pas le créneau TV. La durée VOD ne crée pas de fin d’antenne.

Les fiches portent `programType: scheduled-tv` et un badge Programme TV. Elles ne prétendent pas être des événements filmés en direct. Les émissions ordinaires sont exclues du carrousel, mais restent navigables dans l’agenda. Les concerts et événements culturels peuvent être découverts selon leur genre.

La clé stable comprend l’identifiant ARTE et le début de diffusion : une même fiche répétée dans le document n’est pas dupliquée ; deux diffusions réellement différentes gardent deux créneaux. Chaque fiche conserve la source de son horaire et la page du programme. `livestreamRights` indique les droits en ligne annoncés par le guide, sans inventer de pays autorisé ni de compte facultatif. Le lien de chaîne ouvre ARTE, jamais une copie de son flux.

Le recoupement est encore limité aux données structurées du diffuseur (guide et fiche programme). Cela n’équivaut pas à deux confirmations indépendantes. Les recoupements multi-organisateurs et la fusion intersources restent un chantier ouvert dans le plan de couverture.
