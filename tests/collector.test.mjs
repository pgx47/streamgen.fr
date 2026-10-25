import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWttDay, mergeCollectedEvents } from '../scripts/collectors/core.mjs';
test('extrait uniquement les dates et sessions explicites de la page officielle',()=>{
 const html='<h1>MARDI 27 OCTOBRE 2026</h1><p>Session 1 dès 12h00</p><p>Session 2 dès 18h30</p>';
 const r=parseWttDay(html,'https://tickets.wttmontpellier.com/fr/mardi_27_octobre_2026');
 assert.equal(r.date,'2026-10-27');assert.deepEqual(r.times,['12:00','18:30']);
});
test('une page vide ou une édition contradictoire ne publie aucun horaire',()=>{
 assert.throws(()=>parseWttDay('<h1>Access denied</h1>','https://tickets.wttmontpellier.com/fr/mardi_27_octobre_2026'));
 assert.throws(()=>parseWttDay('<h1>MARDI 27 OCTOBRE 2025</h1><p>Session 1 dès 12h00</p>','https://tickets.wttmontpellier.com/fr/mardi_27_octobre_2026'));
});
test('une collecte partielle conserve les événements non couverts et les conditions validées',()=>{
 const old=[{id:'a',title:'A',broadcastOptions:[{access:'unknown'}],start:'old'},{id:'b',title:'B'}];
 const next=mergeCollectedEvents(old,[{id:'a',start:'new'}]);
 assert.equal(next.length,2);assert.equal(next[0].start,'new');assert.deepEqual(next[0].broadcastOptions,old[0].broadcastOptions);
 assert.deepEqual(old[0].start,'old');
});
