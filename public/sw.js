const CACHE='streamgen-__BUILD_VERSION__';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(__PRECACHE__))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('streamgen-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{let cache;try{cache=await caches.open(CACHE)}catch{return fetch(event.request)}try{const response=await fetch(event.request);if(response.ok)try{await cache.put(event.request,response.clone());const keys=await cache.keys();if(keys.length>100)await cache.delete(keys[0]);}catch{}return response}catch(error){const saved=await cache.match(event.request);if(saved)return saved;if(event.request.mode==='navigate'){const home=await cache.match('/');if(home)return home}throw error}})());
});
