export default async function handler(req, res) {
  const { path, ...rest } = req.query || {};
  if (!path || typeof path !== "string" || !path.startsWith("/") || path.includes("..")) {
    return res.status(400).json({ error: "bad path" });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "missing TMDB_API_KEY environment variable" });
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(rest)) {
    if (v != null) url.searchParams.set(k, String(v));
  }

  try {
    const r = await fetch(url.toString());
    const data = await r.json();
    res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=1800");
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Upstream fetch error" });
  }
}
