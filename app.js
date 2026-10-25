const DIRECT="https://api.themoviedb.org/3",DIMG="https://image.tmdb.org/t/p/";
// On hosted sites, go through our own domain (vercel.json rewrites) so ISP blocks on TMDB domains don't matter
const PX=location.protocol.startsWith("http")&&!/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname),IMG=PX?"/timg/":DIMG;
addEventListener("error",e=>{const t=e.target;if(t&&t.tagName==="IMG"&&t.src.includes("/timg/")&&!t.dataset.f){t.dataset.f=1;t.src=t.src.replace(location.origin+"/timg/",DIMG)}},true);
function showErr(m){const d=document.createElement("div");d.className="err";d.textContent="Error: "+m;document.body.append(d);setTimeout(()=>d.remove(),9000)}
addEventListener("error",e=>e.message&&showErr(e.message));addEventListener("unhandledrejection",e=>showErr(e.reason&&e.reason.message||e.reason));
async function get(base,p,q){let u;if(base==="/api/tmdb"){u=new URL(base,location.origin);u.searchParams.set("path",p)}else{u=new URL(base+p,location.origin);u.searchParams.set("api_key",KEY())}for(const k in q)u.searchParams.set(k,q[k]);
 const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);try{const r=await fetch(u,{signal:c.signal});if(!r.ok)throw Error(r.status);return await r.json()}finally{clearTimeout(t)}}
const $=s=>document.querySelector(s),root=document.documentElement,M=innerWidth<700,P=M?"w185":"w342";
const STATUS=["Watching","Completed","On-Hold","Dropped","Plan to Watch"];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// ---- Storage: swap for Firebase later (ROADMAP Part 4) ----
const store={get:()=>JSON.parse(localStorage.getItem("cv_list")||"{}"),set:v=>{localStorage.setItem("cv_list",JSON.stringify(v));window.CVA&&CVA.push(v)}};
// ---- API with memory + 30 min localStorage cache (fast repeat loads) ----
const KEY=()=>localStorage.getItem("cv_key")||(TMDB_KEY.startsWith("PASTE")?"":TMDB_KEY),mem=new Map(),TTL=108e5;
async function api(p,q={},nc){if(!PX&&!KEY())throw Error("key");const ck="c:"+p+JSON.stringify(q);
 if(mem.has(ck))return mem.get(ck);
 try{const c=JSON.parse(localStorage.getItem(ck)||"null");if(c&&Date.now()-c.t<TTL){mem.set(ck,c.j);return c.j}}catch{}
 let j,er;for(let a=0;a<3;a++){er=null;try{j=await get(PX?"/api/tmdb":DIRECT,p,a?{...q,_r:Date.now()}:q);break}catch(e){er=e;if(PX&&KEY()&&e.message!=="401"&&e.message!=="404"){try{j=await get(DIRECT,p,q);er=null;break}catch(e2){er=e2}}
  if(/^(401|404|key)$/.test(er.message))break;await new Promise(r=>setTimeout(r,700*(a+1)))}}if(er)throw er;
 mem.set(ck,j);
 if(!nc)try{localStorage.setItem(ck,JSON.stringify({t:Date.now(),j}))}catch{Object.keys(localStorage).filter(x=>x.startsWith("c:")).forEach(x=>localStorage.removeItem(x))}return j}
const title=i=>i.title||i.name,kind=i=>i.media_type||(i.title?"movie":"tv");
const STAR='<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3-5.6-3.1-5.6 3.1 1.2-6.3L3 9.6l6.3-.8z"/></svg>';
function card(i,t){t=t||kind(i);const e=document.createElement("div");e.className="card";
 const bd=i.soon?`<b class="soon">${new Date(i.release_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</b>`:i.vote_average?`<b>${STAR}${i.vote_average.toFixed(1)}</b>`:"";
 e.innerHTML=`<img decoding="async" loading="lazy" alt="" src="${i.poster_path?IMG+P+i.poster_path:""}">${bd}<span>${esc(title(i))}</span>`;e.onclick=()=>openDetail(t,i.id);return e}
function dominant(path){return new Promise(res=>{const im=new Image();im.crossOrigin="anonymous";
 im.onload=()=>{const c=document.createElement("canvas");c.width=c.height=24;const x=c.getContext("2d");x.drawImage(im,0,0,24,24);
  const d=x.getImageData(0,0,24,24).data;let best=[224,160,48],bs=-1;
  for(let i=0;i<d.length;i+=4){const[r,g,b]=[d[i],d[i+1],d[i+2]],mx=Math.max(r,g,b),mn=Math.min(r,g,b),s=(mx-mn)*(mx>60?1:.2);if(s>bs){bs=s;best=[r,g,b]}}
  res(`rgb(${best.map(v=>Math.min(255,v+25))})`)};im.onerror=()=>res("#e0a030");im.src=IMG+"w92"+path})}
// ---- Taste: on-device personalisation (nothing leaves the phone) ----
const TK="cv_taste",taste=()=>{try{return{l:{},g:{},t:{},v:[],s:[],...JSON.parse(localStorage.getItem(TK)||"{}")}}catch{return{l:{},g:{},t:{},v:[],s:[]}}};
const topOf=o=>Object.entries(o).sort((a,b)=>b[1]-a[1])[0],putT=x=>{try{localStorage.setItem(TK,JSON.stringify(x))}catch{}};
function learn(m,w){const x=taste();if(m.lang)x.l[m.lang]=(x.l[m.lang]||0)+w;(m.genres||[]).forEach(g=>x.g[g]=(x.g[g]||0)+w);if(m.type)x.t[m.type]=(x.t[m.type]||0)+w;
 if(w>=1&&m.id)x.v=[{id:m.id,type:m.type,title:m.title},...x.v.filter(y=>y.id!==m.id)].slice(0,5);putT(x)}
function saveQ(q){const x=taste();x.s=[q,...x.s.filter(y=>y!==q)].slice(0,10);putT(x)}
// ---- Hero: curated cinematic picks (crossfade, ken-burns, tagline, per-film colour) ----
let hero=[],hi=0,ht,tx=0,ty=0,py=0,hl=0,hq=0;
// 16x9 colour fingerprint of the reference still (man + spinner in the orange wasteland); used to pick that exact backdrop from TMDB
const BRFP=[230,191,144,234,202,163,236,206,170,239,209,176,241,210,176,244,215,183,245,216,184,246,216,182,246,214,176,245,213,173,243,209,162,242,208,162,240,207,162,239,205,161,236,200,150,234,191,137,227,176,121,230,185,133,232,193,144,233,194,147,232,188,134,238,205,161,239,206,161,239,203,151,235,191,128,236,193,131,233,186,121,237,197,139,236,196,139,233,187,128,227,170,105,228,171,109,148,84,37,182,111,52,216,141,67,215,136,54,220,143,61,226,159,82,228,163,87,229,162,83,224,149,61,225,153,69,221,143,52,226,154,69,227,154,70,215,129,36,210,118,23,214,131,47,155,78,12,159,75,7,193,98,9,195,97,5,194,101,9,198,100,7,202,102,7,201,104,10,198,97,5,189,96,8,181,90,8,182,90,7,171,80,6,170,79,5,157,72,6,152,67,5,143,64,8,139,63,8,111,49,10,94,45,13,90,40,10,111,49,9,143,64,7,132,62,17,139,61,12,118,52,13,128,54,9,134,59,12,134,57,9,133,54,5,123,50,7,128,53,7,108,43,7,103,43,8,99,42,9,111,47,8,110,47,7,123,54,11,144,69,16,119,65,24,133,67,17,119,63,23,158,99,61,148,93,59,134,85,55,160,98,58,123,58,18,117,52,12,110,48,11,115,50,10,123,54,9,126,57,12,133,62,13,135,63,14,131,60,14,122,57,14,123,56,11,87,44,18,73,44,26,31,19,13,34,21,14,27,16,12,73,35,13,122,57,17,126,58,12,130,60,13,127,58,14,116,52,12,113,47,8,110,45,7,106,43,7,107,45,9,103,43,8,70,31,10,32,19,12,30,19,13,58,35,23,44,22,11,90,37,9,93,38,9,130,60,13,123,56,13,112,48,10,105,44,9,105,44,9,106,44,8,101,42,8,101,42,7,103,44,8,92,38,8,76,33,8,63,28,8,60,29,11,70,31,9,82,34,9,90,37,9];
const HERO=[["Blade Runner 2049",2017,{ref:BRFP,fx:"56%"}],["Dune",2021],["Stalker",1979],["2001: A Space Odyssey",1968],["Fallen Angels",1995]];
const upd=()=>$("#hbgs").style.transform=`translate3d(${tx}px,${py+ty}px,0)`,day=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
const hm=m=>m?`${Math.floor(m/60)}h ${m%60}m`:"",hbd=i=>i.bd||i.backdrop_path,hsrc=i=>M&&i.pt&&!i.pref?IMG+"w780"+i.pt:IMG+(M&&i.bw&&i.bw<=2560?"original":"w1280")+hbd(i);
function fpOf(im){const c=document.createElement("canvas");c.width=16;c.height=9;const x=c.getContext("2d");x.drawImage(im,0,0,16,9);return x.getImageData(0,0,16,9).data}
function bestMatch(list,fp){return Promise.all(list.map(b=>new Promise(res=>{const im=new Image();im.crossOrigin="anonymous";
  im.onload=()=>{try{const d=fpOf(im);let e=0,j=0;for(let k=0;k<d.length;k++){if(k%4===3)continue;e+=(d[k]-fp[j++])**2}res([e,b])}catch{res([Infinity,b])}};im.onerror=()=>res([Infinity,b]);im.src=IMG+"w300"+b.file_path}))).then(r=>{r.sort((a,b)=>a[0]-b[0]);return r[0]&&r[0][0]<Infinity?r[0][1]:null})}
