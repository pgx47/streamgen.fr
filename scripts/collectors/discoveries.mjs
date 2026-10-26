const absolute=v=>typeof v==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
export function localDate(v){
 if(!v||!/^20\d\d-\d\d-\d\d$/.test(v.day)||!/^\d\d:\d\d:\d\d$/.test(v.time)||typeof v.tz!=='string')return null;
 try{const target=v.day+' '+v.time,f=new Intl.DateTimeFormat('sv-SE',{timeZone:v.tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});let t=Date.parse(target.replace(' ','T')+'Z');for(let i=0;i<3;i++){const actual=f.format(new Date(t));if(actual===target)return new Date(t).toISOString();t+=Date.parse(target.replace(' ','T')+'Z')-Date.parse(actual.replace(' ','T')+'Z')}}catch{}return null;
}
function walk(v,visit,depth=0){if(!v||typeof v!=='object'||depth>40)return;visit(v);for(const x of Object.values(v))walk(x,visit,depth+1)}
export function parseCernUpcoming(data){
 if(data?.success!==true||!Array.isArray(data.results))throw Error('Réponse CERN invalide');const found=new Map();
 for(const v of data.results){if(v.restricted!==false||!/^\d+$/.test(v.indico_id||'')||v.indico_link!==`https://indico.cern.ch/event/${v.indico_id}/`||!v.title||!['Upcoming','Live'].includes(v.type))continue;const start=localDate(v.startDate),end=localDate(v.endDate);if(!start)continue;
 found.set(v.indico_id,{key:v.indico_id,title:String(v.title),start,end:end&&end>start?end:null,url:`https://live.cern/event/i${v.indico_id}`,announcement:v.indico_link,speaker:String(v.speakers||''),genre:'Sciences et conférences',free:true,timezone:v.startDate.tz});
 }return [...found.values()];
}

export function parseCernAnnouncement(html,url){
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{const v=JSON.parse(m[1]),start=absolute(v.startDate);if(v['@type']==='Event'&&v.url===url&&v.name&&start)return {title:String(v.name),start,end:absolute(v.endDate),summary:String(v.description||'').slice(0,700)}}catch{}
 }return null;
}
export function parseArteConcertSnapshot(html){
 const found=new Map(),programmes=new Set();const visit=v=>{
  if(v.programId&&v.title&&v.availability?.type)programmes.add(v.programId);
  if(!v.programId||!v.title||v.availability?.type!=='LIVESTREAM_WEB')return;const start=absolute(v.availability.upcomingDate);if(!start)return;
  let url;try{url=new URL(v.url,'https://www.arte.tv');if(url.protocol!=='https:'||url.hostname!=='www.arte.tv'||!url.pathname.startsWith('/fr/videos/')||url.username||url.password||url.port)return}catch{return}
  found.set(v.programId,{key:v.programId,title:[v.title,v.subtitle].filter(Boolean).join(' — '),start,end:null,url:url.href,summary:String(v.teaserText||'Concert annoncé en direct par ARTE.').slice(0,700),genre:'Concert',free:true,global:v.geoblocking?.code==='ALL'&&Array.isArray(v.geoblocking.exclusion)&&v.geoblocking.exclusion.length===0});
 };
 for(const m of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?)\)<\/script>/g)){
  try{const text=JSON.parse(m[1])[1];if(typeof text!=='string')continue;for(const line of text.split('\n')){const starts=[line.indexOf('{'),line.indexOf('[')].filter(p=>p>=0).sort((a,b)=>a-b);for(const p of starts){try{walk(JSON.parse(line.slice(p)),visit);break}catch{}}}}catch{}
 }return {items:[...found.values()],programmeCount:programmes.size};
}
export function parseArteConcert(html){return parseArteConcertSnapshot(html).items}

