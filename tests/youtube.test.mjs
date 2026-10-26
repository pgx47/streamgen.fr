import test from 'node:test';
import assert from 'node:assert/strict';
import {extractJson,parseStreamLockups,parseWatchDetails,cleanYouTubeTitle} from '../scripts/collectors/youtube.mjs';

const lockup=(id,title,parts)=>({contentId:id,metadata:{lockupMetadataViewModel:{title:{content:title},metadata:{contentMetadataViewModel:{metadataRows:[{metadataParts:parts.map(t=>({text:{content:t}}))}]}}}}});
const page=o=>'<html><script>var ytInitialData = '+JSON.stringify(o)+';</script></html>';

test('extractJson reads balanced JSON past nested braces and quoted braces',()=>{
 const html='<script>var ytInitialData = {"a":{"b":"x{y}","c":[1,{"d":"}"}]},"e":2};</script>';
 assert.deepEqual(extractJson(html,'ytInitialData'),{a:{b:'x{y}',c:[1,{d:'}'}]},e:2});
});

test('parseStreamLockups classifies scheduled, live and past entries',()=>{
 const data={items:[
  {lockupViewModel:lockup('AbCdEfGhIjK','Match A',['Planifié pour le 15/11/2026 14:30'])},
  {lockupViewModel:lockup('ZZZZZZZZZZZ','Live cam',['63 spectateurs'])},
  {lockupViewModel:lockup('YYYYYYYYYYY','Replay',['39 k','Diffusé il y a 1 j'])}
 ]};
 const out=parseStreamLockups(page(data));
 assert.equal(out.length,3);
 assert.equal(out[0].status,'scheduled');
 assert.equal(out[1].status,'live');
 assert.equal(out[2].status,'past');
});

test('parseStreamLockups returns null without ytInitialData',()=>{
 assert.equal(parseStreamLockups('<html>rien</html>'),null);
});

test('parseWatchDetails keeps real livestreams, rejects premieres and VOD',()=>{
 const wrap=o=>'<script>ytInitialPlayerResponse = '+JSON.stringify(o)+';</script>';
 const live=parseWatchDetails(wrap({videoDetails:{title:'Match',lengthSeconds:'0',author:'FFF',channelId:'UCx'},microformat:{playerMicroformatRenderer:{liveBroadcastDetails:{isLiveNow:false,startTimestamp:'2026-11-15T22:30:00+00:00',endTimestamp:'2026-11-16T01:00:00+00:00'}}}}));
 assert.equal(live.livestream,true);
 assert.equal(live.start,'2026-11-15T22:30:00.000Z');
 assert.equal(live.end,'2026-11-16T01:00:00.000Z');
 const premiere=parseWatchDetails(wrap({videoDetails:{title:'Clip',lengthSeconds:'615'},microformat:{playerMicroformatRenderer:{liveBroadcastDetails:{isLiveNow:false,startTimestamp:'2026-11-15T22:30:00+00:00'}}}}));
 assert.equal(premiere.premiere,true);
 assert.equal(premiere.livestream,false);
 const vod=parseWatchDetails(wrap({videoDetails:{title:'Docu',lengthSeconds:'3600'},microformat:{playerMicroformatRenderer:{}}}));
 assert.equal(vod.livestream,false);
 assert.equal(vod.premiere,false);
});

test('cleanYouTubeTitle strips live markers and emoji prefixes',()=>{
 assert.equal(cleanYouTubeTitle('🔴 Summer Youth Olympics! Fencing'),'Summer Youth Olympics! Fencing');
 assert.equal(cleanYouTubeTitle('LIVE - Venezuela v Colombia | FIBA U16'),'Venezuela v Colombia | FIBA U16');
 assert.equal(cleanYouTubeTitle('Match normal'),'Match normal');
});
