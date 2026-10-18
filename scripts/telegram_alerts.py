#!/usr/bin/env python3
"""
telegram_alerts.py — alerte Telegram 1h avant chaque evenement majeur.
Parse les fiches src/content/matches/*.mdx et envoie un message au canal
pour tout evenement demarrant dans la fenetre [+50min, +75min].

Secrets requis: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (canal public @streamgen ou id).
Usage: python scripts/telegram_alerts.py
"""
import datetime as dt
import os
import re
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
MATCHES = ROOT / "src" / "content" / "matches"
STATE = ROOT / "scripts" / ".alerts_sent.json"

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT = os.environ.get("TELEGRAM_CHAT_ID")

ICONS = {"football": "⚽", "formule-1": "🏎️", "ufc": "🥊", "motogp": "🏍️",
         "tennis": "🎾", "rugby": "🏉", "cyclisme": "🚴", "sports-hiver": "⛷️", "combat": "🥊"}


def parse_mdx(path: Path) -> dict | None:
    txt = path.read_text()
    fm = txt.split("---")[1] if txt.startswith("---") and txt.count("---") >= 2 else ""
    def g(k):
        m = re.search(rf"^{k}:\s*(.+)$", fm, re.M)
        return m.group(1).strip().strip('"') if m else ""
    free = re.search(r"freeBroadcasters:\s*\n\s*- name:\s*\"([^\"]+)\"", fm)
    return {
        "title": g("title"), "sport": g("sport"), "slug": path.stem,
        "date": g("eventDate"), "vpn": g("vpnServer") or "Belgique",
        "channel": free.group(1) if free else "la chaîne en clair",
        "competition": g("competition"),
    }


def send(d: dict) -> bool:
    url = f"https://streamgen.fr/{d['sport']}/{d['slug']}/"
    msg = (
        f"{ICONS.get(d['sport'], '🏆')} <b>{d['title']}</b> — {d['competition']}\n"
        f"📺 En clair et gratuit : <b>{d['channel']}</b>\n"
        f"🔓 Déblocage : VPN sur serveur « {d['vpn']} »\n"
        f"👉 Guide et accès direct : {url}"
    )
    r = requests.post(
        f"https://api.telegram.org/bot{TOKEN}/sendMessage",
        json={"chat_id": CHAT, "text": msg, "parse_mode": "HTML", "disable_web_page_preview": False},
        timeout=15,
    )
    if not r.ok:
        print(f"  ! telegram: {r.status_code} {r.text[:200]}")
    return r.ok


def main() -> None:
    if not TOKEN or not CHAT:
        print("TELEGRAM_BOT_TOKEN/CHAT_ID absents — skip")
        return
    import json
    sent = set(json.loads(STATE.read_text()) if STATE.exists() else [])
    now = dt.datetime.now(dt.timezone.utc)
    lo, hi = now + dt.timedelta(minutes=50), now + dt.timedelta(minutes=75)
    n = 0
    for f in MATCHES.glob("*.mdx"):
        d = parse_mdx(f)
        if not d or not d["date"] or f.stem in sent:
            continue
        try:
            ev = dt.datetime.fromisoformat(d["date"])
        except ValueError:
            continue
        if ev.tzinfo is None:
            ev = ev.replace(tzinfo=dt.timezone.utc)
        if lo <= ev <= hi and send(d):
            sent.add(f.stem)
            n += 1
            print(f"  + alerte: {d['title']}")
    STATE.write_text(json.dumps(sorted(sent)))
    print(f"{n} alerte(s) envoyée(s).")


if __name__ == "__main__":
    main()
