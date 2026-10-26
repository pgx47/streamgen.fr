import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArteGuide} from '../scripts/collectors/arte.mjs';
const program={programId:'123-A',title:'Concert',subtitle:'Paris',url:'/fr/videos/123-A/concert/',availability:{start:'2026-10-01T08:00:00Z',upcomingDate:'2026-10-26T19:00:00Z',end:'2026-12-01T00:00:00Z'},duration:3600,livestreamRights:true,genre:{label:'Concert'}};
const page=items=>'<script>self.__next_f.push('+JSON.stringify([1,'a:'+JSON.stringify({data:{value:{type:'guide',items}}})]) +')</script>';
test('ARTE uses broadcast date rather than replay availability and deduplicates a scheduled showing',()=>{
 const items=parseArteGuide(page([program,program]),'2026-10-26');assert.equal(items.length,1);assert.equal(items[0].start,'2026-10-26T19:00:00.000Z');assert.equal(items[0].end,null);
});
test('ARTE omits undated VOD and off-day data; a new broadcast gets a new identity',()=>{
 assert.equal(parseArteGuide(page([{...program,availability:{start:'2026-10-26T08:00:00Z'}}]),'2026-10-26').length,0);
 assert.equal(parseArteGuide(page([program]),'2026-11-01').length,0);
 const other={...program,availability:{...program.availability,upcomingDate:'2026-10-26T21:00:00Z'}};
 assert.equal(parseArteGuide(page([program,other]),'2026-10-26').length,2);
});
