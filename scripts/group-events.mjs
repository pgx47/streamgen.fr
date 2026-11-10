import{publishableEvent}from'./editorial-policy.mjs';
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={dendelecs:'dendele',auroragaming:'aurora',nemigagaming:'nemiga',teamvitality:'vitality','9zteam':'9z','9zglobant':'9z',teamliquid:'liquid',teamspirit:'spirit',g2esports:'g2',betboomteam:'betboom'};
const team=s=>aliases[norm(s)]||norm(s);
const unique=(xs,key)=>[...new Map(xs.map(x=>[key(x),x])).values()];
const cadences=new Set(['classical','rapid','blitz','bullet','armageddon','standard','chess960','fischerrandom']);
// « Tournoi | Section » ou « Tournoi | Section | Cadence » : les tableaux d'un même tournoi se regroupent,
// sauf cadences distinctes, qui restent des rendez-vous séparés.
const lichessSections=e=>{const parts=String(e.title||'').split('|').map(s=>s.trim());if(parts.length<2||!parts[0])return null;const rest=parts.slice(1),last=norm(parts.at(-1));return{base:parts[0],rest,cadence:cadences.has(last)?last:''}};
export function groupEvents(input){
 const groups=new Map();
 for(const e of input.filter(publishableEvent)){let key='id:'+e.id;
  if(/PGL.*(?:2026.*Masters|Masters.*2026)/i.test(e.title)&&/counter.?strike/i.test(e.subcategory)&&e.participants?.length===2&&e.start)key='pgl-masters-2026|'+e.start+'|'+e.participants.map(team).sort().join('|');
  const lichess=e.sources.some(s=>s.sourceId==='lichess')?lichessSections(e):null;
  if(lichess)key='lichess|'+norm(lichess.base)+'|'+e.date+(lichess.cadence?'|'+lichess.cadence:'');
  if(e.category==='esport'&&e.date&&(e.id.startsWith('lp-')||e.externalTournamentUrl||e.id.startsWith('pgl-'))){const tournament=/PGL.*(?:2026.*Masters|Masters.*2026)/i.test(e.title)?'PGL Masters Bucharest 2026':e.title.split(' · ')[0];if(tournament!==e.title||e.externalTournamentUrl)key='esport-day|'+norm(tournament)+'|'+e.date}
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);
 }
 return [...groups.values()].map(es=>{
  const ranked=[...es].sort((a,b)=>Number(b.id.startsWith('pgl-'))-Number(a.id.startsWith('pgl-'))||a.id.localeCompare(b.id));const main=structuredClone(ranked[0]);if(es.length===1)return main;
  main.groupedEvents=es.map(e=>({id:e.id,slug:e.slug,title:e.title,participants:e.participants,start:e.start,sources:e.sources,broadcastOptions:e.broadcastOptions}));
  main.sources=unique(es.flatMap(e=>e.sources),s=>s.sourceId+'|'+s.url);main.broadcastOptions=unique(es.flatMap(e=>e.broadcastOptions.map(b=>e.sources.some(s=>s.sourceId==='lichess')?{...b,label:'Lichess · '+e.title.split('|').slice(1).join(' · ').trim()}:b)),b=>b.url+'|'+b.language+'|'+b.countries.join(','));
  main.participants=unique(ranked.flatMap(e=>e.participants),team);main.notes=[...new Set(es.flatMap(e=>e.notes||[]))];main.notes.push('Fiche regroupée : les sources et options de diffusion des annonces correspondantes sont réunies.');
  main.mergedAliases=unique(es.flatMap(e=>[{id:e.id,slug:e.slug},...(e.mergedAliases||[])]),e=>e.id).filter(e=>e.id!==main.id);
  if(main.sources.some(s=>s.sourceId==='lichess')){const parts=es.map(e=>({e,s:lichessSections(e)})).filter(x=>x.s);const first=parts[0]?.s,cadence=first?.cadence||'',ends=[...new Set(es.map(e=>e.end).filter(Boolean))];main.start=es.map(e=>e.start).filter(Boolean).sort()[0]||null;main.end=ends.length===1?ends[0]:null;main.title=cadence&&first?first.base+' — '+first.rest.at(-1):first?.base||main.title;main.summary='Les différents tableaux de ce tournoi sont réunis ici. Choisissez votre section dans les options de retransmission ci-dessous.';main.schedule=parts.map(({e,s})=>({label:s.rest.join(' · ')||s.base,start:e.start}));}
  if(main.category==='esport'){const tournament=/PGL.*(?:2026.*Masters|Masters.*2026)/i.test(main.title)?'PGL Masters Bucharest 2026':main.title.split(' · ')[0];main.title=tournament+' — programme du '+main.date.slice(8,10)+'/'+main.date.slice(5,7);main.start=es.map(e=>e.start).filter(Boolean).sort()[0]||null;main.end=null;main.schedule=unique(es.flatMap(e=>e.groupedEvents||[e]),e=>e.start+'|'+((e.participants||[]).length===2?e.participants.map(team).sort().join('|'):e.title.replace(/^Counter-Strike 2 · /,''))).map(e=>({label:e.title,start:e.start})).filter(e=>e.start);main.summary='Les sessions de cette journée sont réunies dans cette fiche. Retrouvez les horaires et affiches dans le programme, ainsi que les sources et options de retransmission ci-dessous.';}
  main.confirmation='Annonces regroupées · '+main.sources.length+' sources consultables';return main;
 });
}
