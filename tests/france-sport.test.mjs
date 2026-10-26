import test from 'node:test';import assert from 'node:assert/strict';
import{discoverFranceSportWeek,parseFranceSportWeek}from'../scripts/collectors/france-sport.mjs';
const html='<p>La programmation du dimanche 25 octobre 2026 au dimanche 1er novembre 2026.</p><article><p><strong>Lundi 26 octobre</strong></p><p>20h15 - Live Club Stade 2 Ligue 1 | Live chat 💬</p><p><strong>Samedi 31 octobre</strong></p><p>7h00 - WXV : Nouvelle-Zélande vs France</p><p>9h25 - Dakar</p><p>9h25 - Dakar</p><p>15h55 - Dakar</p></article>';
test('france.tv weekly sport uses the explicit dated week, Paris timezone and exact programme rows, without duplicate rows',()=>{
 const a=parseFranceSportWeek(html);assert.equal(a.items.length,4);assert.equal(a.items[0].start,'2026-10-26T19:15:00.000Z');assert.equal(a.items[1].start,'2026-10-31T06:00:00.000Z');assert.equal(a.items[0].title,'Live Club Stade 2 Ligue 1');assert.equal(a.items[0].end,null);
 assert.throws(()=>parseFranceSportWeek(html.replace('2026 au dimanche 1er novembre 2026','au dimanche 1er novembre')));assert.throws(()=>parseFranceSportWeek(html.replace('Samedi 31 octobre','Vendredi 31 octobre')));
});
test('weekly discovery only follows the broadcaster article and handles a dated week across New Year',()=>{
 assert.equal(discoverFranceSportWeek('<a href="/sport/multisports/123-nos-directs-a-venir.html">À venir</a>'),'https://www.france.tv/sport/multisports/123-nos-directs-a-venir.html');assert.equal(discoverFranceSportWeek('<a href="https://evil.test/123-nos-directs-a-venir.html">x</a>'),null);
 const s='<p>du dimanche 27 décembre 2026 au dimanche 3 janvier 2027</p><article><p>Vendredi 1er janvier</p><p>15h00 - Rugby</p></article>';assert.equal(parseFranceSportWeek(s).items[0].start,'2027-01-01T14:00:00.000Z');
});
