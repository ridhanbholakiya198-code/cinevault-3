const DIRECT="https://api.themoviedb.org/3",DIMG="https://image.tmdb.org/t/p/";
// On hosted sites, go through our own domain (vercel.json rewrites) so ISP blocks on TMDB domains don't matter
const PX=location.protocol.startsWith("http")&&!/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname),IMG=PX?"/timg/":DIMG;
addEventListener("error",e=>{const t=e.target;if(t&&t.tagName==="IMG"&&t.src.includes("/timg/")&&!t.dataset.f){t.dataset.f=1;t.src=t.src.replace(location.origin+"/timg/",DIMG)}},true);
function showErr(m){const d=document.createElement("div");d.className="err";d.textContent="Error: "+m;document.body.append(d);setTimeout(()=>d.remove(),9000)}
addEventListener("error",e=>e.message&&showErr(e.message));addEventListener("unhandledrejection",e=>showErr(e.reason&&e.reason.message||e.reason));
async function get(base,p,q){let u;if(base==="/api/tmdb"){u=new URL(base,location.origin);u.searchParams.set("path",p)}else{u=new URL(base+p,location.origin);u.searchParams.set("api_key",KEY())}for(const k in q)u.searchParams.set(k,q[k]);
 const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);try{const r=await fetch(u,{signal:c.signal});if(!r.ok)throw Error(r.status);return await r.json()}finally{clearTimeout(t)}}
const $=s=>document.querySelector(s),root=document.documentElement,M=innerWidth<700,P=M?"w185":"w342";
const STATUS=["Watching","Completed","On-Hold","Dropped","Plan to Watch"];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// ---- Storage: swap for Firebase later (ROADMAP Part 4) ----
const store={get:()=>JSON.parse(localStorage.getItem("cv_list")||"{}"),set:v=>localStorage.setItem("cv_list",JSON.stringify(v))};
// ---- API with memory + 30 min localStorage cache (fast repeat loads) ----
const KEY=()=>localStorage.getItem("cv_key")||(TMDB_KEY.startsWith("PASTE")?"":TMDB_KEY),mem=new Map(),TTL=18e5;
async function api(p,q={}){if(!PX&&!KEY())throw Error("key");const ck="c:"+p+JSON.stringify(q);
 if(mem.has(ck))return mem.get(ck);
 try{const c=JSON.parse(localStorage.getItem(ck)||"null");if(c&&Date.now()-c.t<TTL){mem.set(ck,c.j);return c.j}}catch{}
 let j;try{j=await get(PX?"/api/tmdb":DIRECT,p,q)}catch(e){if(!PX||!KEY()||e.message==="401")throw e;j=await get(DIRECT,p,q)}
 mem.set(ck,j);
 try{localStorage.setItem(ck,JSON.stringify({t:Date.now(),j}))}catch{Object.keys(localStorage).filter(x=>x.startsWith("c:")).forEach(x=>localStorage.removeItem(x))}return j}
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
// ---- Hero: hit films currently in cinemas (random), nudged by taste. Phone = floating poster over blurred backdrop ----
let hero=[],hi=0,ht,tx=0,ty=0,py=0;
const upd=()=>$("#bd").style.transform=`translate3d(${tx}px,${py+ty}px,0)`,day=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
async function heroItems(){const tl=topOf(taste().l),mine=tl&&tl[0]!=="en"&&tl[1]>=3?tl[0]:"";
 const win=n=>({sort_by:"popularity.desc","primary_release_date.gte":day(n),"primary_release_date.lte":day(0),"vote_count.gte":40,"vote_average.gte":6});
 const[a,b]=await Promise.all([api("/discover/movie",win(60)),mine?api("/discover/movie",{...win(150),with_original_language:mine}):{results:[]}]);
 const ok=i=>i.backdrop_path&&i.poster_path,sh=r=>r.filter(ok).slice(0,10).sort(()=>Math.random()-.5);
 let h=[...sh(b.results).slice(0,2),...sh(a.results)].filter((x,i,r)=>r.findIndex(y=>y.id===x.id)===i).slice(0,6);
 if(h.length>=3)h.forEach(i=>{i.media_type="movie";i.cin=1});else h=(await api("/trending/all/week")).results.filter(ok).slice(0,6);return h}
