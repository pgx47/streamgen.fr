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
    # Foot/F1/UFC : desormais via ESPN (sans cle). TheSportsDB = complement.
    "4407": ("motogp", "MotoGP", "motogp", "Belgique"),
    "4464": ("tennis", "Roland-Garros", "roland-garros", "France"),
    "4461": ("tennis", "Wimbledon", "wimbledon", "Royaume-Uni"),
    "4467": ("tennis", "Open d'Australie", "australian-open", "Autriche"),
    "4551": ("rugby", "Tournoi des 6 Nations", "six-nations", "Royaume-Uni"),
    "4435": ("rugby", "Champions Cup", "champions-cup", "France"),
    # Sports de niche : IDs a verifier cote TheSportsDB (IDs invalides = 0 event)
    "4391": ("cyclisme", "Tour de France", "cyclisme", "Belgique"),
    "4416": ("cyclisme", "Tour d'Italie (Giro)", "cyclisme", "Belgique"),
}

# ESPN (API publique sans cle) : meilleures images pour UFC (headshots) et F1.
# ESPN = source principale (gratuit, sans cle, sans rate-limit)
ESPN_SOURCES = [
    ("https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard",
     "ufc", "UFC", "ufc", "Belgique"),
    ("https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard",
     "formule-1", "Formule 1", "formule-1", "Belgique"),
    ("https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
     "football", "Ligue des Champions", "ligue-des-champions", "Belgique"),
    ("https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard",
     "football", "Ligue 1", "ligue-1", "Belgique"),
    ("https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard",
     "football", "Ligue Europa", "europa-league", "Autriche"),
    ("https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa.conf/scoreboard",
     "football", "Ligue Europa Conference", "conference-league", "Autriche"),
]

LLM_URL = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com") + "/chat/completions"
LLM_KEY = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "deepseek-flash")

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


def team_badge(team_id: str) -> str:
    """Recupere le logo d'une equipe (strTeamBadge) via lookupteam."""
    try:
        r = requests.get(f"{BASE}/lookupteam.php", params={"id": team_id}, timeout=15)
        if r.status_code == 429:
            time.sleep(2)
            r = requests.get(f"{BASE}/lookupteam.php", params={"id": team_id}, timeout=15)
        r.raise_for_status()
        teams = r.json().get("teams") or []
        return (teams[0].get("strTeamBadge") or teams[0].get("strBadge") or "") if teams else ""
    except Exception:
        return ""


# strSport attendu par sport (evite les fiches hors-sujet si un ID de ligue est faux)
EXPECTED_SPORT = {
    "football": "Soccer", "formule-1": "Motorsport", "motogp": "Motorsport",
    "ufc": "Fighting", "tennis": "Tennis", "rugby": "Rugby",
    "cyclisme": "Cycling", "sports-hiver": None, "combat": "Fighting",
}


SESSION_RE = re.compile(
    r"\s*[-–—:]?\s*(practice|free practice|fp[123]|qualifying|qualification|qualifs?|sprint|"
    r"warm[\s-]?up|race|grand prix|gp)\s*\d*\s*$", re.I)


def gp_base(title: str) -> str:
    """Nom de base du GP (ex: 'United States Grand Prix' depuis '... Practice 1')."""
    t = SESSION_RE.sub("", title).strip(" -–—:")
    t = re.sub(r"\s+(practice|fp[123]|qualifying|sprint|shootout|warm[\s-]?up).*$", "", t, flags=re.I)
    return t.strip()


def session_label(title: str) -> str:
    t = title.lower()
    for pat, lab in [(r"practice 1|fp1|free practice 1", "Essais libres 1"),
                     (r"practice 2|fp2|free practice 2", "Essais libres 2"),
                     (r"practice 3|fp3|free practice 3", "Essais libres 3"),
                     (r"practice|free practice", "Essais libres"),
                     (r"sprint shootout", "Sprint Shootout"), (r"sprint", "Course Sprint"),
                     (r"qualifying|qualification", "Qualifications"),
                     (r"warm[\s-]?up", "Warm-up"), (r"race|grand prix", "Course / Grand Prix")]:
        if re.search(pat, t):
            return lab
    return "Course"


