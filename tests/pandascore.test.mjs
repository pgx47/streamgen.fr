import test from 'node:test';
import assert from 'node:assert/strict';
import {pandascoreToItems,platformOf,COVERED} from '../scripts/collectors/pandascore.mjs';

test('pandascoreToItems keeps uncovered games, drops covered/finished',()=>{
 const items=pandascoreToItems([
  {id:1,begin_at:'2026-11-01T18:00:00Z',status:'not_started',videogame:{slug:'r6siege',name:'Rainbow Six Siege'},name:'W7M vs FaZe',opponents:[{opponent:{name:'W7M'}},{opponent:{name:'FaZe'}}],streams_list:[{main:true,official:true,language:'en',raw_url:'https://www.twitch.tv/rainbow6'}],serie:{full_name:'BLAST R6 Major'},league:{name:'BLAST'}},
  {id:2,begin_at:'2026-11-01T18:00:00Z',status:'not_started',videogame:{slug:'cs-go'},name:'dup'},
  {id:3,begin_at:'2026-11-01T18:00:00Z',status:'finished',videogame:{slug:'r6siege'},name:'done'},
  {id:4,begin_at:null,status:'not_started',videogame:{slug:'r6siege'},name:'nodate'}
 ]);
 assert.equal(items.length,1);
 assert.equal(items[0].key,'ps-1');
 assert.deepEqual(items[0].teams,['W7M','FaZe']);
 assert.equal(items[0].streams[0].url,'https://www.twitch.tv/rainbow6');
});

test('platformOf maps stream hosts',()=>{
 assert.equal(platformOf('https://www.twitch.tv/pgl'),'Twitch');
 assert.equal(platformOf('https://kick.com/epl'),'Kick');
 assert.equal(platformOf('https://youtube.com/@x'),'YouTube');
 assert.equal(platformOf('not-a-url'),null);
});
