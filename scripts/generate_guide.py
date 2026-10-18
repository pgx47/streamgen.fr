#!/usr/bin/env python3
"""generate_guide.py — 1 guide/run via DeepSeek (JSON structure, frontmatter script-side)."""
import json, os, re, unicodedata, datetime as dt
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
GUIDES = ROOT / "src" / "content" / "guides"
TOPICS = ROOT / "scripts" / "guide_topics.json"
LLM_URL = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com") + "/chat/completions"
LLM_KEY = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "deepseek-flash")

def slugify(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:70]

def yq(v):
    return '"' + str(v).replace('"', '\\"').replace("\n", " ") + '"'

def main():
    if not LLM_KEY:
        print("pas de cle LLM — skip"); return
    topics = json.loads(TOPICS.read_text())
    existing = {p.stem for p in GUIDES.glob("*.mdx")}
    todo = [t for t in topics if slugify(t["topic"]) not in existing]
    if not todo:
        print("file de sujets vide — rien a faire"); return
    t = todo[0]
    today = dt.date.today().isoformat()
    prompt = f"""Tu es redacteur SEO pour streamgen.fr (streaming sportif legal : chaines etrangeres en clair + VPN).
Redige un guide complet sur : {t['topic']}
Reponds en JSON STRICT :
{{"title":"titre SEO ~60c","description":"meta ~150c","steps":[{{"name":"...","text":"..."}},...4 etapes],"faq":[{{"q":"...","a":"..."}},...3 questions],"body":"corps Markdown ~500 mots : intro chiffree, sections ##, encadre > legalite, liens internes /astuces/ /go/vpn /tutoriel-vpn/"}}
Pas de markdown autour du JSON."""
    r = requests.post(LLM_URL, headers={"Authorization": f"Bearer {LLM_KEY}", "Content-Type": "application/json"},
                      json={"model": LLM_MODEL, "messages": [{"role": "user", "content": prompt}],
                            "temperature": 0.6, "max_tokens": 3000, "response_format": {"type": "json_object"}}, timeout=120)
    r.raise_for_status()
    raw = r.json()["choices"][0]["message"]["content"].strip()
    raw = re.sub(r"^```(?:json|mdx|markdown)?\s*|```$", "", raw, flags=re.M).strip()
    m = re.search(r"\{.*\}", raw, re.S)
    art = json.loads(m.group(0) if m else raw)

    lines = ["---",
        f"title: {yq(art['title'])}",
        f"description: {yq(art['description'])}",
        f'category: "{t["category"]}"',
        f'publishDate: "{today}"', f'updatedDate: "{today}"',
        f"vpnRequired: {'true' if t['vpnCountry'] else 'false'}",
    ]
    if t["vpnCountry"]:
        lines.append(f'vpnCountry: {yq(t["vpnCountry"])}')
    lines.append('schemaType: HowTo')
    lines.append("steps:")
    for st in art.get("steps", [])[:5]:
        lines.append(f"  - name: {yq(st.get('name',''))}")
        lines.append(f"    text: {yq(st.get('text',''))}")
    lines.append("faq:")
    for f in art.get("faq", [])[:4]:
        lines.append(f"  - q: {yq(f.get('q',''))}")
        lines.append(f"    a: {yq(f.get('a',''))}")
    lines += ["---", "", art.get("body", "").strip(), ""]

    slug = slugify(t["topic"])
    (GUIDES / f"{slug}.mdx").write_text("\n".join(lines))
    print(f"+ {slug}.mdx")

if __name__ == "__main__":
    main()
