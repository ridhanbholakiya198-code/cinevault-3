// Link-preview page for shared shows / people: /s/<movie|tv|person>/<id>
// Gives WhatsApp / Telegram / iMessage a proper title + image, then sends the visitor into the app.
const esc = (t) => String(t || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
module.exports = async (req, res) => {
  const u = new URL(req.url || "/", "http://x");
  const kind = u.searchParams.get("kind") || "", id = u.searchParams.get("id") || "";
  const ok = /^(movie|tv|person)$/.test(kind) && /^\d{1,9}$/.test(id);
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0];
  const origin = host ? "https://" + host : "";
  const target = ok ? "/#" + kind + "-" + id : "/";
  let title = "CineVault", desc = "Films, series and anime - all in one place.", img = "", good = false;
  try {
    const key = process.env.TMDB_API_KEY || "";
    if (ok && key) {
      const r = await fetch("https://api.themoviedb.org/3/" + kind + "/" + id + "?api_key=" + key);
      if (r.ok) {
        const j = await r.json();
        title = (j.title || j.name || title) + " | CineVault";
        desc = String(j.overview || j.biography || desc).replace(/\s+/g, " ").slice(0, 200);
        const p = j.backdrop_path || j.poster_path || j.profile_path;
        if (p) img = "https://image.tmdb.org/t/p/w780" + p;
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
    (img ? '<meta property="og:image" content="' + esc(img) + '"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="' + esc(img) + '">' : "") +
    (origin ? '<meta property="og:url" content="' + esc(origin + "/s/" + kind + "/" + id) + '">' : "") +
    '<meta http-equiv="refresh" content="0;url=' + esc(target) + '"></head><body style="background:#07080a;color:#d8d3c8;font-family:sans-serif">' +
    '<script>location.replace(' + JSON.stringify(target) + ')</script><p style="padding:24px"><a style="color:#fff" href="' + esc(target) + '">Open in CineVault</a></p></body></html>');
};