async function heroPicks(){const r=await Promise.all(HERO.map(async([q,y,o])=>{try{o=o||{};
  let id=localStorage.getItem("hid:"+q+y);
  if(!id){const s=await api("/search/movie",{query:q,year:y}),m=s.results.find(x=>x.backdrop_path&&x.poster_path);if(!m)return null;id=m.id;try{localStorage.setItem("hid:"+q+y,id)}catch{}}
  const d=await api("/movie/"+id,{append_to_response:"images",include_image_language:"en,null"});if(!d.poster_path||!d.backdrop_path)return null;
  const bs=((d.images||{}).backdrops||[]).filter(b=>!b.iso_639_1&&b.width>=1920).sort((p,q)=>q.vote_average-p.vote_average);
  let pk=bs[0]||{file_path:d.backdrop_path,width:0};
  if(o.ref){let c=null;try{c=JSON.parse(localStorage.getItem("hbd:"+d.id)||"null")}catch{}
   if(!c){const tf=((d.images||{}).backdrops||[]).filter(b=>!b.iso_639_1).sort((p,q)=>q.vote_average-p.vote_average).slice(0,16);c=tf.length?await bestMatch(tf,o.ref):null;if(c)try{localStorage.setItem("hbd:"+d.id,JSON.stringify({file_path:c.file_path,width:c.width}))}catch{}}
   if(c)pk=c}
  const ps=((d.images||{}).posters||[]).filter(p=>!p.iso_639_1&&p.height>=1200).sort((p,q)=>q.vote_average-p.vote_average);
  lgc["movie"+d.id]=pick((d.images||{}).logos);return{...d,media_type:"movie",bd:pk.file_path,bw:pk.width,fx:o.fx,pref:o.ref?1:0,pt:ps[0]?ps[0].file_path:""}}catch{return null}}));return r.filter(Boolean)}
async function heroFallback(){const tl=topOf(taste().l),mine=tl&&tl[0]!=="en"&&tl[1]>=3?tl[0]:"";
 const win=n=>({sort_by:"popularity.desc","primary_release_date.gte":day(n),"primary_release_date.lte":day(0),"vote_count.gte":40,"vote_average.gte":6});
 const[a,b]=await Promise.all([api("/discover/movie",win(60)),mine?api("/discover/movie",{...win(150),with_original_language:mine}):{results:[]}]);
 const ok=i=>i.backdrop_path&&i.poster_path,sh=r=>r.filter(ok).slice(0,10).sort(()=>Math.random()-.5);
 let h=[...sh(b.results).slice(0,2),...sh(a.results)].filter((x,i,r)=>r.findIndex(y=>y.id===x.id)===i).slice(0,6);
 if(h.length>=3)h.forEach(i=>{i.media_type="movie";i.cin=1});else h=(await api("/trending/all/week")).results.filter(ok).slice(0,6);return h}
// ---- Hero v2: a fresh mix every visit (prestige TV, new releases, world cinema, a surprise genre) + up to 2 slots shaped by what you opened / searched ----
const shuf=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(x=>x[1]),rnd=n=>1+Math.floor(Math.random()*n),NOHERO=[10763,10767,10764,10766];
async function heroDiscover(){const x=taste(),tl=topOf(x.l),tg=topOf(x.g),tt=topOf(x.t),NG=NOHERO.join(",");
 const T=(p,q,tag,ty)=>api(p,q).then(r=>r.results.map(i=>({...i,media_type:i.media_type||ty,_tag:tag}))).catch(()=>[]);
 const regs=shuf(["ko","ja","hi","ta","te","ml","es","fr","de","tr","it","pt","zh"]).slice(0,2),gen=shuf([10765,80,9648,18,878,10768,10759])[0];
 const disc=[T("/trending/all/week",{page:rnd(2)},"trend"),
  T("/discover/tv",{sort_by:"popularity.desc","vote_average.gte":7.8,"vote_count.gte":700,without_genres:NG+",16",page:rnd(3)},"prestige","tv"),
  T("/discover/tv",{sort_by:"popularity.desc","first_air_date.gte":day(420),"vote_average.gte":7,"vote_count.gte":120,without_genres:NG,page:rnd(2)},"newtv","tv"),
  T("/discover/movie",{sort_by:"popularity.desc","primary_release_date.gte":day(300),"primary_release_date.lte":day(0),"vote_average.gte":6.8,"vote_count.gte":150,page:rnd(2)},"newmov","movie"),
  T("/discover/tv",{with_genres:gen,sort_by:"popularity.desc","vote_average.gte":7.5,"vote_count.gte":300,without_genres:NG,page:rnd(2)},"genre","tv"),
  ...regs.flatMap(l=>[T("/discover/movie",{with_original_language:l,sort_by:"popularity.desc","vote_average.gte":6.8,"vote_count.gte":80,"primary_release_date.gte":day(900),page:1},"world","movie"),
   T("/discover/tv",{with_original_language:l,sort_by:"popularity.desc","vote_average.gte":7,"vote_count.gte":40,without_genres:NG,page:1},"world","tv")])];
 const mine=[];if(tl&&tl[1]>=3){const ty=tt?tt[0]:"movie";mine.push(T("/discover/"+ty,{with_original_language:tl[0],...(tg&&tg[1]>=3?{with_genres:tg[0]}:{}),sort_by:"popularity.desc","vote_average.gte":6.8,"vote_count.gte":60,page:rnd(2)},"me",ty))}
 if(x.v[0])mine.push(T(`/${x.v[0].type}/${x.v[0].id}/recommendations`,{},"me",x.v[0].type));
 const [D,M2]=await Promise.all([Promise.all(disc),Promise.all(mine)]);
 const seen=new Set(),ok=i=>i.backdrop_path&&i.poster_path&&i.overview&&(i.vote_average||0)>=6.5&&!(i.genre_ids||[]).some(g=>NOHERO.includes(g))&&i.media_type!=="person"&&!seen.has(i.media_type+i.id)&&seen.add(i.media_type+i.id);
 const me=shuf(M2.flat().filter(ok)).slice(0,2),pool=shuf(D.flat().filter(ok)),cnt={},ty={},out=[...me];
 for(const i of pool){if(out.length>=7)break;if((cnt[i._tag]||0)>=2||(ty[i.media_type]||0)>=4)continue;cnt[i._tag]=(cnt[i._tag]||0)+1;ty[i.media_type]=(ty[i.media_type]||0)+1;out.push(i)}
 const full=await Promise.all(out.map(async i=>{try{const t=i.media_type==="tv"?"tv":"movie",d=await api(`/${t}/${i.id}`,{append_to_response:"images",include_image_language:"en,null"});if(!d.backdrop_path||!d.poster_path)return null;
  const bs=((d.images||{}).backdrops||[]).filter(b=>!b.iso_639_1&&b.width>=1920).sort((p,q)=>q.vote_average-p.vote_average),ps=((d.images||{}).posters||[]).filter(p=>!p.iso_639_1&&p.height>=1200).sort((p,q)=>q.vote_average-p.vote_average);
  lgc[t+d.id]=pick((d.images||{}).logos);return{...d,media_type:t,bd:(bs[0]||{}).file_path||d.backdrop_path,bw:(bs[0]||{}).width||0,pt:ps[0]?ps[0].file_path:"",runtime:d.runtime||(d.episode_run_time||[])[0]||0,_tag:i._tag}}catch{return null}}));
 const r=full.filter(Boolean),m=r.filter(i=>i._tag==="me"),o=r.filter(i=>i._tag!=="me");return[...m.slice(0,2),...o].slice(0,6)}
