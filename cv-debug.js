/* Parda — DEBUG MODE (always on, starts before everything else).
   Records: timeline, touches, scroll, long tasks, frame stalls, fetches, errors, DOM/scroll-lock changes, device info.
   Open it from Menu → Debug (or the tiny "DBG" chip, bottom-left) → "Copy report" → paste to Claude. */
(function () {
  "use strict";
  if (window.CVDBG) return;
  var T0 = performance.now(), LOG = [], MAXLOG = 1500, flags = {}, S = {};
  var now = function () { return Math.round(performance.now()) };
  function log(type, msg, data) {
    try {
      if (LOG.length >= MAXLOG) LOG.splice(60, 200); // keep the very first 60 entries, drop old middle ones
      LOG.push({ t: now(), y: Math.round(window.scrollY || 0), type: type, msg: msg, d: data });
    } catch (e) {}
  }
  function flag(k, msg, data) { if (!flags[k]) { flags[k] = { t: now(), msg: msg, d: data }; log("FLAG", k + ": " + msg, data) } }
  function gl(n) { try { return (0, eval)(n) } catch (e) { return undefined } } // read app.js globals (hero state etc.)
  function desc(e) {
    if (!e || !e.tagName) return String(e);
    var s = e.tagName.toLowerCase(); if (e.id) s += "#" + e.id;
    var c = typeof e.className === "string" ? e.className.trim().split(/\s+/).slice(0, 3).join(".") : ""; if (c) s += "." + c;
    return s;
  }
  function cs(e, p) { try { return getComputedStyle(e)[p] } catch (x) { return "?" } }

  /* ---------- 1. errors + console ---------- */
  addEventListener("error", function (e) { log("ERROR", (e.message || "error") + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno + ":" + e.colno) }, true);
  addEventListener("unhandledrejection", function (e) { log("REJECT", String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300)) });
  ["warn", "error"].forEach(function (k) { var o = console[k]; console[k] = function () { try { log("CONSOLE." + k, Array.prototype.slice.call(arguments).map(function (a) { return a && a.message ? a.message : String(a) }).join(" ").slice(0, 300)) } catch (e) {} return o.apply(console, arguments) } });

  /* ---------- 2. fetch tracking ---------- */
  var pending = {}, pid = 0, fstats = { n: 0, fail: 0, slow: 0, maxMs: 0 };
  if (window.fetch) {
    var of = window.fetch;
    window.fetch = function (input) {
      var u = ""; try { u = typeof input === "string" ? input : (input && input.url) || String(input) } catch (e) {}
      var short = u.replace(/^https?:\/\/[^/]+/, "").replace(/api_key=[^&]+/, "api_key=*").slice(0, 110), id = ++pid, st = now(); pending[id] = { u: short, t: st }; fstats.n++;
      return of.apply(this, arguments).then(function (r) {
        var ms = now() - st; delete pending[id]; if (ms > fstats.maxMs) fstats.maxMs = ms;
        if (!r.ok) { fstats.fail++; log("FETCH!", r.status + " " + short + " " + ms + "ms") } else if (ms > 1500) { fstats.slow++; log("FETCH-SLOW", ms + "ms " + short) }
        return r;
      }, function (er) { var ms = now() - st; delete pending[id]; fstats.fail++; log("FETCH-FAIL", (er && er.name) + " " + ms + "ms " + short); throw er });
    };
  }

  /* ---------- 3. performance observers ---------- */
  function po(type, cb, extra) { try { var o = new PerformanceObserver(function (l) { l.getEntries().forEach(cb) }); var cfg = { type: type, buffered: true }; if (extra) for (var k in extra) cfg[k] = extra[k]; o.observe(cfg) } catch (e) {} }
  var lt = { n: 0, total: 0, max: 0 };
  po("longtask", function (e) { lt.n++; lt.total += e.duration; if (e.duration > lt.max) lt.max = Math.round(e.duration); if (e.duration >= 120) log("LONGTASK", Math.round(e.duration) + "ms @" + Math.round(e.startTime)) });
  po("long-animation-frame", function (e) {
    if (e.duration < 150) return;
    var sc = (e.scripts || []).slice(0, 3).map(function (s) { return (s.sourceURL || "").split("/").pop() + ":" + (s.sourceFunctionName || s.invoker || "") + " " + Math.round(s.duration) + "ms" }).join(" | ");
    log("LOAF", Math.round(e.duration) + "ms block=" + Math.round(e.blockingDuration || 0) + " " + sc);
  });
  po("paint", function (e) { log("PAINT", e.name + " @" + Math.round(e.startTime)) });
  po("largest-contentful-paint", function (e) { S.lcp = Math.round(e.startTime); log("LCP", Math.round(e.startTime) + "ms " + desc(e.element)) });
  var cls = 0; po("layout-shift", function (e) { if (!e.hadRecentInput) cls += e.value; S.cls = Math.round(cls * 1000) / 1000 });
  var res = { n: 0, big: 0, slowImg: [] };
  po("resource", function (e) {
    res.n++; if (e.encodedBodySize > 400000) res.big++;
    if (/\.(jpe?g|png|webp|avif)|timg|image\.tmdb/i.test(e.name) && e.duration > 2500 && res.slowImg.length < 8) res.slowImg.push(Math.round(e.duration) + "ms " + e.name.replace(/^https?:\/\/[^/]+/, "").slice(0, 60));
  });
  po("event", function (e) { if (e.duration >= 250) log("SLOW-INPUT", e.name + " " + e.duration + "ms (delay " + Math.round(e.processingStart - e.startTime) + ") " + desc(e.target)) }, { durationThreshold: 200 });

  /* ---------- 4. main-thread heartbeat + frame stalls ---------- */
  var hb = { last: performance.now(), gaps: 0, max: 0 };
  setInterval(function () { var n = performance.now(), g = n - hb.last - 100; hb.last = n; if (g > 250) { hb.gaps++; if (g > hb.max) hb.max = Math.round(g); log("MAIN-BLOCKED", Math.round(g) + "ms") } }, 100);
  var fr = { n: 0, stall: 0, max: 0, last: 0 };
  (function raf(t) { if (fr.last) { var d = t - fr.last; fr.n++; if (d > 120) { fr.stall++; if (d > fr.max) fr.max = Math.round(d); if (d > 400) log("FRAME-STALL", Math.round(d) + "ms") } } fr.last = t; requestAnimationFrame(raf) })(0);
  document.addEventListener("visibilitychange", function () { log("VISIBILITY", document.visibilityState) });
  addEventListener("pagehide", function () { log("PAGEHIDE", "") });
  addEventListener("DOMContentLoaded", function () { log("DOMContentLoaded", "") });
  addEventListener("load", function () { log("window.load", "") });

  /* ---------- 5. touch / scroll diagnosis ---------- */
  var g = null, gestures = 0, stuck = 0, tstat = { start: 0, move: 0, cancel: 0, prevented: 0 };
  function chain(el) { // every ancestor that could affect a vertical touch scroll
    var out = [], n = 0;
    for (var e = el; e && e.nodeType === 1 && n < 14; e = e.parentElement, n++) {
      var ta = cs(e, "touchAction"), ov = cs(e, "overflowY"), ob = cs(e, "overscrollBehaviorY"), pe = cs(e, "pointerEvents"), pos = cs(e, "position");
      var notable = ta !== "auto" || (ov !== "visible" && ov !== "clip") || ob !== "auto" || pe === "none" || pos === "fixed";
      if (notable || e === el) out.push(desc(e) + " [ta=" + ta + " ovY=" + ov + " ovsc=" + ob + " pe=" + pe + " pos=" + pos + (e.scrollHeight > e.clientHeight + 2 ? " SCROLLABLE " + e.scrollHeight + ">" + e.clientHeight : "") + "]");
    }
    return out;
  }
  function touchBlock(el) { for (var e = el, n = 0; e && e.nodeType === 1 && n < 20; e = e.parentElement, n++) { var ta = cs(e, "touchAction"); if (ta === "none" || ta === "pan-x" || ta === "pinch-zoom" || ta === "manipulation pan-x") return "touch-action:" + ta + " on " + desc(e) + " blocks vertical scroll"; var pe = cs(e, "pointerEvents"); if (pe === "none" && e === el) return "pointer-events:none on touch target" } return ""; }
  function pageState() {
    var de = document.documentElement, b = document.body;
    return { sy: Math.round(scrollY), sh: de.scrollHeight, ih: innerHeight, canScroll: de.scrollHeight > innerHeight + 4, htmlOv: cs(de, "overflowY"), bodyOv: cs(b, "overflowY"), bodyStyle: b.getAttribute("style") || "", bodyCls: b.className, htmlCls: de.className, htmlTA: cs(de, "touchAction"), bodyTA: cs(b, "touchAction"), bodyPos: cs(b, "position"), modalHidden: gl("document.getElementById('modal').hidden") };
  }
  function onTS(e) {
    tstat.start++; var t = e.touches[0]; if (!t) return;
    g = { x: t.clientX, y: t.clientY, t: now(), sy: scrollY, moves: 0, ev: e.touches.length, prevented: false, target: e.target, ty: t.clientY, maxdy: 0 };
    gestures++; if (gestures <= 40) log("TOUCH-START", "tgt=" + desc(e.target) + " y=" + Math.round(t.clientY) + " fingers=" + e.touches.length + " cancelable=" + e.cancelable);
  }
  function onTM(e) {
    if (!g) return; tstat.move++; g.moves++; var t = e.touches[0]; if (!t) return;
    g.ty = t.clientY; var dy = Math.abs(t.clientY - g.y); if (dy > g.maxdy) g.maxdy = dy;
    if (e.defaultPrevented) { g.prevented = true; tstat.prevented++ }
    if (!e.cancelable && !g.nc) { g.nc = 1 } // browser already took over (it is scrolling)
  }
  function onTE(e) {
    if (!g) return; var gg = g; g = null;
    var moved = Math.round(scrollY - gg.sy), swipe = Math.round(gg.ty - gg.y);
    var verdict = gg.maxdy > 40 && Math.abs(swipe) > 30 ? (Math.abs(moved) < 4 ? "NO-SCROLL" : "scrolled") : "tap/short";
    if (gestures <= 60 || verdict === "NO-SCROLL") log("TOUCH-END", e.type + " finger=" + swipe + "px page=" + moved + "px moves=" + gg.moves + " " + verdict + (gg.prevented ? " DEFAULT-PREVENTED" : ""));
    if (verdict === "NO-SCROLL") {
      stuck++;
      var st = pageState();
      var why = !st.canScroll ? "PAGE TOO SHORT (scrollHeight<=viewport)" : gg.prevented ? "touchmove preventDefault'ed by a script" : (st.bodyOv === "hidden" || st.htmlOv === "hidden") ? "html/body overflow hidden" : touchBlock(gg.target) || "unknown — see chain";
      flag("SCROLL-STUCK", "finger moved " + swipe + "px, page moved " + moved + "px → " + why, { state: st, chain: chain(gg.target), underFinger: desc(document.elementFromPoint(gg.x, Math.min(innerHeight - 1, Math.max(0, gg.ty)))), hero: heroSnap(), rows: rowSnap() });
      if (stuck <= 6) log("STUCK-DETAIL", "#" + stuck + " why=" + why + " | target chain: " + chain(gg.target).slice(0, 6).join(" <- "));
    }
  }
  var po2 = { capture: true, passive: true };
  addEventListener("touchstart", onTS, po2); addEventListener("touchmove", onTM, po2); addEventListener("touchend", onTE, po2); addEventListener("touchcancel", function (e) { tstat.cancel++; log("TOUCH-CANCEL", "tgt=" + desc(e.target)); onTE(e) }, po2);
  addEventListener("pointercancel", function (e) { log("POINTER-CANCEL", e.pointerType + " tgt=" + desc(e.target)) }, po2);
  addEventListener("wheel", function (e) { if (S.wheel === undefined) { S.wheel = 0 } S.wheel++; if (S.wheel <= 5) log("WHEEL", "dy=" + e.deltaY + " tgt=" + desc(e.target)) }, po2);
  var lastSy = 0, scrolls = 0, firstScrollAt = null;
  addEventListener("scroll", function () { scrolls++; if (firstScrollAt === null && scrollY > 0) { firstScrollAt = now(); log("FIRST-SCROLL", "y=" + Math.round(scrollY)) } lastSy = scrollY }, { passive: true });

  /* ---------- 6. DOM / lock watchers ---------- */
  function watchAttr(el, name) { try { new MutationObserver(function (ms) { ms.forEach(function (m) { log("ATTR", name + " " + m.attributeName + " → " + String(el.getAttribute(m.attributeName)).slice(0, 120)) }) }).observe(el, { attributes: true, attributeFilter: ["style", "class"] }) } catch (e) {} }
  watchAttr(document.documentElement, "html");
  document.addEventListener("DOMContentLoaded", function () {
    watchAttr(document.body, "body");
    var it = document.getElementById("intro"); if (it) { new MutationObserver(function () { if (!it.isConnected) log("INTRO", "removed from DOM") }).observe(document.body, { childList: true }); if (it.classList) log("INTRO", "present at DOMContentLoaded") }
    var md = document.getElementById("modal"); if (md) new MutationObserver(function () { log("MODAL", md.hidden ? "hidden" : "OPEN") }).observe(md, { attributes: true, attributeFilter: ["hidden"] });
    var rw = document.getElementById("rows"); if (rw) new MutationObserver(function (ms) { var a = 0; ms.forEach(function (m) { a += m.addedNodes.length }); log("ROWS-DOM", "+" + a + " nodes, total rows=" + rw.children.length) }).observe(rw, { childList: true });
    var hx = document.getElementById("hx"); if (hx) log("HERO-BOX", "h=" + Math.round(hx.getBoundingClientRect().height) + " ta=" + cs(hx, "touchAction") + " ovsc=" + cs(hx, "overscrollBehaviorY") + " ov=" + cs(hx, "overflowY"));
  });

  /* ---------- 7. snapshots ---------- */
  function rowSnap() {
    var rs = document.querySelectorAll("#rows .row"), o = { total: rs.length, loaded: 0, revealed: 0, withCards: 0, skeletonOnly: 0, hiddenByRv: 0, firstRowTop: null };
    rs.forEach(function (r, i) { if (r._l) o.loaded++; if (r.classList.contains("in")) o.revealed++; var real = r.querySelectorAll(".card:not(.sk)").length; if (real) o.withCards++; else o.skeletonOnly++; if (r.classList.contains("rv") && !r.classList.contains("in") && parseFloat(cs(r, "opacity")) < .05) o.hiddenByRv++; if (i === 0) o.firstRowTop = Math.round(r.getBoundingClientRect().top + scrollY) });
    o.rowsEl = document.getElementById("rows") ? Math.round(document.getElementById("rows").getBoundingClientRect().height) : null;
    return o;
  }
  function heroSnap() {
    var hx = document.getElementById("hx");
    return { present: !!hx, hidden: hx && hx.hidden, h: hx ? Math.round(hx.getBoundingClientRect().height) : null, off: hx && hx.classList.contains("off"), heroLen: gl("hero.length"), hi: gl("hi"), hbusy: gl("hbusy"), hvis: gl("hvis"), hpainted: gl("hpainted"), title: (document.getElementById("htitle") || {}).textContent, bgA: ((document.getElementById("hbgA") || {}).style || {}).backgroundImage ? "img" : "none", bgB: ((document.getElementById("hbgB") || {}).style || {}).backgroundImage ? "img" : "none", lite: document.documentElement.classList.contains("lite") };
  }
  var samples = [];
  function sample(tag) {
    try {
      var st = pageState(), hs = heroSnap(), rs = rowSnap(), m = performance.memory;
      var cx = innerWidth / 2, a = document.elementFromPoint(cx, innerHeight * .3), b = document.elementFromPoint(cx, innerHeight * .8);
      var s = { t: now(), tag: tag || "", sy: st.sy, sh: st.sh, can: st.canScroll ? 1 : 0, bOv: st.bodyOv, hOv: st.htmlOv, bStyle: st.bodyStyle, intro: document.getElementById("intro") ? 1 : 0, modal: st.modalHidden, rows: rs.total + "/loaded " + rs.loaded + "/cards " + rs.withCards + "/rvHidden " + rs.hiddenByRv, rowsTop: rs.firstRowTop, hero: (hs.heroLen || 0) + "slides busy=" + hs.hbusy + " painted=" + hs.hpainted + " bg=" + hs.bgA + "/" + hs.bgB, top30: desc(a), top80: desc(b), pend: Object.keys(pending).length, heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) : null };
      samples.push(s); if (samples.length > 120) samples.splice(40, 20);
      return s;
    } catch (e) { log("SAMPLE-ERR", e.message) }
  }
  var iv = 0, tick = 0;
  (function loop() { tick++; sample(); var d = now() < 20000 ? 500 : now() < 60000 ? 2000 : 5000; setTimeout(loop, d) })();
  [100, 1000, 3000, 6000, 10000, 15000].forEach(function (ms) { setTimeout(function () { sample("@" + ms); }, ms) });

  /* ---------- 8. active scroll probe (separates "touch is blocked" from "page cannot scroll") ---------- */
  function probe() {
    var before = scrollY, de = document.documentElement, out = { canScroll: de.scrollHeight > innerHeight + 4 };
    try { window.scrollTo(0, before + 120) } catch (e) {}
    return new Promise(function (r) { setTimeout(function () { out.programmaticMoved = Math.round(scrollY - before); try { window.scrollTo(0, before) } catch (e) {} r(out) }, 250) });
  }
  setTimeout(function () { probe().then(function (o) { log("PROBE@3s", "programmatic scroll moved " + o.programmaticMoved + "px, canScroll=" + o.canScroll); S.probe3 = o }) }, 3000);
  setTimeout(function () { probe().then(function (o) { log("PROBE@12s", "programmatic scroll moved " + o.programmaticMoved + "px, canScroll=" + o.canScroll); S.probe12 = o }) }, 12000);

  /* ---------- 9. environment (collected once, async parts later) ---------- */
  var ENV = {};
  function env() {
    var n = navigator, c = n.connection || {};
    ENV = { ua: n.userAgent, cores: n.hardwareConcurrency, memGB: n.deviceMemory, dpr: devicePixelRatio, vp: innerWidth + "x" + innerHeight, screen: screen.width + "x" + screen.height, net: (c.effectiveType || "?") + " down=" + c.downlink + "Mbps rtt=" + c.rtt + "ms save=" + c.saveData, url: location.href, standalone: matchMedia("(display-mode: standalone)").matches, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, touchPoints: n.maxTouchPoints, swController: !!(n.serviceWorker && n.serviceWorker.controller), swScript: n.serviceWorker && n.serviceWorker.controller ? n.serviceWorker.controller.scriptURL.split("/").pop() : null, lsKeys: (function () { try { return Object.keys(localStorage).length + " keys; hero cache " + (localStorage.getItem("cv_hero3") ? "YES(warm)" : "no(cold)") + "; cv_key=" + (localStorage.getItem("cv_key") ? "set" : "unset") } catch (e) { return "blocked" } })(), ss: (function () { try { return Object.keys(sessionStorage).join(",") } catch (e) { return "blocked" } })() };
    if (window.caches) caches.keys().then(function (k) { ENV.caches = k.join(",") }).catch(function () {});
    if (n.serviceWorker && n.serviceWorker.getRegistrations) n.serviceWorker.getRegistrations().then(function (r) { ENV.swRegs = r.length }).catch(function () {});
    if (n.storage && n.storage.estimate) n.storage.estimate().then(function (e) { ENV.storageMB = Math.round(e.usage / 1048576) + "/" + Math.round(e.quota / 1048576) }).catch(function () {});
  }
  env(); setTimeout(env, 4000);

  /* ---------- 10. report ---------- */
  function J(o) { try { return JSON.stringify(o) } catch (e) { return String(o) } }
  function report() {
    sample("report");
    var last = samples[samples.length - 1] || {}, L = [];
    L.push("=== PARDA DEBUG REPORT ===  generated @" + now() + "ms after page start  (" + new Date().toISOString() + ")");
    L.push("");
    L.push("## VERDICT (auto)");
    var fl = Object.keys(flags); if (!fl.length) L.push("no automatic flags raised");
    fl.forEach(function (k) { L.push("- " + k + " @" + flags[k].t + "ms: " + flags[k].msg) });
    var p3 = S.probe3, p12 = S.probe12;
    L.push("- scroll probe @3s: " + (p3 ? "programmatic scroll moved " + p3.programmaticMoved + "px, page scrollable=" + p3.canScroll : "not run yet") + " | @12s: " + (p12 ? p12.programmaticMoved + "px, scrollable=" + p12.canScroll : "not run yet"));
    L.push("- first scroll ever happened @" + (firstScrollAt === null ? "NEVER" : firstScrollAt + "ms") + "; touch gestures=" + gestures + ", NO-SCROLL gestures=" + stuck);
    L.push("");
    L.push("## NOW");
    L.push(J(last));
    L.push("");
    L.push("## HERO / ROWS (now)");
    L.push(J(heroSnap())); L.push(J(rowSnap()));
    L.push("");
    L.push("## PERF TOTALS");
    L.push("longtasks n=" + lt.n + " total=" + Math.round(lt.total) + "ms max=" + lt.max + "ms | main-thread blocks>250ms: " + hb.gaps + " (max " + hb.max + "ms) | frames=" + fr.n + " stalls>120ms=" + fr.stall + " (max " + fr.max + "ms) | LCP=" + (S.lcp || "?") + "ms CLS=" + (S.cls || 0));
    L.push("fetch n=" + fstats.n + " failed=" + fstats.fail + " slow>1.5s=" + fstats.slow + " maxMs=" + fstats.maxMs + " pending now=" + Object.keys(pending).length + " " + J(Object.keys(pending).map(function (k) { return pending[k].u + " (" + (now() - pending[k].t) + "ms)" }).slice(0, 6)));
    L.push("resources=" + res.n + " big(>400KB)=" + res.big + " slowImages=" + J(res.slowImg));
    L.push("touch: " + J(tstat) + " scrollEvents=" + scrolls);
    L.push("");
    L.push("## DEVICE");
    L.push(J(ENV));
    L.push("");
    L.push("## SAMPLES (every 0.5s for the first 20s)");
    samples.filter(function (s, i) { return i < 45 || s.tag === "report" || i % 4 === 0 }).slice(0, 70).forEach(function (s) { L.push(J(s)) });
    L.push("");
    L.push("## TIMELINE (t=ms since start, y=scrollY)");
    LOG.forEach(function (e) { L.push("t=" + e.t + " y=" + e.y + " " + e.type + " " + (e.msg || "") + (e.d && e.type === "FLAG" ? "\n    DETAIL " + J(e.d) : "")) });
    L.push("=== END ===");
    var s = L.join("\n");
    return s.length > 60000 ? s.slice(0, 30000) + "\n...[cut]...\n" + s.slice(-28000) : s;
  }

  /* ---------- 11. UI: chip + panel + copy ---------- */
  var panel = null, chip = null;
  function copy(text, done) {
    function fallback() { try { var ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;left:0;top:0;opacity:0"; document.body.appendChild(ta); ta.focus(); ta.select(); var ok = document.execCommand("copy"); ta.remove(); done(ok) } catch (e) { done(false) } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true) }, fallback); else fallback();
  }
  function ui() {
    if (chip || !document.body) return;
    chip = document.createElement("button"); chip.textContent = "DBG"; chip.setAttribute("aria-label", "Debug");
    chip.style.cssText = "position:fixed;left:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 78px);z-index:2147483000;font:700 10px/1 monospace;color:#0f0;background:#000c;border:1px solid #0f08;border-radius:6px;padding:5px 6px;opacity:.55;touch-action:manipulation";
    chip.onclick = open; document.body.appendChild(chip);
  }
  function open() {
    if (panel) { panel.remove(); panel = null; return }
    var txt = report();
    panel = document.createElement("div");
    panel.style.cssText = "position:fixed;inset:0;z-index:2147483001;background:#000f;color:#9f9;font:11px/1.35 monospace;display:flex;flex-direction:column;padding:10px;padding-top:calc(env(safe-area-inset-top,0px) + 10px)";
    var bar = document.createElement("div"); bar.style.cssText = "display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap";
    function btn(label, fn) { var b = document.createElement("button"); b.textContent = label; b.style.cssText = "flex:1;min-width:30%;font:700 14px sans-serif;padding:12px 8px;border-radius:10px;border:0;background:#1d6b3a;color:#fff"; b.onclick = fn; bar.appendChild(b); return b }
    var cb = btn("COPY REPORT", function () { var t = report(); ta.value = t; copy(t, function (ok) { cb.textContent = ok ? "COPIED ✓" : "Copy failed — long-press text, Select all"; if (!ok) { ta.focus(); ta.select() } }) });
    btn("Refresh", function () { ta.value = report(); cb.textContent = "COPY REPORT" });
    btn("Close", function () { panel.remove(); panel = null });
    var ta = document.createElement("textarea"); ta.readOnly = true; ta.value = txt; ta.style.cssText = "flex:1;width:100%;background:#050;color:#bfb;border:1px solid #0f04;border-radius:8px;font:10px/1.3 monospace;padding:8px;resize:none";
    panel.appendChild(bar); panel.appendChild(ta); document.body.appendChild(panel);
  }
  document.addEventListener("DOMContentLoaded", ui); setTimeout(ui, 1500);
  log("DEBUG-START", "cv-debug.js running; script ran @" + now() + "ms");
  window.CVDBG = { open: open, report: report, log: log, copy: function () { copy(report(), function () {}) }, probe: probe };
})();
