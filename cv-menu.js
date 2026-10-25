// Parda — full-screen menu behind the ☰ button next to the profile icon (Profile / Sign in, Add-ons, pages, legal).
// Uses the site's overlay stack (CVA.ov) so the Android back button closes it.
(function () {
  const btn = document.getElementById("mnu"); if (!btn) return;
  const NAV = [["home", "Home"], ["movies", "Movies"], ["series", "Series"], ["anime", "Anime"], ["browse", "Browse"], ["list", "My list"]];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let ov = null;

  function items() {
    const acc = document.getElementById("acc"), signed = acc && acc.classList.contains("in");
    return [
      ...NAV.map(([k, n]) => ({ n, a: () => { const l = document.querySelector('nav [data-v="' + k + '"]'); l && l.click() } })),
      { n: signed ? "Profile" : "Sign in", s: signed ? "Your account and list" : "Sync your list on every device", a: () => acc && acc.click() },
      { n: "Add-ons", s: "Add, remove or switch off add-ons. No login needed", a: () => window.CVA && CVA.addons && CVA.addons() },
    ];
  }

  function open() {
    if (ov || !window.CVA || !CVA.ov) return;
    const list = items();
    ov = CVA.ov.open("menu", "cvm");
    ov._onclose = () => { ov = null; btn.classList.remove("on"); btn.setAttribute("aria-expanded", "false") };
    const r = btn.getBoundingClientRect();
    ov.style.setProperty("--ox", Math.round(r.left + r.width / 2) + "px"); ov.style.setProperty("--oy", Math.round(r.top + r.height / 2) + "px");
    ov.querySelector(".cva-box").innerHTML =
      `<button type="button" class="cvm-x" data-m="x" aria-label="Close menu"><i></i><i></i></button>` +
      `<ul class="cvm-l">${list.map((it, i) => `<li style="--i:${i}"><button type="button" data-m="${i}"><em>${String(i + 1).padStart(2, "0")}</em><span><b>${esc(it.n)}</b>${it.s ? `<small>${esc(it.s)}</small>` : ""}</span></button></li>`).join("")}</ul>` +
      `<div class="cvm-f"><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a><a href="/cookies.html">Cookies</a><span>&copy; ${new Date().getFullYear()} Parda</span></div>`;
    btn.classList.add("on"); btn.setAttribute("aria-expanded", "true");
    ov.addEventListener("click", e => {
      const b = e.target.closest("[data-m]"); if (!b) return;
      const it = list[+b.dataset.m]; shut(() => it && it.a());
    });
  }
  function shut(after) {
    if (!ov) return;
    const el = ov; el.classList.add("out");
    setTimeout(() => { CVA.ov.close(el); if (after) setTimeout(after, 30) }, 320);
  }
  btn.addEventListener("click", () => ov ? shut() : open());
})();
