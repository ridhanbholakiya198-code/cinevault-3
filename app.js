const API="https://api.themoviedb.org/3",IMG="https://image.tmdb.org/t/p/";
const $=s=>document.querySelector(s),root=document.documentElement,M=innerWidth<700,P=M?"w185":"w342";
const STATUS=["Watching","Completed","On-Hold","Dropped","Plan to Watch"];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// ---- Storage: swap for Firebase later (ROADMAP Part 4) ----
const store={get:()=>JSON.parse(localStorage.getItem("cv_list")||"{}"),set:v=>localStorage.setItem("cv_list",JSON.stringify(v))};
// ---- API with memory + 30 min localStorage cache (fast repeat loads) ----
const KEY=()=>localStorage.getItem("cv_key")||(TMDB_KEY.startsWith("PASTE")?"":TMDB_KEY),mem=new Map(),TTL=18e5;
async function api(p,q={}){if(!KEY())throw Error("key");const ck="c:"+p+JSON.stringify(q);
 if(mem.has(ck))return mem.get(ck);
 try{const c=JSON.parse(localStorage.getItem(ck)||"null");if(c&&Date.now()-c.t<TTL){mem.set(ck,c.j);return c.j}}catch{}
 const u=new URL(API+p);u.searchParams.set("api_key",KEY());for(const k in q)u.searchParams.set(k,q[k]);
 const r=await fetch(u);if(!r.ok)throw Error(r.status);const j=await r.json();mem.set(ck,j);
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
// ---- Hero (poster on phones = album-cover look, backdrop on desktop) ----
let hero=[],hi=0,ht,tx=0,ty=0,py=0;
const upd=()=>$("#bd").style.transform=`translate3d(${tx}px,${py+ty}px,0)`;
async function setHero(n){hi=n;const i=hero[n];$("#bd").style.backgroundImage=`url(${IMG}w${M?780:1280}${M?i.poster_path:i.backdrop_path})`;
 $("#bd").style.animation="none";void $("#bd").offsetWidth;$("#bd").style.animation="";
 $("#hmeta").textContent=`${kind(i)==="tv"?"Series":"Film"} · ${(i.vote_average||0).toFixed(1)} / 10 · ${(i.release_date||i.first_air_date||"").slice(0,4)}`;
 $("#htitle").textContent=title(i);$("#hov").textContent=i.overview;$("#hopen").onclick=()=>openDetail(kind(i),i.id);
 document.querySelectorAll(".dots i").forEach((d,k)=>d.classList.toggle("on",k===n));
 if(i.poster_path)dominant(i.poster_path).then(c=>root.style.setProperty("--accent",c))}
function startHero(){$("#dots").innerHTML=hero.map((_,k)=>`<i data-k="${k}"></i>`).join("");
 document.querySelectorAll(".dots i").forEach(d=>d.onclick=()=>{clearInterval(ht);setHero(+d.dataset.k)});
 setHero(0);ht=setInterval(()=>{if(!document.hidden&&!$("#hero").hidden&&$("#modal").hidden)setHero((hi+1)%hero.length)},9000)}
if(!M)$("#hero").addEventListener("mousemove",e=>{tx=(e.clientX/innerWidth-.5)*-30;ty=(e.clientY/innerHeight-.5)*-20;upd()});
let tick;addEventListener("scroll",()=>{if(tick)return;tick=requestAnimationFrame(()=>{tick=0;if(scrollY<innerHeight){py=scrollY*.25;upd()}})},{passive:true});
// ---- Rows: lazy-loaded in parallel as you scroll ----
const L=(l,x={})=>({with_original_language:l,sort_by:"popularity.desc","vote_count.gte":30,...x}),G=g=>({with_genres:g,sort_by:"popularity.desc","vote_count.gte":150});
const ROWS=[["Trending worldwide today","/trending/all/day"],["Popular films","/movie/popular","movie"],["Top rated films","/movie/top_rated","movie"],["Trending series","/trending/tv/week","tv"],
["Coming soon","/movie/upcoming","movie"],["Bollywood & Indian cinema","/discover/movie","movie",L("hi")],["Tamil cinema","/discover/movie","movie",L("ta")],["Telugu cinema","/discover/movie","movie",L("te")],["Malayalam cinema","/discover/movie","movie",L("ml")],
["Korean dramas","/discover/tv","tv",L("ko",{"vote_count.gte":0})],["Anime series","/discover/tv","tv",L("ja",{with_genres:16,"vote_count.gte":0})],["Anime films","/discover/movie","movie",L("ja",{with_genres:16})],
["Top rated series","/tv/top_rated","tv"],["Airing today","/tv/airing_today","tv"],["Action","/discover/movie","movie",G(28)],["Horror","/discover/movie","movie",G(27)],["Sci-Fi","/discover/movie","movie",G(878)],
["Comedy","/discover/movie","movie",G(35)],["Crime","/discover/movie","movie",G(80)],["Romance","/discover/movie","movie",G(10749)],["Documentaries","/discover/movie","movie",G(99)],
["Hidden gems","/discover/movie","movie",{sort_by:"vote_average.desc","vote_average.gte":7.6,"vote_count.gte":300,"vote_count.lte":2500}]];
const io=new IntersectionObserver(es=>es.forEach(async e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const[,p,ty,q]=ROWS[e.target.dataset.i];
 try{const d=await api(p,q||{});const st=e.target.querySelector(".strip");st.innerHTML="";d.results.filter(i=>i.poster_path).forEach(i=>st.append(card(i,ty)))}catch{}}),{rootMargin:"800px 0px"});
