import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{parseLichessBroadcasts}from'./collectors/lichess.mjs';
const now=new Date().toISOString();
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
const id='lichess',url='https://lichess.org/api/broadcast';
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),status=await read('public/collection-status.json');
const report=[];let added=0,updated=0;const observed=new Set();
try{
 const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'}});
 if(!r.ok)throw Error('HTTP '+r.status);
 const items=parseLichessBroadcasts(await r.text()).filter(i=>Date.parse(i.start)>Date.now()-6*3600000).slice(0,40);
 for(const item of items){
  const eid='lc-'+item.key,slug='lc-'+createHash('sha256').update(item.key).digest('hex').slice(0,12);
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.start));
  const e={
   id:eid,slug,title:item.title,summary:`Tournoi d’échecs retransmis officiellement par Lichess Broadcast${item.location?' ('+item.location+')':''}. Les parties sont suivies en direct sur la page du tournoi.`,
   category:'autres',subcategory:'Échecs',date,start:item.start,end:item.end,sourceTimezone:'UTC',
   participants:item.players?String(item.players).split(/[,;]/).map(s=>s.trim()).filter(Boolean).slice(0,6):[],frenchPresence:null,frenchNote:'Non renseignée par la source',organizer:'Lichess Broadcast',
   broadcastOptions:[{platform:'Web',label:'Lichess · retransmission officielle',url:item.url,access:'free',accountRequired:false,language:'Multilingue',countries:[],territoryNote:'Retransmission mondiale sans restriction territoriale',confirmed:true,restrictions:'Visionnage libre et gratuit sur lichess.org, sans compte.',linkKind:'channel'}],
   sources:[{label:'Lichess · broadcast officiel',url:item.url,sourceId:id,collectedAt:now}],
   status:'À venir',lastVerified:now,confirmation:'Tournoi listé dans l’API publique Lichess Broadcast',
   schedule:[],notes:['Dates de début et de fin fournies par l’API Lichess Broadcast (timestamps).','Les parties individuelles suivent l’horaire du tournoi ; le flux actif n’est pas surveillé.'],
   popularity:null,discovery:true,major:false,featured:false,art:'JEU',
   commercial:{affiliateUrl:null,sponsor:null,sponsored:false},vpnContext:null,postponement:null,cancellation:null,programType:'livestream'
  };
  observed.add(eid);
  const at=catalog.events.findIndex(x=>x.id===eid);
  if(at<0){catalog.events.push(e);added++}else{if(catalog.events[at].sourceImage)e.sourceImage=catalog.events[at].sourceImage;catalog.events[at]=e;updated++}
 }
 for(const old of catalog.events.filter(x=>x.id.startsWith('lc-')&&Date.parse(x.start)>Date.now()&&!observed.has(x.id)&&!['Annulé','Programmation à revérifier'].includes(x.status))){old.status='Programmation à revérifier';old.confirmation='Tournoi absent de la dernière liste Lichess Broadcast';old.broadcastOptions=[];old.lastVerified=now;updated++}
 const entry={id,name:'Lichess · broadcasts officiels',url:'https://lichess.org/broadcast',kind:'official',purpose:'Tournois d’échecs retransmis en direct',checkedAt:now,notes:'API publique sans clé (NDJSON). Seuls les tournois listés par Lichess sont publiés.'};
 const si=registry.sources.findIndex(s=>s.id===id);if(si<0)registry.sources.push(entry);else registry.sources[si]=entry;
 report.push({id,status:'ok',url:'https://lichess.org/broadcast',checkedAt:now,tournaments:items.length,observed:observed.size});
}catch(e){report.push({id,status:'error',url:'https://lichess.org/broadcast',checkedAt:now,error:e.message})}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
status.sources=[...status.sources.filter(s=>s.id!==id),...report];await save('public/collection-status.json',status);
await mkdir('work',{recursive:true});await save('work/lichess-run.json',{checkedAt:now,added,updated,report});
console.log(JSON.stringify({added,updated,report},null,1));
