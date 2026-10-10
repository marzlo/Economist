const CACHE='economist-app-v2';
const root=new URL('./',self.location).href;
const assets=['./','style.css?v=19','chapters.js?v=15','app.js?v=14','keywords.js?v=6','sync.js?v=10','issues.js?v=18','update-trigger.js?v=19','pwa.js?v=20','manifest.webmanifest','icons/icon-192-cream.png','icons/icon-512-cream.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(assets.map(a=>new URL(a,root).href)))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('economist-app-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(root).pathname)||e.request.headers.has('Authorization'))return;
 // Cache the app shell only; live videos and GitHub requests always use the network.
 if(url.pathname.endsWith('.json')||!assets.some(a=>new URL(a,root).pathname===url.pathname))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match(root):Response.error()))));
});
