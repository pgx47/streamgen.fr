const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function day(year,month,date){const mo=months.findIndex(m=>m.toLowerCase()===String(month).toLowerCase())+1;if(!mo||+date<1||+date>31)return null;const s=`${year}-${String(mo).padStart(2,'0')}-${String(+date).padStart(2,'0')}`;return new Date(s+'T12:00Z').toISOString().slice(0,10)===s?s:null}
function officialUrl(value){try{const u=new URL(value,'https://www.pglesports.com');return u.protocol==='https:'&&u.hostname==='www.pglesports.com'&&!u.port&&!u.username&&!u.password&&/^\/(cs2|dota2)\/[-a-z0-9]+\/$/.test(u.pathname)?u.href:null}catch{return null}}
export function discoverPglEvents(data,now=new Date(),known=[]){
 const found=new Map();if(!data||Array.isArray(data)||typeof data!=='object')throw Error('Calendrier PGL invalide');
 for(const [year,events]of Object.entries(data)){if(!/^20\d\d$/.test(year)||!Array.isArray(events))continue;for(const v of events){const url=officialUrl(v.eventPage),m=String(v.date||'').match(/^([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(?:([A-Za-z]+)\s+)?(\d{1,2})$/);if(!url||!m||!Array.isArray(v.eventName))continue;const from=day(year,m[1],m[2]),to=day(year,m[3]||m[1],m[4]);if(!from||!to||to<from)continue;if(!known.includes(url)&&(Date.parse(to+'T23:59:59Z')<now.getTime()-86400000||Date.parse(from+'T00:00Z')>now.getTime()+30*86400000))continue;found.set(url,{url,id:String(v.id||url),title:v.eventName.join(' ').trim(),from,to,game:url.includes('/cs2/')?'Counter-Strike 2':'Dota 2'})}}
 return [...found.values()].sort((a,b)=>a.from.localeCompare(b.from));
}
export function discoverPglApi(script){const base=script.match(/https:\/\/[a-z0-9-]+\.pglesports\.com\/api(?=["'])/)?.[0];return base&&/["']\/get-group-stage["']/.test(script)&&/["']\/get-playoffs["']/.test(script)?base:null}
export function parsePglMatches(groups,playoffs,event){
 if(!Array.isArray(groups)||!Array.isArray(playoffs))throw Error('Tableau de matchs PGL invalide');const offsets={UTC:'+00:00',GMT:'+00:00',EET:'+02:00',EEST:'+03:00',CET:'+01:00',CEST:'+02:00'},items=[],seen=new Set(),slots=new Map();let complete=true;
 for(const [phase,rows]of [['group',groups],['playoffs',playoffs]])for(const v of rows){
  const d=String(v.date||'').match(/^(\d\d)\.(\d\d)\.(20\d\d)$/),time=String(v.time||'');if(!d||!/^\d\d:\d\d$/.test(time)||+time.slice(0,2)>23||+time.slice(3)>59||!offsets[v.timeZone]||!v.round||!['main','secondary'].includes(v.stream)||!['upcoming','live','ongoing','end','finished','cancelled','canceled'].includes(v.status)){complete=false;continue}
  const date=`${d[3]}-${d[2]}-${d[1]}`;if(!Number.isFinite(Date.parse(date+'T12:00Z'))||new Date(date+'T12:00Z').toISOString().slice(0,10)!==date||date<event.from||date>event.to){complete=false;continue}
  const start=new Date(date+'T'+time+':00'+offsets[v.timeZone]).toISOString(),signature=[phase,date,time,v.round,v.stream,v.leftTeam,v.rightTeam].join('|');if(seen.has(signature))continue;seen.add(signature);
  const scope=[phase,v.round,v.stream].join('|'),index=(slots.get(scope)||0)+1;slots.set(scope,index);
  items.push({key:scope+'|'+index,phase,round:String(v.round),slot:index,stream:v.stream,start,end:null,url:event.url,genre:event.game,free:false,teams:[v.leftTeam,v.rightTeam].filter(x=>typeof x==='string'&&x.trim()&&x!=='TBD'),status:v.status,cancelled:['cancelled','canceled'].includes(v.status),timezone:v.timeZone});
 }
 return {items,complete};
}
export function parseBlastMatches(html,tournamentId){
 const chunks=[...html.matchAll(/streamController\.enqueue\(("(?:\\.|[^"\\])*")\)/g)];if(!chunks.length)return [];
 let frames;try{frames=chunks.map(m=>JSON.parse(m[1])).join('').split('\n').filter(Boolean)}catch{return []}
 let table=[];const promises=new Map();
 try{for(let i=0;i<frames.length;i++){
  if(i===0){table=JSON.parse(frames[i]);if(!Array.isArray(table))return [];continue}
  const frame=frames[i].match(/^P(\d+):(\[.*\])$/);if(!frame)return [];const extra=JSON.parse(frame[2]);if(!Array.isArray(extra))return [];promises.set(+frame[1],table.length);table.push(...extra);if(table.length>50000)return [];
 }}catch{return []}
 const ref=(v,name)=>{if(!v||Array.isArray(v)||typeof v!=='object')return undefined;for(const [key,index]of Object.entries(v)){if(/^_\d+$/.test(key)&&table[+key.slice(1)]===name&&Number.isSafeInteger(index)&&index>=0)return index}},value=(v,name)=>table[ref(v,name)];
 const route=table.find(v=>value(value(v,'tournament'),'id')===tournamentId&&ref(v,'tournamentMatchesPromise')!==undefined);if(!route)return [];
 const promised=ref(route,'tournamentMatchesPromise'),list=table[promises.get(promised)];if(!Array.isArray(list)||list.some(r=>!Number.isSafeInteger(r)))return [];
 const found=new Map();for(const index of list){const v=table[index],rawStart=value(v,'scheduledAt'),id=value(v,'id'),a=value(value(v,'teamA'),'name'),b=value(value(v,'teamB'),'name');let start=rawStart;if(Array.isArray(rawStart)&&rawStart[0]==='D'&&Number.isFinite(rawStart[1]))start=new Date(rawStart[1]).toISOString();if(typeof id!=='string'||typeof a!=='string'||typeof b!=='string'||!/^20\d\d-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(start||'')||!Number.isFinite(Date.parse(start)))continue;found.set(id,{id,start:new Date(start).toISOString(),teams:[a,b]})}return [...found.values()];
}
export function findBlastTournament(html,title,game='cs'){
 for(const m of html.matchAll(/<a\b[^>]*href="(\/(?:cs|dota)\/tournaments\/[-a-z0-9]+)"[^>]*>([\s\S]*?)<\/a>/g)){if(!m[1].startsWith('/'+game+'/'))continue;const labels=[m[2].replace(/<[^>]+>/g,' '),...[...m[2].matchAll(/alt="([^"]+)"/g)].map(x=>x[1])];if(labels.some(s=>norm(s).includes(norm(title))))return 'https://blast.tv'+m[1]}return null;
}
export function pglBroadcastProof(html,title){
 if(!html.includes('"externalId":"UC5jpxDZx4yoBo324pMQ91Ww"'))return false;
 for(const m of html.matchAll(/"content":("(?:\\.|[^"\\])*")/g)){try{if(norm(JSON.parse(m[1])).includes(norm(title)))return true}catch{}}return false;
}
const aliases={auroragaming:'aurora',teamvitality:'vitality',teamliquid:'liquid',teamspirit:'spirit','9zglobant':'9z',g2esports:'g2',betboomteam:'betboom'};
export function pglCorroboration(item,matches){
 if(item.teams.length!==2)return null;const teamKey=t=>aliases[norm(t)]||norm(t),key=item.teams.map(teamKey).sort().join('|');
 const candidates=matches.filter(m=>m.teams.map(teamKey).sort().join('|')===key&&m.start.slice(0,10)===item.start.slice(0,10));const times=[...new Set(candidates.map(m=>m.start))];return times.length===1?{agreement:times[0]===item.start,start:times[0],matchId:candidates[0].id}:null;
}
export function pglExistingSlot(events,url,item,used=new Set()){
 const pool=events.map((e,i)=>({e,i})).filter(({e})=>e.externalTournamentUrl===url&&e.externalPhase===item.phase&&e.externalRound===item.round&&e.externalStream===item.stream&&!used.has(e.id));
 const key=ts=>ts.map(norm).sort().join('|');
 const teams=item.teams.length===2?pool.filter(({e})=>e.participants?.length===2&&key(e.participants)===key(item.teams)):[];
 if(teams.length===1)return teams[0].i;
 const time=pool.filter(({e})=>e.start===item.start);if(time.length===1)return time[0].i;
 const slot=pool.filter(({e})=>e.externalSlotKey===item.key&&e.status!=='Programmation à revérifier');return slot.length===1?slot[0].i:-1;
}
