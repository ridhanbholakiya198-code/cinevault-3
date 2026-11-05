/* Parda v50 — keyboard scrolling in overlays.
   Problem: when a show/filter panel opens, keyboard focus stays on the page behind it (which is locked),
   so arrow keys / Space / Page Down scroll nothing until you click inside. Fix: move focus into the overlay. */
(() => {
  "use strict";
  const md = document.getElementById("modal");
  const focusIn = el => { if (!el) return; try { if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) el.tabIndex = -1; el.focus({ preventScroll: true }) } catch { } };
  const modalOpen = () => md && !md.hidden;

  if (md) new MutationObserver(() => { if (modalOpen()) focusIn(md) }).observe(md, { attributes: true, attributeFilter: ["hidden"] });

  new MutationObserver(list => {
    for (const r of list) {
      for (const n of r.addedNodes) {
        if (n.nodeType === 1 && n.classList.contains("cva") && !n.classList.contains("cv-player")) {
          // wait one frame so the panel's content has been drawn
          requestAnimationFrame(() => focusIn(n.querySelector(".cvf-body,.cva-doc,.cva-box") || n));
        }
      }
      for (const n of r.removedNodes) {
        // overlay closed while a detail page is still open -> give focus back to it
        if (n.nodeType === 1 && n.classList.contains("cva") && modalOpen() && !document.querySelector(".cva")) focusIn(md);
      }
    }
  }).observe(document.body, { childList: true });
})();
