// Parda — the intro curtain stays shut until the first film is on screen and its colour has settled,
// so when it opens there is always something to see. Never waits longer than MAX.
(function () {
  const it = document.getElementById("intro"); if (!it) return;
  const MIN = 1700, MAX = 3400; // ms since page start: title gets time to be read; slow networks don't wait forever
  let done = false;
  const end = () => { if (it.isConnected) it.remove() };
  function go() {
    if (done) return; done = true;
    it.classList.add("go");
    const r = it.querySelector(".cc-r");
    if (r) r.addEventListener("animationend", e => { if (e.animationName === "cc-open-r") end() });
    setTimeout(end, 2800);
  }
  const ready = () => { const b = document.querySelector("#hbgs .hbg.on"); return !!(b && b.style.backgroundImage && b.style.backgroundImage !== "none") };
  (function tick() {
    if (done) return;
    const t = performance.now();
    if (t >= MAX) return go();
    if (t >= MIN && ready()) return void setTimeout(go, 350); // let the film colour settle
    setTimeout(tick, 80);
  })();
})();
