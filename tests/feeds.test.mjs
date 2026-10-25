import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEurovision,parseNasa} from '../scripts/collectors/feeds.mjs';
test('Eurovision accepts scheduled broadcasts, deduplicates and rejects replay/foreign URL',()=>{
 const obj={ '@type':'VideoObject',name:'Final',contentUrl:'https://eurovisionsport.com/en/mediacard/final',publication:{'@type':'BroadcastEvent',startDate:'2026-10-25T12:00:00Z'}};
 const tag=o=>`<script type="application/ld+json">${JSON.stringify(o)}</script>`;
 assert.equal(parseEurovision(tag(obj)+tag(obj)).length,1);
 assert.equal(parseEurovision(tag({...obj,publication:null})).length,0);
 assert.equal(parseEurovision(tag({...obj,contentUrl:'https://evil.test/'})).length,0);
 assert.equal(parseEurovision(tag({...obj,publication:{startDate:'2026-10-25'}})).length,0);
});
test('NASA uses epoch for DST rather than parsing local ambiguous time',()=>{
 const html='<article data-start-time="1793269800"><h4><a class="nasatv-video-title" href="https://plus.nasa.gov/scheduled-video/walk/">Spacewalk</a></h4></article>';
 assert.equal(parseNasa(html)[0].start,'2026-10-29T10:30:00.000Z');
 assert.equal(parseNasa(html.replace('1793269800','invalid')).length,0);
});
test('normalization computes Paris date across midnight and leaves uncertain rights unknown',async()=>{
 const {toEvent}=await import('../scripts/collectors/feeds.mjs');
 const event=toEvent({url:'https://plus.nasa.gov/scheduled-video/walk/',title:'Walk',start:'2026-10-29T23:30:00Z',end:null,genre:'Espace',free:true},{id:'nasa-plus',name:'NASA+',url:'https://plus.nasa.gov/',category:'autres'},'2026-10-25T00:00:00Z');
 assert.equal(event.date,'2026-10-30');assert.equal(event.popularity,null);assert.equal(event.end,null);assert.equal(event.broadcastOptions[0].accountRequired,null);
 assert.equal(event.id,toEvent({...event,url:'https://plus.nasa.gov/scheduled-video/walk/'},{id:'nasa-plus',name:'NASA+',url:'https://plus.nasa.gov/',category:'autres'},'2026-10-26T00:00:00Z').id);
});
test('Twitch validates channel identity, Paris DST, cancellations and off-stream events',async()=>{
 const {parseTwitch}=await import('../scripts/collectors/feeds.mjs');
 const event='BEGIN:VEVENT\nUID:one\nDTSTART;TZID=/Europe/Paris:20261029T190000\nSUMMARY:Suite du jeu\nEND:VEVENT';
 const html='BEGIN:VCALENDAR\nNAME:ZeratoR\n'+event+'\nEND:VCALENDAR';
 assert.equal(parseTwitch(html,'ZeratoR','zerator')[0].start,'2026-10-29T18:00:00.000Z');
 assert.equal(parseTwitch(html.replace('Suite du jeu','[HORS STREAM] LAN'),'ZeratoR','zerator').length,0);
 assert.throws(()=>parseTwitch(html,'Kameto','kamet0'));
 assert.equal(parseTwitch(html.replace('SUMMARY:', 'STATUS:CANCELLED\nSUMMARY:'),'ZeratoR','zerator').length,0);
});
