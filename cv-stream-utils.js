// Parda — pure helpers for add-on streams (no DOM needed except where noted).
// Parsing Stremio stream objects, building device-player links, copy helper.

export const httpUrl = (u, httpsOnly = false) => {
  try {
    const x = new URL(u);
    if (x.protocol === "https:" || (!httpsOnly && x.protocol === "http:")) return x.toString();
  } catch { }
  return null;
};

export function buildMagnet(hash, sources, name) {
  const tr = (sources || []).map(s => String(s).replace(/^tracker:/i, "")).filter(Boolean)
    .map(t => "&tr=" + encodeURIComponent(t)).join("");
  return "magnet:?xt=urn:btih:" + hash + "&dn=" + encodeURIComponent(name || "video") + tr;
}

/* ---------- parsing ---------- */
const QUAL = [
  ["4K", 6, /\b(2160p|4k|uhd)\b/i],
  ["1440p", 5, /\b1440p\b/i],
  ["1080p", 4, /\b1080[pi]\b/i],
  ["720p", 3, /\b720p\b/i],
  ["480p", 2, /\b(480p|576p)\b/i],
  ["CAM", -1, /\b(hdcam|camrip|cam|hdts|telesync|hdtc|telecine)\b/i],
];
const TAGS = [
  ["HDR", /\bhdr10\+?|\bhdr\b/i], ["DV", /\b(dolby[ .]?vision|dv)\b/i], ["HEVC", /\b(hevc|x265|h\.?265)\b/i],
  ["AV1", /\bav1\b/i], ["Atmos", /\batmos\b/i], ["5.1", /\b(5\.1|ddp5|dd5|ac3|eac3)\b/i], ["IMAX", /\bimax\b/i],
  ["Remux", /\bremux\b/i], ["BluRay", /\b(blu-?ray|bdrip|brrip)\b/i], ["WEB", /\bweb-?(dl|rip)?\b/i],
];

export function qualityGroup(q) {
  return q === "4K" || q === "1440p" ? "4K" : q === "1080p" ? "1080p" : q === "720p" ? "720p" : "Other";
}


/* ---------- language detection (flags, words, scripts) ---------- */
const FLAG2 = { "🇬🇧": "en", "🇺🇸": "en", "🇦🇺": "en", "🇨🇦": "en", "🇮🇳": "hi", "🇷🇺": "ru", "🇺🇦": "uk", "🇯🇵": "ja", "🇰🇷": "ko", "🇨🇳": "zh", "🇹🇼": "zh", "🇭🇰": "zh", "🇫🇷": "fr", "🇩🇪": "de", "🇮🇹": "it", "🇪🇸": "es", "🇲🇽": "es", "🇵🇹": "pt", "🇧🇷": "pt", "🇳🇱": "nl", "🇵🇱": "pl", "🇹🇷": "tr", "🇸🇦": "ar", "🇪🇬": "ar", "🇹🇭": "th", "🇻🇳": "vi", "🇮🇩": "id", "🇸🇪": "sv", "🇳🇴": "no", "🇩🇰": "da", "🇫🇮": "fi", "🇬🇷": "el", "🇮🇱": "he", "🇨🇿": "cs", "🇭🇺": "hu", "🇷🇴": "ro", "🇵🇰": "ur", "🇧🇩": "bn" };
const LANG_WORDS = [
  ["en", /\b(english|eng)\b/i], ["hi", /\b(hindi|hin)\b/i], ["ta", /\btamil\b/i], ["te", /\btelugu\b/i], ["ml", /\bmalayalam\b/i], ["kn", /\bkannada\b/i],
  ["bn", /\bbengali\b/i], ["pa", /\bpunjabi\b/i], ["mr", /\bmarathi\b/i], ["gu", /\bgujarati\b/i], ["ur", /\burdu\b/i], ["ru", /\b(russian|rus)\b/i],
  ["es", /\b(spanish|espanol|español|castellano|latino)\b/i], ["fr", /\b(french|francais|vff|vfq|vf2|truefrench)\b/i], ["de", /\b(german|deutsch|ger)\b/i],
  ["it", /\b(italian|ita)\b/i], ["pt", /\b(portuguese|dublado|pt-br|ptbr)\b/i], ["ja", /\b(japanese|jpn)\b/i], ["ko", /\b(korean|kor)\b/i],
  ["zh", /\b(chinese|mandarin|cantonese)\b/i], ["ar", /\barabic\b/i], ["tr", /\bturkish\b/i], ["pl", /\b(polish|lektor)\b/i], ["nl", /\bdutch\b/i],
  ["th", /\bthai\b/i], ["vi", /\bvietnamese\b/i], ["id", /\bindonesian\b/i],
];
const SCRIPTS = [["ru", /[\u0400-\u04FF]/], ["hi", /[\u0900-\u097F]/], ["ta", /[\u0B80-\u0BFF]/], ["te", /[\u0C00-\u0C7F]/], ["kn", /[\u0C80-\u0CFF]/], ["ml", /[\u0D00-\u0D7F]/],
  ["bn", /[\u0980-\u09FF]/], ["pa", /[\u0A00-\u0A7F]/], ["gu", /[\u0A80-\u0AFF]/], ["ar", /[\u0600-\u06FF]/], ["he", /[\u0590-\u05FF]/], ["th", /[\u0E00-\u0E7F]/],
  ["ko", /[\uAC00-\uD7AF]/], ["ja", /[\u3040-\u30FF]/], ["zh", /[\u4E00-\u9FFF]/]];
