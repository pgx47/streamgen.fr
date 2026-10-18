#!/usr/bin/env python3
"""
fetch_news.py — breves « Droits TV & diffuseurs » depuis Google News RSS + DeepSeek.
1 breve max par run dans src/content/news/. Dedup via scripts/.news_seen.json.

Env: DEEPSEEK_API_KEY (ou OPENROUTER_API_KEY), LLM_BASE_URL, LLM_MODEL.
Usage: python scripts/fetch_news.py [--dry-run]
"""
import datetime as dt
import html
import json
import os
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
NEWS_DIR = ROOT / "src" / "content" / "news"
SEEN = ROOT / "scripts" / ".news_seen.json"

RSS = ("https://news.google.com/rss/search?q="
       "(%22droits+tv%22+OR+%22diffusion+sportive%22+OR+%22diffuseur%22+OR+%22dazn%22"
       "+OR+%22canal%2B+sport%22+OR+%22bein+sports%22+OR+%22rtbf%22+OR+%22servustv%22)"
       "+when:7d&hl=fr&gl=FR&ceid=FR:fr")

LLM_URL = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com") + "/chat/completions"
LLM_KEY = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "deepseek-chat")

KEYWORDS = re.compile(
    r"droit|diffus|cha[iî]ne|canal|dazn|bein|rmc|ligue|sport|tv|télé|stream|clair|prix|abonn",
    re.I)


def slugify(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:70]


def fetch_rss() -> list[dict]:
    r = requests.get(RSS, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    items = []
    for it in ET.fromstring(r.content).iter("item"):
        t = html.unescape(it.findtext("title") or "")
        t = re.sub(r"\s*-\s*[^-]+$", "", t)  # retire le nom du media en suffixe
        link = it.findtext("link") or ""
        src_el = it.find("source")
        src = src_el.text if src_el is not None else ""
        items.append({"title": t.strip(), "link": link, "source": src or "Google News"})
    return items


def llm_article(title: str, source: str) -> dict | None:
    if not LLM_KEY:
        return None
    prompt = f"""Tu es redacteur pour streamgen.fr, site qui repertorie les chaines publiques etrangeres diffusant le sport en clair (RTBF, RTS, ServusTV...) accessibles via VPN.

Dep titre de presse : « {title} » ({source}).

Redige une breve en francais de ~400 mots, format Markdown, structure exacte :
## Les faits
(2-3 phrases factuelles sur l'annonce : droits TV, tarif, changement de diffuseur)
## L'impact pour le telespectateur
(2-3 phrases : prix, acces, ce que ca change pour le supporter francais)
## L'alternative en clair
(1-2 phrases : quelles chaines publiques etrangeres diffusent en clair, lien markdown interne possible vers /astuces/ ou /tutoriel-vpn/)

Pas de cotes, pas d'invention de chiffres. Ton informatif et sobre.
Reponds en JSON strict: {{"description": "resume 140c max", "body": "markdown"}}"""
    r = requests.post(
        LLM_URL,
        headers={"Authorization": f"Bearer {LLM_KEY}", "Content-Type": "application/json"},
        json={"model": LLM_MODEL, "messages": [{"role": "user", "content": prompt}],
              "temperature": 0.5, "max_tokens": 1100, "response_format": {"type": "json_object"}},
        timeout=90)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])


def yaml_str(v: str) -> str:
    return '"' + str(v).replace('"', '\\"').replace("\n", " ") + '"'


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    seen = set(json.loads(SEEN.read_text()) if SEEN.exists() else [])
    items = [i for i in fetch_rss()
             if KEYWORDS.search(i["title"]) and i["link"] not in seen]
    print(f"{len(items)} candidat(s)")
    if not items:
        return

    it = items[0]
    slug = slugify(it["title"])
    today = dt.date.today().isoformat()

    art = None
    try:
        art = llm_article(it["title"], it["source"])
    except Exception as e:
        print(f"  ! LLM: {e}")

    if art:
        desc, body = art.get("description", it["title"]), art.get("body", "")
    else:
        desc, body = it["title"], (
            f"## Les faits\n\n{it['title']} — via [{it['source']}]({it['link']}).\n\n"
            "## L'impact pour le téléspectateur\n\n"
            "Les mouvements de droits TV et de tarifs changent régulièrement l'accès au sport en France.\n\n"
            "## L'alternative en clair\n\n"
            "Consultez nos [guides des chaînes étrangères en clair](/astuces/) pour suivre le sport légalement et gratuitement.\n")

    mdx = "---\n".join([
        "",
        f"title: {yaml_str(it['title'])}",
        f"description: {yaml_str(desc)}",
        f'publishDate: "{today}"',
        f"sourceUrl: {yaml_str(it['link'])}",
        f"sourceName: {yaml_str(it['source'])}",
        'tags: ["droits-tv"]',
        "---", "", body, ""])
    if args.dry_run:
        print(f"[dry] {slug}.mdx\n{mdx[:300]}…")
    else:
        (NEWS_DIR / f"{slug}.mdx").write_text(mdx)
        print(f"  + {slug}.mdx")
    seen.add(it["link"])
    if not args.dry_run:
        SEEN.write_text(json.dumps(sorted(seen)))


if __name__ == "__main__":
    main()
