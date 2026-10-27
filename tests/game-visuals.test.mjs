import test from 'node:test';
import assert from 'node:assert/strict';
import {eventVisual} from '../public/event-utils.mjs';
test('Smash Ultimate uses its own photo instead of the Counter-Strike fallback',()=>{
 const smash=eventVisual({category:'esport',subcategory:'Super Smash Bros. Ultimate'});
 const cs=eventVisual({category:'esport',subcategory:'Counter-Strike'});
 assert.equal(smash.creditKey,'photo-smash-ultimate');
 assert.notEqual(smash.src,cs.src);
 assert.equal(eventVisual({category:'esport',subcategory:'Ultimate'}).src,smash.src);
});
