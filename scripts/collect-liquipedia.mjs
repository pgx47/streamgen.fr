import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{parseMatchesPage,parseTournamentStreams,streamURL,tournamentName}from'./collectors/liquipedia.mjs';
const now=new Date().toISOString();
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
const WIKIS=[
 {wiki:'counterstrike',game:'Counter-Strike'},
 {wiki:'dota2',game:'Dota 2'},
 {wiki:'rocketleague',game:'Rocket League'},
];
const MAX_MATCHES=30,MAX_TOURNAMENTS=8,UA={'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)','Accept-Encoding':'gzip'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function page(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:UA});if(!r.ok)throw Error('HTTP '+r.status);const chunks=[];let size=0;for await(const c of r.body){size+=c.length;if(size>2500000)throw Error('Page trop volumineuse');chunks.push(c)}return Buffer.concat(chunks).toString('utf8')}
const api=(wiki,pageName)=>'https://liquipedia.net/'+wiki+'/api.php?action=parse&page='+encodeURIComponent(pageName)+'&prop=text&format=json';
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),status=await read('public/collection-status.json');
const report=[],observedAll=new Set();let added=0,updated=0;
for(const {wiki,game} of WIKIS){
 const id='lp-'+wiki,url='https://liquipedia.net/'+wiki+'/Liquipedia:Matches';
 try{
  const json=JSON.parse(await page(api(wiki,'Liquipedia:Matches')));await sleep(2100);
  const html=json?.parse?.text?.['*'];if(!html)throw Error('Réponse API sans contenu');
  const matches=parseMatchesPage(html,wiki).filter(m=>Date.parse(m.start)>Date.now()-3*3600000).slice(0,MAX_MATCHES);
  const tournPaths=[...new Set(matches.map(m=>m.tournamentPath).filter(Boolean))].slice(0,MAX_TOURNAMENTS);
  const tournStreams=new Map();
  for(const p of tournPaths){
   try{const tj=JSON.parse(await page(api(wiki,p.replace(/^\/[^/]+\//,''))));const th=tj?.parse?.text?.['*'];if(th)tournStreams.set(p,parseTournamentStreams(th))}catch{}
   await sleep(2100);
  }
  const observed=new Set();
  for(const m of matches){
   const tname=m.tournament?tournamentName(m.tournament.split('#')[0]):null;
   const title=(tname?tname+(m.stage?' · '+m.stage:''):game)+' — '+(m.opponents.length>=2?m.opponents.slice(0,2).join(' vs '):m.opponents[0]||'Affiche à confirmer')+(m.bo?' · Bo'+m.bo:'');
   const eid='lp-'+wiki+'-'+createHash('sha256').update(m.start+'|'+m.opponents.join('|')+'|'+(m.tournament||'')).digest('hex').slice(0,12);
   const streams=[...(tournStreams.get(m.tournamentPath)||[]),...m.streams.map(s=>{const i=s.indexOf('/');return i<0?null:{platform:s.slice(0,i).toLowerCase(),channel:s.slice(i+1)}}).filter(Boolean)];
   const seen=new Set(),options=[];
   for(const s of streams){
    const u=streamURL(s);if(!u)continue;const key=s.platform+'|'+s.channel.toLowerCase();if(seen.has(key))continue;seen.add(key);
    options.push({platform:s.platform==='twitch'?'Twitch':s.platform==='kick'?'Kick':'YouTube',label:(s.platform==='twitch'?'Twitch':s.platform==='kick'?'Kick':'YouTube')+' · '+s.channel,url:u,access:'free',accountRequired:false,language:'À vérifier',countries:[],territoryNote:'Chaîne officielle du tournoi référencée par Liquipedia',confirmed:true,restrictions:'Chaîne déclarée par l’organisateur sur la page officielle du tournoi.',linkKind:'channel'});
    if(options.length>=2)break;
   }
   const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(m.start));
   const e={
    id:eid,slug:eid,title:title.slice(0,180),summary:`Match programmé selon le calendrier Liquipedia ${game}. Les diffuseurs listés sont les chaînes officielles déclarées par l’organisateur du tournoi ; l’horaire peut évoluer.`,
    category:'esport',subcategory:game,date,start:m.start,end:null,sourceTimezone:'UTC',
    participants:m.opponents.slice(0,2),frenchPresence:null,frenchNote:'Non renseignée par la source',organizer:tname||game,
    broadcastOptions:options,sources:[{label:'Liquipedia '+game+' · matchs',url,sourceId:id,collectedAt:now},...(m.tournamentPath?[{label:'Liquipedia · page du tournoi',url:'https://liquipedia.net'+m.tournamentPath,sourceId:id,collectedAt:now}]:[])],
    status:'À venir',lastVerified:now,confirmation:'Match daté dans le calendrier Liquipedia',
    schedule:[],notes:['Horaire lu dans le timestamp Unix du calendrier Liquipedia, indépendant du fuseau affiché.','Les équipes non déterminées restent affichées comme telles. Les streams permanents en cours ne sont pas collectés.'],
    popularity:null,discovery:true,major:false,featured:false,art:'JEU',
    commercial:{affiliateUrl:null,sponsor:null,sponsored:false},vpnContext:null,postponement:null,cancellation:null,programType:'livestream'
   };
   observed.add(eid);
   const at=catalog.events.findIndex(x=>x.id===eid);
   if(at<0){catalog.events.push(e);added++}else{if(catalog.events[at].sourceImage)e.sourceImage=catalog.events[at].sourceImage;catalog.events[at]=e;updated++}
  }
  for(const old of catalog.events.filter(x=>x.id.startsWith(id+'-')&&Date.parse(x.start)>Date.now()&&!observed.has(x.id)&&!['Annulé','Programmation à revérifier'].includes(x.status))){old.status='Programmation à revérifier';old.confirmation='Match absent du dernier calendrier Liquipedia';old.broadcastOptions=[];old.lastVerified=now;updated++}
  const entry={id,name:'Liquipedia · calendrier '+game,url,kind:'community',purpose:'Matchs datés et chaînes officielles des tournois',checkedAt:now,notes:'Wiki communautaire de référence pour l’esport ; les chaînes de diffusion sont celles déclarées par les pages de tournoi. API MediaWiki publique, ~2 s entre requêtes.'};
  const si=registry.sources.findIndex(s=>s.id===id);if(si<0)registry.sources.push(entry);else registry.sources[si]=entry;
  report.push({id,status:'ok',url,checkedAt:now,matches:matches.length,tournaments:tournStreams.size,observed:observed.size});
 }catch(e){report.push({id,status:'error',url,checkedAt:now,error:e.message})}
}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
status.sources=[...status.sources.filter(s=>!WIKIS.some(w=>'lp-'+w.wiki===s.id)),...report];await save('public/collection-status.json',status);
await mkdir('work',{recursive:true});await save('work/liquipedia-run.json',{checkedAt:now,added,updated,report});
console.log(JSON.stringify({added,updated,report},null,1));
