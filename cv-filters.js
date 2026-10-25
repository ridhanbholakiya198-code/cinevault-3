/* Parda — Browse filters: mood chips, filter sheet (genre, year, rating, runtime, language, streaming, in cinemas),
   live result count, active-filter chips. Works for everyone (no login). Uses app.js globals: api, filt, $, esc, REG. */
(function () {
  const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10), Y = new Date().getFullYear();
  const PK = "cv_flt_prefs", reg = () => (typeof REG !== "undefined" && REG) || "IN";
  const blank = () => ({ t: "", g: [], y: "", r: "", rt: "", l: "", p: [], cin: 0, mood: "" });
  let S = blank();
  try { const p = JSON.parse(localStorage.getItem(PK) || "{}"); if (p.l) S.l = p.l; if (Array.isArray(p.p)) S.p = p.p } catch { }
  const keep = () => { try { localStorage.setItem(PK, JSON.stringify({ l: S.l, p: S.p })) } catch { } };

  const MOODS = [
    ["gems", "Hidden gems", { p: { "vote_average.gte": 7.5, "vote_count.gte": 200, "vote_count.lte": 3500 } }],
    ["edge", "Edge of seat", { g: { movie: "53|27", tv: "9648|80" }, p: { "vote_average.gte": 6.3, "vote_count.gte": 150 } }],
    ["mind", "Mind-bending", { g: { movie: "878|9648", tv: "10765|9648" }, p: { "vote_average.gte": 6.5, "vote_count.gte": 150 } }],
    ["feel", "Feel-good", { g: { movie: "35|10751|10749", tv: "35|10751" }, p: { "vote_average.gte": 6.3, "vote_count.gte": 100 } }],
    ["quick", "Quick watch", { rt: { movie: [60, 100], tv: [0, 30] }, p: { "vote_average.gte": 6, "vote_count.gte": 100 } }],
    ["subs", "Worth the subtitles", { p: { with_origin_country: "KR|JP|IN|FR|ES|DE|IT|TR|CN|MX|BR|SE|DK|IR", "vote_average.gte": 7, "vote_count.gte": 200 } }],
    ["old", "Timeless", { old: 1, p: { "vote_average.gte": 7.5, "vote_count.gte": 1000 } }],
  ];
  const YEARS = [["new", "Last 12 months"], ["2020", "2020s"], ["2010", "2010s"], ["2000", "2000s"], ["1990", "90s"], ["1980", "80s"], ["old", "Before 1980"]];
  const RATES = [["6", "6+"], ["7", "7+"], ["8", "8+"], ["9", "9+"]];
  const RUNS = { movie: [["s", "Under 90 min", 0, 89], ["m", "90–120", 90, 120], ["l", "2–2½ hrs", 121, 150], ["x", "Epic 150+", 151, 400]], tv: [["s", "Under 30 min", 0, 30], ["m", "30–60", 31, 60], ["l", "Over 60", 61, 300]] };
  const LANGS = [["", "Any"], ["en", "English"], ["hi", "Hindi"], ["ko", "Korean"], ["ja", "Japanese"], ["ta", "Tamil"], ["te", "Telugu"], ["ml", "Malayalam"], ["kn", "Kannada"], ["bn", "Bengali"], ["mr", "Marathi"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["it", "Italian"], ["tr", "Turkish"], ["zh", "Chinese"], ["ru", "Russian"]];
  const PROV_FALLBACK = [[8, "Netflix"], [9, "Prime Video"], [122, "JioHotstar"], [232, "Zee5"], [237, "SonyLIV"], [350, "Apple TV+"]];

  const tabInfo = () => { const sg = $("#seg .on") ? $("#seg .on").dataset.t : "movie", an = sg === "anime"; return { an, t: an ? $("#asel").value : sg } };

  /* ---- build discover params from a state object ---- */
  function params(st, t, an, q) {
    const out = {}, tvs = t === "tv", d = tvs ? "first_air_date" : "primary_release_date", m = MOODS.find(x => x[0] === st.mood);
    let genres = [];
    const base = an ? ["16"] : [];
    if (st.g.length) genres = [...base, ...st.g]; else if (m && m[2].g && !an) genres = [m[2].g[t]]; else genres = base;
    if (genres.length) out.with_genres = genres.join(",");
    if (m) {
      Object.assign(out, m[2].p || {});
      if (m[2].rt) { const r = m[2].rt[t]; out["with_runtime.gte"] = r[0]; out["with_runtime.lte"] = r[1] }
      if (m[2].old) out[d + ".lte"] = "1989-12-31";
    }
    if (st.y) {
      if (st.y === "new") { out[d + ".gte"] = day(365); out[d + ".lte"] = day(0) }
      else if (st.y === "old") { delete out[d + ".gte"]; out[d + ".lte"] = "1979-12-31" }
      else { const a = +st.y; out[d + ".gte"] = a + "-01-01"; out[d + ".lte"] = (a + 9 >= Y ? day(0) : (a + 9) + "-12-31") }
    }
    if (st.r) { out["vote_average.gte"] = +st.r; out["vote_count.gte"] = Math.max(+out["vote_count.gte"] || 0, (q && q["vote_count.gte"]) || 0, 150) }
    if (st.rt) { const r = (RUNS[t] || RUNS.movie).find(x => x[0] === st.rt); if (r) { out["with_runtime.gte"] = r[2]; out["with_runtime.lte"] = r[3] } }
    if (st.l && !an) out.with_original_language = st.l;
    if (st.p.length) { out.with_watch_providers = st.p.join("|"); out.watch_region = (reg()); out.with_watch_monetization_types = "flatrate|free|ads" }
    if (st.cin && !tvs) { out["primary_release_date.gte"] = day(75); out["primary_release_date.lte"] = day(0); out.region = (reg()); out.with_release_type = "2|3" }
    if (q && q["primary_release_date.lte"] && out[d + ".lte"] && q[d + ".lte"] < out[d + ".lte"]) out[d + ".lte"] = q[d + ".lte"];
    return out;
  }

  /* ---- hook called from app.js filt() ---- */
  function extra(t, q, an) {
    if (S.t !== t) { S.t = t; S.g = []; S.mood = ""; S.cin = 0; S.rt = ""; paintMoods() }
    const gs = $("#gsel") && $("#gsel").value; if (gs && !an) { S.g = [gs]; $("#gsel").value = "" }
    const o = params(S, t, an, q); delete q.with_genres; Object.assign(q, o); paint(); return q;
  }

  /* ---- bar: Filters button, moods, active chips ---- */
  function mount() {
    const bar = $("#bar"); if (!bar || $("#cvf")) return;
    const el = document.createElement("div"); el.id = "cvf"; el.className = "cvf";
    el.innerHTML = '<div class="cvf-row"><button type="button" class="cvf-btn" data-cvo="open" aria-haspopup="dialog"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg><span>Filters</span><b hidden></b></button><div class="cvf-moods" role="toolbar" aria-label="Moods"></div></div><div class="cvf-act" hidden></div>';
    bar.after(el);
    el.addEventListener("click", e => {
      const o = e.target.closest("[data-cvo]"); if (o && o.dataset.cvo === "open") return openPanel();
      const m = e.target.closest("[data-cvm]"); if (m) { const k = m.dataset.cvm; S.mood = S.mood === k ? "" : k; if (S.mood && !tabInfo().an) S.g = []; return filt() }
      const x = e.target.closest("[data-cvx]"); if (x) { clearOne(x.dataset.cvx, x.dataset.cvv); return filt() }
      if (e.target.closest("[data-cvclear]")) { const p = { l: "", p: [] }; S = { ...blank(), t: S.t, ...p }; keep(); return filt() }
    });
    paintMoods();
  }
  function paintMoods() {
    const w = $("#cvf .cvf-moods"); if (!w) return;
    w.innerHTML = MOODS.map(m => `<button type="button" data-cvm="${m[0]}" class="${S.mood === m[0] ? "on" : ""}">${m[1]}</button>`).join("");
  }
  function label(k, v) {
    if (k === "g") return (genreNames[v] || "Genre"); if (k === "y") return (YEARS.find(x => x[0] === v) || [])[1] || v; if (k === "r") return v + "+ rating";
    if (k === "rt") { const t = tabInfo().t; return ((RUNS[t] || RUNS.movie).find(x => x[0] === v) || [])[1] || "Runtime" }
    if (k === "l") return (LANGS.find(x => x[0] === v) || [])[1] || v; if (k === "p") return provNames[v] || "Streaming"; if (k === "cin") return "In cinemas"; return v;
  }
  const genreNames = {}, provNames = {}; PROV_FALLBACK.forEach(p => provNames[p[0]] = p[1]);
  function chips(st) {
    const a = []; st.g.forEach(v => a.push(["g", v])); if (st.y) a.push(["y", st.y]); if (st.r) a.push(["r", st.r]); if (st.rt) a.push(["rt", st.rt]);
    if (st.l) a.push(["l", st.l]); st.p.forEach(v => a.push(["p", v])); if (st.cin) a.push(["cin", 1]); return a;
  }
  function clearOne(k, v) { if (k === "g") S.g = S.g.filter(x => String(x) !== String(v)); else if (k === "p") S.p = S.p.filter(x => String(x) !== String(v)); else if (k === "cin") S.cin = 0; else S[k] = ""; keep() }
  function paint() {
    const el = $("#cvf"); if (!el) return; paintMoods();
    const a = chips(S), act = el.querySelector(".cvf-act"), b = el.querySelector(".cvf-btn b");
    b.hidden = !a.length; b.textContent = a.length;
    act.hidden = !a.length; act.innerHTML = a.map(([k, v]) => `<button type="button" data-cvx="${k}" data-cvv="${esc(v)}">${esc(label(k, v))}<i>×</i></button>`).join("") + (a.length > 1 ? '<button type="button" class="clr" data-cvclear>Clear all</button>' : "");
  }

  /* ---- filter panel ---- */
  let D, cnt = 0, ovEl;
  const lists = {};
  async function genresOf(t) { if (lists["g" + t]) return lists["g" + t]; try { const r = await api(`/genre/${t}/list`); lists["g" + t] = r.genres; r.genres.forEach(g => genreNames[g.id] = g.name) } catch { lists["g" + t] = [] } return lists["g" + t] }
  async function provsOf(t) {
    const k = "p" + t + (reg()); if (lists[k]) return lists[k];
    try { const r = await api(`/watch/providers/${t}`, { watch_region: reg() }); const a = (r.results || []).sort((x, y) => (x.display_priority || 99) - (y.display_priority || 99)).slice(0, 14).map(p => [p.provider_id, p.provider_name]); lists[k] = a.length ? a : PROV_FALLBACK } catch { lists[k] = PROV_FALLBACK }
    lists[k].forEach(p => provNames[p[0]] = p[1]); return lists[k];
  }
  const C = (k, v, txt, on) => `<button type="button" class="cvf-c${on ? " on" : ""}" data-cvk="${k}" data-cvv="${esc(v)}">${esc(txt)}</button>`;
  async function openPanel() {
    const ov = window.CVA && window.CVA.ov; if (!ov) return setTimeout(openPanel, 400);
    const { t, an } = tabInfo(); D = { ...S, g: [...S.g], p: [...S.p], t };
    const [gen, prov] = await Promise.all([genresOf(t), provsOf(t)]);
    ovEl = ov.open("filters", "cv-flt"); const box = ovEl.querySelector(".cva-box");
    box.innerHTML = '<div class="cvf-h"><h3>Filters</h3><button type="button" class="cvf-rs" data-cvk="reset">Reset</button><button type="button" class="cvf-x" data-cvk="close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="cvf-body"></div><div class="cvf-f"><button type="button" class="cvf-go" data-cvk="apply">Show titles</button></div>';
    ovEl._onclose = () => { ovEl = null };
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-cvk]"); if (!b) return; const k = b.dataset.cvk, v = b.dataset.cvv;
      if (k === "close") return ov.close(ovEl);
      if (k === "apply") { S = { ...D }; keep(); ov.close(ovEl); return filt() }
      if (k === "reset") { D = { ...blank(), t }; return draw() }
      if (k === "g") { const i = D.g.map(String).indexOf(v); i < 0 ? D.g.push(v) : D.g.splice(i, 1); const mm = MOODS.find(m => m[0] === D.mood); if (mm && mm[2].g) D.mood = "" }
      else if (k === "p") { const n = +v, i = D.p.indexOf(n); i < 0 ? D.p.push(n) : D.p.splice(i, 1) }
      else if (k === "cin") D.cin = D.cin ? 0 : 1;
      else D[k] = D[k] === v ? "" : v;
      draw();
    });
    let ct;
    draw(); function draw() {
      const body = box.querySelector(".cvf-body");
      const sec = (h, inner, note) => `<section><h4>${h}${note ? `<small>${note}</small>` : ""}</h4><div class="cvf-w">${inner}</div></section>`;
      let h = sec("Genre", gen.map(g => C("g", g.id, g.name, D.g.map(String).includes(String(g.id)))).join(""));
      if (t === "movie" && !an) h += sec("In cinemas", C("cin", 1, "Playing now near you", D.cin), "movies only");
      h += sec("Streaming on", prov.map(p => C("p", p[0], p[1], D.p.includes(+p[0]))).join(""), "in " + (reg()));
      h += sec("Year", YEARS.map(y => C("y", y[0], y[1], D.y === y[0])).join(""));
      h += sec("Rating", RATES.map(y => C("r", y[0], y[1], D.r === y[0])).join(""), "TMDB");
      h += sec("Length", (RUNS[t] || RUNS.movie).map(y => C("rt", y[0], y[1], D.rt === y[0])).join(""), t === "tv" ? "per episode" : "");
      if (!an) h += sec("Language", LANGS.map(y => C("l", y[0], y[1], D.l === y[0] || (!D.l && y[0] === ""))).join(""));
      body.innerHTML = h; count();
    }
    function count() {
      const go = box.querySelector(".cvf-go"); go.classList.add("busy"); clearTimeout(ct);
      ct = setTimeout(async () => {
        try { const q = params(D, t, an, { "vote_count.gte": 0 }); if (!q["vote_count.gte"]) q["vote_count.gte"] = 20; if (an) q.with_original_language = q.with_original_language || ($("#lsel") ? $("#lsel").value : "") || undefined;
          const r = await api("/discover/" + t, { ...q, sort_by: "popularity.desc", page: 1 }); if (!ovEl) return; const n = r.total_results || 0; go.classList.remove("busy"); go.disabled = !n;
          go.textContent = n ? `Show ${n > 9999 ? "10,000+" : n.toLocaleString("en-US")} title${n === 1 ? "" : "s"}` : "No titles — loosen a filter" } catch { go.classList.remove("busy"); go.textContent = "Show titles" }
      }, 280);
    }
  }
  window.CVF = { extra, mount, S: () => S };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
