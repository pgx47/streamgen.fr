export function startggStreamURL(stream){
 const name=String(stream?.streamName||'').trim(),source=String(stream?.streamSource||'').toUpperCase();
 if(!name)return null;
 if(source==='TWITCH')return{platform:'Twitch',url:'https://www.twitch.tv/'+name.toLowerCase()};
 if(source==='YOUTUBE')return{platform:'YouTube',url:'https://www.youtube.com/@'+name.replace(/\s+/g,'')};
 if(source==='KICK')return{platform:'Kick',url:'https://kick.com/'+name.toLowerCase()};
 return null;
}
export function startggToItems(nodes){
 const found=[];
 for(const t of Array.isArray(nodes)?nodes:[]){
  if(!t||!Number.isFinite(t.id)||!Number.isFinite(t.startAt))continue;
  const slug=String(t.slug||'').replace(/^tournament\//,'');
  found.push({
   key:'sg-'+t.id,
   title:String(t.name||'').trim().slice(0,180),
   start:new Date(t.startAt*1000).toISOString(),
   end:Number.isFinite(t.endAt)&&t.endAt>t.startAt?new Date(t.endAt*1000).toISOString():null,
   url:'https://www.start.gg/'+encodeURI(t.slug||('tournament/'+t.id)),
   game:(t.events||[]).map(e=>e?.videogame?.name||e?.videogame?.displayName).filter(Boolean).map(name=>name==='Ultimate'?'Super Smash Bros. Ultimate':name==='Melee'?'Super Smash Bros. Melee':name)[0]||'Jeux de combat',
   city:String(t.city||'').trim()||null,
   streams:(t.streams||[]).map(startggStreamURL).filter(Boolean),
   events:(t.events||[]).filter(e=>Number.isFinite(e?.startAt)&&e.startAt>=t.startAt-86400).map(e=>({label:String(e.name||'').trim().slice(0,80),start:new Date(e.startAt*1000).toISOString()})).slice(0,8)
  });
 }
 return found;
}
export const STARTGG_QUERY='query($perPage:Int){tournaments(query:{perPage:$perPage,filter:{upcoming:true,countryCode:"FR"}}){nodes{id name slug startAt endAt city events{id name slug startAt videogame{name displayName}} streams{streamName streamSource streamType}}}}';
