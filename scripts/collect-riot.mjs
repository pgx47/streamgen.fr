import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{parseRiotMatches}from'./collectors/structured.mjs';
import{toEvent}from'./collectors/feeds.mjs';
const now=new Date().toISOString(),source='https://valorantesports.com/en-US/matches',primer='https://valorantesports.com/en-US/news/valorant-game-changers-championship-2026-everything-you-need-to-know';
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
async function page(url){const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'}});if(!r.ok)throw Error('HTTP '+r.status);const a=[];let n=0;for await(const c of r.body){n+=c.length;if(n>2000000)throw Error('Page trop grande');a.push(c)}return Buffer.concat(a).toString('utf8')}
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),report=[];
try{
 const html=await page(source),matches=parseRiotMatches(html);if(!matches.length)throw Error('Aucun match structuré');
 let article='';try{article=await page(primer)}catch(e){report.push({id:'riot-valorant-broadcast',status:'error',url:primer,error:e.message})}
 const rightsVerified=article.includes('twitch.tv/valorant')&&/2026/.test(article)&&/Game Changers Championship/.test(article);
 const scheduleId='riot-valorant-schedule',broadcastId='riot-valorant-broadcast';
 const entries=[{id:scheduleId,name:'VALORANT Esports · calendrier des matchs',url:source,purpose:'Participants et horaires officiels',kind:'official',checkedAt:now,notes:'Riot Games. Affiches non connues conservées comme inconnues.'}];
 if(rightsVerified)entries.push({id:broadcastId,name:'Riot · Game Changers 2026 : diffusion officielle',url:primer,purpose:'Canaux annoncés pour cette édition',kind:'official',checkedAt:now,notes:'Confirmation éditoriale des canaux ; ne prouve pas un flux actif ni une absence de restriction territoriale.'});
 for(const entry of entries){const i=registry.sources.findIndex(s=>s.id===entry.id);if(i<0)registry.sources.push(entry);else registry.sources[i]=entry}
 let added=0,updated=0;
 for(const m of matches){
  if(Date.parse(m.start)<Date.now()-86400000||Date.parse(m.start)>Date.now()+60*86400000)continue;
  const e=toEvent(m,{id:'riot-valorant',name:'Riot Games',platform:'Twitch',category:'esport',url:source},now);e.sources[0].sourceId=scheduleId;e.subcategory='VALORANT';e.participants=m.teams;e.title='VALORANT · '+m.title;e.summary=`${m.league} : ${m.teams.length===2?m.teams.join(' face à '):'affiche encore à confirmer'}. Consultez le calendrier officiel pour les changements de programme.`;
  const covered=rightsVerified&&m.league==='Game Changers Championship'&&m.start.startsWith('2026-')&&m.start<'2026-11-02';
  e.broadcastOptions=covered?[{platform:'Twitch',label:'VALORANT · chaîne officielle',url:'https://www.twitch.tv/valorant',access:'unknown',accountRequired:null,language:'À vérifier',countries:[],territoryNote:'Disponibilité selon le diffuseur et votre territoire',confirmed:true,restrictions:'Canal annoncé dans le guide officiel Game Changers 2026. Aucun flux actif déduit de l’horaire.',linkKind:'channel'}]:[];
  if(covered)e.sources.push({label:'Riot · canaux Game Changers 2026',url:primer,sourceId:broadcastId,collectedAt:now});
  e.confirmation=covered?'Horaire et canal recoupés dans deux pages Riot':'Horaire officiel · diffusion à confirmer';e.notes=['Le calendrier confirme le match et son heure ; le guide de l’édition confirme le diffuseur. Les deux preuves proviennent de Riot et ne sont pas deux sources indépendantes.'];
  e.evidence={schedule:{url:source,field:'EventMatch.startTime',observedAt:now},participants:{url:source,field:'EventMatch.matchTeams',observedAt:now},broadcast:covered?{url:primer,scope:'Game Changers Championship 2026',observedAt:now}:null};e.corroboration={publisherCount:1,pageCount:covered?2:1,independent:false};
  const i=catalog.events.findIndex(x=>x.id===e.id);if(i<0){catalog.events.push(e);added++}else{if(catalog.events[i].sourceImage)e.sourceImage=catalog.events[i].sourceImage;catalog.events[i]=e;updated++}
 }
 catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry);report.push({id:scheduleId,status:'ok',url:source,checkedAt:now,detectedMatches:matches.length,added,updated,broadcastGuideVerified:rightsVerified});
}catch(e){report.push({id:'riot-valorant-schedule',status:'error',url:source,checkedAt:now,error:e.message})}
const status=await read('public/collection-status.json');status.sources=[...status.sources.filter(s=>!report.some(r=>r.id===s.id)),...report];await save('public/collection-status.json',status);await mkdir('work',{recursive:true});await save('work/riot-run.json',{checkedAt:now,report});console.log(JSON.stringify(report));
