import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{discoverRedBull,parseRedBullLive}from'./collectors/redbull.mjs';
import{toEvent}from'./collectors/feeds.mjs';
const now=new Date(),stamp=now.toISOString(),index='https://www.redbull.com/int-en/events',id='redbull-live';
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
async function page(url){const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'}});if(!r.ok)throw Error('HTTP '+r.status);const chunks=[];let n=0;for await(const c of r.body){n+=c.length;if(n>2500000)throw Error('Page trop grande');chunks.push(c)}return Buffer.concat(chunks).toString('utf8')}
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),report=[];
let candidates=[];try{candidates=discoverRedBull(await page(index),now);if(!candidates.length)throw Error('Aucun profil dans la fenêtre de découverte');report.push({id,status:'ok',url:index,checkedAt:stamp,discoveredProfiles:candidates.length})}catch(e){report.push({id,status:'error',url:index,checkedAt:stamp,error:e.message})}
for(const candidate of candidates.slice(0,16)){
 const sourceId=id+'-'+createHash('sha256').update(candidate.url).digest('hex').slice(0,12);
 try{
  const streams=parseRedBullLive(await page(candidate.url)),accepted=streams.filter(s=>Date.parse(s.start)>=now.getTime()-86400000&&Date.parse(s.start)<=now.getTime()+30*86400000);
  const entry={id:sourceId,name:'Red Bull TV · '+candidate.title,url:candidate.url,purpose:'Horaire explicite de diffusion en direct',kind:'official',checkedAt:stamp,notes:'La date générale de compétition ne devient jamais une heure de diffusion. Les restrictions non renseignées restent inconnues.'};
  let added=0,updated=0;
  if(accepted.length){const ri=registry.sources.findIndex(s=>s.id===sourceId);if(ri<0)registry.sources.push(entry);else registry.sources[ri]=entry}
  for(const item of accepted){
   const e=toEvent(item,{id,name:'Red Bull TV',platform:'Red Bull TV',category:'sport',url:candidate.url},stamp);
   e.sources[0].sourceId=sourceId;e.title=candidate.title+' — '+item.title;e.subcategory=/padel/i.test(candidate.title)?'Padel':'Sport et découvertes';
   e.summary=`${candidate.title} : ${item.title}. Horaire annoncé par Red Bull TV ; consultez le diffuseur pour la disponibilité dans votre pays.`;
   e.broadcastOptions=[{platform:'Red Bull TV',label:'Red Bull TV · diffusion annoncée',url:item.url,access:'unknown',accountRequired:null,language:'À vérifier',countries:[],territoryNote:item.blockedCountries?.length?'Restrictions annoncées : '+item.blockedCountries.join(', '):'Restrictions territoriales non renseignées par cette page ; disponibilité en France à vérifier',confirmed:true,restrictions:'Le programme officiel annonce un direct. L’accès gratuit et la disponibilité territoriale ne sont pas déduits de cette annonce.',linkKind:'stream'}];
   e.notes=['Heure issue du champ liveStreams.startDate ; aucune fin de diffusion inventée.','Une annonce de diffusion ne confirme pas un flux actuellement actif.'];e.evidence={schedule:{url:candidate.url,field:'liveStreams.startDate',observedAt:stamp},broadcast:{url:candidate.url,field:'liveStreams.reference.externalUrl',observedAt:stamp}};e.corroboration={publisherCount:1,pageCount:1,independent:false};
   const at=catalog.events.findIndex(x=>x.id===e.id);if(at<0){catalog.events.push(e);added++}else{if(catalog.events[at].sourceImage)e.sourceImage=catalog.events[at].sourceImage;catalog.events[at]=e;updated++}
  }
  report.push({id:sourceId,status:'ok',url:candidate.url,checkedAt:stamp,detectedStreams:streams.length,added,updated});
 }catch(e){report.push({id:sourceId,status:'error',url:candidate.url,checkedAt:stamp,error:e.message})}
}
if(report.some(r=>r.added||r.updated)){catalog.updatedAt=stamp;registry.updatedAt=stamp;await save('public/events.json',catalog);await save('public/sources.json',registry)}
const status=await read('public/collection-status.json');status.sources=[...status.sources.filter(s=>!s.id.startsWith(id)),...report];await save('public/collection-status.json',status);await mkdir('work',{recursive:true});await save('work/redbull-run.json',{checkedAt:stamp,report});console.log(JSON.stringify(report));
