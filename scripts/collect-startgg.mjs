import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{startggToItems,STARTGG_QUERY}from'./collectors/startgg.mjs';
import{frenchGuess}from'./collectors/french.mjs';
const now=new Date().toISOString();
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
const id='startgg',url='https://api.start.gg/gql/alpha',key=process.env.STARTGG_API_KEY;
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),status=await read('public/collection-status.json');
const report=[];let added=0,updated=0;
const observed=new Set();
try{
 if(!key)throw Error('STARTGG_API_KEY absente');
 const r=await fetch(url,{method:'POST',signal:AbortSignal.timeout(25000),headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json','User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'},body:JSON.stringify({query:STARTGG_QUERY,variables:{perPage:50}})});
 if(!r.ok)throw Error('HTTP '+r.status);
 const json=await r.json();
 if(json.errors?.length)throw Error(json.errors[0].message);
 const items=startggToItems(json?.data?.tournaments?.nodes);
 for(const item of items.filter(i=>Date.parse(i.start)>Date.now()-3*3600000)){
  const eid=item.key,date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.start));
  const e={
   id:eid,slug:eid,title:item.title,summary:`Tournoi annoncé sur start.gg${item.city?' à '+item.city:''}. Les chaînes listées sont celles déclarées par l’organisateur sur sa page de tournoi ; l’horaire peut évoluer.`,
   category:'esport',subcategory:item.game,date,start:item.start,end:item.end,sourceTimezone:'UTC',
   participants:[],frenchPresence:true,frenchNote:'Tournoi organisé en France',organizer:'start.gg',
   broadcastOptions:item.streams.map(s=>({platform:s.platform,label:s.platform+' · '+s.url.split('/').pop(),url:s.url,access:'free',accountRequired:false,language:'À vérifier',countries:[],territoryNote:'Chaîne déclarée par l’organisateur du tournoi sur start.gg',confirmed:true,restrictions:'Diffusion annoncée par l’organisateur ; le flux actif n’est pas surveillé.',linkKind:'channel'})),
   sources:[{label:'start.gg · page du tournoi',url:item.url,sourceId:id,collectedAt:now}],
   status:'À venir',lastVerified:now,confirmation:'Tournoi daté dans le calendrier start.gg',
   schedule:item.events.map(x=>({label:x.label,start:x.start})),
   notes:['Horaires fournis par l’API start.gg en timestamp Unix. Les brackets et participants ne sont pas déduits.','Un tournoi sans chaîne déclarée reste « Diffuseur à confirmer ».'],
   popularity:null,discovery:true,major:false,featured:false,art:'JEU',
   commercial:{affiliateUrl:null,sponsor:null,sponsored:false},vpnContext:null,postponement:null,cancellation:null,programType:'livestream'
  };
  {const fg=frenchGuess(e);if(fg){e.frenchPresence=true;e.frenchNote=fg.note}}
  observed.add(eid);
  const at=catalog.events.findIndex(x=>x.id===eid);
  if(at<0){catalog.events.push(e);added++}else{if(catalog.events[at].sourceImage)e.sourceImage=catalog.events[at].sourceImage;catalog.events[at]=e;updated++}
 }
 for(const old of catalog.events.filter(x=>x.id.startsWith('sg-')&&Date.parse(x.start)>Date.now()&&!observed.has(x.id)&&!['Annulé','Programmation à revérifier'].includes(x.status))){old.status='Programmation à revérifier';old.confirmation='Tournoi absent du dernier calendrier start.gg';old.broadcastOptions=[];old.lastVerified=now;updated++}
 const entry={id,name:'start.gg · tournois en France',url:'https://www.start.gg/',kind:'official',purpose:'Tournois esport à venir avec horaires et chaînes déclarées',checkedAt:now,notes:'API GraphQL officielle, filtre pays France. Les chaînes sont celles déclarées par l’organisateur ; les tournois sans stream restent sans diffuseur supposé.'};
 const si=registry.sources.findIndex(s=>s.id===id);if(si<0)registry.sources.push(entry);else registry.sources[si]=entry;
 report.push({id,status:'ok',url:'https://www.start.gg/',checkedAt:now,tournaments:items.length,observed:observed.size});
}catch(e){report.push({id,status:'error',url:'https://www.start.gg/',checkedAt:now,error:e.message})}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
status.sources=[...status.sources.filter(s=>s.id!==id),...report];await save('public/collection-status.json',status);
await mkdir('work',{recursive:true});await save('work/startgg-run.json',{checkedAt:now,added,updated,report});
console.log(JSON.stringify({added,updated,report},null,1));
