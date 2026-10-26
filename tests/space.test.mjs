import test from 'node:test';import assert from 'node:assert/strict';
import{parseSpaceXUpcoming,spaceXMission,corroborateLaunch}from'../scripts/collectors/space.mjs';
const tile={link:'sl-15-16',correlationId:'ABC',missionStatus:'upcoming',vehicle:'Falcon 9'},timing={ABC:{PrimaryLaunchDate:{Seconds:1793076300},PrimaryLaunchWindow:{Open:{Seconds:1793076300},Close:{Seconds:1793090700}}}};
test('SpaceX requires a real launch window and stable mission identity, never date-only midnight',()=>{
 const a=parseSpaceXUpcoming([tile],timing);assert.equal(a.length,1);assert.equal(a[0].start,'2026-10-27T04:45:00.000Z');assert.equal(a[0].end,null);assert.equal(a[0].windowClose,'2026-10-27T08:45:00.000Z');
 assert.equal(parseSpaceXUpcoming([tile],{ABC:{PrimaryLaunchDate:{Seconds:1793076300},PrimaryLaunchWindow:null}}).length,0);
 assert.equal(parseSpaceXUpcoming([{...tile,link:'../bad'}],timing).length,0);
});
test('mission webcast must belong to the exact official mission; stale third party video dates never become programme dates',()=>{
 const item=parseSpaceXUpcoming([tile],timing)[0],detail={missionId:'sl-15-16',webcasts:[{streamingVideoType:'x-live-studio',videoId:'1mGPaZgYgLDJN '}]};
 assert.equal(spaceXMission(item,detail).streams[0],'https://x.com/i/broadcasts/1mGPaZgYgLDJN');assert.equal(spaceXMission(item,{...detail,missionId:'sl-15-18'}),null);
 const secondary={results:[{id:'launch-id',net:item.start,info_urls:[{url:item.url}],vid_urls:[{start_time:'2026-10-01T00:00Z'}]}]};
 assert.equal(corroborateLaunch(item,secondary).agreement,true);secondary.results[0].net='2026-10-28T04:45:00Z';assert.equal(corroborateLaunch(item,secondary).agreement,false);
});

test('an incoherent timing response cannot masquerade as an empty launch calendar',()=>{
 assert.throws(()=>parseSpaceXUpcoming([tile],{}));assert.throws(()=>parseSpaceXUpcoming([tile],[]));assert.throws(()=>parseSpaceXUpcoming([tile],{ABC:{}}));
 assert.deepEqual(parseSpaceXUpcoming([tile],{ABC:{PrimaryLaunchDate:null,PrimaryLaunchWindow:null}}),[]);
});
test('already published missions are refreshed even when postponed beyond the discovery horizon',async()=>{
 const {spaceXNeedsRefresh}=await import('../scripts/collectors/space.mjs');
 const item={key:'sl-15-16',start:'2026-12-10T04:45:00Z'},now=new Date('2026-10-26T00:00:00Z');
 assert.equal(spaceXNeedsRefresh(item,[],now),false);assert.equal(spaceXNeedsRefresh(item,[{externalMissionId:'sl-15-16'}],now),true);
});

test('a changed mission schema cannot silently remove all existing windows',()=>{
 assert.throws(()=>parseSpaceXUpcoming([{link:'sl-15-16',missionStatus:'upcoming'}],timing));assert.throws(()=>parseSpaceXUpcoming([{link:'sl-15-16',correlationId:'ABC'}],timing));
});
