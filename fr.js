/* CineVault franchises & collections: X-Men, MCU, DC, Star Wars, Harry Potter, Middle-earth, Transformers + any TMDB collection.
   Everything is looked up by NAME at runtime (no hard-coded ids that can go stale) and cached, always shown in release order. */
const SWRX=/star wars|mandalorian|andor|ahsoka|obi-wan|boba fett|the acolyte|skeleton crew|bad batch|clone wars|rogue one|solo:|visions|rebels|resistance|young jedi|ewok|droids/i;
const FR=[
{k:"mcu",n:"Marvel Cinematic Universe",s:"Every Marvel Studios film & series",co:[420],aka:["mcu","marvel","marvel studios","marvel cinematic universe","avengers","iron man","captain america","thor","guardians of the galaxy","black panther","doctor strange","ant-man","infinity saga"]},
{k:"xmen",n:"X-Men",s:"X-Men, Wolverine & Deadpool",coll:["X-Men Collection","Wolverine Collection","Deadpool Collection"],mv:["The New Mutants","Deadpool & Wolverine"],tv:["X-Men '97","Legion","The Gifted","X-Men: The Animated Series","X-Men: Evolution","Wolverine and the X-Men"],det:/x-men|wolverine|deadpool/i,aka:["x-men","x men","xmen","wolverine","deadpool","mutants","logan"]},
{k:"dc",n:"DC Universe",s:"Batman, Superman, Justice League & more",dco:["DC Films","DC Studios","DC Entertainment","DC Comics"],coll:["The Dark Knight Collection","Superman Collection","Wonder Woman Collection","Aquaman Collection","Shazam Collection","Joker Collection","The Batman Collection","Suicide Squad Collection"],det:/batman|superman|justice league|wonder woman|aquaman|shazam|suicide squad|green lantern|peacemaker|creature commandos/i,aka:["dc","dceu","dcu","dc comics","dc universe","batman","superman","justice league","wonder woman","aquaman","joker","shazam","suicide squad"]},
{k:"starwars",n:"Star Wars",s:"The saga, spin-offs & series",coll:["Star Wars Collection"],co:[1],rx:SWRX,det:/star wars/i,aka:["star wars","starwars","mandalorian","andor","ahsoka","jedi","clone wars"]},
{k:"hp",n:"Harry Potter",s:"The Wizarding World",coll:["Harry Potter Collection","Fantastic Beasts Collection"],mv:["Harry Potter 20th Anniversary: Return to Hogwarts"],tv:["Harry Potter"],det:/harry potter|fantastic beasts/i,aka:["harry potter","hp","wizarding world","fantastic beasts","hogwarts"]},
{k:"lotr",n:"The Lord of the Rings",s:"Middle-earth: LOTR & The Hobbit",coll:["The Lord of the Rings Collection","The Hobbit Collection"],mv:["The Lord of the Rings: The War of the Rohirrim"],tv:["The Lord of the Rings: The Rings of Power"],det:/lord of the rings|the hobbit|rings of power/i,aka:["lotr","lord of the rings","the lord of the rings","hobbit","the hobbit","middle earth","rings of power"]},
{k:"tf",n:"Transformers",s:"Films & animated series",coll:["Transformers Collection"],mv:["Transformers One","Bumblebee"],tv:["Transformers: Prime","Transformers: EarthSpark","Transformers: Animated","Transformers: Cyberverse","Transformers: Robots in Disguise","Transformers: Rescue Bots","Transformers: Beast Wars"],det:/transformers/i,aka:["transformers","optimus prime","bumblebee","beast wars"]}
];
const nrm=s=>String(s||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
const frGet=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}};
const frSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const frToday=()=>new Date().toISOString().slice(0,10);
const frIt=(x,t)=>({id:x.id,t,title:x.title||x.name||"",poster:x.poster_path||"",d:x.release_date||x.first_air_date||""});
// name -> TMDB id (collection / company), remembered
async function frResolve(kind,name){const ids=frGet("cv_frid")||{},key=kind+":"+name;if(ids[key]!==undefined)return ids[key];
 let id=0;try{const d=await api("/search/"+kind,{query:name}),n=nrm(name),b=n.replace(/ collection$/,""),r=d.results||[];
  const hit=r.find(x=>nrm(x.name||x.title)===n)||(kind==="collection"?r.find(x=>nrm(x.name).startsWith(b))||r.find(x=>nrm(x.name).includes(b)):null);id=hit?hit.id:0}catch{return null}
 ids[key]=id;frSet("cv_frid",ids);return id}
