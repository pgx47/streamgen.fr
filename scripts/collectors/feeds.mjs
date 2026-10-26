import {createHash} from 'node:crypto';
const text=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const validDate=s=>typeof s==='string'&&/T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
const allowed=(url,host)=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname===host}catch{return false}};
export function parseEurovision(html){
 const found=new Map();
 for(const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let data;try{data=JSON.parse(match[1])}catch{continue}
  for(const v of Array.isArray(data)?data:[data]){
   const p=v.publication,url=v.contentUrl??v.mainEntityOfPage;
   if(v['@type']!=='VideoObject'||!v.name||!validDate(p?.startDate)||!allowed(url,'eurovisionsport.com'))continue;
   found.set(url,{title:text(v.name),start:new Date(p.startDate).toISOString(),end:validDate(p.endDate)&&Date.parse(p.endDate)>Date.parse(p.startDate)?new Date(p.endDate).toISOString():null,url,genre:text(v.genre)||'Sport',free:v.isAccessibleForFree===true});
  }
 }
 return [...found.values()];
}
export function parseNasa(html){
 const found=new Map();
 for(const match of html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)){
  const epoch=match[1].match(/data-start-time=["'](\d{10})["']/)?.[1];
  const a=match[2].match(/<a\b[^>]*class=["'][^"']*nasatv-video-title[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if(!epoch||!a||!allowed(a[1],'plus.nasa.gov'))continue;
  found.set(a[1],{title:text(a[2]),start:new Date(Number(epoch)*1000).toISOString(),end:null,url:a[1],genre:'Espace',free:true});
 }
 return [...found.values()];
}
export function toEvent(item,feed,now){
 const id=feed.id+'-'+createHash('sha256').update(item.key||item.url).digest('hex').slice(0,16);
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.start));
 return {id,slug:id,title:item.title.slice(0,180),summary:feed.category==='créateurs'?`Créneau annoncé dans le calendrier Twitch officiel de ${feed.name}. Le programme peut changer ; consultez sa chaîne au moment prévu.`:feed.id==='nasa-plus'?`Un rendez-vous spatial annoncé par NASA+. Consultez la diffusion officielle et l’horaire en heure de Paris.`:`${item.genre} : rendez-vous annoncé par Eurovision Sport. Consultez le programme et les conditions de diffusion sur la page officielle.`,category:feed.category,subcategory:item.genre,date,start:item.start,end:item.end,sourceTimezone:'UTC',participants:[],frenchPresence:null,frenchNote:'Non renseignée par la source',organizer:feed.name,broadcastOptions:[{platform:feed.platform||feed.name,label:feed.name,url:item.url,access:item.free?'free':'unknown',accountRequired:null,language:'À vérifier',countries:[],territoryNote:'Disponibilité géographique à vérifier auprès du diffuseur',confirmed:true,restrictions:'Programme annoncé ; accès et restrictions du diffuseur applicables.',linkKind:'information'}],sources:[{label:feed.name+' · programme officiel',url:feed.url,sourceId:feed.id,collectedAt:now}],status:item.cancelled?'Annulé':'À venir',lastVerified:now,confirmation:item.cancelled?'Annulation indiquée par le diffuseur':'Diffusion programmée par le diffuseur',schedule:[],notes:['Horaire de diffusion annoncé, susceptible d’être modifié. Le flux actif n’est pas surveillé.'],popularity:null,discovery:true,major:false,featured:false,art:feed.id==='nasa-plus'?'ESPACE':feed.category==='créateurs'?'LIVE':feed.category==='esport'?'JEU':'SPORT',commercial:{affiliateUrl:null,sponsor:null,sponsored:false},vpnContext:null,postponement:null,cancellation:item.cancelled?'Annulation indiquée dans le calendrier officiel':null};
}
function icsDate(line){
 const m=line?.match(/^DTSTART(?:;TZID=(\/?[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?))?:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);if(!m)return null;
 const [,zone,y,mo,d,h,mi,s,z]=m;if(!zone&&!z)return null;
 let stamp=Date.UTC(+y,+mo-1,+d,+h,+mi,+s);
 if(zone){
  const f=new Intl.DateTimeFormat('sv-SE',{timeZone:zone.replace(/^\//,''),year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const target=`${y}-${mo}-${d} ${h}:${mi}:${s}`;
  for(let i=0;i<3;i++){const local=f.format(new Date(stamp));if(local===target)return new Date(stamp).toISOString();stamp+=Date.parse(target.replace(' ','T')+'Z')-Date.parse(local.replace(' ','T')+'Z')}
  return null;
 }
 return new Date(stamp).toISOString();
}
export function parseTwitch(input,name,login,now=new Date()){
 const ics=input.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,'');
 if(!ics.includes('BEGIN:VCALENDAR')||!ics.split('\n').some(l=>l==='NAME:'+name||l==='X-WR-CALNAME:'+name))throw Error('Identité du calendrier Twitch non correspondante');
 const found=[];
 for(const m of ics.matchAll(/BEGIN:VEVENT\n([\s\S]*?)\nEND:VEVENT/g)){
  const lines=m[1].split('\n'),value=key=>lines.find(l=>l.startsWith(key+':'))?.slice(key.length+1);
  const title=value('SUMMARY'),uid=value('UID');let start;try{start=icsDate(lines.find(l=>l.startsWith('DTSTART')))}catch{continue}
  if(!title||!uid||!start||/HORS STREAM|OFFLINE|OFF STREAM|hebdo|chill\b|react\b|discussion|session\b|on joue|découverte|vendredi|live du|farm\b/i.test(title))continue;
  const recurrence=value('RRULE');let instances=[{start,key:uid}];
  if(recurrence){
   const rule=Object.fromEntries(recurrence.split(';').map(v=>v.split('=')));
   if(rule.FREQ!=='WEEKLY'||Object.keys(rule).some(k=>!['FREQ','BYDAY','UNTIL','INTERVAL'].includes(k))||rule.INTERVAL&&rule.INTERVAL!=='1'||!/^((MO|TU|WE|TH|FR|SA|SU),?)+$/.test(rule.BYDAY||''))continue;
   const line=lines.find(l=>l.startsWith('DTSTART')),parts=line.match(/^(DTSTART(?:;TZID=[^:]+)?):(\d{8})T(\d{6})(Z?)$/);if(!parts)continue;
   const zone=line.match(/TZID=\/?([^:]+)/)?.[1]||'UTC';
   const localToday=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now),days=['SU','MO','TU','WE','TH','FR','SA'];
   let until=null;try{if(rule.UNTIL)until=icsDate('DTSTART:'+rule.UNTIL)}catch{}if(rule.UNTIL&&!until)continue;
   const excluded=new Set(lines.filter(l=>l.startsWith('EXDATE')).flatMap(l=>{const at=l.indexOf(':');return l.slice(at+1).split(',').map(t=>icsDate(l.slice(0,at).replace('EXDATE','DTSTART')+':'+t))}));
   instances=[];
   for(let i=0;i<14;i++){
    const day=new Date(Date.parse(localToday+'T12:00:00Z')+i*86400000);if(!rule.BYDAY.split(',').includes(days[day.getUTCDay()]))continue;
    const date=day.toISOString().slice(0,10).replaceAll('-',''),iso=icsDate(parts[1]+':'+date+'T'+parts[3]+parts[4]);
    if(iso&&Date.parse(iso)>=Date.parse(start)&&(!until||Date.parse(iso)<=Date.parse(until))&&!excluded.has(iso))instances.push({start:iso,key:uid+'|'+date});
   }
  }
  for(const instance of instances)found.push({cancelled:value('STATUS')==='CANCELLED',...instance,title:name+' — '+title.replace(/\\n/g,' ').replace(/\\([,;\\])/g,'$1'),end:null,url:'https://www.twitch.tv/'+login,genre:value('CATEGORIES')||'Créateurs',free:true,recurring:!!recurrence});
 }
 return found;
}