async function heroItems(){try{const h=await heroDiscover();if(h.length>=3)return h}catch{}const c=await heroPicks();return c.length>=3?c:heroFallback()}
function setHero(n){hi=n;const i=hero[n],id=++hq,src=hsrc(i),im=new Image();
 const show=()=>{if(id!==hq)return;const A=[$("#hbgA"),$("#hbgB")],cu=A[hl],nw=A[1-hl];hl=1-hl;
  nw.className="hbg";void nw.offsetWidth;nw.style.backgroundImage=`url(${src})`;nw.style.backgroundPosition=(i.fx||"50%")+" 50%";
  if(M&&i.pref){const hi2=new Image();hi2.onload=()=>{if(id===hq)nw.style.backgroundImage=`url(${hi2.src})`};hi2.src=IMG+"original"+hbd(i)}nw.classList.add("on");cu.classList.remove("on");cu.classList.add("out");
  const c=$(".hcont");c.classList.remove("go");void c.offsetWidth;c.classList.add("go");
  const g=(i.genres||[]).slice(0,M?1:2).map(x=>x.name).join(", "),y=(i.release_date||i.first_air_date||"").slice(0,4);
  $("#hmeta").innerHTML=[`<b>${STAR}${(i.vote_average||0).toFixed(1)}</b>`,y,hm(i.runtime),esc(g)].filter(Boolean).join('<i class="dot"></i>');
  const l=lgc[kind(i)+i.id];$("#htitle").innerHTML=l?`<img class="htl" alt="${esc(title(i))}" src="${l}">`:esc(title(i));
  $("#htag").textContent=i.tagline||"";$("#hov").textContent=i.overview||"";
  const go=pl=>openDetail(kind(i),i.id).then(()=>{if(pl){const b=$("#pl");b&&b.click()}});$("#hopen").onclick=()=>go(1);$("#hmore").onclick=()=>go(0);
  document.querySelectorAll(".hdots i").forEach((d,k)=>d.classList.toggle("on",k===n));
  $("#cn").textContent=String(n+1).padStart(2,"0");$("#ct").textContent="/"+String(hero.length).padStart(2,"0");
  const nx=hero[(n+1)%hero.length];$("#ni").src=IMG+"w300"+hbd(nx);$("#nt").textContent=title(nx);
  dominant(i.poster_path).then(c=>{if(id===hq)root.style.setProperty("--accent",c)});
  [1,-1].forEach(d=>{new Image().src=hsrc(hero[(n+d+hero.length)%hero.length])})};
 im.onload=im.onerror=show;im.src=src}
const auto=()=>{clearInterval(ht);ht=setInterval(()=>{if(!document.hidden&&!$("#hx").hidden&&$("#modal").hidden)setHero((hi+1)%hero.length)},8000)};
function startHero(){$("#dots").innerHTML=hero.map((_,k)=>`<i data-k="${k}"></i>`).join("");
 document.querySelectorAll(".hdots i").forEach(d=>d.onclick=()=>step(+d.dataset.k-hi));
 setHero(0);auto();
 let x0=0;const H=$("#hx");H.addEventListener("touchstart",e=>x0=e.touches[0].clientX,{passive:true});
 H.addEventListener("touchend",e=>{const d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50)step(d<0?1:-1)},{passive:true});
 addEventListener("keydown",e=>{if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft")return;if(!$("#modal").hidden||$("#hx").hidden||/INPUT|SELECT|TEXTAREA/.test((document.activeElement||{}).tagName))return;step(e.key==="ArrowRight"?1:-1)})}
const step=d=>{setHero((hi+d+hero.length)%hero.length);auto()};
$("#hu").onclick=()=>step(-1);$("#hd").onclick=()=>step(1);$("#nxt").onclick=()=>step(1);
if(!M)$("#hx").addEventListener("mousemove",e=>{tx=(e.clientX/innerWidth-.5)*-30;ty=(e.clientY/innerHeight-.5)*-20;upd()});
let tick;addEventListener("scroll",()=>{if(tick)return;tick=requestAnimationFrame(()=>{tick=0;$("#top").classList.toggle("s",scrollY>30);if(scrollY<innerHeight){py=Math.min(scrollY*.2,60);upd()}})},{passive:true});
// ---- Rows: lazy-loaded in parallel as you scroll ----
let RW=[];
const L=(l,x={})=>({with_original_language:l,sort_by:"popularity.desc","vote_count.gte":30,...x}),G=g=>({with_genres:g,sort_by:"popularity.desc","vote_count.gte":150});
const NET=n=>({with_networks:n,sort_by:"popularity.desc","vote_count.gte":50}),ANI={with_original_language:"ja",with_genres:16};
// Childhood nostalgia: exactly these shows (classic versions), resolved to TMDB by title+year. [search text, type, first-air year]
const CHILD=[["Doraemon","tv",1979],["Crayon Shin-chan","tv",1992],["Ninja Hattori-kun","tv",1981],["Pokémon","tv",1997],["Oggy and the Cockroaches","tv",1998],["Ben 10","tv",2005],
["Ultimate Spider-Man","tv",2012],["Avengers: Secret Wars","tv",2014],["Guardians of the Galaxy","tv",2015],["Hulk and the Agents of S.M.A.S.H.","tv",2013],["Courage the Cowardly Dog","tv",1999],
["Kid vs. Kat","tv",2008],["Tom and Jerry","tv",1975],["Horrid Henry","tv",2006],["Takeshi's Castle India","tv",0,"Takeshi's Castle"],["Mr. Bean","tv",1990],["Mr. Bean: The Animated Series","tv",2002]];
// Fixed order, as requested. [title, TMDB path, type, query, lang (for taste), mix upcoming, fixed title list]
const BASE=[["Trending","/trending/all/day","",null,null],
["In cinemas now","/movie/now_playing","movie",{region:"IN"}],["Coming soon","/movie/upcoming","movie",{region:"IN"}],
["Popular films","/movie/popular","movie"],["Popular TV shows","/tv/popular","tv"],
["Netflix","/discover/tv","tv",NET(213)],["Amazon","/discover/tv","tv",NET(1024)],["HBO","/discover/tv","tv",NET(49)],["Disney+","/discover/tv","tv",NET(2739)],
["Anime movies","/discover/movie","movie",L("ja",{with_genres:16})],["Childhood","","","",null,0,CHILD],
["Airing today: anime","/discover/tv","tv",{...ANI,"air_date.gte":day(0),"air_date.lte":day(0),sort_by:"popularity.desc"}],["Airing today: TV shows","/tv/airing_today","tv"],
["Top rated TV shows","/tv/top_rated","tv"],["Top rated movies","/movie/top_rated","movie"],
["Sci-Fi","/discover/movie","movie",G(878)],["Horror","/discover/movie","movie",G(27)],["Action","/discover/movie","movie",G(28)],
["Bollywood","/discover/movie","movie",L("hi"),"hi"],["Telugu","/discover/movie","movie",L("te"),"te"],["Malayalam","/discover/movie","movie",L("ml"),"ml"],["Documentary","/discover/movie","movie",G(99)]];
// "Picked for you" sits right after Trending, "Like <last title>" stays as before
function buildRows(){const x=taste(),[first,...rest]=BASE,my=[],v=x.v[0],tl=topOf(x.l),tg=topOf(x.g),tt=topOf(x.t);
 if(tl&&tl[1]>=3){const ty=tt?tt[0]:"movie";my.push(["Picked for you","/discover/"+ty,ty,L(tl[0],tg&&tg[1]>=3?{with_genres:tg[0]}:{})])}
 if(v)my.push([`Like ${v.title.length>16?v.title.slice(0,15)+"…":v.title}`,`/${v.type}/${v.id}/recommendations`,v.type]);
 return[first,...my,...rest]}
// Resolve a fixed title list to cards (cached by api()); skips anything TMDB can't find
async function named(list){const ck="n:"+list.map(x=>x[0]).join("|");
 try{const c=JSON.parse(localStorage.getItem(ck)||"null");if(c&&Date.now()-c.t<6048e5)return c.j}catch{}
 const one=async([q,t,y,alt])=>{const tr=async(qq,yy)=>{const d=await api("/search/"+t,{query:qq,...(yy?{first_air_date_year:yy}:{})});return d.results.find(z=>z.poster_path)};
  try{const i=(y&&await tr(q,y))||await tr(q)||(alt&&await tr(alt));return i?{id:i.id,name:i.name||i.title,title:i.title||i.name,poster_path:i.poster_path,vote_average:i.vote_average,media_type:t}:null}catch{return null}};
 const j=(await Promise.all(list.map(one))).filter(Boolean);if(j.length>=list.length-2)try{localStorage.setItem(ck,JSON.stringify({t:Date.now(),j}))}catch{}return j}
function inf(st,load,ty,box,vert,p0){let p=p0==null?1:p0,busy=0,end=0;const sc=box||st,more=async()=>{if(busy||end)return;busy=1;
 try{const d=await load(++p);if(!d.results.length||p>=Math.min(d.total_pages||1,25))end=1;d.results.filter(i=>i.poster_path&&i.media_type!=="person").forEach(i=>st.append(card(i,ty)))}catch{p--}busy=0};
 sc.addEventListener("scroll",()=>{if(vert?sc.scrollTop+sc.clientHeight>sc.scrollHeight-700:sc.scrollLeft+sc.clientWidth>sc.scrollWidth-700)more()},{passive:true});return more}
async function loadRow(sec){if(sec._l||sec.dataset.i==null)return;sec._l=1;io.unobserve(sec);const[,p,ty,q,,mix,nm]=RW[sec.dataset.i],st=sec.querySelector(".strip");
 try{if(nm){const it=await named(nm);if(!it.length)return sec.remove();st.innerHTML="";it.forEach(i=>st.append(card(i,"")));return}
  const[d,u]=await Promise.all([api(p,q||{}),mix?api("/movie/upcoming"):0]);let it=d.results.filter(i=>i.poster_path);if(!it.length&&!u)return sec.remove();
  if(p==="/movie/upcoming"){it=it.filter(i=>i.release_date>day(0)).sort((a,b)=>a.release_date<b.release_date?-1:1).map(i=>({...i,soon:1,media_type:"movie"}));if(!it.length)return sec.remove();st.innerHTML="";it.forEach(i=>st.append(card(i,"")));return}
  if(u){const s=u.results.filter(i=>i.poster_path&&i.release_date>day(0)).slice(0,5).map(i=>({...i,soon:1,media_type:"movie"}));it=it.flatMap((x,k)=>k%4===3&&s.length?[x,s.shift()]:[x])}
  st.innerHTML="";it.forEach(i=>st.append(card(i,ty)));inf(st,n=>api(p,{...(q||{}),page:n}),ty)}catch{sec._l=0;io.observe(sec);sec._f=(sec._f||0)+1;if(sec._f<3)setTimeout(()=>loadRow(sec),2000*sec._f);else{st.innerHTML='<button class="all rr">Could not load — tap to retry</button>';st.querySelector("button").onclick=()=>{sec._f=0;st.innerHTML="";loadRow(sec)}}}}
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&loadRow(e.target)),{rootMargin:"1500px 0px"});
function setup(e){$("#hx").hidden=true;$("#rows").innerHTML=e.message==="key"||e.message==="401"?`<section class="setup"><h2>Connect TMDB</h2><p>themoviedb.org → Settings → API → "API Key (v3 auth)" paste karo.</p><input id="kin" placeholder="TMDB v3 API key"><button class="btn" id="ksv">Save &amp; load</button></section>`:`<section class="setup"><h2>Can't reach TMDB</h2><p>${esc(e.message)} — network ya ISP block ho sakta hai. Private DNS (dns.google) ya VPN try karo.</p><button class="btn" id="rt">Retry</button></section>`;
 if($("#rt"))$("#rt").onclick=()=>location.reload();
 if($("#ksv"))$("#ksv").onclick=()=>{localStorage.setItem("cv_key",$("#kin").value.trim());location.reload()}}
