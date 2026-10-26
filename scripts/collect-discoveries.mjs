import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{parseCernUpcoming,parseCernAnnouncement,parseArteConcertSnapshot}from'./collectors/discoveries.mjs';
import{upsertArteProgramme,retireMissingArteConcerts}from'./collectors/programme-identity.mjs';
import{toEvent}from'./collectors/feeds.mjs';
const now=new Date().toISOString(),cern='https://live.cern/api/private/v1/webcasts/?type=upcoming',concert='https://www.arte.tv/fr/arte-concert/agenda/';
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
async function page(url){const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'}});if(!r.ok)throw Error('HTTP '+r.status);let size=0;const chunks=[];for await(const c of r.body){size+=c.length;if(size>2500000)throw Error('Source trop grande');chunks.push(c)}return Buffer.concat(chunks).toString('utf8')}
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),report=[];let added=0,updated=0;
const upsert=e=>{const i=catalog.events.findIndex(x=>x.id===e.id);if(i<0){catalog.events.push(e);added++}else{if(catalog.events[i].sourceImage)e.sourceImage=catalog.events[i].sourceImage;catalog.events[i]=e;updated++}};
const register=entry=>{const i=registry.sources.findIndex(x=>x.id===entry.id);if(i<0)registry.sources.push(entry);else registry.sources[i]=entry};
const inWindow=item=>Date.parse(item.start)>=Date.now()-86400000&&Date.parse(item.start)<=Date.now()+30*86400000;
try{
 const raw=JSON.parse(await page(cern)),items=parseCernUpcoming(raw),observed=new Set();
 register({id:'cern-webcast',name:'CERN · conférences publiques à venir',url:cern,kind:'official',purpose:'Horaires, intervenants et accès public des webcasts',checkedAt:now,notes:'Seuls les événements restricted=false sont retenus. Aucune réunion de collaborateurs ni URL privée de flux n’est publiée.'});
 for(const item of items.filter(inWindow).slice(0,24)){
  const e=toEvent(item,{id:'cern-webcast',name:'CERN',category:'autres',platform:'CERN Webcast',url:cern},now);observed.add(e.id);e.subcategory='Sciences et conférences';e.sourceTimezone=item.timezone;e.participants=item.speaker?[item.speaker]:[];e.title='CERN · '+item.title;e.summary=`Conférence scientifique publique du CERN${item.speaker?' avec '+item.speaker:''}. Diffusion annoncée dans le programme officiel.`;
  e.broadcastOptions=[{platform:'CERN Webcast',label:'CERN · webcast public',url:item.url,access:'free',accountRequired:false,language:'À vérifier',countries:[],territoryNote:'Accès public indiqué par le CERN ; disponibilité technique selon le diffuseur',confirmed:true,restrictions:'Événement marqué sans restriction par le service officiel. Aucun flux actif déduit du programme.',linkKind:'stream'}];
  e.confirmation='Conférence publique programmée par le CERN';e.notes=['L’accès public est explicitement indiqué dans le programme CERN. La langue n’est pas déduite du titre.'];e.evidence={schedule:{url:cern,field:'startDate',observedAt:now},access:{url:cern,field:'restricted',value:false,observedAt:now}};e.corroboration={publisherCount:1,pageCount:1,independent:false};
  try{
   const announcement=parseCernAnnouncement(await page(item.announcement),item.announcement);if(!announcement)throw Error('Annonce sans horaire structuré cohérent');
   const sid='cern-indico-'+item.key;register({id:sid,name:'CERN Indico · '+item.title,url:item.announcement,kind:'official',purpose:'Recoupement du programme scientifique et de l’horaire',checkedAt:now,notes:'Même organisme que le service de diffusion ; ne constitue pas un éditeur indépendant.'});e.sources.push({label:'CERN Indico · annonce de la conférence',url:item.announcement,sourceId:sid,collectedAt:now});
   e.corroboration.pageCount=2;e.evidence.announcement={url:item.announcement,start:announcement.start,observedAt:now};
   if(announcement.start!==item.start){e.status='Programmation à revérifier';e.confirmation='Horaires contradictoires entre le webcast et Indico';e.broadcastOptions=[];e.notes.push('Les deux horaires officiels diffèrent : fiche retirée des directs recommandés en attendant confirmation.')}else{e.confirmation='Horaire recoupé : CERN Webcast et CERN Indico';e.notes.push('Le programme de diffusion et l’annonce Indico concordent ; les deux pages appartiennent au CERN.')}
  }catch(error){e.notes.push('Recoupement Indico indisponible : '+error.message)}
  upsert(e);
 }
 // Only a complete upcoming list can withdraw a future slot; a failed request never erases it.
 if(raw.count===raw.results.length&&items.length<=24)for(const old of catalog.events.filter(e=>e.id.startsWith('cern-webcast-')&&Date.parse(e.start)>Date.now()&&!observed.has(e.id)&&!['Programmation à revérifier','Annulé'].includes(e.status))){old.status='Programmation à revérifier';old.confirmation='Conférence absente du dernier programme public CERN';old.broadcastOptions=[];old.lastVerified=now;updated++}
 report.push({id:'cern-webcast',status:'ok',url:cern,checkedAt:now,listed:raw.results.length,publicProgrammes:items.length});
}catch(e){report.push({id:'cern-webcast',status:'error',url:cern,checkedAt:now,error:e.message})}
try{
 const {items,programmeCount}=parseArteConcertSnapshot(await page(concert)),observed=new Set();
 if(!programmeCount)throw Error('Agenda ARTE sans programmes structurés reconnus');
 register({id:'arte-concert-live',name:'ARTE Concert · agenda des directs',url:concert,kind:'official',purpose:'Concerts explicitement annoncés en livestream',checkedAt:now,notes:'Seul le type LIVESTREAM_WEB est collecté ; les dates de mise en replay sont exclues.'});
 for(const item of items.filter(inWindow)){
  const e=toEvent(item,{id:'arte-concert-live',name:'ARTE Concert',category:'autres',platform:'ARTE Concert',url:concert},now);observed.add(e.id);e.programmeUrl=item.url;e.summary=item.summary;e.subcategory='Concert';e.confirmation='Concert annoncé en direct par ARTE';e.programType='livestream';
  e.broadcastOptions=[{platform:'ARTE Concert',label:'ARTE Concert · direct officiel',url:item.url,access:'free',accountRequired:null,language:'À vérifier',countries:[],territoryNote:item.global?'Code géographique ALL sans exclusion indiqué par ARTE':'Disponibilité géographique à vérifier auprès d’ARTE',confirmed:true,restrictions:'Retransmission en direct annoncée. Les conditions du diffuseur restent applicables.',linkKind:'stream'}];
  e.notes=['Le type LIVESTREAM_WEB confirme une retransmission annoncée ; une simple disponibilité VOD ne suffit jamais.','La durée du replay et la fin de disponibilité ne définissent pas la fin du concert.'];e.evidence={schedule:{url:concert,field:'availability.upcomingDate',observedAt:now},broadcast:{url:concert,field:'availability.type',value:'LIVESTREAM_WEB',observedAt:now}};e.corroboration={publisherCount:1,pageCount:1,independent:false};if(upsertArteProgramme(catalog.events,e)==='added')added++;else updated++;
 }
 updated+=retireMissingArteConcerts(catalog.events,observed,programmeCount,now);
 report.push({id:'arte-concert-live',status:'ok',url:concert,checkedAt:now,livestreams:items.length});
}catch(e){report.push({id:'arte-concert-live',status:'error',url:concert,checkedAt:now,error:e.message})}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
const status=await read('public/collection-status.json');status.sources=[...status.sources.filter(s=>!report.some(r=>r.id===s.id)),...report];await save('public/collection-status.json',status);await mkdir('work',{recursive:true});await save('work/discoveries-run.json',{checkedAt:now,added,updated,report});console.log(JSON.stringify({added,updated,report}));
