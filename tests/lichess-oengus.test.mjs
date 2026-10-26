import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLichessBroadcasts} from '../scripts/collectors/lichess.mjs';
import {parseOengusMarathons} from '../scripts/collectors/oengus.mjs';

test('parseLichessBroadcasts reads NDJSON tours with dates',()=>{
 const nd=[
  JSON.stringify({tour:{id:'o6sVDB4M',name:'Clutch Chess',dates:[1793120400000,1793293200000],url:'https://lichess.org/broadcast/clutch',info:{location:'St. Louis'}}}),
  '{"broken',
  JSON.stringify({tour:{id:'x',name:'No dates',dates:[],url:'https://lichess.org/broadcast/x'}})
 ].join('\n');
 const out=parseLichessBroadcasts(nd);
 assert.equal(out.length,1);
 assert.equal(out[0].key,'o6sVDB4M');
 assert.ok(Date.parse(out[0].end)>Date.parse(out[0].start));
});

test('parseOengusMarathons keeps dated marathons across sections',()=>{
 const out=parseOengusMarathons({live:[{id:'HiGR',name:'Horrible Games',startDate:'2026-10-23T17:00:00Z',endDate:'2026-10-26T03:26:00Z',language:'en'}],open:[{id:'x',name:'Open one',startDate:'2026-11-01T00:00:00Z',endDate:'2026-11-02T00:00:00Z'},{id:'y',name:'No dates'}]});
 assert.equal(out.length,2);
 assert.equal(out[0].key,'HiGR');
});
