import test from 'node:test';
import assert from 'node:assert/strict';
import {frenchGuess} from '../scripts/collectors/french.mjs';

test('frenchGuess flags French structures, teams and athletes',()=>{
 assert.ok(frenchGuess({title:'Karmine Corp vs Fnatic',participants:['Karmine Corp','Fnatic']}));
 assert.ok(frenchGuess({title:'France - Italie',participants:['France','Italie']}));
 assert.ok(frenchGuess({title:'Vitality',participants:['Team Vitality','MOUZ']}));
 assert.equal(frenchGuess({title:'G2 vs NAVI',participants:['G2','Natus Vincere']}),null);
});