function heroLogo(i){logoOf(i).then(l=>{if(l&&hero[hi]===i)$("#htitle").innerHTML=`<img class="htl" alt="${esc(title(i))}" src="${l}">`})}
async function home(){heroItems().then(h=>{hero=h;startHero();h.forEach(i=>{if(!((kind(i)+i.id) in lgc))heroLogo(i)})}).catch(setup);
 RW=buildRows();RW.forEach((r,i)=>{const s=document.createElement("section");s.className="row";s.dataset.i=i;
  s.innerHTML=`<div class="rh"><h2>${r[0]==="In cinemas now"?'<i class="live"></i>':""}${esc(r[0])}</h2><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div><div class="strip">${'<div class="card sk"></div>'.repeat(6)}</div><button class="ar l" aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button><button class="ar r" aria-label="Next"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>`;
  s.querySelector(".rh").onclick=async()=>{if(r[6]){B={path:"",type:"",q:{},f:0,page:1,busy:0,end:1};$("#btitle").textContent=r[0];$("#bar").hidden=true;$("#bgrid").innerHTML="";(await named(r[6])).forEach(i=>$("#bgrid").append(card(i,"")));view("browse");return}reset(r[0],r[1],r[2]||"",r[3]||{},false);view("browse")};s.querySelectorAll(".ar").forEach(b=>b.onclick=()=>{const st=s.querySelector(".strip");st.scrollBy({left:(b.classList.contains("r")?1:-1)*st.clientWidth*.8,behavior:"smooth"})});$("#rows").append(s);io.observe(s)});(()=>{const fr=frRow(),r1=$("#rows").children[1];r1?r1.after(fr):$("#rows").append(fr)})();

 if(!(navigator.connection&&navigator.connection.saveData))document.querySelectorAll("#rows .row").forEach((r,k)=>setTimeout(()=>loadRow(r),1200+k*300))}
// ---- Browse: infinite scroll grid (filters, See all, search all use this) ----
let B={path:"",f:0,page:0,busy:0,end:0,q:{},type:""};
function reset(t,path,type,q,f,p0,mix){B={path,type,q,f,page:(p0||1)-1,p0:p0||1,mix:!!mix,busy:0,end:0};$("#btitle").textContent=t;$("#bgrid").innerHTML="";$("#bar").hidden=!f;loadMore()}
async function loadMore(){if(B.busy||B.end||B.err||B.wait)return;B.busy=1;const b=B;
 try{const d=await api(b.path,{...b.q,page:b.page+1});if(b!==B)return;if(!d.results.length&&b.p0>1&&b.page===b.p0-1){b.page=0;b.p0=1;b.busy=0;return loadMore()}b.page++;if(b.mix)d.results=shuf(d.results);b.fails=0;if(b.path==="/search/multi"&&b.page===1)d.results.slice(0,3).forEach(i=>learn({lang:i.original_language,genres:i.genre_ids,type:kind(i)},.5));
  d.results.filter(i=>i.poster_path&&i.media_type!=="person").forEach(i=>$("#bgrid").append(card(i,b.type)));if(b.page>=Math.min(d.total_pages,30))b.end=1}catch{if(b===B){b.fails=(b.fails||0)+1;if(b.fails<3){b.wait=1;setTimeout(()=>{b.wait=0;if(b===B)loadMore()},1500*b.fails)}else{b.err=1;const f=document.createElement("div");f.className="fail bf";f.innerHTML='<p class="empty">Could not load. Check your connection.</p><button class="btn">Try again</button>';f.querySelector("button").onclick=()=>{f.remove();b.err=0;b.fails=0;loadMore()};$("#bgrid").append(f)}}}
 b.busy=0;if(b===B&&!b.end&&!$("#browse").hidden&&$("#sent").getBoundingClientRect().top<innerHeight+900)loadMore()}
new IntersectionObserver(e=>e[0].isIntersecting&&loadMore(),{rootMargin:"900px"}).observe($("#sent"));
async function fillGenres(t){$("#gsel").innerHTML='<option value="">All genres</option>';try{const g=await api(`/genre/${t}/list`);$("#gsel").innerHTML='<option value="">All genres</option>'+g.genres.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}catch{}}
function filt(){const sg=$("#seg .on").dataset.t,an=sg==="anime",t=an?$("#asel").value:sg,s=$("#ssel").value,n=new Date().toISOString().slice(0,10);$("#asel").hidden=$("#lsel").hidden=!an;
 const q={sort_by:{mix:"popularity.desc",pop:"popularity.desc",top:"vote_average.desc",new:t==="tv"?"first_air_date.desc":"primary_release_date.desc",rev:t==="tv"?"popularity.desc":"revenue.desc"}[s],"vote_count.gte":s==="top"?300:s==="new"?20:s==="mix"?30:0};
 if(an){q.with_genres="16"+($("#gsel").value?","+$("#gsel").value:"");if($("#lsel").value)q.with_original_language=$("#lsel").value}else if($("#gsel").value)q.with_genres=$("#gsel").value;if(s==="new")q[t==="tv"?"first_air_date.lte":"primary_release_date.lte"]=n;
 if(window.CVF)CVF.extra(t,q,an);
 reset(an?"Anime & Cartoons":t==="tv"?"Series":"Films","/discover/"+t,t,q,1,s==="mix"?1+Math.floor(Math.random()*3):1,s==="mix")}
