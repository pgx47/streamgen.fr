import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseWttDay,mergeCollectedEvents } from './collectors/core.mjs';
const root=new URL('../',import.meta.url),now=new Date().toISOString();
const read=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
const atomic=async(name,data)=>{const file=new URL(name,root);await writeFile(new URL(name+'.tmp',root),JSON.stringify(data,null,2)+'\n');await rename(new URL(name+'.tmp',root),file)};
const catalog=await read('public/events.json'),registry=await read('public/sources.json');
let prior={sources:[]};try{prior=await read('public/collection-status.json')}catch{}
const patches=[],results=[];
async function fetchOfficial(url){
 const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='tickets.wttmontpellier.com')throw Error('Source hors liste autorisée');
 const response=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'StreamGenCalendar/1.0 (+https://streamgen.fr/sources/)','Accept':'text/html'}});
 if(!response.ok)throw Error('HTTP '+response.status);
 if(!response.headers.get('content-type')?.includes('text/html'))throw Error('Format inattendu');
 const reader=response.body.getReader();let bytes=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1500000){await reader.cancel();throw Error('Réponse trop volumineuse')}chunks.push(value)}return Buffer.concat(chunks).toString('utf8');
}
// Discovery is constrained to dated links on the organizer's own calendar.
let urls=[];
try{
 const html=await fetchOfficial('https://tickets.wttmontpellier.com/fr');
 urls=[...new Set([...html.matchAll(/href=["']([^"']*\/fr\/[a-z]+_\d{2}_[a-z]+_20\d{2})["']/g)].map(m=>new URL(m[1],'https://tickets.wttmontpellier.com').href))].slice(0,20);
 if(!urls.length)throw Error('Aucune journée officielle détectée');
 results.push({id:'wtt-index',status:'ok',checkedAt:now,detectedPages:urls.length});
}catch(e){results.push({id:'wtt-index',status:'error',checkedAt:now,error:e.message});}
for(const url of urls){
 try{
  const html=await fetchOfficial(url),parsed=parseWttDay(html,url);
  const id='wtt-montpellier-'+parsed.date,existing=catalog.events.find(e=>e.id===id);
  // New editions require a new verified broadcaster agreement; never inherit previous-year rights.
  if(!existing){results.push({id,url,status:'candidate',checkedAt:now,date:parsed.date,reason:'Nouvelle journée : diffusion et édition à vérifier'});continue;}
  const hash=createHash('sha256').update(JSON.stringify(parsed)).digest('hex');
  const source=existing.sources.find(s=>s.url===url);if(!source)throw Error('Source de la fiche non correspondante');
  const previous=prior.sources.find(s=>s.id===id);
  const dateVerified=previous?.lastSuccessfulCheck;
  // One daily publication updates the proof for this source only, never all event claims.
  if(hash!==previous?.contentHash||!dateVerified||dateVerified.slice(0,10)!==now.slice(0,10)){
   patches.push({id,start:`${parsed.date}T${parsed.times[0]}:00+01:00`,schedule:parsed.times.map((time,i)=>({label:i?'Session suivante':'Session de journée',start:`${parsed.date}T${time}:00+01:00`})),scheduleVerifiedAt:now,sources:existing.sources.map(s=>s.url===url?{...s,collectedAt:now}:s)});
   const reg=registry.sources.find(s=>s.url===url);if(reg)reg.checkedAt=now;
  }
  results.push({id,url,status:'ok',checkedAt:now,lastSuccessfulCheck:now,contentHash:hash,date:parsed.date});
 }catch(e){results.push({url,status:'error',checkedAt:now,error:e.message});}
}
const successes=results.filter(s=>s.status==='ok'&&s.id!=='wtt-index').length;
await mkdir(new URL('work/',root),{recursive:true});
await writeFile(new URL('work/collection-run.json',root),JSON.stringify({checkedAt:now,results},null,2));
if(!successes)throw Error('Aucune journée vérifiée : dernier catalogue conservé, rapport disponible dans les artefacts Actions.');
if(patches.length){catalog.events=mergeCollectedEvents(catalog.events,patches);catalog.updatedAt=now;catalog.coverage='Sélection non exhaustive. Horaires WTT contrôlés automatiquement ; autres sources vérifiées manuellement.';await atomic('public/events.json',catalog);await atomic('public/sources.json',registry);await atomic('public/collection-status.json',{mode:'scheduled',checkedAt:now,scope:'Horaires des sessions WTT Montpellier uniquement. Pas de contrôle des flux, droits TV ou autres catégories.',sources:results});}
console.log(JSON.stringify({verifiedPages:successes,updatedEvents:patches.length,errors:results.filter(s=>s.status==='error').length,candidates:results.filter(s=>s.status==='candidate').length}));
