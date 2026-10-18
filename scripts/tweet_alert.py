#!/usr/bin/env python3
"""
tweet_alert.py — tweet d'alerte pour les evenements dont le coup d'envoi est sous 15 min.
Secrets requis: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET.
Active via variable GitHub X_ALERTS=true.
"""
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import time
import urllib.parse
import uuid
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
MATCHES = ROOT / "src" / "content" / "matches"
STATE = ROOT / "scripts" / ".tweets_sent.json"

KEYS = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"]
ICON = {"football": "⚽", "formule-1": "🏎️", "ufc": "🥊", "motogp": "🏍️", "tennis": "🎾",
        "rugby": "🏉", "cyclisme": "🚴", "sports-hiver": "⛷️", "combat": "🥊"}
TAGS = {"football": "#Football #ChampionsLeague", "formule-1": "#F1", "ufc": "#UFC #MMA",
        "motogp": "#MotoGP"}


def oauth1(method, url, params):
    ck, cs, tk, ts = [os.environ[k] for k in KEYS]
    oauth = {
        "oauth_consumer_key": ck, "oauth_nonce": uuid.uuid4().hex,
        "oauth_signature_method": "HMAC-SHA1", "oauth_timestamp": str(int(time.time())),
        "oauth_token": tk, "oauth_version": "1.0",
    }
    base = "&".join(f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(str(v), safe='')}"
                    for k, v in sorted({**oauth, **params}.items()))
    sig = hmac.new(f"{cs}&{ts}".encode(), f"{method}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(base, safe='')}".encode(), hashlib.sha1).digest()
    import base64
    oauth["oauth_signature"] = base64.b64encode(sig).decode()
    return "OAuth " + ", ".join(f'{k}="{urllib.parse.quote(str(v), safe="")}"' for k, v in sorted(oauth.items()))


def tweet(text: str) -> bool:
    url = "https://api.twitter.com/2/tweets"
    body = {"text": text}
    r = requests.post(url, json=body, timeout=15,
                      headers={"Authorization": oauth1("POST", url, {}), "Content-Type": "application/json"})
    print("  x:", r.status_code, r.text[:150])
    return r.status_code in (200, 201)


def parse(f: Path) -> dict | None:
    txt = f.read_text()
    fm = txt.split("---")[1] if txt.startswith("---") else ""
    def g(k):
        m = re.search(rf"^{k}:\s*(.+)$", fm, re.M)
        return m.group(1).strip().strip('"') if m else ""
    free = re.search(r"freeBroadcasters:\s*\n\s*- name:\s*\"([^\"]+)\"\s*\n\s*country:\s*\"([^\"]+)\"", fm)
    return {"title": g("title"), "sport": g("sport"), "date": g("eventDate"),
            "slug": f.stem, "chan": free.group(1) if free else "", "country": free.group(2) if free else ""}


def main() -> None:
    if not all(os.environ.get(k) for k in KEYS):
        print("secrets X_* absents — skip")
        return
    sent = set(json.loads(STATE.read_text()) if STATE.exists() else [])
    now = dt.datetime.now(dt.timezone.utc)
    n = 0
    for f in MATCHES.glob("*.mdx"):
        d = parse(f)
        if not d or not d["date"] or f.stem in sent:
            continue
        try:
            ev = dt.datetime.fromisoformat(d["date"])
        except ValueError:
            continue
        if ev.tzinfo is None:
            ev = ev.replace(tzinfo=dt.timezone.utc)
        if now <= ev <= now + dt.timedelta(minutes=15):
            msg = (f"{ICON.get(d['sport'], '🏆')} Coup d'envoi imminent : {d['title']} !\n"
                   f"📺 En direct et en clair sur {d['chan']} ({d['country']})\n"
                   f"👉 Débloquer le flux officiel : https://streamgen.fr/{d['sport']}/{d['slug']}/\n"
                   f"{TAGS.get(d['sport'], '#Sport')}")
            if tweet(msg):
                sent.add(f.stem)
                n += 1
    STATE.write_text(json.dumps(sorted(sent)))
    print(f"{n} tweet(s) envoyé(s).")


if __name__ == "__main__":
    main()
