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

  // CloudStream repo links / shortcodes (.cs3 plugins are Android code: they cannot run in a browser).
  function csRepo(input) {
    const t = String(input || "").trim();
    if (/^cloudstreamrepo:\/\//i.test(t)) return t.replace(/^cloudstreamrepo:\/\//i, "");
    if (/cncverse/i.test(t)) return null; // CNCVerse Bridge = a normal Stremio add-on that runs CloudStream extensions
    if (/^https?:\/\/.+\/(repo|plugins)[\w-]*\.json$/i.test(t) || /\.cs3(\?|$)/i.test(t)) return t;
    return null;
  }
  function normalizeManifestUrl(input) {
    let raw = String(input || "").trim().replace(/^stremio:\/\//i, "https://");
    if (/^https:\/\/[^?#]+$/i.test(raw) && !/\/manifest\.json$/i.test(raw)) raw = raw.replace(/\/+$/, "") + "/manifest.json"; // user pasted only the addon base
    
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
      let r;
      try { r = await fetch(url, { signal: c.signal }) }
      catch (e) { // CORS / network block → retry once through our own /api/proxy (add-on JSON only)
        if (!(e instanceof TypeError) || /^\/api\/proxy/.test(url)) throw e;
        r = await fetch("/api/proxy?u=" + encodeURIComponent(url), { signal: c.signal });
        if (!r.ok) { let up = ""; try { up = ((await r.json()).error || "").replace("upstream ", "") } catch { }
          throw new Error(up && up !== "no response" ? "The add-on’s own server answered with an error (HTTP " + up + "). It may be busy, down or blocking our relay. Try again later or use another instance of it." : "Couldn’t reach the add-on. It may be offline, or it blocks outside servers.") }
      }
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
    if (!hasHint() && !state().user) return { user: null, db: null, fs: null }; // guests never wait for Firebase
    await ready();
    const s = state();
    try { await s.auth.authStateReady() } catch { }
    return { user: s.auth.currentUser, db: s.db, fs: s.fs };
  }

  /* ---------- styles (addons.css, loaded once, only for signed-in users) ---------- */
  const css = () => Promise.resolve(); // addons.css is a normal <link> in index.html now (no lazy wait → popup opens instantly)
  // Guests: add-ons live in this browser only (localStorage). On/Off is per device for everyone, so no database rules change is needed.
  const LS_A = "cv_addons_guest", LS_OFF = "cv_addons_off";
  const lsGet = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : [] } catch { return [] } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } };
  const readLocal = () => lsGet(LS_A).filter(a => a && typeof a.id === "string" && httpsUrl(a.baseUrl));
  const isOff = (id) => lsGet(LS_OFF).includes(id);
  const setOff = (id, off) => { const o = lsGet(LS_OFF).filter(x => x !== id); if (off) o.push(id); lsSet(LS_OFF, o) };
  let addonCache = null; const streamCache = new Map();
  const forget = () => { addonCache = null; streamCache.clear() };

  /* ---------- manager (profile → Extensions / Add-ons) ---------- */
  function open() {
    if (document.querySelector('.cva[data-id="addons"]')) return;
    css();
    const el = openOv("addons"), box = el.querySelector(".cva-box");
    box.innerHTML = `${TOP}<h3 class="cva-h">Add-ons</h3><p class="cva-s">Bring your own</p>
<p class="cva-p">Parda comes with no add-ons. Paste the link of one you chose yourself (a Stremio add-on, or a CNCVerse Bridge link for CloudStream extensions). Only add services you trust and are allowed to use.</p>
<form class="cv-ad-f" novalidate><label class="cva-f"><span>Add-on URL</span><input name="url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Stremio add-on or CloudStream repo link"></label><button class="cva-btn" type="submit">Add</button></form>
<div class="cva-msg" hidden></div><div class="cv-ad-l"></div>`;
    const form = box.querySelector("form"), list = box.querySelector(".cv-ad-l"), btn = form.querySelector("button");
    const msg = (t, ok) => { const m = box.querySelector(".cva-msg"); m.className = "cva-msg " + (ok ? "good" : "bad"); m.textContent = t; m.hidden = !t };
    const fail = e => msg(e && e.code === "permission-denied" ? "Couldn’t save: the database rules don’t allow add-ons yet (publish the updated firestore.rules)." : (e && e.message) || "Something went wrong.");

    async function render() {
      const { user, db, fs } = await session();
      let items;
      if (user) { const snap = await fs.getDocs(fs.collection(db, "users", user.uid, "addons")); items = snap.docs.map(d => ({ id: d.id, ...d.data() })) }
      else items = readLocal();
      list.innerHTML = !items.length ? `<p class="cva-p">No add-ons yet.</p>` : `<p class="cv-ad-h">Your add-ons</p>` + items.map(a => {
        let host = ""; try { host = new URL(a.manifestUrl).host } catch { }
        const off = isOff(a.id);
        return `<div class="cv-ad-i${off ? " cv-ad-off" : ""}"><div style="min-width:0"><b>${esc(a.name || "Add-on")}</b><small>${esc(host)}${off ? " · Off" : ""}</small></div><button type="button" class="cv-ad-t" role="switch" aria-checked="${!off}" aria-label="Turn ${esc(a.name || "add-on")} on or off" data-tg="${esc(a.id)}"><i></i></button><button type="button" data-rm="${esc(a.id)}">Remove</button></div>`; // host only: the URL may contain private settings
      }).join("");
    }

    el.addEventListener("click", async e => {
      if (e.target.closest('[data-a="close"]')) return closeOv(el);
      const tg = e.target.closest("[data-tg]");
      if (tg) { setOff(tg.dataset.tg, tg.getAttribute("aria-checked") === "true"); forget(); return render().catch(fail) }
      const rm = e.target.closest("[data-rm]"); if (!rm) return;
      rm.disabled = true;
      try {
        const { user, db, fs } = await session();
        if (user) await fs.deleteDoc(fs.doc(db, "users", user.uid, "addons", rm.dataset.rm));
        else lsSet(LS_A, lsGet(LS_A).filter(a => a.id !== rm.dataset.rm));
        setOff(rm.dataset.rm, false); forget(); await render();
      } catch (err) { rm.disabled = false; fail(err) }
    });

    form.addEventListener("submit", async e => {
      e.preventDefault(); msg(""); btn.disabled = true; btn.textContent = "Checking…";
      try {
        const { user, db, fs } = await session();
        const cs = csRepo(form.url.value);
        if (cs) { // CloudStream: can't run here → hand over to the CloudStream app, and point to the Stremio route
          const deep = /^https?:/i.test(cs) ? "cloudstreamrepo://" + cs.replace(/^https?:\/\//i, "") : "cloudstreamrepo://" + cs;
          box.querySelector(".cva-msg").innerHTML = "";
          msg("This is a raw CloudStream repo, which only the CloudStream app can run. To use CloudStream extensions here, add CNCVerse Bridge (it is a Stremio add-on) and paste its manifest link instead.");
          const a = document.createElement("a"); a.className = "cva-btn"; a.href = deep; a.textContent = "Open in CloudStream app"; a.style.cssText = "display:block;text-align:center;margin-top:8px";
          box.querySelector(".cva-msg").after(a); setTimeout(() => a.remove(), 60000);
          return;
        }
        const url = normalizeManifestUrl(form.url.value), m = await manifestOf(url), id = await addonId(url);
        if (user) await fs.setDoc(fs.doc(db, "users", user.uid, "addons", id), { name: m.name.slice(0, 200), manifestUrl: url, baseUrl: baseOf(url), createdAt: fs.serverTimestamp() });
        else { const l = lsGet(LS_A).filter(a => a.id !== id); l.push({ id, name: m.name.slice(0, 200), manifestUrl: url, baseUrl: baseOf(url) }); lsSet(LS_A, l.slice(-20)) }
        setOff(id, false); forget(); form.url.value = ""; msg("Added “" + m.name + "”", 1); await render();
      } catch (err) { fail(err) } finally { btn.disabled = false; btn.textContent = "Add" }
    });

    // Open instantly: form is ready now, guests see their list right away, signed-in users get it as soon as it arrives.
    if (!hasHint()) { msg("No login needed. Add-ons are saved on this device only. Log in to keep them on all your devices.", 1); render().catch(fail) }
    else {
      list.innerHTML = `<p class="cv-ad-h">Your add-ons</p><div class="cv-ad-i cv-ad-sk"></div>`;
      session().then(({ user }) => {
        if (!document.body.contains(el)) return;
        if (!user) msg("No login needed. Add-ons are saved on this device only. Log in to keep them on all your devices.", 1);
        return render();
      }).catch(() => { msg("Couldn’t reach the sign-in service. Showing add-ons saved on this device."); const items = readLocal(); list.innerHTML = items.length ? "" : `<p class="cva-p">No add-ons yet.</p>` });
    }
  }

  /* ---------- streams for the details page / episode panel ---------- */
  async function myAddons() {
    const { user, db, fs } = await session(); if (!user) return readLocal().filter(a => !isOff(a.id));
    if (addonCache && addonCache.uid === user.uid && Date.now() - addonCache.t < 60000) return addonCache.list.filter(a => !isOff(a.id));
    const snap = await fs.getDocs(fs.collection(db, "users", user.uid, "addons"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    addonCache = { uid: user.uid, t: Date.now(), list };
    return list.filter(a => !isOff(a.id));
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
    download: s => { // direct links: hand straight to the browser's own download manager (any size, shows in notifications). Torrents: your torrent app.
      if (s.kind === "torrent") return say(launch(s, ""));
      const u = linkOf(s); if (!u) return say("No link to download");
      const nm = String(s.title || s.label || "video").replace(/[\\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 90) || "video";
      const m = (() => { try { return new URL(u).pathname.match(/\.(mp4|mkv|webm|avi|mov|m4v|ts|mp3|flac)$/i) } catch { return null } })();
      const a = document.createElement("a"); a.href = u; a.download = /\.\w{2,4}$/.test(nm) ? nm : nm + (m ? "." + m[1].toLowerCase() : ".mp4"); a.rel = "noopener noreferrer"; document.body.append(a); a.click(); a.remove();
      say(s.secure === false ? "Download started. If nothing happens, your browser blocked the http link." : "Download started, check your notifications");
    },
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
    if (!known && !readLocal().length) { // guests without add-ons: quiet pointer, no login required
      if (type === "movie") { await css(); if (tok !== el._tok) return; ui = createStreamsUI(el, { esc, openOv, closeOv, say, ...actions }); ui.note("Add your own add-ons (no login needed)", "Add-ons", () => window.CVA && CVA.addons && CVA.addons()) }
      return;
    }
    try {
      const list = await myAddons(); if (tok !== el._tok) return;
      if (list === null) return;
      await css(); if (tok !== el._tok) return;
      ui = createStreamsUI(el, { esc, openOv, closeOv, say, ...actions, retry: () => { forget(); streams(el, o) } });
      if (!list.length) return ui.note("No active add-ons. Add one or turn one on to see streams here.", "Add-ons", () => window.CVA && CVA.addons && CVA.addons());
      if (type === "series" && !isEp) return ui.note("Pick an episode below to load streams from your add-ons.");
      const id = type === "series" ? `${o.imdbId}:${+o.season}:${+o.episode}` : o.imdbId;
      let all = [], pending = list.length; const failed = [];
      ui.loading(`Searching ${list.length} add-on${list.length > 1 ? "s" : ""}…`);
      await Promise.all(list.map(async a => {
        try { const got = await fetchAddon(a, type, id); all = sortStreams(dedupe(all.concat(got))) } // read `all` AFTER the await, or parallel add-ons overwrite each other
        catch { failed.push(a.name || "An add-on") }
        pending--; if (tok === el._tok && pending) ui.progress(all, `Still searching ${pending} add-on${pending > 1 ? "s" : ""}…`);
      }));
      if (tok === el._tok) ui.done(all, failed);
    } catch { /* add-ons are optional; stay silent */ }
  }

  return { open, streams };
}
