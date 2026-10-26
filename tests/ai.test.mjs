import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAiItems,cleanAiJson} from '../scripts/collectors/ai.mjs';

const future=new Date(Date.now()+86400000).toISOString();
test('validateAiItems rejects hallucinated or incomplete entries',()=>{
 const {ok,bad}=validateAiItems([
  {title:'Concert symphonique en direct',category:'autres',date:future.slice(0,10),start:future,watchUrl:'https://www.france.tv/x'},
  {title:'Docu replay sans date',category:'autres'},
  {title:'Trop court',category:'autres',date:future.slice(0,10),start:future},
  {title:'Lien non https',category:'sport',date:future.slice(0,10),start:future,watchUrl:'http://x.com'},
  {title:'Catégorie invalide',category:'sport tv',date:future.slice(0,10),start:future},
 ],{origin:'https://www.france.tv'});
 assert.equal(ok.length,1);
 assert.equal(bad.length,4);
 assert.equal(ok[0].watchUrl,'https://www.france.tv/x');
});

test('cleanAiJson strips markdown fences and keeps the array',()=>{
 assert.deepEqual(cleanAiJson('```json\n[{"a":1}]\n```'),[{a:1}]);
 assert.deepEqual(cleanAiJson('prefix [{"b":2}] suffix'),[{b:2}]);
});
