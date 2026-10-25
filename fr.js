/* Parda franchises, collections & universes.
   Nothing here is a hand-made list of members: for ANY film or series the engine finds its relatives on its own
   (TMDB collection + Wikidata series/universe graph + title-stem fallback), then sorts them into
   Core story / All / Groups / Timeline automatically. Only the home-row entry points and two "suggested watch order" packs are fixed data. */
const FR_SEEDS=[
["Marvel Cinematic Universe","movie","Iron Man","Films & series, Iron Man onwards"],
["X-Men","movie","X-Men","Its own universe & timeline"],
["DC Universe","movie","Man of Steel","Superman, Justice League & more"],
["The Dark Knight","movie","Batman Begins","Nolan's Batman trilogy"],
["Star Wars","movie","Star Wars","A galaxy far, far away"],
["Harry Potter","movie","Harry Potter and the Philosopher's Stone","The Wizarding World"],
["The Lord of the Rings","movie","The Lord of the Rings: The Fellowship of the Ring","Middle-earth"],
["Transformers","movie","Transformers","Robots in disguise"],
["Fast & Furious","movie","The Fast and the Furious","Ride or die"]];
// optional "suggested in-universe order" packs: only used when a franchise already found by the engine contains >= 6 of these titles
const eq=a=>a.map(s=>new RegExp("^"+s+"$"));
const FR_TL=[
{n:"Suggested story order (MCU)",s:eq(["captain america the first avenger","agent carter","captain marvel","iron man","iron man 2","the incredible hulk","thor","the avengers","thor the dark world","iron man 3","captain america the winter soldier","guardians of the galaxy","guardians of the galaxy vol 2","avengers age of ultron","ant man","captain america civil war","black widow","black panther","spider man homecoming","doctor strange","thor ragnarok","ant man and the wasp","avengers infinity war","avengers endgame","wandavision","the falcon and the winter soldier","loki","spider man far from home","shang chi and the legend of the ten rings","eternals","spider man no way home","doctor strange in the multiverse of madness","hawkeye","moon knight","ms marvel","thor love and thunder","she hulk attorney at law","black panther wakanda forever","ant man and the wasp quantumania","guardians of the galaxy vol 3","secret invasion","the marvels","echo","deadpool and wolverine","agatha all along","captain america brave new world","thunderbolts"])},
{n:"Suggested story order (Star Wars)",s:[/acolyte/,/phantom menace/,/attack of the clones/,/clone wars/,/revenge of the sith/,/bad batch/,/^solo/,/obi wan/,/^andor$/,/rebels/,/rogue one/,/^star wars$|new hope/,/empire strikes back/,/return of the jedi/,/mandalorian/,/boba fett/,/ahsoka/,/skeleton crew/,/force awakens/,/last jedi/,/rise of skywalker/]}];
const nrm=s=>String(s||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
const frGet=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}};
const frSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const frToday=()=>new Date().toISOString().slice(0,10);
const frDate=(a,b)=>{const p=a.d||"9999",q=b.d||"9999";return p<q?-1:p>q?1:(a.title||"")<(b.title||"")?-1:1};
const frTok=(t,id)=>(t==="tv"?"t":"m")+id;
// ---------- finding relatives automatically ----------
async function frWiki(q){if(!/^Q\d+$/.test(q))throw 0;
 const sp=`SELECT ?g ?gl ?tm ?tt ?d WHERE{wd:${q} wdt:P8345|wdt:P179|wdt:P1434 ?g. ?w wdt:P8345|wdt:P179|wdt:P1434 ?g. OPTIONAL{?w wdt:P4947 ?tm} OPTIONAL{?w wdt:P4983 ?tt} FILTER(BOUND(?tm)||BOUND(?tt)) OPTIONAL{?w wdt:P577 ?d1} OPTIONAL{?w wdt:P580 ?d2} BIND(COALESCE(?d1,?d2) AS ?d) ?g rdfs:label ?gl. FILTER(LANG(?gl)="en")} LIMIT 700`;
 const ac=new AbortController(),to=setTimeout(()=>ac.abort(),12000);
 try{const r=await fetch("https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(sp),{signal:ac.signal});if(!r.ok)throw 0;const j=await r.json(),rows=(j.results&&j.results.bindings)||[],gs={},items=[];
  rows.forEach(b=>{const g=b.g&&b.g.value,d=b.d?String(b.d.value).slice(0,10):"";[["movie",b.tm],["tv",b.tt]].forEach(([t,x])=>{if(!x)return;const id=+x.value;if(!id)return;items.push({t,id,d});(gs[g]=gs[g]||{n:b.gl?b.gl.value:"",s:new Set()}).s.add(t+id)})});
  const top=Object.values(gs).sort((a,b)=>b.s.size-a.s.size)[0];return{label:top?top.n:"",items}}finally{clearTimeout(to)}}
const frStem=t=>String(t||"").split(/[:\-–—]/)[0].replace(/\s+(\d+|[ivx]+)$/i,"").replace(/\b(returns|again|begins|reloaded|forever)$/i,"").trim();
const frClean=s=>String(s||"").replace(/\s*\([^)]*(series|franchise|universe)[^)]*\)\s*$/i,"").replace(/ Collection$/,"").trim();
const FRMEM=new Map();
async function frWikiRetry(q){try{return await frWiki(q)}catch{await new Promise(r=>setTimeout(r,1500));return frWiki(q)}}
// Some franchises are split into several TMDB collections (e.g. "The Fast and the Furious" vs "Fast & Furious"): pull in siblings with the same name tokens
async function frSiblings(name,add){const STOP=new Set(["the","and","of","collection","saga","trilogy","franchise","series"]),toks=s=>nrm(s).split(" ").filter(w=>w.length>2&&!STOP.has(w)),T=toks(name);if(!T.length)return;
 for(const q of[...new Set([name,T.join(" ")])]){let r;try{r=await api("/search/collection",{query:q})}catch{continue}
  for(const c of(r.results||[]).slice(0,6)){const ct=toks(c.name);if(!(T.length>=2?T.every(w=>ct.includes(w)):(ct.length===1&&ct[0]===T[0])))continue;try{const cc=await api("/collection/"+c.id);(cc.parts||[]).forEach(p=>add("movie",p.id,p.release_date))}catch{}}}}
