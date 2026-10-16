const API="https://api.themoviedb.org/3",IMG="https://image.tmdb.org/t/p/";
const $=s=>document.querySelector(s),root=document.documentElement;
const STATUS=["Watching","Completed","On-Hold","Dropped","Plan to Watch"];
// ---- Storage: swap these 2 functions for Firebase later (see ROADMAP.md) ----
const store={get:()=>JSON.parse(localStorage.getItem("cv_list")||"{}"),set:v=>localStorage.setItem("cv_list",JSON.stringify(v))};
async function api(p,q={}){if(TMDB_KEY.startsWith("PASTE"))throw Error("key");
 const u=new URL(API+p);u.searchParams.set("api_key",TMDB_KEY);for(const k in q)u.searchParams.set(k,q[k]);
 const r=await fetch(u);if(!r.ok)throw Error(r.status);return r.json()}
const money=n=>n?"$"+n.toLocaleString("en-US"):"Not disclosed";
const title=i=>i.title||i.name,kind=i=>i.media_type||(i.title?"movie":"tv");
function card(i,t){t=t||kind(i);const e=document.createElement("div");e.className="card";
 e.innerHTML=`<img loading="lazy" alt="" src="${i.poster_path?IMG+"w342"+i.poster_path:""}"><b>${(i.vote_average||0).toFixed(1)}</b><span>${title(i)}</span>`;
 e.onclick=()=>openDetail(t,i.id);return e}
// ---- Dominant colour from poster -> drives each film's palette ----
function dominant(path){return new Promise(res=>{const im=new Image();im.crossOrigin="anonymous";
 im.onload=()=>{const c=document.createElement("canvas");c.width=c.height=24;const x=c.getContext("2d");x.drawImage(im,0,0,24,24);
  const d=x.getImageData(0,0,24,24).data;let best=[224,160,48],bs=-1;
  for(let i=0;i<d.length;i+=4){const[r,g,b]=[d[i],d[i+1],d[i+2]],mx=Math.max(r,g,b),mn=Math.min(r,g,b),s=(mx-mn)*(mx>60?1:.2);if(s>bs){bs=s;best=[r,g,b]}}
  res(`rgb(${best.map(v=>Math.min(255,v+25))})`)};
 im.onerror=()=>res("#e0a030");im.src=IMG+"w92"+path})}
// ---- Hero ----
let hero=[],hi=0,ht;
async function setHero(n){hi=n;const i=hero[n];$("#bd").style.backgroundImage=`url(${IMG}w1280${i.backdrop_path})`;
 $("#bd").style.animation="none";void $("#bd").offsetWidth;$("#bd").style.animation="";
 $("#hmeta").textContent=`${kind(i)==="tv"?"Series":"Film"} · ${(i.vote_average||0).toFixed(1)} / 10 · ${(i.release_date||i.first_air_date||"").slice(0,4)}`;
 $("#htitle").textContent=title(i);$("#hov").textContent=i.overview;$("#hopen").onclick=()=>openDetail(kind(i),i.id);
 document.querySelectorAll(".dots i").forEach((d,k)=>d.classList.toggle("on",k===n));
 if(i.poster_path)root.style.setProperty("--accent",await dominant(i.poster_path))}
function startHero(){$("#dots").innerHTML=hero.map((_,k)=>`<i data-k="${k}"></i>`).join("");
 document.querySelectorAll(".dots i").forEach(d=>d.onclick=()=>{clearInterval(ht);setHero(+d.dataset.k)});
 setHero(0);ht=setInterval(()=>setHero((hi+1)%hero.length),9000)}
$("#hero").addEventListener("mousemove",e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;
 $("#bd").style.transform=`rotateY(${x*3}deg) rotateX(${-y*3}deg) translate(${x*-18}px,${y*-12}px)`});
addEventListener("scroll",()=>{$("#hero").style.setProperty("--s",scrollY);$("#bd").style.marginTop=scrollY*.25+"px"},{passive:true});
// ---- Home feed (worldwide) ----
const ROWS=[["Trending worldwide today","/trending/all/day"],["Popular films","/movie/popular","movie"],["Top rated films","/movie/top_rated","movie"],
 ["Trending series","/trending/tv/week","tv"],["Top rated series","/tv/top_rated","tv"],["Anime & animation","/discover/tv",  "tv",{with_genres:16,sort_by:"popularity.desc"}],["In cinemas now","/movie/now_playing","movie"]];
async function home(){try{
 const t=await api("/trending/all/week");hero=t.results.filter(i=>i.backdrop_path).slice(0,6);startHero();
 for(const[n,p,ty,q]of ROWS){const d=await api(p,q||{});const s=document.createElement("section");s.className="row";
  s.innerHTML=`<h2>${n}</h2><div class="strip"></div>`;d.results.forEach(i=>i.poster_path&&s.lastChild.append(card(i,ty)));$("#rows").append(s)}
 }catch(e){$("#rows").innerHTML=`<p class="empty">${e.message==="key"?"Add your TMDB API key in config.js to load movies.":"Could not load data. Check your internet connection and API key."}</p>`}}
