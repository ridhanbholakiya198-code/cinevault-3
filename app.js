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
function card(i,t){t=t||kind(i);const e=document.createElement("div");e.className="card";
 e.innerHTML=`<img decoding="async" loading="lazy" alt="" width="342" height="513" src="${i.poster_path?IMG+P+i.poster_path:""}"><b>${(i.vote_average||0).toFixed(1)}</b><span>${esc(title(i))}</span>`;
 e.onclick=()=>openDetail(t,i.id);return e}
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
async function setHero(n){hi=n;const i=hero[n];$("#bd").style.backgroundImage=`url(${IMG}${M?"w300":"w1280"}${i.backdrop_path})`;if(M)$("#hp").src=IMG+"w500"+i.poster_path;
 ["#bd","#pw",".hc"].forEach(s=>{const e=$(s);e.style.animation="none";void e.offsetWidth;e.style.animation=""});
 $("#hmeta").textContent=`${i.cin?"● In cinemas":kind(i)==="tv"?"Series":"Film"} · ${(i.vote_average||0).toFixed(1)} · ${(i.release_date||i.first_air_date||"").slice(0,4)}`;
 $("#htitle").textContent=title(i);$("#hov").textContent=i.overview;$("#hopen").onclick=()=>openDetail(kind(i),i.id);
 document.querySelectorAll(".dots i").forEach((d,k)=>d.classList.toggle("on",k===n));
 dominant(i.poster_path).then(c=>root.style.setProperty("--accent",c))}
function startHero(){$("#dots").innerHTML=hero.map((_,k)=>`<i data-k="${k}"></i>`).join("");
 document.querySelectorAll(".dots i").forEach(d=>d.onclick=()=>{clearInterval(ht);setHero(+d.dataset.k)});
 setHero(0);ht=setInterval(()=>{if(!document.hidden&&!$("#hero").hidden&&$("#modal").hidden)setHero((hi+1)%hero.length)},9000);
 let x0=0;const H=$("#hero");H.addEventListener("touchstart",e=>x0=e.touches[0].clientX,{passive:true});
 H.addEventListener("touchend",e=>{const d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50){clearInterval(ht);setHero((hi+(d<0?1:hero.length-1))%hero.length)}},{passive:true})}
if(!M)$("#hero").addEventListener("mousemove",e=>{tx=(e.clientX/innerWidth-.5)*-30;ty=(e.clientY/innerHeight-.5)*-20;upd()});
let tick;addEventListener("scroll",()=>{if(tick)return;tick=requestAnimationFrame(()=>{tick=0;$("#top").classList.toggle("s",scrollY>30);if(scrollY<innerHeight){py=scrollY*.25;upd()}})},{passive:true});
// ---- Rows: lazy-loaded in parallel as you scroll ----
let RW=[];
const L=(l,x={})=>({with_original_language:l,sort_by:"popularity.desc","vote_count.gte":30,...x}),G=g=>({with_genres:g,sort_by:"popularity.desc","vote_count.gte":150});
const BASE=[["Trending worldwide today","/trending/all/day"],["Popular films","/movie/popular","movie"],["Hollywood blockbusters","/discover/movie","movie",L("en",{"vote_count.gte":1500}),"en"],["Top rated films","/movie/top_rated","movie"],["Trending series","/trending/tv/week","tv"],["Coming soon","/movie/upcoming","movie"],
["Bollywood & Indian cinema","/discover/movie","movie",L("hi"),"hi"],["Telugu cinema","/discover/movie","movie",L("te"),"te"],["Malayalam cinema","/discover/movie","movie",L("ml"),"ml"],["Anime series","/discover/tv","tv",L("ja",{with_genres:16,"vote_count.gte":0}),"ja"],["Anime films","/discover/movie","movie",L("ja",{with_genres:16}),"ja"],
["Top rated series","/tv/top_rated","tv"],["Airing today","/tv/airing_today","tv"],["Action","/discover/movie","movie",G(28)],["Horror","/discover/movie","movie",G(27)],["Sci-Fi","/discover/movie","movie",G(878)],["Crime","/discover/movie","movie",G(80)],["Documentaries","/discover/movie","movie",G(99)]];
function buildRows(){const x=taste(),aff=r=>(r[4]?x.l[r[4]]||0:0)+(typeof(r[3]||{}).with_genres==="number"?x.g[r[3].with_genres]||0:0);
 const[first,...rest]=BASE;rest.sort((p,q)=>aff(q)-aff(p));const my=[],v=x.v[0],tl=topOf(x.l),tg=topOf(x.g),tt=topOf(x.t);
 if(v)my.push([`Because you viewed ${v.title}`,`/${v.type}/${v.id}/recommendations`,v.type]);
 if(tl&&tl[1]>=3){const ty=tt?tt[0]:"movie";my.push(["Picked for you","/discover/"+ty,ty,L(tl[0],tg&&tg[1]>=3?{with_genres:tg[0]}:{})])}
 return[first,...my,...rest]}
