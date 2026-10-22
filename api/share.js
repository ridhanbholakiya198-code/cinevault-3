// Link-preview page for shared things: /s/<movie|tv|person|collection>/<id>, /s/franchise/<key>, /s/list/x?n=<name>&d=m603,t1396
// Gives WhatsApp / Telegram / iMessage a proper title + image, then sends the visitor into the app.
const esc = (t) => String(t || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
module.exports = async (req, res) => {
  const u = new URL(req.url || "/", "http://x");
  const kind = u.searchParams.get("kind") || "", id = u.searchParams.get("id") || "";
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0];
  const origin = host ? "https://" + host : "";
  let title = "CineVault", desc = "Films, series and anime - all in one place.", img = "", good = false, target = "/", path = "";
  const key = process.env.TMDB_API_KEY || "";
  const tmdb = async (p) => { const r = await fetch("https://api.themoviedb.org/3" + p + (p.includes("?") ? "&" : "?") + "api_key=" + key); return r.ok ? r.json() : null; };
  try {
    if (/^(movie|tv|person|collection)$/.test(kind) && /^\d{1,9}$/.test(id)) {
      target = "/#" + kind + "-" + id; path = "/s/" + kind + "/" + id;
      const j = key ? await tmdb("/" + kind + "/" + id) : null;
      if (j) {
        title = (j.title || j.name || "CineVault") + (kind === "collection" ? " (Collection)" : "") + " | CineVault";
        desc = String(j.overview || j.biography || desc).replace(/\s+/g, " ").slice(0, 200);
        const p = j.backdrop_path || j.poster_path || j.profile_path; if (p) img = "https://image.tmdb.org/t/p/w780" + p; good = true;
      }
    } else if (kind === "franchise" && /^[mt]\d{1,9}$/.test(id)) {
      target = "/#fr-" + id; path = "/s/franchise/" + id;
      const j = key ? await tmdb("/" + (id[0] === "t" ? "tv" : "movie") + "/" + id.slice(1)) : null;
      const nm = j ? (j.title || j.name || "") : "";
      title = (nm ? nm + " - full franchise, in order" : "Franchise in order") + " | CineVault";
      desc = "Every part, spin-off and series of the " + (nm || "franchise") + " universe, sorted automatically on CineVault.";
      if (j && (j.backdrop_path || j.poster_path)) img = "https://image.tmdb.org/t/p/w780" + (j.backdrop_path || j.poster_path);
      good = true;
    } else if (kind === "list") {
      const d = (u.searchParams.get("d") || ""), n = (u.searchParams.get("n") || "Shared list").replace(/[^\w \-'&.,!?]/g, "").slice(0, 60) || "Shared list";
      if (/^[mt]\d{1,9}(,[mt]\d{1,9}){0,499}$/.test(d)) {
        const ids = d.split(","); target = "/#list=" + d + "&n=" + encodeURIComponent(n);
        title = n + " - " + ids.length + " title" + (ids.length === 1 ? "" : "s") + " | CineVault";
        desc = "A list of " + ids.length + " films & series shared from CineVault. Open it and add them all to your own list.";
        const f = ids[0], j = key ? await tmdb("/" + (f[0] === "t" ? "tv" : "movie") + "/" + f.slice(1)) : null;
        if (j && (j.backdrop_path || j.poster_path)) img = "https://image.tmdb.org/t/p/w780" + (j.backdrop_path || j.poster_path);
        good = true;
      }
    }
  } catch (_) { }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", good ? "s-maxage=3600, stale-while-revalidate=86400" : "no-store");
  res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + esc(title) + "</title>" +
    '<meta property="og:site_name" content="CineVault"><meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '">' +
    (img ? '<meta property="og:image" content="' + esc(img) + '"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="' + esc(img) + '">' : '<meta name="twitter:card" content="summary">') +
    (origin && path ? '<meta property="og:url" content="' + esc(origin + path) + '">' : "") +
    '<meta http-equiv="refresh" content="0;url=' + esc(target) + '"></head><body style="background:#000;color:#d8d3c8;font-family:sans-serif">' +
    '<script>location.replace(' + JSON.stringify(target).replace(/</g, "\\u003c") + ')</script><p style="padding:24px"><a style="color:#fff" href="' + esc(target) + '">Open in CineVault</a></p></body></html>');
};
