const months={JANVIER:'01',FEVRIER:'02',MARS:'03',AVRIL:'04',MAI:'05',JUIN:'06',JUILLET:'07',AOUT:'08',SEPTEMBRE:'09',OCTOBRE:'10',NOVEMBRE:'11',DECEMBRE:'12'};
export function parseWttDay(html,url){
 const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]*>/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const match=heading?.match(/(\d{1,2})\s+([A-Z]+)\s+(20\d{2})/);
 if(!match||!months[match[2]])throw Error('Date explicite absente du titre officiel');
 const date=`${match[3]}-${months[match[2]]}-${match[1].padStart(2,'0')}`;
 const path=new URL(url).pathname.match(/_(\d{2})_([a-z]+)_(20\d{2})$/);
 if(!path||`${path[3]}-${months[path[2].toUpperCase()]}-${path[1]}`!==date)throw Error('Édition ou date contradictoire');
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ');
 const times=[...text.matchAll(/Session\s+\d+\s+dès\s+(\d{1,2})h(\d{2})/gi)].map(m=>`${m[1].padStart(2,'0')}:${m[2]}`);
 if(times.length!==2||times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('Deux horaires de session explicites requis');
 return {date,times:[...new Set(times)]};
}
export function mergeCollectedEvents(previous,patches){const map=new Map(previous.map(e=>[e.id,structuredClone(e)]));for(const p of patches)map.set(p.id,{...map.get(p.id),...p});return [...map.values()];}