async function frGraph(fk){const ck="cv_frg2_"+fk,c=frGet(ck);if(c&&c.g&&c.g.items&&Date.now()-c.t<432e5)return c.g;
 const m0=FRMEM.get(fk);if(m0&&Date.now()-m0.t<9e4)return m0.g;
 const t=fk[0]==="t"?"tv":"movie",id=+fk.slice(1),d=await api(`/${t}/${id}`,{append_to_response:"external_ids"});
 const mem=new Map(),add=(t2,id2,date)=>{const k=t2+id2,o=mem.get(k);if(!o)mem.set(k,{t:t2,id:id2,d:date||""});else if(date&&!o.d)o.d=date};
 add(t,id,d.release_date||d.first_air_date);let colName="",wl="",jobs=[],full=true;
 const col=d.belongs_to_collection;if(col&&col.id){colName=frClean(col.name);jobs.push(api("/collection/"+col.id).then(cc=>{(cc.parts||[]).forEach(p=>add("movie",p.id,p.release_date))}).catch(()=>{full=false}))}
 const q=d.external_ids&&d.external_ids.wikidata_id;if(q)jobs.push(frWikiRetry(q).then(r=>{wl=frClean(r.label);r.items.forEach(x=>add(x.t,x.id,x.d))}).catch(()=>{full=false}));
 await Promise.all(jobs);
 if(t==="movie"){const nm=colName||frStem(d.title||d.name);if(nm.length>=4)try{await frSiblings(nm,add)}catch{}}
 if(mem.size<3){const stem=frStem(d.title||d.name),lang=d.original_language;if(stem.length>=5){for(const kind of["movie","tv"]){try{const r=await api("/search/"+kind,{query:stem});(r.results||[]).filter(x=>x.original_language===lang&&nrm(x.title||x.name).startsWith(nrm(stem))).forEach(x=>add(kind,x.id,x.release_date||x.first_air_date))}catch{}}}colName=colName||frStem(d.title||d.name)}
 let items=[...mem.values()].sort(frDate);if(items.length>220){const me=mem.get(t+id);items=[me,...items.filter(x=>x!==me).slice(0,219)].sort(frDate)}
 const g={label:wl||colName||frStem(d.title||d.name),items,seed:{t,id}};
 if(items.length>1){if(full)frSet(ck,{t:Date.now(),g});else FRMEM.set(fk,{t:Date.now(),g})}return g}