async function setHero(n){hi=n;const i=hero[n];$("#bd").style.backgroundImage=`url(${IMG}${M?"w780":"w1280"}${M?i.poster_path:i.backdrop_path})`;
 ["#bd",".hc"].forEach(s=>{const e=$(s);e.style.animation="none";void e.offsetWidth;e.style.animation=""});
 $("#hmeta").innerHTML=`${i.cin?'<i class="live"></i>In cinemas':kind(i)==="tv"?"Series":"Film"} · ${(i.vote_average||0).toFixed(1)} · ${(i.release_date||i.first_air_date||"").slice(0,4)}`;
 {const l=lgc[kind(i)+i.id];$("#htitle").innerHTML=l?`<img class="hl" alt="${esc(title(i))}" src="${l}">`:esc(title(i))}$("#hov").textContent=i.overview;$("#hopen").onclick=()=>openDetail(kind(i),i.id);
 document.querySelectorAll(".dots i").forEach((d,k)=>d.classList.toggle("on",k===n));
 $("#cn").textContent=String(n+1).padStart(2,"0");$("#ct").textContent="/"+String(hero.length).padStart(2,"0");
 const nx=hero[(n+1)%hero.length];$("#ni").src=IMG+"w300"+nx.backdrop_path;$("#nt").textContent=title(nx);
 dominant(i.poster_path).then(c=>root.style.setProperty("--accent",c))}
function startHero(){$("#dots").innerHTML=hero.map((_,k)=>`<i data-k="${k}"></i>`).join("");
 document.querySelectorAll(".dots i").forEach(d=>d.onclick=()=>step(+d.dataset.k-hi));
 setHero(0);ht=setInterval(()=>{if(!document.hidden&&!$("#hero").hidden&&$("#modal").hidden)setHero((hi+1)%hero.length)},9000);
 let x0=0;const H=$("#hero");H.addEventListener("touchstart",e=>x0=e.touches[0].clientX,{passive:true});
 H.addEventListener("touchend",e=>{const d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50)step(d<0?1:-1)},{passive:true})}
const step=d=>{clearInterval(ht);setHero((hi+d+hero.length)%hero.length);ht=setInterval(()=>{if(!document.hidden&&!$("#hero").hidden&&$("#modal").hidden)setHero((hi+1)%hero.length)},9000)};
$("#hu").onclick=()=>step(-1);$("#hd").onclick=()=>step(1);$("#nxt").onclick=()=>step(1);
if(!M)$("#hero").addEventListener("mousemove",e=>{tx=(e.clientX/innerWidth-.5)*-30;ty=(e.clientY/innerHeight-.5)*-20;upd()});
let tick;addEventListener("scroll",()=>{if(tick)return;tick=requestAnimationFrame(()=>{tick=0;$("#top").classList.toggle("s",scrollY>30);if(scrollY<innerHeight){py=scrollY*.25;upd()}})},{passive:true});
// ---- Rows: lazy-loaded in parallel as you scroll ----
let RW=[];
const L=(l,x={})=>({with_original_language:l,sort_by:"popularity.desc","vote_count.gte":30,...x}),G=g=>({with_genres:g,sort_by:"popularity.desc","vote_count.gte":150});
const BASE=[["Trending","/trending/all/day","",null,null,1],["Popular","/movie/popular","movie"],["Top rated","/movie/top_rated","movie"],["TV trending","/trending/tv/week","tv"],
["Bollywood","/discover/movie","movie",L("hi"),"hi"],["Telugu","/discover/movie","movie",L("te"),"te"],["Malayalam","/discover/movie","movie",L("ml"),"ml"],["Anime","/discover/tv","tv",L("ja",{with_genres:16,"vote_count.gte":0}),"ja"],["Anime films","/discover/movie","movie",L("ja",{with_genres:16}),"ja"],
["Top series","/tv/top_rated","tv"],["Action","/discover/movie","movie",G(28)],["Horror","/discover/movie","movie",G(27)],["Sci-Fi","/discover/movie","movie",G(878)],["Crime","/discover/movie","movie",G(80)],["Docs","/discover/movie","movie",G(99)]];
function buildRows(){const x=taste(),aff=r=>(r[4]?x.l[r[4]]||0:0)+(typeof(r[3]||{}).with_genres==="number"?x.g[r[3].with_genres]||0:0);
 const[first,...rest]=BASE;rest.sort((p,q)=>aff(q)-aff(p));const my=[],v=x.v[0],tl=topOf(x.l),tg=topOf(x.g),tt=topOf(x.t);
 if(v)my.push([`Like ${v.title.length>16?v.title.slice(0,15)+"…":v.title}`,`/${v.type}/${v.id}/recommendations`,v.type]);
 if(tl&&tl[1]>=3){const ty=tt?tt[0]:"movie";my.push(["Picked for you","/discover/"+ty,ty,L(tl[0],tg&&tg[1]>=3?{with_genres:tg[0]}:{})])}
 return[first,...my,...rest]}
