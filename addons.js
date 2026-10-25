// Parda — user-provided add-ons (Stremio protocol).
// Parda ships NO add-on. Each user pastes their own manifest URL (saved to users/{uid}/addons).
// Only HTTPS direct video / HLS, YouTube and external links are used. Torrent / info-hash entries are ignored on purpose.
// Loaded by auth.js, which passes in its own Firebase + overlay helpers.

import { httpUrl, classify, sortStreams, dedupe, launch, copyText, linkOf, platform } from "./cv-stream-utils.js";
import { createStreamsUI } from "./cv-streams-ui.js";
import { openPlayer } from "./cv-player.js";

export function initAddons(h) {
  const { esc, say, openOv, closeOv, state, ready, hasHint, TOP } = h;

  /* ---------- helpers ---------- */
  const httpsUrl = u => httpUrl(u, true);

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

  /* ---------- styles (addons.css, loaded once, only for signed-in users) ---------- */
  let cssP = null;
  function css() {
    if (cssP) return cssP;
    return cssP = new Promise(res => {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = new URL("./addons.css", import.meta.url).href;
      l.onload = l.onerror = () => res(); document.head.append(l);
    });
  }
  let addonCache = null; const streamCache = new Map();
  const forget = () => { addonCache = null; streamCache.clear() };

  /* ---------- manager (profile → Extensions / Add-ons) ---------- */
  function open() {
    if (document.querySelector('.cva[data-id="addons"]')) return;
    css();
    const el = openOv("addons"), box = el.querySelector(".cva-box");
    box.innerHTML = `${TOP}<h3 class="cva-h">Add-ons</h3><p class="cva-s">Bring your own</p>
<p class="cva-p">Parda comes with no add-ons. Paste the manifest URL of one you chose yourself. Only add services you trust and are allowed to use.</p>
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
      try { const { user, db, fs } = await session(); await fs.deleteDoc(fs.doc(db, "users", user.uid, "addons", rm.dataset.rm)); forget(); await render() } catch (err) { rm.disabled = false; fail(err) }
    });

    form.addEventListener("submit", async e => {
      e.preventDefault(); msg(""); btn.disabled = true; btn.textContent = "Checking…";
      try {
        const { user, db, fs } = await session(); if (!user) throw new Error("Sign in first to save add-ons.");
        const url = normalizeManifestUrl(form.url.value), m = await manifestOf(url), id = await addonId(url);
        await fs.setDoc(fs.doc(db, "users", user.uid, "addons", id), { name: m.name.slice(0, 200), manifestUrl: url, baseUrl: baseOf(url), createdAt: fs.serverTimestamp() });
        forget(); form.url.value = ""; msg("Added “" + m.name + "”", 1); await render();
      } catch (err) { fail(err) } finally { btn.disabled = false; btn.textContent = "Add" }
    });

    session().then(({ user }) => {
      if (!document.body.contains(el)) return;
      if (!user) { msg("Sign in to save add-ons to your account."); return }
      form.hidden = false; render().catch(fail);
    }).catch(() => msg("Couldn’t reach the sign-in service."));
  }

  /* ---------- streams for the details page / episode panel ---------- */
  async function myAddons() {
    const { user, db, fs } = await session(); if (!user) return null;
    if (addonCache && addonCache.uid === user.uid && Date.now() - addonCache.t < 60000) return addonCache.list;
    const snap = await fs.getDocs(fs.collection(db, "users", user.uid, "addons"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    addonCache = { uid: user.uid, t: Date.now(), list };
    return list;
  }

  async function fetchAddon(a, type, id) {
    const base = httpsUrl(a.baseUrl); if (!base) throw new Error("bad url");
    const url = `${base.replace(/\/$/, "")}/stream/${type}/${encodeURIComponent(id)}.json`, hit = streamCache.get(url);
    if (hit && Date.now() - hit.t < 300000) return hit.v;
    const j = await getJson(url, 15000);
    const v = (Array.isArray(j && j.streams) ? j.streams : []).map((s, i) => classify(s, a.name || "Add-on", a.id + "-" + i)).filter(Boolean);
    streamCache.set(url, { t: Date.now(), v });
    return v;
  }

  let ui = null; // last streams UI, used by the player to open the action sheet
  const actions = {
    playBrowser: s => { css().then(() => openPlayer(s, { openOv, closeOv, esc, say, device: x => (platform() === "ios" && x.kind !== "torrent" && ui) ? ui.openMenu(x, { view: "device" }) : say(launch(x, "")) })) },
    launch: (s, app) => say(launch(s, app)),
    copy: async s => say((await copyText(linkOf(s))) ? (s.kind === "torrent" ? "Magnet link copied" : "Link copied") : "Couldn’t copy. Long-press the link instead."),
    open: s => { const u = s.kind === "youtube" ? "https://www.youtube.com/watch?v=" + s.id : s.url; window.open(u, "_blank", "noopener,noreferrer") },
  };

  async function streams(el, o) {
    if (!el) return;
    o = o || {};
    const type = o.type === "tv" || o.type === "series" ? "series" : "movie", tok = el._tok = (el._tok || 0) + 1;
    if (el._cvs) el._cvs.destroy();
    el.innerHTML = "";
    if (!/^tt\d{5,10}$/.test(String(o.imdbId || ""))) return;
    const isEp = +o.season >= 0 && +o.episode >= 1;
    if (type === "series" && o.season != null && !isEp) return;
    const known = !!(state().auth || hasHint());
    if (!known) { // guests: official providers only, plus a quiet pointer
      if (type === "movie") { await css(); if (tok !== el._tok) return; ui = createStreamsUI(el, { esc, openOv, closeOv, say, ...actions }); ui.note("Log in to configure custom media add-ons", "Log in", () => window.CVA && CVA.open && CVA.open()) }
      return;
    }
    try {
      const list = await myAddons(); if (tok !== el._tok) return;
      if (list === null) return;
      await css(); if (tok !== el._tok) return;
      ui = createStreamsUI(el, { esc, openOv, closeOv, say, ...actions, retry: () => { forget(); streams(el, o) } });
      if (!list.length) return ui.note("No add-ons yet. Add one to see streams here.", "Add-ons", () => window.CVA && CVA.addons && CVA.addons());
      if (type === "series" && !isEp) return ui.note("Pick an episode below to load streams from your add-ons.");
      const id = type === "series" ? `${o.imdbId}:${+o.season}:${+o.episode}` : o.imdbId;
      let all = [], pending = list.length; const failed = [];
      ui.loading(`Searching ${list.length} add-on${list.length > 1 ? "s" : ""}…`);
      await Promise.all(list.map(async a => {
        try { all = sortStreams(dedupe(all.concat(await fetchAddon(a, type, id)))) }
        catch { failed.push(a.name || "An add-on") }
        pending--; if (tok === el._tok && pending) ui.progress(all, `Still searching ${pending} add-on${pending > 1 ? "s" : ""}…`);
      }));
      if (tok === el._tok) ui.done(all, failed);
    } catch { /* add-ons are optional; stay silent */ }
  }

  return { open, streams };
}
