// Parda — full-screen menu behind the ☰ button next to the profile icon (Profile / Sign in, Add-ons, pages, legal).
// Uses the site's overlay stack (CVA.ov) so the Android back button closes it.
(function () {
  const btn = document.getElementById("mnu"); if (!btn) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let ov = null;
  const go = k => () => { const l = document.querySelector('nav [data-v="' + k + '"]'); l && l.click() };

  function items() {
    const acc = document.getElementById("acc"), signed = acc && acc.classList.contains("in");
    return [
      { n: "Browse", a: go("browse") },
      { n: "My list", a: go("list") },
      { n: "Add-ons", a: () => window.CVA && CVA.addons && CVA.addons() },
      { n: signed ? "Profile" : "Sign in", a: () => acc && acc.click() },
    ];
  }

  function open() {
    if (ov || !window.CVA || !CVA.ov) return;
    const list = items(), mail = (window.CV_SITE || {}).email;
    ov = CVA.ov.open("menu", "cvn");
    ov._onclose = () => { ov = null; btn.classList.remove("on"); btn.setAttribute("aria-expanded", "false") };
    ov.querySelector(".cva-box").innerHTML =
      `<div class="cvn-t"><span class="cvn-logo">PARDA</span><button type="button" class="cvn-x" data-m="x" aria-label="Close menu"><i></i><i></i></button></div>` +
      `<ul class="cvn-l">${list.map((it, i) => `<li style="--i:${i}"><button type="button" data-m="${i}"><em>${String(i + 1).padStart(2, "0")}</em><b>${esc(it.n)}</b></button></li>`).join("")}</ul>` +
      `<div class="cvn-f"><div>${mail ? `<a href="mailto:${esc(mail)}">${esc(mail)}</a>` : `<span>&copy; ${new Date().getFullYear()} Parda</span>`}</div><nav><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a><a href="/cookies.html">Cookies</a></nav></div>`;
    btn.classList.add("on"); btn.setAttribute("aria-expanded", "true");
    ov.addEventListener("click", e => {
      const b = e.target.closest("[data-m]"); if (!b) return;
      if (b.dataset.m === "x") return shut();
      const it = list[+b.dataset.m]; shut(() => it && it.a());
    });
  }
  function shut(after) {
    if (!ov) return;
    const el = ov; el.classList.add("out");
    setTimeout(() => { CVA.ov.close(el); if (after) setTimeout(after, 20) }, 190);
  }
  btn.addEventListener("click", () => ov ? shut() : open());
})();
