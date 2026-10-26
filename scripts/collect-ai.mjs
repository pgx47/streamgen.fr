import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{AI_SYSTEM,validateAiItems,cleanAiJson}from'./collectors/ai.mjs';
const now=new Date().toISOString();
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
const key=process.env.DEEPSEEK_API_KEY,model=process.env.LLM_MODEL||'deepseek-chat';
const allowed=process.env.LLM_BUDGET_ALLOWED==='true';
const TARGETS=[
 {id:'ai-culturebox',name:'france.tv · Arts & spectacles',url:'https://www.france.tv/spectacles-et-culture/',prompt:'Identifie uniquement les programmes explicitement annoncés EN DIRECT (mentions « en direct », « live », « direct »). Ignore tout le reste (replays, extraits, VOD).'},
];
async function page(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)'}});if(!r.ok)throw Error('HTTP '+r.status);const t=await r.text();return t.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,30000)}
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),status=await read('public/collection-status.json');
const report=[],observedAll=new Set();let added=0,updated=0;
if(!key)report.push({id:'ai',status:'error',checkedAt:now,error:'DEEPSEEK_API_KEY absente'});
else if(!allowed)report.push({id:'ai',status:'skipped',checkedAt:now,reason:'Budget LLM quotidien déjà consommé'});
else for(const target of TARGETS){
 try{
  const raw=await page(target.url);
  const r=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',signal:AbortSignal.timeout(60000),headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:AI_SYSTEM},{role:'user',content:target.prompt+'\n\nDate du jour : '+now.slice(0,10)+'\n\nTexte brut :\n'+raw}],temperature:0.1,max_tokens:4000})});
  if(!r.ok)throw Error('LLM HTTP '+r.status);
  const json=await r.json(),items=cleanAiJson(json?.choices?.[0]?.message?.content||'[]');
  const {ok,bad}=validateAiItems(items,{origin:target.url.startsWith('https://www.france.tv')?'https://www.france.tv':null});
  const observed=new Set();
  for(const item of ok){
   const eid='ai-'+target.id.slice(3)+'-'+createHash('sha256').update(target.id+'|'+item.title+'|'+item.start).digest('hex').slice(0,12);
   const e={
    id:eid,slug:eid,title:item.title,summary:item.summary||`Direct annoncé sur ${target.name}. Horaire extrait par IA depuis la page officielle ; à vérifier chez le diffuseur.`,
    category:item.category,subcategory:item.subcategory||target.name,date:item.date,start:item.start,end:item.end,sourceTimezone:'UTC',
    participants:item.participants,frenchPresence:item.frenchPresence||null,frenchNote:item.frenchPresence?'Présence française détectée dans le texte source':'Non renseignée par la source',organizer:target.name,
    broadcastOptions:item.watchUrl?[{platform:'Web',label:target.name,url:item.watchUrl,access:'free',accountRequired:null,language:'Français',countries:['France'],territoryNote:'Diffusion gratuite france.tv, géolocalisation applicable',confirmed:true,restrictions:'Lien extrait de la page officielle par analyse IA ; le flux actif n’est pas surveillé.',linkKind:'channel'}]:[],
    sources:[{label:target.name,url:target.url,sourceId:target.id,collectedAt:now}],
    status:'À venir',lastVerified:now,confirmation:'Direct extrait par IA de la page officielle (validation stricte appliquée)',
    schedule:[],notes:['Fiche générée par analyse IA d’une page officielle, avec validation stricte : horaire ISO obligatoire, fin jamais déduite, lien https exigé.','Les éléments incertains rejetés par la validation ne sont jamais publiés.'],
    popularity:null,discovery:true,major:false,featured:false,art:'SPORT',
    commercial:{affiliateUrl:null,sponsor:null,sponsored:false},vpnContext:null,postponement:null,cancellation:null,programType:'livestream'
   };
   observed.add(eid);observedAll.add(eid);
   const at=catalog.events.findIndex(x=>x.id===eid);
   if(at<0){catalog.events.push(e);added++}else{if(catalog.events[at].sourceImage)e.sourceImage=catalog.events[at].sourceImage;catalog.events[at]=e;updated++}
  }
  for(const old of catalog.events.filter(x=>x.id.startsWith('ai-'+target.id.slice(3)+'')&&Date.parse(x.start)>Date.now()&&!observed.has(x.id)&&!['Annulé','Programmation à revérifier'].includes(x.status))){old.status='Programmation à revérifier';old.confirmation='Direct absent de la dernière extraction IA de cette page';old.broadcastOptions=[];old.lastVerified=now;updated++}
  const entry={id:target.id,name:target.name+' · extraction IA',url:target.url,kind:'official',purpose:'Directs extraits par IA de la page officielle avec validation stricte',checkedAt:now,notes:'Analyse LLM parseur (température 0.1) limitée au texte de la page officielle ; chaque fiche exige un horaire ISO valide et un lien https, sinon rejet.'};
  const si=registry.sources.findIndex(s=>s.id===target.id);if(si<0)registry.sources.push(entry);else registry.sources[si]=entry;
  report.push({id:target.id,status:'ok',url:target.url,checkedAt:now,extracted:items.length??0,published:ok.length,rejected:bad.length});
 }catch(e){report.push({id:target.id,status:'error',url:target.url,checkedAt:now,error:e.message})}
}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
status.sources=[...status.sources.filter(s=>!TARGETS.some(t=>t.id===s.id)&&s.id!=='ai'),...report];await save('public/collection-status.json',status);
await mkdir('work',{recursive:true});await save('work/ai-run.json',{checkedAt:now,added,updated,report});
console.log(JSON.stringify({added,updated,report},null,1));
