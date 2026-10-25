import { calendarText, statusAt } from './event-utils.mjs';
const data=document.querySelector('#event-data');
if(data){
 const e=JSON.parse(data.textContent),fav=document.querySelector('#page-favorite'),note=document.querySelector('#page-toast');
 let favorites=new Set();try{favorites=new Set(JSON.parse(localStorage.getItem('streamgen-favorites')||'[]'))}catch{}
 const update=()=>{fav.textContent=favorites.has(e.id)?'♥ Enregistré':'♡ Enregistrer';fav.setAttribute('aria-pressed',favorites.has(e.id))};update();
 fav.onclick=()=>{favorites.has(e.id)?favorites.delete(e.id):favorites.add(e.id);try{localStorage.setItem('streamgen-favorites',JSON.stringify([...favorites]))}catch{note.textContent='Stockage indisponible : favori conservé pour cette visite.'}update()};
 document.querySelector('#page-calendar').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([calendarText(e)],{type:'text/calendar;charset=utf-8'}));a.download=e.id+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);note.textContent=e.start?'Calendrier téléchargé. Horaire annoncé, sous réserve de modification.':'Calendrier téléchargé en journée entière : horaire encore inconnu.'};
 document.querySelector('#page-copy').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);note.textContent='Lien copié.'}catch{note.textContent='Copiez l’adresse affichée dans votre navigateur.'}};
 document.querySelector('#page-status').textContent=statusAt(e);
 if(Date.now()-new Date(e.lastVerified)>48*3600000)document.querySelector('#freshness').textContent='Informations à revérifier — dernière consultation le '+new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'Europe/Paris'}).format(new Date(e.lastVerified));
}

document.addEventListener('error',ev=>{
 const img=ev.target;
 if(img instanceof HTMLImageElement&&img.closest('.event-cover')&&!img.src.endsWith('/assets/library/generic.webp')){
  img.src='/assets/library/generic.webp';const credit=img.closest('.event-cover').querySelector('.image-credit-link');
  if(credit){credit.href='/credits-images/#generic';credit.textContent='Illustration d’ambiance · crédits'}
 }
},true);
