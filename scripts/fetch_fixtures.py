#!/usr/bin/env python3
"""
fetch_fixtures.py — recupere les prochains evenements sportifs (TheSportsDB, cle publique gratuite)
et genere des fiches .mdx dans src/content/matches/.

Usage:
  python scripts/fetch_fixtures.py            # fetch + ecrit les MDX manquants
  python scripts/fetch_fixtures.py --dry-run  # affiche sans ecrire
  python scripts/fetch_fixtures.py --update-status  # passe en live/finished selon la date

Env optionnel: THESPORTSDB_KEY (defaut: "3", cle publique v1).
"""
import argparse
import datetime as dt
import json
import os
import re
import unicodedata
from pathlib import Path

import time

import requests

ROOT = Path(__file__).resolve().parent.parent
MATCHES_DIR = ROOT / "src" / "content" / "matches"
BROADCASTERS = json.loads((ROOT / "src" / "data" / "broadcasters.json").read_text())

API_KEY = os.environ.get("THESPORTSDB_KEY", "123")
BASE = f"https://www.thesportsdb.com/api/v1/json/{API_KEY}"

# Ligues TheSportsDB -> (sport, competition, matrice broadcasters.json, serveur VPN)
# IDs a verifier : un ID invalide renvoie simplement 0 evenement.
LEAGUES = {
    "4480": ("football", "Ligue des Champions", "ligue-des-champions", "Belgique"),
    "4334": ("football", "Ligue 1", "ligue-1", "Belgique"),
    "4481": ("football", "Ligue Europa", "europa-league", "Autriche"),
    "4896": ("football", "Ligue Europa Conference", "conference-league", "Autriche"),
    "4370": ("formule-1", "Formule 1", "formule-1", "Belgique"),
    "4407": ("motogp", "MotoGP", "motogp", "Belgique"),
    "4443": ("ufc", "UFC", "ufc", "Belgique"),
    "4464": ("tennis", "Roland-Garros", "roland-garros", "France"),
    "4461": ("tennis", "Wimbledon", "wimbledon", "Royaume-Uni"),
    "4467": ("tennis", "Open d'Australie", "australian-open", "Autriche"),
    "4551": ("rugby", "Tournoi des 6 Nations", "six-nations", "Royaume-Uni"),
    "4435": ("rugby", "Champions Cup", "champions-cup", "France"),
}

LLM_URL = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com") + "/chat/completions"
LLM_KEY = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "deepseek-chat")

FR_MONTHS = {
    "January": "janvier", "February": "fevrier", "March": "mars", "April": "avril",
    "May": "mai", "June": "juin", "July": "juillet", "August": "aout",
    "September": "septembre", "October": "octobre", "November": "novembre", "December": "decembre",
}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def yaml_str(v) -> str:
    return '"' + str(v).replace('"', '\\"') + '"'


def fetch_next_events(league_id: str) -> list[dict]:
    for attempt in range(4):
        try:
            r = requests.get(f"{BASE}/eventsnextleague.php", params={"id": league_id}, timeout=15)
            if r.status_code == 429:
                time.sleep(2 ** attempt + 1)
                continue
            r.raise_for_status()
            return r.json().get("events") or []
        except Exception as e:
            print(f"  ! ligue {league_id}: {e}")
            return []
    print(f"  ! ligue {league_id}: rate-limit")
    return []


