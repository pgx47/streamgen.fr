import test from'node:test';import assert from'node:assert/strict';import{calendarLinks,calendarFeed,rssFeed,eventSchema}from'../scripts/publishing.mjs';
const e={id:'test',slug:'test',title:'Finale & rencontre',summary:'A < B',start:'2026-10-26T18:00:00Z',end:null,date:'2026-10-26',category:'sport',organizer:'Organisateur',sources:[{url:'https://example.org'}],broadcastOptions:[],lastVerified:'2026-10-26T00:00:00Z'};
test('calendar links preserve source times and never invent a duration',()=>{const g=new URL(calendarLinks(e).google);assert.equal(g.searchParams.get('dates'),'20261026T180000Z/20261026T180000Z');assert.match(g.searchParams.get('details'),/Fin non publiée/);assert.doesNotMatch(calendarFeed([e]),/DTEND:/)});
test('RSS escapes data and structured events never assert a live video',()=>{assert.match(rssFeed([e],e.lastVerified),/Finale &amp; rencontre/);const s=eventSchema(e,'/a.jpg');assert.equal(s['@type'],'SportsEvent');assert.equal(s.endDate,undefined);assert.equal(s.isLiveBroadcast,undefined);assert.equal(eventSchema({...e,start:null},'/a.jpg'),null)});
test('date-only calendar links use the exclusive next-day boundary across year end',()=>{
 const unknown={...e,start:null,end:null,date:'2026-12-31'};
 const links=calendarLinks(unknown),google=new URL(links.google),outlook=new URL(links.outlook);
 assert.equal(google.searchParams.get('dates'),'20261231/20270101');
 assert.equal(outlook.searchParams.get('startdt'),'2026-12-31');
 assert.equal(outlook.searchParams.get('enddt'),'2027-01-01');
 assert.equal(outlook.searchParams.get('allday'),'true');
});