function inf(st,load,ty,box,vert,p0){let p=p0==null?1:p0,busy=0,end=0;const sc=box||st,more=async()=>{if(busy||end)return;busy=1;
 try{const d=await load(++p);if(!d.results.length||p>=Math.min(d.total_pages||1,25))end=1;d.results.filter(i=>i.poster_path&&i.media_type!=="person").forEach(i=>st.append(card(i,ty)))}catch{end=1}busy=0};
 sc.addEventListener("scroll",()=>{if(vert?sc.scrollTop+sc.clientHeight>sc.scrollHeight-700:sc.scrollLeft+sc.clientWidth>sc.scrollWidth-700)more()},{passive:true});return more}
const io=new IntersectionObserver(es=>es.forEach(async e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const[,p,ty,q,,mix]=RW[e.target.dataset.i],st=e.target.querySelector(".strip");
 try{const[d,u]=await Promise.all([api(p,q||{}),mix?api("/movie/upcoming"):0]);let it=d.results.filter(i=>i.poster_path);
  if(u){const s=u.results.filter(i=>i.poster_path&&i.release_date>day(0)).slice(0,5).map(i=>({...i,soon:1,media_type:"movie"}));it=it.flatMap((x,k)=>k%4===3&&s.length?[x,s.shift()]:[x])}
  st.innerHTML="";it.forEach(i=>st.append(card(i,ty)));inf(st,n=>api(p,{...(q||{}),page:n}),ty)}catch{}}),{rootMargin:"800px 0px"});
function setup(e){$("#hero").hidden=true;$("#rows").innerHTML=e.message==="key"||e.message==="401"?`<section class="setup"><h2>Connect TMDB</h2><p>themoviedb.org → Settings → API → "API Key (v3 auth)" paste karo.</p><input id="kin" placeholder="TMDB v3 API key"><button class="btn" id="ksv">Save &amp; load</button></section>`:`<section class="setup"><h2>Can't reach TMDB</h2><p>${esc(e.message)} — network ya ISP block ho sakta hai. Private DNS (dns.google) ya VPN try karo.</p><button class="btn" id="rt">Retry</button></section>`;
 if($("#rt"))$("#rt").onclick=()=>location.reload();
 if($("#ksv"))$("#ksv").onclick=()=>{localStorage.setItem("cv_key",$("#kin").value.trim());location.reload()}}
