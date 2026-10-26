export const ZONE='Europe/Paris';
export function dateKey(date){return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export function eventOnDay(e,key){return (e.date||dateKey(e.start))===key;}
export function statusAt(e,now=new Date()){
 if(['En direct confirmé','Terminé','Reporté','Annulé','Programmation à revérifier'].includes(e.status))return e.status;
 if(!e.start)return 'Horaire à confirmer';
 return new Date(e.start)<=now?'Début prévu':'À venir';
}
export function countdownAt(e,now=new Date()){
 if(['Reporté','Annulé','Terminé','Programmation à revérifier'].includes(e.status))return e.status;
 if(!e.start)return 'Horaire à confirmer';
 const m=Math.ceil((new Date(e.start)-now)/60000);
 if(m<=0)return 'Direct non vérifié';
 if(m<60)return `Dans ${m} min`;
 if(m<1440)return `Dans ${Math.floor(m/60)} h ${m%60} min`;
 return `Dans ${Math.floor(m/1440)} j`;
}
export function matchesOptions(options,{access=[],platform=[],noAccount=false}={}){
 if(!access.length&&!platform.length&&!noAccount)return true;
 return options.some(o=>(!access.length||access.includes(o.access))&&(!platform.length||platform.includes(o.platform))&&(!noAccount||o.accountRequired===false));
}
export function calendarText(e,now=new Date()){
 const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const txt=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StreamGen//Agenda FR//FR','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${e.id}@streamgen.fr`,`DTSTAMP:${stamp(now)}`,e.start?`DTSTART:${stamp(e.start)}`:`DTSTART;VALUE=DATE:${e.date.replaceAll('-','')}`,`SUMMARY:${txt(e.title)}`,`DESCRIPTION:${txt(e.summary+' — Consulter les sources sur StreamGen. Horaires sous réserve de modification.')}`,`URL:https://streamgen.fr/evenements/${e.slug||e.id}/`,`STATUS:${['Annulé','Reporté'].includes(e.status)?'CANCELLED':'TENTATIVE'}`];
 if(e.end)lines.push(`DTEND:${stamp(e.end)}`);
 lines.push('END:VEVENT','END:VCALENDAR');
 // RFC 5545 folding: max 75 UTF-8 octets per content line, including continuation space.
 const folded=lines.map(line=>{let out='',part='',bytes=0;for(const char of line){const len=new TextEncoder().encode(char).length;if(bytes+len>75){out+=part+'\r\n';part=' ';bytes=1}part+=char;bytes+=len}return out+part});
 return folded.join('\r\n')+'\r\n';
}

// Editorial priority is a transparent heuristic, never an audience or reliability measurement.
export function editorialPriority(e,now=new Date()){
 const title=String(e.title||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 let score=8,series=[e.organizer||'',e.subcategory||'',e.category||''].join('|'),reasons=[];
 const rules=[[/paris games week|\bpgw\b/,44,'Salon du jeu vidéo','paris-games-week'],[/\bworlds\b.*\b(lol|league)\b|\b(lol|league)\b.*\bworlds\b/,65,'Worlds LoL','worlds-lol'],[/world championships?|championnats? du monde|coupe du monde/,60,'Compétition mondiale','world-'+e.subcategory],[/\b(formule 1|formula 1)\b/,50,'Championnat de Formule 1','f1'],[/\bwtt\b/,42,'Circuit international WTT','wtt'],[/\bnfl\b/,48,'Rendez-vous NFL','nfl'],[/grand slam|yonex ifb|route du rhum/,44,'Grand rendez-vous sportif',e.subcategory],[/sortie dans l.espace|spacewalk|lancement|launch|artemis/,40,'Rendez-vous spatial exceptionnel','space-'+e.id],[/z ?event|gp explorer|speedons/,48,'Événement spécial de créateurs','special-'+e.id],[/tournoi caritatif|marathon caritatif|showmatch|evenement special|festival|concert/,40,'Événement spécial de créateurs','special-'+e.id]];
 const identity=title+' '+String(e.subcategory||'').toLowerCase();
 const rule=rules.find(([pattern])=>pattern.test(identity));
 if(rule){score=rule[1];reasons.push(rule[2]);series=rule[3]}
 else if(e.major===true){score=38;reasons.push('Grand rendez-vous sélectionné')}
 else reasons.push(e.category==='créateurs'?(/(?:—|-)\s*(?:stream|suite de\b)/.test(title)?'Créneau régulier de créateur':'Rendez-vous de créateur'):'Rendez-vous du programme');
 if(['sport','esport'].includes(e.category)){
  if(/qualifications?/.test(title)){score+=4;reasons.push('Qualifications')}
  else if(/demi[- ]final|semi[- ]final/.test(title)){score+=14;reasons.push('Demi-finale')}
  else if(/quarts? de finale|quarter[- ]final/.test(title)){score+=8;reasons.push('Quarts de finale')}
  else if(!/\b(?:8es?|16es?|32es?|huitiemes?|seiziemes?)\b/.test(title)&&/\bfinales?\b|\bfinals\b/.test(title)){score+=20;reasons.push('Finale annoncée')}
  else if(e.subcategory==='Formule 1'&&/\bcourse\b|\brace\b/.test(title)){score+=10;reasons.push('Course du Grand Prix')}
  else if(/qualifications?/.test(title)){score+=4;reasons.push('Qualifications')}
 }
 const routine=e.category==='créateurs'&&e.major!==true&&!['Événement spécial de créateurs','Salon du jeu vidéo'].includes(rule?.[2]);
 const importance=score;
 const today=dateKey(now),distance=Math.round((Date.parse(e.date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
 score+=distance===0?30:distance===1?24:distance<=3&&distance>0?18:distance<=7&&distance>0?12:distance<=14&&distance>0?4:0;
 if(distance===0)reasons.push('Aujourd’hui');else if(distance===1)reasons.push('Demain');
 return {score,importance,reasons,series,routine,spotlightEligible:!routine&&(e.programType!=='scheduled-tv'||/concert|festival|opera|spectacle/i.test(e.subcategory||'')),label:routine?'Stream régulier':score>=70?'Grand rendez-vous':score>=45?'À suivre':'Au programme'};
}
export function rankHighlights(events,now=new Date(),limit=3,{includeRoutine=false}={}){
 const today=dateKey(now),latest=new Date(Date.parse(today+'T12:00:00Z')+30*86400000).toISOString().slice(0,10);
 const weekEnd=new Date(Date.parse(today+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 const ranked=events.filter(e=>e.date>=today&&e.date<=latest&&!['Annulé','Reporté','Terminé','Programmation à revérifier'].includes(e.status)&&(!e.end||Date.parse(e.end)>now.getTime())&&(e.end||!e.start||e.status==='En direct confirmé'||Date.parse(e.start)>now.getTime()-3*3600000))
 .map(e=>({event:e,priority:editorialPriority(e,now)})).filter(({event,priority})=>(includeRoutine||priority.spotlightEligible)&&(event.date<=weekEnd||priority.importance>=60||event.major===true)).sort((a,b)=>Number(a.priority.routine)-Number(b.priority.routine)||Number(b.event.date===today)-Number(a.event.date===today)||b.priority.score-a.priority.score||a.event.date.localeCompare(b.event.date)||String(a.event.start||'~').localeCompare(String(b.event.start||'~'))||a.event.id.localeCompare(b.event.id));
 const seen=new Set(),chosen=[];
 for(const {event,priority} of ranked){if(seen.has(priority.series))continue;seen.add(priority.series);chosen.push(event);if(chosen.length>=limit)break}
 return chosen;
}

export const IMAGE_LIBRARY={
  "badminton": {
    "creditKey": "badminton",
    "src": "/assets/library/badminton.webp",
    "label": "Illustration · badminton",
    "title": "Badminton Racket.jpg",
    "author": "hvshop",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Badminton_Racket.jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "gymnastics": {
    "creditKey": "gymnastics",
    "src": "/assets/library/gymnastics.webp",
    "label": "Illustration · gymnastique",
    "title": "2024 US Classic Uneven Bars 22.jpg",
    "author": "FloweringDagwood",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:2024_US_Classic_Uneven_Bars_22.jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "swimming": {
    "creditKey": "swimming",
    "src": "/assets/library/swimming.webp",
    "label": "Illustration · sports aquatiques",
    "title": "Swimming Pool lanes and starting blocks.jpg",
    "author": "KeepActive Australia from Melbourne, VIC, Australia",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Swimming_Pool_lanes_and_starting_blocks.jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "sailing": {
    "creditKey": "sailing",
    "src": "/assets/library/sailing.webp",
    "label": "Illustration · voile",
    "title": "Sailing boat at sunset, Ionian Sea, Albania.jpg",
    "author": "Liridon",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sailing_boat_at_sunset,_Ionian_Sea,_Albania.jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "judo": {
    "creditKey": "judo",
    "src": "/assets/library/judo.webp",
    "label": "Illustration · judo",
    "title": "Interior de un Dojo de Judo con Tatamis en la Asociacion Departamental de Judo ,La Paz-Bolivia.jpg",
    "author": "Norkiña",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Interior_de_un_Dojo_de_Judo_con_Tatamis_en_la_Asociacion_Departamental_de_Judo_,La_Paz-Bolivia.jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "space": {
    "creditKey": "space",
    "src": "/assets/library/space.webp",
    "label": "Illustration · espace",
    "title": "ISS March 2009.jpg",
    "author": "National Aeronautics and Space Administration (Q23548)",
    "license": "Public domain",
    "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:ISS_March_2009.jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "cooking": {
    "creditKey": "cooking",
    "src": "/assets/library/cooking.webp",
    "label": "Illustration · cuisine",
    "title": "The spiralizer in action! (4617278380).jpg",
    "author": "jessica mullen from austin, tx",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:The_spiralizer_in_action!_(4617278380).jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "creator": {
    "creditKey": "creator",
    "src": "/assets/library/creator.webp",
    "label": "Illustration · créateurs et studio",
    "title": "Headphone Microphone Madrid (Unsplash).jpg",
    "author": "WillSpirit SBLN willspirit",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Headphone_Microphone_Madrid_(Unsplash).jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "generic": {
    "creditKey": "generic",
    "src": "/assets/library/generic.webp",
    "label": "Illustration · ambiance de spectacle",
    "title": "Beach-Please-2022-crowd-stage-lights-night-performance.jpg",
    "author": "PinkBeachPlanet",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Beach-Please-2022-crowd-stage-lights-night-performance.jpg",
    "type": "photo",
    "changes": "Conversion en WebP et redimensionnement, recadrage visuel par le navigateur."
  },
  "racing": {
    "creditKey": "racing",
    "src": "/assets/racing-hero.webp",
    "label": "Illustration IA · sports mécaniques",
    "title": "sports mécaniques",
    "author": "Illustration générée pour StreamGen",
    "license": "Image générée par IA",
    "licenseUrl": null,
    "sourceUrl": null,
    "type": "ai",
    "changes": "Illustration générique de discipline ; aucune scène ou personne réelle revendiquée."
  },
  "stadium": {
    "creditKey": "stadium",
    "src": "/assets/stadium-hero.webp",
    "label": "Illustration IA · football américain",
    "title": "football américain",
    "author": "Illustration générée pour StreamGen",
    "license": "Image générée par IA",
    "licenseUrl": null,
    "sourceUrl": null,
    "type": "ai",
    "changes": "Illustration générique de discipline ; aucune scène ou personne réelle revendiquée."
  },
  "esport": {
    "creditKey": "esport",
    "src": "/assets/esport-hero.webp",
    "label": "Illustration IA · univers du jeu vidéo",
    "title": "univers du jeu vidéo",
    "author": "Illustration générée pour StreamGen",
    "license": "Image générée par IA",
    "licenseUrl": null,
    "sourceUrl": null,
    "type": "ai",
    "changes": "Illustration générique de discipline ; aucune scène ou personne réelle revendiquée."
  },
  "ping": {
    "creditKey": "ping",
    "src": "/assets/ping-hero.png",
    "label": "Illustration IA · tennis de table",
    "title": "tennis de table",
    "author": "Illustration générée pour StreamGen",
    "license": "Image générée par IA",
    "licenseUrl": null,
    "sourceUrl": null,
    "type": "ai",
    "changes": "Illustration générique de discipline ; aucune scène ou personne réelle revendiquée."
  }
};
Object.assign(IMAGE_LIBRARY, {
  "pgw-2026": {
    "creditKey": "pgw-2026",
    "src": "/assets/events/pgw-2026-official.webp",
    "label": "Affiche officielle · PGW 2026",
    "title": "Affiche officielle horizontale Paris Games Week 2026",
    "author": "Paris Games Week / organisateurs et ayants droit indiqués sur l’affiche",
    "license": "Support officiel de l’espace presse · usage éditorial relatif à la PGW, pas une licence libre",
    "licenseUrl": "https://www.parisgamesweek.com/fr/espace-presse",
    "sourceUrl": "https://www.parisgamesweek.com/fr/espace-presse",
    "originalUrl": "https://drive.google.com/file/d/1_dUHzXmd-pofl0pMeag8q1z-Wx2qcrcK/view",
    "type": "press",
    "scope": "event",
    "eventYear": 2026,
    "fit": "contain",
    "changes": "Première page de l’affiche officielle horizontale, conversion en WebP pour présentation éditoriale. Aucun partenariat ni validation de StreamGen par les organisateurs."
  },
  "worlds-2025": {
    "creditKey": "worlds-2025",
    "src": "/assets/events/worlds-2025-archive.webp",
    "label": "Capture vidéo · Worlds 2025 (archive)",
    "title": "IG vs T1 — Worlds 2025 Play-in",
    "author": "Fomos Esports",
    "license": "CC BY 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:IG_vs_T1_-_2025_Worlds_Play-in.jpg",
    "originalUrl": "https://www.youtube.com/watch?v=n6K6eWAHruQ",
    "type": "photo",
    "scope": "archive",
    "eventYear": 2025,
    "changes": "Conversion en WebP et redimensionnement. Capture de l’édition 2025 : ne représente ni la scène, ni les affiches ni les participants confirmés de l’édition 2026."
  }
});
Object.assign(IMAGE_LIBRARY, {
  "zerator": {
    "creditKey": "zerator",
    "src": "/assets/creators/zerator.webp",
    "label": "ZeratoR · portrait au ZEVENT 2025",
    "title": "ZeratoR lors du ZEVENT 2025 - 06.jpg",
    "author": "Mickaël Schauli",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:ZeratoR_lors_du_ZEVENT_2025_-_06.jpg",
    "type": "photo",
    "scope": "creator",
    "eventYear": 2025,
    "changes": "Portrait du créateur photographié au ZEVENT 2025. Illustration de son identité, pas une photographie du stream annoncé. Conversion WebP et redimensionnement ; aucun partenariat revendiqué."
  }
});
export function automaticEventVisual(e={}){
 const v=e.sourceImage;
 if(!v||v.approved!==true||v.binding!==e.id||!/^\/assets\/auto-images\/[a-f0-9]{24}\.(jpg|png)$/.test(v.src||'')||!/^auto-[a-f0-9]{24}$/.test(v.creditKey||'')||!v.author||!v.label)return null;
 if(!['event','archive','creator'].includes(v.scope))return null;
 if(v.scope==='event'&&String(v.eventYear)!==String(e.date).slice(0,4))return null;
 if(v.scope==='archive'&&(!v.eventYear||v.eventYear>=+String(e.date).slice(0,4)))return null;
 if(v.scope==='creator'&&e.category!=='créateurs')return null;
 if(!/^(CC BY(?:-SA)? (2\.0|2\.5|3\.0|4\.0)|CC0|Public domain)$/.test(v.license||''))return null;
 try{if(new URL(v.sourceUrl).protocol!=='https:')return null;const license=new URL(v.licenseUrl);if(!['creativecommons.org','commons.wikimedia.org'].includes(license.hostname)||!['https:','http:'].includes(license.protocol)||license.port||license.username||license.password)return null}catch{return null}
 return v;
}
const CONTEXT_PHOTOS={"chess": {"creditKey": "photo-chess", "src": "/assets/library/chess-photo.jpg", "label": "Photo d’illustration · échecs", "title": "Chess game Staunton No. 6 perfil view 8.jpg", "author": "Wilfredor", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Chess_game_Staunton_No._6_perfil_view_8.jpg", "scope": "illustration", "changes": "Photo de contexte sous licence libre ; ne représente pas l’événement annoncé. Recadrage d’affichage."}, "dota": {"creditKey": "photo-dota", "src": "/assets/library/dota-photo.jpg", "label": "Photo d’archive · Dota 2, The International 2011", "title": "The International Dota 2 video game tournament.jpg", "author": "YJ", "license": "CC BY-SA 2.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0", "sourceUrl": "https://commons.wikimedia.org/wiki/File:The_International_Dota_2_video_game_tournament.jpg", "scope": "illustration", "changes": "Photo de contexte sous licence libre ; ne représente pas l’événement annoncé. Recadrage d’affichage.", "eventYear": 2011}, "counterstrike": {"creditKey": "photo-counterstrike", "src": "/assets/library/counterstrike-photo.jpg", "label": "Photo d’archive · PGL Copenhague 2024", "title": "PGL CS2 Major Copenhagen 2024 stage - 02.jpg", "author": "European Parliament", "license": "CC BY 2.0", "licenseUrl": "https://creativecommons.org/licenses/by/2.0", "sourceUrl": "https://commons.wikimedia.org/wiki/File:PGL_CS2_Major_Copenhagen_2024_stage_-_02.jpg", "scope": "illustration", "changes": "Photo de contexte sous licence libre ; ne représente pas l’événement annoncé. Recadrage d’affichage.", "eventYear": 2024}, "valorant": {"creditKey": "photo-valorant", "src": "/assets/library/valorant-photo.jpg", "label": "Photo d’archive · VALORANT Istanbul 2022", "title": "Valorant Champions İstanbul 2022.jpg", "author": "Emriquet", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Valorant_Champions_%C4%B0stanbul_2022.jpg", "scope": "illustration", "changes": "Photo de contexte sous licence libre ; ne représente pas l’événement annoncé. Recadrage d’affichage.", "eventYear": 2022}};
for(const [key,photo]of Object.entries(CONTEXT_PHOTOS))IMAGE_LIBRARY['photo-'+key]=photo;
export function eventVisual(e={}){
 const topic=String(e.subcategory||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 const title=String(e.title||'').toLowerCase();
 const automatic=automaticEventVisual(e);
 if(automatic?.scope==='event')return automatic;
 if(/paris games week|\bpgw\b/.test(title)&&(!e.date||e.date.startsWith('2026-')))return IMAGE_LIBRARY['pgw-2026'];
 if(automatic?.scope==='archive')return automatic;
 if(/worlds/.test(title)&&(/lol|league/.test(title)||topic==='league of legends'))return IMAGE_LIBRARY['worlds-2025'];
 if(e.visualKey&&IMAGE_LIBRARY[e.visualKey])return IMAGE_LIBRARY[e.visualKey];
 if(e.category==='créateurs'&&/cooking|cuisine/.test(topic+' '+title))return IMAGE_LIBRARY.cooking;
 if(automatic?.scope==='creator'&&(!IMAGE_LIBRARY.zerator.eventYear||automatic.eventYear>=IMAGE_LIBRARY.zerator.eventYear||!/^zerator$/i.test(e.organizer||'')))return automatic;
 if(e.category==='créateurs'&&(/^(zerator)$/i.test(e.organizer||'')||/^zerator\s*[—-]/.test(title)))return IMAGE_LIBRARY.zerator;
 const game=/dota/.test(topic)?'dota':/counter.?strike/.test(topic)?'counterstrike':/valorant/.test(topic)?'valorant':/echecs|chess/.test(topic)?'chess':null;
 if(game&&(!automatic||automatic.scope==='illustration'))return IMAGE_LIBRARY['photo-'+game];
 if(automatic)return automatic;
 let key=topic==='formule 1'?'racing':topic==='football americain'?'stadium':topic==='tennis de table'?'ping':/badminton/.test(topic)?'badminton':/gymnast/.test(topic)?'gymnastics':/aquatic|natation|swimming/.test(topic)?'swimming':/voile|sailing/.test(topic)?'sailing':/judo/.test(topic)?'judo':/espace|space/.test(topic)?'space':/cooking|cuisine/.test(topic)?'cooking':/paris games week|\bpgw\b/.test(title)||e.category==='esport'||(e.category!=='créateurs'&&/fortnite|league of legends/.test(topic))?'esport':e.category==='créateurs'?'creator':'generic';
 return IMAGE_LIBRARY[key];
}
export function imageCredit(e){
 const v=eventVisual(e),safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<a href="/credits-images/#${v.creditKey}" class="image-credit-link">${safe(v.label)} · crédits</a>`;
}

// Local official favicons; never ask visitors' browsers to contact an icon provider.
export function serviceIcon(service={}){
 const input=typeof service==='string'?{platform:service}:service||{};
 const label=String(input.label||input.name||input.platform||'').toLowerCase();
 let host='';try{host=new URL(input.url).hostname.replace(/^www\./,'')}catch{}
 const icons=['canalplus.com','capcomfrance.fr','formula1.com','france.tv','ijf.org','lequipe.fr','plus.nasa.gov','twitch.tv','youtube.com'];
 const aliases={'francetvpub.fr':'france.tv','francetvpro.fr':'france.tv','api.twitch.tv':'twitch.tv'};
 host=aliases[host]||host;
 if(!host)host=label.includes('twitch')?'twitch.tv':label.includes('youtube')?'youtube.com':label.includes('canal+')?'canalplus.com':/france [23]|france.tv/.test(label)?'france.tv':label.includes('équipe')?'lequipe.fr':label.includes('nasa')?'plus.nasa.gov':label.includes('formula 1')?'formula1.com':'';
 if(!host){host=label.includes('kick')?'kick.com':label.includes('lichess')?'lichess.org':label.includes('chess.com')?'chess.com':''}
 if(host&&/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host))return `<img class="service-icon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&amp;sz=64" alt="" aria-hidden="true" width="24" height="24" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;

 const tv=input.platform==='TV';
 return `<svg class="service-icon service-icon-fallback" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${tv?'<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8M12 18v3M8 2l4 3 4-3"/>':'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>'}</svg>`;
}
