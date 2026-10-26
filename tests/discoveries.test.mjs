import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCernUpcoming,parseCernAnnouncement,parseArteConcert} from '../scripts/collectors/discoveries.mjs';
const dates={day:'2026-10-27',tz:'Europe/Zurich',time:'11:00:00'};
const cern={indico_id:'123',title:'Science seminar',restricted:false,type:'Upcoming',audience:'No restriction',indico_link:'https://indico.cern.ch/event/123/',startDate:dates,endDate:{...dates,time:'12:00:00'}};
test('CERN only publishes explicitly public broadcasts with valid zone and event identity',()=>{
 const a=parseCernUpcoming({success:true,results:[cern,{...cern,restricted:true},{...cern,restricted:null},{...cern,indico_link:'https://evil.test/'},{...cern,startDate:{...dates,tz:'Unknown/Zone'}}]});assert.equal(a.length,1);assert.equal(a[0].start,'2026-10-27T10:00:00.000Z');assert.equal(a[0].end,'2026-10-27T11:00:00.000Z');assert.equal(a[0].key,'123');
});
test('CERN announcement corroborates only exact event identity and absolute schedule',()=>{
 const tag=v=>'<script type="application/ld+json">'+JSON.stringify(v)+'</script>';
 const v={'@type':'Event',name:cern.title,url:cern.indico_link,startDate:'2026-10-27T11:00:00+01:00'};
 assert.equal(parseCernAnnouncement(tag(v),cern.indico_link)?.start,'2026-10-27T10:00:00.000Z');assert.equal(parseCernAnnouncement(tag(v),'https://indico.cern.ch/event/124/'),null);
});
const flight=v=>'<script>self.__next_f.push('+JSON.stringify([1,'a:'+JSON.stringify(v)+'\n'])+')</script>';
test('ARTE Concert excludes replay availability dates and preserves livestream identity across time changes',()=>{
 const live={programId:'123-A',title:'Bach en direct',url:'https://www.arte.tv/fr/videos/123-A/bach/',availability:{type:'LIVESTREAM_WEB',upcomingDate:'2026-11-07T19:00:00Z'},geoblocking:{code:'ALL',inclusion:[],exclusion:[]}};
 const a=parseArteConcert(flight([live,live,{...live,programId:'replay',availability:{...live.availability,type:'VOD'}},{...live,programId:'external',url:'https://evil.test/'}]));assert.equal(a.length,1);assert.equal(a[0].key,'123-A');assert.equal(a[0].end,null);assert.equal(a[0].global,true);
 assert.equal(parseArteConcert(flight({...live,availability:{...live.availability,upcomingDate:'2026-11-07T20:00:00Z'}}))[0].key,a[0].key);
});

test('the same ARTE programme at the same hour merges broadcast evidence while retaining its published URL',async()=>{
 const {upsertArteProgramme}=await import('../scripts/collectors/programme-identity.mjs');
 const base={id:'tv-old',slug:'tv-old',start:'2026-11-07T19:00:00Z',programmeUrl:'https://www.arte.tv/fr/videos/123-A/bach/',programType:'scheduled-tv',sources:[{sourceId:'tv',url:'https://www.arte.tv/fr/guide/20261107/'}],notes:[]};
 const events=[base];const live={...base,id:'concert-new',slug:'concert-new',programType:'livestream',sources:[{sourceId:'concert',url:'https://www.arte.tv/fr/arte-concert/agenda/'}]};
 upsertArteProgramme(events,live);assert.equal(events.length,1);assert.equal(events[0].slug,'tv-old');assert.equal(events[0].programType,'livestream');assert.equal(events[0].sources.length,2);
 upsertArteProgramme(events,base);assert.equal(events.length,1);assert.equal(events[0].programType,'livestream');
 upsertArteProgramme(events,{...live,id:'later',slug:'later',start:'2026-11-08T19:00:00Z'});assert.equal(events.length,2);
});

test('a rescheduled concert keeps the existing page after merging with a TV listing',async()=>{
 const {upsertArteProgramme}=await import('../scripts/collectors/programme-identity.mjs');
 const tv={id:'tv-a',slug:'tv-a',programmeUrl:'https://www.arte.tv/fr/videos/123-A/bach/',start:'2026-11-07T19:00:00Z',programType:'scheduled-tv',sources:[],notes:[]};
 const events=[tv],live={...tv,id:'concert-b',slug:'concert-b',programType:'livestream'};upsertArteProgramme(events,live);upsertArteProgramme(events,{...live,start:'2026-11-07T20:00:00Z'});
 assert.equal(events.length,1);assert.equal(events[0].slug,'tv-a');assert.equal(events[0].start,'2026-11-07T20:00:00Z');
});
test('a successful structured concert snapshot retires missing future streams; an empty unrecognized page cannot',async()=>{
 const {retireMissingArteConcerts}=await import('../scripts/collectors/programme-identity.mjs');
 const e={id:'a',programType:'livestream',start:'2026-11-07T19:00:00Z',sources:[{sourceId:'arte-concert-live'}],broadcastOptions:[{confirmed:true}],notes:[]};
 assert.throws(()=>retireMissingArteConcerts([e],new Set(),0,'2026-10-26T00:00:00Z'));
 retireMissingArteConcerts([e],new Set(),2,'2026-10-26T00:00:00Z');assert.equal(e.status,'Programmation à revérifier');assert.equal(e.broadcastOptions.length,0);
});