async function frFind(kind,name){try{const d=await api("/search/"+kind,{query:name}),n=nrm(name),r=(d.results||[]).filter(x=>x.poster_path);
 const eq=r.filter(x=>nrm(x.name||x.title)===n).sort((a,b)=>(b.popularity||0)-(a.popularity||0))[0];return eq?[frIt(eq,kind)]:[]}catch{return null}}
const frSort=a=>a.sort((x,y)=>{const p=x.d||"9999",q=y.d||"9999";return p<q?-1:p>q?1:x.title<y.title?-1:1});
async function frLoad(f){const ck="cv_fr_"+f.k,c=frGet(ck);if(c&&c.items&&c.items.length&&Date.now()-c.t<432e5)return c.items;
 const jobs=[],today=frToday();let fail=0;const J=(p,fn)=>jobs.push(Promise.resolve(p).then(fn).catch(()=>{fail++;return[]}));
 (f.coll||[]).forEach(nm=>J(frResolve("collection",nm),async id=>{if(id===null)throw 0;return id?((await api("/collection/"+id)).parts||[]).map(x=>frIt(x,"movie")):[]}));
 (f.mv||[]).forEach(nm=>J(frFind("movie",nm),r=>{if(r===null)throw 0;return r}));
 (f.tv||[]).forEach(nm=>J(frFind("tv",nm),r=>{if(r===null)throw 0;return r}));
 const cids=[...(f.co||[])];const rc=await Promise.all((f.dco||[]).map(n=>frResolve("company",n)));rc.forEach(x=>x&&cids.push(x));
 if(cids.length){const w=cids.slice(0,6).join("|"),bad=x=>(x.genre_ids||[]).some(g=>g===10767||g===10763||g===10764||g===99);
  const dm=(q,tt)=>J(api("/discover/"+tt,{with_companies:w,sort_by:"popularity.desc",...q}),d=>(d.results||[]).filter(x=>x.poster_path&&!bad(x)).map(x=>frIt(x,tt)).filter(x=>!f.rx||f.rx.test(x.title)));
  [1,2,3].forEach(p=>dm({"vote_count.gte":40,page:p},"movie"));dm({"primary_release_date.gte":today},"movie");
  [1,2].forEach(p=>dm({"vote_count.gte":40,page:p},"tv"));dm({"first_air_date.gte":today},"tv")}
 const all=(await Promise.all(jobs)).flat(),seen={},items=frSort(all.filter(x=>x.poster&&!seen[x.t+x.id]&&(seen[x.t+x.id]=1)));
 if(items.length&&fail<=Math.ceil(jobs.length*.3))frSet(ck,{t:Date.now(),items});else if(!items.length)throw Error("empty");return items}
async function frColl(id){const ck="cv_frc_"+id,c=frGet(ck);if(c&&Date.now()-c.t<432e5)return c.r;const d=await api("/collection/"+id),r={name:d.name,overview:d.overview||"",items:frSort((d.parts||[]).filter(x=>x.poster_path).map(x=>frIt(x,"movie")))};frSet(ck,{t:Date.now(),r});return r}
// which franchises / collection does a title belong to?
function frFor(d,t){const nm=nrm(d.title||d.name),raw=d.title||d.name||"",bc=d.belongs_to_collection,col=nrm(bc&&bc.name),co=(d.production_companies||[]).map(c=>c.id),ids=frGet("cv_frid")||{},out=[];
 for(const f of FR){let h=false;
  if(col&&(f.coll||[]).some(c=>nrm(c)===col))h=true;
  else if((f.co||[]).some(c=>co.includes(c))&&(!f.rx||f.rx.test(raw)))h=true;
  else if((f.dco||[]).some(n=>ids["company:"+n]&&co.includes(ids["company:"+n])))h=true;
  else if([...(f.tv||[]),...(f.mv||[])].some(n=>nrm(n)===nm))h=true;
  else if(f.det&&f.det.test(raw))h=true;
  else{const c=frGet("cv_fr_"+f.k);if(c&&c.items&&c.items.some(x=>x.id===d.id&&x.t===t))h=true}
  if(h)out.push({k:f.k,n:f.n,fr:f})}
 if(!out.length&&bc&&bc.id)out.push({col:bc.id,n:bc.name});return out.slice(0,2)}
