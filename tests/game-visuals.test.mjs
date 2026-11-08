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

test('every published esport game has distinct publisher artwork or the generic esport photo',async()=>{
 const {readFile,access}=await import('node:fs/promises');
 const events=JSON.parse(await readFile('public/events.json','utf8')).events;
 const games=[...new Set(events.filter(e=>e.category==='esport').map(e=>e.subcategory))];
 const generic=eventVisual({category:'esport',subcategory:'__jeu-inconnu__'});
 assert.equal(generic.creditKey,'esport');
 assert.equal(generic.type,'photo');
 const bySource=new Map();
 for(const game of games){
  const visual=eventVisual({category:'esport',subcategory:game});
  assert.equal(visual.fit,'cover',game);
  if(visual.scope==='game'){
   assert.ok(visual.author&&visual.originalUrl&&visual.sourceUrl,game);
   const canonical=game==='Counter-Strike 2'?'Counter-Strike':game;
   assert.ok(!bySource.has(visual.src)||bySource.get(visual.src)===canonical,'Shared art across games: '+game);
   bySource.set(visual.src,canonical);
  }else{
   assert.equal(visual.creditKey,'esport','A game without dedicated art must use the generic esport photo: '+game);
   assert.equal(visual.type,'photo','Published events never fall back to an AI image: '+game);
  }
  await access('public'+visual.src);
 }
});
