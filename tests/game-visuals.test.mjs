import test from 'node:test';
import assert from 'node:assert/strict';
import {eventVisual} from '../public/event-utils.mjs';
test('Smash Ultimate uses its own photo instead of the Counter-Strike fallback',()=>{
 const smash=eventVisual({category:'esport',subcategory:'Super Smash Bros. Ultimate'});
 const cs=eventVisual({category:'esport',subcategory:'Counter-Strike'});
 assert.equal(smash.creditKey,'game-smash-ultimate');
 assert.notEqual(smash.src,cs.src);
 assert.equal(eventVisual({category:'esport',subcategory:'Ultimate'}).src,smash.src);
});

test('every published esport game has distinct publisher artwork and a local asset',async()=>{
 const {readFile,access}=await import('node:fs/promises');
 const events=JSON.parse(await readFile('public/events.json','utf8')).events;
 const games=[...new Set(events.filter(e=>e.category==='esport').map(e=>e.subcategory))];
 const bySource=new Map();
 for(const game of games){
  const visual=eventVisual({category:'esport',subcategory:game});
  assert.equal(visual.scope,'game',game);
  assert.equal(visual.fit,'cover',game);
  assert.ok(visual.author&&visual.originalUrl&&visual.sourceUrl,game);
  await access('public'+visual.src);
  const canonical=game==='Counter-Strike 2'?'Counter-Strike':game;
  assert.ok(!bySource.has(visual.src)||bySource.get(visual.src)===canonical,'Shared art across games: '+game);
  bySource.set(visual.src,canonical);
 }
});