function frCard(i,k,o){const up=i.d&&i.d>frToday(),c=card({id:i.id,title:i.title,poster_path:i.poster,vote_average:0,soon:up?1:0,release_date:i.d},i.t);c.classList.add("fc");if(o&&o.cur)c.classList.add("cur");
 c.insertAdjacentHTML("afterbegin",`<i class="no">${String(k+1).padStart(2,"0")}</i>`);c.querySelector("span").insertAdjacentHTML("beforeend",`<small>${i.d?i.d.slice(0,4):"TBA"}${i.t==="tv"?" · Series":""}</small>`);
 const e=store.get()[i.t+i.id];if(e&&inL(e,"Completed"))c.insertAdjacentHTML("beforeend",`<u class="dn">${CHK}</u>`);return c}
// strip on the detail page
function frStrip(d,t){const box=$("#frs");if(!box)return;const L=frFor(d,t);if(!L.length){box.remove();return}
 box.innerHTML=L.map((x,i)=>`<div class="fr-b"><button class="fr-t" ${x.col?`data-col="${x.col}"`:`data-f="${x.k}"`}><span><small>PART OF</small><b>${esc(x.n)}</b></span><em>See all in release order<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></em></button><div class="strip fr-s" data-i="${i}">${'<div class="card sk"></div>'.repeat(5)}</div></div>`).join("");
 box.querySelectorAll(".fr-s").forEach(st=>{const x=L[+st.dataset.i];let done=0;const go=async()=>{if(done)return;done=1;try{const items=x.col?(await frColl(x.col)).items:await frLoad(x.fr);st.innerHTML="";let cur=null;items.forEach((i,k)=>{const c=frCard(i,k,{cur:i.id===d.id&&i.t===t});if(c.classList.contains("cur"))cur=c;st.append(c)});if(cur)st.scrollLeft=Math.max(0,cur.offsetLeft-24)}catch{st.closest(".fr-b").remove()}};
  if("IntersectionObserver" in window){const o=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){o.disconnect();go()}},{rootMargin:"500px"});o.observe(st)}else go()})}
// tiles (home row + search)
function frTile(f){const e=document.createElement("div");e.className="card fcard";const c=frGet("cv_fr_"+f.k),ps=((c&&c.items)||[]).filter(x=>x.poster).slice(0,4);
 e.innerHTML=`<div class="fi">${ps.length?`<div class="fm">${ps.map(x=>`<img alt="" loading="lazy" src="${IMG}w185${x.poster}">`).join("")}</div>`:""}<b class="ft">COLLECTION</b><strong>${esc(f.n)}</strong><small>${esc(f.s)}</small></div><span>${esc(f.n)}</span>`;e.onclick=()=>openFranchise(f.k);return e}
function frColTile(c){const e=document.createElement("div");e.className="card fcard one";e.innerHTML=`<div class="fi"><img alt="" loading="lazy" src="${IMG}${P}${c.poster_path}"><b class="ft">COLLECTION</b></div><span>${esc(c.name)}</span>`;e.onclick=()=>openCollection(c.id);return e}
function frRow(){const s=document.createElement("section");s.className="row";
 s.innerHTML=`<div class="rh"><h2>Universes &amp; Collections</h2></div><div class="strip"></div><button class="ar l" aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button><button class="ar r" aria-label="Next"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>`;
 const st=s.querySelector(".strip");FR.forEach(f=>st.append(frTile(f)));s.querySelectorAll(".ar").forEach(b=>b.onclick=()=>st.scrollBy({left:(b.classList.contains("r")?1:-1)*st.clientWidth*.8,behavior:"smooth"}));return s}
