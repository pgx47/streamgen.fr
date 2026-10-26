# StreamGen — documentation globale

Radar éditorial des **directs officiels** : sport, esport, streams de créateurs,
concerts en livestream, lancements spatiaux et conférences publiques.
Site statique 100 % français, sans backend, sans compte, sans affiliation.

- Prod : https://streamgen.fr (Cloudflare Pages, projet `streamgen`)
- Repo : github.com/pgx47/streamgen.fr (privé, `main` = prod)
- Historique : l'ancien comparateur VPN/Astro vit dans l'historique Git,
  avant le commit `f2c1159` (remplacement complet).

## 1. Stack

**Zéro dépendance npm.** HTML + CSS + JS vanilla.

| Couche | Détail |
|---|---|
| Données | `public/events.json` (catalogue), `public/sources.json` (registre), caches dans `data/` |
| Front | `public/index.html` + `app.js` (agenda, filtres, favoris, modal) + `detail-page.mjs` (fiches) + `event-utils.mjs` (logique partagée) |
| Build | `scripts/build.mjs` → génère `dist/` complet (pages fiches, index, sitemap, robots, 404) |
| Collecte | `scripts/collect-*.mjs` (Node 22+, fetch natif) lancés par GitHub Actions |
| Images | `scripts/collect-images.mjs` + `public/assets/` (locales, créditées) |
| Tests | `node --test tests/*.test.mjs` (64 tests) |

Le navigateur ne sert jamais `public/` directement : les pages SEO sont
générées au build. `dist/` = artefact déployé.

## 2. Modèle de données (`events.json`)

