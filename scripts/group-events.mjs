import{publishableEvent}from'./editorial-policy.mjs';
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const unique=(xs,key)=>[...new Map(xs.map(x=>[key(x),x])).values()];
const aliases={dendelecs:'dendele',auroragaming:'aurora',nemigagaming:'nemiga',teamvitality:'vitality','9zteam':'9z','9zglobant':'9z',teamliquid:'liquid',teamspirit:'spirit',g2esports:'g2',betboomteam:'betboom'};
const team=s=>aliases[norm(s)]||norm(s);
const sourceIds=e=>(e.sources||[]).map(s=>String(s?.sourceId||''));
const hasSource=(e,prefix)=>sourceIds(e).some(id=>id.startsWith(prefix));
const parisDay=iso=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
const ddmm=key=>key.slice(8,10)+'/'+key.slice(5,7);
const cadences=new Set(['classical','rapid','blitz','bullet','armageddon','standard','chess960','fischerrandom']);
// « Tournoi | Section » ou « Tournoi | Section | Cadence » : les tableaux d'un même tournoi se regroupent,
// sauf cadences distinctes, qui restent des rendez-vous séparés.
const lichessSections=e=>{const parts=String(e.title||'').split('|').map(s=>s.trim());if(parts.length<2||!parts[0])return null;const rest=parts.slice(1),last=norm(parts.at(-1));return{base:parts[0],rest,cadence:cadences.has(last)?last:''}};
// Le titre d'un match esport est « Tournoi · Phase — Équipe A vs Équipe B ». On retire la dernière affiche
// pour retrouver l'identité du tournoi ; les titres sans affiche gardent leur phase.
const esportBase=t=>{const s=String(t||'').trim(),i=s.lastIndexOf(' — ');return i>0?s.slice(0,i).trim():s};
const pglTournament=e=>{const parts=String(e.title||'').split(' · ');return (parts[1]||parts[0]||e.organizer||'').split(' — ')[0].trim()};
// Un tournoi reste un seul rendez-vous, quelle que soit sa durée. start/end couvrent l'événement,
// le programme détaille les sessions ; aucune fiche par match ni par journée.
function tournamentKey(e){
 if(e.category!=='esport')return null;
 if(hasSource(e,'startgg'))return null;
 if(hasSource(e,'lichess'))return null;
 if(hasSource(e,'pgl-'))return 'pgl|'+norm(pglTournament(e));
 if(hasSource(e,'lp-'))return 'lp|'+norm(e.organizer||e.title.split(' · ')[0]);
 return 'esport|'+norm(esportBase(e.title))+'|'+norm(e.subcategory);
}
// Titres identiques (même événement repris chaque jour par une chaîne) : un seul rendez-vous,
// à condition de rester dans une fenêtre de trois semaines.
function repeatKey(e){
 if(e.category==='esport'||e.category==='créateurs')return null;
 if((e.participants||[]).length)return null;
 const title=norm(e.title);
 return title?('title|'+title+'|'+norm(e.subcategory)):null;
}
function splitByGap(es){
 const dated=[...es].sort((a,b)=>String(a.date||a.start||'').localeCompare(String(b.date||b.start||'')));
 const parts=[[dated[0]]];
 for(const e of dated.slice(1)){
  const prev=parts.at(-1).at(-1),a=e.date||String(e.start||'').slice(0,10),b=prev.date||String(prev.start||'').slice(0,10),days=(Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000;
  if(days>14)parts.push([e]);else parts.at(-1).push(e);
 }
 return parts;
}
const sessionStart=e=>e.start||(e.date?e.date+'T12:00:00Z':null);
const sessionWho=e=>(e.participants||[]).length===2?e.participants.join(' vs '):null;
const cleanTitle=e=>String(e.title||'').replace(/\s*[—–]\s*Affiche à confirmer.*$/i,'').replace(/\s*[—–]\s*Bo\d\s*$/i,'').trim();
function sessionLabel(e){
 const at=sessionStart(e),day=at?ddmm(parisDay(at)):'date à confirmer';
 const who=sessionWho(e);
 if(who)return day+' · '+who;
 const segs=cleanTitle(e).split(/\s+[—–]\s+/).map(s=>s.trim()).filter(Boolean);
 const tail=segs.at(-1)||'',parts=tail.split(' · ').map(s=>s.trim()).filter(Boolean);
 const phase=parts.length>1?parts.at(-1):tail;
 return phase&&norm(phase)!==norm(esportBase(e.title))?day+' · '+phase:day;
}
// Une affiche connue remplace le créneau « affiche à confirmer » du même horaire, et une même
// affiche annoncée par deux sources à quelques minutes d'écart ne compte qu'une fois.
function pruneSessions(list){
 const clean=[...list].filter(s=>s&&s.start).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
 const known=new Set(clean.filter(s=>/ vs /.test(s.label)).map(s=>s.start));
 const seen=new Set(),out=[];
 for(const s of clean){
  if(/affiche à confirmer/i.test(s.label)&&known.has(s.start))continue;
  const teams=/ vs /.test(s.label)?s.label.split(' · ').slice(1).join(' · ').split(' vs ').map(team).sort().join('|'):null;
  const key=teams?parisDay(s.start)+'|'+teams:s.start+'|'+s.label;
  if(seen.has(key))continue;
  seen.add(key);out.push(s);
 }
 return out;
}
function mergeTournament(es){
 const withStart=es.filter(e=>e.start).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
 const ranked=[...es].sort((a,b)=>Number(!a.start)-Number(!b.start)||String(a.start||a.date).localeCompare(String(b.start||b.date))||String(a.id).localeCompare(String(b.id)));
 const main=structuredClone(ranked[0]);
 const last=withStart.map(e=>e.end?Date.parse(e.end):Date.parse(e.start)).sort((a,b)=>a-b).at(-1);
 if(withStart.length){main.start=withStart[0].start;main.end=last?new Date(last).toISOString():null;main.date=parisDay(withStart[0].start);}
 const isEsport=main.category==='esport';
 const tournament=isEsport?(hasSource(main,'lp-')?main.organizer||esportBase(main.title):hasSource(main,'pgl-')?pglTournament(main):esportBase(main.title)):main.title;
 if(tournament)main.title=tournament;
 if(main.start)main.date=parisDay(main.start);
 main.groupedEvents=es.map(e=>({id:e.id,slug:e.slug,title:e.title,participants:e.participants,start:e.start,end:e.end,sources:e.sources,broadcastOptions:e.broadcastOptions}));
 main.sources=unique(es.flatMap(e=>e.sources||[]),s=>s.sourceId+'|'+s.url);
 main.broadcastOptions=unique(es.flatMap(e=>e.broadcastOptions||[]),b=>b.url+'|'+b.language+'|'+b.countries.join(','));
 main.participants=unique(es.flatMap(e=>e.participants||[]),team).filter(Boolean);
 main.notes=[...new Set(es.flatMap(e=>e.notes||[]))];
 main.notes.push('Fiche unique : les sessions de ce tournoi sont réunies, les jours sans session restent dans la période affichée.');
 const sessions=es.map(e=>({label:sessionLabel(e),start:sessionStart(e),who:sessionWho(e)})).filter(s=>s.start)
  .sort((a,b)=>Date.parse(b.start)-Date.parse(a.start)); // unique garde la dernière valeur : l'horaire le plus tôt l'emporte
 main.schedule=unique(sessions,s=>s.who?s.start+'|'+s.who.split(' vs ').map(team).sort().join('|'):s.start+'|'+s.label)
  .map(({label,start})=>({label,start}));
 main.schedule=pruneSessions(main.schedule);
 if(main.schedule.length>60){main.schedule=main.schedule.slice(0,60);main.notes.push('Le programme affiche les 60 premières sessions annoncées.');}
 main.summary=isEsport?`Tournoi réunissant ${main.schedule.length} sessions annoncées. Une seule fiche pour suivre l’événement ; le programme détaille les horaires et les affiches connues.`:`${main.schedule.length} diffusions annoncées pour ce rendez-vous, réunies dans une seule fiche.`;
 main.mergedAliases=unique(es.flatMap(e=>[{id:e.id,slug:e.slug},...(e.mergedAliases||[])]),a=>a.id).filter(a=>a.id!==main.id);
 main.confirmation='Annonces regroupées · '+main.sources.length+' sources consultables';
 main.status=main.end&&Date.parse(main.end)>=Date.now()&&main.status==='Terminé'?'À venir':main.status;
 if(!main.organizer&&isEsport)main.organizer=tournament;
 return main;
}
function mergeLichess(es){
 const ranked=[...es].sort((a,b)=>Number(!a.start)-Number(!b.start)||String(a.start||a.date).localeCompare(String(b.start||b.date))||String(a.id).localeCompare(String(b.id)));
 const main=structuredClone(ranked[0]);
 const parts=es.map(e=>({e,s:lichessSections(e)})).filter(x=>x.s);
 const first=parts[0]?.s,cadence=first?.cadence||'';
 const ends=[...new Set(es.map(e=>e.end).filter(Boolean))];
 main.start=es.map(e=>e.start).filter(Boolean).sort()[0]||null;
 main.end=ends.length===1?ends[0]:null;
 main.title=cadence&&first?first.base+' — '+first.rest.at(-1):first?.base||main.title;
 main.summary='Les différents tableaux ou sections de ce tournoi sont réunis ici. Choisissez votre section dans les options de retransmission ci-dessous.';
 main.schedule=parts.map(({e,s})=>({label:s.rest.join(' · ')||s.base,start:e.start}));
 main.groupedEvents=es.map(e=>({id:e.id,slug:e.slug,title:e.title,participants:e.participants,start:e.start,end:e.end,sources:e.sources,broadcastOptions:e.broadcastOptions}));
 main.sources=unique(es.flatMap(e=>e.sources||[]),s=>s.sourceId+'|'+s.url);
 main.broadcastOptions=unique(es.flatMap(e=>e.broadcastOptions.map(b=>({...b,label:'Lichess · '+(e.title.split('|').slice(1).join(' · ').trim()||b.label)}))),b=>b.url+'|'+b.language+'|'+b.countries.join(','));
 main.participants=unique(es.flatMap(e=>e.participants||[]),team).filter(Boolean);
 main.notes=[...new Set(es.flatMap(e=>e.notes||[]))];
 main.notes.push('Fiche regroupée : les sources et options de diffusion des annonces correspondantes sont réunies.');
 main.mergedAliases=unique(es.flatMap(e=>[{id:e.id,slug:e.slug},...(e.mergedAliases||[])]),a=>a.id).filter(a=>a.id!==main.id);
 main.confirmation='Annonces regroupées · '+main.sources.length+' sources consultables';
 return main;
}

// Deux chaînes peuvent diffuser le même rendez-vous : même affiche et même créneau, ou même
// intitulé à quelques minutes d'écart. La fiche absorbe l'autre, qui devient une redirection.
const STOP=new Set(['the','and','vs','for','with','from','live','direct','officiel','official','en','le','la','les','de','des','du','un','une','et','aux','sur','dans','pour','par']);
const words=s=>new Set(String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/&/g,' et ').replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w&&!STOP.has(w)&&!/^20\d\d$/.test(w)));
// « Group A » et « Group B » ne sont pas le même rendez-vous : une inclusion ne vaut
// que si les mots en plus sont signifiants (Bucharest, Playoffs…).
function titleMatch(a,b){
 const wa=words(a),wb=words(b);
 if(!wa.size||!wb.size)return false;
 const [small,big]=wa.size<=wb.size?[wa,wb]:[wb,wa];
 if(![...small].every(w=>big.has(w)))return false;
 return [...big].filter(w=>!small.has(w)).every(w=>w.length>2)&&wa.size!==wb.size||[...big].every(w=>small.has(w))&&wa.size===wb.size;
}
const teamSet=e=>(e.participants||[]).length===2?new Set(e.participants.map(team)):null;
function sameRendezVous(a,b){
 if(a.id===b.id||a.category!==b.category)return false;
 const at=Date.parse(a.start||''),bt=Date.parse(b.start||'');
 if(!Number.isFinite(at)||!Number.isFinite(bt))return false;
 const gap=Math.abs(at-bt),pa=teamSet(a),pb=teamSet(b);
 if(pa&&pb&&[...pa].every(x=>pb.has(x)))return gap<=30*60000;
 if(gap>15*60000)return false;
 return titleMatch(a.title,b.title);
}
function absorb(main,other){
 main.sources=unique([...(main.sources||[]),...(other.sources||[])],s=>s.sourceId+'|'+s.url);
 main.broadcastOptions=unique([...(main.broadcastOptions||[]),...(other.broadcastOptions||[])],b=>b.url+'|'+b.language+'|'+(b.countries||[]).join(','));
 main.participants=unique([...(main.participants||[]),...(other.participants||[])],team).filter(Boolean);
 main.schedule=pruneSessions([...(main.schedule||[]),...(other.schedule||[])]);
 main.notes=[...new Set([...(main.notes||[]),...(other.notes||[]),'Plusieurs chaînes diffusent ce rendez-vous : les options ci-dessous sont réunies.'])];
 main.groupedEvents=[...(main.groupedEvents||[]),...(other.groupedEvents||[other]),].filter(x=>x&&x.id!==main.id);
 main.mergedAliases=unique([...(main.mergedAliases||[]),...(other.mergedAliases||[]),{id:other.id,slug:other.slug}],a=>a.id).filter(a=>a.id!==main.id);
 if(other.frenchPresence===true&&main.frenchPresence!==true){main.frenchPresence=true;main.frenchNote=other.frenchNote}
 if(other.major===true)main.major=true;
 return main;
}
const sessionKeys=e=>{
 const list=(e.groupedEvents&&e.groupedEvents.length?e.groupedEvents:[e]);
 return list.filter(x=>(x.participants||[]).length===2&&x.start).map(x=>x.start+'|'+x.participants.map(team).sort().join('|'));
};
// Deux fiches qui listent la même affiche au même horaire sont le même tournoi,
// même si les sources le nomment différemment (« PGL 2026 Masters » / « PGL Masters Bucharest 2026 »).
function shareSession(a,b){
 const A=new Set(sessionKeys(a));
 if(!A.size)return false;
 return sessionKeys(b).some(k=>A.has(k));
}
function mergeDuplicates(events){
 const ordered=[...events].sort((a,b)=>String(a.start||a.date).localeCompare(String(b.start||b.date))||String(a.id).localeCompare(String(b.id)));
 const out=[];
 for(const e of ordered){
  const twin=out.find(x=>Math.abs(Date.parse(x.date)-Date.parse(e.date))<=3*86400000&&(sameRendezVous(x,e)||shareSession(x,e)));
  if(twin)absorb(twin,e);else out.push(e);
 }
 return out;
}
export function groupEvents(input){
 const groups=new Map();
 for(const e of input.filter(publishableEvent)){
  let key='id:'+e.id;
  const lichess=hasSource(e,'lichess')?lichessSections(e):null;
  if(lichess)key='lichess|'+norm(lichess.base)+'|'+e.date+(lichess.cadence?'|'+lichess.cadence:'');
  else{const tk=tournamentKey(e)||repeatKey(e);if(tk)key=tk}
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);
 }
 const out=[];
 for(const es of groups.values()){
  if(es.length===1){out.push(es[0]);continue}
  if(hasSource(es[0],'lichess')){out.push(mergeLichess(es));continue}
  for(const part of splitByGap(es))out.push(part.length===1?part[0]:mergeTournament(part));
 }
 return mergeDuplicates(out);
}
