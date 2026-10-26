function scripts(html,type){return [...html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>type==='cache'?/id=["']rb3-prerender-data-cache["']/.test(m[1]):/type=["']application\/ld\+json["']/.test(m[1])).flatMap(m=>{try{return [JSON.parse(m[2])]}catch{return []}})}
function walk(v,visit,depth=0){if(!v||typeof v!=='object'||depth>35)return;visit(v);for(const x of Object.values(v))walk(x,visit,depth+1)}
function safeUrl(value,host,path){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&!u.port&&u.pathname.startsWith(path)?u.href:null}catch{return null}}
export function discoverRedBull(html,now=new Date()){
 const found=new Map(),min=now.getTime()-86400000,max=now.getTime()+30*86400000;
 for(const data of scripts(html,'ld'))walk(data,v=>{if(v['@type']!=='Event')return;const url=safeUrl(v.url,'www.redbull.com','/int-en/events/'),start=Date.parse(v.startDate),end=Date.parse(v.endDate||v.startDate);if(url&&v.name&&Number.isFinite(start)&&Number.isFinite(end)&&end>=min&&start<=max)found.set(url,{url,title:String(v.name),start:v.startDate})});
 return [...found.values()].sort((a,b)=>a.start.localeCompare(b.start));
}
export function parseRedBullLive(html){
 const found=new Map();for(const data of scripts(html,'cache'))walk(data,v=>{
  if(!Array.isArray(v.liveStreams))return;
  for(const live of v.liveStreams){const ref=live.reference,url=safeUrl(ref?.externalUrl,'www.redbull.tv','/');if(ref?.type!=='videoLive'||!ref.id||!live.title||!url||!/^20\d\d-\d\d-\d\dT\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(live.startDate||'')||!Number.isFinite(Date.parse(live.startDate)))continue;
   found.set(ref.id,{key:ref.id,title:String(live.title),eventTitle:String(v.title||''),start:new Date(live.startDate).toISOString(),end:null,url,genre:'Sport et découvertes',free:false,cancelled:['cancelled','canceled'].includes(live.status),blockedCountries:Array.isArray(live.geoBlockedIn)&&live.geoBlockedIn.every(c=>typeof c==='string')?live.geoBlockedIn:null});
  }
 });return [...found.values()];
}
