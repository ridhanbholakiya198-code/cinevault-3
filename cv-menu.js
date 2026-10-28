// Parda — full-screen menu behind the menu button next to the profile icon.
// Opens as a curtain (cv-curtain.css) over the film that is on screen. Touch or hover an item and the
// still behind it changes to a film from that section, with the site's colour following the film.
// Uses the site's overlay stack (CVA.ov) so the Android back button closes it.
(function () {
  const btn = document.getElementById("mnu"); if (!btn) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const mob = () => innerWidth < 700;
  let ov = null, closing = false, layers = [], active = null, tok = 0, acc0 = "", heroCap = "", heroOK = false;
  const go = k => () => { const l = document.querySelector('nav [data-v="' + k + '"]'); l && l.click() };

  function items() {
    const acc = document.getElementById("acc"), signed = acc && acc.classList.contains("in");
    return [
      { n: "Movies", k: "movies", a: go("movies") },
      { n: "Series", k: "series", a: go("series") },
      { n: "Anime", k: "anime", a: go("anime") },
      { n: "Browse", k: "browse", a: go("browse") },
      { n: "My list", k: "list", a: go("list") },
      { n: "Tonight", a: () => window.CVTonight && CVTonight.open() },
      { n: "Sound · " + (window.CVSound ? CVSound.label() : "Off"), a: () => window.CVSound && CVSound.cycle() },
      { n: "Add-ons", a: () => window.CVA && CVA.addons && CVA.addons() },
      { n: signed ? "Profile" : "Sign in", a: () => acc && acc.click() },
    ];
  }

  // ---------- what to show behind each item ----------
  // one film per section, picked once per visit from the same TMDB feeds the site uses. Phones get the poster, big screens the backdrop.
  const FEEDS = {
    movies: ["/trending/movie/week", {}],
    series: ["/trending/tv/week", {}],
    anime: ["/discover/tv", { with_original_language: "ja", with_genres: 16, sort_by: "popularity.desc" }],
    browse: ["/movie/top_rated", {}],
  };
  const cache = {}, res = {}, cols = {};
  const size = () => mob() ? "w500" : "w780";
  function entry(it) {
    const path = mob() ? (it.poster_path || it.poster) : it.backdrop_path; if (!path) return null;
    const y = String(it.release_date || it.first_air_date || it.year || "").slice(0, 4);
    return { url: IMG + size() + path, cap: [it.title || it.name, y].filter(Boolean).join(", "), pp: it.poster_path || it.poster || "" };
  }
  const load = e => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(e); im.onerror = () => no(new Error("img")); im.src = e.url });
  function pick(key) {
    if (key === "list") { // the last film they saved: no network needed (phones only: saved items keep a poster, not a backdrop)
      try {
        const L = Object.values(JSON.parse(localStorage.getItem("cv_list") || "{}")).filter(x => x && (x.poster_path || x.poster)).sort((a, b) => (b.u || 0) - (a.u || 0));
        const e = L[0] && mob() ? entry(L[0]) : null; if (!e) return Promise.reject(new Error("none"));
        return load(e).then(x => res.list = x);
      } catch (er) { return Promise.reject(er) }
    }
    if (cache[key]) return cache[key];
    if (typeof api !== "function" || typeof IMG === "undefined" || !FEEDS[key]) return Promise.reject(new Error("no api"));
    return cache[key] = api(FEEDS[key][0], FEEDS[key][1]).then(j => {
      const r = (j.results || []).filter(x => mob() ? x.poster_path : x.backdrop_path).slice(0, 8);
      const e = r.length && entry(r[Math.floor(Math.random() * r.length)]); if (!e) throw new Error("empty");
      return load(e).then(x => res[key] = x);
    }).catch(er => { delete cache[key]; throw er });
  }

  // ---------- the backdrop: a hero layer plus two layers that crossfade between swaps ----------
  function show(l) { layers.forEach(x => x.classList.toggle("in", x === l)); active = l }
  function setCap(t) {
    const c = ov && ov.querySelector(".cvn-n"); if (!c || (c.dataset.t || "") === t) return;
    c.dataset.t = t; c.classList.add("sw");
    setTimeout(() => { c.textContent = t; c.classList.remove("sw") }, 150);
  }
  function accent(pp) {
    if (!pp || typeof dominant !== "function") return; const my = tok;
    (cols[pp] ? Promise.resolve(cols[pp]) : dominant(pp).then(c => cols[pp] = c)).then(c => { if (c && ov && tok === my) root.style.setProperty("--accent", c) }).catch(() => { });
  }
  function restoreAccent() { acc0 ? root.style.setProperty("--accent", acc0) : root.style.removeProperty("--accent") }
  function revert() {
    tok++; if (!ov) return;
    if (heroOK) show(layers[0]); else if (active) { active.classList.remove("in"); active = null }
    setCap(heroCap); restoreAccent();
  }
  function swap(key) {
    if (!ov) return; if (!key) return revert();
    const my = ++tok, e = res[key];
    if (!e) { pick(key).then(() => { if (tok === my && ov) swap(key) }).catch(() => { if (tok === my && ov) revert() }); return } // not loaded yet: show it as soon as it is, if still wanted
    const L = layers[1] === active ? layers[2] : layers[1];
    L.style.backgroundImage = `url("${e.url}")`; L.style.backgroundPosition = mob() ? "50% 18%" : "50% 30%";
    show(L); setCap(e.cap); accent(e.pp);
  }

  function nowShowing() {
    const on = document.querySelector("#hbgs .hbg.on"), bg = on && on.style.backgroundImage;
    const t = document.getElementById("htitle"), im = t && t.querySelector("img");
    const name = t ? (im ? im.alt : t.textContent) : "";
    // hero meta is "rating . year . runtime . genre" joined by .dot separators: pick the segment that is a year
    const segs = [""]; ((document.getElementById("hmeta") || { childNodes: [] }).childNodes).forEach(n => { if (n.nodeType === 1 && n.classList.contains("dot")) segs.push(""); else segs[segs.length - 1] += n.textContent });
    const y = segs.map(s => s.trim()).find(s => /^(?:19|20)\d{2}$/.test(s));
    return { bg: bg && bg !== "none" ? bg : "", pos: (on && on.style.backgroundPosition) || "", cap: [String(name || "").trim(), y].filter(Boolean).join(", ") };
  }

  function open() {
    if (ov || !window.CVA || !CVA.ov) return;
    const list = items(), now = nowShowing();
    closing = false; tok = 0; active = null; heroCap = now.cap; heroOK = !!now.bg; acc0 = root.style.getPropertyValue("--accent");
    ov = CVA.ov.open("menu", "cvn");
    ov._onclose = () => { tok++; restoreAccent(); ov = null; closing = false; layers = []; active = null; btn.classList.remove("on"); btn.setAttribute("aria-expanded", "false") };
    ov.querySelector(".cva-box").innerHTML =
      `<div class="cvn-t"><button type="button" class="cvn-logo" data-m="h" aria-label="Home">PARDA</button><button type="button" class="cvn-x" data-m="x" aria-label="Close menu"><i></i><i></i></button></div>` +
      `<ul class="cvn-l">${list.map((it, i) => `<li style="--i:${i}"><button type="button" data-m="${i}"><b>${esc(it.n)}</b></button></li>`).join("")}</ul>` +
      `<div class="cvn-f"><div><p class="cvn-n" data-t="${esc(now.cap)}">${esc(now.cap)}</p><span>&copy; ${new Date().getFullYear()} Parda</span></div><nav><a href="/about.html">About</a><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a><a href="/cookies.html">Cookies</a></nav></div>`;
    // the film still (three layers) and a glow sit behind the menu; the curtain and its seam of light sit in front
    ov.insertAdjacentHTML("afterbegin", '<i class="cc-b"></i><i class="cc-b"></i><i class="cc-b"></i><i class="cc-g"></i>');
    ov.insertAdjacentHTML("beforeend", '<i class="cc-p cc-l"></i><i class="cc-p cc-r"></i><i class="cc-s"></i>');
    layers = [...ov.querySelectorAll(".cc-b")];
    if (heroOK) { const b = layers[0]; b.style.backgroundImage = now.bg; if (now.pos) b.style.backgroundPosition = now.pos; b.classList.add("first"); void b.offsetWidth; show(b); setTimeout(() => b.classList.remove("first"), 2200) }
    btn.classList.add("on"); btn.setAttribute("aria-expanded", "true");
    try { navigator.vibrate && navigator.vibrate(10) } catch (e) { }

    // warm up the stills for each section while the curtain opens (skipped on Data Saver)
    const sv = navigator.connection && navigator.connection.saveData;
    if (!sv) setTimeout(() => list.forEach(it => it.k && pick(it.k).catch(() => { })), 350);

    const key = i => (list[i] || {}).k, idx = t => { const b = t.closest && t.closest(".cvn-l [data-m]"); return b ? +b.dataset.m : -1 };
    ov.addEventListener("click", e => {
      const b = e.target.closest("[data-m]"); if (!b) return;
      if (b.dataset.m === "x") return shut();
      if (b.dataset.m === "h") return shut(go("home"));
      const it = list[+b.dataset.m]; shut(() => it && it.a());
    });
    const lst = ov.querySelector(".cvn-l");
    lst.addEventListener("pointerdown", e => { const i = idx(e.target); if (i >= 0) swap(key(i)) });
    lst.addEventListener("pointercancel", () => revert());
    lst.addEventListener("pointerover", e => { if (e.pointerType !== "mouse") return; const i = idx(e.target); if (i >= 0) swap(key(i)) });
    lst.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") revert() });
    lst.addEventListener("focusin", e => { const i = idx(e.target); if (i >= 0) swap(key(i)) });
    lst.addEventListener("focusout", () => revert());
  }

  function shut(after) {
    if (!ov || closing) return;
    closing = true;
    const el = ov, fast = !!after;
    // close the curtain from wherever it currently is, even if it is still opening
    el.querySelectorAll(".cc-p").forEach(p => {
      try { p.style.setProperty("--f", new DOMMatrix(getComputedStyle(p).transform).m41 + "px") } catch (e) { }
    });
    el.classList.add("out"); if (fast) el.classList.add("fast");
    const ms = calm.matches ? 160 : fast ? 440 : 640;
    setTimeout(() => { CVA.ov.close(el); if (after) setTimeout(after, 20) }, ms);
  }
  btn.addEventListener("click", () => ov ? shut() : open());
})();
