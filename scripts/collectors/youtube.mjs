const PAST=/(?:diffus[ée] il y a|streamed|vues?\s*$|watched)/i,SCHEDULED=/(?:planifi|scheduled|premi|attente|waiting|upcoming)/i,LIVE=/(?:spectateurs|watching|en direct|live\b)/i;
export function extractJson(html,marker){
 const at=html.indexOf(marker);if(at<0)return null;
 const open=html.indexOf('{',at+marker.length);if(open<0)return null;
 let depth=0,quote=null,escape=false;
 for(let i=open;i<html.length;i++){
  const c=html[i];
  if(escape){escape=false;continue}
  if(c==='\\'&&quote){escape=true;continue}
  if(quote){if(c===quote)quote=null;continue}
  if(c==='"'||c==="'"){quote=c;continue}
  if(c==='{')depth++;else if(c==='}'&&--depth===0){
   try{return JSON.parse(html.slice(open,i+1))}catch{return null}
  }
 }
 return null;
}
export function parseStreamLockups(html){
 const data=extractJson(html,'ytInitialData');if(!data)return null;
 const lockups=[];
 const walk=o=>{
  if(Array.isArray(o)){for(const v of o)walk(v);return}
  if(o&&typeof o==='object'){
   if(o.lockupViewModel)lockups.push(o.lockupViewModel);
   for(const v of Object.values(o))walk(v);
  }
 };
 walk(data);
 const found=[];
 for(const l of lockups){
  const md=l.metadata?.lockupMetadataViewModel,videoId=String(l.contentId||'');
  const title=String(md?.title?.content||'').trim();
  if(!/^[A-Za-z0-9_-]{11}$/.test(videoId)||!title)continue;
  const parts=[];
  for(const row of md?.metadata?.contentMetadataViewModel?.metadataRows||[])
   for(const p of row?.metadataParts||[])
    parts.push(String(p?.text?.content||''));
  const joined=parts.join(' ');
  const status=LIVE.test(joined)&&!PAST.test(joined)?'live':PAST.test(joined)?'past':SCHEDULED.test(joined)?'scheduled':'unknown';
  found.push({videoId,title,status,scheduledText:parts.find(p=>SCHEDULED.test(p))||null});
 }
 return found;
}
export function parseWatchDetails(html){
 const d=extractJson(html,'ytInitialPlayerResponse');if(!d)return null;
 const live=d?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails;
 if(!live||typeof live!=='object')return{premiere:false,livestream:false};
 const length=Number(d?.videoDetails?.lengthSeconds||0);
 return{
  livestream:Number.isFinite(length)&&length===0,
  premiere:length>0,
  isLiveNow:live.isLiveNow===true,
  start:/^20\d\d-\d\d-\d\dT/.test(live.startTimestamp||'')?new Date(live.startTimestamp).toISOString():null,
  end:/^20\d\d-\d\d-\d\dT/.test(live.endTimestamp||'')?new Date(live.endTimestamp).toISOString():null,
  title:String(d?.videoDetails?.title||''),
  channel:String(d?.videoDetails?.author||d?.microformat?.playerMicroformatRenderer?.ownerChannelName||''),
  channelId:String(d?.videoDetails?.channelId||'')
 };
}
export function cleanYouTubeTitle(title){
 return String(title).replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*/u,'').replace(/^(?:LIVE|EN DIRECT|🔴)\s*[-–—:•]?\s*/i,'').trim();
}
// Un direct de chaîne officielle n'est pas toujours un rendez-vous : échauffements, pesées,
// conférences de presse et annonces de composition restent hors agenda.
const NON_EVENT=/\b(practice|warm[- ]?up|weigh[- ]?in|ceremonial|press conference|post[- ]?fight|media day|open training|training session|draw ceremony|tirage au sort|conférence de presse|liste des|compositions?|point presse)\b/i;
export function youtubeIsEvent(title){
 const t=String(title||'');
 if(!t.trim())return false;
 return !NON_EVENT.test(t);
}
