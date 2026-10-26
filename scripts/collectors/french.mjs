import{readFileSync}from'node:fs';
const roster=JSON.parse(readFileSync(new URL('../../data/french-roster.json',import.meta.url)));
const patterns=[...roster.structures,...roster.teams,...roster.athletes]
 .filter(s=>s&&s.trim().length>1)
 .sort((a,b)=>b.length-a.length)
 .map(s=>({name:s.trim(),re:new RegExp('\\b'+s.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i')}));
export function frenchGuess(e){
 const hay=[e.title,...(e.participants||[]),e.organizer,e.subcategory].filter(Boolean).join(' | ');
 for(const {name,re} of patterns){
  if(re.test(hay))return {name,note:`« ${name} » identifié dans le titre, les participants ou l’organisateur`};
 }
 return null;
}
