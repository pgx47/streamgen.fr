#!/usr/bin/env bash
# Ping IndexNow (Bing/Yandex) avec toutes les URLs du sitemap genere.
set -euo pipefail
KEY="${INDEXNOW_KEY:?INDEXNOW_KEY manquant}"
URLS=$(grep -oE 'https://streamgen\.fr[^<]+' dist/sitemap-0.xml | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin]))')
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"streamgen.fr\",\"key\":\"$KEY\",\"keyLocation\":\"https://streamgen.fr/$KEY.txt\",\"urlList\":$URLS}"
echo
