export const ZONE='Europe/Paris';
export function dateKey(date){return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export function eventOnDay(e,key){return (e.date||dateKey(e.start))===key;}
export function statusAt(e,now=new Date()){
 if(['En direct confirmé','Terminé','Reporté','Annulé'].includes(e.status))return e.status;
 if(!e.start)return 'Horaire à confirmer';
 return new Date(e.start)<=now?'Début prévu':'À venir';
}
export function countdownAt(e,now=new Date()){
 if(['Reporté','Annulé','Terminé'].includes(e.status))return e.status;
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
