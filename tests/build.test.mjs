import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
test('les événements ont de vraies pages HTML indexables, reliées au sitemap',async()=>{
 execFileSync(process.execPath,['scripts/build.mjs']);
 const data=JSON.parse(await readFile('public/events.json','utf8'));
 const sitemap=await readFile('dist/sitemap.xml','utf8');
 for(const e of data.events){
  const html=await readFile(`dist/evenements/${e.slug}/index.html`,'utf8');
  assert.ok(html.includes(e.title.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;').replaceAll("'",'&#39;')));assert.match(html,/<h1>/);assert.match(html,/rel="canonical"/);assert.ok(html.includes(e.sources[0].url.replaceAll('&','&amp;')));assert.ok(sitemap.includes(`/evenements/${e.slug}/`));assert.doesNotMatch(html,/Démonstration — événement fictif/);
 }
 await access('dist/sources/index.html');await access('dist/evenements/index.html');await access('dist/404.html');
 const home=await readFile('dist/index.html','utf8');assert.match(home,/href="\/evenements\//);assert.doesNotMatch(home,/événements fictifs/);
});
test('les contenus réels possèdent dates absolues, sources et conditions sans valeurs inventées',async()=>{
 const d=JSON.parse(await readFile('public/events.json','utf8'));assert.equal(d.demo,false);
 const seen=new Set();
 for(const e of d.events){assert.ok(!seen.has(e.id));seen.add(e.id);assert.match(e.date,/^20\d\d-\d\d-\d\d$/);assert.ok(!e.demoSchedule);assert.ok(e.sources.length>0);for(const s of e.sources){assert.match(s.url,/^https:\/\//);assert.ok(s.collectedAt)}assert.equal(e.popularity,null);assert.notEqual(e.status,'En direct confirmé');}
});
test('les feuilles CSS sont versionnées sur l’accueil et les fiches pour éviter un cache périmé',async()=>{
 const home=await readFile('dist/index.html','utf8');
 const detail=await readFile('dist/evenements/wtt-montpellier-2026-10-27/index.html','utf8');
 for(const html of [home,detail]){assert.match(html,/href="\/?wow\.css\?v=[a-f0-9]{12}"/);assert.match(html,/href="\/?style\.css\?v=[a-f0-9]{12}"/);}
});
test('le JavaScript, son module et les données appartiennent à la même version',async()=>{
 const home=await readFile('dist/index.html','utf8');
 const detail=await readFile('dist/evenements/wtt-montpellier-2026-10-27/index.html','utf8');
 const app=await readFile('dist/app.js','utf8');const helper=await readFile('dist/detail-page.mjs','utf8');
 assert.ok(/src="app\.js\?v=[a-f0-9]{12}"/.test(home),'Le navigateur peut réutiliser le JavaScript de démonstration');
 assert.ok(/src="\/detail-page\.mjs\?v=[a-f0-9]{12}"/.test(detail),'Le script de fiche doit être versionné');
 for(const code of [app,helper])assert.ok(/event-utils\.mjs\?v=[a-f0-9]{12}/.test(code),'Le module importé doit être versionné');
 assert.ok(/fetch\('\/events\.json\?v=[a-f0-9]{12}'\)/.test(app),'Les données doivent être liées à la version du script');
});