const io=new IntersectionObserver(es=>es.forEach(async e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const[,p,ty,q]=RW[e.target.dataset.i];
 try{const d=await api(p,q||{});const st=e.target.querySelector(".strip");st.innerHTML="";d.results.filter(i=>i.poster_path).forEach(i=>st.append(card(i,ty)))}catch{}}),{rootMargin:"800px 0px"});
function setup(e){$("#hero").hidden=true;$("#rows").innerHTML=e.message==="key"||e.message==="401"?`<section class="setup"><h2>Connect TMDB</h2><p>themoviedb.org → Settings → API → "API Key (v3 auth)" paste karo.</p><input id="kin" placeholder="TMDB v3 API key"><button class="btn" id="ksv">Save &amp; load</button></section>`:`<section class="setup"><h2>Can't reach TMDB</h2><p>${esc(e.message)} — network ya ISP block ho sakta hai. Private DNS (dns.google) ya VPN try karo.</p><button class="btn" id="rt">Retry</button></section>`;
 if($("#rt"))$("#rt").onclick=()=>location.reload();
 if($("#ksv"))$("#ksv").onclick=()=>{localStorage.setItem("cv_key",$("#kin").value.trim());location.reload()}}
async function home(){try{hero=await heroItems();startHero()}catch(e){return setup(e)}
 RW=buildRows();RW.forEach((r,i)=>{const s=document.createElement("section");s.className="row";s.dataset.i=i;
  s.innerHTML=`<div class="rh"><h2>${r[0]}</h2><button class="all">See all</button></div><div class="strip">${'<div class="card sk"></div>'.repeat(6)}</div>`;
  s.querySelector(".all").onclick=()=>{reset(r[0],r[1],r[2]||"",r[3]||{},false);view("browse")};$("#rows").append(s);io.observe(s)});
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
 if(v==="browse"&&!B.f){await fillGenres("movie");filt()}view(v)}
document.querySelectorAll("[data-v]").forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.v)});
let st;$("#q").oninput=e=>{clearTimeout(st);const q=e.target.value.trim();if(!q)return view("home");
 st=setTimeout(()=>{saveQ(q);reset(`Results for “${q}”`,"/search/multi","",{query:q},0);view("browse")},350)};