function setup(e){$("#hero").hidden=true;$("#rows").innerHTML=e.message==="key"||e.message==="401"?`<section class="setup"><h2>Connect TMDB</h2><p>themoviedb.org → Settings → API → "API Key (v3 auth)" paste karo.</p><input id="kin" placeholder="TMDB v3 API key"><button class="btn" id="ksv">Save &amp; load</button></section>`:'<p class="empty" style="padding-top:20vh">Could not load data. Check your internet connection.</p>';
 if($("#ksv"))$("#ksv").onclick=()=>{localStorage.setItem("cv_key",$("#kin").value.trim());location.reload()}}
async function home(){try{const t=await api("/trending/all/week");hero=t.results.filter(i=>M?i.poster_path:i.backdrop_path).slice(0,6);startHero()}catch(e){return setup(e)}
 ROWS.forEach((r,i)=>{const s=document.createElement("section");s.className="row";s.dataset.i=i;
  s.innerHTML=`<div class="rh"><h2>${r[0]}</h2><button class="all">See all</button></div><div class="strip">${'<div class="card sk"></div>'.repeat(6)}</div>`;
  s.querySelector(".all").onclick=()=>{reset(r[0],r[1],r[2]||"",r[3]||{},false);view("browse")};$("#rows").append(s);io.observe(s)});
 const e=document.createElement("div");e.className="end";e.innerHTML='<button class="btn">Browse all films &amp; series</button>';e.firstChild.onclick=()=>go("browse");$("#rows").append(e)}
// ---- Browse: infinite scroll grid (filters, See all, search all use this) ----
let B={path:"",f:0,page:0,busy:0,end:0,q:{},type:""};
function reset(t,path,type,q,f){B={path,type,q,f,page:0,busy:0,end:0};$("#btitle").textContent=t;$("#bgrid").innerHTML="";$("#bar").hidden=!f;loadMore()}
async function loadMore(){if(B.busy||B.end)return;B.busy=1;const b=B;
 try{const d=await api(b.path,{...b.q,page:b.page+1});if(b!==B)return;b.page++;
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
 st=setTimeout(()=>{reset(`Results for “${q}”`,"/search/multi","",{query:q},0);view("browse")},350)};
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
 acts({id,type:t,title:title(d),poster:d.poster_path});
 const rec=[...d.recommendations.results,...d.similar.results].filter((x,i,a)=>x.poster_path&&a.findIndex(y=>y.id===x.id)===i).slice(0,20);
 if(rec.length){$("#mc .mi").insertAdjacentHTML("beforeend",'<h3>More like this</h3><div class="strip" id="rec"></div>');rec.forEach(x=>$("#rec").append(card(x,t)))}
 if(d.poster_path)dominant(d.poster_path).then(c=>root.style.setProperty("--accent",c));
 }catch(e){if(my===tok)$("#mc").innerHTML='<p class="empty">Could not load details.</p>'}}
function acts(m){const k=m.type+m.id,e=store.get()[k]||{};const b=(txt,on,fn)=>{const x=document.createElement("button");x.textContent=txt;x.className=on?"on":"";x.onclick=()=>{const l=store.get(),c=l[k]||{...m};fn(c);l[k]=c;store.set(l);acts(m)};$("#acts").append(x)};
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
home();