document.querySelectorAll("#seg button").forEach(b=>b.onclick=async()=>{document.querySelectorAll("#seg button").forEach(x=>x.classList.toggle("on",x===b));await fillGenres(b.dataset.t==="anime"?$("#asel").value:b.dataset.t);filt()});
$("#asel").onchange=async()=>{await fillGenres($("#asel").value);filt()};$("#lsel").onchange=filt;
$("#gsel").onchange=$("#ssel").onchange=filt;
// ---- Views / nav (Android back button aware) ----
let cur="home";
function view(v,np){["hx","rows"].forEach(i=>$("#"+i).hidden=v!=="home");$("#browse").hidden=v!=="browse";$("#list").hidden=v!=="list";
 document.querySelectorAll("[data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v===v));scrollTo(0,0);if(v==="list")renderList();
 if(!np&&v!=="home"&&cur!==v)history.pushState({v},"");cur=v}
async function go(v){$("#q").value="";if(v==="search"){view("home");$("#q").focus();return}
 if(v==="anime"){document.querySelectorAll("#seg button").forEach(x=>x.classList.toggle("on",x.dataset.t==="anime"));await fillGenres($("#asel").value);filt();view("browse");return}
 if(v==="movies"||v==="series"){const t=v==="movies"?"movie":"tv";document.querySelectorAll("#seg button").forEach(x=>x.classList.toggle("on",x.dataset.t===t));await fillGenres(t);filt();view("browse");return}
 if(v==="browse"&&!B.f){await fillGenres("movie");filt()}view(v)}
document.querySelectorAll("[data-v]").forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.v)});
let st;$("#q").oninput=e=>{clearTimeout(st);const q=e.target.value.trim();if(!q)return view("home");
 st=setTimeout(()=>{saveQ(q);reset(`Results for “${q}”`,"/search/multi","",{query:q},0);view("browse");frSearch(q)},350)};
addEventListener("popstate",()=>{if(SKIPPOP){SKIPPOP=0;return}if(!$("#trl").hidden){closeTr(1);return}if(window.CVA&&CVA.back())return;if(!$("#modal").hidden){if(navBack())history.pushState({m:1},"");else hideModal()}else view("home",1)});
// ---- Detail: tabs, data appears on tap ----
const money=n=>n?"$"+(n>=1e9?+(n/1e9).toFixed(2)+"B":n>=1e6?+(n/1e6).toFixed(1)+"M":n.toLocaleString("en-US")):"Not disclosed",fd=s=>s?new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"TBA";
const when=s=>{const n=Math.ceil((new Date(s)-new Date(day(0)))/864e5);return n<=0?"today":n===1?"tomorrow":`in ${n} days`};
const stat=(l,x)=>`<div class="stat"><small>${l}</small><strong>${x}</strong></div>`;let tok=0;
function cat(d,t){const g=(d.genres||[]).map(x=>x.id),an=d.original_language==="ja"&&g.includes(16);return t==="tv"?(an?"Anime":g.includes(16)?"Animation":"Series"):g.includes(99)?"Documentary":an?"Anime film":g.includes(16)?"Animation":"Film"}
const WJ=/^(Writer|Screenplay|Teleplay|Story|Novel|Comic Book|Characters|Author|Creator)$/,pn=a=>{const m={};return a.filter(x=>{const k=x&&(x.id||x);return k&&!m[k]&&(m[k]=1)})},pad=n=>String(n).padStart(2,"0");
const lk=(a,r)=>a.map(x=>`<span class="lk" data-p="${x.id}" data-r="${r}">${esc(x.name)}</span>`).join(", ");
function crewOf(d,t){let cr;if(t==="tv"&&d.aggregate_credits&&(d.aggregate_credits.crew||[]).length)cr=d.aggregate_credits.crew;else cr=((d.credits&&d.credits.crew)||[]).map(c=>({id:c.id,name:c.name,jobs:[{job:c.job,episode_count:1}]}));
 const sc=(c,re)=>Math.max(0,...(c.jobs||[]).filter(j=>re.test(j.job)).map(j=>j.episode_count||1)),by=re=>cr.filter(c=>sc(c,re)>0).sort((x,y)=>sc(y,re)-sc(x,re)).map(c=>({id:c.id,name:c.name}));
 const dir=pn(by(/^Director$/)).slice(0,4),wr=pn([...(t==="tv"?(d.created_by||[]).map(c=>({id:c.id,name:c.name})):[]),...by(WJ)]).slice(0,6);return{dir,wr}}
function crewHTML(d,t){const c=crewOf(d,t),b=(l,a,r)=>a.length?`<h3>${l}</h3><div class="chips g cw">${a.map(n=>`<i data-p="${n.id}" data-r="${r}">${esc(n.name)}</i>`).join("")}</div>`:"";return b(c.dir.length>1?"Directors":"Director",c.dir,"dir")+b(c.wr.length>1?"Writers":"Writer",c.wr,"wr")}
let ES=[],ESN=0;
function trBack(tr){if(tr.classList.contains("pl")){tr.classList.remove("pl");tr.innerHTML=CUR.tc;if(!tr.querySelector(".trb"))tr.style.backgroundImage=CUR.bk?`url(${CUR.bk})`:"none";CUR.bind&&CUR.bind()}}
function epReset(){const tr=$(".tr"),p=$("#epi");if(p){p.hidden=true;p.innerHTML=""}document.querySelectorAll(".ep.sel").forEach(x=>x.classList.remove("sel"));if(!tr||!CUR)return;tr.classList.remove("ep-on");trBack(tr);const g=tr.querySelector(".tbg");if(g)g.style.opacity=0;$(".tb").style.setProperty("--bk",CUR.bk?`url(${CUR.bk})`:"none")}
function epPick(i){const e=ES[i],tr=$(".tr"),p=$("#epi");if(!e||!tr||!p)return;const row=document.querySelector(`.ep[data-i="${i}"]`);if(row&&row.classList.contains("sel")){epReset();return}
 trBack(tr);document.querySelectorAll(".ep.sel").forEach(x=>x.classList.remove("sel"));if(row)row.classList.add("sel");tr.classList.add("ep-on");
 const g=tr.querySelector(".tbg"),u=e.still_path?IMG+(innerWidth>900?"w1280":"w780")+e.still_path:"";
 if(u){const im=new Image();im.onload=()=>{if(!row||!row.classList.contains("sel"))return;g.style.backgroundImage=`url(${u})`;g.style.opacity=1;$(".tb").style.setProperty("--bk",`url(${u})`)};im.src=u}else{g.style.opacity=0;toast("No poster for this episode yet")}
 const cw=e.crew||[],dr=pn(cw.filter(c=>c.job==="Director").map(c=>({id:c.id,name:c.name}))),wr=pn(cw.filter(c=>/^(Writer|Screenplay|Teleplay|Story)$/.test(c.job)).map(c=>({id:c.id,name:c.name})));
 p.innerHTML=`<small>S${pad(ESN)}E${pad(e.episode_number)}</small><h4>${esc(e.name)}</h4><p class="em">${fd(e.air_date)}${e.runtime?" · "+e.runtime+" min":""}</p>${e.overview?`<p>${esc(e.overview)}</p>`:""}${dr.length?`<p class="ec"><b>Director</b>${lk(dr,"dir")}</p>`:""}${wr.length?`<p class="ec"><b>Writer</b>${lk(wr,"wr")}</p>`:""}<div id="epa" class="cv-ep-streams"></div><button class="all" id="epb">Back to show</button>`;p.hidden=false;$("#epb").onclick=epReset;try{const dd=CUR&&CUR.d;window.CVA&&CVA.streams&&dd&&CVA.streams($("#epa"),{imdbId:(dd.external_ids||{}).imdb_id||dd.imdb_id,type:"tv",season:ESN,episode:e.episode_number})}catch(_){}
 $("#modal").scrollTo({top:0,behavior:"smooth"})}
async function episodes(d,sn){const my=tok,el=$("#epw");if(!el)return;const ss=(d.seasons||[]).filter(s=>s.season_number>0),nx=d.next_episode_to_air;
 if(!ss.length){el.innerHTML='<p class="empty">No episode data yet.</p>';return}
 sn=sn||(ss.find(s=>nx&&s.season_number===nx.season_number)||ss[ss.length-1]).season_number;
 el.innerHTML=`<div class="eh"><select id="ssn">${ss.map(s=>`<option value="${s.season_number}"${s.season_number===sn?" selected":""}>Season ${s.season_number}</option>`).join("")}</select><span>${d.number_of_episodes||""} episodes</span></div>${nx?`<p class="nx">Episode ${nx.episode_number} releases ${when(nx.air_date)} · ${fd(nx.air_date)}</p>`:""}<div id="eps"><p class="empty">Loading…</p></div>`;
 $("#ssn").onchange=e=>{epReset();episodes(d,+e.target.value)};
 try{const s=await api(`/tv/${d.id}/season/${sn}`),n=day(0);if(my!==tok||!$("#eps"))return;
  ES=s.episodes||[];ESN=sn;
  $("#eps").innerHTML=ES.map((e,k)=>{const up=!e.air_date||e.air_date>n;return`<div class="ep" data-i="${k}"><div class="et">${e.still_path?`<img loading="lazy" decoding="async" alt="" src="${IMG}w300${e.still_path}">`:""}</div><div class="eb"><div class="eh2"><b>${e.episode_number}.</b><span>${esc(e.name)}</span>${up?'<em class="up">UPCOMING</em>':e.vote_average?`<em>${STAR}${e.vote_average.toFixed(1)}</em>`:""}</div><p class="em">${fd(e.air_date)}${e.runtime?" · "+e.runtime+" min":""}</p>${up||!e.overview?"":`<p class="eo">${esc(e.overview)}</p>`}</div></div>`}).join("")||'<p class="empty">No episodes listed.</p>';
  $("#eps").onclick=e=>{const r=e.target.closest(".ep");if(r)epPick(+r.dataset.i)}}catch{const x=my===tok&&$("#eps");if(x)x.innerHTML='<p class="empty">Could not load episodes.</p>'}}
