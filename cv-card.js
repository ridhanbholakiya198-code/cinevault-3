/* Parda colour cards: a shareable 9:16 poster for any title (from the Mood tab) and "Your cinema colour" on My list. All drawn in the browser. */
(() => {
  const css = document.createElement("style");
  css.textContent = `.mcardbtn{margin-top:18px;width:100%;padding:15px;border:1px solid #ffffff2e;border-radius:99px;background:#ffffff0d;color:var(--fg,#f2ede4);font:500 14px "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}.mcardbtn:hover{background:#ffffff1a}
.ccx{margin:4px 0 22px;padding:clamp(18px,3vw,28px);border:1px solid #ffffff1c;border-radius:22px;background:linear-gradient(150deg,#ffffff0d,#ffffff03);position:relative;overflow:hidden;animation:cvtIn .6s both}
.ccx::after{content:"";position:absolute;inset:auto -20% -70% -20%;height:90%;background:radial-gradient(var(--cg,#e8905a),#0000 70%);opacity:.18;pointer-events:none}
.ccx small{display:block;font:500 11px/1 "DM Sans",sans-serif;letter-spacing:.34em;color:var(--accent,#e8905a);margin-bottom:12px}
.ccx h3{margin:0 0 16px;font:italic 500 clamp(34px,7vw,60px)/1.05 "Cormorant Garamond",Georgia,serif;font-weight:500}
.ccx .cp{display:flex;height:46px;border-radius:12px;overflow:hidden}.ccx .cp i{flex:1}.ccx p{margin:12px 0 0;font-size:13px;color:#a8a39a}
.ccx button{position:relative;z-index:1;margin-top:14px;padding:11px 18px;border:1px solid #ffffff2e;border-radius:99px;background:#ffffff0d;color:inherit;font:500 12px "DM Sans";letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.cdov{position:fixed;inset:0;z-index:2147483000;background:#000f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:14px;animation:cvtIn .35s}
.cdov .cdi{position:relative;aspect-ratio:var(--r);width:min(94vw,calc(68vh*var(--r)));border-radius:18px;overflow:hidden;box-shadow:0 40px 120px -30px var(--cg,#000);animation:cdIn 1.1s cubic-bezier(.2,.8,.2,1) both;transition:width .45s cubic-bezier(.2,.8,.2,1)}
.cdov .cdi img{width:100%;height:100%;display:block;transition:opacity .25s}.cdov .cdi::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,#0000 35%,#ffffff30 50%,#0000 65%);transform:translateX(-120%);animation:cdSw 1.6s .5s ease-out forwards;pointer-events:none}
@keyframes cdIn{from{opacity:0;transform:scale(.9) translateY(30px);filter:blur(12px)}}@keyframes cdSw{to{transform:translateX(120%)}}
.cdov .cdrow{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.cdov .cdrow button{appearance:none;-webkit-appearance:none;box-sizing:border-box;margin:0;width:auto;height:44px;min-width:0;aspect-ratio:auto;flex:none;padding:0 22px;border-radius:99px;border:1px solid #ffffff2e;background:#ffffff10;color:#f2ede4;font:500 14px/1 "DM Sans",sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.cdov .cdrow button.on{background:#f2ede4;color:#050506;border-color:transparent}.cdov .cdrow.ch button{height:36px;padding:0 16px;font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.cdov .cdrow button.go{background:var(--accent,#e8905a);color:#000;border-color:transparent}`;
  document.head.appendChild(css);

  const NAMES = [[15, "Crimson"], [40, "Amber"], [65, "Gold"], [95, "Olive"], [160, "Emerald"], [200, "Teal"], [245, "Azure"], [275, "Indigo"], [320, "Violet"], [345, "Rose"]];
  function hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360 } return { h, s: mx ? d / mx : 0, v: mx / 255 } }
  function colourName(cols) {
    const seen = [], by = [...cols].sort((a, b) => b.w - a.w);
    for (const c of by) { const x = hsv(c.r, c.g, c.b); if (x.s < .22 || x.v < .18) continue; const n = (NAMES.find(n => x.h < n[0]) || [0, "Crimson"])[1]; if (!seen.includes(n)) seen.push(n); if (seen.length === 2) break }
    return seen.length ? seen.join(" & ") : "Noir & Silver";
  }
  const load = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src });
  function cover(x, im, dx, dy, dw, dh) { const s = Math.max(dw / im.width, dh / im.height), w = im.width * s, h = im.height * s; x.save(); x.beginPath(); x.rect(dx, dy, dw, dh); x.clip(); x.drawImage(im, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h); x.restore() }
  function wrap(x, text, maxW, maxLines) { const words = text.split(/\s+/), lines = []; let cur = ""; for (const w of words) { const t = cur ? cur + " " + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w } else cur = t } lines.push(cur); return lines.slice(0, maxLines) }
  async function fonts() { try { await Promise.all(['400 100px "Bebas Neue"', 'italic 500 40px "Cormorant Garamond"', '500 24px "DM Sans"'].map(f => document.fonts.load(f))) } catch (e) {} }

  const DIM = { story: [1080, 1920], square: [1080, 1080], wide: [1920, 1080] };
  async function draw(o, shape) { // o: {kicker,title,sub,imgs:[Image],pal:[hex],mosaic:bool}
    await fonts();
    const [W, H] = DIM[shape], c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    const mid = o.pal[Math.floor(o.pal.length / 2)] || "#e8905a", acc = o.pal.slice().sort((a, b) => hsv(...rgb(b)).s - hsv(...rgb(a)).s)[0] || "#e8905a";
    const wide = shape === "wide", story = shape === "story", tx = wide ? 1160 : 72, tw = wide ? 700 : W - 144, kO = story ? 70 : 50;
    x.fillStyle = "#050506"; x.fillRect(0, 0, W, H); x.textBaseline = "alphabetic"; x.textAlign = "left";
    let fs = story ? 168 : wide ? 150 : 124; const fit = () => { x.font = `400 ${fs}px "Bebas Neue",sans-serif`; x.letterSpacing = "4px"; return wrap(x, o.title.toUpperCase(), tw, wide ? 3 : 2) };
    let lines = fit(); while ((lines.some(l => x.measureText(l).width > tw) || (story && lines.length > 2)) && fs > 84) { fs -= 10; lines = fit() } x.letterSpacing = "0px";
    const lh = fs * .92, top = story ? Math.min(1130, Math.round(1285 - lh * lines.length)) : wide ? Math.min(330, Math.round(560 - lh * lines.length)) : Math.min(560, Math.round(690 - lh * lines.length));
    const artH = story ? top + 60 : 600;
    // art
    if (o.mosaic) {
      const ims = o.imgs.slice(0, 6), gx = story ? 18 : 16;
      if (story) { const cw = (W - 108 - gx * 2) / 3, ch = cw * 1.5; ims.forEach((im, i) => rr(x, im, 54 + (i % 3) * (cw + gx), 90 + Math.floor(i / 3) * (ch + gx), cw, ch)) }
      else if (wide) { const cw = 300, ch = 450; ims.forEach((im, i) => rr(x, im, 60 + (i % 3) * (cw + gx), 70 + Math.floor(i / 3) * (ch + gx), cw, ch)) }
      else { const cw = (W - 72 - gx * 5) / 6, ch = cw * 1.5; ims.forEach((im, i) => rr(x, im, 36 + i * (cw + gx), 90 + (i % 2) * 40, cw, ch)) }
    } else if (o.imgs[0]) cover(x, o.imgs[0], 0, 0, wide ? 1200 : W, wide ? H : artH);
    let g;
    if (wide) { g = x.createLinearGradient(760, 0, 1200, 0); g.addColorStop(0, "#05050600"); g.addColorStop(1, "#050506"); x.fillStyle = g; x.fillRect(760, 0, 460, H) }
    else { g = x.createLinearGradient(0, artH - 460, 0, artH + 30); g.addColorStop(0, "#05050600"); g.addColorStop(1, "#050506"); x.fillStyle = g; x.fillRect(0, artH - 460, W, 500) }
    const gx0 = wide ? 1500 : W / 2, gy0 = wide ? 520 : story ? top + 250 : 760; g = x.createRadialGradient(gx0, gy0, 40, gx0, gy0, wide ? 700 : 760); g.addColorStop(0, mid + "55"); g.addColorStop(1, "#0000"); x.fillStyle = g; x.fillRect(wide ? 1000 : 0, wide ? 0 : top - 200, wide ? 920 : W, wide ? H : 1000);
    // text
    x.font = '500 26px "DM Sans",sans-serif'; x.fillStyle = "#b9b4aa"; x.letterSpacing = "9px"; x.fillText(o.kicker.toUpperCase(), tx, top + kO); x.letterSpacing = "0px";
    x.font = `400 ${fs}px "Bebas Neue",sans-serif`; x.letterSpacing = "4px"; x.fillStyle = "#f6f1e8"; lines.forEach((l, i) => x.fillText(l, tx - 4, top + kO + lh * (i + 1) + 6)); x.letterSpacing = "0px";
    const ty = top + kO + lh * lines.length + 6;
    x.font = `italic 500 ${story ? 50 : 44}px "Cormorant Garamond",Georgia,serif`; x.fillStyle = acc; x.fillText(o.sub, tx, ty + 60);
    // palette
    const py = story ? 1480 : wide ? 700 : 820, ph = story ? 190 : wide ? 160 : 120, pw = tw, n = o.pal.length, bw = pw / n;
    x.save(); x.beginPath(); x.roundRect(tx, py, pw, ph, 26); x.clip(); o.pal.forEach((h, i) => { x.fillStyle = h; x.fillRect(tx + i * bw, py, bw + 1, ph) }); x.restore();
    x.font = `500 ${wide ? 20 : 24}px "DM Sans",sans-serif`; x.fillStyle = "#c9c4ba"; x.textAlign = "center"; o.pal.forEach((h, i) => x.fillText(h, tx + i * bw + bw / 2, py + ph + 40)); x.textAlign = "left";
    // footer
    const fy = story ? 1832 : wide ? 1022 : 1036;
    x.font = '400 46px "Bebas Neue",sans-serif'; x.fillStyle = "#f6f1e8"; x.letterSpacing = "14px"; x.fillText("PARDA", tx, fy); x.letterSpacing = "0px";
    x.font = `italic 500 ${wide ? 28 : 32}px "Cormorant Garamond",Georgia,serif`; x.fillStyle = "#9a958b"; x.textAlign = "right"; x.fillText("Explore films in their own colour.", tx + pw, fy - 2);
    if (story || wide) { x.font = '500 20px "DM Sans",sans-serif'; x.fillText(location.host, tx + pw, fy + 36) } x.textAlign = "left";
    return new Promise(r => c.toBlob(b => r(b), "image/png"));
  }
  function rr(x, im, px, py, cw, ch) { x.save(); x.beginPath(); x.roundRect(px, py, cw, ch, 18); x.clip(); cover(x, im, px, py, cw, ch); x.restore() }
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

  function show(make, name, mid) {
    let shape = matchMedia("(min-width:700px)").matches ? "wide" : "story", url = "", blob = null; const cache = {};
    const ov = document.createElement("div"); ov.className = "cdov"; ov.style.setProperty("--cg", mid || "#000");
    const ar = s => DIM[s][0] / DIM[s][1];
    ov.innerHTML = `<div class="cdi" style="--r:${ar(shape)}"><img alt="Colour card"></div><div class="cdrow ch">${["story", "square", "wide"].map(k => `<button type="button" data-s="${k}" class="${k === shape ? "on" : ""}">${k}</button>`).join("")}</div><div class="cdrow"><button type="button" class="go" data-a="share">Share</button><button type="button" data-a="save">Save</button><button type="button" data-a="x">Close</button></div>`;
    const img = ov.querySelector("img"), box = ov.querySelector(".cdi");
    const apply = async () => { img.style.opacity = .25; blob = cache[shape] || (cache[shape] = await make(shape)); URL.revokeObjectURL(url); url = URL.createObjectURL(blob); img.src = url; img.style.opacity = 1 };
    const close = () => { ov.remove(); URL.revokeObjectURL(url) };
    ov.onclick = async e => {
      const b = e.target.closest("button"); if (!b) { if (e.target === ov) close(); return }
      if (b.dataset.s) { shape = b.dataset.s; ov.querySelectorAll("[data-s]").forEach(z => z.classList.toggle("on", z === b)); box.style.setProperty("--r", ar(shape)); return apply() }
      const a = b.dataset.a; if (a === "x") return close(); if (!blob) return;
      const file = new File([blob], name + "-" + shape + ".png", { type: "image/png" });
      if (a === "share" && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "Parda" }) } catch (er) {} return }
      const l = document.createElement("a"); l.href = url; l.download = file.name; document.body.append(l); l.click(); l.remove();
    };
    document.body.append(ov); apply();
  }
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  window.CVCard = {
    async film(o) { // {title,year,type,stills:[path],pal:[hex]}
      const imgs = (await Promise.all(o.stills.map(p => load(IMG + "w1280" + p)))).filter(Boolean);
      const spec = { kicker: "The colour of", title: o.title, sub: [o.year, o.type === "tv" ? "Series" : "Film"].filter(Boolean).join("  ·  "), imgs, pal: o.pal };
      show(sh => draw(spec, sh), "parda-" + slug(o.title), o.pal[Math.floor(o.pal.length / 2)]);
    },
    async listHook(all) {
      const list = document.getElementById("list"), tabs = document.getElementById("tabs"); if (!list || !tabs) return;
      let box = document.getElementById("cinemaColour"); const items = all.filter(i => i.poster).slice(0, 12);
      if (items.length < 3 || !window.CVPal) { if (box) box.remove(); return }
      const key = items.map(i => i.type + i.id).join(","); if (box && box.dataset.k === key) return;
      const ims = (await Promise.all(items.map(i => load(IMG + "w185" + i.poster)))).filter(Boolean); if (ims.length < 3) return;
      const cols = CVPal.palette(ims), hs = cols.map(c => CVPal.hex(c.r, c.g, c.b)), name = colourName(cols);
      if (!box) { box = document.createElement("div"); box.id = "cinemaColour"; box.className = "ccx"; tabs.before(box) }
      box.dataset.k = key; box.style.setProperty("--cg", hs[Math.floor(hs.length / 2)]);
      box.innerHTML = `<small>YOUR CINEMA COLOUR</small><h3>${name}</h3><div class="cp">${hs.map(h => `<i style="background:${h}"></i>`).join("")}</div><p>Read from the posters of ${ims.length} titles in your list.</p><button type="button">Create card</button>`;
      box.querySelector("button").onclick = async () => { const big = (await Promise.all(items.map(i => load(IMG + "w342" + i.poster)))).filter(Boolean); const spec = { kicker: "My cinema colour", title: name, sub: "from " + ims.length + " titles I saved", imgs: big, pal: hs, mosaic: true }; show(sh => draw(spec, sh), "parda-my-cinema-colour", hs[Math.floor(hs.length / 2)]) };
    }
  };
})();
