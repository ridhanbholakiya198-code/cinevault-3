/* Parda v51 — poster fly.
   Tap a poster: that same poster lifts off its card and flies into the detail page.
   • Desktop / wide screens: it lands exactly on the detail poster.
   • Phones (detail poster is hidden there): it grows to fill the backdrop and melts into it.
   Add-on only: does not touch app.js. Skipped for reduced-motion and the "lite" low-power mode. */
(() => {
  "use strict";
  const md = document.getElementById("modal"), mc = document.getElementById("mc"), root = document.documentElement;
  if (!md || !mc || !md.animate) return;
  const RM = matchMedia("(prefers-reduced-motion: reduce)");
  const MAX_WAIT = 2500, DUR = 640, EASE = "cubic-bezier(.65,0,.2,1)";
  let tap = null, busy = false;

  // 1. Remember which poster was tapped (position, picture, corner radius)
  addEventListener("pointerdown", e => {
    const card = e.target.closest && e.target.closest(".card");
    const im = card && card.querySelector("img");
    if (!im || !im.complete || !im.naturalWidth) { tap = null; return }
    const r = im.getBoundingClientRect();
    if (r.width < 24 || r.bottom < 0 || r.top > innerHeight) { tap = null; return }
    tap = {
      src: im.currentSrc || im.src, t: performance.now(),
      r: { left: r.left, top: r.top, width: r.width, height: r.height },
      rad: getComputedStyle(im).borderRadius || "10px"
    };
  }, { capture: true, passive: true });
  addEventListener("keydown", () => { tap = null }, { capture: true, passive: true });

  // 2. When the real detail page is drawn (it has .tr backdrop + .dp poster), fly
  new MutationObserver(() => {
    if (!tap || busy || md.hidden || RM.matches || root.classList.contains("lite")) return;
    const dp = mc.querySelector(".dp"), tr = mc.querySelector(".tr");
    if (!dp || !tr) return;                       // still the "Loading…" skeleton
    const t = tap; tap = null;
    if (performance.now() - t.t > MAX_WAIT) return; // arrived too late, a fly would look odd
    busy = true;
    const toPoster = getComputedStyle(dp).display !== "none";
    const ready = toPoster
      ? Promise.race([dp.decode ? dp.decode().catch(() => { }) : 0, new Promise(r => setTimeout(r, 600))])
      : Promise.resolve();
    ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => fly(t, toPoster ? dp : tr, toPoster))))
      .catch(() => { busy = false });
  }).observe(mc, { childList: true });

  function fly(t, target, toPoster) {
    try {
      if (md.hidden || !target.isConnected) return done();
      const b = target.getBoundingClientRect();
      if (b.width < 40 || b.height < 40 || b.top > innerHeight * .9) return done();

      const f = document.createElement("img");
      f.src = t.src; f.alt = ""; f.setAttribute("aria-hidden", "true");
      Object.assign(f.style, {
        position: "fixed", left: "0", top: "0", zIndex: "2147482500", pointerEvents: "none",
        objectFit: "cover", willChange: "left,top,width,height,opacity",
        boxShadow: "0 30px 70px -10px #000", margin: "0"
      });
      document.body.appendChild(f);
      if (toPoster) target.style.opacity = "0";

      const from = {
        left: t.r.left + "px", top: t.r.top + "px", width: t.r.width + "px", height: t.r.height + "px",
        borderRadius: t.rad, opacity: 1
      };
      const to = {
        left: b.left + "px", top: b.top + "px", width: b.width + "px", height: b.height + "px",
        borderRadius: toPoster ? getComputedStyle(target).borderRadius : "0px", opacity: toPoster ? 1 : 0
      };
      const frames = toPoster ? [from, to] : [from, { ...to, opacity: 1, offset: .62 }, to];
      const a = f.animate(frames, { duration: DUR, easing: EASE, fill: "forwards" });

      const stop = new MutationObserver(() => { if (md.hidden) a.cancel() });
      stop.observe(md, { attributes: true, attributeFilter: ["hidden"] });
      const end = () => { stop.disconnect(); f.remove(); if (toPoster) target.style.opacity = ""; done() };
      a.onfinish = end; a.oncancel = end;
      setTimeout(end, DUR + 600); // safety net
    } catch (e) { done() }
  }
  function done() { busy = false }
})();