const INDIAN = ["hi", "ta", "te", "ml", "kn", "bn", "pa", "mr", "gu", "ur"];

// Returns the audio languages a release probably carries. "multi" = dual / multi audio.
export function detectLangs(name, body, flags) {
  const text = (name + "\n" + body).replace(/\b[\w-]+[ ._-]*(subs?|subtitles?|subbed)\b/gi, " "); // "ENG SUBS" is not audio
  const out = new Set();
  LANG_WORDS.forEach(([c, re]) => re.test(text) && out.add(c));
  SCRIPTS.forEach(([c, re]) => re.test(body) && out.add(c));
  (flags || []).forEach(f => { const c = FLAG2[f]; if (c && c !== "hi") out.add(c) });
  if ((flags || []).includes("🇮🇳") && !INDIAN.some(c => out.has(c))) out.add("hi");
  const multi = /\b(multi|dual[ ._-]?audio|multi[ ._-]?audio|dual)\b/i.test(text);
  let guess = false;
  if (!out.size && !multi) { out.add("en"); guess = true }
  if (multi) out.add("multi");
  return { langs: [...out], guess };
}

const dnCache = {};
export function langName(code) {
  if (code === "multi") return { native: "Multi audio", en: "Dual or multi language" };
  const mk = l => { try { return dnCache[l] ||= new Intl.DisplayNames([l], { type: "language" }) } catch { return null } };
  let en = code, native = code;
  try { en = (mk("en") && mk("en").of(code)) || code } catch { }
  try { native = (mk(code) && mk(code).of(code)) || en } catch { native = en }
  native = native.charAt(0).toUpperCase() + native.slice(1);
  return { native, en };
}

export function parseMeta(s, addon) {
  const name = String(s.name || ""), body = String(s.title || s.description || "");
  const blob = name + "\n" + body + "\n" + String((s.behaviorHints && s.behaviorHints.filename) || "");
  let q = "", qr = 1;
  for (const [l, r, re] of QUAL) if (re.test(blob)) { q = l; qr = r; break; }
  const seed = /👤\s*(\d+)/.exec(body), size = /💾\s*([\d.,]+\s*[KMGT]i?B)/i.exec(body), src = /⚙️?\s*([^\n]+)/.exec(body);
  const flags = [...new Set(body.match(/[\u{1F1E6}-\u{1F1FF}]{2}/gu) || [])].slice(0, 3);
  const tags = TAGS.filter(([, re]) => re.test(blob)).map(t => t[0]).slice(0, 4);
  const deb = /^\[([A-Za-z]{2,4})([+\-]?|\s[^\]]*)\]/.exec(name.split("\n")[0]);
  const lg = detectLangs(name, body, flags);
  const lines = body.split("\n").map(x => x.trim()).filter(Boolean);
  let head = (lines[0] || name.split("\n")[0] || addon || "Stream").replace(/^\[[^\]]*\]\s*/, "");
  if (/^\S+$/.test(head)) head = head.replace(/\.(?!\d)|(?<!\d)\.|_/g, " ");
  return {
    q, qr, tags, flags, langs: lg.langs, langGuess: lg.guess,
    size: size ? size[1].replace(/\s+/g, " ").trim() : "",
    seeders: seed ? +seed[1] : -1,
    src: src ? src[1].trim().slice(0, 30) : "",
    debrid: deb ? deb[1].toUpperCase() + (deb[2] === "+" ? "+" : "") : "",
    label: head.slice(0, 180),
  };
}

// Turns one Stremio stream object into a card model (or null when unusable).
export function classify(s, addon, key) {
  if (!s || typeof s !== "object") return null;
  const m = parseMeta(s, addon), bh = s.behaviorHints || {};
  const base = { key, addon, ...m, hdr: !!bh.proxyHeaders };
  const isMagnet = typeof s.url === "string" && /^magnet:/i.test(s.url);
  if (typeof s.url === "string" && !isMagnet && typeof s.infoHash === "string" && /^[a-f0-9]{40}$/i.test(s.infoHash))
    return { ...base, kind: "torrent", infoHash: s.infoHash, magnet: buildMagnet(s.infoHash, s.sources, m.label), directUrl: httpUrl(s.url) || "" }; // Webtor is the default player for anything that is a torrent
  if (typeof s.url === "string" && !isMagnet) {
    const u = httpUrl(s.url);
    if (u) return { ...base, kind: "direct", url: u, secure: u.startsWith("https:"), webHint: !!bh.notWebReady };
  }
  if (typeof s.ytId === "string" && /^[\w-]{11}$/.test(s.ytId)) return { ...base, kind: "youtube", id: s.ytId };
  if (typeof s.externalUrl === "string") {
    const u = httpUrl(s.externalUrl, true);
    if (u) return { ...base, kind: "external", url: u };
  }
  if (isMagnet) {
    const h = /btih:([a-z0-9]{32,40})/i.exec(s.url);
    return { ...base, kind: "torrent", infoHash: h ? h[1] : "", magnet: s.url };
  }
  if (typeof s.infoHash === "string" && /^[a-f0-9]{40}$/i.test(s.infoHash))
    return { ...base, kind: "torrent", infoHash: s.infoHash, magnet: buildMagnet(s.infoHash, s.sources, m.label) };
  return null;
}