async function home(){try{hero=await heroItems();await Promise.race([Promise.all(hero.map(logoOf)),new Promise(r=>setTimeout(r,1500))]);startHero()}catch(e){return setup(e)}
 RW=buildRows();RW.forEach((r,i)=>{const s=document.createElement("section");s.className="row";s.dataset.i=i;
  s.innerHTML=`<div class="rh"><h2>${esc(r[0])}</h2><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div><div class="strip">${'<div class="card sk"></div>'.repeat(6)}</div><button class="ar l" aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button><button class="ar r" aria-label="Next"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>`;
  s.querySelector(".rh").onclick=()=>{reset(r[0],r[1],r[2]||"",r[3]||{},false);view("browse")};s.querySelectorAll(".ar").forEach(b=>b.onclick=()=>{const st=s.querySelector(".strip");st.scrollBy({left:(b.classList.contains("r")?1:-1)*st.clientWidth*.8,behavior:"smooth"})});$("#rows").append(s);io.observe(s)});
 const e=document.createElement("div");e.className="end";e.innerHTML='<button class="btn">Browse all films &amp; series</button>';e.firstChild.onclick=()=>go("browse");$("#rows").append(e)}
// ---- Browse: infinite scroll grid (filters, See all, search all use this) ----
let B={path:"",f:0,page:0,busy:0,end:0,q:{},type:""};
function reset(t,path,type,q,f){B={path,type,q,f,page:0,busy:0,end:0};$("#btitle").textContent=t;$("#bgrid").innerHTML="";$("#bar").hidden=!f;loadMore()}
async function loadMore(){if(B.busy||B.end)return;B.busy=1;const b=B;
 try{const d=await api(b.path,{...b.q,page:b.page+1});if(b!==B)return;b.page++;if(b.path==="/search/multi"&&b.page===1)d.results.slice(0,3).forEach(i=>learn({lang:i.original_language,genres:i.genre_ids,type:kind(i)},.5));
  d.results.filter(i=>i.poster_path&&i.media_type!=="person").forEach(i=>$("#bgrid").append(card(i,b.type)));if(b.page>=Math.min(d.total_pages,30))b.end=1}catch{b.end=1}
 b.busy=0;if(b===B&&!b.end&&!$("#browse").hidden&&$("#sent").getBoundingClientRect().top<innerHeight+900)loadMore()}
new IntersectionObserver(e=>e[0].isIntersecting&&loadMore(),{rootMargin:"900px"}).observe($("#sent"));
async function fillGenres(t){try{const g=await api(`/genre/${t}/list`);$("#gsel").innerHTML='<option value="">All genres</option>'+g.genres.map(x=>`<option value="${x.id}">${x.name}</option>`).join("")}catch{}}
function filt(){const t=$("#seg .on").dataset.t,s=$("#ssel").value,n=new Date().toISOString().slice(0,10);
 const q={sort_by:{pop:"popularity.desc",top:"vote_average.desc",new:t==="tv"?"first_air_date.desc":"primary_release_date.desc",rev:t==="tv"?"popularity.desc":"revenue.desc"}[s],"vote_count.gte":s==="top"?300:s==="new"?20:0};
 if($("#gsel").value)q.with_genres=$("#gsel").value;if(s==="new")q[t==="tv"?"first_air_date.lte":"primary_release_date.lte"]=n;
 reset(t==="tv"?"Series":"Films","/discover/"+t,t,q,1)}
