// CineVault — in-browser player overlay.
//  • direct / HLS links  -> custom HTML5 player (subtitles, audio tracks, speed, resume, gestures)
//  • torrents / magnets  -> Webtor server player (handles HEVC, AC3/DDP, MKV on the server)
//  • YouTube             -> privacy-friendly embed
// Opened with the site's overlay stack, so the Android back button closes it.
import { copyText, linkOf } from "./cv-stream-utils.js";

const HLS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js";
const WT_SDK = "https://cdn.jsdelivr.net/npm/@webtor/embed-sdk-js/dist/index.min.js";

const IC = {
  play: "M8 5v14l11-7z", pause: "M6 5h4v14H6zM14 5h4v14h-4z",
  rw: "M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z",
  back: "M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z",
  vol: "M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z",
  mute: "M3 9v6h4l5 5V4L7 9H3zm13.6.6L18 11l1.4-1.4 1.4 1.4-1.4 1.4 1.4 1.4-1.4 1.4L18 13.8l-1.4 1.4-1.4-1.4 1.4-1.4-1.4-1.4z",
  cc: "M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM11 11H9.5v-.5h-2v3h2V13H11v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z",
  pip: "M19 11h-8v6h8zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18z",
  fs: "M7 14H5v5h5v-2H7zM5 10h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z",
  phone: "M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm0 17H7V5h10z",
};
const ic = n => `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="${IC[n]}"/></svg>`;
const p2 = n => String(n).padStart(2, "0");
const fmt = s => { if (!isFinite(s) || s < 0) s = 0; s = Math.floor(s); const h = s / 3600 | 0, m = s % 3600 / 60 | 0; return (h ? h + ":" + p2(m) : m) + ":" + p2(s % 60) };
const store = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, x) => { try { localStorage.setItem(k, x) } catch { } }, del: k => { try { localStorage.removeItem(k) } catch { } } };
const hash = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) };
const SUB = /\.(srt|vtt)$/i;
const dn = (() => { try { return new Intl.DisplayNames(["en"], { type: "language" }) } catch { return null } })();
const L3 = { eng: "en", hin: "hi", spa: "es", fre: "fr", fra: "fr", ger: "de", deu: "de", por: "pt", ita: "it", ara: "ar", rus: "ru", jpn: "ja", kor: "ko", chi: "zh", zho: "zh", tam: "ta", tel: "te", ben: "bn", tur: "tr", ind: "id" };
function subLang(n) {
  const t = n.replace(SUB, "").split(/[.\s_\-\[\]()]+/).reverse();
  for (const x of t) { const c = (x.length == 2 ? x : L3[x.toLowerCase()] || "").toLowerCase(); if (c && dn) { try { const r = dn.of(c); if (r && r !== c) return { code: c, label: r } } catch { } } }
  return { code: "", label: n.replace(SUB, "").slice(-26) };
}

let hlsP = null, wtSeq = 0;
const loadHls = () => window.Hls ? Promise.resolve(window.Hls) : (hlsP ||= new Promise((res, rej) => {
  const s = document.createElement("script"); s.src = HLS_SRC; s.async = true;
  s.onload = () => res(window.Hls); s.onerror = () => { hlsP = null; s.remove(); rej(new Error("hls")) }; document.head.append(s);
}));

