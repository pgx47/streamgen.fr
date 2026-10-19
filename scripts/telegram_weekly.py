#!/usr/bin/env python3
"""Recap hebdo : affiches du week-end sur le canal Telegram (vendredi 16h UTC)."""
import datetime as dt, json, os, re
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
MATCHES = ROOT / "src" / "content" / "matches"
TOKEN, CHAT = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
ICON = {"football":"⚽","formule-1":"🏎️","ufc":"🥊","motogp":"🏍️","tennis":"🎾","rugby":"🏉","cyclisme":"🚴"}

def send(msg):
    requests.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage",
                  json={"chat_id":CHAT,"text":msg,"parse_mode":"HTML","disable_web_page_preview":True},timeout=15).raise_for_status()

def parse(f):
    txt=f.read_text(); fm=txt.split("---")[1] if txt.startswith("---") else ""
    g=lambda k:(re.search(rf"^{k}:\s*\"?(.+?)\"?$",fm,re.M) or [None,None])[1]
    free=re.search(r"- name:\s*\"([^\"]+)\"",fm)
    return {"t":g("title"),"sp":g("sport"),"d":g("eventDate"),"slug":f.stem,"ch":free.group(1) if free else ""}

now=dt.datetime.now(dt.timezone.utc); wk_end=now+dt.timedelta(days=3)
items=[]
for f in MATCHES.glob("*.mdx"):
    d=parse(f)
    try: ev=dt.datetime.fromisoformat(d["d"])
    except: continue
    if ev.tzinfo is None: ev=ev.replace(tzinfo=dt.timezone.utc)
    if now<=ev<=wk_end: d["ev"]=ev; items.append(d)

items.sort(key=lambda x:x["ev"])
top=items[:5]
if top:
    lines=["🏟️ <b>LE PROGRAMME DU WEEK-END</b> — ce qui passe en clair :",""]
    for d in top:
        jour=d["ev"].strftime("%a %d/%m %Hh%M")
        lines.append(f"{ICON.get(d['sp'],'🏆')} <b>{d['t']}</b>\n   🕐 {jour} · 📺 {d['ch']} en clair\n   👉 https://streamgen.fr/{d['sp']}/{d['slug']}/")
    lines.append("\n🔓 Chaînes belges/suisses bloquées ? VPN 2,19 €/m → streamgen.fr/go/vpn")
    send("\n".join(lines)); print(f"{len(top)} events")
else:
    print("rien ce week-end")
