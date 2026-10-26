import{localDate}from'./discoveries.mjs';
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const months=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'],weekdays=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const text=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g,m=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[m])).replace(/\s+/g,' ').trim();
function frenchDate(day,month,year){const m=months.indexOf(normalize(month))+1;if(!m||+day<1||+day>31)return null;const d=`${year}-${String(m).padStart(2,'0')}-${String(+day).padStart(2,'0')}`;return new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d?d:null}
export function discoverFranceSportWeek(html){const path=html.match(/href=["'](\/sport\/[a-z0-9-]+\/\d+-nos-directs-a-venir\.html)["']/i)?.[1];return path?'https://www.france.tv'+path:null}
export function parseFranceSportWeek(html){
 const all=text(html),range=all.match(/du\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})(?:er)?\s+(\S+)(?:\s+(20\d\d))?\s+au\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})(?:er)?\s+(\S+)\s+(20\d\d)/i);
 if(!range)throw Error('Semaine datée absente du programme france.tv');const to=frenchDate(range[4],range[5],range[6]);let from=frenchDate(range[1],range[2],range[3]||range[6]);if(!range[3]&&from>to)from=frenchDate(range[1],range[2],+range[6]-1);if(!from||!to||to<from||Date.parse(to)-Date.parse(from)>14*86400000)throw Error('Plage de dates france.tv incohérente');
 const article=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];if(!article)throw Error('Article de programmation absent');let day=null;const found=new Map();
 for(const m of article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){
  const line=text(m[1]),heading=line.match(/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})(?:er)?\s+([a-zéûôè]+)/i);
  if(heading){day=null;for(let y=+from.slice(0,4);y<=+range[6];y++){const candidate=frenchDate(heading[2],heading[3],y);if(candidate&&candidate>=from&&candidate<=to&&weekdays[new Date(candidate+'T12:00Z').getUTCDay()]===normalize(heading[1]))day=candidate}if(!day)throw Error('Jour et date incohérents dans le programme france.tv : '+line);continue}
  if(/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(line))throw Error('En-tête de journée malformé');
  const row=line.match(/^(\d{1,2})h(\d{2})\s*[-–—]\s*(.+)$/);if(/^\d{1,2}h/i.test(line)&&(!row||+row[1]>23||+row[2]>59))throw Error('Horaire france.tv malformé');if(!day||!row)continue;
  const title=row[3].replace(/\s*\|\s*Live chat.*$/i,'').trim(),start=localDate({day,time:row[1].padStart(2,'0')+':'+row[2]+':00',tz:'Europe/Paris'});if(!title||!start)continue;
  const key=day+'|'+title+'|'+row[1].padStart(2,'0')+':'+row[2];found.set(key,{key,title,start,end:null,url:'https://www.france.tv/sport/direct.html',genre:/WXV|rugby/i.test(title)?'Rugby':/Dakar|Olympiques/i.test(title)?'Multisports':/Ligue 1|football/i.test(title)?'Football':'Sport',free:true});
 }
 if(!found.size)throw Error('Aucun créneau explicite dans le programme france.tv');return {from,to,items:[...found.values()]};
}