// light details per title (kept small), used for sorting titles into Core / Side / Groups
async function frDetail(t,id){const k="cv_fd_"+t[0]+id,c=frGet(k);if(c)return c;
 const d=await api(`/${t}/${id}`,{},1),r={id,t,title:d.title||d.name||"",poster:d.poster_path||"",d:d.release_date||d.first_air_date||"",rt:t==="movie"?(d.runtime||0):((d.episode_run_time||[])[0]||0),g:(d.genres||[]).map(x=>x.id),tp:d.type||"",vc:d.vote_count||0,col:d.belongs_to_collection?{id:d.belongs_to_collection.id,name:frClean(d.belongs_to_collection.name)}:null,co:(d.production_companies||[]).slice(0,2).map(x=>x.name)};frSet(k,r);return r}
const frDetailR=async(t,id)=>{for(let i=0;i<3;i++){try{return await frDetail(t,id)}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,700*(i+1)))}}};
const SIDE_RX=/\blego\b|making of|behind the scenes|assembled|special presentation|one shot|featurette|recap|marvel studios legends/i;
function frSide(r){if(SIDE_RX.test(nrm(r.title)))return"Side story";
 if(r.t==="movie"){if(r.rt&&r.rt<40)return"Short";if(r.g.includes(99))return"Doc"}
 else{if(["Documentary","Reality","Talk Show","News","Video"].includes(r.tp)||r.g.includes(99))return"Doc";if(r.g.includes(10762))return"Kids"}
 if(r.d&&r.d<frToday()&&r.vc<6)return"Minor";return""}
function frTimeline(list){for(const p of FR_TL){const slots=p.s.map(()=>[]);list.forEach(x=>{const n=nrm(x.title),i=p.s.findIndex(rx=>rx.test(n));if(i>=0)slots[i].push(x)});
  if(slots.filter(a=>a.length).length>=6){const flat=slots.flat(),used=new Set(flat);return{name:p.n,items:[...flat,...list.filter(x=>!used.has(x))]}}}return null}
// ---------- cards ----------
function frCard(i,k,o){const up=i.d&&i.d>frToday(),c=card({id:i.id,title:i.title,poster_path:i.poster,vote_average:0,soon:up?1:0,release_date:i.d},i.t);c.classList.add("fc");if(o&&o.cur)c.classList.add("cur");
 c.insertAdjacentHTML("afterbegin",`<i class="no">${String(k+1).padStart(2,"0")}</i>`);c.querySelector("span").insertAdjacentHTML("beforeend",`<small>${i.d?i.d.slice(0,4):"TBA"}${i.t==="tv"?" · Series":""}</small>`);
 if(i.side){c.classList.add("sd");c.insertAdjacentHTML("beforeend",`<em class="sdt">${esc(i.side)}</em>`)}
 const e=store.get()[i.t+i.id];if(e&&inL(e,"Completed"))c.insertAdjacentHTML("beforeend",`<u class="dn">${CHK}</u>`);return c}
