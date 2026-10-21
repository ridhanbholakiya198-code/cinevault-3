// Vercel serverless proxy for TMDB. Never crashes: every failure comes back as JSON with a reason.
// /api/tmdb?ping=1 -> health check (shows whether env TMDB_API_KEY is set).
module.exports = async (req, res) => {
  try {
    const u = new URL(req.url || "/", "http://x");
    const key = process.env.TMDB_API_KEY || "";
    res.setHeader("Content-Type", "application/json");
    if (u.searchParams.get("ping")) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(JSON.stringify({ ok: true, hasKey: !!key, keyLen: key.length, node: process.version }));
    }
    if (!key) return res.status(500).send(JSON.stringify({ error: "TMDB_API_KEY missing" }));
    const path = u.searchParams.get("path") || "";
    if (!/^\/[a-zA-Z0-9_\/-]+$/.test(path)) return res.status(400).send(JSON.stringify({ error: "bad path" }));
    u.searchParams.delete("path");
    u.searchParams.set("api_key", key);
    const r = await fetch("https://api.themoviedb.org/3" + path + "?" + u.searchParams.toString());
    // only cache good answers: a cached error would keep showing "could not load" for minutes
    res.setHeader("Cache-Control", r.ok ? "s-maxage=600, stale-while-revalidate=3600" : "no-store");
    return res.status(r.status).send(await r.text());
  } catch (e) {
    try { res.status(502).send(JSON.stringify({ error: "proxy failed", detail: String((e && e.message) || e).slice(0, 200) })); } catch (_) { }
  }
};
