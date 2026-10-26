function timestamp(v){const n=v?.Seconds;if(!Number.isSafeInteger(n)||n<1577836800||n>4102444800)return null;return new Date(n*1000).toISOString()}
export function parseSpaceXUpcoming(tiles,timings){
 if(!Array.isArray(tiles)||!timings||typeof timings!=='object'||Array.isArray(timings))throw Error('Calendrier SpaceX invalide');const found=new Map();
 for(const v of tiles){if(!v||typeof v.link!=='string'||typeof v.missionStatus!=='string'||(v.missionStatus==='upcoming'&&!v.correlationId))throw Error('Identité de mission SpaceX incomplète');if(v.missionStatus!=='upcoming'||!/^[-a-z0-9]+$/.test(v.link||'')||!v.correlationId)continue;const t=timings[v.correlationId];if(!t||typeof t!=='object'||!Object.hasOwn(t,'PrimaryLaunchDate')||!Object.hasOwn(t,'PrimaryLaunchWindow'))throw Error('Réponse horaire incomplète pour '+v.link);const start=timestamp(t?.PrimaryLaunchWindow?.Open),close=timestamp(t?.PrimaryLaunchWindow?.Close);if(!start||!close||close<start)continue;
  found.set(v.link,{key:v.link,title:String(v.title||'Mission SpaceX'),vehicle:String(v.vehicle||'Fusée'),start,end:null,windowClose:close,url:'https://www.spacex.com/launches/'+v.link,genre:'Espace',free:false});
 }return [...found.values()];
}
export function spaceXMission(item,detail){
 if(detail?.missionId!==item.key)return null;
 const streams=[...new Set((detail.webcasts||[]).flatMap(v=>{
  const id=String(v.videoId||'').trim();if(v.streamingVideoType==='x-live-studio'&&/^[A-Za-z0-9]{6,40}$/.test(id))return ['https://x.com/i/broadcasts/'+id];if(v.streamingVideoType==='youtube'&&/^[A-Za-z0-9_-]{11}$/.test(id))return ['https://www.youtube.com/watch?v='+id];return [];
 }))];return {...item,streams};
}
export function corroborateLaunch(item,data){
 const v=data?.results?.find(v=>v.info_urls?.some(i=>i.url===item.url));if(!v||!Number.isFinite(Date.parse(v.net)))return null;
 return {id:String(v.id),start:new Date(v.net).toISOString(),agreement:Date.parse(v.net)===Date.parse(item.start)};
}

export function spaceXNeedsRefresh(item,events,now=new Date()){return events.some(e=>e.externalMissionId===item.key)||(Date.parse(item.start)>=now.getTime()-86400000&&Date.parse(item.start)<=now.getTime()+30*86400000)}
