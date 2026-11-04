const PREFIX='nidhi-shell-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'local-app-v29';
const SHELL=['./','./index.html','./style.css','./app-style.css','./app.js','./auth.js','./qr-transfer.js','./qr-protocol.js','./analysis.js','./stats.js','./summary-cards.js','./record-row.js','./record-row.css','./calendar-periods.js','./reminders.js','./app-shell.js','./ledger.js','./install.js','./updates.js','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest','./vendor/jszip.min.js','./vendor/qrcode.js','./vendor/qr-scanner.min.js','./vendor/qr-scanner-worker.min.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(path=>new Request(path,{cache:'reload'}))))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Serve one complete release from this worker's cache, never from a waiting release.
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin)return;
 const inScope=url.pathname.startsWith(new URL(self.registration.scope).pathname);
 if(event.request.mode==='navigate'&&inScope){
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match('./index.html'))||fetch(event.request)));
  return;
 }
 if(!SHELL.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});

self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'./#home',self.registration.scope);
 if(target.origin!==self.location.origin||!target.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  for(const client of clients)if(client.url.startsWith(self.registration.scope)&&'focus'in client){await client.navigate(target.href);return client.focus()}
  return self.clients.openWindow(target.href);
 }));
});

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
