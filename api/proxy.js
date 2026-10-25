// CORS fallback for Stremio add-on JSON only (manifest / catalog / meta / stream / subtitles).
// Not an open proxy: GET, https, add-on JSON paths only, public hosts only, small size, short timeout. Nothing is logged or stored.
const dns = require("dns").promises, net = require("net");
const OK_PATH = /(^|\/)manifest\.json$|\/(catalog|meta|stream|subtitles)\/[^?#]+\.json$/i;
const priv = (ip) => {
  if (net.isIPv6(ip)) return /^(::1?$|f[cd]|fe[89ab]|::ffff:)/i.test(ip);
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
};
async function safe(u) {
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  if (net.isIP(u.hostname)) return !priv(u.hostname);
  const r = await dns.lookup(u.hostname, { all: true });
  return r.length > 0 && r.every((x) => !priv(x.address));
}
module.exports = async (req, res) => {
  const fail = (c, m) => { res.statusCode = c; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error: m })); };
  if (req.method !== "GET") return fail(405, "GET only");
  try {
    let u = new URL(new URL(req.url || "/", "http://x").searchParams.get("u") || "");
    let r;
    for (let i = 0; i < 3; i++) { // follow up to 2 redirects, re-checking every hop
      if (!OK_PATH.test(u.pathname) || !(await safe(u))) return fail(400, "URL not allowed");
      r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 Parda" } });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { u = new URL(r.headers.get("location"), u); continue; }
      break;
    }
    if (!r || !r.ok) { res.setHeader("X-Upstream-Status", String(r ? r.status : 0)); return fail(502, "upstream " + (r ? r.status : "no response")) }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 2e6) return fail(413, "Response too large");
    JSON.parse(buf.toString("utf8")); // must be JSON
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.end(buf);
  } catch (e) { fail(502, "Could not fetch add-on"); }
};
