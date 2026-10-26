import test from 'node:test';import assert from 'node:assert/strict';
import{discoverPglEvents,discoverPglApi,parsePglMatches,parseBlastMatches,pglBroadcastProof}from'../scripts/collectors/pgl.mjs';
const event={url:'https://www.pglesports.com/cs2/pgl-masters-bucharest-2026/',from:'2026-10-22',to:'2026-10-31'};
const row={leftTeam:'The MongolZ',rightTeam:'MOUZ',date:'26.10.2026',time:'10:00',timeZone:'EET',round:'round 3',stream:'main',status:'upcoming'};
test('PGL discovery validates official edition pages, explicit date ranges and schedule API binding',()=>{
 const es=discoverPglEvents({'2026':[{id:'evt1',eventName:['PGL Masters','Bucharest 2026'],date:'October 22-October 31',eventPage:event.url},{id:'evil',eventName:['Other'],date:'October 24-31',eventPage:'https://evil.test/event'}]},new Date('2026-10-26T00:00Z'));
 assert.equal(es.length,1);assert.equal(es[0].from,event.from);assert.equal(es[0].to,event.to);
 assert.equal(discoverPglApi('fetch("https://cs2te-api.pglesports.com/api".concat(e)); hook("/get-group-stage","/get-playoffs")'),'https://cs2te-api.pglesports.com/api');assert.equal(discoverPglApi('fetch("https://evil.test/api")'),null);
});
test('PGL match slots deduplicate, survive schedule/team changes and preserve unknowns and timezone',()=>{
 const a=parsePglMatches([row,row],[],event);assert.equal(a.items.length,1);assert.equal(a.items[0].start,'2026-10-26T08:00:00.000Z');assert.equal(a.items[0].end,null);
 const b=parsePglMatches([{...row,time:'11:00',leftTeam:'',rightTeam:''}],[],event);assert.equal(a.items[0].key,b.items[0].key);assert.deepEqual(b.items[0].teams,[]);
 assert.equal(parsePglMatches([{...row,timeZone:'unknown'}],[],event).complete,false);assert.equal(parsePglMatches([{...row,date:'26.10.2027'}],[],event).items.length,0);
});
test('BLAST corroboration requires the match list explicitly linked to this tournament, not recommended matches',()=>{
 const table=[],add=v=>table.push(v)-1,keys=Object.fromEntries(['id','name','tournament','tournamentMatchesPromise','scheduledAt','teamA','teamB'].map(k=>[k,add(k)]));
 const object=props=>add(Object.fromEntries(Object.entries(props).map(([k,v])=>['_'+keys[k],v])));
 const tournament=object({id:add('pgl-belgrade-2026'),name:add('PGL Masters Bucharest 2026')}),promise=add(['P',0]);table[promise][1]=promise;object({tournament,tournamentMatchesPromise:promise});
 const match=(id,time)=>object({id:add(id),scheduledAt:add(time),teamA:object({name:add('MOUZ')}),teamB:object({name:add('The MongolZ')})});
 match('unrelated-recommendation','2026-10-26T09:00:00Z');const prefix=table.length,root=add([]);table[root].push(match('linked-match','2026-10-26T08:00:00Z'));
 const enqueue=t=>'<script>window.__reactRouterContext.streamController.enqueue('+JSON.stringify(t+'\n')+')</script>';
 const s=enqueue(JSON.stringify(table.slice(0,prefix)))+enqueue('P'+promise+':'+JSON.stringify(table.slice(prefix)));
 const matches=parseBlastMatches(s,'pgl-belgrade-2026');assert.equal(matches.length,1);assert.equal(matches[0].id,'linked-match');assert.equal(matches[0].start,'2026-10-26T08:00:00.000Z');assert.equal(parseBlastMatches(s,'wrong').length,0);assert.equal(parseBlastMatches('<script>throw Error("never execute")</script>','x').length,0);
});
test('official PGL channel proof is scoped to the edition and never claims a currently active video',()=>{
 const html='"externalId":"UC5jpxDZx4yoBo324pMQ91Ww","content":"[A] Match - PGL Masters Bucharest 2026 - Round 2"';assert.equal(pglBroadcastProof(html,'PGL Masters Bucharest 2026'),true);assert.equal(pglBroadcastProof(html,'PGL Bucharest 2027'),false);
});

test('removing an earlier source row never overwrites the remaining match with its predecessor identity',async()=>{
 const {pglExistingSlot}=await import('../scripts/collectors/pgl.mjs');const initial=parsePglMatches([row,{...row,leftTeam:'FURIA',rightTeam:'Spirit',time:'13:00'}],[],event).items;
 const events=initial.map((m,i)=>({id:'slot-'+i,externalTournamentUrl:event.url,externalPhase:m.phase,externalRound:m.round,externalStream:m.stream,externalSlotKey:m.key,start:m.start,participants:m.teams}));
 const remaining=parsePglMatches([{...row,leftTeam:'FURIA',rightTeam:'Spirit',time:'13:00'}],[],event).items[0];assert.equal(pglExistingSlot(events,event.url,remaining),1);
});