addEventListener("popstate",()=>{if(!$("#modal").hidden)hideModal();else view("home",1)});
// ---- Detail with trailer, cast, money, recommendations ----
const money=n=>n?"$"+n.toLocaleString("en-US"):"Not disclosed";let tok=0;
async function openDetail(t,id){if($("#modal").hidden){history.pushState({m:1},"");$("#modal").hidden=false;document.body.style.overflow="hidden"}
 const my=++tok;$("#modal").scrollTop=0;$("#mc").innerHTML='<div class="tr"></div><p class="empty">Loading…</p>';
 try{const d=await api(`/${t}/${id}`,{append_to_response:"videos,credits,recommendations,similar"});if(my!==tok)return;
 const vs=d.videos.results.filter(x=>x.site==="YouTube"),v=vs.find(x=>x.type==="Trailer")||vs.find(x=>x.type==="Teaser")||vs[0];
 const run=d.runtime?d.runtime+" min":d.number_of_seasons?d.number_of_seasons+" seasons":"";
 const stat=(l,x)=>`<div class="stat"><small>${l}</small><strong>${x}</strong></div>`;
 const cast=d.credits.cast.slice(0,15).map(c=>`<div>${c.profile_path?`<img loading="lazy" decoding="async" src="${IMG}w185${c.profile_path}" alt="">`:"<i></i>"}<b>${esc(c.character||"—")}</b><small>${esc(c.name)}</small></div>`).join("");
 $("#mc").innerHTML=`<div class="tr" style="background-image:url(${d.backdrop_path?IMG+"w780"+d.backdrop_path:""})">${v?'<button class="btn play" id="pl">Play trailer</button>':'<p class="notr">No trailer available</p>'}</div>
 ${v?`<a class="yt" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${v.key}">Open on YouTube</a>`:""}
 <div class="mi"><h2>${esc(title(d))}</h2><p class="tag">${esc(d.tagline||(d.genres||[]).map(g=>g.name).join(", "))}</p>
 <div class="stats">${stat("TMDB rating",(d.vote_average||0).toFixed(1)+" / 10")}${stat("Votes",(d.vote_count||0).toLocaleString())}${t==="movie"?stat("Budget",money(d.budget))+stat("Box office",money(d.revenue)):""}${run?stat("Runtime",run):""}${stat("Released",d.release_date||d.first_air_date||"—")}</div>
 <p style="max-width:70ch;color:#d8d3c8">${esc(d.overview)}</p><h3>Your list</h3><div class="acts" id="acts"></div>
 <h3>Cast — character &amp; actor</h3><div class="cast">${cast}</div></div>`;
 if(v)$("#pl").onclick=()=>{$(".tr").innerHTML=`<iframe src="https://www.youtube.com/embed/${v.key}?autoplay=1&rel=0&playsinline=1" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe>`};
 const m={id,type:t,title:title(d),poster:d.poster_path,lang:d.original_language,genres:(d.genres||[]).map(g=>g.id)};learn(m,1);acts(m);
 const rec=[...d.recommendations.results,...d.similar.results].filter((x,i,a)=>x.poster_path&&a.findIndex(y=>y.id===x.id)===i).slice(0,20);
 if(rec.length){$("#mc .mi").insertAdjacentHTML("beforeend",'<h3>More like this</h3><div class="strip" id="rec"></div>');rec.forEach(x=>$("#rec").append(card(x,t)))}
 if(d.poster_path)dominant(d.poster_path).then(c=>root.style.setProperty("--accent",c));
 }catch(e){if(my===tok)$("#mc").innerHTML='<p class="empty">Could not load details.</p>'}}
function acts(m){const k=m.type+m.id,e=store.get()[k]||{};const b=(txt,on,fn)=>{const x=document.createElement("button");x.textContent=txt;x.className=on?"on":"";x.onclick=()=>{const l=store.get(),c=l[k]||{...m};fn(c);l[k]=c;store.set(l);if(c.status||c.fav||c.sub)learn(m,3);acts(m)};$("#acts").append(x)};
 $("#acts").innerHTML="";STATUS.forEach(s=>b(s,e.status===s,c=>c.status=c.status===s?"":s));b("Favourite",e.fav,c=>c.fav=!c.fav);b("Subscribed",e.sub,c=>c.sub=!c.sub)}
function hideModal(){tok++;$("#modal").hidden=true;$("#mc").innerHTML="";document.body.style.overflow="";if(!$("#list").hidden)renderList()}
const close=()=>history.state&&history.state.m?history.back():hideModal();
$("#mx").onclick=close;$("#modal").onclick=e=>{if(e.target.id==="modal")close()};addEventListener("keydown",e=>e.key==="Escape"&&!$("#modal").hidden&&close());
// ---- My list ----
let tab="Watching";
function renderList(){const T=[...STATUS,"Favourites","Subscribed"];$("#tabs").innerHTML="";
 T.forEach(n=>{const b=document.createElement("button");b.textContent=n;b.className=n===tab?"on":"";b.onclick=()=>{tab=n;renderList()};$("#tabs").append(b)});
 const items=Object.values(store.get()).filter(i=>tab==="Favourites"?i.fav:tab==="Subscribed"?i.sub:i.status===tab);
 $("#lgrid").innerHTML=items.length?"":'<p class="empty">Nothing here yet. Open any title and add it to this list.</p>';
 items.forEach(i=>$("#lgrid").append(card({id:i.id,title:i.title,poster_path:i.poster,vote_average:0},i.type)))}
$("#rst").onclick=()=>{localStorage.removeItem(TK);alert("Personalisation reset")};
home();