const pick=l=>{l=(l||[]).filter(x=>x.file_path);const x=l.filter(y=>y.iso_639_1==="en").sort((p,q)=>q.vote_average-p.vote_average)[0]||l.sort((p,q)=>q.vote_average-p.vote_average)[0];return x?IMG+(x.file_path.endsWith(".svg")?"original":"w500")+x.file_path:""};
const lgc={};async function logoOf(i){const t=kind(i),k=t+i.id;if(k in lgc)return lgc[k];try{lgc[k]=pick((await api(`/${t}/${i.id}/images`,{include_image_language:"en,null"})).logos)}catch{lgc[k]=""}return lgc[k]}
const RG=["IN","US","GB","CA","AU","DE","FR","JP","KR","BR"];let REG=localStorage.getItem("cv_reg")||((navigator.language||"").split("-")[1]||"IN").toUpperCase().replace(/[^A-Z]/g,"").slice(0,2)||"IN";if(!RG.includes(REG))RG.unshift(REG);
const WU=[[/netflix/i,t=>"https://www.netflix.com/search?q="+t],[/amazon|prime video/i,t=>"https://www.primevideo.com/search/?phrase="+t],[/hotstar/i,t=>"https://www.hotstar.com/in/search?q="+t],[/disney/i,t=>"https://www.disneyplus.com/search?q="+t],[/apple/i,t=>"https://tv.apple.com/search?term="+t],[/youtube/i,t=>"https://www.youtube.com/results?search_query="+t],[/google play/i,t=>"https://play.google.com/store/search?c=movies&q="+t],[/zee5/i,t=>"https://www.zee5.com/search?q="+t],[/sony ?liv/i,t=>"https://www.sonyliv.com/search?q="+t],[/jio ?cinema/i,t=>"https://www.jiocinema.com/search/"+t],[/hulu/i,t=>"https://www.hulu.com/search?q="+t],[/^max$|hbo/i,t=>"https://www.max.com/search?q="+t],[/paramount/i,t=>"https://www.paramountplus.com/search/?q="+t],[/peacock/i,t=>"https://www.peacocktv.com/search?q="+t],[/mx player/i,t=>"https://www.mxplayer.in/search?q="+t]];
function wurl(pn,d){const nm=d.title||d.name||"",yr=String(d.release_date||d.first_air_date||"").slice(0,4),e=encodeURIComponent(nm),hit=WU.find(x=>x[0].test(pn));return hit?hit[1](e):"https://www.google.com/search?q="+encodeURIComponent("watch "+nm+" "+yr+" on "+pn)}
function prov(d,tab){const el=$("#wp");if(!el)return;const r=((d["watch/providers"]||{}).results||{})[REG]||{},M={};
 [["flatrate","Stream","Subscription"],["free","Free","Free"],["ads","Free","Free with ads"],["rent","Rent","Rent"],["buy","Buy","Buy"]].forEach(([k,g,l])=>(r[k]||[]).forEach(p=>{const m=M[p.provider_id]=M[p.provider_id]||{p,t:[],g:[]};if(!m.t.includes(l))m.t.push(l);if(!m.g.includes(g))m.g.push(g)}));
 const all=Object.values(M),tabs=["All",...["Stream","Free","Rent","Buy"].filter(g=>all.some(x=>x.g.includes(g)))],cu=tabs.includes(tab)?tab:(["Buy","Stream","Rent","Free"].find(g=>tabs.includes(g))||"All"),list=all.filter(x=>cu==="All"||x.g.includes(cu));
 el.innerHTML=`<div class="eh"><h3>Where to watch</h3><select id="rg">${RG.map(c=>`<option${c===REG?" selected":""}>${c}</option>`).join("")}</select></div>`+(all.length?`<div class="wtabs">${tabs.map(g=>`<button data-wt="${g}" class="${g===cu?"on":""}">${g}</button>`).join("")}</div><div class="wps">${list.map(x=>`<a class="wp" target="_blank" rel="noopener" href="${esc(wurl(x.p.provider_name,d))}"><img alt="" loading="lazy" src="${IMG}w92${x.p.logo_path}"><div><b>${esc(x.p.provider_name)}</b><small>${x.t.join(" · ")}</small></div><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></a>`).join("")}</div><small class="jw">Streaming data by JustWatch</small>`:`<p class="empty" style="padding:6px 0">Not listed on major platforms in ${REG} yet.</p>`);
 el.querySelectorAll("[data-wt]").forEach(b=>b.onclick=()=>prov(d,b.dataset.wt));
 $("#rg").onchange=e=>{REG=e.target.value;localStorage.setItem("cv_reg",REG);prov(d,cu)}}