document.querySelectorAll("#seg button").forEach(b=>b.onclick=async()=>{document.querySelectorAll("#seg button").forEach(x=>x.classList.toggle("on",x===b));await fillGenres(b.dataset.t);filt()});
$("#gsel").onchange=$("#ssel").onchange=filt;
// ---- Views / nav (Android back button aware) ----
let cur="home";
function view(v,np){["hero","rows"].forEach(i=>$("#"+i).hidden=v!=="home");$("#browse").hidden=v!=="browse";$("#list").hidden=v!=="list";
 document.querySelectorAll("[data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v===v));scrollTo(0,0);if(v==="list")renderList();
 if(!np&&v!=="home"&&cur!==v)history.pushState({v},"");cur=v}
async function go(v){$("#q").value="";if(v==="search"){view("home");$("#q").focus();return}
 if(v==="movies"||v==="series"){const t=v==="movies"?"movie":"tv";document.querySelectorAll("#seg button").forEach(x=>x.classList.toggle("on",x.dataset.t===t));await fillGenres(t);filt();view("browse");return}
 if(v==="browse"&&!B.f){await fillGenres("movie");filt()}view(v)}
document.querySelectorAll("[data-v]").forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.v)});
let st;$("#q").oninput=e=>{clearTimeout(st);const q=e.target.value.trim();if(!q)return view("home");
 st=setTimeout(()=>{saveQ(q);reset(`Results for “${q}”`,"/search/multi","",{query:q},0);view("browse")},350)};
addEventListener("popstate",()=>{if(!$("#modal").hidden)hideModal();else view("home",1)});
// ---- Detail: tabs, data appears on tap ----
const money=n=>n?"$"+n.toLocaleString("en-US"):"Not disclosed",fd=s=>s?new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"TBA";
const when=s=>{const n=Math.ceil((new Date(s)-new Date(day(0)))/864e5);return n<=0?"today":n===1?"tomorrow":`in ${n} days`};
const stat=(l,x)=>`<div class="stat"><small>${l}</small><strong>${x}</strong></div>`;let tok=0;
function cat(d,t){const g=(d.genres||[]).map(x=>x.id),an=d.original_language==="ja"&&g.includes(16);return t==="tv"?(an?"Anime":g.includes(16)?"Animation":"Series"):g.includes(99)?"Documentary":an?"Anime film":g.includes(16)?"Animation":"Film"}
async function episodes(d,sn){const el=$("#epw"),ss=(d.seasons||[]).filter(s=>s.season_number>0),nx=d.next_episode_to_air;
 if(!ss.length){el.innerHTML='<p class="empty">No episode data yet.</p>';return}
 sn=sn||(ss.find(s=>nx&&s.season_number===nx.season_number)||ss[ss.length-1]).season_number;
 el.innerHTML=`<div class="eh"><select id="ssn">${ss.map(s=>`<option value="${s.season_number}"${s.season_number===sn?" selected":""}>Season ${s.season_number}</option>`).join("")}</select><span>${d.number_of_episodes||""} episodes</span></div>${nx?`<p class="nx">Episode ${nx.episode_number} releases ${when(nx.air_date)} · ${fd(nx.air_date)}</p>`:""}<div id="eps"><p class="empty">Loading…</p></div>`;
 $("#ssn").onchange=e=>episodes(d,+e.target.value);
 try{const s=await api(`/tv/${d.id}/season/${sn}`),n=day(0);
  $("#eps").innerHTML=s.episodes.map(e=>{const up=!e.air_date||e.air_date>n;return`<div class="ep"><div class="eh2"><b>${e.episode_number}</b><span>${esc(e.name)}</span>${up?'<em class="up">UPCOMING</em>':e.vote_average?`<em>${STAR}${e.vote_average.toFixed(1)}</em>`:""}</div><div class="ed">${fd(e.air_date)}${e.runtime?" · "+e.runtime+" min":""}${up?"":`<p>${esc(e.overview)}</p>`}</div></div>`}).join("")||'<p class="empty">No episodes listed.</p>';
  $("#eps").onclick=e=>{const r=e.target.closest(".ep");if(r)r.classList.toggle("open")}}catch{$("#eps").innerHTML='<p class="empty">Could not load episodes.</p>'}}
