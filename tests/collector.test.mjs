import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWttDay, mergeCollectedEvents, wttIndex } from '../scripts/collectors/core.mjs';
test('accueil WTT : hors édition sans journée datée, édition ouverte avec liens',()=>{
 const closed=wttIndex('<title>Billetterie Officielle I WTT Champions Montpellier 2026</title><a href="/fr/champions_experience_2026">Expérience</a>');
 assert.deepEqual(closed.urls,[]);assert.equal(closed.identified,true);
 assert.equal(wttIndex('<title>Accueil</title>').identified,false);
 const open=wttIndex('<title>WTT Montpellier</title><a href="/fr/mardi_27_octobre_2026">Mardi</a><a href="/fr/mardi_27_octobre_2026">Doublon</a>');
 assert.deepEqual(open.urls,['https://tickets.wttmontpellier.com/fr/mardi_27_octobre_2026']);assert.equal(open.identified,true);
});
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
