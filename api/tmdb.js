// Vercel serverless proxy: key stays in env var TMDB_API_KEY, never reaches the browser.
module.exports = async (req, res) => {
  const key = process.env.TMDB_API_KEY;
  if (!key) return res.status(500).json({ error: "TMDB_API_KEY missing" });
  const u = new URL(req.url, "http://x");
  const path = u.searchParams.get("path") || "";
  if (!/^\/[a-zA-Z0-9_\/-]+$/.test(path)) return res.status(400).json({ error: "bad path" });
  u.searchParams.delete("path");
  u.searchParams.set("api_key", key);
  try {
    const r = await fetch("https://api.themoviedb.org/3" + path + "?" + u.searchParams);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    res.status(r.status).send(await r.text());
  } catch (e) { res.status(502).json({ error: "upstream" }); }
};