export function openPlayer(s, h) {
  const { openOv, closeOv, esc, say } = h;
  const ov = openOv("player", "cv-pl"), box = ov.querySelector(".cva-box");
  const title = s.label || "Stream";
  const close = () => closeOv(ov);
  const toDevice = () => h.device && h.device(s);

  if (s.kind === "torrent") return webtor();
  if (s.kind === "youtube") return youtube();
  return native();

  /* ---------- YouTube ---------- */
  function youtube() {
    box.innerHTML = `<div class="cvp cvp-wt"><div class="cvp-wtop"><button type="button" class="cvp-ib" data-c="close" aria-label="Close player">${ic("back")}</button><span class="cvp-ttl">${esc(title)}</span></div>` +
      `<div class="cvp-wtp"><iframe title="YouTube player" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(s.id)}?autoplay=1&rel=0&playsinline=1" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div></div>`;
    box.addEventListener("click", e => { if (e.target.closest('[data-c="close"]')) close() });
    ov._onclose = () => { box.innerHTML = "" };
  }

  /* ---------- Webtor (torrent / magnet) ---------- */
  function webtor() {
    const magnet = s.magnet;
    box.innerHTML = `<div class="cvp cvp-wt"><div class="cvp-wtop"><button type="button" class="cvp-ib" data-c="close" aria-label="Close player">${ic("back")}</button><span class="cvp-ttl">${esc(title)}</span>` +
      `<button type="button" class="cvp-pill" data-c="copy">Copy magnet</button><a class="cvp-pill" target="_blank" rel="noopener noreferrer" href="https://webtor.io/#?magnet=${encodeURIComponent(magnet)}">webtor.io ↗</a>` +
      `<button type="button" class="cvp-ib" data-c="dev" aria-label="Open in torrent app" title="Open in torrent app">${ic("phone")}</button></div><div class="cvp-wtp"></div></div>`;
    const host = box.querySelector(".cvp-wtp");
    box.addEventListener("click", async e => {
      const c = e.target.closest("[data-c]"); if (!c) return;
      if (c.dataset.c === "close") close();
      else if (c.dataset.c === "copy") say((await copyText(magnet)) ? "Magnet copied" : "Couldn’t copy");
      else if (c.dataset.c === "dev") toDevice();
      else if (c.dataset.c === "retry") start();
    });
    function start() {
      host.innerHTML = "";
      const id = "cvwt" + (++wtSeq), mount = document.createElement("div"); mount.id = id; host.append(mount);
      window.webtor = window.webtor || [];
      try {
        window.webtor.push({
          id, baseUrl: "https://webtor.io", magnet, width: "100%", height: "100%", header: true, controls: true, lang: "en",
          features: { p2pProgress: true, title: true, settings: true, fullscreen: true, subtitles: true, opensubtitles: true, continue: true, playpause: true, currentTime: true, timeline: true, duration: true, volume: true, chromecast: true, browse: true, download: true },
        });
      } catch (err) { return fail("Webtor could not start: " + (err && err.message)) }
      if (!document.getElementById("wt-sdk")) {
        const sc = document.createElement("script");
        sc.id = "wt-sdk"; sc.async = true; sc.charset = "utf-8"; sc.src = WT_SDK;
        sc.onerror = () => { sc.remove(); fail("The Webtor player could not be loaded. Check your connection.") };
        document.head.append(sc);
      }
    }
    function fail(msg) { host.innerHTML = `<div class="cvp-msg"><p>${esc(msg)}</p><button type="button" class="cvp-pill on" data-c="retry">Try again</button></div>` }
    ov._onclose = () => { host.innerHTML = ""; box.innerHTML = "" };
    start();
  }

  /* ---------- Native player ---------- */
  function native() {
    const T = (c, a, extra = "") => `<button type="button" class="cvp-ib ${extra}" data-c="${c}" aria-label="${a}"></button>`;
    box.innerHTML = `<div class="cvp"><video class="cvp-v" playsinline preload="auto"></video><div class="cvp-layer"></div>` +
      `<div class="cvp-load on"><div class="cvp-spin"></div><div class="cvp-ls">Loading…</div></div><div class="cvp-skip"></div>` +
      `<div class="cvp-top">${T("close", "Close player")}<span class="cvp-ttl">${esc(title)}</span>${T("dev", "Open in device player")}</div>` +
      `<div class="cvp-bot"><div class="cvp-bar"><div class="cvp-bf"></div><div class="cvp-pf"></div><div class="cvp-th"></div><div class="cvp-tip">0:00</div></div>` +
      `<div class="cvp-row">${T("pp", "Play or pause")}${T("rw", "Back 10 seconds")}${T("ff", "Forward 10 seconds", "fw")}` +
      `<div class="cvp-row cvp-vg">${T("mu", "Mute")}<input class="cvp-vr" type="range" min="0" max="1" step=".05" value="1" aria-label="Volume"></div>` +
      `<span class="cvp-tm">0:00 / 0:00</span><span class="cvp-sp"></span>${T("cc", "Subtitles, audio and speed")}${T("pip", "Picture in picture")}${T("fs", "Fullscreen")}</div></div>` +
      `<div class="cvp-menu" hidden></div><input class="cvp-sf" type="file" accept=".srt,.vtt" hidden><div class="cvp-toast" role="status"></div></div>`;
    const q = x => box.querySelector(x), root = q(".cvp"), v = q(".cvp-v"), load = q(".cvp-load"), menu = q(".cvp-menu"), bar = q(".cvp-bar");
    const map = { close: "back", dev: "phone", rw: "rw", ff: "rw", cc: "cc", pip: "pip", fs: "fs" };
    Object.entries(map).forEach(([c, i]) => { const b = q(`[data-c="${c}"]`); if (b) b.innerHTML = ic(i) });
    const $pp = q('[data-c="pp"]'), $mu = q('[data-c="mu"]');
    const key = "cvp:" + hash(s.url || ""); let started = false, failing = false, hls = null, subN = {};
    const toast = t => { const e = q(".cvp-toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 2000) };

    function fail(msg) {
      if (failing) return; failing = true; try { v.pause() } catch { }
      load.className = "cvp-load on bad";
      q(".cvp-ls").innerHTML = `<b>This stream can’t play in the browser</b><span>${esc(msg)}</span>` +
        `<span class="cvp-acts"><button type="button" class="cvp-pill on" data-c="dev">Open in device player</button><button type="button" class="cvp-pill" data-c="close">Close</button></span>`;
    }

    /* source */
    if (/\.m3u8(\?|#|$)/i.test(s.url) && !v.canPlayType("application/vnd.apple.mpegurl")) {
      loadHls().then(Hls => {
        if (!Hls || !Hls.isSupported()) return fail("This browser can’t play HLS streams.");
        hls = new Hls(); hls.on(Hls.Events.ERROR, (_e, d) => { if (d && d.fatal) fail("Stream error: " + (d.details || "unknown")) });
        hls.loadSource(s.url); hls.attachMedia(v); v.play().catch(() => { });
      }).catch(() => fail("Couldn’t load the video player library."));
    } else { v.src = s.url; v.play().catch(() => { }) }

    /* subtitles / audio / speed menu */
    async function addSub(blob, name) {
      let t = await blob.text();
      if (!/^\s*WEBVTT/.test(t)) t = "WEBVTT\n\n" + t.replace(/\r/g, "").replace(/(\d+:\d+:\d+),(\d+)/g, "$1.$2");
      const { code, label } = subLang(name); subN[label] = (subN[label] || 0) + 1;
      const el = document.createElement("track"); el.kind = "subtitles"; el.label = subN[label] > 1 ? label + " " + subN[label] : label;
      if (code) el.srclang = code; el.src = URL.createObjectURL(new Blob([t], { type: "text/vtt" }));
      v.append(el); el.track.mode = "disabled";
      if (!menu.hidden) renderMenu();
    }
    const setSub = i => { [...v.textTracks].forEach((t, j) => t.mode = j === i ? "showing" : "disabled"); renderMenu(); toast(i < 0 ? "Subtitles off" : "Subtitles: " + v.textTracks[i].label) };
    const setAudio = i => { const a = v.audioTracks; for (let j = 0; j < a.length; j++) a[j].enabled = j === i; renderMenu(); toast("Audio: " + (a[i].label || a[i].language || "Track " + (i + 1))) };
    function renderMenu() {
      const tt = [...v.textTracks].filter(t => t.kind === "subtitles" || t.kind === "captions"), at = v.audioTracks;
      let m = '<h4>Subtitles</h4><button type="button" class="it' + (tt.some(t => t.mode === "showing") ? "" : " on") + '" data-a="sub" data-i="-1">Off</button>';
      tt.forEach((t, i) => m += `<button type="button" class="it${t.mode === "showing" ? " on" : ""}" data-a="sub" data-i="${i}">${esc(t.label || t.language || "Track " + (i + 1))}</button>`);
      m += '<button type="button" class="it" data-a="addsub">Add subtitle file…</button><h4>Audio language</h4>';
      if (at && at.length > 1) for (let i = 0; i < at.length; i++) m += `<button type="button" class="it${at[i].enabled ? " on" : ""}" data-a="aud" data-i="${i}">${esc(at[i].label || at[i].language || "Track " + (i + 1))}</button>`;
      else m += "<p>Only one audio track is available in this browser or file. Other languages? Use a device player.</p>";
      m += "<h4>Speed</h4>"; [.5, .75, 1, 1.25, 1.5, 2].forEach(x => m += `<button type="button" class="it${v.playbackRate === x ? " on" : ""}" data-a="spd" data-i="${x}">${x === 1 ? "Normal" : x + "×"}</button>`);
      menu.innerHTML = m;
    }
    menu.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return; const a = b.dataset.a, i = +b.dataset.i;
      if (a === "sub") setSub(i); else if (a === "aud") setAudio(i); else if (a === "spd") { v.playbackRate = i; renderMenu() } else if (a === "addsub") q(".cvp-sf").click();
    });
    q(".cvp-sf").onchange = async e => { const f = e.target.files[0]; if (f) { await addSub(f, f.name); setSub(v.textTracks.length - 1) } e.target.value = "" };

    /* controls */
    const toggle = () => v.paused ? v.play().catch(() => { }) : v.pause();
    const skipBy = n => {
      if (!n) return; v.currentTime = Math.max(0, Math.min(v.duration || 1e9, v.currentTime + n));
      const k = q(".cvp-skip"); k.textContent = (n > 0 ? "+" : "−") + Math.abs(n) + "s"; k.style.left = n > 0 ? "70%" : "20%"; k.classList.add("on"); clearTimeout(skipBy.t); skipBy.t = setTimeout(() => k.classList.remove("on"), 500);
    };
    const isFs = () => document.fullscreenElement || document.webkitFullscreenElement;
    const fs = () => {
      const d = document;
      if (isFs()) { try { (d.exitFullscreen || d.webkitExitFullscreen).call(d) } catch { } try { screen.orientation.unlock() } catch { } }
      else if (root.requestFullscreen) root.requestFullscreen().then(() => { try { screen.orientation.lock("landscape") } catch { } }).catch(() => { });
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    };
    q(".cvp-vr").oninput = e => { v.volume = +e.target.value; v.muted = false };
    box.addEventListener("click", e => {
      const c = e.target.closest("[data-c]"); if (!c) return;
      ({
        close, dev: toDevice, pp: toggle, rw: () => skipBy(-10), ff: () => skipBy(10), fs, mu: () => { v.muted = !v.muted },
        cc: () => { e.stopPropagation(); menu.hidden = !menu.hidden; if (!menu.hidden) renderMenu() },
        pip: () => { if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => { }); else if (v.requestPictureInPicture) v.requestPictureInPicture().catch(() => toast("Picture in picture not available")); else toast("Picture in picture not supported") },
      })[c.dataset.c]?.();
    });

    v.addEventListener("volumechange", () => { $mu.innerHTML = ic(v.muted || !v.volume ? "mute" : "vol"); q(".cvp-vr").value = v.muted ? 0 : v.volume });
    let sv = 0;
    function upd() {
      const d = v.duration || 0, c = v.currentTime; q(".cvp-pf").style.width = q(".cvp-th").style.left = d ? c / d * 100 + "%" : "0";
      let be = 0; for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= c + .5 && v.buffered.end(i) >= c) be = v.buffered.end(i);
      q(".cvp-bf").style.width = d ? be / d * 100 + "%" : "0"; q(".cvp-tm").textContent = fmt(c) + " / " + fmt(d);
      if (Date.now() - sv > 4000 && c > 5) { sv = Date.now(); store.set(key, c) }
    }
    ["timeupdate", "progress", "durationchange"].forEach(e => v.addEventListener(e, upd));
    v.addEventListener("play", () => { $pp.innerHTML = ic("pause"); wake() });
    v.addEventListener("pause", () => { $pp.innerHTML = ic("play"); wake() });
    v.addEventListener("loadedmetadata", () => {
      const r = parseFloat(store.get(key)); if (r && r < v.duration - 30) { v.currentTime = r; toast("Resumed at " + fmt(r)) }
      if (v.audioTracks && v.audioTracks.length > 1) toast(v.audioTracks.length + " audio tracks available");
    });
    v.addEventListener("playing", () => { started = true; load.className = "cvp-load" });
    v.addEventListener("waiting", () => { if (started && !failing) { load.className = "cvp-load on"; q(".cvp-ls").textContent = "Buffering…" } });
    v.addEventListener("canplay", () => { if (!failing) load.className = "cvp-load" });
    v.addEventListener("error", () => {
      if (!v.getAttribute("src") && !hls) return;
      const c = v.error && v.error.code;
      fail(c === 4 || c === 3 ? "Your browser can’t decode this format or codec (for example HEVC, AC3 or MKV), or the source blocks browsers." : "The video failed to load. The source may be offline.");
    });
    v.addEventListener("ended", () => store.del(key));
    $pp.innerHTML = ic("play"); $mu.innerHTML = ic("vol");

    /* seek bar */
    let drag = false;
    const frac = x => { const r = bar.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)) };
    bar.addEventListener("pointerdown", e => { drag = true; bar.classList.add("d"); try { bar.setPointerCapture(e.pointerId) } catch { } v.currentTime = frac(e.clientX) * (v.duration || 0) });
    bar.addEventListener("pointermove", e => { const f = frac(e.clientX); q(".cvp-tip").style.left = f * 100 + "%"; q(".cvp-tip").textContent = fmt(f * (v.duration || 0)); if (drag) v.currentTime = f * (v.duration || 0) });
    bar.addEventListener("pointerup", () => { drag = false; bar.classList.remove("d") });

    /* tap / click gestures */
    let lt = 0;
    q(".cvp-layer").addEventListener("pointerup", e => {
      if (!menu.hidden) { menu.hidden = true; return }
      const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, n = Date.now(), dbl = n - lt < 300;
      if (e.pointerType === "touch") {
        if (dbl) { lt = 0; x < .4 ? skipBy(-10) : x > .6 ? skipBy(10) : toggle(); return }
        lt = n; setTimeout(() => { if (lt === n) root.classList.contains("idle") ? wake() : root.classList.add("idle") }, 300);
      } else {
        if (dbl) { lt = 0; fs(); return }
        lt = n; setTimeout(() => { if (lt === n) toggle() }, 300);
      }
    });
    let idleT; function wake() { root.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => { if (!v.paused && menu.hidden) root.classList.add("idle") }, 3000) }
    ["mousemove", "keydown", "pointerdown"].forEach(e => root.addEventListener(e, wake));

    /* keyboard (only while this player is the top overlay) */
    const onKey = e => {
      const top = [...document.querySelectorAll(".cva")].pop(); if (top !== ov) return;
      if (/INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== "range") return;
      const k = e.key.toLowerCase(); let hnd = true;
      if (k === " " || k === "k") toggle(); else if (k === "arrowleft") skipBy(-5); else if (k === "arrowright") skipBy(5);
      else if (k === "j") skipBy(-10); else if (k === "l") skipBy(10);
      else if (k === "arrowup") { v.volume = Math.min(1, v.volume + .1); toast("Volume " + Math.round(v.volume * 100) + "%") }
      else if (k === "arrowdown") { v.volume = Math.max(0, v.volume - .1); toast("Volume " + Math.round(v.volume * 100) + "%") }
      else if (k === "m") v.muted = !v.muted; else if (k === "f") fs();
      else if (k === "c") { const n = v.textTracks.length; if (n) { const c = [...v.textTracks].findIndex(t => t.mode === "showing"); setSub(c + 1 >= n ? -1 : c + 1) } }
      else hnd = false;
      if (hnd) e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    const onVis = () => { if (document.hidden && !document.pictureInPictureElement) { try { v.pause() } catch { } } };
    document.addEventListener("visibilitychange", onVis);

    ov._onclose = () => {
      document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis);
      clearTimeout(idleT);
      if (hls) { try { hls.destroy() } catch { } hls = null }
      try { v.pause(); v.removeAttribute("src"); v.load() } catch { }
      v.querySelectorAll("track").forEach(t => { try { URL.revokeObjectURL(t.src) } catch { } });
      try { if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); screen.orientation.unlock() } catch { }
    };
    wake();
  }
}
