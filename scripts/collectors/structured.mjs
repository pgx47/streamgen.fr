// Extract JSON objects from server-rendered documents without evaluating JavaScript.
export function jsonObjectsAfter(html,needle){
 const result=[];let from=0;
 while(true){const pos=html.indexOf(needle,from);if(pos<0)break;const start=html.lastIndexOf('{',pos);from=pos+needle.length;if(start<0)continue;let depth=0,quoted=false,escape=false;
 for(let i=start;i<html.length&&i-start<1500000;i++){const c=html[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue}if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{result.push(JSON.parse(html.slice(start,i+1)))}catch{}break}}
 }
 return result;
}
export function parseRiotMatches(html){
 const found=new Map();
 for(const v of jsonObjectsAfter(html,'"__typename":"EventMatch"')){
  if(!/^\d+$/.test(v.id||'')||!/^20\d\d-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v.startTime||'')||!Number.isFinite(Date.parse(v.startTime))||!v.league?.name)continue;
  const teams=(v.matchTeams||[]).map(t=>String(t.name||'').trim()).filter(t=>t&&t!=='TBD');
  const phase=String(v.blockName||''),league=String(v.league.name);
  found.set(v.id,{key:v.id,title:league+' — '+(teams.length===2?teams.join(' vs '):phase||'Affiche à confirmer'),start:new Date(v.startTime).toISOString(),end:null,url:'https://valorantesports.com/en-US/matches',genre:'VALORANT',free:false,teams,league,phase,cancelled:v.state==='canceled'||v.state==='cancelled',state:v.state,streams:(v.streams||[]).filter(s=>['twitch','youtube'].includes(String(s.provider).toLowerCase())&&typeof s.parameter==='string')});
 }
 return [...found.values()];
}
