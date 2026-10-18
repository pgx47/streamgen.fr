# StreamGen.fr — Architecture (résumé ops)

Comparateur de retransmission sportive légale. Voir `SITE.md` pour la doc complète.

- Astro 7 statique + Tailwind 4 + MDX + sitemap — `npm run build` → `dist/`
- Cloudflare Pages `streamgen` → streamgen.fr ; deploy CI via Wrangler (~30 s)
- Données : `src/data/broadcasters.json`, `vpn_deals.json` ; contenu : `src/content/{matches,guides,news}`
- Générateurs : `scripts/fetch_fixtures.py` (quotidien, TheSportsDB+ESPN+DeepSeek),
  `fetch_news.py` (mer/sam), `telegram_alerts.py` (horaire), `tweet_alert.py` (2×/h)
- Repo privé `pgx47/streamgen.fr`, `main` = prod. Secrets CI : voir §7 de SITE.md.
- Règles : jamais de `[skip ci]` sur deploy ; `/go/vpn` = lien affilié (noindex+disallow) ;
  liens sortants `rel="nofollow sponsored noopener"` ; Zod strict au build.