const pick=l=>{l=(l||[]).filter(x=>x.file_path);const x=l.filter(y=>y.iso_639_1==="en").sort((p,q)=>q.vote_average-p.vote_average)[0]||l.sort((p,q)=>q.vote_average-p.vote_average)[0];return x?IMG+(x.file_path.endsWith(".svg")?"original":"w500")+x.file_path:""};
const lgc={};async function logoOf(i){const t=kind(i),k=t+i.id;if(k in lgc)return lgc[k];try{lgc[k]=pick((await api(`/${t}/${i.id}/images`,{include_image_language:"en,null"})).logos)}catch{lgc[k]=""}return lgc[k]}
const RG=["IN","US","GB","CA","AU","DE","FR","JP","KR","BR"];let REG=localStorage.getItem("cv_reg")||((navigator.language||"").split("-")[1]||"IN").toUpperCase();if(!RG.includes(REG))RG.unshift(REG);
function prov(d){const el=$("#wp");if(!el)return;const r=((d["watch/providers"]||{}).results||{})[REG],M={};
 [["flatrate","Subscription"],["rent","Rent"],["buy","Buy"],["ads","Free with ads"],["free","Free"]].forEach(([k,l])=>((r||{})[k]||[]).forEach(p=>{(M[p.provider_id]=M[p.provider_id]||{p,t:[]}).t.push(l)}));const list=Object.values(M);
 el.innerHTML=`<div class="eh"><h3>Where to watch</h3><select id="rg">${RG.map(c=>`<option${c===REG?" selected":""}>${c}</option>`).join("")}</select></div>`+(list.length?`<div class="wps">${list.map(x=>`<a class="wp" target="_blank" rel="noopener" href="${esc(r.link)}"><img alt="" loading="lazy" src="${IMG}w92${x.p.logo_path}"><div><b>${esc(x.p.provider_name)}</b><small>${x.t.join(" · ")}</small></div></a>`).join("")}</div><small class="jw">Streaming data by JustWatch</small>`:`<p class="empty" style="padding:6px 0">Not listed on major platforms in ${REG} yet.</p>`);
 $("#rg").onchange=e=>{REG=e.target.value;localStorage.setItem("cv_reg",REG);prov(d)}}
