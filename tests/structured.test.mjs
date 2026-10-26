import test from 'node:test';import assert from 'node:assert/strict';
import {parseRiotMatches}from'../scripts/collectors/structured.mjs';
const item={__typename:'EventMatch',id:'123',startTime:'2026-10-26T18:00:00Z',state:'unstarted',league:{name:'Game Changers Championship'},blockName:'Knockouts',matchTeams:[{name:'A'},{name:'B'}],streams:[]};
test('Riot match identity is stable, duplicates merge, unknown teams and absent streams stay unknown',()=>{const s=JSON.stringify(item);const list=parseRiotMatches(s+s);assert.equal(list.length,1);assert.deepEqual(list[0].teams,['A','B']);assert.equal(list[0].streams.length,0);assert.equal(parseRiotMatches(JSON.stringify({...item,matchTeams:[{name:'TBD'},{name:'TBD'}]}))[0].teams.length,0)});
test('Riot parser never evaluates embedded script and ignores invalid dates',()=>{assert.equal(parseRiotMatches('throw Error("run");'+JSON.stringify({...item,startTime:'TBD'})).length,0)});
