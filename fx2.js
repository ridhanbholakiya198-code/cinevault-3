/* PARDA FX — detail backdrop parallax, perf governor, PWA. (v54: reveal/row animations removed)
   Add-on only: does not touch app.js logic. */
(()=>{"use strict";
const $=s=>document.querySelector(s),root=document.documentElement,md=$("#modal"),mc=$("#mc"),rows=$("#rows");
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
const lite=()=>root.classList.contains("lite");

/* 1. Performance governor — watches frame time during the first scroll; weak phones get the light mode (no heavy motion) */
(()=>{if(sessionStorage.getItem("cv_lite")||/[?&]lite=1/.test(location.search)||((navigator.hardwareConcurrency||8)<=3&&(navigator.deviceMemory||8)<=2)){root.classList.add("lite");return}
 addEventListener("scroll",()=>{let n=0,bad=0,last=0,t0=0;
  const f=t=>{if(!t0)t0=t;if(last){const d=t-last;if(d<200){n++;if(d>45)bad++}}last=t;
   if(t-t0<2500)requestAnimationFrame(f);else if(n>40&&bad/n>.6){root.classList.add("lite");sessionStorage.setItem("cv_lite","1")}};
  requestAnimationFrame(f)},{once:true,passive:true})})();

/* 2+3. (removed v54) circular reveal on detail open and rows rising on scroll — they looked broken, so details and rows now simply appear */
let tgt=0,cur=0,raf=0;
new MutationObserver(()=>{if(!md.hidden)tgt=cur=0}).observe(md,{attributes:true,attributeFilter:["hidden"]}); // parallax starts fresh each time

/* 4. Detail backdrop parallax — own layer, moved with transform only (GPU), eased every frame */
if(!RM&&mc){
 new MutationObserver(()=>{const t=mc.querySelector(".tr");if(!t||t.querySelector(".trb")||!t.style.backgroundImage)return;
  const b=document.createElement("div");b.className="trb";b.style.backgroundImage=t.style.backgroundImage;t.prepend(b);t.style.backgroundImage="none"}).observe(mc,{childList:true});
 const tick=()=>{raf=0;cur+=(tgt-cur)*.14;const t=mc.querySelector(".tr");
  if(t){t.style.setProperty("--ty",(cur*.38).toFixed(2)+"px");t.style.setProperty("--fo",Math.max(0,1-cur/420).toFixed(3))}
  if(Math.abs(tgt-cur)>.2)raf=requestAnimationFrame(tick)};
 md.addEventListener("scroll",()=>{if(lite())return;tgt=Math.min(md.scrollTop,600);if(!raf)raf=requestAnimationFrame(tick)},{passive:true});
}

/* 5. Installable app + fast repeat visits (service worker: images cached, app files network-first) */
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))
 addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
})();
