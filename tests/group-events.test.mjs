import test from'node:test';import assert from'node:assert/strict';import{groupEvents}from'../scripts/group-events.mjs';
const lp=(id,date,start,extra={})=>({id,slug:id,title:'PGL 2026 Masters · Round 1 — MOUZ vs The MongolZ · Bo3',date,start,category:'esport',subcategory:'Counter-Strike 2',organizer:'PGL 2026 Masters',participants:['MOUZ','The MongolZ'],sources:[{sourceId:'lp-counterstrike',url:'https://liquipedia.net/'+id,sourceId2:id}],broadcastOptions:[{url:'https://twitch.tv/pgl',language:'EN',countries:[]}],notes:[],...extra});
const day={d26:'2026-10-26',d27:'2026-10-27',d28:'2026-10-28'};
test('un tournoi reste un seul rendez-vous, quelle que soit sa durée',()=>{
 const a=groupEvents([lp('lp-a',day.d26,'2026-10-26T08:00:00Z'),lp('lp-b',day.d27,'2026-10-27T08:00:00Z',{participants:['G2','FURIA']}),lp('lp-c',day.d28,'2026-10-28T08:00:00Z')]);
 assert.equal(a.length,1);
 assert.equal(a[0].title,'PGL 2026 Masters');
 assert.equal(a[0].date,day.d26);
 assert.equal(a[0].start,'2026-10-26T08:00:00Z');
 assert.equal(Date.parse(a[0].end),Date.parse('2026-10-28T08:00:00Z'));
 assert.equal(a[0].schedule.length,3);
 assert.match(a[0].schedule[0].label,/^26\/10 · MOUZ vs The MongolZ$/);
 assert.equal(a[0].mergedAliases.length,2);
 assert.deepEqual(new Set(a[0].mergedAliases.map(x=>x.slug)),new Set(['lp-b','lp-c']));
 assert.doesNotMatch(a[0].title,/programme du/);
});
test('les tournois distincts et les autres disciplines restent séparés',()=>{
 const other=lp('lp-z',day.d26,'2026-10-26T10:00:00Z',{organizer:'DFRAG Invitational 2026'});
 const sport={...lp('yt-a',day.d26,'2026-10-26T10:00:00Z'),category:'sport',subcategory:'Basketball',organizer:'FFBB',sources:[{sourceId:'yt-ffbb',url:'https://youtube.com/a'}],participants:['PFBB','Rouen']};
 const out=groupEvents([lp('lp-a',day.d26,'2026-10-26T08:00:00Z'),other,sport]);
 assert.equal(out.length,3);
});
test('une même affiche annoncée deux fois dans la journée ne crée qu’une session',()=>{
 const dup=lp('lp-b',day.d26,'2026-10-26T08:20:00Z');
 const a=groupEvents([lp('lp-a',day.d26,'2026-10-26T08:00:00Z'),dup]);
 assert.equal(a.length,1);
 assert.equal(a[0].start,'2026-10-26T08:00:00Z');
});
test('un même intitulé de diffusion récurrent devient une fiche, sauf au-delà de trois semaines',()=>{
 const joj=(id,date,start)=>({id,slug:id,title:'Jeux Olympiques de la Jeunesse Dakar 2026',date,start,category:'sport',subcategory:'Multisports',participants:[],organizer:'France Télévisions',sources:[{sourceId:'francetv-sport-week',url:'https://france.tv/'+id}],broadcastOptions:[],notes:[]});
 const a=groupEvents([joj('j1','2026-10-30','2026-10-30T09:55:00Z'),joj('j2','2026-11-01','2026-11-01T08:55:00Z'),joj('j3','2026-11-13','2026-11-13T08:55:00Z')]);
 assert.equal(a.length,1);
 assert.equal(a[0].schedule.length,3);
 assert.equal(Date.parse(a[0].end),Date.parse('2026-11-13T08:55:00Z'));
 assert.equal(groupEvents([joj('j1','2026-10-30','2026-10-30T09:55:00Z'),joj('j2','2026-12-20','2026-12-20T09:55:00Z')]).length,2);
});
test('chess sections combine only same championship day and cadence, keeping each board link',()=>{
 const base={id:'lc-a',slug:'lc-a',title:'English Chess Championships 2026 | Women | Classical',date:'2026-10-26',start:'2026-10-26T14:00:00Z',category:'échecs',subcategory:'Échecs',participants:[],organizer:'Lichess',sources:[{sourceId:'lichess',url:'https://lichess.org/a'}],broadcastOptions:[{url:'https://lichess.org/a',language:'EN',countries:[]}],notes:[]};
 const a=groupEvents([base,{...base,id:'lc-b',slug:'lc-b',title:'English Chess Championships 2026 | Open | Classical',start:'2026-10-26T15:00:00Z',broadcastOptions:[{url:'https://lichess.org/b',language:'EN',countries:[]}]}]);
 assert.equal(a.length,1);
 assert.equal(a[0].schedule.length,2);
 assert.match(a[0].broadcastOptions[1].label,/Open/);
 assert.equal(groupEvents([base,{...base,id:'lc-c',slug:'lc-c',date:'2026-10-27',start:'2026-10-27T14:00:00Z'}]).length,2);
});
test('les tableaux d’un même tournoi Lichess sont réunis, sauf cadences distinctes',()=>{
 const mk=(id,title,date='2026-11-03',start='2026-11-03T14:15:00Z',end='2026-11-14T13:15:00Z')=>({id,slug:id,title,start,end,date,category:'échecs',subcategory:'Échecs',participants:[],organizer:'Lichess',sources:[{sourceId:'lichess',url:'https://lichess.org/'+id}],broadcastOptions:[{url:'https://lichess.org/'+id,language:'EN',countries:[]}],notes:[]});
 const fide=['Open 65+','Open 50+','Women 65+','Women 50+'].map((s,i)=>mk('lc-'+i,'FIDE World Senior Chess Championships 2026 | '+s));
 const a=groupEvents(fide);
 assert.equal(a.length,1);
 assert.equal(a[0].title,'FIDE World Senior Chess Championships 2026');
 assert.equal(a[0].schedule.length,4);
 assert.equal(a[0].broadcastOptions.length,4);
 assert.equal(Date.parse(a[0].end),Date.parse('2026-11-14T13:15:00Z'));
 assert.equal(groupEvents(a).length,1);
 assert.equal(groupEvents([mk('lc-r','X Open 2026 | Open | Rapid'),mk('lc-c','X Open 2026 | Open | Classical')]).length,2);
 assert.equal(groupEvents([mk('lc-f','X Open 2026 | Rapid'),mk('lc-g','X Open 2026 | Blitz')]).length,2);
 assert.equal(groupEvents([mk('lc-d','Y Cup 2026 | A','2026-11-03','2026-11-03T10:00:00Z','2026-11-04T10:00:00Z'),mk('lc-e','Y Cup 2026 | B','2026-11-03','2026-11-03T10:00:00Z','2026-11-06T10:00:00Z')])[0].end,null);
});
test('le regroupement est idempotent et ne crée pas de fiche en double',()=>{
 const list=[lp('lp-a',day.d26,'2026-10-26T08:00:00Z'),lp('lp-b',day.d27,'2026-10-27T08:00:00Z')];
 const once=groupEvents(list),twice=groupEvents(once);
 assert.equal(once.length,1);
 assert.equal(twice.length,1);
 assert.equal(twice[0].id,once[0].id);
 assert.equal(twice[0].schedule.length,2);
});
test('les rediffusions et programmes TV restent exclus',()=>{
 const rerun=lp('lp-r',day.d26,'2026-10-26T08:00:00Z',{title:'PGL 2026 Masters — Rediffusion'});
 assert.equal(groupEvents([rerun]).length,0);
});
const broadcast=(id,sourceId,title,start,extra={})=>({id,slug:id,title,date:start.slice(0,10),start,category:'esport',subcategory:'VALORANT',participants:['FENNEL HOTELAVA','SK Nebula'],organizer:'Riot Games',sources:[{sourceId,url:'https://'+sourceId+'.test/'+id}],broadcastOptions:[{url:'https://twitch.tv/'+sourceId,language:'EN',countries:[]}],notes:[],...extra});
test('une même affiche diffusée par deux sources devient une seule fiche',()=>{
 const a=broadcast('riot-a','riot','VALORANT · Game Changers Championship — FENNEL HOTELAVA vs SK Nebula','2026-11-20T18:00:00Z');
 const b=broadcast('lp-a','lp-valorant','VALORANT · Game Changers — FENNEL HOTELAVA vs SK Nebula','2026-11-20T18:10:00Z',{subcategory:'Jeux de combat',broadcastOptions:[{url:'https://youtube.com/lp',language:'EN',countries:[]}]});
 const out=groupEvents([a,b]);
 assert.equal(out.length,1);
 assert.equal(out[0].sources.length,2);
 assert.equal(out[0].broadcastOptions.length,2);
 assert.equal(out[0].mergedAliases.length,1);
 assert.equal(groupEvents(out).length,1);
});
test('les mêmes équipes à deux heures d’écart restent deux matchs',()=>{
 const a=broadcast('riot-a','riot','VALORANT · Game Changers — A vs B','2026-11-20T18:00:00Z');
 const b=broadcast('lp-a','lp-valorant','VALORANT · Masters — A vs B','2026-11-20T20:00:00Z');
 assert.equal(groupEvents([a,b]).length,2);
});
test('le même intitulé à quelques minutes fusionne, un autre jour non',()=>{
 const a=broadcast('yt-a','yt-x','World Rugby Nations Cup 2026 | Romania v Canada','2026-11-20T16:30:00Z',{participants:[],category:'sport',subcategory:'Rugby'});
 const b=broadcast('yt-b','yt-y','World Rugby Nations Cup 2026 | Romania v Canada','2026-11-20T16:35:00Z',{participants:[],category:'sport',subcategory:'Rugby'});
 assert.equal(groupEvents([a,b]).length,1);
 const c={...b,id:'yt-c',date:'2026-12-10',start:'2026-12-10T16:30:00Z'};
 assert.equal(groupEvents([a,c]).length,2);
});
test('deux matchs différents à la même heure ne fusionnent pas',()=>{
 const a=broadcast('riot-a','riot','VALORANT · North America — FENNEL vs SK','2026-11-20T18:00:00Z');
 const b=broadcast('riot-b','riot','VALORANT · Latin America — LOUD vs KRÜ','2026-11-20T18:00:00Z',{participants:['LOUD','KRÜ']});
 assert.equal(groupEvents([a,b]).length,2);
});