Chaque événement : `id`, `slug`, `title`, `summary`, `category`
(`sport|esport|créateurs|autres`), `subcategory`, `date` (jour FR),
`start`/`end` (ISO avec fuseau, `null` si inconnu — jamais inventé),
`sourceTimezone`, `participants[]`, `frenchPresence` + `frenchNote`,
`organizer`, `schedule[]` (sessions d'une journée), `status`,
`confirmation`, `lastVerified`, `scheduleVerifiedAt`, `notes[]`,
`programType` (`livestream|sports-broadcast`), `sourceImage`,
`programmeUrl`, `evidence`, `corroboration`, `collectionAliases`,
`cancellation`, `postponement`, `major`, `featured`, `discovery`.

`broadcastOptions[]` : `{platform, label, url, access: free|subscription|unknown,
accountRequired: true|false|null, language, countries, territoryNote,
restrictions, confirmed, linkKind: information|channel}`.
Une inconnue reste affichée — jamais supposée gratuite ni sans compte.

`sources[]` : `{label, url, sourceId, collectedAt}` — chaque fiche cite
ses sources avec date de consultation réelle.

## 3. Règles éditoriales (non négociables)

- **Que du direct.** Pas d'émissions, documentaires ou replays programmés
  (l'ancien collecteur de grille TV ARTE a été supprimé — 191 fiches purgées).
- Aucun horaire, durée, résultat ou participant n'est déduit ou inventé.
- Un horaire dépassé affiche « Début prévu », jamais « En direct confirmé ».
- Pas de faux liens : les liens ouvrent la page officielle du diffuseur.
- `lastVerified`/`checkedAt` ne se modifient que sur consultation réelle.
- Fiches > 48 h : signalées « à revérifier ». Agenda vide assumé.
- Aucun flux hébergé, aucune affiliation, aucun score d'audience.
- Les streams habituels de créateurs sont exclus de la une (sauf events
  spéciaux : salon, ZEvent, GP Explorer, showmatch…).

## 4. Collecteurs (`scripts/`)

Lancés par `.github/workflows/collect.yml` toutes les 4 h (minute 17 UTC).

| Script | Source | Ce qu'il collecte |
|---|---|---|
| `collect.mjs` | tickets.wttmontpellier.com | Journées WTT Montpellier, sessions vérifiées |
| `collect-feeds.mjs` | Eurovision Sport, NASA+, calendriers Twitch (13 chaînes : ZeratoR, MisterMV, Gotaga…) | Programmes datés ; traduction DeepSeek possible (budget 1 appel/jour, cache `data/`) ; surveille aussi les autres sources pour erreurs d'accès |
| `collect-riot.mjs` | lolesports.com | Matchs VALORANT/LoL structurés, identité stable |
| `collect-redbull.mjs` | redbull.tv | `liveStreams` datés seulement, 16 profils/passage |
| `collect-discoveries.mjs` | live.cern API + arte.tv/arte-concert/agenda | Confs CERN publiques + concerts `LIVESTREAM_WEB` uniquement |
| `collect-space.mjs` | spacex.com + Launch Library 2 | Fenêtres de lancement, recoupement indépendant |
| `collect-france-sport.mjs` | france.tv/sport | « Nos directs à venir », semaine datée |
| `collect-youtube.mjs` | Chaînes YouTube officielles (FFF, FFBB, FIBA, Roland-Garros, Olympics, ESA, NASA, Collège de France) | Page `/streams` → seuls les livestreams programmés (`liveBroadcastDetails` ISO, durée nulle) ; premières, replays et flux permanents exclus |
| `collect-liquipedia.mjs` | Liquipedia (CS2, Dota 2, Rocket League) | `Liquipedia:Matches` (timestamp, équipes, BoX) + pages tournoi → chaînes Twitch/Kick/YouTube officielles ; ~2 s/requête |
| `collect-startgg.mjs` | start.gg API GraphQL (`STARTGG_API_KEY`) | Tournois esport FR à venir + chaînes Twitch/YouTube déclarées par l'organisateur |
| `collect-images.mjs` | sources officielles + Wikimedia Commons | Visuels licenciés, crédits, rejet NC/ND/incohérences |

Logique partagée dans `scripts/collectors/` : `feeds.mjs` (toEvent),
`programme-identity.mjs` (fusion fiche TV↔livestream, retrait des directs
disparus), `core.mjs`, `structured.mjs`, `images.mjs`.

Garde-fous : identités stables (pas de doublons au report), collecte
partielle = autres fiches préservées, panne = job en échec + catalogue
conservé, annulations explicites marquées `Annulé`, disparus →
`Programmation à revérifier` (perd ses broadcastOptions).

## 5. Build & site généré

`npm run build` (`scripts/build.mjs`, 62 lignes) :

1. Valide les données (slugs uniques, sources connues, URLs https,
   visuels automatiques autorisés).
2. Copie `public/` → `dist/`, hashe les assets (`?v=…` pour le cache).
3. Génère : `/evenements/<slug>/` (une page par fiche, contenu dans le
   HTML initial), `/evenements/`, `/sources/` (méthode + registre),
   `/credits-images/`, `sitemap.xml`, `robots.txt`, `404.html`,
   `image-credits.json`, et injecte la liste des fiches dans `index.html`.
4. JSON-LD `Article` + `BreadcrumbList` par fiche ; canonique
   `https://streamgen.fr`.

Front : `app.js` = agenda filtrable (jour, plateforme, gratuit,
sans compte, présence FR), favoris locaux, export .ics, bannière
« À ne pas manquer » recalculée chaque minute (priorité éditoriale
automatique : envergure, enjeu, proximité — jamais l'audience).
`detail-page.mjs` = favori/calendrier/copie sur les fiches.

## 6. CI/CD (`.github/workflows/`)

- **`collect.yml`** — cron 4 h : cache budget DeepSeek → collect-feeds →
  riot → redbull → discoveries → space → france-sport → images →
  `npm run build` → commit (`streamgen-bot`) → appelle `deploy.yml`.
  Artefacts `work/*-run.json` conservés 14 j.
- **`deploy.yml`** — push main / appel : check → tests → build →
  `wrangler pages deploy dist --project-name=streamgen` →
  `check-production.mjs` (version + nb de fiches en prod).

Secrets : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`DEEPSEEK_API_KEY` (optionnel). Var : `LLM_MODEL`.
Les commits du bot ne redéclenchent pas les workflows push : le deploy
est appelé explicitement (`workflow_call`).

## 7. Commandes

```bash
npm run dev       # build + http://localhost:4173 (python3 requis)
npm run build     # valide + génère dist/
npm run check     # syntaxe des JS publics
npm test          # 64 tests : dates, statuts, filtres, identité, collectors
node scripts/collect-<x>.mjs   # collecte locale d'une source
```

## 8. Arborescence

```
public/
  index.html app.js detail-page.mjs event-utils.mjs style.css wow.css
  events.json sources.json               # catalogue + registre
  collection-status.json                 # dernier rapport de collecte
  automatic-images.json image-collection-status.json
  assets/                                # visuels locaux crédités
scripts/
  build.mjs check-production.mjs
  collect.mjs collect-feeds.mjs collect-riot.mjs collect-redbull.mjs
  collect-discoveries.mjs collect-space.mjs collect-france-sport.mjs
  collect-images.mjs
  collectors/                            # parsers + logique partagée
data/                                    # caches collection/images
tests/*.test.mjs
docs/                                    # collection, ranking, images…
```
