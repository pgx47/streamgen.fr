import { readFile } from 'node:fs/promises';
const expected=await readFile('dist/index.html','utf8');
for(let attempt=0;attempt<6;attempt++){
 try{
  const r=await fetch('https://streamgen.fr/',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Accueil HTTP '+r.status);
  const html=await r.text(),asset=html.match(/src="(app.js\?v=[a-f0-9]+)"/)?.[1];
  if(!asset||!expected.includes(asset))throw Error('Version publiée non correspondante');
  const app=await fetch(new URL(asset,'https://streamgen.fr/'));if(!app.ok)throw Error('Script indisponible');
  const text=await app.text(),dataPath=text.match(/fetch\('([^']+events.json\?v=[a-f0-9]+)'\)/)?.[1];
  if(!dataPath)throw Error('Données versionnées absentes');
  const data=await fetch(new URL(dataPath,'https://streamgen.fr/'));if(!data.ok)throw Error('Catalogue indisponible');
  const json=await data.json();if(!Array.isArray(json.events)||!json.events.length)throw Error('Catalogue vide');
  console.log(`Production contrôlée : version ${asset}, ${json.events.length} rendez-vous.`);process.exit(0);
 }catch(e){console.error(`Contrôle ${attempt+1}/6 : ${e.message}`);if(attempt<5)await new Promise(r=>setTimeout(r,10000));}
}
process.exitCode=1;
