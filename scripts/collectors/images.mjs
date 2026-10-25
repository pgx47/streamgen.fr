export const cleanText=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export const normalized=s=>cleanText(s).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function allowedImageUrl(url,hosts){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&hosts.includes(u.hostname)}catch{return false}}
export function approvedImageLicense(name,url){
 let u;try{u=new URL(url)}catch{return false}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return false;
 if(name==='Public domain')return (u.hostname==='creativecommons.org'&&u.pathname.startsWith('/publicdomain/'))||(u.protocol==='https:'&&u.hostname==='commons.wikimedia.org'&&u.pathname.startsWith('/wiki/File:'));
 if(name==='CC0')return u.hostname==='creativecommons.org'&&u.pathname.startsWith('/publicdomain/zero/1.0');
 const m=String(name).match(/^CC (BY(?:-SA)?) (2\.0|2\.5|3\.0|4\.0)$/);
 return !!m&&u.hostname==='creativecommons.org'&&u.pathname.replace(/\/$/,'')===`/licenses/${m[1].toLowerCase()}/${m[2]}`;
}
export function imageSubject(e){
 const title=cleanText(e.title),all=normalized(title+' '+e.subcategory),year=String(e.date||'').slice(0,4);
 if(e.category==='créateurs'&&!/paris games week|pgw|z event|zevent|speedons|gp explorer|marathon caritatif/.test(all)){
  const name=cleanText(e.organizer||title.split(/[—|]/)[0]);
  if(normalized(name).length<4)return null;
  return {name,query:name,aliases:[name],scope:'creator',year};
 }
 if(/worlds/.test(all)&&/lol|league/.test(all))return {name:'Worlds LoL',query:'League of Legends World Championship',aliases:['League of Legends World Championship','Worlds LoL'],scope:'event',year};
 if(/formule 1/.test(all)&&/mexique/.test(all))return {name:'Grand Prix du Mexique',query:'Mexican Grand Prix',aliases:['Mexican Grand Prix','Mexico Grand Prix','Grand Prix du Mexique'],scope:'event',year};
 if(/formule 1/.test(all)&&/etats unis|austin/.test(all))return {name:'Grand Prix des États-Unis',query:'United States Grand Prix',aliases:['United States Grand Prix','Grand Prix des États-Unis'],scope:'event',year};
 if(/paris games week|\bpgw\b/.test(all))return {name:'Paris Games Week',query:'Paris Games Week',aliases:['Paris Games Week'],scope:'event',year};
 if(/route du rhum/.test(all))return {name:'Route du Rhum',query:'Route du Rhum',aliases:['Route du Rhum'],scope:'event',year};
 if(/wtt.*montpellier/.test(all))return {name:'WTT Montpellier',query:'WTT Montpellier',aliases:['WTT Montpellier','WTT Champions Montpellier','World Table Tennis Montpellier'],scope:'event',year};
 const name=cleanText(title.split(/[—|]/)[0]).replace(/\b20\d{2}\b/g,'').trim();
 const words=normalized(name).split(' ').filter(s=>s.length>3&&!['journee','jour','finale','finales','course','premiers','tours','stream'].includes(s));
 return words.length>=2?{name,query:name,aliases:[name],scope:'event',year}:null;
}
function identityMatches(subject,text){
 const hay=' '+normalized(text)+' ';
 return subject.aliases.some(alias=>hay.includes(' '+normalized(alias)+' '));
}

