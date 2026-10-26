export const AI_SYSTEM=`Tu es l'éditeur automatisé de StreamGen, un annuaire strict de retransmissions EN DIRECT.
Analyse le texte brut fourni et extrais les événements diffusés en direct sous forme de tableau JSON valide.
RÈGLES STRICTES :
1. Que du direct : ignore les VOD, replays, documentaires, bandes-annonces et programmes enregistrés.
2. Aucune invention : date, heure, fin ou participant absent du texte => null. Jamais d'horaire déduit.
3. Neutralité : "summary" factuel en français, 2 phrases max, aucun superlatif.
4. Sortie : UNIQUEMENT du JSON valide, sans markdown, schéma exact :
[{"title":"...","summary":"...","category":"sport|esport|créateurs|autres","subcategory":"...","date":"YYYY-MM-DD","start":"ISO8601 ou null","end":"ISO8601 ou null","watchUrl":"https://... ou null","participants":["..."],"frenchPresence":true|false}]`;
export function validateAiItems(items,{now=new Date(),origin=null}={}){
 const cats=new Set(['sport','esport','créateurs','autres']),ok=[],bad=[];
 for(const it of Array.isArray(items)?items:[]){
  const t=it||{},title=String(t.title||'').trim().slice(0,160);
  const start=t.start&&Number.isFinite(Date.parse(t.start))?new Date(t.start).toISOString():null;
  const end=t.end&&Number.isFinite(Date.parse(t.end))?new Date(t.end).toISOString():null;
  const watchUrl=/^https:\/\/[^\s]+$/.test(t.watchUrl||'')?t.watchUrl:null;
  const date=/^20\d\d-\d\d-\d\d$/.test(t.date||'')?t.date:(start?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date(start)):null);
  const valid=title.length>=8&&cats.has(t.category)&&date&&start&&Date.parse(start)>Date.parse(now)-6*3600000&&(!end||Date.parse(end)>Date.parse(start))&&(!watchUrl||!origin||watchUrl.startsWith(origin));
  (valid?ok:bad).push({title,start,end,date,watchUrl,category:t.category,subcategory:String(t.subcategory||'').slice(0,60)||null,summary:String(t.summary||'').slice(0,300),participants:(t.participants||[]).map(String).slice(0,6),frenchPresence:t.frenchPresence===true});
 }
 return {ok,bad};
}
export function cleanAiJson(raw){
 const s=String(raw||'').replace(/```(?:json)?/gi,'').trim();
 const m=s.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
 return JSON.parse(m?m[0]:s);
}