def build_mdx(ev: dict, sport: str, competition: str, bkey: str, vpn: str,
              schedule: list[tuple[str, str]] | None = None) -> tuple[str, str] | None:
    if ev.get("strSport") and EXPECTED_SPORT.get(sport) and ev["strSport"] != EXPECTED_SPORT[sport]:
        return None
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
    poster = ev.get("strPoster") or ev.get("strSquare") or ev.get("strBanner") or ev.get("strThumb") or ""
    home_logo = ev.get("_homeLogo") or (team_badge(ev.get("idHomeTeam")) if ev.get("idHomeTeam") else "")
    away_logo = ev.get("_awayLogo") or (team_badge(ev.get("idAwayTeam")) if ev.get("idAwayTeam") else "")

    lines = ["---"]

    enrich = enrich_llm(title, competition, sport, date)
    # merge frontmatter enrichi (les donnees API restent prioritaires)
    home_lineup = enrich.get("homeLineup")
    away_lineup = enrich.get("awayLineup")
    if not schedule and enrich.get("schedule"):
        schedule = [(x.get("label",""), x.get("date","")) for x in enrich["schedule"]
                    if isinstance(x, dict) and x.get("label")]
    fighter1 = ev.get("_f1") or enrich.get("fighter1")
    fighter2 = ev.get("_f2") or enrich.get("fighter2")
    fight_card = ([{"fight": f, "category": "", "isMainCard": True} for f in ev["_card_main"]]
                  + [{"fight": f, "category": "", "isMainCard": False} for f in ev.get("_card_prelims") or []]
                  if ev.get("_card_main") else enrich.get("fightCard"))
    weight_class = enrich.get("weightClass")
    title_fight = bool(enrich.get("titleFight"))
    venue = venue or enrich.get("venue")
    lines.append(f"title: {yaml_str(title)}")
    lines.append(f'description: {yaml_str(f"{title} ({competition}) en direct : diffuseurs officiels et chaines en clair pour regarder le streaming legalement.")}')
    lines.append(f"sport: {sport}")
    lines.append(f"competition: {yaml_str(competition)}")
    if home and away:
        lines.append(f"homeTeam: {yaml_str(home)}")
        lines.append(f"awayTeam: {yaml_str(away)}")
    if fighter1 and fighter2:
        for f, key in ((fighter1, "fighter1"), (fighter2, "fighter2")):
            lines.append(f"{key}:")
            lines.append(f'  name: {yaml_str(f.get("name",""))}')
            if f.get("country"): lines.append(f'  country: {yaml_str(f["country"])}')
            if f.get("flag"): lines.append(f'  flag: {yaml_str(f["flag"])}')
            if f.get("record"): lines.append(f'  record: {yaml_str(f["record"])}')
            if f.get("nickname"): lines.append(f'  nickname: {yaml_str(f["nickname"])}')
            if f.get("ranking"): lines.append(f'  ranking: {yaml_str(f["ranking"])}')
            if f.get("photo"): lines.append(f'  photo: {yaml_str(f["photo"])}')
    if venue:
        lines.append(f"venue: {yaml_str(venue)}")
    if weight_class:
        lines.append(f"weightClass: {yaml_str(weight_class)}")
    lines.append(f"titleFight: {'true' if title_fight else 'false'}")
    if fight_card:
        lines.append("fightCard:")
        for fc in fight_card[:14]:
            lines.append(f'  - fight: {yaml_str(fc.get("fight",""))}')
            if fc.get("category"): lines.append(f'    category: {yaml_str(fc["category"])}')
            lines.append(f'    isMainCard: {"true" if fc.get("isMainCard") else "false"}')
    if home_lineup:
        lines.append("homeLineup:")
        if home_lineup.get("formation"): lines.append(f'  formation: {yaml_str(home_lineup["formation"])}')
        lines.append("  starters: [" + ",".join(yaml_str(x) for x in (home_lineup.get("starters") or [])[:15]) + "]")
        if home_lineup.get("subs"):
            lines.append("  subs: [" + ",".join(yaml_str(x) for x in home_lineup["subs"][:9]) + "]")
    if away_lineup:
        lines.append("awayLineup:")
        if away_lineup.get("formation"): lines.append(f'  formation: {yaml_str(away_lineup["formation"])}')
        lines.append("  starters: [" + ",".join(yaml_str(x) for x in (away_lineup.get("starters") or [])[:15]) + "]")
        if away_lineup.get("subs"):
            lines.append("  subs: [" + ",".join(yaml_str(x) for x in away_lineup["subs"][:9]) + "]")
    if poster:
        lines.append(f"eventPoster: {yaml_str(poster)}")
    if home_logo:
        lines.append(f"homeTeamLogo: {yaml_str(home_logo)}")
    if away_logo:
        lines.append(f"awayTeamLogo: {yaml_str(away_logo)}")
    lines.append(f"eventDate: {iso}")
    if schedule:
        lines.append("schedule:")
        for lab, dt_iso in schedule:
            lines.append(f'  - label: {yaml_str(lab)}')
            lines.append(f'    date: {dt_iso}')
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
    # FAQ contextualisee par sport (requetes reelles)
    extra_faq = {
        "ufc": ("A quelle heure commence le main event en France ?",
                "Les cartes UFC americaines demarrent generalement vers 3h-4h du matin heure francaise pour la main card ; les preliminaires commencent plus tot. L'heure exacte figure en haut de cette page."),
        "formule-1": ("Peut-on regarder les qualifications et essais en clair ?",
                      "Oui : RTBF et RTS diffusent l'integralite du week-end en clair — essais libres, qualifications et course."),
        "motogp": ("Les qualifications MotoGP sont-elles en clair ?",
                   "Oui, les chaines publiques belges et autrichiennes diffusent qualifs et courses en clair."),
        "football": ("Y a-t-il prolongation et tirs au but en cas d'egalite ?",
                     "En phase a elimination directe (Ligue des Champions, coupes), oui : 2x15 minutes puis tirs au but. En phase de ligue, le match nul est definitif."),
        "tennis": ("Le match peut-il etre decale ou interrompu ?",
                   "Oui : pluie (hors courts couverts) ou match precedent long peuvent decaler l'horaire. Le direct reste accessible sur la meme chaine."),
        "rugby": ("Le match est-il diffuse en clair en France ?",
                  "Les grandes affiches du 6 Nations sont sur France TV ; la Champions Cup a des matchs selectionnes en clair. Le detail figure dans le tableau ci-dessus."),
    }
    if sport in extra_faq:
        q, a = extra_faq[sport]
        lines.append(f'  - q: {yaml_str(q)}')
        lines.append(f'    a: {yaml_str(a)}')
    lines.append("---")
    lines.append("")
    body = generate_analysis(title, competition, sport, date)
    if body:
        lines.append(body)
        lines.append("")
    if ev.get("_card_main"):
        lines.append("### La carte principale (Main Card)")
        lines.extend(f"*   **{f}**" for f in ev["_card_main"])
        lines.append("")
        if ev.get("_card_prelims"):
            lines.append("### La carte preliminaire (Prelims)")
            lines.extend(f"*   {f}" for f in ev["_card_prelims"])
            lines.append("")
        lines.append("### Les horaires (heure de Paris)")
        lines.extend(["*   **Early Prelims** — ~00h00", "*   **Prelims** — ~02h00",
                      "*   **Main Card** — heure du debut affichee plus haut", ""])
    if schedule:
        lines.append("### Programme TV complet du week-end")
        lines.append(f"**{top}** diffuse l'integralite du week-end en clair :")
        lines.append("")
        for lab, diso in schedule:
            try:
                dd = dt.datetime.fromisoformat(diso)
                h = dd.strftime("%Hh%M")
                j = dd.strftime("%A %d %B")
            except Exception:
                j, h = diso[:10], diso[11:16]
            lines.append(f"*   **{lab}** — {j}, {h}")
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
        f"Tu es journaliste sportif francais. Redige au moins 300 mots en Markdown "
        f"d'analyse avant-match pour : « {title} » ({competition}, {sport}, le {date}). "
        f"Structure EXACTE avec sous-titres ### : "
        f"### L'enjeu de la rencontre (classement, qualification, enjeu du match) ; "
        f"### L'etat de forme et les forces en presence (joueurs cles, absents, dynamique) ; "
        f"### L'historique et le contexte (match aller, edition precedente, conditions). "
        f"Pas de cotes de paris, pas de lien, pas de conclusion commerciale. "
        f"Texte factuel et neutre."
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


