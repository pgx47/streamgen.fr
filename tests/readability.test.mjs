import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('no desktop or mobile stylesheet can reinstate microscopic text',async()=>{
 for(const file of ['public/style.css','public/wow.css']){
  const css=await readFile(file,'utf8');
  for(const m of css.matchAll(/font-size\s*:\s*([\d.]+)(px|rem|em)/g)){
   const px=Number(m[1])*(m[2]==='px'?1:16);
   assert.ok(px>=14,`${file} still declares ${m[0]}`);
  }
 }
});
