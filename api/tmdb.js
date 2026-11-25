// Vercel serverless proxy for TMDB. Never crashes: every failure comes back as JSON with a reason.
// Open /api/tmdb?ping=1 to check it is deployed and which env var it found (names only, never the key).
// Key: set ONE of these in Vercel -> Settings -> Environment Variables (then Redeploy):
//   TMDB_API_KEY (v3 key)  or  TMDB_READ_TOKEN / TMDB_ACCESS_TOKEN (v4 "Read Access Token", starts with eyJ)
const NAMES = ["TMDB_API_KEY", "TMDB_KEY", "TMDB_READ_TOKEN", "TMDB_ACCESS_TOKEN", "TMDB_TOKEN", "TMDB_API_TOKEN", "TMDB_BEARER_TOKEN", "TMDB"];
const pick = () => { for (const n of NAMES) { const v = (process.env[n] || "").trim(); if (v) return { name: n, value: v }; } return { name: "", value: "" }; };
module.exports = async (req, res) => {
  try {
    const u = new URL(req.url || "/", "http://x");
    const { name, value } = pick();
    res.setHeader("Content-Type", "application/json");
    if (u.searchParams.get("ping")) {
      res.setHeader("Cache-Control", "no-store");
      const seen = Object.keys(process.env).filter((k) => /tmdb/i.test(k));
      return res.status(200).send(JSON.stringify({ ok: true, hasKey: !!value, usedEnv: name || null, tmdbEnvNamesFound: seen, keyType: value ? (value.startsWith("eyJ") ? "v4 token" : "v3 key") : null, node: process.version }));
    }
    if (!value) { res.setHeader("Cache-Control", "no-store"); return res.status(500).send(JSON.stringify({ error: "TMDB key missing in Vercel env" })); }
    const path = u.searchParams.get("path") || "";
    if (!/^\/[a-zA-Z0-9_\/-]+$/.test(path)) { res.setHeader("Cache-Control", "no-store"); return res.status(400).send(JSON.stringify({ error: "bad path" })); }
    u.searchParams.delete("path");
    const headers = { Accept: "application/json" };
    if (value.startsWith("eyJ")) headers.Authorization = "Bearer " + value; else u.searchParams.set("api_key", value);
    const r = await fetch("https://api.themoviedb.org/3" + path + "?" + u.searchParams.toString(), { headers });
    // cache successes only, so a bad moment can never get a 404/500 stuck at the edge
    res.setHeader("Cache-Control", r.ok ? "s-maxage=600, stale-while-revalidate=3600" : "no-store");
    return res.status(r.status).send(await r.text());
  } catch (e) {
    try { res.setHeader("Cache-Control", "no-store"); res.status(502).send(JSON.stringify({ error: "proxy failed", detail: String((e && e.message) || e).slice(0, 200) })); } catch (_) { }
  }
};