def enrich_llm(title: str, competition: str, sport: str, date: str) -> dict:
    """DeepSeek remplit le frontmatter manquant par sport. Retourne {} sans cle."""
    if not LLM_KEY:
        return {}
    specs = {
        "football": '{"homeLineup":{"formation":"4-3-3","starters":["nom1",...11],"subs":["nom",...7]},'
                    '"awayLineup":{...meme format},"venue":"stade","referee":"arbitre"}',
        "rugby":    '{"homeLineup":{"formation":"","starters":["nom1",...15],"subs":["nom",...8]},'
                    '"awayLineup":{...},"venue":"stade"}',
        "formule-1":'{"schedule":[{"label":"Essais libres 1","date":"ISO"},...qualifs,course],"venue":"circuit"}',
        "motogp":   '{"schedule":[{"label":"Essais libres","date":"ISO"},...qualifs,course],"venue":"circuit"}',
        "ufc":      '{"fighter1":{"name":"","country":"","flag":"emoji","record":"25-2-0","ranking":""},'
                    '"fighter2":{...},"weightClass":"","titleFight":false,'
                    '"fightCard":[{"fight":"A vs B","category":"Poids...","isMainCard":true},...tous]}',
        "combat":   '{"fighter1":{...meme format ufc},"fighter2":{...},"weightClass":"","titleFight":false,"fightCard":[...]}',
        "tennis":   '{"fighter1":{"name":"","country":"","flag":"emoji","ranking":"ATP 12"},'
                    '"fighter2":{...},"venue":"surface + tournoi"}',
        "cyclisme": '{"venue":"parcours","schedule":[{"label":"Etape/Depart","date":"ISO"}]}',
        "sports-hiver":'{"venue":"site","schedule":[{"label":"Course","date":"ISO"}]}',
    }
    spec = specs.get(sport)
    if not spec:
        return {}
    prompt = (f"Evenement sportif : « {title} » ({competition}, le {date}). "
              f"Complete le JSON suivant avec les donnees reelles de l'evenement "
              f"(si inconnu, laisse vide/omets le champ — JAMAIS de valeurs inventees) :\n{spec}\n"
              "Reponds en JSON strict, rien d'autre.")
    try:
        r = requests.post(LLM_URL,
            headers={"Authorization": f"Bearer {LLM_KEY}", "Content-Type": "application/json"},
            json={"model": LLM_MODEL, "messages": [{"role": "user", "content": prompt}],
                  "temperature": 0.2, "max_tokens": 1600}, timeout=90)
        r.raise_for_status()
        raw = r.json()["choices"][0]["message"]["content"].strip()
        m = re.search(r"\{.*\}", raw, re.S)
        return json.loads(m.group(0) if m else raw)
    except Exception as e:
        print(f"    ! enrich ({title[:40]}): {e}")
        return {}


