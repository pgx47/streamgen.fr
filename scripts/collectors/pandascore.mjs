export const COVERED=new Set(['cs-go','dota-2','rocketleague','valorant','lol','league-of-legends']);
const GAMES={'r6siege':'Rainbow Six','starcraft-2':'StarCraft II','apex':'Apex Legends','call-of-duty':'Call of Duty','overwatch':'Overwatch','fifa':'EA FC','nba-2k':'NBA 2K','pubg':'PUBG','kog':'Honor of Kings','eafc':'EA FC','smite':'SMITE','brawlhalla':'Brawlhalla','ow':'Overwatch','sc2':'StarCraft II','wild-rift':'Wild Rift','mlbb':'Mobile Legends','mlbb-bb':'Mobile Legends','honorofkings':'Honor of Kings','efootball':'eFootball','quake':'Quake','heroes-of-the-storm':'Heroes of the Storm','trackmania':'Trackmania','pokemon':'Pokémon','hearthstone':'Hearthstone','fifaesports':'EA FC','teamfight-tactics':'Teamfight Tactics','street-fighter':'Street Fighter','tekken':'Tekken','mk':'Mortal Kombat','guilty-gear':'Guilty Gear','smash-ultimate':'Smash Ultimate','smash-melee':'Smash Melee'};
export function pandascoreToItems(matches){
 const found=[];
 for(const m of Array.isArray(matches)?matches:[]){
  if(!m||!Number.isFinite(m.id)||!m.begin_at||m.status==='finished'||m.status==='canceled')continue;
  const slug=String(m.videogame?.slug||'');
  if(COVERED.has(slug))continue;
  const teams=(m.opponents||[]).map(o=>o?.opponent?.name).filter(Boolean).slice(0,2);
  const streams=(m.streams_list||[]).filter(s=>s?.raw_url&&/^https:\/\//.test(s.raw_url)).sort((a,b)=>Number(b.official===true)-Number(a.official===true)).slice(0,3).map(s=>({url:s.raw_url,official:s.official===true,main:s.main===true,lang:s.language||null}));
  const series=[m.league?.name,m.serie?.full_name||m.serie?.name,m.tournament?.name].filter(Boolean);
  found.push({key:'ps-'+m.id,title:String(m.name||series[0]||'').trim().slice(0,180),start:m.begin_at,end:m.end_at&&Date.parse(m.end_at)>Date.parse(m.begin_at)?m.end_at:null,game:GAMES[slug]||String(m.videogame_title||m.videogame?.name||slug||'Esport'),slug,teams,streams,series:series[0]||null,serie:series[1]||series[0]||null,status:m.status});
 }
 return found;
}
export function platformOf(url){
 try{const h=new URL(url).hostname.replace(/^www\./,'');
 if(h.includes('twitch.tv'))return'Twitch';if(h.includes('youtube.com')||h.includes('youtu.be'))return'YouTube';if(h.includes('kick.com'))return'Kick';if(h.includes('trovo.live'))return'Trovo';if(h.includes('facebook.com'))return'Facebook';if(h.includes('afreeca'))return'AfreecaTV';return'Web'}catch{return null}
}
