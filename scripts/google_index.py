#!/usr/bin/env python3
"""Ping Google Indexing API pour les URLs récentes (matches/guides/news modifiés).
Requiert : GOOGLE_SA_JSON (JSON complet du compte de service).
Le compte doit être ajouté comme utilisateur dans Search Console.
Sans secret : exit 0 silencieux."""
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOST = "https://streamgen.fr"
SA_JSON = os.environ.get("GOOGLE_SA_JSON")


def access_token() -> str | None:
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request

        creds = service_account.Credentials.from_service_account_info(
            json.loads(SA_JSON),
            scopes=["https://www.googleapis.com/auth/indexing"],
        )
        creds.refresh(Request())
        return creds.token
    except Exception as e:
        print(f"token KO : {e}")
        return None


def recent_urls() -> list[str]:
    try:
        out = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1", "HEAD"],
            cwd=ROOT, capture_output=True, text=True, timeout=15,
        ).stdout
        urls = []
        for line in out.splitlines():
            m = re.match(r"src/content/(guides|news|matches)/(.+)\.mdx", line)
            if not m:
                continue
            kind, slug = m.group(1), m.group(2)
            if kind == "guides":
                urls.append(f"{HOST}/astuces/{slug}/")
            elif kind == "news":
                urls.append(f"{HOST}/actualites/{slug}/")
            else:
                # matches -> /{sport}/{slug}/  (sport lu dans le frontmatter)
                txt = (ROOT / line).read_text() if (ROOT / line).exists() else ""
                sm = re.search(r'^sport:\s*"?(\w[\w-]*)"?', txt, re.M)
                if sm:
                    urls.append(f"{HOST}/{sm.group(1)}/{slug}/")
        return urls
    except Exception:
        return []


def ping(url: str, tok: str) -> bool:
    req = urllib.request.Request(
        "https://indexing.googleapis.com/v3/urlNotifications:publish",
        data=json.dumps({"url": url, "type": "URL_UPDATED"}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {tok}"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        print(f"  ping KO {url} : {e}")
        return False


def main() -> int:
    if not SA_JSON:
        print("GOOGLE_SA_JSON absent : skip.")
        return 0
    tok = access_token()
    if not tok:
        return 0
    urls = recent_urls() or [HOST + "/"]
    ok = sum(ping(u, tok) for u in urls)
    print(f"Google Indexing : {ok}/{len(urls)} URLs notifiées")
    return 0


if __name__ == "__main__":
    sys.exit(main())
