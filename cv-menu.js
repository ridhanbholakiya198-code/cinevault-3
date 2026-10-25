// Parda — full-screen menu behind the menu button next to the profile icon.
// Opens as a curtain (cv-curtain.css): closed, a flicker of light in the seam, then it parts.
// Uses the site's overlay stack (CVA.ov) so the Android back button closes it.
(function () {
  const btn = document.getElementById("mnu"); if (!btn) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  let ov = null, closing = false;
  const go = k => () => { const l = document.querySelector('nav [data-v="' + k + '"]'); l && l.click() };

  function items() {
    const acc = document.getElementById("acc"), signed = acc && acc.classList.contains("in");
    return [
      { n: "Movies", a: go("movies") },
      { n: "Series", a: go("series") },
      { n: "Anime", a: go("anime") },
      { n: "Browse", a: go("browse") },
      { n: "My list", a: go("list") },
      { n: "Add-ons", a: () => window.CVA && CVA.addons && CVA.addons() },
      { n: signed ? "Profile" : "Sign in", a: () => acc && acc.click() },
    ];
  }

  // the film currently on the home hero: its still and "Title, year"
  function nowShowing() {
    const on = document.querySelector("#hbgs .hbg.on"), bg = on && on.style.backgroundImage;
    const t = document.getElementById("htitle"), im = t && t.querySelector("img");
    const name = t ? (im ? im.alt : t.textContent) : "";
    // hero meta is "rating . year . runtime . genre" joined by .dot separators: pick the segment that is a year
    const segs = [""]; ((document.getElementById("hmeta") || { childNodes: [] }).childNodes).forEach(n => { if (n.nodeType === 1 && n.classList.contains("dot")) segs.push(""); else segs[segs.length - 1] += n.textContent });
    const y = segs.map(s => s.trim()).find(s => /^(?:19|20)\d{2}$/.test(s));
    return { bg: bg && bg !== "none" ? bg : "", cap: [String(name || "").trim(), y].filter(Boolean).join(", ") };
  }

  function open() {
    if (ov || !window.CVA || !CVA.ov) return;
    const list = items(), mail = (window.CV_SITE || {}).email;
    const now = nowShowing();
    closing = false;
    ov = CVA.ov.open("menu", "cvn");
    ov._onclose = () => { ov = null; closing = false; btn.classList.remove("on"); btn.setAttribute("aria-expanded", "false") };
    ov.querySelector(".cva-box").innerHTML =
      `<div class="cvn-t"><button type="button" class="cvn-logo" data-m="h" aria-label="Home">PARDA</button><button type="button" class="cvn-x" data-m="x" aria-label="Close menu"><i></i><i></i></button></div>` +
      `<ul class="cvn-l">${list.map((it, i) => `<li style="--i:${i}"><button type="button" data-m="${i}"><b>${esc(it.n)}</b></button></li>`).join("")}</ul>` +
      `<div class="cvn-f"><div>${now.cap ? `<p class="cvn-n">${esc(now.cap)}</p>` : ""}${mail ? `<a href="mailto:${esc(mail)}">${esc(mail)}</a>` : `<span>&copy; ${new Date().getFullYear()} Parda</span>`}</div><nav><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a><a href="/cookies.html">Cookies</a></nav></div>`;
    // the film still and a glow sit behind the menu, the curtain and its seam of light sit in front
    ov.insertAdjacentHTML("afterbegin", (now.bg ? '<i class="cc-b"></i>' : "") + '<i class="cc-g"></i>');
    const bd = ov.querySelector(".cc-b"); if (bd) bd.style.backgroundImage = now.bg;
    ov.insertAdjacentHTML("beforeend", '<i class="cc-p cc-l"></i><i class="cc-p cc-r"></i><i class="cc-s"></i>');
    btn.classList.add("on"); btn.setAttribute("aria-expanded", "true");
    try { navigator.vibrate && navigator.vibrate(10) } catch (e) { }
    ov.addEventListener("click", e => {
      const b = e.target.closest("[data-m]"); if (!b) return;
      if (b.dataset.m === "x") return shut();
      if (b.dataset.m === "h") return shut(go("home"));
      const it = list[+b.dataset.m]; shut(() => it && it.a());
    });
  }

  function shut(after) {
    if (!ov || closing) return;
    closing = true;
    const el = ov, fast = !!after;
    // close the curtain from wherever it currently is, even if it is still opening
    el.querySelectorAll(".cc-p").forEach(p => {
      try { p.style.setProperty("--f", new DOMMatrix(getComputedStyle(p).transform).m41 + "px") } catch (e) { }
    });
    el.classList.add("out"); if (fast) el.classList.add("fast");
    const ms = calm.matches ? 160 : fast ? 440 : 640;
    setTimeout(() => { CVA.ov.close(el); if (after) setTimeout(after, 20) }, ms);
  }
  btn.addEventListener("click", () => ov ? shut() : open());
})();
