/* Parda: image safety net for CSS backgrounds.
   <img> posters already fall back to image.tmdb.org if /timg/ fails (app.js), but backgrounds (detail banner, spotlight, thumbnails,
   ambient glow, sticky bar) had no fallback, so one failed request left them black for good. This watches inline styles and, if a
   /timg/ background cannot load, swaps it for the direct TMDB address. */
(() => {
  "use strict";
  const D = "https://image.tmdb.org/t/p/", seen = new WeakMap(), RE = /url\(\s*["']?([^)"']*\/timg\/[^)"']+?)["']?\s*\)/g;
  function check(el) {
    const st = el.getAttribute && el.getAttribute("style");
    if (!st || st.indexOf("/timg/") < 0) return;
    const urls = []; st.replace(RE, (m, u) => { urls.push(u); return m });
    const key = urls.join("|");
    if (!urls.length || seen.get(el) === key) return;
    seen.set(el, key);
    urls.forEach(u => {
      const im = new Image();
      im.onerror = () => {
        const cur = el.getAttribute("style") || "";
        if (cur.indexOf(u) < 0) return;
        el.setAttribute("style", cur.split(u).join(D + u.replace(/^.*\/timg\//, "")));
        seen.set(el, "");
      };
      im.src = u;
    });
  }
  const scan = root => { try { check(root); root.querySelectorAll && root.querySelectorAll('[style*="/timg/"]').forEach(check) } catch (e) {} };
  new MutationObserver(ms => { for (const m of ms) { if (m.type === "attributes") check(m.target); else m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n) }) } })
    .observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
  document.addEventListener("DOMContentLoaded", () => scan(document.documentElement));
})();
