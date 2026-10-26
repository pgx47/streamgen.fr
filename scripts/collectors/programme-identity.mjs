function programmeUrl(e){const url=e.programmeUrl||e.evidence?.programme?.sourceUrl;try{const u=new URL(url);return u.hostname==='www.arte.tv'&&u.protocol==='https:'&&u.pathname.startsWith('/fr/videos/')?u.href:null}catch{return null}}
export function upsertArteProgramme(events,incoming){
 const url=programmeUrl(incoming),i=events.findIndex(e=>e.id===incoming.id||e.collectionAliases?.includes(incoming.id)||(url&&programmeUrl(e)===url&&e.start===incoming.start));
 if(i<0){events.push(incoming);return 'added'}
 const old=events[i],dominant=incoming.programType==='livestream'?incoming:old.programType==='livestream'?old:incoming;
 const sources=[...new Map([...(old.sources||[]),...(incoming.sources||[])].map(s=>[s.sourceId+'|'+s.url,s])).values()];
 events[i]={...incoming,...dominant,id:old.id,slug:old.slug,collectionAliases:[...new Set([old.id,incoming.id,...(old.collectionAliases||[]),...(incoming.collectionAliases||[])])],programmeUrl:url||old.programmeUrl,lastVerified:incoming.lastVerified,sources,notes:[...new Set([...(old.notes||[]),...(incoming.notes||[])])],evidence:{...old.evidence,...incoming.evidence}};
 if(old.sourceImage&&!events[i].sourceImage)events[i].sourceImage=old.sourceImage;return 'updated';
}

export function retireMissingArteConcerts(events,observed,structuredCount,now){
 if(!Number.isInteger(structuredCount)||structuredCount<1)throw Error('Agenda ARTE sans programmes structurés reconnus');
 let count=0;
 for(const e of events){
  if(!e.sources?.some(s=>s.sourceId==='arte-concert-live')||Date.parse(e.start)<=Date.parse(now)||observed.has(e.id)||(e.collectionAliases||[]).some(id=>observed.has(id))||['Programmation à revérifier','Annulé'].includes(e.status))continue;
  e.status='Programmation à revérifier';e.confirmation='Direct absent du dernier agenda ARTE Concert';e.broadcastOptions=[];e.lastVerified=now;e.notes=[...new Set([...(e.notes||[]),'Le direct n’apparaît plus dans les programmes structurés reçus ; sa diffusion doit être reconfirmée.'])];count++;
 }
 return count;
}