// ---------- strip on every detail page ----------
function frStrip(d,t){const box=$("#frs");if(!box)return;const fk=frTok(t,d.id);
 if(!(d.belongs_to_collection||(d.external_ids&&d.external_ids.wikidata_id))&&!(frGet("cv_frg_"+fk))){/* nothing to ask the graph yet: try the title-stem fallback only for distinctive titles */if(frStem(d.title||d.name).length<5){box.remove();return}}
 let done=0;const go=async()=>{if(done)return;done=1;try{const g=await frGraph(fk);if($("#frs")!==box)return;if(g.items.length<3){box.remove();return}
   const me=g.items.findIndex(x=>x.t===t&&x.id===d.id),a=Math.max(0,Math.min(me-3,g.items.length-14)),win=g.items.slice(a,a+14);
   box.innerHTML=`<div class="fr-b"><button class="fr-t" data-f="${fk}"><span><small>PART OF</small><b>${esc(g.label)}</b></span><em>See all ${g.items.length}<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></em></button><div class="strip fr-s">${'<div class="card sk"></div>'.repeat(5)}</div></div>`;
   const st=box.querySelector(".fr-s");let cur=null,filled=0;
   await Promise.all(win.map(async(it,j)=>{try{const r=await frDetail(it.t,it.id);if(!r.poster)return;const c=frCard({...r,side:""},a+j,{cur:it.t===t&&it.id===d.id});c.style.order=j;if(!filled++)st.innerHTML="";st.append(c);if(c.classList.contains("cur"))cur=c}catch{}}));
   if(!filled)box.remove();else if(cur)st.scrollLeft=Math.max(0,cur.offsetLeft-24)}catch{if($("#frs")===box)box.remove()}};
 if("IntersectionObserver" in window){const o=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){o.disconnect();go()}},{rootMargin:"600px"});o.observe(box)}else go()}
// ---------- home tiles & search ----------
async function frSeedTok(s){const ck="cv_frs_"+s[0],c=frGet(ck);if(c)return c;try{const d=await api("/search/"+s[1],{query:s[2]}),n=nrm(s[2]),r=d.results||[],hit=r.filter(x=>nrm(x.title||x.name)===n).sort((a,b)=>(b.popularity||0)-(a.popularity||0))[0]||r[0];if(!hit)return"";const k=frTok(s[1],hit.id);frSet(ck,k);return k}catch{return""}}
async function frOpenSeed(s){const k=await frSeedTok(s);if(k)openFranchise(k,0,s[0]);else toast("Could not open - check your connection")}
const frFm=ps=>`<div class="fm n${Math.min(ps.length,4)}">${ps.map(p=>`<img alt="" loading="lazy" src="${IMG}w185${p}">`).join("")}</div>`;
function frTile(s){const e=document.createElement("div");e.className="card fcard";const k=frGet("cv_frs_"+s[0]),ps=(k&&frGet("cv_frt_"+k))||[];
 e.innerHTML=`<div class="fi">${ps.length?frFm(ps):""}<b class="ft">COLLECTION</b><strong>${esc(s[0])}</strong><small>${esc(s[3])}</small></div><span>${esc(s[0])}</span>`;e.onclick=()=>frOpenSeed(s);e._s=s;
 if(!ps.length){if(frIO)frIO.observe(e);else frHydrate(e)}return e}
const frIO=("IntersectionObserver" in window)?new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){frIO.unobserve(x.target);frHydrate(x.target)}}),{rootMargin:"500px"}):null;
// home tiles always get real posters: resolve the seed once, then use its TMDB collection (or its own poster) and cache it
async function frHydrate(e){const s=e._s;if(!s||e._h)return;e._h=1;
 try{const k=await frSeedTok(s);if(!k)throw 0;let ps=frGet("cv_frt_"+k);
  if(!ps||!ps.length){const t=k[0]==="t"?"tv":"movie",d=await api(`/${t}/${k.slice(1)}`);let list=[];
   if(d.belongs_to_collection){try{const cc=await api("/collection/"+d.belongs_to_collection.id);list=(cc.parts||[]).filter(p=>p.poster_path).sort((a,b)=>(a.release_date||"9")<(b.release_date||"9")?-1:1).map(p=>p.poster_path)}catch{}}
   if(list.length<2&&d.poster_path)list=[d.poster_path,...list.filter(x=>x!==d.poster_path)];ps=list.slice(0,4);if(ps.length)frSet("cv_frt_"+k,ps)}
  if(!ps||!ps.length)throw 0;const fi=e.querySelector(".fi");if(fi&&!fi.querySelector(".fm"))fi.insertAdjacentHTML("afterbegin",frFm(ps))}catch{e._h=0}}
