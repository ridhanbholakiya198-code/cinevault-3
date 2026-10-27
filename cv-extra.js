/* Parda extras: Tonight picker (menu), Colour spotlight (Browse), Release reminder (detail sheet, upcoming titles). */
(() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = document.createElement("style");
  css.textContent = `.tn{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;justify-content:center;padding:calc(24px + env(safe-area-inset-top,0px)) clamp(22px,7vw,120px) calc(24px + env(safe-area-inset-bottom,0px));background:#050506;overflow:auto;animation:cvtIn .45s both}
.tn::before{content:"";position:fixed;inset:0;background:radial-gradient(60vmax 60vmax at 80% 10%,var(--tg,#e8905a),#0000 60%),radial-gradient(50vmax 50vmax at 5% 95%,#2f8c9c,#0000 60%);opacity:.28;filter:blur(40px);pointer-events:none;transition:opacity 1s}
.tn>*{position:relative}.tn .tx{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:18px;width:44px;height:44px;border-radius:50%;border:1px solid #ffffff2e;background:#ffffff10;color:#f2ede4;font-size:22px;cursor:pointer;padding:0;display:grid;place-items:center}
.tn small{font:500 11px/1 "DM Sans",sans-serif;letter-spacing:.36em;color:var(--accent,#e8905a);margin-bottom:16px;display:block}
.tn h2{margin:0 0 26px;font:italic 500 clamp(38px,8vw,84px)/1.05 "Cormorant Garamond",Georgia,serif;max-width:14em;color:#f2ede4;animation:cvtIn .6s both}
.tn .opts{display:flex;flex-wrap:wrap;gap:10px;max-width:900px}.tn .opts button{appearance:none;margin:0;width:auto;height:auto;aspect-ratio:auto;padding:15px 24px;border-radius:99px;border:1px solid #ffffff2e;background:#ffffff0d;color:#f2ede4;font:500 clamp(15px,2.2vw,19px)/1.1 "DM Sans",sans-serif;cursor:pointer;animation:cvtIn .6s both;transition:background .25s,transform .25s}
.tn .opts button:hover,.tn .opts button:focus-visible{background:#ffffff1f;transform:translateY(-2px)}
.tn .res{display:grid;grid-template-columns:minmax(150px,300px) 1fr;gap:clamp(20px,5vw,64px);align-items:center;max-width:1000px;animation:cvtIn .7s both}
.tn .res img{width:100%;border-radius:18px;box-shadow:0 40px 100px -30px var(--tg,#000);aspect-ratio:2/3;object-fit:cover;background:#111}
.tn .res h3{margin:0 0 10px;font:400 clamp(44px,9vw,110px)/.95 "Bebas Neue",sans-serif;letter-spacing:.05em;color:#f6f1e8}.tn .res p{margin:0 0 14px;color:#cfc9bd;font-size:clamp(14px,1.8vw,18px);line-height:1.6;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.tn .res em{font:italic 500 clamp(20px,3vw,30px) "Cormorant Garamond",serif;color:var(--accent,#e8905a);display:block;margin-bottom:12px}.tn .tnr{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.tn .tnr button{appearance:none;margin:0;width:auto;height:46px;aspect-ratio:auto;padding:0 24px;border-radius:99px;border:1px solid #ffffff2e;background:#ffffff10;color:#f2ede4;font:500 14px/1 "DM Sans",sans-serif;cursor:pointer}.tn .tnr button.go{background:var(--accent,#e8905a);color:#000;border-color:transparent}
@media(max-width:600px){.tn .res{grid-template-columns:110px 1fr;align-items:start}.tn .res h3{font-size:clamp(34px,11vw,56px)}}
.ccrow{display:flex;gap:10px;overflow-x:auto;padding:4px 0 14px;margin:0 -2px;scrollbar-width:none;align-items:center}.ccrow::-webkit-scrollbar{display:none}
.ccrow b{font:500 11px/1 "DM Sans";letter-spacing:.3em;color:#a8a39a;flex:none;margin-right:4px}
.ccrow button{flex:none;appearance:none;margin:0;width:auto;height:38px;aspect-ratio:auto;padding:0 14px 0 8px;border-radius:99px;border:1px solid #ffffff22;background:#ffffff0a;color:#f2ede4;font:500 12px/1 "DM Sans";display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.ccrow button i{width:22px;height:22px;border-radius:50%;display:block;box-shadow:0 0 14px -2px var(--c)}.ccrow button.on{background:#f2ede4;color:#050506;border-color:transparent}
.cvdim{opacity:.14!important;filter:grayscale(1) blur(1px);transition:opacity .6s,filter .6s}.cvhit{opacity:1!important;filter:none!important;transition:opacity .6s,filter .6s}
.cvhit img{box-shadow:0 0 0 2px var(--hc,#e8905a),0 14px 50px -10px var(--hc,#e8905a)}#cvccount{font-size:12px;color:#a8a39a;margin:-4px 0 10px;min-height:16px}`;
  document.head.appendChild(css);

  /* ---------- Tonight ---------- */
  const TIME = [["Quick · under 100 min", { "with_runtime.lte": 100, "with_runtime.gte": 60 }], ["Regular · about two hours", { "with_runtime.gte": 100, "with_runtime.lte": 140 }], ["Epic · 2½ hours or more", { "with_runtime.gte": 141 }], ["Any length", {}]];
  const MOOD = [["Feel-good", "35|10749"], ["Edge of my seat", "53|28"], ["Mind-bending", "878|9648"], ["Dark & gritty", "80|27"], ["Epic & grand", "12|14|10752"], ["Surprise me", ""]];
  const LANG = [["Hindi", "hi"], ["English", "en"], ["Any language", ""]];
  let tn = null;
  function tonight() {
    if (tn) return; const pick = {}; let pool = [], seen = new Set();
    tn = document.createElement("div"); tn.className = "tn"; tn.setAttribute("role", "dialog"); tn.setAttribute("aria-label", "Tonight");
    document.body.append(tn); document.body.style.overflow = "hidden";
    const close = () => { tn.remove(); tn = null; document.body.style.overflow = ""; document.removeEventListener("keydown", esck) }, esck = e => { if (e.key === "Escape") close() }; document.addEventListener("keydown", esck);
    const frame = (k, q, opts) => { tn.innerHTML = `<button class="tx" type="button" aria-label="Close">×</button><small>TONIGHT · ${k}/3</small><h2>${q}</h2><div class="opts">${opts.map((o, i) => `<button type="button" data-i="${i}" style="animation-delay:${.08 * i}s">${esc(o[0])}</button>`).join("")}</div>`; tn.querySelector(".tx").onclick = close };
    const ask = (k, q, opts, key) => new Promise(r => { frame(k, q, opts); tn.querySelector(".opts").onclick = e => { const b = e.target.closest("[data-i]"); if (b) { pick[key] = opts[+b.dataset.i]; r() } } });
    async function fill() {
      const q = { sort_by: "popularity.desc", "vote_count.gte": 400, "vote_average.gte": 6.4, page: 1 + Math.floor(Math.random() * 4), include_adult: false, ...pick.time[1] };
      if (pick.mood[1]) q.with_genres = pick.mood[1]; if (pick.lang[1]) q.with_original_language = pick.lang[1];
      const d = await api("/discover/movie", q); pool = (d.results || []).filter(m => m.poster_path && !seen.has(m.id)).sort(() => Math.random() - .5);
    }
    async function show() {
      if (!pool.length) { tn.innerHTML = `<button class="tx" type="button">×</button><small>TONIGHT</small><h2>Finding something worth your night…</h2>`; tn.querySelector(".tx").onclick = close; try { await fill(); if (!pool.length) await fill() } catch (e) {} }
      if (!tn) return; const m = pool.shift();
      if (!m) { tn.innerHTML = `<button class="tx" type="button">×</button><small>TONIGHT</small><h2>Nothing matched that mood. Try another?</h2><div class="tnr"><button class="go" type="button" id="tr">Start over</button></div>`; tn.querySelector(".tx").onclick = close; tn.querySelector("#tr").onclick = start; return }
      seen.add(m.id); tn.style.setProperty("--tg", "#" + ((m.id * 2654435761 >>> 0) % 0xffffff).toString(16).padStart(6, "0").replace(/^(..)(..)(..)$/, (a, r, g, b) => [r, g, b].map(v => (128 + (parseInt(v, 16) >> 1)).toString(16)).join("")));
      tn.innerHTML = `<button class="tx" type="button" aria-label="Close">×</button><small>TONIGHT, WATCH THIS</small><div class="res"><img alt="" src="${IMG}w500${m.poster_path}"><div><em>${esc((m.release_date || "").slice(0, 4))} · ★ ${(m.vote_average || 0).toFixed(1)} · ${esc(pick.time[0].split(" · ")[0])}</em><h3>${esc(m.title)}</h3><p>${esc(m.overview || "")}</p><div class="tnr"><button class="go" type="button" data-a="d">See details</button><button type="button" data-a="n">Another</button><button type="button" data-a="s">Start over</button></div></div></div>`;
      tn.querySelector(".tx").onclick = close;
      tn.querySelector(".tnr").onclick = e => { const a = (e.target.closest("[data-a]") || {}).dataset; if (!a) return; if (a.a === "d") { close(); try { openDetail("movie", m.id) } catch (x) {} } else if (a.a === "n") show(); else start() };
    }
    async function start() { pool = []; await ask(1, "How much time<br>do you have?", TIME, "time"); await ask(2, "What are you<br>in the mood for?", MOOD, "mood"); await ask(3, "Which language<br>tonight?", LANG, "lang"); show() }
    start();
  }
  window.CVTonight = { open: tonight };

  /* ---------- Colour spotlight (Browse) ---------- */
  const FAM = [["Crimson", 15, "#c0293b"], ["Amber", 40, "#e8905a"], ["Gold", 65, "#d9ac3d"], ["Olive", 95, "#8c9a3b"], ["Emerald", 160, "#3f9a6a"], ["Teal", 200, "#2f8c9c"], ["Azure", 245, "#3a76c4"], ["Indigo", 275, "#4b3fa0"], ["Violet", 320, "#8c3b9c"], ["Rose", 345, "#c9507a"]];
  const famCache = new Map(); let cur = "", tok = 0;
  const tiny = u => u.replace(/\/w\d+\//, "/w92/");
  function family(src) {
    const u = tiny(src); if (famCache.has(u)) return famCache.get(u);
    const p = new Promise(res => {
      const im = new Image(); im.crossOrigin = "anonymous";
      im.onload = () => { try {
        const c = document.createElement("canvas"); c.width = 16; c.height = 24; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0, 16, 24); const px = x.getImageData(0, 0, 16, 24).data, w = new Array(FAM.length).fill(0); let tot = 0;
        for (let i = 0; i < px.length; i += 4) { const R = px[i], G = px[i + 1], B = px[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn; if (mx < 40 || d / mx < .28) continue; let h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h = (h * 60 + 360) % 360; const k = FAM.findIndex(f => h < f[1]); w[k < 0 ? 0 : k] += (d / mx) * (mx / 255); tot += 1 }
        res(tot < 24 ? "Noir" : FAM[w.indexOf(Math.max(...w))][0]);
      } catch (e) { res(null) } };
      im.onerror = () => res(null); im.src = u;
    });
    famCache.set(u, p); return p;
  }
  async function spotlight(name) {
    const my = ++tok; document.querySelectorAll(".cvhit,.cvdim").forEach(e => e.classList.remove("cvhit", "cvdim")); const cards = [...document.querySelectorAll("#browse .card, #rows .card")].filter(cd => cd.offsetParent), hex = (FAM.find(f => f[0] === name) || [0, 0, "#cfc9bd"])[2];
    if (!name) { cards.forEach(cd => cd.classList.remove("cvhit", "cvdim")); const c0 = document.getElementById("cvccount"); if (c0) c0.textContent = ""; return }
    const fams = await Promise.all(cards.map(cd => { const im = cd.querySelector("img"); return im && (im.currentSrc || im.src) ? family(im.currentSrc || im.src) : null }));
    if (my !== tok) return; let n = 0;
    cards.forEach((cd, i) => { cd.classList.remove("cvhit", "cvdim"); const f = fams[i]; if (f === null) return; if (f === name) { cd.classList.add("cvhit"); cd.style.setProperty("--hc", hex); n++ } else cd.classList.add("cvdim") });
    const ct = document.getElementById("cvccount"); if (ct) ct.textContent = `${n} title${n === 1 ? "" : "s"} glow in ${name}`;
  }
  function colourRow() {
    const br = document.getElementById("browse"), g = document.getElementById("bgrid"); if (!br || !g || document.getElementById("cvcrow")) return;
    const row = document.createElement("div"); row.id = "cvcrow"; row.className = "ccrow"; row.setAttribute("role", "group"); row.setAttribute("aria-label", "Filter by colour");
    row.innerHTML = `<b>COLOUR</b>` + [...FAM.map(f => [f[0], f[2]]), ["Noir", "#2b2b2f"]].map(f => `<button type="button" data-c="${f[0]}" style="--c:${f[1]}"><i style="background:${f[1]}"></i>${f[0]}</button>`).join("");
    const ct = document.createElement("div"); ct.id = "cvccount"; g.before(row); g.before(ct);
    row.onclick = e => { const b = e.target.closest("[data-c]"); if (!b) return; const same = cur === b.dataset.c; cur = same ? "" : b.dataset.c; row.querySelectorAll("button").forEach(x => x.classList.toggle("on", x.dataset.c === cur)); spotlight(cur) };
    let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => cur && spotlight(cur), 400) }).observe(g, { childList: true });
    g.addEventListener("load", () => { clearTimeout(t); t = setTimeout(() => cur && spotlight(cur), 300) }, true);
  }
  document.addEventListener("DOMContentLoaded", colourRow); setTimeout(colourRow, 800);

  /* ---------- Release reminder ---------- */
  const ymd = s => s.replace(/-/g, ""), next = s => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, "") };
  function remind(d, t) {
    const today = new Date().toISOString().slice(0, 10), date = t === "tv" ? ((d.next_episode_to_air || {}).air_date || d.first_air_date || "") : (d.release_date || "");
    const act = document.querySelector("#mc .act"); if (!act || !date || date <= today || document.getElementById("cvrem")) return;
    const title = d.title || d.name || "", b = document.createElement("button"); b.className = "pill"; b.id = "cvrem"; b.type = "button"; b.innerHTML = `<span>Remind me · ${new Date(date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>`;
    b.onclick = () => {
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Parda//EN", "BEGIN:VEVENT", "UID:" + t + (d.id) + "@" + location.host, "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", "DTSTART;VALUE=DATE:" + ymd(date), "DTEND;VALUE=DATE:" + next(date), "SUMMARY:" + (t === "tv" ? "New on" : "Releases:") + " " + title.replace(/[,;\n]/g, " "), "DESCRIPTION:Added from Parda - " + location.origin, "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + title.replace(/[,;\n]/g, " ") + " is out today", "TRIGGER:PT9H", "END:VALARM", "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + title.replace(/[,;\n]/g, " ") + " is out tomorrow", "TRIGGER:-PT15H", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      const u = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })), a = document.createElement("a"); a.href = u; a.download = "parda-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".ics"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      b.innerHTML = `<span>Calendar file ready ✓</span>`;
    };
    act.append(b);
  }
  const hook = () => { const o = window.CVMood; if (!o || o._x) return; const w = function (d, t) { try { remind(d, t) } catch (e) {} return o.apply(this, arguments) }; w._x = 1; window.CVMood = w };
  hook(); document.addEventListener("DOMContentLoaded", hook); setTimeout(hook, 1200);
})();
