import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {parseArteGuide} from './collectors/arte.mjs';
import {toEvent} from './collectors/feeds.mjs';
import {dateKey} from '../public/event-utils.mjs';
const now=new Date().toISOString(),today=dateKey(now),read=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
const data=await read('public/events.json'),sources=await read('public/sources.json'),status=await read('public/collection-status.json');
const report=[];let added=0,updated=0;
for(let offset=0;offset<8;offset++){
 const day=new Date(Date.parse(today+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10),url='https://www.arte.tv/fr/guide/'+day.replaceAll('-','')+'/';
 try{
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'}});if(!r.ok)throw Error('HTTP '+r.status);
  const chunks=[];let bytes=0;for await(const c of r.body){bytes+=c.length;if(bytes>3000000)throw Error('Guide trop volumineux');chunks.push(c)}
  const items=parseArteGuide(Buffer.concat(chunks).toString('utf8'),day);if(!items.length)throw Error('Aucun horaire structuré cohérent pour '+day);
  const sourceId='arte-guide-'+day,feed={id:'arte',name:'ARTE',platform:'TV',category:'autres',url};
  for(const item of items){
   const e=toEvent(item,feed,now);e.sources[0].sourceId=sourceId;e.organizer='ARTE · programmation';e.summary=item.summary;e.confirmation='Diffusion TV programmée par ARTE';e.discovery=/concert|musique|science|culture/i.test(item.genre);e.programType='scheduled-tv';
   e.notes=['Horaire du guide TV officiel, distinct des dates de disponibilité en replay. Ce programme peut être enregistré : il n’est pas présenté comme un événement filmé en direct.','La durée VOD ne définit pas une fin d’antenne ; aucune durée de diffusion n’est déduite.'];
   e.broadcastOptions=[{platform:'TV',label:'ARTE · chaîne gratuite',url:'https://www.arte.tv/fr/direct/',access:'free',accountRequired:null,language:'Français',countries:[],territoryNote:'Droits de diffusion en ligne variables selon le programme et le pays',confirmed:item.liveRights,restrictions:item.liveRights?'Droit de diffusion en ligne indiqué dans le guide ; disponibilité territoriale à vérifier.':'Diffusion TV annoncée ; disponibilité de ce programme sur le direct en ligne non confirmée.',linkKind:'channel'}];
   e.evidence={schedule:{sourceUrl:url,observedAt:now,field:'availability.upcomingDate'},programme:{sourceUrl:item.url,observedAt:now},onlineBroadcast:{sourceUrl:url,observedAt:now,value:item.liveRights}};
   const index=data.events.findIndex(x=>x.id===e.id);if(index<0){data.events.push(e);added++}else{if(data.events[index].sourceImage)e.sourceImage=data.events[index].sourceImage;data.events[index]=e;updated++}
  }
  const entry={id:sourceId,name:'ARTE · guide TV '+day,url,purpose:'Horaires des programmes télévisés',kind:'official',checkedAt:now,notes:'Source du diffuseur. Horaire d’antenne et disponibilité en replay séparés ; droit de diffusion en ligne indiqué sans garantir le territoire.'};
  const index=sources.sources.findIndex(s=>s.id===sourceId);if(index<0)sources.sources.push(entry);else sources.sources[index]=entry;
  report.push({id:sourceId,status:'ok',url,checkedAt:now,programmes:items.length});
 }catch(e){report.push({id:'arte-guide-'+day,status:'error',url,checkedAt:now,error:e.message})}
}
if(added||updated){data.updatedAt=now;sources.updatedAt=now;await save('public/events.json',data);await save('public/sources.json',sources)}
status.sources=[...status.sources.filter(s=>!report.some(r=>r.id===s.id)),...report];await save('public/collection-status.json',status);
await mkdir('work',{recursive:true});await save('work/arte-run.json',{checkedAt:now,added,updated,report});
console.log(JSON.stringify({added,updated,report}));
