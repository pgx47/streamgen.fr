# Collecte autonome StreamGen

GitHub Actions lance `collect.yml` toutes les quatre heures (minute 17, UTC), et manuellement. Les résultats validés sont commités puis déployés sur Cloudflare Pages. Une source en panne conserve les dernières fiches ; une panne WTT ne bloque pas NASA+/Eurovision. Si les deux nouveaux programmes échouent, le job échoue et ne déploie pas.

## Sources
- WTT Montpellier : découverte des journées et mise à jour des sessions des fiches existantes. Une nouvelle édition reste candidate tant que sa diffusion n’est pas vérifiée.
- Eurovision Sport : données VideoObject/BroadcastEvent publiées par le diffuseur, dates absolues et liens de programme. Publication automatique des diffusions dans les 120 prochains jours, doublons exclus.
- NASA+ : programmes officiels, timestamps Unix (changement d’heure pris en compte), lien vers le lecteur officiel. Aucune durée déduite des placeholders du site.
- Autres sources officielles du registre et ESA Web TV : accessibilité et changement de texte, rapport uniquement. Une page accessible ne revalide ni droits ni dates.

## IA et coût
Le secret GitHub `DEEPSEEK_API_KEY` reste côté Actions. `LLM_MODEL` sélectionne le modèle (par défaut deepseek-flash). Un appel maximum par jour UTC, pas de retry payant ; huit nouveaux titres maximum, réponse plafonnée à 1200 tokens, sans mode raisonnement. Cache versionné dans `data/collection-cache.json`. L’appel n’est pas gratuit ; la borne porte sur le nombre d’appels/tokens, pas une garantie tarifaire. Si la clé, le crédit ou l’API manque, publication avec les titres source. Aucune API X payante.

L’IA traduit uniquement : dates, URLs, participants et conditions viennent du parseur déterministe. Aucun événement n’est inventé par un LLM. Les descriptions restent factuelles. Les images du diffuseur ne sont pas recopiées sans droits.

## Surveillance
`/collection-status.json` expose chaque succès/erreur et les changements ; les artefacts Actions gardent le détail 14 jours. Les erreurs 403 ne sont pas contournées. GitHub notifie les échecs selon les préférences du propriétaire. Aucun Telegram ni message externe envoyé.

Les programmes de streamers et réseaux sociaux ne sont pas encore collectés automatiquement. Les sources non structurées, territoires, annulations et disponibilité réelle du flux requièrent d’autres connecteurs. Les fiches ne sont jamais déclarées « en direct » sur le seul horaire.
