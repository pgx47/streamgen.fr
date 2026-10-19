# StreamGen.fr — Documentation technique

Comparateur de retransmission sportive légale : capte les requêtes « où regarder X en streaming »
et oriente vers les chaînes publiques étrangères en clair (RTBF, RTS, ServusTV, BBC…) via VPN affilié.

## 1. Architecture globale

**Stack** : Astro 7 (SSG) · Tailwind CSS v4 (`@tailwindcss/vite`) · MDX · Zod · Wrangler → Cloudflare Pages.

**Zéro base de données** : tout le contenu vit dans `src/content/` (MDX + frontmatter YAML validé par Zod au build).
Les données statiques vivent dans `src/data/` (`broadcasters.json`, `vpn_deals.json`, `seasonal_sports.json`, `circuits_gps.json`).

```
src/
├── content/matches|guides|news/   # contenu MDX
├── components/                    # Scoreboard, FightCard, OddsWidget, ReplaySection…
├── layouts/                       # BaseLayout (nav+footer), MatchLayout, GuideLayout
└── pages/                         # hubs /{sport}/, /astuces/, /actualites/, piliers, /go/vpn
```

## 2. Modèle de données (`content.config.ts`)

### `matches` — fiches événements (`/{sport}/{slug}/`)
Champs clés : `sport` (football|formule-1|ufc|motogp|tennis|rugby|cyclisme|sports-hiver|combat),
`homeTeam`/`awayTeam` + logos, `fighter1`/`fighter2` {name, flag, record, ranking, photo},
`weightClass`, `titleFight`, `fightCard[]` (fight, category, isMainCard, f1/f2Flag, f1/f2Photo),
`schedule[]` (label+date — week-end F1), `homeLineup`/`awayLineup`, `odds` {home/draw/away, probs, favorite},
`eventDate`, `status` (upcoming|live|finished), `score`, `vpnServer`, `freeBroadcasters`/`paidBroadcasters`, `faq[]`.

### `guides` — `/astuces/{slug}/`
title, description, `category` (chaines-etrangeres|svod-cinema|economies|tutoriels-vpn),
dates, `vpnRequired`/`vpnCountry`, `steps[]` → HowTo JSON-LD, `faq[]` → FAQPage.

### `news` — `/actualites/{slug}/`
title, description, publishDate, sourceUrl/sourceName → Article JSON-LD.

## 3. Moteur d'automatisation (`scripts/fetch_fixtures.py`)

### Sources
- **ESPN** (`site.api.espn.com`, gratuit, sans clé) : UFC (mma/ufc), F1 (racing/f1), foot (uefa.champions, fra.1, uefa.europa, uefa.europa.conf). Fournit logos équipes, headshots (`athlete.headshot.href`), records, carte complète UFC.
- **TheSportsDB** (clé publique `123`, rate-limitée) : complément pour les ligues non couvertes par ESPN.
- **Garde-fou** : `strSport` vérifié contre le sport attendu (les IDs devinés renvoyaient du handball/NASCAR).

### Fallback IA (DeepSeek `deepseek-flash`)
- `enrich_llm()` : remplit le frontmatter manquant par sport (lineups, schedule, fighters, fightCard, odds) — JSON structuré, jamais d'invention.
- `generate_analysis()` : ~350 mots d'analyse éditoriale (enjeux/forme/historique) dans le corps MDX.
- `fetch_result()` : au passage `finished`, récupère vainqueur/méthode/score/podium.
- Sans clé → champs omis, site fonctionne quand même.

### Statuts (`--update-status`, cron quotidien)
`upcoming` → `live` le jour J → `finished` après +4h : bascule SEO « replay », `EventCompleted`, `ReplaySection` + badge « sans spoiler » si pas de score.

### Visuels
`get_fighter_photo()` : ESPN headshot → ufc.com/athlete/{slug} og:image → Wikipedia pageimages → silhouette SVG locale. Logos équipes via ESPN `team.logo` ou TheSportsDB `strTeamBadge`.

## 4. CI/CD (GitHub Actions)

| Workflow | Déclencheur | Rôle |
|---|---|---|
| `deploy.yml` | push main / `workflow_call` | node22 → build → wrangler deploy → IndexNow |
| `fixtures.yml` | quotidien 04h UTC | fixtures + statuts + Google Indexing → commit → deploy |
| `news.yml` | mer+sam 06h UTC | brèves droits TV (RSS+LLM) → commit → deploy |
| `guides.yml` | lun/mer/ven 07h UTC | guide auto (file auto-régénérée) → commit → deploy |
| `alerts.yml` | horaire + ven 16h | Telegram alertes H-1 + récap week-end |
| `tweets.yml` | 2×/h | tweets H-15min (inactif sans secrets X_*) |

**Secrets** : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `INDEXNOW_KEY`, `GOOGLE_SA_JSON`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `DEEPSEEK_API_KEY`.
Variables : `TELEGRAM_ALERTS=true`, `LLM_MODEL`, optionnel `X_ALERTS`, `PUBLIC_AMAZON_TAG`.

## 5. Monétisation

- **`/go/vpn`** : page Astro, redirection JS/meta côté client ; `?provider=cyberghost|nordvpn|surfshark`
  route vers l'offre correspondante, défaut = MyLead CyberGhost. `robots.txt` disallow `/go/`, liens `rel="nofollow sponsored noopener"`.
- **`vpn_deals.json`** : {name, price, discount, guarantee, recommended} — `recommended: true` = offre mise en avant partout.
- **`HardwareWidget`** : 3 produits Amazon (ASIN réels), images via `ws-eu.amazon-adsystem.com` AsinImage, tag `streamgenfr-21`.
- **`CoSubBanner`** : injecté auto sur les guides `economies` → renvoie vers guide co-abonnement.
- **`SavingsCalculator`** / **`OddsWidget`** / **`GeoBlockDetector`** : conversion contextuelle sur les fiches.

## Commandes

```bash
npm run dev / build        # build valide Zod + génère sitemap + pagefind
python scripts/fetch_fixtures.py [--dry-run|--update-status]
python scripts/fetch_news.py / generate_guide.py / telegram_alerts.py / telegram_weekly.py / google_index.py
```