// Best-first: quality, then seeders, then the add-on's own order.
export function sortStreams(list) {
  return list.map((s, i) => [s, i]).sort((a, b) => (b[0].qr - a[0].qr) || (b[0].seeders - a[0].seeders) || (a[1] - b[1])).map(x => x[0]);
}
export function dedupe(list) {
  const seen = new Set();
  return list.filter(s => { const k = s.infoHash ? "h:" + s.infoHash.toLowerCase() : (s.url || s.id || s.key); if (seen.has(k)) return false; seen.add(k); return true; });
}

/* ---------- device players ---------- */
export function platform() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  if (/android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}

export const ANDROID_APPS = [
  { id: "chooser", name: "Choose app", note: "Pick any installed video player", pkg: "" },
  { id: "vlc", name: "VLC", note: "VLC for Android", pkg: "org.videolan.vlc" },
  { id: "mx", name: "MX Player", note: "Free version", pkg: "com.mxtech.videoplayer.ad" },
  { id: "mxpro", name: "MX Player Pro", note: "Paid version", pkg: "com.mxtech.videoplayer.pro" },
  { id: "just", name: "Just Player", note: "Just (Video) Player", pkg: "com.brouken.player" },
  { id: "mpv", name: "mpv", note: "mpv-android", pkg: "is.xyz.mpv" },
];
export const IOS_APPS = [
  { id: "vlc", name: "VLC", note: "VLC for Mobile" },
  { id: "infuse", name: "Infuse", note: "Infuse 7" },
];

// Android "intent:" link. With pkg it opens that app (or its Play Store page); without, the system app chooser.
export function androidIntent(url, title, pkg) {
  const u = new URL(url);
  let out = "intent://" + u.host + u.pathname + u.search + "#Intent;scheme=" + u.protocol.slice(0, -1) +
    ";action=android.intent.action.VIEW;type=video/*;";
  if (pkg) out += "package=" + pkg + ";S.browser_fallback_url=" + encodeURIComponent("https://play.google.com/store/apps/details?id=" + pkg) + ";";
  if (title) out += "S.title=" + encodeURIComponent(String(title).slice(0, 120)) + ";";
  return out + "end";
}
export const iosLink = (app, url) => app === "infuse"
  ? "infuse://x-callback-url/play?url=" + encodeURIComponent(url)
  : "vlc-x-callback://x-callback-url/stream?url=" + encodeURIComponent(url);

export function m3uText(url, title) {
  return "#EXTM3U\n#EXTINF:-1," + String(title || "Parda").replace(/[\r\n,]+/g, " ").slice(0, 120) + "\n" + url + "\n";
}

// DOM-only helpers below.
export function downloadM3u(url, title) {
  const blob = new Blob([m3uText(url, title)], { type: "audio/x-mpegurl" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (String(title || "stream").replace(/[^\w.\- ]+/g, "").trim().slice(0, 60) || "stream") + ".m3u";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true } catch { }
  try {
    const x = document.createElement("textarea"); x.value = t; x.setAttribute("readonly", ""); x.style.cssText = "position:fixed;opacity:0;top:0";
    document.body.append(x); x.select(); const ok = document.execCommand("copy"); x.remove(); return ok;
  } catch { return false }
}

// Opens a stream in an installed app. Returns a short message for the toast.
export function launch(s, app) {
  if (s.kind === "torrent") { location.href = s.magnet; return "Opening your torrent app…" }
  const plat = platform();
  if (plat === "android") {
    const a = ANDROID_APPS.find(x => x.id === app) || ANDROID_APPS[0];
    location.href = androidIntent(s.url, s.label, a.pkg);
    return app === "chooser" || !app ? "Pick a player…" : "Opening " + a.name + "…";
  }
  if (plat === "ios") {
    location.href = iosLink(app, s.url);
    return "Opening " + (app === "infuse" ? "Infuse" : "VLC") + "… If nothing happens, install it first.";
  }
  downloadM3u(s.url, s.label);
  return "Playlist downloaded. Open it with VLC or any player.";
}

export const linkOf = s => s.kind === "torrent" ? s.magnet : s.kind === "youtube" ? "https://www.youtube.com/watch?v=" + s.id : s.url;