function frAutoTile(label,n,fk){const e=document.createElement("div");e.className="card fcard";e.innerHTML=`<div class="fi"><b class="ft">COLLECTION</b><strong>${esc(label)}</strong><small>${n} titles · auto</small></div><span>${esc(label)}</span>`;e.onclick=()=>openFranchise(fk,0,label);return e}
function frColTile(c){const e=document.createElement("div");e.className="card fcard one";e.innerHTML=`<div class="fi"><img alt="" loading="lazy" src="${IMG}${P}${c.poster_path}"><b class="ft">COLLECTION</b></div><span>${esc(c.name)}</span>`;e.onclick=()=>openCollection(c.id);return e}
function frRow(){const s=document.createElement("section");s.className="row";
 s.innerHTML=`<div class="rh"><h2>Universes &amp; Collections</h2></div><div class="strip"></div><button class="ar l" aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button><button class="ar r" aria-label="Next"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>`;
 const st=s.querySelector(".strip");FR_SEEDS.forEach(f=>st.append(frTile(f)));setTimeout(()=>[...st.children].forEach((e,i)=>setTimeout(()=>frHydrate(e),i*300)),2500);s.querySelectorAll(".ar").forEach(b=>b.onclick=()=>st.scrollBy({left:(b.classList.contains("r")?1:-1)*st.clientWidth*.8,behavior:"smooth"}));return s}
async function frSearch(q){const nq=nrm(q);if(nq.length<2)return;const g=$("#bgrid"),mine=()=>$("#q").value.trim()===q;if(!g)return;let label="",top=null;
 try{const m=await api("/search/multi",{query:q});top=(m.results||[]).find(x=>(x.media_type==="movie"||x.media_type==="tv")&&x.poster_path);
  if(top&&mine()){const fk=frTok(top.media_type,top.id),gr=await frGraph(fk);if(mine()&&gr.items.length>=3){label=gr.label;g.prepend(frAutoTile(gr.label,gr.items.length,fk))}}}catch{}
 try{const d=await api("/search/collection",{query:q}),cols=(d.results||[]).filter(c=>c.poster_path&&(!label||(nrm(c.name).indexOf(nrm(label))<0&&nrm(label).indexOf(nrm(c.name.replace(/ collection$/i,"")))<0))).slice(0,3);
  if(!mine())return;cols.map(frColTile).reverse().forEach(t=>{const ref=g.querySelector(".fcard");ref?ref.after(t):g.prepend(t)})}catch{}}
// ---------- pages ----------
function frShell(title,bk,view){$("#simp").hidden=$("#sheet").hidden=$("#lsheet").hidden=true;navIn(bk,view);$("#modal").classList.add("pp");$("#modal").classList.remove("nosh");
 if($("#modal").hidden){history.pushState({m:1},"");$("#modal").hidden=false;document.body.style.overflow="hidden"}
 const my=++tok;CUR={};$("#modal").scrollTop=0;$("#tl").removeAttribute("src");$("#tt").textContent=title;
 $("#mc").innerHTML=`<div class="fr-h"><small>COLLECTION</small><h2>${esc(title)}</h2><p class="fc2">Finding every part…</p></div><div class="pp-g fr-g">${'<div class="card sk"></div>'.repeat(8)}</div>`;return my}
