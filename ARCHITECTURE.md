# StreamGen.fr — Architecture

Comparateur de retransmission sportive légale : capte le trafic « où regarder X en streaming »
et renvoie vers les chaînes publiques étrangères en clair (RTBF, RTS, ServusTV…) via VPN affilié.

- **Domaine** : streamgen.fr
- **Stack** : Astro 7 (statique) + @astrojs/mdx + Tailwind CSS v4 + @astrojs/sitemap
- **Hébergement** : Cloudflare Pages (projet `streamgen`, déploiement Wrangler en CI)
- **Monétisation** : affiliation VPN (`src/data/vpn_deals.json`, override env `PUBLIC_VPN_AFFILIATE_URL`)

## Secrets GitHub (Settings → Secrets and variables → Actions)

| Secret | Rôle |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Deploy Pages (token avec permission *Cloudflare Pages: Edit* sur le compte) |
| `CLOUDFLARE_ACCOUNT_ID` | `d0573de28c843425f94eb430fc7a226a` |

Variables optionnelles (onglet *Variables*) : `PUBLIC_VPN_AFFILIATE_URL` (lien affilié principal),
`PUBLIC_GA_ID` (mesure d'audience), `THESPORTSDB_KEY`.

## Pile de déploiement

```
push sur main → deploy.yml : npm ci → astro build → wrangler pages deploy dist (~35 s)
cron mardi 05h UTC → fixtures.yml : fetch_fixtures.py (TheSportsDB) → commit MDX → deploy.yml (workflow_call)
```

## Contenu

- Fiches événements : `src/content/matches/*.mdx` (schéma Zod `src/content.config.ts`, rejeté au build si invalide)
- Routes : `/{sport}/{slug}/` via `src/pages/[sport]/[slug].astro` → `MatchLayout` (Scoreboard + BroadcasterTable + VpnTutorial + FAQ + StickyVpnBar)
- Matrice diffuseurs : `src/data/broadcasters.json` (clé = compétition, `free`/`paid`)
- Statuts : `upcoming` → `live` (jour J) → `finished` (+4 h, géré par `fetch_fixtures.py --update-status`)

## Commandes

```bash
npm run dev
npm run build
python3 scripts/fetch_fixtures.py [--dry-run|--update-status]
npx wrangler pages deploy dist --project-name=streamgen   # deploy manuel (OAuth local)
```

## Conformité

- Disclaimer anti-piratage sur chaque page + footer (`SITE.disclaimer` dans `src/site.config.ts`)
- Tous les liens sortants VPN/diffuseurs : `rel="nofollow sponsored noopener"`
- JSON-LD `SportsEvent` + `FAQPage` + `BreadcrumbList` via `SeoSchema.astro`
