import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{parseOengusMarathons}from'./collectors/oengus.mjs';
const now=new Date().toISOString();
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
const id='oengus',base='https://oengus.io/api/v1/marathons';
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),status=await read('public/collection-status.json');
const report=[];let added=0,updated=0;const observed=new Set();
async function get(u){const r=await fetch(u,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)','Accept':'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
try{
 const list=await get(base);
 const ids=parseOengusMarathons(list).filter(i=>Date.parse(i.end)>Date.now()).slice(0,15);
 for(const cand of ids){
  let m;try{m=await get(base+'/'+cand.key)}catch{continue}
  const twitch=m?.twitch;if(!twitch||typeof twitch!=='string')continue;
  const item={key:m.id,title:String(m.name||cand.title).slice(0,160),start:new Date(m.startDate).toISOString(),end:new Date(m.endDate).toISOString(),twitch,onsite:m.onsite===true,country:m.country||null,language:m.language||cand.language||null,location:m.location||null};
  const eid='oe-'+item.key,slug='oe-'+createHash('sha256').update(item.key).digest('hex').slice(0,12),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.start));
  const fr=item.country==='FR'||item.language==='fr'||/speedons|z ?event/i.test(item.title);
  const e={
   id:eid,slug,title:item.title,summary:`Marathon de speedrun annoncé sur Oengus${item.location?' ('+item.location+')':''}, diffusé sur la chaîne Twitch de l’événement. Le planning des runs peut évoluer.`,
   category:'créateurs',subcategory:'Speedrun',date,start:item.start,end:item.end,sourceTimezone:'UTC',
   participants:[],frenchPresence:fr||null,frenchNote:fr?'Événement francophone ou organisé en France':'Non renseignée par la source',organizer:'Oengus · '+item.title,
   broadcastOptions:[{platform:'Twitch',label:'Twitch · '+item.twitch,url:'https://www.twitch.tv/'+item.twitch.toLowerCase(),access:'free',accountRequired:false,language:item.language==='fr'?'Français':'À vérifier',countries:[],territoryNote:'Chaîne officielle du marathon déclarée sur Oengus',confirmed:true,restrictions:'Diffusion annoncée par l’organisateur ; le flux actif n’est pas surveillé.',linkKind:'channel'}],
   sources:[{label:'Oengus · marathon',url:'https://oengus.io/marathon/'+item.key,sourceId:id,collectedAt:now}],
   status:'À venir',lastVerified:now,confirmation:'Marathon listé dans l’API publique Oengus',
   schedule:[],notes:['Dates ISO fournies par l’API Oengus. Le détail des runs est publié par l’organisateur sur la page du marathon.'],
   popularity:null,discovery:true,major:/speedons|z ?event|esa marathon/i.test(item.title),featured:false,art:'LIVE',
   commercial:{affiliateUrl:null,sponsor:null,sponsored:false},vpnContext:null,postponement:null,cancellation:null,programType:'livestream'
  };
  observed.add(eid);
  const at=catalog.events.findIndex(x=>x.id===eid);
  if(at<0){catalog.events.push(e);added++}else{if(catalog.events[at].sourceImage)e.sourceImage=catalog.events[at].sourceImage;catalog.events[at]=e;updated++}
 }
 for(const old of catalog.events.filter(x=>x.id.startsWith('oe-')&&Date.parse(x.end||x.start)>Date.now()&&!observed.has(x.id)&&!['Annulé','Programmation à revérifier'].includes(x.status))){old.status='Programmation à revérifier';old.confirmation='Marathon absent de la dernière liste Oengus';old.broadcastOptions=[];old.lastVerified=now;updated++}
 const entry={id,name:'Oengus · marathons de speedrun',url:'https://oengus.io/',kind:'official',purpose:'Marathons speedrun avec chaîne Twitch déclarée',checkedAt:now,notes:'API publique sans clé. La chaîne Twitch est lue dans le détail de chaque marathon ; seuls les marathons avec chaîne renseignée sont publiés.'};
 const si=registry.sources.findIndex(s=>s.id===id);if(si<0)registry.sources.push(entry);else registry.sources[si]=entry;
 report.push({id,status:'ok',url:'https://oengus.io/',checkedAt:now,candidates:ids.length,observed:observed.size});
}catch(e){report.push({id,status:'error',url:'https://oengus.io/',checkedAt:now,error:e.message})}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
status.sources=[...status.sources.filter(s=>s.id!==id),...report];await save('public/collection-status.json',status);
await mkdir('work',{recursive:true});await save('work/oengus-run.json',{checkedAt:now,added,updated,report});
console.log(JSON.stringify({added,updated,report},null,1));
