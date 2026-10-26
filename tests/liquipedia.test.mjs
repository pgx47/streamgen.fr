import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMatchesPage,parseTournamentStreams,streamURL,tournamentName} from '../scripts/collectors/liquipedia.mjs';

const block=`<div class="match-info"><span class="match-info-countdown"><span class="timer-object" data-timestamp="1793001600">October 26, 2026 - 08:00</span></span><div class="match-info-header"><div class="match-info-header-opponent match-info-header-opponent-left"><span class="name"><a href="/counterstrike/MOUZ" title="MOUZ">MOUZ</a></span></div><div class="match-info-header-opponent match-info-header-opponent-right"><span class="name"><a href="/counterstrike/The_MongolZ" title="The MongolZ">MongolZ</a></span></div><span class="match-info-header-scoreholder-lower">(Bo3)</span><a href="/counterstrike/PGL/2026/Masters#Round_3" title="PGL/2026/Masters#Round 3"></a></div></div>`;

test('parseMatchesPage extracts timestamp, teams, tournament and stage',()=>{
 const out=parseMatchesPage('<div>'+block,'counterstrike');
 assert.equal(out.length,1);
 assert.equal(out[0].start,new Date(1793001600*1000).toISOString());
 assert.deepEqual(out[0].opponents,['MOUZ','The MongolZ']);
 assert.equal(out[0].stage,'Round 3');
 assert.equal(out[0].tournamentPath,'/counterstrike/PGL/2026/Masters');
 assert.equal(out[0].bo,3);
});

test('parseMatchesPage keeps rows without teams and ignores unparseable blocks',()=>{
 const noTeams=block.replace(/<span class="name">[\s\S]*?<\/span>/g,'').replace('data-timestamp="1793001600"','data-timestamp="1793001601"');
 const out=parseMatchesPage('<div>'+block+noTeams+'<div class="match-info">no timestamp','counterstrike');
 assert.equal(out.length,2);
 assert.deepEqual(out[1].opponents,[]);
});

test('parseTournamentStreams dedupes platform+channel',()=>{
 const html='<a href="/x/Special:Stream/twitch/PGL"></a><a href="/x/Special:Stream/twitch/PGL_CS2"></a><a href="/x/Special:Stream/kick/PGL%20CS2"></a><a href="/x/Special:Stream/youtube/PGL"></a>';
 const out=parseTournamentStreams(html);
 assert.deepEqual(out.map(s=>s.platform+'/'+s.channel).sort(),['kick/PGL CS2','twitch/PGL','twitch/PGL CS2','youtube/PGL']);
});

test('streamURL builds real channel URLs',()=>{
 assert.equal(streamURL({platform:'twitch',channel:'PGL CS2'}),'https://www.twitch.tv/pgl_cs2');
 assert.equal(streamURL({platform:'kick',channel:'Circuit X'}),'https://kick.com/circuit_x');
 assert.equal(streamURL({platform:'youtube',channel:'PGL'}),'https://www.youtube.com/@PGL');
 assert.equal(streamURL({platform:'mixer',channel:'x'}),null);
});

test('tournamentName turns wiki paths into display names',()=>{
 assert.equal(tournamentName('PGL/2026/Masters'),'PGL 2026 Masters');
 assert.equal(tournamentName('BLAST/Rivals/2026/Fall'),'BLAST Rivals 2026 Fall');
});
