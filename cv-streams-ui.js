// Parda — "From your add-ons" section.
// Collapsible, filterable, compact rows. Tap = play in browser. Hold / right-click / ⋮ = action sheet
// (browser or device player). Works on Android (touch) and desktop (mouse + keyboard).
import { qualityGroup, platform, ANDROID_APPS, IOS_APPS, langName } from "./cv-stream-utils.js";

const OPEN_KEY = "cv_ad_open", LANG_KEY = "cv_ad_lang", LIMIT = 8, HOLD_MS = 460;
const ls = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch { } } };
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const ICO = {
  dots: svg('<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>'),
  chev: svg('<path d="m6 9 6 6 6-6"/>'),
  fwd: svg('<path d="m9 6 6 6-6 6"/>'),
  back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  play: svg('<path d="M7 4.5v15l13-7.5z"/>'),
  phone: svg('<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.5h2"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>'),
  ext: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  dl: svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
};
const KIND_TAG = { direct: "LINK", torrent: "TOR", youtube: "YT", external: "WEB" };

export function createStreamsUI(el, deps) {
  const { esc, openOv, closeOv, say } = deps;
  if (el._cvs) el._cvs.destroy();
  const ac = new AbortController(), sig = { signal: ac.signal };

  const S = { list: [], filter: "all", lang: ls.get(LANG_KEY) || "all", showAll: false, open: ls.get(OPEN_KEY) !== "0", loading: false, loadText: "", failed: [], done: false, note: null };
  let menuEl = null, lpTimer = 0, lpFired = false, lpStart = null, lastMenu = 0;

  /* ---------- rendering ---------- */
  const langPass = s => S.lang === "all" || s.langs.includes(S.lang);
  const baseList = () => S.list.filter(langPass);
  const chipDefs = () => {
    const base = baseList(), c = {}; base.forEach(s => { const g = qualityGroup(s.q); c[g] = (c[g] || 0) + 1 });
    const out = [["all", "All", base.length]];
    ["4K", "1080p", "720p", "Other"].forEach(g => c[g] && out.push([g, g, c[g]]));
    const nd = base.filter(s => s.kind === "direct").length, nt = base.filter(s => s.kind === "torrent").length;
    if (nd && nt) out.push(["k:direct", "Direct", nd], ["k:torrent", "Torrent", nt]);
    return out.length > 2 ? out : [];
  };
  const langCounts = () => { const c = {}; S.list.forEach(s => s.langs.forEach(l => { c[l] = (c[l] || 0) + 1 })); return c };
  const passes = s => langPass(s) && (S.filter === "all" || (S.filter.startsWith("k:") ? s.kind === S.filter.slice(2) : qualityGroup(s.q) === S.filter));

  function metaHTML(s) {
    const p = [];
    if (s.size) p.push(esc(s.size));
    if (s.seeders >= 0) p.push(s.seeders + " seeds");
    if (s.src) p.push(esc(s.src));
    if (s.kind === "direct" && !s.size && !s.src) p.push("Direct link");
    if (s.kind === "external") p.push("Opens a new tab");
    if (s.kind === "youtube") p.push("YouTube");
    p.push(esc(s.addon));
    return p.join(" · ") + (s.flags.length ? " · " + s.flags.join(" ") : "");
  }
  function rowHTML(s, i) {
    const tags = s.tags.map(t => `<i>${esc(t)}</i>`).join("") +
      (s.debrid ? `<i class="deb">${esc(s.debrid)}</i>` : "") +
      (s.kind === "direct" && !s.secure ? `<i class="dev">Device only</i>` : "");
    return `<li class="cvs-r"><button type="button" class="cvs-main" data-i="${i}" aria-label="Play ${esc(s.label)}">` +
      `<span class="cvs-q" data-q="${esc(s.q)}">${esc(s.q || KIND_TAG[s.kind] || "")}</span>` +
      `<span class="cvs-m"><b class="cvs-ti">${esc(s.label)}</b><span class="cvs-me">${metaHTML(s)}</span>${tags ? `<span class="cvs-tg">${tags}</span>` : ""}</span></button>` +
      `<button type="button" class="cvs-k" data-k="${i}" aria-label="More options for ${esc(s.label)}" aria-haspopup="dialog">${ICO.dots}</button></li>`;
  }

  function render() {
    if (S.note) {
      el.innerHTML = `<div class="cvs-nb"><span>${esc(S.note.text)}</span>${S.note.action ? `<button type="button" data-note>${esc(S.note.action)}</button>` : ""}</div>`;
      return;
    }
    const n = S.list.length;
    const count = S.loading && !n ? `<span class="cvs-n"><i class="cvs-spin"></i></span>` : `<span class="cvs-n">${n}</span>`;
    const tog = S.open ? "Hide" : (n ? "Show " + n : "Show");
    let body = "";
    if (S.loading && !n) {
      body = `<p class="cvs-st">${esc(S.loadText || "Searching your add-ons…")}</p><ul class="cvs-list" aria-hidden="true">${'<li class="cvs-sk"><i></i><span><b></b><b></b></span></li>'.repeat(3)}</ul>`;
    } else if (!n) {
      body = `<div class="cvs-empty"><p>No streams found for this title from your add-ons.</p><button type="button" data-retry>Try again</button></div>`;
    } else {
      const chips = chipDefs(), rows = S.list.map((s, i) => [s, i]).filter(x => passes(x[0])), lc = langCounts();
      const showLang = Object.keys(lc).length > 1 || S.lang !== "all";
      const shown = S.showAll ? rows : rows.slice(0, LIMIT);
      const ln = S.lang === "all" ? "Language" : langName(S.lang).native;
      body = (S.loading ? `<p class="cvs-st">${esc(S.loadText)}</p>` : "") +
        ((chips.length || showLang) ? `<div class="cvs-bar">${chips.length ? `<div class="cvs-chips" role="toolbar" aria-label="Filter streams">${chips.map(c => `<button type="button" data-cvf="${esc(c[0])}" class="${c[0] === S.filter ? "on" : ""}">${esc(c[1])}<small>${c[2]}</small></button>`).join("")}</div>` : '<div class="cvs-chips"></div>'}` +
          (showLang ? `<button type="button" class="cvs-lang${S.lang !== "all" ? " on" : ""}" data-lang aria-haspopup="dialog" aria-label="Choose language">${ICO.globe}<span>${esc(ln)}</span></button>` : "") + `</div>` : "") +
        (rows.length ? `<ul class="cvs-list" role="list">${shown.map(x => rowHTML(x[0], x[1])).join("")}</ul>` +
          (rows.length > LIMIT ? `<button type="button" class="cvs-more" data-more>${S.showAll ? "Show fewer" : "Show all " + rows.length}</button>` : "")
          : `<div class="cvs-empty"><p>No ${S.lang !== "all" ? esc(langName(S.lang).en) + " " : ""}links match these filters.</p><button type="button" data-reset>Show everything</button></div>`);
    }
    if (S.done && S.failed.length) body += `<p class="cvs-fail">${esc(S.failed.join(", "))} didn’t respond.</p>`;
    el.innerHTML = `<section class="cvs" data-open="${S.open ? 1 : 0}"><div class="eh cvs-eh"><h3>From your add-ons${count}</h3>` +
      `<button type="button" class="cvs-toggle" data-toggle aria-expanded="${S.open}" aria-label="${S.open ? "Hide" : "Show"} add-on streams">${tog}${ICO.chev}</button></div>` +
      `<div class="cvs-body"><div${S.open ? "" : " inert"}>${body}</div></div></section>`;
  }

  /* ---------- action sheet ---------- */
  function sheetBtn(act, _icon, title, sub, extra = "") { // text-only rows on pure black
    return `<button type="button" class="cvm-b" data-act="${act}" ${extra}><span class="cvm-t"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>${act === "device" ? `<span class="cvm-c">${ICO.fwd}</span>` : ""}</button>`;
  }
  function openMenu(s, pos = {}) {
    if (menuEl && document.body.contains(menuEl)) return;
    lastMenu = Date.now();
    const plat = platform(), ov = menuEl = openOv("streammenu", "cv-menu"), box = ov.querySelector(".cva-box");
    let view = pos.view || "main";
    const head = (t, sub, back) => `<div class="cvm-h"><i class="cvm-grip"></i>${back ? `<button type="button" class="cvm-bk" data-act="back" aria-label="Back">${ICO.back}</button>` : ""}<div class="cvm-hd"><div class="cvm-ti">${esc(t)}</div><div class="cvm-me">${esc(sub)}</div></div><button type="button" class="cvm-x" data-a="close" aria-label="Close">${ICO.x}</button></div>`;
    const sub = metaHTML(s).replace(/&amp;/g, "&").replace(/<[^>]+>/g, "");

    function mainView() {
      let l = "";
      if (s.kind === "external") l += sheetBtn("open", ICO.ext, "Open link", "Opens in a new tab");
      else {
        const blocked = s.kind === "direct" && !s.secure;
        l += sheetBtn("browser", ICO.play, "Play in browser", blocked ? "Not possible: this link is http, not https" : s.kind === "torrent" ? "Streams through Webtor" : "Built-in player", blocked ? "disabled" : "");
        if (s.kind === "direct") l += plat === "ios" ? sheetBtn("device", ICO.phone, "Play in device player", "VLC, Infuse")
          : sheetBtn("app", ICO.phone, "Play in device player", plat === "android" ? "Opens your phone’s app chooser" : "Downloads a playlist for VLC", 'data-app=""');
        else if (s.kind === "torrent") l += sheetBtn("app", ICO.phone, "Play in device player", "Opens your torrent / streaming app", 'data-app=""');
        else if (s.kind === "youtube") l += sheetBtn("open", ICO.ext, "Open in YouTube", "YouTube app or website");
      }
      l += sheetBtn("copy", ICO.copy, s.kind === "torrent" ? "Copy magnet link" : "Copy stream link", "");
      return head(s.label, sub, false) + `<div class="cvm-l">${l}</div>` + (s.hdr ? `<p class="cvm-tip">This source asks for special request headers, so some players may not start it.</p>` : "");
    }
    function deviceView() {
      let l = "", tip = "";
      if (plat === "android") {
        l = ANDROID_APPS.map(a => sheetBtn("app", ICO.phone, a.name, a.note, `data-app="${a.id}"`)).join("");
        tip = "Not installed? Choosing an app opens its Play Store page.";
      } else if (plat === "ios") {
        l = IOS_APPS.map(a => sheetBtn("app", ICO.phone, a.name, a.note, `data-app="${a.id}"`)).join("");
        tip = "The app must be installed first. Nothing happens if it is missing.";
      } else {
        l = sheetBtn("app", ICO.dl, "Download .m3u playlist", "Opens in VLC or your default player", 'data-app="m3u"');
        tip = "In VLC you can also use Media → Open Network Stream and paste the copied link.";
      }
      l += sheetBtn("copy", ICO.copy, "Copy stream link", "");
      return head("Play in device player", s.label, true) + `<div class="cvm-l">${l}</div><p class="cvm-tip">${esc(tip)}</p>`;
    }
    function place() {
      if (!matchMedia("(min-width:700px)").matches) { box.style.left = box.style.top = ""; return }
      const w = box.offsetWidth, h = box.offsetHeight, vw = innerWidth, vh = innerHeight, r = pos.rect;
      let x = r ? r.right - w : (pos.x || (vw - w) / 2), y = r ? r.bottom + 6 : (pos.y || (vh - h) / 2);
      if (x + w > vw - 8) x = vw - w - 8; if (x < 8) x = 8;
      if (y + h > vh - 8) y = r ? r.top - h - 6 : y - h; if (y < 8) y = 8;
      box.style.left = x + "px"; box.style.top = y + "px";
    }
    function paint(focus = true) {
      box.innerHTML = view === "device" ? deviceView() : mainView();
      place();
      if (focus) { const b = box.querySelector(".cvm-b:not([disabled])"); if (b) try { b.focus({ preventScroll: true }) } catch { } }
    }
    paint();

    ov.addEventListener("click", e => {
      if (e.target.closest('[data-a="close"]')) return closeOv(ov);
      const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
      const act = b.dataset.act;
      if (act === "device") { view = "device"; return paint() }
      if (act === "back") { view = "main"; return paint() }
      closeOv(ov);
      setTimeout(() => { // wait for the overlay's history step before navigating away
        if (act === "browser") deps.playBrowser(s);
        else if (act === "app") deps.launch(s, b.dataset.app);
        else if (act === "copy") deps.copy(s);
        else if (act === "open") deps.open(s);
      }, 90);
    });
    ov.addEventListener("keydown", e => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const bs = [...box.querySelectorAll(".cvm-b:not([disabled])")]; if (!bs.length) return;
      const i = bs.indexOf(document.activeElement), n = e.key === "ArrowDown" ? (i + 1) % bs.length : (i - 1 + bs.length) % bs.length;
      bs[n].focus(); e.preventDefault();
    });
    ov._onclose = () => { menuEl = null };
  }

  /* ---------- language picker ---------- */
  function setLang(l) { S.lang = l; S.showAll = false; if (S.filter !== "all" && !S.list.some(passes)) S.filter = "all"; ls.set(LANG_KEY, l) }
  function openLang(rect) {
    if (menuEl && document.body.contains(menuEl)) return;
    lastMenu = Date.now();
    const ov = menuEl = openOv("langpick", "cv-menu cv-lang"), box = ov.querySelector(".cva-box");
    const lc = langCounts(), codes = Object.keys(lc).sort((a, b) => (a === "multi") - (b === "multi") || lc[b] - lc[a]);
    if (S.lang !== "all" && !codes.includes(S.lang)) codes.push(S.lang);
    const row = (c, name, alt, n, on) => `<button type="button" class="cvl-r${on ? " on" : ""}" data-l="${esc(c)}" data-q="${esc((name + " " + alt).toLowerCase())}"><span class="cvl-n">${esc(name)}${alt && alt !== name ? `<em>${esc(alt)}</em>` : ""}</span><b>${n}</b><i>${ICO.check}</i></button>`;
    const rows = codes.map(c => { const n = langName(c); return row(c, n.en, n.native, lc[c] || 0, S.lang === c) }).join("");
    box.innerHTML = `<div class="cvm-h"><i class="cvm-grip"></i><div class="cvm-hd"><div class="cvm-ti">Audio language</div></div><button type="button" class="cvm-x" data-a="close" aria-label="Close">${ICO.x}</button></div>` +
      (codes.length > 12 ? `<input class="cvl-q" type="search" placeholder="Search" autocomplete="off" aria-label="Search language">` : "") +
      `<div class="cvl-g">${row("all", "All languages", "", S.list.length, S.lang === "all")}${rows}</div>`;
    if (matchMedia("(min-width:700px)").matches) {
      const w = box.offsetWidth, h = box.offsetHeight; let x = rect.right - w, y = rect.bottom + 8;
      if (x < 8) x = 8; if (x + w > innerWidth - 8) x = innerWidth - w - 8; if (y + h > innerHeight - 8) y = Math.max(8, rect.top - h - 8);
      box.style.left = x + "px"; box.style.top = y + "px";
    }
    const q = box.querySelector(".cvl-q");
    if (q) q.addEventListener("input", () => { const t = q.value.trim().toLowerCase(); box.querySelectorAll(".cvl-r").forEach(b => { b.hidden = !!t && b.dataset.l !== "all" && !b.dataset.q.includes(t) }) });
    ov.addEventListener("click", e => {
      if (e.target.closest('[data-a="close"]')) return closeOv(ov);
      const b = e.target.closest("[data-l]"); if (!b) return;
      setLang(b.dataset.l); closeOv(ov); render();
    });
    ov._onclose = () => { menuEl = null };
  }

  /* ---------- actions ---------- */
  function tap(s, btn) {
    if (s.kind === "external") return deps.open(s);
    if (s.kind === "direct" && !s.secure) {
      say("Browsers block http links. Choose a device player.");
      return openMenu(s, { rect: btn.getBoundingClientRect(), view: "device" });
    }
    deps.playBrowser(s);
  }
  const rowOf = t => { const b = t.closest(".cvs-main"); return b && S.list[+b.dataset.i] ? b : null };

  /* ---------- events (delegated, one set per section) ---------- */
  el.addEventListener("click", e => {
    if (e.target.closest("[data-toggle]")) { S.open = !S.open; ls.set(OPEN_KEY, S.open ? "1" : "0"); return render() }
    const f = e.target.closest("[data-cvf]"); if (f) { S.filter = f.dataset.cvf; S.showAll = false; return render() }
    const lg = e.target.closest("[data-lang]"); if (lg) return openLang(lg.getBoundingClientRect());
    if (e.target.closest("[data-reset]")) { S.filter = "all"; setLang("all"); return render() }
    if (e.target.closest("[data-more]")) { S.showAll = !S.showAll; return render() }
    if (e.target.closest("[data-retry]")) return deps.retry && deps.retry();
    if (e.target.closest("[data-note]")) return S.note && S.note.run && S.note.run();
    const k = e.target.closest(".cvs-k");
    if (k) { const s = S.list[+k.dataset.k]; if (s) openMenu(s, { rect: k.getBoundingClientRect() }); return }
    const b = rowOf(e.target);
    if (b) { if (lpFired) { lpFired = false; return } tap(S.list[+b.dataset.i], b) }
  }, sig);

  // Right-click on desktop, and the long-press contextmenu on Android.
  el.addEventListener("contextmenu", e => {
    const b = rowOf(e.target) || (e.target.closest(".cvs-k") && el.querySelector(`.cvs-main[data-i="${e.target.closest(".cvs-k").dataset.k}"]`));
    if (!b) return;
    e.preventDefault();
    if (Date.now() - lastMenu < 700) return;
    const s = S.list[+b.dataset.i], r = b.getBoundingClientRect();
    openMenu(s, e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { rect: r });
  }, sig);

  // Long-press for touch / pen (iOS never fires contextmenu for buttons).
  const cancelHold = () => { clearTimeout(lpTimer); lpTimer = 0; el.querySelectorAll(".cvs-main.hold").forEach(x => x.classList.remove("hold")) };
  el.addEventListener("pointerdown", e => {
    lpFired = false; cancelHold();
    if (e.pointerType === "mouse") return;
    const b = rowOf(e.target); if (!b) return;
    lpStart = { x: e.clientX, y: e.clientY };
    lpTimer = setTimeout(() => {
      lpTimer = 0; lpFired = true;
      try { navigator.vibrate && navigator.vibrate(14) } catch { }
      b.classList.remove("hold");
      openMenu(S.list[+b.dataset.i], { x: lpStart.x, y: lpStart.y });
    }, HOLD_MS);
    setTimeout(() => { if (lpTimer) b.classList.add("hold") }, 120);
  }, sig);
  el.addEventListener("pointermove", e => { if (lpTimer && lpStart && Math.hypot(e.clientX - lpStart.x, e.clientY - lpStart.y) > 10) cancelHold() }, sig);
  ["pointerup", "pointercancel", "pointerleave"].forEach(t => el.addEventListener(t, () => { if (lpTimer) cancelHold() }, sig));
  addEventListener("scroll", () => { if (lpTimer) cancelHold() }, { capture: true, passive: true, signal: ac.signal });

  /* ---------- public API ---------- */
  const api = {
    loading(text) { S.note = null; S.loading = true; S.done = false; S.loadText = text; S.list = []; S.failed = []; render() },
    progress(list, text) { S.note = null; S.loading = true; S.loadText = text; S.list = list; render() },
    done(list, failed) { S.note = null; S.loading = false; S.done = true; S.list = list; S.failed = failed || []; if (!list.some(passes)) S.filter = "all"; render() },
    note(text, action, run) { S.note = { text, action, run }; render() },
    openMenu, clear() { el.innerHTML = "" },
    destroy() { ac.abort(); cancelHold(); if (menuEl && document.body.contains(menuEl)) closeOv(menuEl); el._cvs = null },
  };
  el._cvs = api;
  return api;
}
