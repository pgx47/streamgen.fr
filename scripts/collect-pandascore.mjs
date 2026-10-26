import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{pandascoreToItems,platformOf}from'./collectors/pandascore.mjs';
const now=new Date().toISOString();
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
const id='pandascore',key=process.env.PANDASCORE_API_KEY;
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),status=await read('public/collection-status.json');
const report=[];let added=0,updated=0;const observed=new Set();
try{
 if(!key)throw Error('PANDASCORE_API_KEY absente');
 const r=await fetch('https://api.pandascore.co/matches/upcoming?per_page=100',{signal:AbortSignal.timeout(25000),headers:{'Authorization':'Bearer '+key,'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'}});
 if(!r.ok)throw Error('HTTP '+r.status);
 const items=pandascoreToItems(await r.json());
 for(const item of items.filter(i=>Date.parse(i.start)>Date.now()-3*3600000)){
  const eid=item.key,date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.start));
  const options=item.streams.map(s=>{const p=platformOf(s.url);return p?{platform:p,label:p+' · '+(s.official?'officiel':'community'),url:s.url,access:'free',accountRequired:null,language:s.lang||'À vérifier',countries:[],territoryNote:s.official?'Diffusion officielle référencée par PandaScore':'Diffusion communautaire référencée par PandaScore',confirmed:s.official,restrictions:s.official?'Stream officiel du match déclaré dans le calendrier PandaScore.':'Stream communautaire ; canaux officiels possibles ailleurs.',linkKind:'channel'}:null}).filter(Boolean);
  const e={
   id:eid,slug:eid,title:item.title||((item.serie||item.game)+' — match programmé'),
   summary:`Match ${item.game} programmé selon le calendrier PandaScore${item.serie?' ('+item.serie+')':''}. Les streams listés sont ceux référencés pour ce match ; l’horaire peut évoluer.`,
   category:'esport',subcategory:item.game,date,start:item.start,end:item.end,sourceTimezone:'UTC',
   participants:item.teams,frenchPresence:null,frenchNote:'Non renseignée par la source',organizer:item.serie||'PandaScore',
   broadcastOptions:options,sources:[{label:'PandaScore · calendrier des matchs',url:'https://pandascore.co/',sourceId:id,collectedAt:now}],
   status:'À venir',lastVerified:now,confirmation:'Match daté dans le calendrier PandaScore',
   schedule:[],notes:['Horaire fourni en ISO par l’API PandaScore. Les matchs annulés ou terminés sont exclus ; les jeux déjà couverts par Liquipedia et Riot sont ignorés pour éviter les doublons.'],
   popularity:null,discovery:true,major:false,featured:false,art:'JEU',
   commercial:{affiliateUrl:null,sponsor:null,sponsored:false},vpnContext:null,postponement:null,cancellation:null,programType:'livestream'
  };
  observed.add(eid);
  const at=catalog.events.findIndex(x=>x.id===eid);
  if(at<0){catalog.events.push(e);added++}else{if(catalog.events[at].sourceImage)e.sourceImage=catalog.events[at].sourceImage;catalog.events[at]=e;updated++}
 }
 for(const old of catalog.events.filter(x=>x.id.startsWith('ps-')&&Date.parse(x.start)>Date.now()&&!observed.has(x.id)&&!['Annulé','Programmation à revérifier'].includes(x.status))){old.status='Programmation à revérifier';old.confirmation='Match absent du dernier calendrier PandaScore';old.broadcastOptions=[];old.lastVerified=now;updated++}
 const entry={id,name:'PandaScore · calendrier esport',url:'https://pandascore.co/',kind:'official',purpose:'Matchs datés et streams officiels pour les jeux non couverts ailleurs',checkedAt:now,notes:'API REST gratuite. Les jeux couverts par Liquipedia (CS2, Dota 2, Rocket League) et Riot (LoL, Valorant) sont exclus pour éviter les doublons.'};
 const si=registry.sources.findIndex(s=>s.id===id);if(si<0)registry.sources.push(entry);else registry.sources[si]=entry;
 report.push({id,status:'ok',url:'https://pandascore.co/',checkedAt:now,matches:items.length,observed:observed.size});
}catch(e){report.push({id,status:'error',url:'https://pandascore.co/',checkedAt:now,error:e.message})}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
status.sources=[...status.sources.filter(s=>s.id!==id),...report];await save('public/collection-status.json',status);
await mkdir('work',{recursive:true});await save('work/pandascore-run.json',{checkedAt:now,added,updated,report});
console.log(JSON.stringify({added,updated,report},null,1));
