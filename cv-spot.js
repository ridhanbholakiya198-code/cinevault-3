/* Spotlight: one cinema-scope feature strip in the middle of the home rows. 5 trending titles, ambient light spill, slow push-in, swipe + autoplay. */
(() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = document.createElement("style");
  css.textContent = `.spot{margin:clamp(46px,7vw,100px) 0;padding:0 4vw;position:relative;color:#f6f1e8}
.spot .sp-k{display:flex;align-items:center;gap:14px;margin:0 0 clamp(14px,2vw,24px);font:500 11px/1 "DM Sans",sans-serif;letter-spacing:.38em;color:var(--sc,var(--accent,#e8905a))}.spot .sp-k::after{content:"";height:1px;flex:1;background:linear-gradient(90deg,#ffffff30,#0000)}
.sp-stage{position:relative}.sp-amb{position:absolute;inset:-6% -3%;background:center/cover;filter:blur(70px) saturate(1.5);opacity:0;transition:opacity 1.4s;pointer-events:none;z-index:0;transform:translateZ(0)}.sp-amb.on{opacity:.55}.lite .sp-amb{display:none}
.sp-frame{position:relative;z-index:1;aspect-ratio:2.39/1;border-radius:clamp(16px,2vw,28px);overflow:hidden;background:#0b0b0c;box-shadow:0 50px 120px -40px #000,inset 0 0 0 1px #ffffff14;cursor:pointer;isolation:isolate}
.sp-sl{position:absolute;inset:0;opacity:0;transition:opacity 1.2s cubic-bezier(.4,0,.2,1)}.sp-sl.on{opacity:1}
.sp-img{position:absolute;inset:-3%;background:center 30%/cover;transform:scale(1.02);transition:transform 0s}.sp-sl.on .sp-img{animation:spkb 14s ease-out forwards}
@keyframes spkb{from{transform:scale(1.02) translate3d(0,0,0)}to{transform:scale(1.13) translate3d(-1.2%,-.8%,0)}}
.sp-frame::before{content:"";position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,#050506ee 0,#050506b3 30%,#05050640 58%,#0000 78%),linear-gradient(0deg,#050506e0 0,#0000 38%);pointer-events:none}
.sp-frame::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 120px #0008;border-radius:inherit}
.sp-lb{position:absolute;left:0;right:0;height:50%;background:#000;z-index:5;transition:transform 1.5s cubic-bezier(.7,0,.2,1) .15s;pointer-events:none}.sp-lb.t{top:0;transform-origin:top}.sp-lb.b{bottom:0;transform-origin:bottom}.spot.in .sp-lb{transform:scaleY(0)}
.sp-top{position:absolute;z-index:3;top:clamp(14px,2.2vw,30px);left:clamp(18px,3vw,48px);right:clamp(18px,3vw,48px);display:flex;justify-content:space-between;font:500 11px/1 "DM Sans",sans-serif;letter-spacing:.3em;color:#ffffffb0;text-transform:uppercase}
.sp-info{position:absolute;z-index:3;left:clamp(18px,3vw,48px);bottom:clamp(30px,4vw,64px);width:min(52%,620px)}
.sp-meta{font:italic 500 clamp(17px,1.9vw,26px)/1 "Cormorant Garamond",Georgia,serif;color:var(--sc,var(--accent,#e8905a));margin:0 0 10px}
.sp-info h3{margin:0 0 clamp(8px,1.2vw,16px);font:400 clamp(38px,6.4vw,118px)/.9 "Bebas Neue",sans-serif;letter-spacing:.05em;text-shadow:0 8px 40px #000a}
.sp-info p{margin:0 0 clamp(14px,2vw,24px);font-size:clamp(13px,1.25vw,17px);line-height:1.6;color:#d6d0c4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:36em}
.sp-go{appearance:none;margin:0;width:auto;height:46px;aspect-ratio:auto;padding:0 26px;border-radius:99px;border:1px solid #ffffff40;background:#ffffff14;backdrop-filter:blur(8px);color:#f6f1e8;font:500 13px/1 "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .3s}.sp-go:hover{background:var(--sc,var(--accent,#e8905a));color:#000;border-color:transparent}
.sp-info>*{opacity:0;transform:translateY(22px);transition:opacity .9s cubic-bezier(.2,.8,.2,1),transform .9s cubic-bezier(.2,.8,.2,1)}.sp-sl.on .sp-info>*{opacity:1;transform:none}.sp-sl.on .sp-info>:nth-child(1){transition-delay:.35s}.sp-sl.on .sp-info>:nth-child(2){transition-delay:.5s}.sp-sl.on .sp-info>:nth-child(3){transition-delay:.65s}.sp-sl.on .sp-info>:nth-child(4){transition-delay:.8s}
.sp-prog{position:absolute;z-index:4;left:clamp(18px,3vw,48px);right:clamp(18px,3vw,48px);bottom:clamp(14px,2vw,26px);display:flex;gap:6px}.sp-prog i{flex:1;height:3px;border-radius:3px;background:#ffffff30;overflow:hidden;position:relative}.sp-prog i::after{content:"";position:absolute;inset:0;background:var(--sc,#fff);transform:scaleX(0);transform-origin:left}.sp-prog i.done::after{transform:scaleX(1)}.sp-prog i.on::after{animation:spp var(--d,7s) linear forwards}
@keyframes spp{to{transform:scaleX(1)}}
.sp-th{display:none;gap:clamp(10px,1.2vw,18px);margin-top:clamp(14px,1.6vw,22px);position:relative;z-index:1}
.sp-th button{appearance:none;margin:0;padding:0;border:0;flex:1;aspect-ratio:2.39/1;border-radius:10px;background:center/cover;cursor:pointer;opacity:.45;filter:grayscale(.6);transition:opacity .5s,filter .5s,transform .5s;box-shadow:inset 0 0 0 1px #ffffff1a}.sp-th button.on,.sp-th button:hover{opacity:1;filter:none;transform:translateY(-3px)}
@media(min-width:700px){.sp-th{display:flex}.sp-prog{display:none}}
@media(max-width:699px){.sp-frame{aspect-ratio:4/5;max-height:78vh}.sp-info{width:auto;right:18px;bottom:36px}.sp-img{background-position:var(--fx,60%) 20%}.sp-frame::before{background:linear-gradient(0deg,#050506f2 0,#050506b0 34%,#0000 66%),linear-gradient(180deg,#05050680 0,#0000 22%)}.sp-info p{-webkit-line-clamp:3}}
@media(prefers-reduced-motion:reduce){.sp-sl.on .sp-img{animation:none}.sp-lb{display:none}}`;
  document.head.appendChild(css);

  let data = null, sec = null, idx = 0, timer = 0, paused = 0, visible = false, colours = [];
  const D = 7000, kind = it => it.title ? "movie" : "tv";
  async function load() {
    if (data) return data;
    let hero = []; try { hero = (0, eval)("hero").map(h => h.id) } catch (e) {}
    const d = await api("/trending/all/week");
    data = (d.results || []).filter(it => it.backdrop_path && it.overview && !hero.includes(it.id)).slice(0, 5); return data;
  }
  function build() {
    const rows = document.getElementById("rows"); if (!rows || !data || !data.length || document.getElementById("cvspot")) return;
    const anchor = rows.querySelectorAll(":scope > section")[3]; if (!anchor) return;
    sec = document.createElement("section"); sec.id = "cvspot"; sec.className = "spot"; sec.setAttribute("aria-label", "Spotlight");
    const n = data.length, yr = it => (it.release_date || it.first_air_date || "").slice(0, 4);
    sec.innerHTML = `<div class="sp-k">SPOTLIGHT</div><div class="sp-stage">${data.map((it, i) => `<div class="sp-amb${i ? "" : " on"}" style="background-image:url(${IMG}w300${it.backdrop_path})"></div>`).join("")}
<div class="sp-frame" role="group" aria-roledescription="carousel">${data.map((it, i) => `<div class="sp-sl${i ? "" : " on"}" aria-hidden="${i ? "true" : "false"}"><div class="sp-img" style="background-image:url(${IMG}w1280${it.backdrop_path})"></div><div class="sp-info"><div class="sp-meta">${kind(it) === "tv" ? "Series" : "Film"} · ${esc(yr(it))} · ★ ${(it.vote_average || 0).toFixed(1)}</div><h3>${esc(it.title || it.name)}</h3><p>${esc(it.overview)}</p><button class="sp-go" type="button" data-i="${i}">Details</button></div></div>`).join("")}
<div class="sp-top"><span id="spn">01 / 0${n}</span><span>Now trending</span></div><div class="sp-prog">${data.map(() => "<i></i>").join("")}</div><div class="sp-lb t"></div><div class="sp-lb b"></div></div>
<div class="sp-th">${data.map((it, i) => `<button type="button" data-t="${i}" aria-label="Show ${esc(it.title || it.name)}" style="background-image:url(${IMG}w300${it.backdrop_path})"></button>`).join("")}</div></div>`;
    anchor.after(sec); wire(); go(0, true);
    if (window.CVPal) data.forEach((it, i) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { try { const c = CVPal.palette([im]).sort((a, b) => sat(b) - sat(a))[0]; if (c) { colours[i] = CVPal.hex(c.r, c.g, c.b); if (i === idx) sec.style.setProperty("--sc", colours[i]) } } catch (e) {} }; im.src = IMG + "w300" + it.backdrop_path });
  }
  const sat = c => { const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b); return mx ? (mx - mn) / mx * (mx / 255) : 0 };
  function go(i, first) {
    const n = data.length; idx = (i + n) % n; const sl = sec.querySelectorAll(".sp-sl"), am = sec.querySelectorAll(".sp-amb"), th = sec.querySelectorAll(".sp-th button"), pg = sec.querySelectorAll(".sp-prog i");
    sl.forEach((s, k) => { s.classList.toggle("on", k === idx); s.setAttribute("aria-hidden", k === idx ? "false" : "true") }); am.forEach((a, k) => a.classList.toggle("on", k === idx)); th.forEach((t, k) => t.classList.toggle("on", k === idx));
    pg.forEach((p, k) => { p.classList.remove("on", "done"); void p.offsetWidth; if (k < idx) p.classList.add("done"); if (k === idx) p.classList.add("on") });
    sec.querySelector("#spn").textContent = String(idx + 1).padStart(2, "0") + " / 0" + n; if (colours[idx]) sec.style.setProperty("--sc", colours[idx]);
    clearTimeout(timer); if (!matchMedia("(prefers-reduced-motion:reduce)").matches) timer = setTimeout(tick, D);
  }
  function tick() { if (document.hidden || !visible || paused > Date.now()) { timer = setTimeout(tick, 1200); return } go(idx + 1) }
  function wire() {
    sec.style.setProperty("--d", D / 1000 + "s");
    const fr = sec.querySelector(".sp-frame"); let x0 = 0, y0 = 0, moved = false;
    fr.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; moved = false }, { passive: true });
    fr.addEventListener("touchend", e => { const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { moved = true; paused = Date.now() + 9000; try { window.CVSound && CVSound.swipe() } catch (e) {} go(idx + (dx < 0 ? 1 : -1)) } }, { passive: true });
    sec.addEventListener("click", e => {
      const t = e.target.closest("[data-t]"); if (t) { paused = Date.now() + 9000; try { window.CVSound && CVSound.swipe() } catch (e) {} return go(+t.dataset.t) }
      if (moved) { moved = false; return } const it = data[idx]; try { openDetail(kind(it), it.id) } catch (x) {}
    });
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; if (e.isIntersecting) sec.classList.add("in") }), { threshold: .35 }).observe(sec);
  }
  async function init() { try { await load(); build() } catch (e) {} }
  document.addEventListener("DOMContentLoaded", () => setTimeout(init, 400)); setTimeout(init, 1800);
  const rows = () => document.getElementById("rows"); let mo; const arm = () => { const r = rows(); if (!r || mo) return; mo = new MutationObserver(() => { if (data && !document.getElementById("cvspot")) build() }); mo.observe(r, { childList: true }) }; setTimeout(arm, 1000);
})();