def build_mdx(ev: dict, sport: str, competition: str, bkey: str, vpn: str) -> tuple[str, str] | None:
    title = (ev.get("strEvent") or "").strip()
    if re.search(r"practice|free practice|fp[123]|warm[\s-]?up|sprint shootout", title, re.I):
        return None
    date = ev.get("dateEvent")
    time = ev.get("strTime") or "20:00:00"
    if not title or not date:
        return None
    iso = f"{date}T{time}+02:00"
    slug = slugify(f"{title}-{date}")

    matrix = BROADCASTERS.get(bkey, {})
    free = matrix.get("free") or []
    if not free:
        return None
    paid = matrix.get("paid") or []

    home, away = ev.get("strHomeTeam"), ev.get("strAwayTeam")
    venue = ev.get("strVenue") or ""

    lines = ["---"]
    lines.append(f"title: {yaml_str(title)}")
    lines.append(f'description: {yaml_str(f"{title} ({competition}) en direct : diffuseurs officiels et chaines en clair pour regarder le streaming legalement.")}')
    lines.append(f"sport: {sport}")
    lines.append(f"competition: {yaml_str(competition)}")
    if home and away:
        lines.append(f"homeTeam: {yaml_str(home)}")
        lines.append(f"awayTeam: {yaml_str(away)}")
    if venue:
        lines.append(f"venue: {yaml_str(venue)}")
    lines.append(f"eventDate: {iso}")
    lines.append('status: upcoming')
    lines.append(f"vpnServer: {yaml_str(vpn)}")
    lines.append("freeBroadcasters:")
    for b in free:
        lines.append(f'  - name: {yaml_str(b["name"])}')
        lines.append(f'    country: {yaml_str(b["country"])}')
        lines.append(f'    lang: {yaml_str(b.get("lang", "FR"))}')
        lines.append(f'    url: {yaml_str(b["url"])}')
        if b.get("note"):
            lines.append(f'    note: {yaml_str(b["note"])}')
    if paid:
        lines.append("paidBroadcasters:")
        for b in paid:
            lines.append(f'  - name: {yaml_str(b["name"])}')
            lines.append(f'    price: {yaml_str(b["price"])}')
            if b.get("note"):
                lines.append(f'    note: {yaml_str(b["note"])}')
    lines.append("faq:")
    lines.append(f'  - q: {yaml_str(f"Ou regarder {title} en streaming ?")}')
    top = free[0]["name"]
    lines.append(f'    a: {yaml_str(f"{title} est diffuse en clair sur {top}. Depuis la France, un VPN connecte a un serveur {vpn} permet d acceder au flux officiel gratuitement.")}')
    lines.append("---")
    lines.append("")
    body = generate_analysis(title, competition, sport, date)
    if body:
        lines.append(body)
        lines.append("")
    lines.append(f"## {title} : ou regarder le direct ?")
    lines.append("")
    lines.append(
        f"Retrouvez ci-dessus le comparatif des diffuseurs officiels : les chaines payantes francaises "
        f"face aux chaines publiques etrangeres qui retransmettent {competition} **en clair et gratuitement**."
    )
    lines.append("")
    lines.append(
        f"La solution legale : un VPN connecte a un serveur en **{vpn}** vous donne acces au flux officiel de "
        f"**{top}** en HD, sans abonnement."
    )
    lines.append("")
    return slug, "\n".join(lines)


def generate_analysis(title: str, competition: str, sport: str, date: str) -> str:
    """~350 mots d'analyse avant-match via DeepSeek (anti thin-content).
    Retourne '' si aucune cle LLM n'est configuree."""
    if not LLM_KEY:
        return ""
    prompt = (
        f"Tu es journaliste sportif francais. Redige 300 a 400 mots en Markdown "
        f"(sous-titres ## et ###, gras) d'analyse avant-match pour : « {title} » "
        f"({competition}, {sport}, le {date}). Couvre : l'enjeu de la rencontre "
        f"(classement, qualification, dynamique), les forces en presence (joueurs "
        f"cles, absents, etat de forme), l'historique recent, et les conditions "
        f"(lieu, meteo, ambiance). Pas de cotes de paris, pas de lien, pas de "
        f"conclusion commerciale. Texte factuel et neutre."
    )
    try:
        r = requests.post(
            LLM_URL,
            headers={"Authorization": f"Bearer {LLM_KEY}", "Content-Type": "application/json"},
            json={
                "model": LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 900,
            },
            timeout=60,
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"].strip()
        return text if len(text) > 200 else ""
    except Exception as e:
        print(f"    ! LLM ({title[:40]}): {e}")
        return ""


def update_statuses() -> None:
    """Passe les fiches en 'live' le jour J, 'finished' apres +4h."""
    now = dt.datetime.now(dt.timezone.utc)
    for f in MATCHES_DIR.glob("*.mdx"):
        txt = f.read_text()
        m = re.search(r"^eventDate:\s*(\S+)", txt, re.M)
        sm = re.search(r"^status:\s*(\w+)", txt, re.M)
        if not m or not sm or sm.group(1) == "finished":
            continue
        try:
            ev_dt = dt.datetime.fromisoformat(m.group(1))
        except ValueError:
            continue
        if ev_dt.tzinfo is None:
            ev_dt = ev_dt.replace(tzinfo=dt.timezone.utc)
        new = None
        if now > ev_dt + dt.timedelta(hours=4):
            new = "finished"
        elif ev_dt <= now <= ev_dt + dt.timedelta(hours=4):
            new = "live"
        if new and new != sm.group(1):
            txt = txt.replace(sm.group(0), f"status: {new}", 1)
            f.write_text(txt)
            print(f"  ~ {f.name} -> {new}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--update-status", action="store_true")
    args = ap.parse_args()

    if args.update_status:
        update_statuses()
        return

    existing = {f.stem for f in MATCHES_DIR.glob("*.mdx")}
    created = 0
    for league_id, (sport, comp, bkey, vpn) in LEAGUES.items():
        for ev in fetch_next_events(league_id):
            built = build_mdx(ev, sport, comp, bkey, vpn)
            if not built:
                continue
            slug, mdx = built
            if slug in existing:
                continue
            if args.dry_run:
                print(f"[dry] {slug}.mdx\n{mdx[:200]}…\n")
            else:
                (MATCHES_DIR / f"{slug}.mdx").write_text(mdx)
                print(f"  + {slug}.mdx")
            created += 1
    print(f"{created} fiche(s) {'a creer' if args.dry_run else 'creee(s)'}.")


if __name__ == "__main__":
    main()
