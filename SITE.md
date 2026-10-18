# StreamGen.fr — Documentation complète

**Concept** : comparateur de retransmission sportive légale. Le site capte le trafic
ultra-intentionniste (« psg real streaming gratuit », « gp f1 direct ») et propose
l'alternative 100 % légale : les chaînes publiques étrangères en clair (RTBF, RTS,
ServusTV…) accessibles via VPN. **Monétisation** : affiliation VPN (MyLead) via
le lien tracké `/go/vpn`.

| | |
|---|---|
| Production | https://streamgen.fr (+ www) |
| Fallback | https://streamgen.pages.dev |
| Repo | `github.com/pgx47/streamgen.fr` (privé, `main` = prod) |
| Hébergement | Cloudflare Pages, projet `streamgen` |
| Compte CF | `d0573de28c843425f94eb430fc7a226a` |

---

## 1. Stack

- **Astro 7** (SSG pur, `build.format: 'directory'`, `trailingSlash: 'ignore'`)
- **Tailwind CSS 4** via `@tailwindcss/vite` + `@fontsource-variable/inter`
- **@astrojs/mdx** (fiches matchs) + **@astrojs/sitemap**
- **Wrangler 4** pour le déploiement Pages
- Validation frontmatter **Zod** (`src/content.config.ts`) — le build échoue si une fiche est invalide

## 2. Arborescence

```text
streamgen.fr/
├── .github/workflows/
│   ├── deploy.yml            # push main → npm ci → astro build → wrangler pages deploy (~30 s)
│   └── fixtures.yml          # cron mardi 05h UTC : fetch_fixtures.py → commit MDX → deploy.yml
├── scripts/
│   ├── fetch_fixtures.py     # TheSportsDB → fiches MDX (backoff 429, filtre essais)
│   └── requirements.txt      # requests
├── src/
│   ├── site.config.ts        # SITE (nom, url, disclaimer, analytics) + SPORTS
│   ├── content.config.ts     # schéma Zod collection `matches`
│   ├── content/matches/      # fiches événements .mdx
│   ├── data/
│   │   ├── broadcasters.json # matrice diffuseurs free/paid par compétition
│   │   └── vpn_deals.json    # offres NordVPN/CyberGhost/Surfshark
│   ├── components/
│   │   ├── Scoreboard.astro       # en-tête match : logos, VS, compte à rebours JS
│   │   ├── BroadcasterTable.astro # comparatif payant (rose) vs en clair (émeraude)
│   │   ├── VpnTutorial.astro      # tunnel conversion : 3 étapes numérotées + CTA
│   │   ├── StickyVpnBar.astro     # barre fixe bas d'écran (mobile+desktop, fermable)
│   │   ├── EventCard.astro        # carte événement (hubs + home)
│   │   ├── HubPage.astro          # template de hub sport (grille upcoming/finished)
│   │   └── SeoSchema.astro        # JSON-LD SportsEvent + FAQPage + BreadcrumbList
│   ├── layouts/
│   │   ├── BaseLayout.astro       # header logo, nav, footer 4 col, disclaimer, GA optionnel
│   │   └── MatchLayout.astro      # page match : scoreboard→table→tuto→MDX→FAQ→sticky
│   ├── pages/
│   │   ├── index.astro            # hero + prochains événements + hubs + tuto VPN
│   │   ├── tutoriel-vpn.astro     # guide légal + comparatif 3 VPN
│   │   ├── a-propos.astro         # réassurance éditoriale
│   │   ├── mentions-legales.astro # éditeur, hébergeur, anti-piratage, affiliation
│   │   ├── football|formule-1|ufc|motogp/index.astro   # hubs (wrapper HubPage)
│   │   └── [sport]/[slug].astro   # route dynamique des fiches matchs
│   └── styles/global.css          # theme Tailwind 4 + classes .prose-sport
├── public/
│   ├── logo.png (600×143) / favicon.png (256) / og-image.png (1200×630)
│   ├── _redirects          # /go/vpn → lien MyLead (302)
│   └── robots.txt          # + sitemap
├── astro.config.mjs        # site: streamgen.fr, mdx+sitemap+tailwind
└── ARCHITECTURE.md         # résumé technique
```

