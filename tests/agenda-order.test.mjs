import test from 'node:test';
import assert from 'node:assert/strict';
import {agendaPlacement,sortAgenda} from '../public/event-utils.mjs';
const now=new Date('2026-10-26T15:00:00Z'),day='2026-10-26';
const e=(id,start,end=null,extra={})=>({id,date:day,start,end,status:'À venir',schedule:[],...extra});
test('agenda puts ongoing programmes ahead of upcoming and finished slots regardless of their start time',()=>{
 const ended=e('ended','2026-10-26T04:00Z','2026-10-26T08:00Z');
 const future=e('future','2026-10-26T18:00Z');
 const current=e('current','2026-10-26T07:00Z','2026-10-26T20:00Z');
 const unknown=e('unknown','2026-10-26T06:00Z');
 assert.deepEqual(sortAgenda([ended,unknown,future,current],day,now).map(e=>e.id),['current','future','unknown','ended']);
 assert.match(agendaPlacement(ended,day,now).label,/terminé/i);
 assert.doesNotMatch(agendaPlacement(unknown,day,now).label,/terminé|fini/i);
});
test('daily sessions and cross-midnight broadcasts stay above finished events without asserting verified live',()=>{
 const sessions=e('sessions','2026-10-26T07:00Z',null,{schedule:[{start:'2026-10-26T18:00Z'}]});
 const overnight=e('overnight','2026-10-25T21:00Z','2026-10-26T19:00Z',{date:'2026-10-25'});
 const ended=e('ended','2026-10-26T09:00Z','2026-10-26T12:00Z');
 assert.deepEqual(sortAgenda([ended,sessions,overnight],day,now).map(e=>e.id),['overnight','sessions','ended']);
 assert.doesNotMatch(agendaPlacement(overnight,day,now).label,/confirmé/);
});
