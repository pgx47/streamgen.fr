import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{parseSpaceXUpcoming,spaceXMission,corroborateLaunch,spaceXNeedsRefresh}from'./collectors/space.mjs';
import{toEvent}from'./collectors/feeds.mjs';
const now=new Date().toISOString(),feedId='spacex-launches',tilesUrl='https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming',timingsUrl='https://content.spacex.com/cms-assets/future_missions.json',secondaryUrl='https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=15&mode=detailed';
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
async function json(url){const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'}});if(!r.ok)throw Error('HTTP '+r.status);const chunks=[];let n=0;for await(const c of r.body){n+=c.length;if(n>2000000)throw Error('Source trop grande');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),report=[];let added=0,updated=0;
const register=s=>{const i=registry.sources.findIndex(x=>x.id===s.id);if(i<0)registry.sources.push(s);else registry.sources[i]=s};
const retire=(e,reason)=>{e.status='Programmation à revérifier';e.confirmation=reason;e.broadcastOptions=[];e.lastVerified=now;updated++};
try{
 const [tiles,timings]=await Promise.all([json(tilesUrl),json(timingsUrl)]),items=parseSpaceXUpcoming(tiles,timings);if(!tiles.every(t=>typeof t.link==='string'))throw Error('Identités de mission absentes');
 let secondary=null;try{secondary=await json(secondaryUrl);if(!Array.isArray(secondary.results))throw Error('Réponse sans lancements');report.push({id:'space-devs-upcoming',status:'ok',url:secondaryUrl,checkedAt:now,launches:secondary.results.length})}catch(e){secondary=null;report.push({id:'space-devs-upcoming',status:'error',url:secondaryUrl,checkedAt:now,error:e.message})}
 register({id:'spacex-upcoming',name:'SpaceX · missions à venir',url:tilesUrl,kind:'official',purpose:'Identité des missions annoncées',checkedAt:now});register({id:'spacex-timings',name:'SpaceX · fenêtres officielles de lancement',url:timingsUrl,kind:'official',purpose:'Ouverture et fermeture des fenêtres de lancement',checkedAt:now,notes:'Une date sans fenêtre horaire n’est pas publiée à minuit. La fermeture de fenêtre ne représente pas la fin du direct.'});
 if(secondary)register({id:'space-devs-upcoming',name:'The Space Devs · Launch Library 2',url:secondaryUrl,kind:'specialist',purpose:'Recoupement indépendant de l’horaire et de l’identité de mission',checkedAt:now,notes:'La correspondance exige le lien exact de la mission officielle. Les heures de vidéos tierces ne déterminent jamais le programme publié.'});
 const validKeys=new Set(items.map(x=>x.key));
 for(const old of catalog.events.filter(e=>e.id.startsWith(feedId+'-')&&Date.parse(e.start)>Date.now()&&!validKeys.has(e.externalMissionId)&&e.status!=='Programmation à revérifier'))retire(old,'Fenêtre horaire absente du dernier calendrier officiel SpaceX');
 const known=new Set(catalog.events.filter(e=>e.id.startsWith(feedId+'-')).map(e=>e.externalMissionId));
 const selected=[...items.filter(x=>known.has(x.key)),...items.filter(x=>!known.has(x.key)&&spaceXNeedsRefresh(x,[],new Date())).slice(0,12)];
 for(const item of selected){
  const detailUrl='https://content.spacex.com/api/spacex-website/missions/'+item.key,sourceId='spacex-mission-'+item.key;
  try{
   const mission=spaceXMission(item,await json(detailUrl));if(!mission)throw Error('Mission détaillée non correspondante');
   const e=toEvent(item,{id:feedId,name:'SpaceX',platform:'SpaceX',category:'autres',url:tilesUrl},now),oldIndex=catalog.events.findIndex(x=>x.id===e.id);
   if(!mission.streams.length){if(oldIndex>=0)retire(catalog.events[oldIndex],'Retransmission absente de la dernière annonce SpaceX');report.push({id:sourceId,status:'candidate',url:item.url,checkedAt:now,reason:'Aucun lien de webcast officiel'});continue}
   register({id:sourceId,name:'SpaceX · mission '+item.key,url:item.url,kind:'official',purpose:'Mission et liens de retransmission officiels',checkedAt:now,notes:'Données structurées du site officiel : '+detailUrl});
   e.externalMissionId=item.key;e.subcategory='Espace';e.art='ESPACE';e.title='SpaceX · '+(item.key.startsWith('sl-')?'Starlink '+item.key.slice(3):item.key)+' — fenêtre de lancement';e.sources[0].sourceId='spacex-upcoming';e.launchWindow={open:item.start,close:item.windowClose};e.startMeaning='launch-window-open';
   e.summary='Ouverture de la fenêtre de lancement de '+item.vehicle+'. Le décollage peut être décalé dans cette fenêtre ; consultez la retransmission officielle SpaceX pour suivre le compte à rebours.';
   e.sources.push({sourceId:'spacex-timings',label:'SpaceX · fenêtre horaire officielle',url:timingsUrl,collectedAt:now},{sourceId,label:'SpaceX · annonce et webcast de cette mission',url:item.url,collectedAt:now});
   e.broadcastOptions=mission.streams.map(url=>({platform:url.includes('youtube.com')?'YouTube':'X',label:'SpaceX · retransmission officielle',url,access:'unknown',accountRequired:null,language:'À vérifier',countries:[],territoryNote:'Conditions du lecteur et disponibilité selon votre territoire',confirmed:true,restrictions:'Le lien est annoncé pour cette mission par SpaceX. La présence d’un flux actif et l’absence de compte requis ne sont pas déduites.',linkKind:'stream'}));
   e.confirmation='Fenêtre et retransmission annoncées par SpaceX';e.notes=['L’heure affichée est l’ouverture de la fenêtre de lancement, pas une heure garantie de décollage ni de début de vidéo.','La fermeture de fenêtre est '+new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',dateStyle:'long',timeStyle:'short'}).format(new Date(item.windowClose))+' (Paris). Elle ne définit pas la fin du direct.','Les horaires des vidéos de sources tierces ne sont pas réutilisés.'];
   e.evidence={schedule:{url:timingsUrl,field:'PrimaryLaunchWindow.Open.Seconds',observedAt:now},broadcast:{url:detailUrl,field:'webcasts',observedAt:now}};e.corroboration={publisherCount:1,pageCount:3,independent:false};
   const cross=corroborateLaunch(item,secondary);
   if(cross){e.sources.push({sourceId:'space-devs-upcoming',label:'The Space Devs · calendrier des lancements',url:secondaryUrl,collectedAt:now});e.evidence.secondarySchedule={url:secondaryUrl,launchId:cross.id,start:cross.start,agreement:cross.agreement,observedAt:now};e.corroboration={publisherCount:2,pageCount:4,independent:true,scheduleAgreement:cross.agreement};e.confirmation=cross.agreement?'Fenêtre SpaceX recoupée avec The Space Devs':'Horaire SpaceX · divergence avec The Space Devs';if(!cross.agreement)e.notes.push('Le calendrier secondaire diverge. La fenêtre publiée reste celle de l’opérateur SpaceX, avec divergence explicitement signalée.')}
   if(oldIndex<0){catalog.events.push(e);added++}else{if(catalog.events[oldIndex].sourceImage)e.sourceImage=catalog.events[oldIndex].sourceImage;catalog.events[oldIndex]=e;updated++}
   report.push({id:sourceId,status:'ok',url:item.url,checkedAt:now,independentScheduleAgreement:cross?.agreement??null});
  }catch(error){report.push({id:sourceId,status:'error',url:item.url,checkedAt:now,error:error.message})}
 }
 report.push({id:'spacex-upcoming',status:'ok',url:tilesUrl,checkedAt:now,missions:tiles.length,preciseWindows:items.length,added,updated});
}catch(error){report.push({id:'spacex-upcoming',status:'error',url:tilesUrl,checkedAt:now,error:error.message})}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
const status=await read('public/collection-status.json');status.sources=[...status.sources.filter(s=>!report.some(r=>r.id===s.id)),...report];await save('public/collection-status.json',status);await mkdir('work',{recursive:true});await save('work/space-run.json',{checkedAt:now,added,updated,report});console.log(JSON.stringify({added,updated,report}));
