import{readFile,writeFile,rename,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{parseStreamLockups,parseWatchDetails,cleanYouTubeTitle}from'./collectors/youtube.mjs';
const now=new Date().toISOString();
const read=async p=>JSON.parse(await readFile(p,'utf8')),save=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v,null,2)+'\n');await rename(p+'.tmp',p)};
const CHANNELS=[
 {handle:'FFF',name:'FFF TV · Fédération française de football',genre:'Football',category:'sport'},
 {handle:'FFBB_Officiel',name:'FFBB · Fédération française de basket',genre:'Basketball',category:'sport'},
 {handle:'FIBA',name:'FIBA',genre:'Basketball',category:'sport'},
 {handle:'rolandgarros',name:'Roland-Garros',genre:'Tennis',category:'sport'},
 {handle:'Olympics',name:'Olympics · chaîne olympique officielle',genre:'Multisports',category:'sport'},
 {handle:'EuropeanSpaceAgency',name:'ESA · Agence spatiale européenne',genre:'Espace',category:'autres'},
 {handle:'NASA',name:'NASA',genre:'Espace',category:'autres'},
 {handle:'collegedefrance',name:'Collège de France',genre:'Sciences et conférences',category:'autres'},
 {handle:'Senat',name:'Sénat',genre:'Institutions',category:'autres'},
 {handle:'PublicSenat',name:'Public Sénat · LCP',genre:'Institutions',category:'autres'},
];
const RERUN=/\b(redif(?:fusion)?|rerun|replay|vod|best of|best-of|compilation)\b|\[redif\]/i;
const DETAILS_PER_CHANNEL=20;
async function page(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'StreamGen/1.0 (+https://streamgen.fr/sources/)','Accept-Language':'en-US,en;q=0.9'}});if(!r.ok)throw Error('HTTP '+r.status);const chunks=[];let size=0;for await(const c of r.body){size+=c.length;if(size>3500000)throw Error('Page trop volumineuse');chunks.push(c)}return Buffer.concat(chunks).toString('utf8')}
const catalog=await read('public/events.json'),registry=await read('public/sources.json'),status=await read('public/collection-status.json');
const report=[],observedAll=new Set();let added=0,updated=0;
for(const ch of CHANNELS){
 const url='https://www.youtube.com/@'+ch.handle+'/streams',id='yt-'+ch.handle.toLowerCase();
 try{
  const html=await page(url),lockups=parseStreamLockups(html);
  if(!lockups)throw Error('Données de chaîne illisibles');
  const candidates=lockups.filter(l=>l.status!=='past').slice(0,DETAILS_PER_CHANNEL),observed=new Set();let checked=0;
  for(const l of candidates){
   const watch='https://www.youtube.com/watch?v='+l.videoId;
   let d;try{d=parseWatchDetails(await page(watch))}catch{continue}
   checked++;if(!d||!d.livestream||d.premiere||!d.start||Date.parse(d.start)<=Date.now()||RERUN.test(l.title))continue;
   const title=cleanYouTubeTitle(l.title||d.title),eid='yt-'+l.videoId,slug='yt-'+createHash('sha256').update(l.videoId).digest('hex').slice(0,16),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d.start));
   const e={
    id:eid,slug,title:title.slice(0,180),summary:`Direct annoncé sur la chaîne YouTube officielle ${ch.name}. L’horaire provient des données de programmation YouTube et peut évoluer ; le flux actif n’est pas surveillé.`,
    category:ch.category,subcategory:ch.genre,date,start:d.start,end:d.end&&Date.parse(d.end)>Date.parse(d.start)?d.end:null,sourceTimezone:'UTC',
    participants:[],frenchPresence:null,frenchNote:'Non renseignée par la source',organizer:ch.name,
    broadcastOptions:[{platform:'YouTube',label:ch.name+' · YouTube',url:watch,access:'free',accountRequired:false,language:'À vérifier',countries:[],territoryNote:'Stream public sur la chaîne officielle ; restrictions territoriales éventuelles propres à YouTube',confirmed:true,restrictions:'Direct public annoncé sur la page vidéo officielle. La lecture ne requiert pas de compte.',linkKind:'channel'}],
    sources:[{label:ch.name+' · directs programmés',url,sourceId:id,collectedAt:now},{label:'Page vidéo YouTube',url:watch,sourceId:id,collectedAt:now}],
    status:'À venir',lastVerified:now,
    confirmation:'Direct programmé dans la page vidéo officielle YouTube',
    schedule:[],notes:['Horaire fourni par les données de programmation YouTube (startTimestamp), indépendant du texte affiché localisé.','Les vidéos en première (pré-enregistrées, durée connue) sont exclues : seules les diffusions en direct sont collectées.'],
    popularity:null,discovery:true,major:false,featured:false,art:ch.category==='autres'?'ESPACE':'SPORT',
    commercial:{affiliateUrl:null,sponsor:null,sponsored:false},vpnContext:null,postponement:null,cancellation:null,programType:'livestream'
   };
   observed.add(eid);
   const at=catalog.events.findIndex(x=>x.id===eid);
   if(at<0){catalog.events.push(e);added++}else{if(catalog.events[at].sourceImage)e.sourceImage=catalog.events[at].sourceImage;catalog.events[at]=e;updated++}
  }
  for(const old of catalog.events.filter(x=>x.sources.some(s=>s.sourceId===id)&&Date.parse(x.start)>Date.now()&&!observed.has(x.id)&&!['Annulé','Programmation à revérifier'].includes(x.status))){old.status='Programmation à revérifier';old.confirmation='Direct absent de la dernière liste de streams programmés de la chaîne';old.broadcastOptions=[];old.lastVerified=now;updated++}
  const entry={id,name:ch.name+' · page des directs YouTube',url,kind:'official',purpose:'Diffusions en direct programmées sur la chaîne YouTube officielle',checkedAt:now,notes:'Seuls les flux de type livestream (durée nulle, liveBroadcastDetails daté) sont retenus ; les premières et replays sont exclus. Horaire lu dans les données ISO de la page vidéo.'};
  const si=registry.sources.findIndex(s=>s.id===id);if(si<0)registry.sources.push(entry);else registry.sources[si]=entry;
  report.push({id,status:'ok',url,checkedAt:now,lockups:lockups.length,candidates:candidates.length,checked,observed:observed.size});
  observed.forEach(x=>observedAll.add(x));
 }catch(e){report.push({id,status:'error',url,checkedAt:now,error:e.message})}
}
if(added||updated){catalog.updatedAt=now;registry.updatedAt=now;await save('public/events.json',catalog);await save('public/sources.json',registry)}
status.sources=[...status.sources.filter(s=>!CHANNELS.some(c=>'yt-'+c.handle.toLowerCase()===s.id)),...report];await save('public/collection-status.json',status);
await mkdir('work',{recursive:true});await save('work/youtube-run.json',{checkedAt:now,added,updated,report});
console.log(JSON.stringify({added,updated,report},null,1));
