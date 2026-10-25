import test from 'node:test';
import assert from 'node:assert/strict';
import {imageSubject,commonsImageMatch,approvedImageLicense,officialImageCandidates,allowedImageUrl} from '../scripts/collectors/images.mjs';
const event={id:'worlds-2026',title:'Worlds LoL — phase suisse',category:'esport',subcategory:'League of Legends',date:'2026-10-26',organizer:'Riot Games'};
const candidate=(year=2025,license='CC BY 4.0')=>({title:`File:League of Legends World Championship ${year} arena.jpg`,imageinfo:[{url:'https://upload.wikimedia.org/wikipedia/commons/a/a1/arena.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Arena.jpg',width:1400,height:800,mime:'image/jpeg',extmetadata:{Artist:{value:'Photographe'},LicenseShortName:{value:license},LicenseUrl:{value:'https://creativecommons.org/licenses/by/4.0/'},DateTimeOriginal:{value:year+'-10-20'},ImageDescription:{value:`League of Legends World Championship ${year}`}}}]});
test('licenses exclude NC, ND and invented permission',()=>{
 assert.ok(approvedImageLicense('CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'));
 assert.ok(!approvedImageLicense('CC BY-NC 4.0','https://creativecommons.org/licenses/by-nc/4.0/'));
 assert.ok(!approvedImageLicense('CC BY 4.0','https://evil.test/licenses/by/4.0/'));
 assert.ok(!approvedImageLicense('Public domain','https://evil.test/'));
});
test('event image matching requires identity and explicit edition, marks older images as archive',()=>{
 const subject=imageSubject(event),old=commonsImageMatch(event,subject,candidate());
 assert.equal(old.scope,'archive');assert.equal(old.eventYear,2025);assert.match(old.label,/2025/);
 assert.equal(commonsImageMatch(event,subject,candidate(2026)).scope,'event');
 assert.equal(commonsImageMatch(event,subject,candidate(2027)),null);
 const wrong=candidate();wrong.title='File:Other tournament 2025.jpg';wrong.imageinfo[0].extmetadata.ImageDescription.value='Another competition';assert.equal(commonsImageMatch(event,subject,wrong),null);
 assert.equal(commonsImageMatch(event,subject,candidate(2025,'CC BY-NC 4.0')),null);
});
test('creator portraits require the named identity, not the game or popularity',()=>{
 const e={...event,title:'NouveauCreateur — Stream',organizer:'NouveauCreateur',category:'créateurs',subcategory:'Just Chatting'};
 const subject=imageSubject(e);assert.equal(subject.scope,'creator');assert.match(subject.query,/NouveauCreateur/);
 const c=candidate();c.title='File:ZeratoR.jpg';assert.equal(commonsImageMatch(e,subject,c),null);
});
test('Open Graph is a candidate, never implicit permission',()=>{
 const items=officialImageCandidates('<meta property="og:image" content="https://cdn.sanity.io/image.jpg">','https://www.parisgamesweek.com/fr');
 assert.equal(items.length,1);assert.equal(items[0].license,null);
 const json={ '@type':'ImageObject',contentUrl:'https://example.org/photo.jpg',license:'https://creativecommons.org/licenses/by/4.0/',creator:{name:'Auteur'},caption:'Mon événement 2026'};
 assert.equal(officialImageCandidates(`<script type="application/ld+json">${JSON.stringify(json)}</script>`,'https://example.org/')[0].author,'Auteur');
});
test('image requests are constrained to known HTTPS hosts without userinfo or custom ports',()=>{
 assert.ok(allowedImageUrl('https://upload.wikimedia.org/wikipedia/commons/a.jpg',['upload.wikimedia.org']));
 for(const url of ['http://upload.wikimedia.org/a','https://127.0.0.1/a','https://upload.wikimedia.org@127.0.0.1/a','https://upload.wikimedia.org:8443/a','https://evil.test/a'])assert.equal(allowedImageUrl(url,['upload.wikimedia.org']),false);
});
test('historical mentions in descriptions do not make an unrelated image an event photo',()=>{
 const e={...event,title:'Route du Rhum — départ',category:'sport',subcategory:'Voile'};
 const c=candidate(2026);c.title='File:Boat in Lorient 2026.jpg';c.imageinfo[0].extmetadata.ImageDescription.value='Boat in Lorient in 2026, previously won the Route du Rhum in 2018';
 assert.equal(commonsImageMatch(e,imageSubject(e),c),null);
 const f1={...event,title:'GP du Mexique — course',category:'sport',subcategory:'Formule 1'};
 c.title='File:USDA car.jpg';c.imageinfo[0].extmetadata.ImageDescription.value='Baltimore Grand Prix cars, renewable biofuels from New Mexico';
 assert.equal(commonsImageMatch(f1,imageSubject(f1),c),null);
});
test('rendering accepts only approved local images bound to the event and consistent with its edition',async()=>{
 const {automaticEventVisual}=await import('../public/event-utils.mjs');
 const image={approved:true,binding:event.id,src:'/assets/auto-images/1234567890abcdef12345678.jpg',creditKey:'auto-1234567890abcdef12345678',author:'Auteur',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:'https://commons.wikimedia.org/wiki/File:Photo.jpg',scope:'archive',eventYear:2025,label:'Archive 2025'};
 assert.ok(automaticEventVisual({...event,sourceImage:image}));
 for(const patch of [{binding:'other'},{approved:false},{src:'https://evil.test/image.jpg'},{eventYear:2027},{license:'CC BY-NC 4.0'}])assert.equal(automaticEventVisual({...event,sourceImage:{...image,...patch}}),null);
});
test('conflicting filename edition and captured date never get silently relabeled',()=>{
 const c=candidate(2025);c.imageinfo[0].extmetadata.DateTimeOriginal.value='2026-01-01';
 assert.equal(commonsImageMatch(event,imageSubject(event),c),null);
});
test('official ImageObject needs an explicit applicable license and a coherent edition',async()=>{
 const {officialLicensedImage}=await import('../scripts/collectors/images.mjs');
 const subject=imageSubject(event),item={kind:'structured',url:'https://example.org/worlds.jpg',license:'https://creativecommons.org/licenses/by/4.0/',author:'Auteur',caption:'League of Legends World Championship 2026',date:'2026-10-01',sourceUrl:'https://example.org/event'};
 assert.ok(officialLicensedImage(event,subject,item));
 assert.equal(officialLicensedImage(event,subject,{...item,caption:'League of Legends World Championship 2021'}),null);
 assert.equal(officialLicensedImage(event,subject,{...item,license:null}),null);
});