// ---- Detail ----
async function openDetail(t,id){$("#modal").hidden=false;document.body.style.overflow="hidden";$("#mc").innerHTML='<p class="empty">Loading…</p>';
 try{const d=await api(`/${t}/${id}`,{append_to_response:"videos,credits"});
 const v=d.videos.results.find(x=>x.site==="YouTube"&&x.type==="Trailer")||d.videos.results.find(x=>x.site==="YouTube");
 if(d.poster_path)root.style.setProperty("--accent",await dominant(d.poster_path));
 const run=d.runtime?d.runtime+" min":d.number_of_seasons?d.number_of_seasons+" seasons":"";
 const stat=(l,v)=>`<div class="stat"><small>${l}</small><strong>${v}</strong></div>`;
 const cast=d.credits.cast.slice(0,12).map(c=>`<div>${c.profile_path?`<img loading="lazy" src="${IMG}w185${c.profile_path}" alt="">`:"<i></i>"}<b>${c.character||"—"}</b><small>${c.name}</small></div>`).join("");
 $("#mc").innerHTML=`<div class="tr">${v?`<iframe src="https://www.youtube.com/embed/${v.key}?autoplay=1&rel=0" allow="autoplay;fullscreen" allowfullscreen></iframe>`:""}</div>
 <div class="mi"><h2>${title(d)}</h2><p class="tag">${d.tagline||(d.genres||[]).map(g=>g.name).join(", ")}</p>
 <div class="stats">${stat("TMDB rating",(d.vote_average||0).toFixed(1)+" / 10")}${stat("Votes",(d.vote_count||0).toLocaleString())}
 ${t==="movie"?stat("Budget",money(d.budget))+stat("Box office",money(d.revenue)):""}${run?stat("Runtime",run):""}${stat("Released",d.release_date||d.first_air_date||"—")}</div>
 <p style="max-width:70ch;color:#d8d3c8">${d.overview||""}</p><h3>Your list</h3><div class="acts" id="acts"></div>
 <h3>Cast — character &amp; actor</h3><div class="cast">${cast}</div></div>`;
 acts({id,type:t,title:title(d),poster:d.poster_path});
 }catch(e){$("#mc").innerHTML='<p class="empty">Could not load details.</p>'}}
function acts(m){const k=m.type+m.id,l=store.get(),e=l[k]||{};const b=(txt,on,fn)=>{const x=document.createElement("button");x.textContent=txt;x.className=on?"on":"";x.onclick=()=>{const l=store.get(),c=l[k]||{...m};fn(c);l[k]=c;store.set(l);acts(m)};$("#acts").append(x)};
 $("#acts").innerHTML="";STATUS.forEach(s=>b(s,e.status===s,c=>c.status=c.status===s?"":s));
 b("Favourite",e.fav,c=>c.fav=!c.fav);b("Subscribed",e.sub,c=>c.sub=!c.sub)}
const close=()=>{$("#modal").hidden=true;$("#mc").innerHTML="";document.body.style.overflow="";if($("#list").hidden===false)renderList()};
$("#mx").onclick=close;$("#modal").onclick=e=>{if(e.target.id==="modal")close()};addEventListener("keydown",e=>e.key==="Escape"&&close());
// ---- Views, search, list ----
function view(v){["hero","rows"].forEach(i=>$("#"+i).hidden=v!=="home");$("#results").hidden=v!=="res";$("#list").hidden=v!=="list";scrollTo(0,0);if(v==="list")renderList()}
document.querySelectorAll("[data-view]").forEach(a=>a.onclick=e=>{e.preventDefault();$("#q").value="";view(a.dataset.view)});
let st;$("#q").oninput=e=>{clearTimeout(st);const q=e.target.value.trim();if(!q)return view("home");
 st=setTimeout(async()=>{try{const d=await api("/search/multi",{query:q});$("#rgrid").innerHTML="";
 d.results.filter(i=>i.poster_path&&i.media_type!=="person").forEach(i=>$("#rgrid").append(card(i)));view("res")}catch{}},350)};
let tab="Watching";
function renderList(){const T=[...STATUS,"Favourites","Subscribed"];$("#tabs").innerHTML="";
 T.forEach(n=>{const b=document.createElement("button");b.textContent=n;b.className=n===tab?"on":"";b.onclick=()=>{tab=n;renderList()};$("#tabs").append(b)});
 const items=Object.values(store.get()).filter(i=>tab==="Favourites"?i.fav:tab==="Subscribed"?i.sub:i.status===tab);
 $("#lgrid").innerHTML=items.length?"":'<p class="empty">Nothing here yet. Open any title and add it to this list.</p>';
 items.forEach(i=>$("#lgrid").append(card({id:i.id,title:i.title,poster_path:i.poster,vote_average:0},i.type)))}
home();