let CUR={};
let NAV=[],VIEW=null,SKIPPOP=0;
const shareURL=(k,id)=>PX?`${location.origin}/s/${k}/${id}`:`${location.origin}/#${k}-${id}`;
function openFromHash(){const h=location.hash||"",clr=()=>history.replaceState(history.state,"",location.pathname+location.search);let m;
 if(m=h.match(/^#(movie|tv|person|collection)-(\d+)$/)){clr();m[1]==="person"?openPerson(+m[2]):m[1]==="collection"?openCollection(+m[2]):openDetail(m[1],+m[2])}
 else if(m=h.match(/^#fr-([a-z0-9]+)$/)){clr();openFranchise(m[1])}
 else if(m=h.match(/^#list=([mt\d,]+)(?:&n=(.*))?$/)){clr();let n="Shared list";try{n=decodeURIComponent(m[2]||"")||n}catch{}openSharedList(m[1].split(",").filter(x=>/^[mt]\d+$/.test(x)).slice(0,500),n.slice(0,60))}
 else return false;return true}
function navIn(bk,v){if(!bk){if(!$("#modal").hidden&&VIEW)NAV.push(VIEW);else NAV=[]}VIEW=v;$(".tb").style.setProperty("--p",0)}
function navBack(){if(!NAV.length)return false;const v=NAV.pop();v.k==="p"?openPerson(v.id,v.r,1):v.k==="f"?openFranchise(v.key,1):v.k==="c"?openCollection(v.id,1):v.k==="d"?openDetail(v.t,v.id,1):0;return true}
const PJ=/^(Writer|Screenplay|Teleplay|Story|Novel|Comic Book|Creator|Characters)$/;
async function openPerson(id,role,bk){$("#simp").hidden=$("#sheet").hidden=true;navIn(bk,{k:"p",id,r:role});$("#modal").classList.add("pp");$("#modal").classList.remove("nosh");
 if($("#modal").hidden){history.pushState({m:1},"");$("#modal").hidden=false;document.body.style.overflow="hidden"}
 const my=++tok;CUR={};$("#modal").scrollTop=0;$("#tl").removeAttribute("src");$("#tt").textContent="";$("#mc").innerHTML='<p class="empty" style="padding-top:110px">Loading…</p>';
 try{const d=await api(`/person/${id}`,{append_to_response:"combined_credits"});if(my!==tok)return;
  const cc=d.combined_credits||{},okc=x=>x.poster_path&&!(x.genre_ids||[]).some(g=>g===10767||g===10763||g===10764),dd=a=>{const m={};return a.filter(x=>{const k=x.media_type+x.id;return!m[k]&&(m[k]=1)})},sp=a=>a.sort((x,y)=>(y.popularity||0)-(x.popularity||0));
  const T=[["Acting",sp(dd((cc.cast||[]).filter(x=>okc(x)&&!/^(Self|Himself|Herself)/i.test(x.character||""))))],["Directing",sp(dd((cc.crew||[]).filter(x=>x.job==="Director"&&okc(x))))],["Writing",sp(dd((cc.crew||[]).filter(x=>PJ.test(x.job)&&okc(x))))]].filter(x=>x[1].length);
  const pref={cast:"Acting",dir:"Directing",wr:"Writing"}[role]||({Directing:"Directing",Writing:"Writing"}[d.known_for_department]||"Acting");let cu=(T.find(x=>x[0]===pref)||T[0]||[])[0];
  $("#tt").textContent=d.name;
  $("#mc").innerHTML=`<div class="pp-h">${d.profile_path?`<img alt="" src="${IMG}w342${d.profile_path}">`:"<i></i>"}<div><h2>${esc(d.name)}</h2><small>${esc(d.known_for_department||"")}${d.birthday?` · Born ${fd(d.birthday)}`:""}${d.place_of_birth?`<br>${esc(d.place_of_birth)}`:""}</small></div></div>${d.biography?`<div class="pp-b"><p class="ovt">${esc(d.biography)}</p><button class="all" id="prm">Read more</button></div>`:""}<div class="pp-b"><div class="wtabs" id="ptabs"></div></div><div class="pp-g" id="pgr"></div>`;
  if($("#prm"))$("#prm").onclick=e=>{const o=$(".pp-b .ovt").classList.toggle("open");e.target.textContent=o?"Less":"Read more"};
  const draw=()=>{$("#ptabs").innerHTML=T.map(([n,a])=>`<button data-n="${n}" class="${n===cu?"on":""}">${n} <small>${a.length}</small></button>`).join("");$("#ptabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{cu=b.dataset.n;draw()});
   const g=$("#pgr");g.innerHTML=T.length?"":'<p class="empty">No titles found.</p>';((T.find(x=>x[0]===cu)||[0,[]])[1]).slice(0,80).forEach(x=>g.append(card(x,x.media_type)))};draw();
 }catch(e){if(my===tok){$("#mc").innerHTML='<div class="fail"><p class="empty">Could not load this person.</p><button class="btn" id="rtd">Try again</button></div>';$("#rtd").onclick=()=>openPerson(id,role,1)}}}
async function openGenre(t,gid){hideModal();document.querySelectorAll("#seg button").forEach(x=>x.classList.toggle("on",x.dataset.t===t));await fillGenres(t);$("#gsel").value=String(gid);filt();view("browse")}
function openTr(key){const o=$("#trl");$("#trp").innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0&playsinline=1&fs=1" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay;fullscreen;picture-in-picture;encrypted-media" allowfullscreen></iframe>`;o.hidden=false;history.pushState({t:1},"");
 try{const f=o.requestFullscreen||o.webkitRequestFullscreen;f&&f.call(o);if(screen.orientation&&screen.orientation.lock)screen.orientation.lock("landscape").catch(()=>{})}catch(_){}}
function closeTr(pop){const o=$("#trl");if(!o||o.hidden)return;o.hidden=true;$("#trp").innerHTML="";try{if(document.fullscreenElement)document.exitFullscreen();if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock()}catch(_){}if(!pop&&history.state&&history.state.t){SKIPPOP=1;history.back()}}
$("#trx").onclick=()=>closeTr();
$("#mc").addEventListener("click",e=>{const fb=e.target.closest("[data-f],[data-col]");if(fb){fb.dataset.col?openCollection(+fb.dataset.col):openFranchise(fb.dataset.f);return}const g=e.target.closest("[data-g]");if(g&&CUR.t){openGenre(CUR.t,+g.dataset.g);return}const p=e.target.closest("[data-p]");if(p)openPerson(+p.dataset.p,p.dataset.r)});

async function openDetail(t,id,bk){$("#simp").hidden=$("#sheet").hidden=true;navIn(bk,{k:"d",t,id});$("#modal").classList.remove("pp","nosh");if($("#modal").hidden){history.pushState({m:1},"");$("#modal").hidden=false;document.body.style.overflow="hidden"}
 const my=++tok;$("#modal").scrollTop=0;$("#mc").innerHTML='<div class="tr"></div><p class="empty">Loading…</p>';
 try{let d;try{d=await api(`/${t}/${id}`,{append_to_response:"videos,credits,recommendations,similar,images,watch/providers,external_ids"+(t==="tv"?",aggregate_credits":""),include_image_language:"en,null"})}catch(e1){if(my!==tok)return;d=await api(`/${t}/${id}`,{append_to_response:"videos,credits,images,external_ids"+(t==="tv"?",aggregate_credits":""),include_image_language:"en,null"})}if(my!==tok)return;
 d.videos=d.videos||{results:[]};d.credits=d.credits||{cast:[],crew:[]};d.recommendations=d.recommendations||{results:[]};d.similar=d.similar||{results:[]};
 const vs=d.videos.results.filter(x=>x.site==="YouTube"),v=vs.find(x=>x.type==="Trailer")||vs.find(x=>x.type==="Teaser")||vs[0],nx=d.next_episode_to_air;
 const stt=t==="tv"?(nx?`Ongoing · next ep ${when(nx.air_date)}`:/Ended|Canceled/.test(d.status)?"Ended":"Returning"):(!d.release_date?"Upcoming":d.release_date>day(0)?`Releases ${fd(d.release_date)}`:"Released");
 const m={id,type:t,title:title(d),poster:d.poster_path,lang:d.original_language,genres:(d.genres||[]).map(g=>g.id)};learn(m,1);CUR={d,t,m};
 const cast=d.credits.cast.slice(0,20).map(c=>`<div data-p="${c.id}" data-r="cast">${c.profile_path?`<img loading="lazy" decoding="async" src="${IMG}w185${c.profile_path}" alt="">`:"<i></i>"}<b>${esc(c.name)}</b><small>${esc(c.character||"")}</small></div>`).join("");
 const run=d.runtime?d.runtime+" min":"",bk=d.backdrop_path?IMG+(innerWidth>900?"w1280":"w780")+d.backdrop_path:"",lg=pick(d.images&&d.images.logos);
 $("#mc").innerHTML=`<div class="tr" style="background-image:url(${bk})"><div class="tbg"></div><div class="tc">${lg?`<img class="tlg" src="${lg}" alt="">`:""}${v?'<button class="btn play" id="pl">Play trailer</button>':'<p class="notr">No trailer available</p>'}</div></div>
 <div class="mi"><div class="mw"><img class="dp" alt="" src="${d.poster_path?IMG+"w342"+d.poster_path:""}"><div class="mx">
 <div class="chips"><i class="c1">${cat(d,t)}</i><i>${(d.release_date||d.first_air_date||"").slice(0,4)||"TBA"}</i><i>${STAR}${(d.vote_average||0).toFixed(1)}</i><i>${stt}</i></div>
 <h2${lg?' class="sr"':""}>${esc(title(d))}</h2><p class="tag">${esc(d.tagline||"")}</p>
 <div class="act"><button class="pill" id="bkm">${BM}<span>Add to list</span></button></div><div id="epi" class="epi" hidden></div>
 <p class="ovt">${esc(d.overview||"No overview yet.")}</p><button class="all" id="rm">Read more</button>
 <nav class="cvt" id="cvt" role="tablist" aria-label="Sections">${t==="tv"?'<button type="button" role="tab" data-cvt="eps">Episodes</button>':""}<button type="button" role="tab" data-cvt="watch">Watch</button><button type="button" role="tab" data-cvt="about">Details</button>${cast?'<button type="button" role="tab" data-cvt="cast">Cast</button>':""}<button type="button" role="tab" data-cvt="more">More like this</button></nav>
 ${t==="tv"?'<section class="cvt-pane" data-cvpane="eps"><div id="epw"></div></section>':""}
 <section class="cvt-pane" data-cvpane="watch"><div id="wp"></div><div id="wa"></div></section>
 <section class="cvt-pane" data-cvpane="about">${crewHTML(d,t)}<div id="frs"></div>
 <div class="chips g cvt-gen">${(d.genres||[]).map(g=>`<i data-g="${g.id}">${esc(g.name)}</i>`).join("")}</div>
 <div class="stats">${stat("Rating",(d.vote_average||0).toFixed(1)+"/10")}${stat("Votes",(d.vote_count||0).toLocaleString())}${t==="movie"?stat("Budget",money(d.budget))+stat("Box office",money(d.revenue)):stat("Seasons",d.number_of_seasons||"—")+stat("Episodes",d.number_of_episodes||"—")}${run?stat("Runtime",run):""}</div>
 </section>
 ${cast?`<section class="cvt-pane" data-cvpane="cast"><div class="strip cast cvt-cast">${cast}</div></section>`:""}
 <section class="cvt-pane" data-cvpane="more"><div class="strip" id="rec"></div></section></div></div></div>`;
 cvtInit(t);CUR.v=v;CUR.bk=bk;CUR.tc=$(".tr").innerHTML;CUR.bind=()=>{const b=$("#pl");if(b)b.onclick=()=>{$(".tr").classList.add("pl");$(".tr").innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${v.key}?autoplay=1&rel=0&playsinline=1" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe>`}};CUR.bind();
 $("#rm").onclick=e=>{const o=$(".ovt").classList.toggle("open");e.target.textContent=o?"Less":"Read more"};$("#bkm").onclick=openSheet;
 const st=$("#rec");[...d.recommendations.results,...d.similar.results].filter((x,i,r)=>x.poster_path&&r.findIndex(y=>y.id===x.id)===i).slice(0,20).forEach(x=>st.append(card(x,t)));
 if(st.children.length)inf(st,n=>api(`/${t}/${id}/recommendations`,{page:n}),t);else cvtDrop("more");
 prov(d);try{window.CVA&&CVA.streams&&CVA.streams($("#wa"),{imdbId:(d.external_ids||{}).imdb_id||d.imdb_id,type:t})}catch(e){}frStrip(d,t);const tb=$(".tb");tb.classList.remove("s");tb.style.setProperty("--bk",bk?`url(${bk})`:"none");if(lg)$("#tl").src=lg;else $("#tl").removeAttribute("src");$("#tt").textContent=lg?"":title(d);if(t==="tv")episodes(d);syncTb();if(d.poster_path)dominant(d.poster_path).then(c=>root.style.setProperty("--accent",c));
 }catch(e){if(my===tok){$("#mc").innerHTML='<div class="fail"><p class="empty">Could not load details.</p><button class="btn" id="rtd">Try again</button></div>';$("#rtd").onclick=()=>openDetail(t,id,1)}}}
const BM='<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',CHK='<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',FOLDER='<svg viewBox="0 0 24 24"><path d="M3 18.5V6a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v2"/><path d="M5 20h13.6a2 2 0 0 0 1.9-1.4l1.5-5.6a1 1 0 0 0-1-1.2H8a2 2 0 0 0-1.9 1.4z"/></svg>';
const getE=()=>store.get()[CUR.m.type+CUR.m.id]||{};
function upd2(fn){const m=CUR.m,k=m.type+m.id,l=store.get(),c=l[k]||{...m};fn(c);c.u=Date.now();l[k]=c;store.set(l);if(c.status||c.fav||c.sub)learn(m,3);syncTb();if((c.status||c.fav||c.sub)&&$("#sheet").hidden)window.CVA&&CVA.afterSave()}
const SI={Watching:'<circle cx="12" cy="12" r="3"/><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>',Completed:'<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',"On-Hold":'<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',Dropped:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',"Plan to Watch":'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
const ic=p=>`<svg viewBox="0 0 24 24">${p}</svg>`;
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("on");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("on"),1800)}
function syncTb(){const e=getE(),ls=lsOf(e),b=$("#bkm");$("#hr").classList.toggle("on",!!e.fav);$("#trb").classList.toggle("dim",!CUR.v);
 if(b){b.classList.toggle("set",!!ls.length);b.innerHTML=ls.length?`${ic('<path d="m5 12.5 4.5 4.5L19 7.5"/>')}<span>${ls.join(" · ")}</span><svg class="cv" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`:`${BM}<span>Add to list</span>`}}
let SHD=0;function closeSheet(){$("#sheet").hidden=true;if(SHD){SHD=0;window.CVA&&CVA.afterSave()}}
function openSheet(){SHD=0;const cur=lsOf(getE());$("#shs").textContent=CUR.m.title;
 $("#sopts").innerHTML=STATUS.map(s=>`<button data-s="${s}" class="${cur.includes(s)?"on":""}" role="checkbox" aria-checked="${cur.includes(s)}"><i>${ic(SI[s])}</i><span>${s}</span><em class="ck">${CHK}</em></button>`).join("")+`<div class="sf"><button data-s="None" class="rm"${cur.length?"":" hidden"}>Remove from all</button><button data-s="Done" class="dn">Done</button></div>`;$("#sheet").hidden=false}
$("#sopts").onclick=e=>{const b=e.target.closest("button");if(!b)return;const s=b.dataset.s;if(s==="Done"){closeSheet();return}SHD=1;
 if(s==="None")upd2(c=>{c.lists=[];c.status=""});else upd2(c=>{let l=lsOf(c);l=l.includes(s)?l.filter(x=>x!==s):[...l,s];c.lists=l;c.status=l[0]||""});
 const now=lsOf(getE());$("#sopts").querySelectorAll("button[data-s]").forEach(x=>{if(STATUS.includes(x.dataset.s)){const on=now.includes(x.dataset.s);x.classList.toggle("on",on);x.setAttribute("aria-checked",on)}});$("#sopts .rm").hidden=!now.length;
 toast(s==="None"?"Removed from all lists":now.includes(s)?"Added to "+s:"Removed from "+s)};
$("#sheet").onclick=e=>{if(e.target.id==="sheet")closeSheet()};
$("#hr").onclick=()=>upd2(c=>c.fav=!c.fav);$("#trb").onclick=()=>{if(CUR.v)openTr(CUR.v.key);else toast("No trailer available")};
$("#sh").onclick=()=>{const v=VIEW,nm=CUR.m?CUR.m.title:$("#tt").textContent;if(!v||!nm)return;if(v.k==="l")return;const k=v.k==="p"?"person":v.k==="f"?"franchise":v.k==="c"?"collection":v.t,u=shareURL(k,v.k==="f"?v.key:v.id),x={title:nm+" on Parda",url:u};
 if(navigator.share)navigator.share(x).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(()=>toast("Link copied")).catch(()=>toast(u));else toast(u)};
$("#simp").onclick=e=>{if(e.target.id==="simp")$("#simp").hidden=true};
function hideModal(){tok++;NAV=[];VIEW=null;closeTr(1);$("#modal").classList.remove("pp","nosh");$("#simp").hidden=$("#sheet").hidden=$("#lsheet").hidden=true;$("#modal").hidden=true;$("#mc").innerHTML="";document.body.style.overflow="";if(!$("#list").hidden)renderList()}
const close=()=>history.state&&history.state.m?history.back():hideModal();
$("#mx").onclick=()=>{if(!navBack())close()};$("#modal").onclick=e=>{if(e.target.id==="modal")close()};addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!$("#sheet").hidden||!$("#simp").hidden){closeSheet();$("#simp").hidden=true}else if(!$("#modal").hidden)close()});
// ---- My list ----
let tab="Watching";
function renderList(){const all=Object.values(store.get()),T=[...STATUS,"Favourites"],f=(n,i)=>n==="Favourites"?i.fav:inL(i,n);
 $("#tabs").innerHTML="";T.forEach(n=>{const c=all.filter(i=>f(n,i)).length,b=document.createElement("button");b.className=n===tab?"on":"";b.innerHTML=`${n}<small>${c||""}</small>`;b.onclick=()=>{tab=n;renderList()};$("#tabs").append(b)});
 const items=all.filter(i=>f(tab,i));$("#lgrid").innerHTML=items.length?"":`<div class="void">${FOLDER}<p>${tab} is empty</p><span>Open any title and tap the bookmark to save it here.</span></div>`;
 items.forEach(i=>$("#lgrid").append(card({id:i.id,title:i.title,poster_path:i.poster,vote_average:0},i.type)));window.CVA&&CVA.listNote()}