## 3. Inventaire des URLs

| URL | Source | Note |
|---|---|---|
| `/` | `index.astro` | Hero + 9 prochains events + tutoriel |
| `/football/` `/formule-1/` `/ufc/` `/motogp/` | `HubPage.astro` | Grilles upcoming + résultats |
| `/{sport}/{slug}/` | `[sport]/[slug].astro` | Une page par `.mdx` |
| `/tutoriel-vpn/` | statique | Guide + comparatif VPN |
| `/a-propos/` `/mentions-legales/` | statique | Réassurance / conformité |
| `/go/vpn` | `_redirects` | 302 → `lowest-prices.eu/a/3143zh2LR6iO79g` |
| `/sitemap-index.xml` `/robots.txt` `/favicon.png` `/og-image.png` | auto/public | SEO |

## 4. Fiches événements (schéma `matches`)

Frontmatter Zod obligatoire (`src/content.config.ts`) :

```yaml
title, description, sport: football|formule-1|ufc|motogp,
competition, homeTeam?, awayTeam?, venue?,
eventDate (ISO), status: upcoming|live|finished, score?,
vpnServer (pays, défaut Belgique),
freeBroadcasters[]: name,country,lang,url,note?   # min 1
paidBroadcasters[]: name,price,url?,note?
faq[]: q,a                                       # → JSON-LD FAQPage
seoTitle?  # sinon généré : « {title} : Sur quelle chaîne regarder… »
```

Corps MDX = texte éditorial (`.prose-sport`).

## 5. Monétisation & tracking

- **Lien affilié** : `/go/vpn` → 302 vers MyLead (`public/_redirects`).
  Tous les CTA utilisent `/go/vpn` sauf si `PUBLIC_VPN_AFFILIATE_URL` est défini (override env).
- Liens sortants : `rel="nofollow sponsored noopener"`, `target="_blank"`.
- Offres affichées : `src/data/vpn_deals.json` (name, discount, price, guarantee, args).
- Footer : mention « certains liens sont des liens affiliés » + disclaimer.

## 6. SEO & conformité

- Titres fiches : « {Événement} : Sur quelle chaîne regarder en streaming direct et en clair ? »
- JSON-LD auto : `SportsEvent`, `FAQPage`, `BreadcrumbList` (`SeoSchema.astro`)
- Sitemap auto (`@astrojs/sitemap`), canonical, OG/Twitter, og-image 1200×630
- Vérification MyLead : meta + commentaire HTML dans `BaseLayout`
- Disclaimer anti-piratage (`SITE.disclaimer`) : footer + bas de chaque page événement
- `mentions-legales` : éditeur, hébergeur, affiliation, RGPD

## 7. CI/CD

```
push main → deploy.yml : node22 + npm ci + astro build + wrangler pages deploy dist
cron mar 05h UTC → fixtures.yml : fetch_fixtures.py + --update-status → commit → deploy (workflow_call)
```

Secrets configurés : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
Variables optionnelles : `THESPORTSDB_KEY` (défaut `123`, clé publique rate-limitée),
`PUBLIC_VPN_AFFILIATE_URL`, `PUBLIC_GA_ID`.

## 8. Pipeline fixtures

`fetch_fixtures.py` :
- Ligues TheSportsDB : LDC 4480, Ligue 1 4334, F1 4370, MotoGP 4407, UFC 4443
- Filtre : skip practice/FP/warm-up ; retry ×4 sur 429 (backoff)
- Écrit `src/content/matches/{slug}-{date}.mdx` avec matrice `broadcasters.json`
- `--update-status` : `upcoming` → `live` (jour J) → `finished` (+4 h)
- `--dry-run` : prévisualisation

## 9. Commandes

```bash
npm run dev                                    # dev local
npm run build                                  # build → dist/ (valide Zod)
python3 scripts/fetch_fixtures.py [--dry-run|--update-status]   # venv .venv/
npx wrangler pages deploy dist --project-name=streamgen         # deploy manuel
```

## 10. Design

« Dark Stadium » : fond slate-950/900, cartes slate-900/90 bordures slate-800,
CTA `from-cyan-500 to-blue-600`, badge en-clair émeraude, badge payant rose,
titres `font-black` Inter.
