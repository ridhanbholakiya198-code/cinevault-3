/* Parda lists: one title can live in several lists; share a whole list (or one list) by link */
const LISTS=["Watching","Completed","On-Hold","Dropped","Plan to Watch"];
const lsOf=i=>i?(Array.isArray(i.lists)&&i.lists.length?i.lists.filter(x=>LISTS.includes(x)):(i.status?[i.status]:[])):[];
const inL=(i,n)=>lsOf(i).includes(n);
const SHARE_SVG='<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"/></svg>';
function listLink(name,ids){const d=ids.join(",");return PX?`${location.origin}/s/list/x?n=${encodeURIComponent(name)}&d=${d}`:`${location.origin}/#list=${d}&n=${encodeURIComponent(name)}`}
function openListShare(){const all=Object.values(store.get()),inl=all.filter(i=>lsOf(i).length),mk=(l,it)=>it.length?[[l,it]]:[];
 const cur=typeof tab==="string"?tab:"",one=n=>n==="Favourites"?all.filter(i=>i.fav):all.filter(i=>inL(i,n));
 const first=cur&&cur!=="Subscribed"?mk(cur,one(cur)):[],rest=[...LISTS,"Favourites"].filter(n=>n!==cur).flatMap(n=>mk(n,one(n)));
 const o=[...first,...mk("Everything",inl),...rest];
 if(!o.length){toast("Your list is empty - add something first");return}
 $("#lopts").innerHTML=o.map(([l,it],k)=>`<button data-k="${k}"><i>${SHARE_SVG}</i><span>${l==="Everything"?"Everything in My list":l}</span><em class="ct">${it.length}</em></button>`).join("");
 $("#lsheet")._o=o;$("#lsheet").hidden=false}
function shareList(label,items){const name=label==="Everything"?"My list":label,ids=items.slice(0,400).map(i=>(i.type==="tv"?"t":"m")+i.id),u=listLink(name,ids);
 if(items.length>400)toast("Sharing the first 400 titles");
 if(navigator.share)navigator.share({title:name+" on Parda",url:u}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(()=>toast("Link copied")).catch(()=>toast(u));else toast(u)}
document.addEventListener("DOMContentLoaded",()=>{$("#lsh").onclick=openListShare;
$("#lsheet").onclick=e=>{if(e.target.id==="lsheet"){$("#lsheet").hidden=true;return}const b=e.target.closest("button[data-k]");if(!b)return;const [l,it]=$("#lsheet")._o[+b.dataset.k];$("#lsheet").hidden=true;shareList(l,it)}});
// ---- opening a shared list ----
async function openSharedList(ids,name){$("#simp").hidden=$("#sheet").hidden=$("#lsheet").hidden=true;navIn(0,{k:"l"});$("#modal").classList.add("pp","nosh");
 if($("#modal").hidden){history.pushState({m:1},"");$("#modal").hidden=false;document.body.style.overflow="hidden"}
 const my=++tok;CUR={};$("#modal").scrollTop=0;$("#tl").removeAttribute("src");$("#tt").textContent=name;
 const films=ids.filter(x=>x[0]==="m").length,ser=ids.length-films;let tabv="All";
 $("#mc").innerHTML=`<div class="fr-h"><small>SHARED LIST</small><h2>${esc(name)}</h2><p class="fc2">${ids.length} title${ids.length===1?"":"s"}${films&&ser?` · ${films} films · ${ser} series`:""}</p><button class="btn" id="slAdd" style="margin-top:14px">Add all to Plan to Watch</button></div>${films&&ser?'<div class="pp-b"><div class="wtabs" id="stabs"></div></div>':""}<div class="pp-g fr-g" id="sgr"></div>`;
 const g=$("#sgr"),ph=ids.map(x=>{const e=document.createElement("div");e.className="card sk";e.dataset.t=x[0]==="t"?"Series":"Films";g.append(e);return e}),got=[];
 const tabs=()=>{if(!$("#stabs"))return;$("#stabs").innerHTML=["All","Films","Series"].map(n=>`<button data-n="${n}" class="${n===tabv?"on":""}">${n}</button>`).join("");$("#stabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{tabv=b.dataset.n;ph.forEach(e=>e.hidden=!(tabv==="All"||e.dataset.t===tabv));tabs()})};tabs();
 $("#slAdd").onclick=()=>{const L=store.get();let n=0;got.forEach(x=>{if(!x)return;const k=x.t+x.d.id;if(L[k]&&lsOf(L[k]).length)return;L[k]={id:x.d.id,type:x.t,title:x.d.title||x.d.name||"",poster:x.d.poster_path||"",lang:x.d.original_language||"",genres:(x.d.genres||[]).map(z=>z.id),status:"Plan to Watch",lists:["Plan to Watch"],fav:!!(L[k]&&L[k].fav),sub:false,u:Date.now()};n++});if(n){store.set(L);window.CVA&&CVA.afterSave()}toast(n?`Added ${n} to Plan to Watch`:"Nothing new to add")};
 let next=0;const work=async()=>{while(next<ids.length&&my===tok){const k=next++,x=ids[k],t=x[0]==="t"?"tv":"movie";try{const d=await api(`/${t}/${x.slice(1)}`);if(my!==tok)return;got[k]={t,d};const c=card({id:d.id,title:d.title,name:d.name,poster_path:d.poster_path,vote_average:d.vote_average},t);c.dataset.t=ph[k].dataset.t;c.hidden=ph[k].hidden;ph[k].replaceWith(c);ph[k]=c}catch{if(my===tok)ph[k].remove()}}};
 await Promise.all([1,2,3,4,5,6].map(work))}
