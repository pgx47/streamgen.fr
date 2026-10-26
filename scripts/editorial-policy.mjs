export function publishableEvent(e){
 if(e.programType==='scheduled-tv')return false;
 if(/\b(?:rediffusion|rerun|replay|vod|best[- ]of|compilation)\b/i.test(e.title||''))return false;
 if(e.category!=='créateurs')return true;
 const title=String(e.title||'');
 return /\bz ?event\b|gp explorer|speedons|spee ?dons|twitch rivals|showmatch|marathon|caritatif|paris games week|\bpgw\b|infernaLAN|bingothon|finnruns|\buksg\b|speed together|retro runway|pixels for people|speedrun/i.test(title)||e.sources?.some(s=>s.sourceId==='oengus');
}
