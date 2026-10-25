import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialPriority,rankHighlights} from '../public/event-utils.mjs';
const now=new Date('2026-10-25T10:00:00Z');
const event=(id,title,extra={})=>({id,title,category:'esport',subcategory:'League of Legends',date:'2026-10-25',start:'2026-10-25T18:00:00Z',status:'À venir',...extra});
test('Worlds outrank ordinary creator streams, regardless of creator fame or featured flag',()=>{
 const worlds=event('worlds','Worlds LoL — phase suisse');
 const stream=event('stream','ZeratoR — Stream',{category:'créateurs',subcategory:'Just Chatting',featured:true});
 assert.ok(editorialPriority(worlds,now).score>editorialPriority(stream,now).score);
 assert.equal(rankHighlights([stream,worlds],now)[0].id,'worlds');
});
test('stakes distinguish final, quarter-final and regular stages; generic game titles do not imply finals',()=>{
 const final=event('f','Worlds LoL — la finale'),quarter=event('q','Worlds LoL — quarts de finale'),regular=event('r','Worlds LoL — phase suisse');
 assert.ok(editorialPriority(final,now).score>editorialPriority(quarter,now).score);
 assert.ok(editorialPriority(quarter,now).score>editorialPriority(regular,now).score);
 assert.equal(editorialPriority(event('x','ZeratoR — Final Fantasy',{category:'créateurs'}),now).score,editorialPriority(event('y','ZeratoR — Stream',{category:'créateurs'}),now).score);
});
test('selection excludes cancelled, past and uncertain slots, and diversifies editions without hiding their priority',()=>{
 const list=[event('a','Worlds LoL — phase suisse'),event('b','Worlds LoL — phase suisse du lendemain',{date:'2026-10-26',start:'2026-10-26T18:00:00Z'}),event('c','GP du Mexique — course',{category:'sport',subcategory:'Formule 1'}),event('d','Worlds LoL — finale',{status:'Annulé'}),event('e','Worlds LoL — finale',{date:'2026-10-24',start:'2026-10-24T18:00:00Z'}),event('u','Worlds LoL',{status:'Programmation à revérifier'})];
 assert.deepEqual(rankHighlights(list,now,3).map(e=>e.id),['a','c']);
});
test('editorial scores ignore unmeasured popularity, reliability and personal favorites',()=>{
 const e=event('a','Worlds LoL');
 assert.deepEqual(editorialPriority(e,now),editorialPriority({...e,popularity:999999,lastVerified:null,featured:true,frenchPresence:true},now));
 assert.ok(editorialPriority(e,now).reasons.length);
});
test('today comes before future hype; one week is covered, only major events beyond it',()=>{
 const ordinary=event('today','ZeratoR — Stream',{category:'créateurs',subcategory:'Just Chatting'});
 const big=event('big','Worlds LoL — finale',{date:'2026-11-14',start:'2026-11-14T19:00:00Z'});
 const nextWeek=event('week','Autre rendez-vous',{category:'autres',subcategory:'Culture',date:'2026-11-01',start:'2026-11-01T19:00:00Z'});
 const distant=event('distant','Stream normal',{category:'créateurs',subcategory:'Autre',date:'2026-11-04',start:'2026-11-04T19:00:00Z'});
 const ids=rankHighlights([distant,big,nextWeek,ordinary],now,8).map(e=>e.id);
 assert.equal(ids[0],'today');assert.ok(ids.includes('week'));assert.ok(ids.includes('big'));assert.ok(!ids.includes('distant'));
});
test('qualification wording never receives a final bonus',()=>{
 const p=editorialPriority(event('q','Worlds LoL — qualifications pour la finale'),now);
 assert.ok(p.reasons.includes('Qualifications'));assert.ok(!p.reasons.includes('Finale annoncée'));
});
test('highlights retire unknown-duration slots after a clearly editorial three-hour window; archive input stays untouched',()=>{
 const old=event('old','Worlds LoL',{start:'2026-10-25T06:00:00Z'});
 const current=event('current','Course',{start:'2026-10-25T09:00:00Z'});
 const confirmed=event('live','Confirmed live',{start:'2026-10-25T05:00:00Z',status:'En direct confirmé',subcategory:'Other'});
 const source=[old,current,confirmed];
 assert.deepEqual(new Set(rankHighlights(source,now,6).map(e=>e.id)),new Set(['current','live']));
 assert.equal(source.length,3);assert.equal(old.status,'À venir');
});
test('PGW is a special gaming event with imagery, not a routine creator slot',async()=>{
 const {eventVisual}=await import('../public/event-utils.mjs');
 const pgw=event('pgw','Paris Games Week — la scène Capcom',{category:'créateurs',subcategory:'Jeux et rencontres'});
 assert.ok(eventVisual(pgw)?.src);assert.ok(!editorialPriority(pgw,now).reasons.includes('Créneau régulier de créateur'));
 const cooking=event('cooking','ZeratoR — Cuisine',{category:'créateurs',subcategory:'Cooking Simulator'});
 assert.notEqual(eventVisual(cooking)?.src,'/assets/esport-hero.webp');
});
