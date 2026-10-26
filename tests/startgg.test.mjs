import test from 'node:test';
import assert from 'node:assert/strict';
import {startggStreamURL,startggToItems} from '../scripts/collectors/startgg.mjs';

test('startggStreamURL builds platform URLs and skips unknown sources',()=>{
 assert.deepEqual(startggStreamURL({streamName:'SuperAkouma',streamSource:'TWITCH'}),{platform:'Twitch',url:'https://www.twitch.tv/superakouma'});
 assert.deepEqual(startggStreamURL({streamName:'FGC FR',streamSource:'YOUTUBE'}),{platform:'YouTube',url:'https://www.youtube.com/@FGCFR'});
 assert.deepEqual(startggStreamURL({streamName:'x',streamSource:'MIXER'}),null);
 assert.equal(startggStreamURL({streamName:'',streamSource:'TWITCH'}),null);
});

test('startggToItems keeps dated tournaments with stream and game info',()=>{
 const items=startggToItems([
  {id:966356,name:'Le Smash Blésois X',slug:'tournament/le-smash',startAt:1792933200,endAt:1792947600,city:'Villebarou',events:[{name:'Ultimate Singles',startAt:1792933200,videogame:{displayName:'Ultimate'}}],streams:[{streamName:'superakouma',streamSource:'TWITCH'}]},
  {id:null,name:'bad',startAt:null},
  {id:1,name:'No date',slug:'tournament/nope',startAt:null}
 ]);
 assert.equal(items.length,1);
 assert.equal(items[0].key,'sg-966356');
 assert.equal(items[0].game,'Ultimate');
 assert.equal(items[0].streams[0].platform,'Twitch');
 assert.equal(items[0].end,new Date(1792947600*1000).toISOString());
});
