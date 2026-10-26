import {dateKey} from '../../public/event-utils.mjs';
export function parseArteGuide(html,day){
 const found=new Map();
 const walk=(v,depth=0)=>{
  if(!v||typeof v!=='object'||depth>40)return;
  if(v.programId&&v.title&&v.availability?.upcomingDate&&v.url){
   const start=v.availability.upcomingDate;
   if(/^\d{4}-\d\d-\d\dT\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(start)&&Number.isFinite(Date.parse(start))&&dateKey(start)===day){
    const url=new URL(v.url,'https://www.arte.tv');
    if(url.protocol==='https:'&&url.hostname==='www.arte.tv'&&url.pathname.startsWith('/fr/videos/')){
     const iso=new Date(start).toISOString(),key=v.programId+'|'+iso;
     found.set(key,{key,title:[v.title,v.subtitle].filter(Boolean).join(' — '),start:iso,end:null,url:url.href,genre:v.genre?.label||'Culture et découvertes',summary:String(v.teaserText||v.shortDescription||'Programme annoncé dans le guide officiel ARTE.').slice(0,700),free:true,liveRights:v.livestreamRights===true});
    }
   }
  }
  for(const child of Object.values(v)){if(Array.isArray(child))child.forEach(x=>walk(x,depth+1));else if(typeof child==='object')walk(child,depth+1)}
 };
 for(const script of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?)\)<\/script>/g)){
  let part;try{part=JSON.parse(script[1])}catch{continue}
  const text=part[1];if(typeof text!=='string')continue;
  // React flight records contain JSON payloads, never evaluate source JavaScript.
  for(const line of text.split('\n')){
   const brace=line.indexOf('{'),array=line.indexOf('[');const starts=[brace,array].filter(i=>i>=0).sort((a,b)=>a-b);
   for(const pos of starts){try{walk(JSON.parse(line.slice(pos)));break}catch{}}
  }
 }
 return [...found.values()].sort((a,b)=>a.start.localeCompare(b.start));
}
