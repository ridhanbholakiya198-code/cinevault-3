// CineVault — user-provided add-ons (Stremio protocol).
// CineVault ships NO add-on. Each user pastes their own manifest URL (saved to users/{uid}/addons).
// Only HTTPS direct video / HLS, YouTube and external links are used. Torrent / info-hash entries are ignored on purpose.
// Loaded by auth.js, which passes in its own Firebase + overlay helpers.

const HLS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js";

export function initAddons(h) {
  const { esc, say, openOv, closeOv, state, ready, hasHint, TOP } = h;

  /* ---------- helpers ---------- */
  const httpsUrl = u => { try { const x = new URL(u); return x.protocol === "https:" ? x.toString() : null } catch { return null } };

  function normalizeManifestUrl(input) {
    const raw = String(input || "").trim().replace(/^stremio:\/\//i, "https://");
    let url; try { url = new URL(raw) } catch { throw new Error("That is not a valid URL.") }
    if (url.protocol !== "https:") throw new Error("Only https:// add-on URLs are supported.");
    if (!url.pathname.endsWith("/manifest.json")) throw new Error("The URL must end with /manifest.json");
    if (url.search || url.hash) throw new Error("Remove everything after manifest.json (the ? or # part).");
    const out = url.toString();
    if (out.length > 500) throw new Error("That URL is too long.");
    return out;
  }
  const baseOf = m => m.replace(/\/manifest\.json$/, "");

  async function getJson(url, ms = 8000) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(url, { signal: c.signal });
      if (!r.ok) throw new Error("The add-on answered with HTTP " + r.status + ".");
      return await r.json();
    } finally { clearTimeout(t) }
  }
  async function manifestOf(url) {
    let m;
    try { m = await getJson(url) }
    catch (e) { throw new Error(e && e.name === "AbortError" ? "The add-on took too long to answer." : (e && e.message && !(e instanceof TypeError) ? e.message : "Couldn’t reach the add-on. It may be offline or may not allow browser access (CORS).")) }
    if (!m || typeof m.id !== "string" || typeof m.name !== "string" || !Array.isArray(m.resources)) throw new Error("That URL did not return a valid add-on manifest.");
    return m;
  }
  async function addonId(url) { // same URL twice = same doc, no duplicates
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
    return [...new Uint8Array(b)].slice(0, 10).map(x => x.toString(16).padStart(2, "0")).join("");
  }

  // Wait for Firebase + the signed-in user. Resolves {user, db, fs} (user may be null).
  async function session() {
    await ready();
    const s = state();
    try { await s.auth.authStateReady() } catch { }
    return { user: s.auth.currentUser, db: s.db, fs: s.fs };
  }

  /* ---------- styles ---------- */
  function css() {
    if (document.getElementById("cv-ad-css")) return;
    const s = document.createElement("style"); s.id = "cv-ad-css";
    s.textContent = `
.cv-ad-l{margin-top:14px;display:grid;gap:8px}
.cv-ad-i{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#ffffff0a;border:1px solid #ffffff14;border-radius:12px}
.cv-ad-i b{display:block;font:500 15px "DM Sans";color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cv-ad-i small{color:var(--mute);font-size:12px}
.cv-ad-i button{flex:none;background:none;border:1px solid #ffffff26;color:var(--mute);border-radius:99px;padding:5px 12px;font:500 13px "DM Sans";cursor:pointer}
.cv-ad-h{margin:14px 0 0;font:500 12px "DM Sans";letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.cv-ad-s{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.cv-ad-b{text-align:left;max-width:100%;padding:9px 13px;background:#ffffff0a;border:1px solid #ffffff1f;border-radius:12px;color:var(--fg);font:500 14px "DM Sans";cursor:pointer}
.cv-ad-b:hover,.cv-ad-b:focus-visible{border-color:var(--accent);outline:0}
.cv-ad-b span{display:block;max-width:15rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cv-ad-b small{display:block;color:var(--mute);font-size:12px}
.cv-ad-st{margin-top:12px;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden}
.cv-ad-st video,.cv-ad-st iframe{display:block;width:100%;height:100%;border:0;background:#000}`;
    document.head.append(s);
  }

  /* ---------- manager (profile → Extensions / Add-ons) ---------- */
  function open() {
    if (document.querySelector('.cva[data-id="addons"]')) return;
    css();
    const el = openOv("addons"), box = el.querySelector(".cva-box");
    box.innerHTML = `${TOP}<h3 class="cva-h">Add-ons</h3><p class="cva-s">Bring your own</p>
<p class="cva-p">CineVault comes with no add-ons. Paste the manifest URL of one you chose yourself. Only add services you trust and are allowed to use.</p>
<form class="cv-ad-f" novalidate hidden><label class="cva-f"><span>Add-on URL</span><input name="url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…/manifest.json"></label><button class="cva-btn" type="submit">Add</button></form>
<div class="cva-msg" hidden></div><div class="cv-ad-l"></div>`;
    const form = box.querySelector("form"), list = box.querySelector(".cv-ad-l"), btn = form.querySelector("button");
    const msg = (t, ok) => { const m = box.querySelector(".cva-msg"); m.className = "cva-msg " + (ok ? "good" : "bad"); m.textContent = t; m.hidden = !t };
    const fail = e => msg(e && e.code === "permission-denied" ? "Couldn’t save: the database rules don’t allow add-ons yet (publish the updated firestore.rules)." : (e && e.message) || "Something went wrong.");

    async function render() {
      const { user, db, fs } = await session(); if (!user) return;
      const snap = await fs.getDocs(fs.collection(db, "users", user.uid, "addons"));
      list.innerHTML = snap.empty ? `<p class="cva-p">No add-ons yet.</p>` : `<p class="cv-ad-h">Your add-ons</p>` + snap.docs.map(d => {
        const a = d.data(); let host = ""; try { host = new URL(a.manifestUrl).host } catch { }
        return `<div class="cv-ad-i"><div style="min-width:0"><b>${esc(a.name || "Add-on")}</b><small>${esc(host)}</small></div><button type="button" data-rm="${esc(d.id)}">Remove</button></div>`; // host only: the URL may contain private settings
      }).join("");
    }

    el.addEventListener("click", async e => {
      if (e.target.closest('[data-a="close"]')) return closeOv(el);
      const rm = e.target.closest("[data-rm]"); if (!rm) return;
      rm.disabled = true;
      try { const { user, db, fs } = await session(); await fs.deleteDoc(fs.doc(db, "users", user.uid, "addons", rm.dataset.rm)); await render() } catch (err) { rm.disabled = false; fail(err) }
    });

    form.addEventListener("submit", async e => {
      e.preventDefault(); msg(""); btn.disabled = true; btn.textContent = "Checking…";
      try {
        const { user, db, fs } = await session(); if (!user) throw new Error("Sign in first to save add-ons.");
        const url = normalizeManifestUrl(form.url.value), m = await manifestOf(url), id = await addonId(url);
        await fs.setDoc(fs.doc(db, "users", user.uid, "addons", id), { name: m.name.slice(0, 200), manifestUrl: url, baseUrl: baseOf(url), createdAt: fs.serverTimestamp() });
        form.url.value = ""; msg("Added “" + m.name + "”", 1); await render();
      } catch (err) { fail(err) } finally { btn.disabled = false; btn.textContent = "Add" }
    });

    session().then(({ user }) => {
      if (!document.body.contains(el)) return;
      if (!user) { msg("Sign in to save add-ons to your account."); return }
      form.hidden = false; render().catch(fail);
    }).catch(() => msg("Couldn’t reach the sign-in service."));
  }

  /* ---------- streams for the details page ---------- */
  function classify(s, addon, key) {
    if (!s || typeof s !== "object") return null;
    const label = String(s.title || s.name || addon || "Play").split("\n")[0].slice(0, 80);
    const base = { key, label, addon };
    if (typeof s.url === "string" && !/^magnet:/i.test(s.url)) {
      const u = httpsUrl(s.url);
      if (u && !(s.behaviorHints && s.behaviorHints.notWebReady)) return { ...base, kind: "direct", url: u };
    }
    if (typeof s.ytId === "string" && /^[\w-]{11}$/.test(s.ytId)) return { ...base, kind: "youtube", id: s.ytId };
    if (typeof s.externalUrl === "string") {
      const u = httpsUrl(s.externalUrl);
      if (u) return { ...base, kind: "external", url: u };
    }
    if (typeof s.infoHash === "string" && /^[a-f0-9]{40}$/i.test(s.infoHash)) {
      const magnet = (s.url && /^magnet:/i.test(s.url)) ? s.url : buildMagnet(s.infoHash, s.sources, label);
      return { ...base, kind: "torrent", infoHash: s.infoHash, magnet };
    }
    return null;
  }

  function buildMagnet(hash, sources, name) {
    const tr = (sources || []).map(s => String(s).replace(/^tracker:/i, "")).filter(Boolean)
      .map(t => "&tr=" + encodeURIComponent(t)).join("");
    return "magnet:?xt=urn:btih:" + hash + "&dn=" + encodeURIComponent(name || "video") + tr;
  }

  async function streams(el, o) {
    if (!el) return;
    o = o || {};
    const type = o.type === "tv" || o.type === "series" ? "series" : "movie", tok = el._tok = (el._tok || 0) + 1;
    el.innerHTML = "";
    if (!/^tt\d{5,10}$/.test(String(o.imdbId || ""))) return;
    if (type === "series" && !(+o.season >= 0 && +o.episode >= 1)) return;
    if (!state().auth && !hasHint()) return;           // guests never load Firebase
    try {
      const { user, db, fs } = await session(); if (!user || tok !== el._tok) return;
      const snap = await fs.getDocs(fs.collection(db, "users", user.uid, "addons")); if (snap.empty) return;
      const id = type === "series" ? `${o.imdbId}:${+o.season}:${+o.episode}` : o.imdbId;
      const groups = await Promise.all(snap.docs.map(async d => {
        const a = d.data(), base = httpsUrl(a.baseUrl); if (!base) return [];
        try { const j = await getJson(`${base.replace(/\/$/, "")}/stream/${type}/${encodeURIComponent(id)}.json`); return (Array.isArray(j && j.streams) ? j.streams : []).map((s, i) => classify(s, a.name || "Add-on", d.id + "-" + i)).filter(Boolean) }
        catch { return [] } // one dead add-on never breaks the rest
      }));
      const all = groups.flat(); if (!all.length || tok !== el._tok) return;
      css();
      el.innerHTML = `<div class="eh"><h3>From your add-ons</h3></div><div class="cv-ad-s">${all.map((s, i) => `<button type="button" class="cv-ad-b" data-i="${i}"><span>${esc(s.label)}</span><small>${esc(s.addon)}${s.kind === "external" ? " · opens a new tab" : ""}</small></button>`).join("")}</div>`;
      el.onclick = e => { const b = e.target.closest("[data-i]"); if (b) play(all[+b.dataset.i]) };
    } catch { /* add-ons are optional; stay silent */ }
  }

  /* ---------- player (HLS.js / native video / YouTube) ---------- */
  let hlsP = null;
  const loadHls = () => window.Hls ? Promise.resolve(window.Hls) : (hlsP ||= new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = HLS_SRC; s.async = true;
    s.onload = () => res(window.Hls); s.onerror = () => { hlsP = null; s.remove(); rej(new Error("hls")) }; document.head.append(s);
  }));

  function play(s) {
    if (!s) return;
    if (s.kind === "external") { window.open(s.url, "_blank", "noopener,noreferrer"); return }
    css();
    const el = openOv("player"), box = el.querySelector(".cva-box");
    box.innerHTML = `${TOP}<h3 class="cva-s" style="margin-top:10px">${esc(s.label)}</h3><div class="cv-ad-st"></div><div class="cva-msg" hidden></div>`;
    box.querySelector('[data-a="close"]').onclick = () => closeOv(el);
    const st = box.querySelector(".cv-ad-st"), m = box.querySelector(".cva-msg");
    const bad = t => { m.className = "cva-msg bad"; m.textContent = t || "This stream couldn’t be played. The source may block browsers, or the format (for example MKV) may be unsupported."; m.hidden = false };
    let hls = null;
    el._onclose = () => { if (hls) hls.destroy(); const v = st.querySelector("video"); if (v) v.pause() };
    if (s.kind === "youtube") {
      const f = document.createElement("iframe"); f.src = "https://www.youtube-nocookie.com/embed/" + s.id; f.title = "YouTube player";
      f.allow = "fullscreen; picture-in-picture; encrypted-media"; f.allowFullscreen = true; st.append(f); return;

    if (s.kind === "torrent") {
      const f = document.createElement("iframe");
      f.src = "https://webtor.io/embed?magnet=" + encodeURIComponent(s.magnet) + "&player=1";
      f.allow = "fullscreen; autoplay; encrypted-media";
      f.allowFullscreen = true;
      f.style.cssText = "width:100%;height:70vh;border:0;border-radius:10px";
      st.append(f);
      return;
    }
    }
    const v = document.createElement("video"); v.controls = true; v.playsInline = true; v.addEventListener("error", () => bad()); st.append(v);
    if (/\.m3u8(\?|#|$)/i.test(s.url) && !v.canPlayType("application/vnd.apple.mpegurl")) {
      loadHls().then(Hls => {
        if (!Hls || !Hls.isSupported()) return bad("This browser can’t play HLS streams.");
        hls = new Hls(); hls.on(Hls.Events.ERROR, (_e, d) => { if (d && d.fatal) bad() });
        hls.loadSource(s.url); hls.attachMedia(v); v.play().catch(() => { });
      }).catch(() => bad("Couldn’t load the video player library."));
    } else { v.src = s.url; v.play().catch(() => { }) }
  }

  return { open, streams };
}
