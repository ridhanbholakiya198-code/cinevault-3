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

/* Parda v77 — laptop / tablet comfort inside the detail page.
   1. Side arrows + mouse drag for every horizontal strip (More like this, Cast, Mood...), like the home rows.
   2. Season / Where-to-watch country pickers: a roomy styled menu instead of the tiny native dropdown. Phones keep the native picker. */
(() => {
  "use strict";
  const mc = document.getElementById("mc");
  const wide = () => matchMedia("(min-width:700px), (hover:hover)").matches;
  const ARR = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;

  /* ---------- 1. strips ---------- */
  function strip(st) {
    if (st.dataset.sa) return; st.dataset.sa = "1";
    const par = st.parentElement; if (!par) return;
    if (getComputedStyle(par).position === "static") par.style.position = "relative";
    const mk = (cls, label, d) => { const b = document.createElement("button"); b.type = "button"; b.className = "cvsa " + cls; b.setAttribute("aria-label", label); b.hidden = true; b.innerHTML = ARR(d); par.append(b); return b };
    const L = mk("l", "Scroll back", "m15 5-7 7 7 7"), R = mk("r", "Scroll forward", "m9 5 7 7-7 7");
    const upd = () => {
      const max = st.scrollWidth - st.clientWidth, on = max > 8 && st.offsetParent !== null;
      L.hidden = !on || st.scrollLeft <= 4; R.hidden = !on || st.scrollLeft >= max - 4;
      const top = st.offsetTop + Math.min(st.offsetHeight * .4, 150) - 23 + "px";
      L.style.top = R.style.top = top; L.style.left = st.offsetLeft + 12 + "px"; R.style.right = par.clientWidth - (st.offsetLeft + st.offsetWidth) + 12 + "px";
    };
    const go = dir => () => st.scrollBy({ left: dir * Math.max(200, st.clientWidth * .8), behavior: "smooth" });
    L.onclick = go(-1); R.onclick = go(1);
    st.addEventListener("scroll", upd, { passive: true });
    st.addEventListener("load", upd, true);
    if ("ResizeObserver" in window) new ResizeObserver(upd).observe(st);
    new MutationObserver(upd).observe(st, { childList: true });
    addEventListener("resize", upd, { passive: true });
    // mouse: drag the strip sideways (touch already swipes natively)
    let x0 = 0, s0 = 0, down = false, moved = false;
    st.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || e.button !== 0) return; down = true; moved = false; x0 = e.clientX; s0 = st.scrollLeft });
    addEventListener("pointermove", e => {
      if (!down) return; const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 6) { moved = true; st.style.scrollSnapType = "none"; st.classList.add("cvdrag") }
      if (moved) st.scrollLeft = s0 - dx;
    }, { passive: true });
    addEventListener("pointerup", () => {
      if (!down) return; down = false;
      if (moved) { st.classList.remove("cvdrag"); st.style.scrollSnapType = ""; const stop = e => { e.preventDefault(); e.stopPropagation() }; st.addEventListener("click", stop, { capture: true, once: true }); setTimeout(() => st.removeEventListener("click", stop, true), 0) }
    });
    upd();
  }
  const scan = () => mc && mc.querySelectorAll(".strip:not([data-sa])").forEach(strip);
  if (mc) { new MutationObserver(scan).observe(mc, { childList: true, subtree: true }); scan() }

  /* ---------- 2. roomy picker for #ssn (season) and #rg (country) ---------- */
  let dd = null, owner = null;
  const regionName = c => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(c) || "" } catch { return "" } };
  function close(refocus) { if (!dd) return; dd.remove(); dd = null; if (refocus && owner) try { owner.focus({ preventScroll: true }) } catch { } owner = null }
  function open(sel) {
    close(); owner = sel;
    const opts = [...sel.options], many = opts.length > 8;
    dd = document.createElement("div"); dd.className = "cvdd" + (many ? " grid" : ""); dd.setAttribute("role", "listbox");
    dd.innerHTML = opts.map((o, i) => {
      const nm = sel.id === "rg" ? regionName(o.value) : "";
      return `<button type="button" role="option" data-i="${i}" aria-selected="${o.selected}" class="${o.selected ? "on" : ""}"><b>${o.text}</b>${nm ? `<small>${nm}</small>` : ""}</button>`;
    }).join("");
    document.body.append(dd);
    const r = sel.getBoundingClientRect(), w = Math.max(r.width, many ? 300 : 210);
    dd.style.minWidth = w + "px"; dd.style.left = Math.max(8, Math.min(r.left, innerWidth - dd.offsetWidth - 8)) + "px";
    const h = dd.offsetHeight, below = innerHeight - r.bottom - 12, above = r.top - 12;
    if (h > below && above > below) { dd.style.bottom = innerHeight - r.top + 6 + "px"; dd.style.maxHeight = Math.min(360, above) + "px" }
    else { dd.style.top = r.bottom + 6 + "px"; dd.style.maxHeight = Math.min(360, below) + "px" }
    const items = [...dd.children], cur = items.find(b => b.classList.contains("on")) || items[0];
    if (cur) { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: "nearest" }) }
    dd.addEventListener("click", e => {
      const b = e.target.closest("button[data-i]"); if (!b) return;
      const s = owner; close(true); if (!s) return;
      if (s.selectedIndex !== +b.dataset.i) { s.selectedIndex = +b.dataset.i; s.dispatchEvent(new Event("change", { bubbles: true })) }
    });
    dd.addEventListener("keydown", e => {
      const k = e.key, i = items.indexOf(document.activeElement), cols = many ? Math.max(1, Math.floor(dd.clientWidth / 110)) : 1;
      const mv = n => { e.preventDefault(); const t = items[Math.max(0, Math.min(items.length - 1, i + n))]; if (t) { t.focus({ preventScroll: true }); t.scrollIntoView({ block: "nearest" }) } };
      if (k === "ArrowDown") mv(cols); else if (k === "ArrowUp") mv(-cols);
      else if (k === "ArrowRight") mv(1); else if (k === "ArrowLeft") mv(-1);
      else if (k === "Home") mv(-999); else if (k === "End") mv(999);
      else if (k === "Escape") { e.preventDefault(); e.stopPropagation(); close(true) }
      else if (k === "Tab") close();
    }, true);
  }
  const target = e => { const s = e.target.closest && e.target.closest("select#ssn,select#rg"); return s && wide() ? s : null };
  document.addEventListener("mousedown", e => { const s = target(e); if (!s) { if (dd && !dd.contains(e.target)) close(); return } e.preventDefault(); dd && owner === s ? close() : open(s) }, true);
  document.addEventListener("keydown", e => {
    const s = target(e); if (!s || dd) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); open(s) }
  }, true);
  addEventListener("scroll", e => { if (dd && !dd.contains(e.target)) close() }, true);
  addEventListener("resize", () => close());
})();
