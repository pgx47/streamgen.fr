import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverRedBull,parseRedBullLive} from '../scripts/collectors/redbull.mjs';
const page=v=>`<script type="application/json" id="rb3-prerender-data-cache">${JSON.stringify(v)}</script>`;
test('Red Bull discovery only follows official event profiles inside the horizon',()=>{
 const html='<!--placeholder <script>--><script type="application/ld+json">'+JSON.stringify({'@graph':[{ '@type':'Event',name:'Padel',startDate:'2026-10-26',endDate:'2026-10-31',url:'https://www.redbull.com/int-en/events/padel'},{'@type':'Event',name:'External',startDate:'2026-10-26',url:'https://evil.test/event'}]})+'</script>';
 assert.equal(discoverRedBull(html,new Date('2026-10-26T00:00Z')).length,1);
});
test('only explicit livestream dates are published, stable IDs survive rescheduling and unknown geography stays unknown',()=>{
 const live={title:'Final',startDate:'2026-10-31T13:00:00Z',status:'pre',geoBlockedIn:null,reference:{id:'video-1',type:'videoLive',externalUrl:'https://www.redbull.tv/en_INT/page/video-1/final'}};
 const profile={title:'Padel',startDate:'2026-10-26T00:00:00Z',liveStreams:[live,live,{title:'No time',reference:live.reference},{...live,reference:{...live.reference,id:'evil',externalUrl:'https://evil.test'}}]};
 const a=parseRedBullLive(page({data:profile}));assert.equal(a.length,1);assert.equal(a[0].start,'2026-10-31T13:00:00.000Z');assert.equal(a[0].blockedCountries,null);
 live.startDate='2026-10-31T14:00:00Z';assert.equal(parseRedBullLive(page({data:profile}))[0].key,a[0].key);
 assert.deepEqual(parseRedBullLive(page({title:'Replay',startDate:'2026-10-26T00:00:00Z'})),[]);
});