export function commonsImageMatch(event,subject,page){
 const i=page.imageinfo?.[0],m=i?.extmetadata;if(!i||!m||!subject)return null;
 const license=cleanText(m.LicenseShortName?.value),licenseUrl=m.LicenseUrl?.value||i.descriptionurl;
 if(!approvedImageLicense(license,licenseUrl)||!m.Artist?.value||!allowedImageUrl(i.url,['upload.wikimedia.org'])||!allowedImageUrl(i.descriptionurl,['commons.wikimedia.org']))return null;
 if(!['image/jpeg','image/png'].includes(i.mime)||i.width<400||i.height<250||(subject.scope==='event'&&i.width/i.height<1.15))return null;
 if(/\b(icon|logo|map|flag|diagram)\b/i.test(page.title))return null;
 const identity=[page.title,m.ObjectName?.value,m.Categories?.value].join(' ');
 if(!identityMatches(subject,identity))return null;
 const capture=String(m.DateTimeOriginal?.value||'').match(/\b(20\d{2}|19\d{2})\b/)?.[1];
 const titleYears=[...String(page.title+' '+cleanText(m.ImageDescription?.value)).matchAll(/\b(20\d{2})\b/g)].map(m=>+m[1]);
 const fileYears=[...String(page.title).matchAll(/\b(20\d{2})\b/g)].map(m=>+m[1]);
 if(new Set(fileYears).size>1||(capture&&fileYears.length&&+capture!==fileYears[0]))return null;
 const captureDate=Date.parse(String(m.DateTimeOriginal?.value||''));if(Number.isFinite(captureDate)&&captureDate>Date.now()+86400000)return null;
 const imageYear=fileYears[0]||(capture?+capture:titleYears.length===1?titleYears[0]:null);
 if(subject.scope==='event'&&(!imageYear||imageYear>+subject.year))return null;
 const scope=subject.scope==='creator'?'creator':imageYear===+subject.year?'event':'archive';
 const label=scope==='creator'?`Portrait · ${subject.name}${imageYear?' · '+imageYear:''}`:scope==='event'?`Image de l’événement · ${subject.name} ${imageYear}`:`Archive · ${subject.name} ${imageYear}`;
 return {label,scope,eventYear:imageYear,author:cleanText(m.Attribution?.value||m.Artist.value),license,licenseUrl:licenseUrl.replace(/^http:/,'https:'),sourceUrl:i.descriptionurl,originalUrl:i.url,downloadUrl:i.thumburl||i.url,originalDownloadUrl:i.url,title:cleanText(page.title.replace(/^File:/,'')),type:'photo',score:(scope==='event'?200:scope==='creator'?100:50)+(imageYear||1900)/100,changes:'Image collectée automatiquement depuis Wikimedia Commons. Aucun participant de la photo n’est supposé annoncé pour la nouvelle fiche. Les archives conservent leur année.'};
}
export function officialImageCandidates(html,pageUrl){
 const found=[];const add=v=>{if(v?.url){try{v.url=new URL(v.url,pageUrl).href;found.push(v)}catch{}}};
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){
  const attrs=Object.fromEntries([...m[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(a=>[a[1].toLowerCase(),a[2]]));
  if(['og:image','twitter:image'].includes(attrs.property||attrs.name))add({url:attrs.content,license:null,author:null,caption:'',sourceUrl:pageUrl,kind:'preview'});
 }
 const walk=(obj,depth=0)=>{if(depth>8||!obj||typeof obj!=='object')return;if(obj['@type']==='ImageObject')add({url:obj.contentUrl||obj.url,license:obj.license||null,author:cleanText(obj.creator?.name||obj.author?.name||obj.copyrightHolder?.name),caption:cleanText(obj.caption||obj.name),date:obj.dateCreated||obj.datePublished||null,sourceUrl:pageUrl,kind:'structured'});for(const v of Object.values(obj))if(typeof v==='object')Array.isArray(v)?v.slice(0,30).forEach(x=>walk(x,depth+1)):walk(v,depth+1)};
 for(const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]))}catch{}}
 return [...new Map(found.map(v=>[v.url+'|'+v.kind,v])).values()].slice(0,12);
}
export function officialLicensedImage(event,subject,item){
 if(item.kind!=='structured'||typeof item.license!=='string'||!item.author||!identityMatches(subject,item.caption))return null;
 const u=item.license.match(/^https?:\/\/creativecommons\.org\/licenses\/(by(?:-sa)?)\/(2\.0|2\.5|3\.0|4\.0)\/?$/);
 if(!u)return null;const name='CC '+u[1].toUpperCase()+' '+u[2];if(!approvedImageLicense(name,item.license))return null;
 const captionYears=[...String(item.caption).matchAll(/\b(20\d{2})\b/g)].map(m=>m[1]);
 const dateYear=String(item.date||'').match(/\b(20\d{2})\b/)?.[1];
 if(new Set(captionYears).size>1||(dateYear&&captionYears.length&&dateYear!==captionYears[0]))return null;
 const year=captionYears[0]||dateYear;
 if(subject.scope==='event'&&year!==subject.year)return null;
 return {label:`Visuel officiel · ${subject.name}${year?' '+year:''}`,scope:subject.scope==='creator'?'creator':'event',eventYear:year?+year:null,title:item.caption,author:item.author,license:name,licenseUrl:item.license.replace(/^http:/,'https:'),sourceUrl:item.sourceUrl,originalUrl:item.url,downloadUrl:item.url,type:'photo',score:300,changes:'ImageObject et licence explicite publiés dans la source officielle. Aucun droit de réutilisation n’est déduit d’une simple miniature Open Graph.'};
}