let CUR={};
async function openDetail(t,id){$("#simp").hidden=$("#sheet").hidden=true;if($("#modal").hidden){history.pushState({m:1},"");$("#modal").hidden=false;document.body.style.overflow="hidden"}
 const my=++tok;$("#modal").scrollTop=0;$("#mc").innerHTML='<div class="tr"></div><p class="empty">Loading…</p>';
 try{const d=await api(`/${t}/${id}`,{append_to_response:"videos,credits,recommendations,similar,images,watch/providers",include_image_language:"en,null"});if(my!==tok)return;
 const vs=d.videos.results.filter(x=>x.site==="YouTube"),v=vs.find(x=>x.type==="Trailer")||vs.find(x=>x.type==="Teaser")||vs[0],nx=d.next_episode_to_air;
 const stt=t==="tv"?(nx?`Ongoing · next ep ${when(nx.air_date)}`:/Ended|Canceled/.test(d.status)?"Ended":"Returning"):(!d.release_date?"Upcoming":d.release_date>day(0)?`Releases ${fd(d.release_date)}`:"Released");
 const m={id,type:t,title:title(d),poster:d.poster_path,lang:d.original_language,genres:(d.genres||[]).map(g=>g.id)};learn(m,1);CUR={d,t,m};
 const cast=d.credits.cast.slice(0,20).map(c=>`<div>${c.profile_path?`<img loading="lazy" decoding="async" src="${IMG}w185${c.profile_path}" alt="">`:"<i></i>"}<b>${esc(c.name)}</b><small>${esc(c.character||"")}</small></div>`).join("");
 const run=d.runtime?d.runtime+" min":"",bk=d.backdrop_path?IMG+(innerWidth>900?"w1280":"w780")+d.backdrop_path:"",lg=pick(d.images&&d.images.logos);
 $("#mc").innerHTML=`<div class="tr" style="background-image:url(${bk})"><div class="tc">${lg?`<img class="tlg" src="${lg}" alt="">`:""}${v?'<button class="btn play" id="pl">Play trailer</button>':'<p class="notr">No trailer available</p>'}</div></div>
 <div class="mi"><div class="mw"><img class="dp" alt="" src="${d.poster_path?IMG+"w342"+d.poster_path:""}"><div class="mx">
 <div class="chips"><i class="c1">${cat(d,t)}</i><i>${(d.release_date||d.first_air_date||"").slice(0,4)||"TBA"}</i><i>${STAR}${(d.vote_average||0).toFixed(1)}</i><i>${stt}</i></div>
 <h2${lg?' class="sr"':""}>${esc(title(d))}</h2><p class="tag">${esc(d.tagline||"")}</p>
 <div class="act"><button class="pill" id="bkm">${BM}<span>Add to list</span></button></div>
 <p class="ovt">${esc(d.overview||"No overview yet.")}</p><button class="all" id="rm">Read more</button>
 ${cast?`<h3>Cast</h3><div class="strip cast">${cast}</div>`:""}
 <div class="chips g">${(d.genres||[]).map(g=>`<i>${esc(g.name)}</i>`).join("")}</div>
 <div class="stats">${stat("Rating",(d.vote_average||0).toFixed(1)+"/10")}${stat("Votes",(d.vote_count||0).toLocaleString())}${t==="movie"?stat("Budget",money(d.budget))+stat("Box office",money(d.revenue)):stat("Seasons",d.number_of_seasons||"—")+stat("Episodes",d.number_of_episodes||"—")}${run?stat("Runtime",run):""}</div>
 <div id="wp"></div>${t==="tv"?'<h3>Episodes</h3><div id="epw"></div>':""}<h3>More like this</h3><div class="strip" id="rec"></div></div></div></div>`;
 if(v)$("#pl").onclick=()=>{$(".tr").classList.add("pl");$(".tr").innerHTML=`<iframe src="https://www.youtube.com/embed/${v.key}?autoplay=1&rel=0&playsinline=1" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe>`};
 $("#rm").onclick=e=>{const o=$(".ovt").classList.toggle("open");e.target.textContent=o?"Less":"Read more"};$("#bkm").onclick=openSheet;
 const st=$("#rec");[...d.recommendations.results,...d.similar.results].filter((x,i,r)=>x.poster_path&&r.findIndex(y=>y.id===x.id)===i).slice(0,20).forEach(x=>st.append(card(x,t)));
 if(st.children.length)inf(st,n=>api(`/${t}/${id}/recommendations`,{page:n}),t);else st.previousElementSibling.remove(),st.remove();
 prov(d);const tb=$(".tb");tb.classList.remove("s");tb.style.setProperty("--bk",bk?`url(${bk})`:"none");if(lg)$("#tl").src=lg;else $("#tl").removeAttribute("src");$("#tt").textContent=lg?"":title(d);if(t==="tv")episodes(d);syncTb();if(d.poster_path)dominant(d.poster_path).then(c=>root.style.setProperty("--accent",c));
 }catch(e){if(my===tok)$("#mc").innerHTML='<p class="empty">Could not load details.</p>'}}