async function frRender(my,g,name,fk){const label=name||g.label,items=g.items.slice().sort(frDate);$("#tt").textContent=label;
 if(items.length<2){$("#mc").innerHTML=`<div class="fr-h"><small>COLLECTION</small><h2>${esc(label)}</h2></div><div class="fail"><p class="empty">Nothing else found in this franchise yet.</p></div>`;return}
 $("#mc").innerHTML=`<div class="fr-h"><small>COLLECTION · AUTO</small><h2>${esc(label)}</h2><p class="fc2" id="fcn">Loading 0 of ${items.length}…</p><p class="fnote" id="fnt" hidden></p><div id="fprog"></div></div><div class="pp-b"><div class="wtabs" id="ftabs" hidden></div></div><div class="pp-g fr-g" id="fgr"></div>`;
 const grid=$("#fgr"),rec={},ph=items.map(()=>{const e=document.createElement("div");e.className="card sk";grid.append(e);return e});let done=0,fin=false,next=0;
 const work=async()=>{while(next<items.length&&my===tok){const k=next++,it=items[k];try{const r=await frDetailR(it.t,it.id);if(my!==tok)return;rec[it.t+it.id]=r;if(!fin&&r.poster){const c=frCard(r,k);ph[k].replaceWith(c);ph[k]=c}else if(!r.poster)ph[k].remove()}catch{if(ph[k])ph[k].remove()}done++;if($("#fcn")&&done<items.length)$("#fcn").textContent=`Loading ${done} of ${items.length}…`}};
 await Promise.all([1,2,3,4,5,6].map(work));if(my!==tok)return;fin=true;
 const list=Object.values(rec).filter(r=>r.title&&r.poster).map(r=>({...r,side:frSide(r)})).sort(frDate),core=list.filter(x=>!x.side),side=list.length-core.length;
 if(fk)frSet("cv_frt_"+fk,core.slice(0,4).map(x=>x.poster));
 const tl=frTimeline(core),groups={};list.forEach(x=>{const k=x.col?x.col.name:(x.co[0]||(x.t==="tv"?"Series":"Other"));(groups[k]=groups[k]||[]).push(x)});
 const gl=Object.entries(groups).sort((a,b)=>frDate(a[1][0],b[1][0]));
 const tabs=[...(side?["Core"]:[]),"All",...(gl.length>1?["Groups"]:[]),...(tl?["Timeline"]:[])];let tv=side?"Core":"All";
 const L=store.get(),dn=core.filter(i=>{const e=L[i.t+i.id];return e&&inL(e,"Completed")}).length,films=core.filter(x=>x.t==="movie").length,ser=core.length-films;
 $("#fcn").textContent=`${core.length} main titles${films&&ser?` · ${films} films · ${ser} series`:""}${side?` · ${side} side stories`:""}`;
 if(dn)$("#fprog").innerHTML=`<div class="fp"><i style="width:${Math.round(dn/core.length*100)}%"></i></div><p class="fc2">${dn} of ${core.length} completed</p>`;
 const note={Core:"Main films & series only. Shorts, documentaries, LEGO and kids' spin-offs are under All.",All:"Everything found, in release order. Faded cards are side stories.",Groups:"Grouped by saga / studio: separate universes stay separate.",Timeline:tl?tl.name+". Placement of some titles is debated.":""};
 const draw=()=>{$("#ftabs").hidden=tabs.length<2;$("#ftabs").innerHTML=tabs.map(n=>`<button data-n="${n}" class="${n===tv?"on":""}">${n}</button>`).join("");$("#ftabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{tv=b.dataset.n;draw()});
  const nt=$("#fnt");nt.hidden=!note[tv];nt.textContent=note[tv]||"";grid.innerHTML="";
  if(tv==="Groups")gl.forEach(([n,a])=>{grid.insertAdjacentHTML("beforeend",`<h3 class="fgh">${esc(n)}<small>${a.length}</small></h3>`);a.forEach((i,k)=>grid.append(frCard(i,k)))});
  else(tv==="Core"?core:tv==="Timeline"?tl.items:list).forEach((i,k)=>grid.append(frCard(i,k)))};draw()}
async function openFranchise(fk,bk,name){const my=frShell(name||"Collection",bk,{k:"f",key:fk});
 try{const g=await frGraph(fk);if(my!==tok)return;await frRender(my,g,name,fk)}catch(e){if(my===tok){$("#mc").innerHTML='<div class="fail"><p class="empty">Could not load this collection.</p><button class="btn" id="rtd">Try again</button></div>';$("#rtd").onclick=()=>{localStorage.removeItem("cv_frg_"+fk);openFranchise(fk,1,name)}}}}
async function frColl(id){const ck="cv_frc_"+id,c=frGet(ck);if(c&&Date.now()-c.t<432e5)return c.r;const d=await api("/collection/"+id),r={name:d.name,items:(d.parts||[]).filter(x=>x.poster_path).map(x=>({t:"movie",id:x.id,d:x.release_date||""}))};frSet(ck,{t:Date.now(),r});return r}
async function openCollection(id,bk){const my=frShell("Collection",bk,{k:"c",id});
 try{const r=await frColl(id);if(my!==tok)return;await frRender(my,{label:frClean(r.name),items:r.items},"",null)}catch{if(my===tok){$("#mc").innerHTML='<div class="fail"><p class="empty">Could not load this collection.</p><button class="btn" id="rtd">Try again</button></div>';$("#rtd").onclick=()=>{localStorage.removeItem("cv_frc_"+id);openCollection(id,1)}}}}
