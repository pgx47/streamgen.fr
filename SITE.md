# StreamGen.fr — Documentation complète

Comparateur de retransmission sportive légale : capte le trafic « où regarder X en streaming »
et renvoie vers les chaînes publiques étrangères en clair (RTBF, RTS, ServusTV, BBC…)
via un VPN affilié (MyLead → CyberGhost).

| | |
|---|---|
| Production | https://streamgen.fr (+ www) |
| Repo | `github.com/pgx47/streamgen.fr` (privé, `main` = prod) |
| Pages | ~56 URLs buildées |
| Hébergement | Cloudflare Pages, projet `streamgen` (compte `d0573de2…`) |
| Canal alertes | Telegram `@streamgenfr` (bot `@Streamgenfr_bot`) |

## 1. Stack

- **Astro 7** SSG — `build.format: directory`, `trailingSlash: ignore`, `site: https://streamgen.fr`
- **Tailwind 4** (`@tailwindcss/vite`) + Inter Variable
- **@astrojs/mdx** (matches, guides, news) + **@astrojs/sitemap** (filtre `/go/`, `/404`)
- **Wrangler 4** — deploy Pages
- Validation **Zod** de tout le frontmatter (`src/content.config.ts`) — build KO si invalide

## 2. Arborescence

```text
streamgen.fr/
├── .github/workflows/
│   ├── deploy.yml      # push main → node22 → astro build → wrangler deploy → ping IndexNow
│   ├── fixtures.yml    # cron quotidien 04h UTC → fetch_fixtures → commit → deploy
│   ├── news.yml        # cron mer+sam 06h UTC → fetch_news → commit → deploy
│   ├── alerts.yml      # cron horaire → telegram_alerts (si var TELEGRAM_ALERTS=true)
│   └── tweets.yml      # cron 2×/h → tweet_alert (si var X_ALERTS=true)
├── scripts/
│   ├── fetch_fixtures.py   # TheSportsDB + ESPN → fiches MDX (logos, posters, fight cards, schedule)
│   ├── fetch_news.py       # RSS Google News droits TV → brèves DeepSeek
│   ├── telegram_alerts.py  # alerte H-1 canal Telegram
│   ├── tweet_alert.py      # tweet H-15min (OAuth1)
│   ├── ping_indexnow.sh    # ping Bing/IndexNow avec le sitemap
│   └── .alerts_sent.json / .tweets_sent.json / .news_seen.json  # états
├── src/
│   ├── site.config.ts        # SITE + SPORTS (8 sports)
│   ├── content.config.ts     # 3 collections Zod : matches / guides / news
│   ├── content/matches|guides|news/
│   ├── data/broadcasters.json    # matrice free/paid par compétition (15 clés)
│   ├── data/vpn_deals.json       # CyberGhost (reco), NordVPN, Surfshark
│   ├── components/  Scoreboard (chrono JS, logos, poster, duel fighters, live badge)
│   │   BroadcasterTable (logos chaînes) · VpnTutorial (3 étapes + onglets appareils)
│   │   StickyVpnBar · SeoSchema (SportsEvent/HowTo/Article/FAQ/Breadcrumb)
│   │   EventCard (favicons chaînes) · HubPage · PillarPage · GuideLayout
│   │   GeoBlockDetector (ipwho.is) · SavingsCalculator · CalendarButton (.ics/GCal)
│   │   RadioPlayer (RMC/France Bleu si pas de diffuseur FR) · Lineup
│   │   VpnComparisonTable (3 VPN, provider=) · StepByStep · VpnCallout
│   ├── layouts/  BaseLayout (nav burger xl, trust, footer 5 liens légaux)
│   │   MatchLayout · GuideLayout
│   └── pages/  index · /programme-tv-sport · /astuces (hub+13) · /actualites
│       /tutoriel-vpn · /streaming-legal · /a-propos · 5 pages légales
│       hubs ×9 sports · piliers ×4 (/…/streaming-gratuit) · /go/vpn · [sport]/[slug]
└── public/  logo.png · favicon.png · og-image.png · images/broadcasters/*.png · _redirects retiré
```

## 3. Collections

### `matches` (`/{sport}/{slug}/`)
title, description, sport (football|formule-1|ufc|motogp|tennis|rugby|cyclisme|sports-hiver|combat),
competition, homeTeam/awayTeam + logos, fighter1/fighter2 (name, flag, record, photo, ranking),
weightClass, titleFight, fightCard[], schedule[] (week-end GP), homeLineup/awayLineup,
venue, eventDate, status (upcoming→live→finished), score, vpnServer,
freeBroadcasters[]/paidBroadcasters[], faq[] → page = scoreboard + tableau diffuseurs +
tuto VPN + comparatif VPN + simulateur + calendrier + FAQ.

### `guides` (`/astuces/{slug}/`)
title, description, category (chaines-etrangeres|svod-cinema|economies|tutoriels-vpn),
dates, vpnRequired/vpnCountry, steps[] → JSON-LD HowTo, faq[] → FAQPage.

### `news` (`/actualites/{slug}/`)
title, description, publishDate, sourceUrl/sourceName, tags → JSON-LD Article.

## 4. Piliers SEO permanents (URL fixe, contenu dynamique)

- `/formule-1/streaming-gratuit/` · `/football/ligue-des-champions-streaming-gratuit/`
- `/ufc/streaming-gratuit-direct/` · `/motogp/streaming-gratuit/`
- `/programme-tv-sport/` : programme du jour + 7 jours, filtre « en clair »
- `/streaming-legal/` : les 5 règles (E-E-A-T)

## 5. Conversion & affiliation

- **`/go/vpn`** : page redirect client-side ; `?provider=cyberghost|nordvpn|surfshark` route
  vers l'offre correspondante, défaut = MyLead CyberGhost.
- CTA présents : hero → ancre programme, fiches (tableau+comparatif), sticky bar,
  VpnCallout guides, simulator « économiser ~924 €/an ».
- Tous liens sortants : `rel="nofollow sponsored noopener"`.
- **Robots** : `Disallow: /go/` — jamais crawlé.

## 6. Automatisation

| Workflow | Cron | Action |
|---|---|---|
| `fixtures.yml` | quotidien 04h UTC | TheSportsDB ×12 ligues + ESPN (UFC/F1) → MDX + statuts |
| `news.yml` | mer+sam 06h | breves droits TV via DeepSeek |
| `alerts.yml` | horaire | Telegram H-1 (fenêtre 55–115 min) |
| `tweets.yml` | 2×/h | tweet H-15min (inactif sans secrets X_*) |
| `deploy.yml` | push/call | build + deploy + IndexNow |

Statuts auto : `upcoming` → `live` (jour J) → `finished` (+4 h, bascule SEO « replay »).

## 7. Secrets GitHub (posés)

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `INDEXNOW_KEY`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `DEEPSEEK_API_KEY`
Variables : `TELEGRAM_ALERTS=true`, `LLM_MODEL=deepseek-flash`.
À poser si besoin : `X_API_KEY/SECRET`, `X_ACCESS_TOKEN/SECRET` + `X_ALERTS`,
`THESPORTSDB_KEY` (clé Patreon), `PUBLIC_GA_ID`, `PUBLIC_VPN_AFFILIATE_URL`.

## 8. Conformité

Disclaimer anti-piratage footer + chaque page ; pages légales complètes
(mentions, confidentialité, avertissement, affiliation, contact) ;
`/go/` noindex + disallow ; liens sponsorisés marqués ; JSON-LD sur tout.