const BM='<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',CHK='<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',FOLDER='<svg viewBox="0 0 24 24"><path d="M3 18.5V6a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v2"/><path d="M5 20h13.6a2 2 0 0 0 1.9-1.4l1.5-5.6a1 1 0 0 0-1-1.2H8a2 2 0 0 0-1.9 1.4z"/></svg>';
const getE=()=>store.get()[CUR.m.type+CUR.m.id]||{};
function upd2(fn){const m=CUR.m,k=m.type+m.id,l=store.get(),c=l[k]||{...m};fn(c);l[k]=c;store.set(l);if(c.status||c.fav||c.sub)learn(m,3);syncTb()}
function syncTb(){const e=getE();$("#hr").classList.toggle("on",!!e.fav);$("#bl").classList.toggle("on",!!e.sub);const b=$("#bkm");if(b){b.querySelector("span").textContent=e.status||"Add to list";b.classList.toggle("on",!!e.status)}}
function openSheet(){const cur=getE().status||"";$("#sopts").innerHTML=[...STATUS,"None"].map(s=>{const on=s==="None"?!cur:s===cur;return`<button data-s="${s}" class="${on?"on":""}"><span>${s}</span>${on?CHK:""}</button>`}).join("");$("#sheet").hidden=false}
$("#sopts").onclick=e=>{const b=e.target.closest("button");if(!b)return;upd2(c=>c.status=b.dataset.s==="None"?"":b.dataset.s);$("#sheet").hidden=true};
$("#sheet").onclick=e=>{if(e.target.id==="sheet")$("#sheet").hidden=true};
$("#hr").onclick=()=>upd2(c=>c.fav=!c.fav);$("#bl").onclick=()=>upd2(c=>c.sub=!c.sub);
$("#sh").onclick=()=>{const x={title:CUR.m.title+" on CineVault",url:location.origin};navigator.share?navigator.share(x).catch(()=>{}):navigator.clipboard&&navigator.clipboard.writeText(x.url)};
$("#sm").onclick=()=>{const m=CUR.m;$("#simp").innerHTML='<div class="pnl"><div class="ph"><h4>Similar</h4><button class="pill" id="spx">Close</button></div><div class="pb"><div class="grid" id="sgrid"></div></div></div>';
 $("#spx").onclick=()=>$("#simp").hidden=true;$("#simp").hidden=false;
 inf($("#sgrid"),async n=>{const r=await api(`/${m.type}/${m.id}/recommendations`,{page:n});return r.results.length||n>1?r:api(`/${m.type}/${m.id}/similar`,{page:n})},m.type,$("#simp .pb"),1,0)()};
$("#simp").onclick=e=>{if(e.target.id==="simp")$("#simp").hidden=true};
function hideModal(){tok++;$("#simp").hidden=$("#sheet").hidden=true;$("#modal").hidden=true;$("#mc").innerHTML="";document.body.style.overflow="";if(!$("#list").hidden)renderList()}
const close=()=>history.state&&history.state.m?history.back():hideModal();
$("#mx").onclick=close;$("#modal").onclick=e=>{if(e.target.id==="modal")close()};addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!$("#sheet").hidden||!$("#simp").hidden){$("#sheet").hidden=$("#simp").hidden=true}else if(!$("#modal").hidden)close()});
// ---- My list ----
let tab="Watching";
function renderList(){const all=Object.values(store.get()),T=[...STATUS,"Favourites","Subscribed"],f=(n,i)=>n==="Favourites"?i.fav:n==="Subscribed"?i.sub:i.status===n;
 $("#tabs").innerHTML="";T.forEach(n=>{const c=all.filter(i=>f(n,i)).length,b=document.createElement("button");b.className=n===tab?"on":"";b.innerHTML=`${n}<small>${c||""}</small>`;b.onclick=()=>{tab=n;renderList()};$("#tabs").append(b)});
 const items=all.filter(i=>f(tab,i));$("#lgrid").innerHTML=items.length?"":`<div class="void">${FOLDER}<p>${tab} is empty</p><span>Open any title and tap the bookmark to save it here.</span></div>`;
 items.forEach(i=>$("#lgrid").append(card({id:i.id,title:i.title,poster_path:i.poster,vote_average:0},i.type)))}
$("#rst").onclick=()=>{localStorage.removeItem(TK);alert("Personalisation reset")};
$("#modal").addEventListener("scroll",()=>{const r=$(".tr");$(".tb").classList.toggle("s",$("#modal").scrollTop>(r?r.offsetHeight*.55:150))},{passive:true});
const it=$("#intro");if(it){if(sessionStorage.getItem("cv_i"))it.remove();else{sessionStorage.setItem("cv_i","1");setTimeout(()=>it.remove(),2700)}}
home();