def espn_headshot(athlete_id: str) -> str:
    """Photo detouree du combattant via l'API web ESPN (sans cle)."""
    try:
        r = requests.get(
            f"https://site.web.api.espn.com/apis/common/v3/sports/mma/ufc/athletes/{athlete_id}",
            timeout=15)
        r.raise_for_status()
        return (r.json().get("athlete", {}).get("headshot") or {}).get("href") or ""
    except Exception:
        return ""


def fetch_espn(url: str, sport: str) -> list[dict]:
    """Normalise les events ESPN au format TheSportsDB utilise par build_mdx."""
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print(f"  ! espn {sport}: {e}")
        return []
    out = []
    for e in (r.json().get("events") or []):
        comps = e.get("competitions") or []
        ev = {
            "strEvent": e.get("name") or e.get("shortName"),
            "strVenue": (comps[0].get("venue") or {}).get("fullName") if comps else "",
            "strPoster": "",
        }
        if sport == "ufc" and comps:
            main = comps[-1]  # dernier combat = main event
            card = []
            for c in comps:
                fs = c.get("competitors") or []
                if len(fs) >= 2:
                    card.append(f"{fs[0]['athlete'].get('displayName','?')} vs {fs[1]['athlete'].get('displayName','?')}")
            ev["_card_main"] = card[-5:]      # 5 derniers = main card
            ev["_card_prelims"] = card[:-5]   # le reste = prelims
            fighters = main.get("competitors") or []
            if len(fighters) >= 2:
                for i, k in enumerate(("_f1", "_f2")):
                    c, a = fighters[i], fighters[i]["athlete"]
                    rec = next((r.get("summary") for r in (c.get("records") or []) if r.get("type") == "total"), "")
                    ev[k] = {
                        "name": a.get("displayName", ""),
                        "country": (a.get("flag") or {}).get("alt", ""),
                        "flag": (a.get("flag") or {}).get("href", ""),
                        "record": rec or "",
                        "photo": espn_headshot(c.get("id") or a.get("id", "")),
                    }
                ev["strHomeTeam"] = ev["_f1"]["name"]
                ev["strAwayTeam"] = ev["_f2"]["name"]
                ev["_homeLogo"] = ev["_f1"]["photo"]
                ev["_awayLogo"] = ev["_f2"]["photo"]
        if sport == "football" and comps:
            teams = comps[0].get("competitors") or []
            # convention europeenne : "Domicile vs Exterieur" (pas "X at Y")
            hn = next((c.get("team",{}).get("displayName") for c in teams if c.get("homeAway")=="home"), None)
            an = next((c.get("team",{}).get("displayName") for c in teams if c.get("homeAway")=="away"), None)
            if hn and an:
                ev["strEvent"] = f"{hn} vs {an}"
            for c in teams:
                t = c.get("team") or {}
                key = "strHomeTeam" if c.get("homeAway") == "home" else "strAwayTeam"
                logo_k = "_homeLogo" if key == "strHomeTeam" else "_awayLogo"
                ev[key] = t.get("displayName") or t.get("name")
                ev[logo_k] = (t.get("logo") or "")
        if sport == "formule-1":
            race = next((c for c in comps if (c.get("type") or {}).get("abbreviation") == "Race"), None)
            ev["dateEvent"] = ((race or e).get("date") or "")[:10]
            t = ((race or e).get("date") or "T20:00:00").split("T")[-1].rstrip("Z")
            ev["strTime"] = t if ":" in t else "20:00:00"
        else:
            ev["dateEvent"] = (e.get("date") or "")[:10]
            ev["strTime"] = (e.get("date") or "T20:00:00").split("T")[-1].rstrip("Z") or "20:00:00"
        out.append(ev)
    return out


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
            if new == "finished":
                # Bascule SEO en mode "replay" : la page reste rentable 48-72h.
                title_m = re.search(r'^title:\s*"(.+)"', txt, re.M)
                if title_m:
                    ev_title = title_m.group(1)
                    txt = re.sub(
                        r"^description:.*$",
                        f'description: "{ev_title} : comment regarder le replay integral gratuitement et legalement sur les chaines publiques etrangeres."',
                        txt, count=1, flags=re.M)
                    if "seoTitle:" not in txt:
                        txt = txt.replace(
                            title_m.group(0),
                            f'{title_m.group(0)}\nseoTitle: "{ev_title} : le replay integral en streaming gratuit"',
                            1)
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
    jobs = [fetch_next_events(lid) for lid in LEAGUES]
    jobs += [fetch_espn(url, sport) for url, sport, *_ in ESPN_SOURCES]
    meta = list(LEAGUES.values()) + [s[1:] for s in ESPN_SOURCES]
    for (sport, comp, bkey, vpn), events in zip(meta, jobs):
        for ev in events:
            schedule = None
            if sport in ("formule-1", "motogp"):
                # Programme du week-end : toutes les sessions du meme GP
                base = gp_base(ev.get("strEvent") or "")
                sched = [
                    (session_label(e2.get("strEvent") or ""),
                     f"{e2.get('dateEvent')}T{e2.get('strTime') or '20:00:00'}+02:00")
                    for e2 in events
                    if e2.get("dateEvent") and gp_base(e2.get("strEvent") or "") == base
                ]
                sched.sort(key=lambda x: x[1])
                # dedupe labels
                seen_l, schedule = set(), []
                for lab, d in sched:
                    if lab not in seen_l:
                        seen_l.add(lab)
                        schedule.append((lab, d))
            built = build_mdx(ev, sport, comp, bkey, vpn, schedule)
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
