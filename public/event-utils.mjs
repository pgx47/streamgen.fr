export const ZONE='Europe/Paris';
export function dateKey(date){return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export function eventOnDay(e,key){return (e.date||dateKey(e.start))===key;}
export function statusAt(e,now=new Date()){
 if(['En direct confirmé','Terminé','Reporté','Annulé','Programmation à revérifier'].includes(e.status))return e.status;
 if(!e.start)return 'Horaire à confirmer';
 return new Date(e.start)<=now?'Début prévu':'À venir';
}
export function countdownAt(e,now=new Date()){
 if(['Reporté','Annulé','Terminé','Programmation à revérifier'].includes(e.status))return e.status;
 if(!e.start)return 'Horaire à confirmer';
 const m=Math.ceil((new Date(e.start)-now)/60000);
 if(m<=0)return 'Direct non vérifié';
 if(m<60)return `Dans ${m} min`;
 if(m<1440)return `Dans ${Math.floor(m/60)} h ${m%60} min`;
 return `Dans ${Math.floor(m/1440)} j`;
}
export function matchesOptions(options,{access=[],platform=[],noAccount=false}={}){
 if(!access.length&&!platform.length&&!noAccount)return true;
 return options.some(o=>(!access.length||access.includes(o.access))&&(!platform.length||platform.includes(o.platform))&&(!noAccount||o.accountRequired===false));
}
export function calendarText(e,now=new Date()){
 const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const txt=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StreamGen//Agenda FR//FR','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${e.id}@streamgen.fr`,`DTSTAMP:${stamp(now)}`,e.start?`DTSTART:${stamp(e.start)}`:`DTSTART;VALUE=DATE:${e.date.replaceAll('-','')}`,`SUMMARY:${txt(e.title)}`,`DESCRIPTION:${txt(e.summary+' — Consulter les sources sur StreamGen. Horaires sous réserve de modification.')}`,`URL:https://streamgen.fr/evenements/${e.slug||e.id}/`,`STATUS:${['Annulé','Reporté'].includes(e.status)?'CANCELLED':'TENTATIVE'}`];
 if(e.end)lines.push(`DTEND:${stamp(e.end)}`);
 lines.push('END:VEVENT','END:VCALENDAR');
 // RFC 5545 folding: max 75 UTF-8 octets per content line, including continuation space.
 const folded=lines.map(line=>{let out='',part='',bytes=0;for(const char of line){const len=new TextEncoder().encode(char).length;if(bytes+len>75){out+=part+'\r\n';part=' ';bytes=1}part+=char;bytes+=len}return out+part});
 return folded.join('\r\n')+'\r\n';
}

// Editorial priority is a transparent heuristic, never an audience or reliability measurement.
export function editorialPriority(e,now=new Date()){
 const title=String(e.title||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 let score=8,series=[e.organizer||'',e.subcategory||'',e.category||''].join('|'),reasons=[];
 const rules=[[/\bworlds\b.*\b(lol|league)\b|\b(lol|league)\b.*\bworlds\b/,65,'Worlds LoL','worlds-lol'],[/world championships?|championnats? du monde|coupe du monde/,60,'Compétition mondiale','world-'+e.subcategory],[/\b(formule 1|formula 1)\b/,50,'Championnat de Formule 1','f1'],[/\bwtt\b/,42,'Circuit international WTT','wtt'],[/\bnfl\b/,48,'Rendez-vous NFL','nfl'],[/grand slam|yonex ifb|route du rhum/,44,'Grand rendez-vous sportif',e.subcategory],[/sortie dans l.espace|spacewalk|lancement|launch|artemis/,40,'Rendez-vous spatial exceptionnel','space-'+e.id],[/z ?event|gp explorer|speedons/,48,'Événement spécial de créateurs','special-'+e.id]];
 const identity=title+' '+String(e.subcategory||'').toLowerCase();
 const rule=rules.find(([pattern])=>pattern.test(identity));
 if(rule){score=rule[1];reasons.push(rule[2]);series=rule[3]}
 else if(e.major===true){score=38;reasons.push('Grand rendez-vous sélectionné')}
 else reasons.push(e.category==='créateurs'?'Créneau régulier de créateur':'Rendez-vous du programme');
 if(['sport','esport'].includes(e.category)){
  if(/qualifications?/.test(title)){score+=4;reasons.push('Qualifications')}
  else if(/demi[- ]final|semi[- ]final/.test(title)){score+=14;reasons.push('Demi-finale')}
  else if(/quarts? de finale|quarter[- ]final/.test(title)){score+=8;reasons.push('Quarts de finale')}
  else if(!/\b(?:8es?|16es?|32es?|huitiemes?|seiziemes?)\b/.test(title)&&/\bfinales?\b|\bfinals\b/.test(title)){score+=20;reasons.push('Finale annoncée')}
  else if(e.subcategory==='Formule 1'&&/\bcourse\b|\brace\b/.test(title)){score+=10;reasons.push('Course du Grand Prix')}
  else if(/qualifications?/.test(title)){score+=4;reasons.push('Qualifications')}
 }
 const importance=score;
 const today=dateKey(now),distance=Math.round((Date.parse(e.date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
 score+=distance===0?30:distance===1?24:distance<=3&&distance>0?18:distance<=7&&distance>0?12:distance<=14&&distance>0?4:0;
 if(distance===0)reasons.push('Aujourd’hui');else if(distance===1)reasons.push('Demain');
 return {score,importance,reasons,series,label:score>=70?'Grand rendez-vous':score>=45?'À suivre':'Au programme'};
}
export function rankHighlights(events,now=new Date(),limit=3){
 const today=dateKey(now),latest=new Date(Date.parse(today+'T12:00:00Z')+30*86400000).toISOString().slice(0,10);
 const weekEnd=new Date(Date.parse(today+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 const ranked=events.filter(e=>e.date>=today&&e.date<=latest&&!['Annulé','Reporté','Terminé','Programmation à revérifier'].includes(e.status)&&(!e.end||Date.parse(e.end)>now.getTime()))
 .map(e=>({event:e,priority:editorialPriority(e,now)})).filter(({event,priority})=>event.date<=weekEnd||priority.importance>=60||event.major===true).sort((a,b)=>Number(b.event.date===today)-Number(a.event.date===today)||b.priority.score-a.priority.score||a.event.date.localeCompare(b.event.date)||String(a.event.start||'~').localeCompare(String(b.event.start||'~'))||a.event.id.localeCompare(b.event.id));
 const seen=new Set(),chosen=[];
 for(const {event,priority} of ranked){if(seen.has(priority.series))continue;seen.add(priority.series);chosen.push(event);if(chosen.length>=limit)break}
 return chosen;
}
