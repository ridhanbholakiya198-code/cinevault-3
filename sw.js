/* Parda service worker: images cache-first; app files network-first BUT if the network is slow (2.5s) the saved copy is used and refreshed in the background; API/auth untouched */
const V="cv-app-v1",IM="cv-img-v1",MAX=260,WAIT=2500;
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V&&k!==IM)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.origin!==location.origin||u.pathname.startsWith("/api/")||u.pathname.startsWith("/__/")||r.headers.has("range"))return;
 e.respondWith(u.pathname.startsWith("/timg/")?img(r):net(e))});
async function net(e){const r=e.request,c=await caches.open(V),hit=await c.match(r);
 const up=fetch(r).then(n=>{if(n.status===200)c.put(r,n.clone());return n});
 if(!hit){try{return await up}catch(err){const h=r.mode==="navigate"?await c.match("/"):null;if(h)return h;throw err}}
 e.waitUntil(up.catch(()=>{}));
 return Promise.race([up.catch(()=>hit),new Promise(res=>setTimeout(()=>res(hit),WAIT))])}
async function img(r){const c=await caches.open(IM),m=await c.match(r);if(m)return m;const n=await fetch(r);if(n.status===200){c.put(r,n.clone());trim(c)}return n}
async function trim(c){const k=await c.keys();if(k.length>MAX)for(const x of k.slice(0,k.length-MAX))await c.delete(x)}
