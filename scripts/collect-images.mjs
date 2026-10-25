import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {imageSubject,commonsImageMatch,officialImageCandidates,officialLicensedImage,allowedImageUrl} from './collectors/images.mjs';
import {eventVisual} from '../public/event-utils.mjs';
const now=new Date().toISOString(),day=now.slice(0,10),hash=s=>createHash('sha256').update(s).digest('hex').slice(0,24);
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(p,d)=>{await writeFile(p+'.tmp',JSON.stringify(d,null,2)+'\n');await rename(p+'.tmp',p)};
const catalog=await read('public/events.json'),registry=await read('public/sources.json');
let cache={subjects:{},days:{}};try{cache=await read('data/image-cache.json')}catch{}
let library={assets:{},assignments:{}};try{library=await read('public/automatic-images.json')}catch{}
const budget=cache.days[day]??={newAssets:0};cache.days[day]=budget;
const registryUrls=new Set(registry.sources.map(s=>s.url));
const officialHosts=[...new Set(registry.sources.map(s=>new URL(s.url).hostname))];
const mediaHosts=[...officialHosts,'upload.wikimedia.org','cdn.sanity.io','images.contentstack.io','images-assets.nasa.gov','imageservice.evsports.opentv.com'];
const networkHosts=[...mediaHosts,'commons.wikimedia.org'];
const report=[],pending=[];let inspected=0,assigned=0;
await mkdir('data',{recursive:true});await mkdir('work',{recursive:true});await mkdir('public/assets/auto-images',{recursive:true});
async function fetchBytes(url,limit=2000000){
 if(!allowedImageUrl(url,networkHosts))throw Error('URL hors liste autorisée');
 let next=url;
 for(let hop=0;hop<3;hop++){
  const r=await fetch(next,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)','Accept':'application/json,text/html,image/jpeg,image/png'}});
  if([301,302,303,307,308].includes(r.status)){next=new URL(r.headers.get('location'),next).href;if(!allowedImageUrl(next,networkHosts))throw Error('Redirection non autorisée');continue}
  if(!r.ok)throw Error('HTTP '+r.status);
  const chunks=[];let size=0;for await(const c of r.body){size+=c.length;if(size>limit)throw Error('Limite de taille dépassée');chunks.push(c)}
  return {bytes:Buffer.concat(chunks),type:r.headers.get('content-type')||''};
 }
 throw Error('Trop de redirections');
}
const jsonUrl=params=>'https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({format:'json',action:'query',prop:'imageinfo',iiprop:'url|size|mime|extmetadata',iiurlwidth:'1280',...params});
async function commonsCandidates(e,subject){
 let pages=[];
 // Category membership avoids confusing unrelated championships and old upload dates.
 if(subject.query==='League of Legends World Championship'){
  for(const year of [+subject.year,+subject.year-1]){
   const data=JSON.parse((await fetchBytes(jsonUrl({generator:'categorymembers',gcmtitle:`Category:${year} League of Legends World Championship`,gcmtype:'file',gcmlimit:'15'}))).bytes);
   pages.push(...Object.values(data.query?.pages||{}));
   if(pages.some(p=>commonsImageMatch(e,subject,p)?.scope==='event'))break;
  }
 }else{
  for(const query of [subject.query+' '+(subject.scope==='event'?subject.year:''),subject.query]){
   const data=JSON.parse((await fetchBytes(jsonUrl({generator:'search',gsrnamespace:'6',gsrlimit:'8',gsrsearch:query+' filetype:bitmap'}))).bytes);
   pages.push(...Object.values(data.query?.pages||{}));
   if(pages.some(p=>commonsImageMatch(e,subject,p)))break;
  }
 }
 return [...new Map(pages.map(p=>[p.title,p])).values()].map(p=>commonsImageMatch(e,subject,p)).filter(Boolean).sort((a,b)=>b.score-a.score);
}
function imageType(bytes,type){
 if(bytes.length<100)return null;
 if(type.includes('image/jpeg')&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpg';
 if(type.includes('image/png')&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.readUInt32BE(16)>300&&bytes.readUInt32BE(20)>200)return 'png';
 return null;
}
async function storeImage(candidate){
 const existing=Object.values(library.assets).find(a=>a.originalUrl===candidate.originalUrl&&a.license===candidate.license);
 if(existing){try{await stat('public'+existing.src);return existing}catch{}}
 const assets=Object.values(library.assets);
 if(budget.newAssets>=4||assets.length>=80||assets.reduce((n,a)=>n+(a.bytes||0),0)>=24000000)throw Error('Budget images atteint : illustration existante conservée');
 let fetched,lastError;
 for(const url of [...new Set([candidate.downloadUrl,candidate.originalDownloadUrl].filter(Boolean))]){
  try{if(!allowedImageUrl(url,mediaHosts))throw Error('Hôte média non autorisé');fetched=await fetchBytes(url);break}catch(e){lastError=e}
 }
 if(!fetched)throw lastError||Error('Image indisponible');
 if(assets.reduce((n,a)=>n+(a.bytes||0),0)+fetched.bytes.length>24000000)throw Error('Budget de stockage images atteint');
 const ext=imageType(fetched.bytes,fetched.type);if(!ext)throw Error('Format image non pris en charge');
 const id=hash(fetched.bytes),src=`/assets/auto-images/${id}.${ext}`;
 const {downloadUrl,originalDownloadUrl,score,...entry}=candidate;
 const stored={...entry,creditKey:'auto-'+id,src,approved:true,checkedAt:now,bytes:fetched.bytes.length};
 // Keep page provenance, not transient signed URL parameters, in the public register.
 for(const key of ['originalUrl','sourceUrl'])if(stored[key]){const u=new URL(stored[key]);if([...u.searchParams.keys()].some(k=>/token|signature|auth|secret/i.test(k)))u.search='';stored[key]=u.href}
 await writeFile('public'+src,fetched.bytes);library.assets[stored.creditKey]=stored;budget.newAssets++;
 return stored;
}
const groups=new Map();
for(const e of catalog.events.filter(e=>e.date>=day&&e.date<=new Date(Date.now()+120*86400000).toISOString().slice(0,10))){
 const subject=imageSubject(e);if(!subject)continue;
 const key=hash(subject.query+'|'+subject.scope+'|'+(subject.scope==='creator'?'':subject.year));
 if(!groups.has(key))groups.set(key,{subject,events:[]});groups.get(key).events.push(e);
}
for(const [key,{subject,events}] of groups){
 const representative=events[0],existingVisual=eventVisual({...representative,sourceImage:null});
 // Curated exact-edition artwork and licensed identity portraits remain preferred.
 if((existingVisual.scope==='event'&&String(existingVisual.eventYear)===subject.year)||(subject.scope==='creator'&&existingVisual.scope==='creator')){report.push({subject:subject.name,status:'curated',reason:'Visuel spécifique déjà validé'});continue}
 let state=cache.subjects[key]||{},chosen=library.assets[state.assetKey];
 if(state.checkedDay!==day&&inspected<6){
  inspected++;let candidates=[];
  const source=representative.sources.find(s=>registryUrls.has(s.url));
  if(source){try{
   const page=(await fetchBytes(source.url,3000000)).bytes.toString('utf8');
   const images=officialImageCandidates(page,source.url);
   for(const item of images){const licensed=officialLicensedImage(representative,subject,item);if(licensed)candidates.push(licensed);else pending.push({subject:subject.name,sourceUrl:source.url,imageUrl:new URL(item.url).origin+new URL(item.url).pathname,status:'pending',reason:'Aperçu repéré, mais licence et correspondance exactes non établies'})}
  }catch(e){report.push({subject:subject.name,stage:'official',status:'error',error:e.message})}}
  try{candidates.push(...await commonsCandidates(representative,subject))}catch(e){report.push({subject:subject.name,stage:'commons',status:'error',error:e.message})}
  candidates.sort((a,b)=>b.score-a.score);
  let error;
  for(const candidate of candidates.slice(0,3)){try{chosen=await storeImage(candidate);break}catch(e){error=e.message}}
  state={checkedDay:day,assetKey:chosen?.creditKey||null,lastSuccessfulCheck:chosen?now:state.lastSuccessfulCheck||null};cache.subjects[key]=state;
  report.push({subject:subject.name,status:chosen?'selected':'fallback',candidates:candidates.length,assetKey:chosen?.creditKey||null,...(error?{error}:{})});
 }
 if(chosen){
  for(const e of events){
   const image={...chosen,binding:e.id};
   // Images cannot silently switch editions when an event is rescheduled.
   if(image.scope==='event'&&String(image.eventYear)!==e.date.slice(0,4))continue;
   if(e.sourceImage?.creditKey!==image.creditKey||e.sourceImage?.binding!==e.id){e.sourceImage=image;library.assignments[e.id]=image.creditKey;assigned++}
  }
 }
}
if(assigned){catalog.updatedAt=now;await save('public/events.json',catalog)}
library.updatedAt=now;await save('public/automatic-images.json',library);await save('data/image-cache.json',cache);
const status={checkedAt:now,mode:'scheduled',subjectsChecked:inspected,assignedEvents:assigned,storedAssets:Object.keys(library.assets).length,newAssetsToday:budget.newAssets,pending:pending.slice(0,40),results:report};
await save('public/image-collection-status.json',status);await save('work/images-run.json',status);
const previous=await read('public/collection-status.json');previous.sources=previous.sources.filter(s=>s.id!=='automatic-images');previous.sources.push({id:'automatic-images',status:report.some(r=>r.status==='selected')||Object.keys(library.assets).length?'ok':'fallback',checkedAt:now,assignedEvents:assigned,storedAssets:status.storedAssets,pending:status.pending.length,reportUrl:'/image-collection-status.json'});await save('public/collection-status.json',previous);
console.log(JSON.stringify({subjectsChecked:inspected,assignedEvents:assigned,storedAssets:status.storedAssets,newAssetsToday:budget.newAssets,pending:status.pending.length,results:report}));
