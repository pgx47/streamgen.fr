const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={dendelecs:'dendele',auroragaming:'aurora',nemigagaming:'nemiga',teamvitality:'vitality','9zteam':'9z','9zglobant':'9z',teamliquid:'liquid',teamspirit:'spirit',g2esports:'g2',betboomteam:'betboom'};
const team=s=>aliases[norm(s)]||norm(s);
const unique=(xs,key)=>[...new Map(xs.map(x=>[key(x),x])).values()];
export function groupEvents(input){
 const groups=new Map();
 for(const e of input){let key='id:'+e.id;
  if(/PGL.*(?:2026.*Masters|Masters.*2026)/i.test(e.title)&&/counter.?strike/i.test(e.subcategory)&&e.participants?.length===2&&e.start)key='pgl-masters-2026|'+e.start+'|'+e.participants.map(team).sort().join('|');
  if(e.sources.some(s=>s.sourceId==='lichess')&&/^English Chess Championships 2026\s*\|/i.test(e.title))key='english-chess-2026|'+e.date+'|'+norm(e.title.split('|').at(-1));
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);
 }
 return [...groups.values()].map(es=>{
  const ranked=[...es].sort((a,b)=>Number(b.id.startsWith('pgl-'))-Number(a.id.startsWith('pgl-'))||a.id.localeCompare(b.id));const main=structuredClone(ranked[0]);if(es.length===1)return main;
  main.groupedEvents=es.map(e=>({id:e.id,slug:e.slug,title:e.title,start:e.start,sources:e.sources,broadcastOptions:e.broadcastOptions}));
  main.sources=unique(es.flatMap(e=>e.sources),s=>s.sourceId+'|'+s.url);main.broadcastOptions=unique(es.flatMap(e=>e.broadcastOptions.map(b=>e.sources.some(s=>s.sourceId==='lichess')?{...b,label:'Lichess · '+e.title.split('|').slice(1).join(' · ').trim()}:b)),b=>b.url+'|'+b.language+'|'+b.countries.join(','));
  main.participants=unique(ranked.flatMap(e=>e.participants),team);main.notes=[...new Set(es.flatMap(e=>e.notes||[]))];main.notes.push('Fiche regroupée : les sources et options de diffusion des annonces correspondantes sont réunies.');
  main.mergedAliases=unique(es.flatMap(e=>[{id:e.id,slug:e.slug},...(e.mergedAliases||[])]),e=>e.id).filter(e=>e.id!==main.id);
  if(main.sources.some(s=>s.sourceId==='lichess')){main.start=es.map(e=>e.start).filter(Boolean).sort()[0]||null;main.end=null;main.title='English Chess Championships 2026 — '+es[0].title.split('|').at(-1).trim();main.summary='Les différents tableaux du championnat sont réunis ici. Choisissez votre section dans les options de retransmission ci-dessous.';main.schedule=es.map(e=>({label:e.title.split('|').slice(1).join(' · ').trim(),start:e.start}));}
  main.confirmation='Annonces regroupées · '+main.sources.length+' sources consultables';return main;
 });
}