window.cvStoreChanged=()=>{if(!$("#list").hidden)renderList();if(!$("#modal").hidden&&CUR.m)syncTb()};
$("#rst").onclick=()=>{localStorage.removeItem(TK);alert("Personalisation reset")};
$("#modal").addEventListener("scroll",()=>{const r=$(".tr"),h=r?r.offsetHeight:150,p=Math.min(1,Math.max(0,($("#modal").scrollTop-h*.36)/(h*.3))),tb=$(".tb");tb.style.setProperty("--p",p.toFixed(3));tb.classList.toggle("s",p>.5)},{passive:true});
const it=$("#intro");if(it){if(sessionStorage.getItem("cv_i"))it.remove();else{sessionStorage.setItem("cv_i","1");setTimeout(()=>it.remove(),1300)}}
$("#yr").textContent=new Date().getFullYear();$("#up").onclick=()=>scrollTo({top:0,behavior:"smooth"});document.querySelectorAll("[data-acc]").forEach(a=>a.onclick=e=>{e.preventDefault();$("#acc").click()});
if(M)$("#q").placeholder="Search";
home();openFromHash();addEventListener("hashchange",openFromHash);

/* ---- section tabs on the detail page ---- */
function cvtShow(k,focus){const nav=document.getElementById("cvt");if(!nav)return;nav.querySelectorAll("[data-cvt]").forEach(b=>{const on=b.dataset.cvt===k;b.classList.toggle("on",on);b.setAttribute("aria-selected",on)});document.querySelectorAll(".cvt-pane").forEach(p=>p.hidden=p.dataset.cvpane!==k);const b=nav.querySelector(".on");if(b&&nav.scrollTo)nav.scrollTo({left:b.offsetLeft-20,behavior:"smooth"});const pn=document.querySelector(`.cvt-pane[data-cvpane="${k}"]`);if(pn){pn.classList.remove("in");void pn.offsetWidth;pn.classList.add("in")}}
function cvtInit(t){const nav=document.getElementById("cvt");if(!nav)return;nav.onclick=e=>{const b=e.target.closest("[data-cvt]");if(b)cvtShow(b.dataset.cvt)};cvtShow(t==="tv"?"eps":"watch")}
function cvtDrop(k){const b=document.querySelector(`[data-cvt="${k}"]`),p=document.querySelector(`.cvt-pane[data-cvpane="${k}"]`);const on=b&&b.classList.contains("on");if(b)b.remove();if(p)p.remove();if(on){const f=document.querySelector("#cvt [data-cvt]");if(f)cvtShow(f.dataset.cvt)}}
