/* Parda service worker: images cache-first, app files network-first (updates always arrive), API/auth untouched */
const V="cv-app-v1",IM="cv-img-v1",MAX=260;
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V&&k!==IM)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.origin!==location.origin||u.pathname.startsWith("/api/")||u.pathname.startsWith("/__/"))return;
 e.respondWith(u.pathname.startsWith("/timg/")?img(r):net(r))});
async function net(r){const c=await caches.open(V);try{const n=await fetch(r);if(n.ok)c.put(r,n.clone());return n}catch(err){const m=await c.match(r)||(r.mode==="navigate"?await c.match("/"):null);if(m)return m;throw err}}
async function img(r){const c=await caches.open(IM),m=await c.match(r);if(m)return m;const n=await fetch(r);if(n.ok){c.put(r,n.clone());trim(c)}return n}
async function trim(c){const k=await c.keys();if(k.length>MAX)for(const x of k.slice(0,k.length-MAX))await c.delete(x)}
