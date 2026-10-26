/* PARDA FX — circular reveal, scroll-reveal rows, detail backdrop parallax, perf governor, PWA.
   Add-on only: does not touch app.js logic. */
(()=>{"use strict";
const $=s=>document.querySelector(s),root=document.documentElement,md=$("#modal"),mc=$("#mc"),rows=$("#rows");
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
const lite=()=>root.classList.contains("lite");

/* 1. Performance governor — watches frame time during the first scroll; weak phones get the light mode (no heavy motion) */
(()=>{if(sessionStorage.getItem("cv_lite")||/[?&]lite=1/.test(location.search)||((navigator.deviceMemory||8)<=2||((navigator.hardwareConcurrency||8)<=4&&(navigator.deviceMemory||8)<=4))){root.classList.add("lite");return}
 addEventListener("scroll",()=>{let n=0,bad=0,last=0,t0=0;
  const f=t=>{if(!t0)t0=t;if(last){const d=t-last;if(d<200){n++;if(d>28)bad++}}last=t;
   if(t-t0<2500)requestAnimationFrame(f);else if(n>40&&bad/n>.35){root.classList.add("lite");sessionStorage.setItem("cv_lite","1")}};
  requestAnimationFrame(f)},{once:true,passive:true})})();

/* 2. Circular reveal: the detail opens from the exact spot you tapped */
let ox=innerWidth/2,oy=innerHeight/2;
addEventListener("pointerdown",e=>{ox=e.clientX;oy=e.clientY},{capture:true,passive:true});
let tgt=0,cur=0,raf=0;
new MutationObserver(()=>{if(md.hidden)return;tgt=cur=0;
 if(RM||lite()||!md.animate)return;
 const W=innerWidth,H=innerHeight,R=Math.hypot(Math.max(ox,W-ox),Math.max(oy,H-oy));
 md.animate([{clipPath:`circle(0px at ${ox}px ${oy}px)`},{clipPath:`circle(${R}px at ${ox}px ${oy}px)`}],{duration:720,easing:"cubic-bezier(.65,0,.2,1)"});
 mc.animate([{opacity:0,transform:"translate3d(0,28px,0)"},{opacity:1,transform:"none"}],{duration:650,delay:200,easing:"cubic-bezier(.22,1,.36,1)",fill:"backwards"})
}).observe(md,{attributes:true,attributeFilter:["hidden"]});

/* 3. Rows rise into view as you scroll */
if(!RM){
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.08,rootMargin:"0px 0px -6% 0px"});
 const add=n=>{if(n.nodeType===1&&n.classList.contains("row")&&!n.classList.contains("rv")){n.classList.add("rv");io.observe(n)}};
 if(rows){rows.childNodes.forEach(add);new MutationObserver(l=>l.forEach(r=>r.addedNodes.forEach(add))).observe(rows,{childList:true})}
}

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