async function frSearch(q){const nq=nrm(q);if(nq.length<2)return;const g=$("#bgrid"),mine=()=>$("#q").value.trim()===q;if(!g)return;
 const hits=FR.filter(f=>[f.n,f.k,...f.aka].some(a=>{a=nrm(a);return nq===a||(nq.length>=3&&(a.startsWith(nq)||nq.startsWith(a+" ")))}));
 hits.map(frTile).reverse().forEach(t=>g.prepend(t));
 try{const d=await api("/search/collection",{query:q}),known=new Set(FR.flatMap(f=>(f.coll||[]).map(nrm))),cols=(d.results||[]).filter(c=>c.poster_path&&!known.has(nrm(c.name))).slice(0,3);
  if(!mine())return;const at=g.querySelectorAll(".fcard").length;cols.map(frColTile).reverse().forEach(t=>{const ref=g.children[hits.length];ref?ref.before(t):g.append(t)})}catch{}}
// pages
async function frPage(o,bk,view){$("#simp").hidden=$("#sheet").hidden=$("#lsheet").hidden=true;navIn(bk,view);$("#modal").classList.add("pp");$("#modal").classList.remove("nosh");
 if($("#modal").hidden){history.pushState({m:1},"");$("#modal").hidden=false;document.body.style.overflow="hidden"}
 const my=++tok;CUR={};$("#modal").scrollTop=0;$("#tl").removeAttribute("src");$("#tt").textContent=o.title;
 $("#mc").innerHTML=`<div class="fr-h"><small>COLLECTION</small><h2>${esc(o.title)}</h2><p class="fs">${esc(o.sub||"")}</p></div><div class="pp-g fr-g">${'<div class="card sk"></div>'.repeat(8)}</div>`;
 try{const r=await o.load();if(my!==tok)return;const items=Array.isArray(r)?r:r.items,sub=o.sub||(r&&r.overview)||"",ttl=(r&&r.name)||o.title;
  const films=items.filter(x=>x.t==="movie").length,ser=items.length-films,L=store.get(),done=items.filter(i=>{const e=L[i.t+i.id];return e&&inL(e,"Completed")}).length;let tv="All";
  $("#mc").innerHTML=`<div class="fr-h"><small>COLLECTION · RELEASE ORDER</small><h2>${esc(ttl)}</h2>${sub?`<p class="fs">${esc(sub)}</p>`:""}<p class="fc2">${items.length} titles${films&&ser?` · ${films} films · ${ser} series`:""}</p>${done?`<div class="fp"><i style="width:${Math.round(done/items.length*100)}%"></i></div><p class="fc2">${done} of ${items.length} completed</p>`:""}</div>${films&&ser?'<div class="pp-b"><div class="wtabs" id="ftabs"></div></div>':""}<div class="pp-g fr-g" id="fgr"></div>`;
  const draw=()=>{if($("#ftabs")){$("#ftabs").innerHTML=["All","Films","Series"].map(n=>`<button data-n="${n}" class="${n===tv?"on":""}">${n}</button>`).join("");$("#ftabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{tv=b.dataset.n;draw()})}
   const g=$("#fgr");g.innerHTML="";items.forEach((i,k)=>{if(tv==="Films"&&i.t!=="movie"||tv==="Series"&&i.t!=="tv")return;g.append(frCard(i,k))});if(!g.children.length)g.innerHTML='<p class="empty">Nothing here yet.</p>'};draw();
 }catch(e){if(my===tok){$("#mc").innerHTML='<div class="fail"><p class="empty">Could not load this collection.</p><button class="btn" id="rtd">Try again</button></div>';$("#rtd").onclick=()=>o.again()}}}
function openFranchise(k,bk){const f=FR.find(x=>x.k===k);if(!f)return;const again=()=>{localStorage.removeItem("cv_fr_"+k);openFranchise(k,1)};frPage({title:f.n,sub:f.s,load:()=>frLoad(f),again},bk,{k:"f",key:k})}
function openCollection(id,bk){frPage({title:"Collection",sub:"",load:async()=>{const r=await frColl(id);$("#tt").textContent=r.name;return r},again:()=>{localStorage.removeItem("cv_frc_"+id);openCollection(id,1)}},bk,{k:"c",id});
 frColl(id).then(r=>{if(VIEW&&VIEW.k==="c"&&VIEW.id===id){$("#tt").textContent=r.name;const h=$(".fr-h h2");if(h)h.textContent=r.name}}).catch(()=>{})}
