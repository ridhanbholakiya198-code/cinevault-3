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
.cdov{position:fixed;inset:0;z-index:2147483000;background:#000f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;animation:cvtIn .35s}
.cdov .cdi{position:relative;max-height:76vh;max-width:min(92vw,calc(76vh*.5625));aspect-ratio:9/16;border-radius:18px;overflow:hidden;box-shadow:0 40px 120px -30px var(--cg,#000);animation:cdIn 1.1s cubic-bezier(.2,.8,.2,1) both}
.cdov .cdi img{width:100%;height:100%;display:block}.cdov .cdi::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,#0000 35%,#ffffff30 50%,#0000 65%);transform:translateX(-120%);animation:cdSw 1.6s .5s ease-out forwards}
@keyframes cdIn{from{opacity:0;transform:scale(.9) translateY(30px);filter:blur(12px)}}@keyframes cdSw{to{transform:translateX(120%)}}
.cdov nav{display:flex;gap:10px}.cdov nav button{padding:13px 24px;border-radius:99px;border:1px solid #ffffff2e;background:#ffffff10;color:#f2ede4;font:500 14px "DM Sans";cursor:pointer}.cdov nav button.p{background:var(--accent,#e8905a);border-color:transparent;color:#000}`;
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

  async function draw(o) { // o: {kicker,title,sub,imgs:[Image],pal:[hex],mosaic:bool}
    await fonts();
    const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    const mid = o.pal[Math.floor(o.pal.length / 2)] || "#e8905a", acc = o.pal.slice().sort((a, b) => hsv(...rgb(b)).s - hsv(...rgb(a)).s)[0] || "#e8905a";
    x.fillStyle = "#050506"; x.fillRect(0, 0, W, H);
    let fs = 168; x.font = `400 ${fs}px "Bebas Neue",sans-serif`; x.letterSpacing = "4px"; let lines = wrap(x, o.title.toUpperCase(), W - 144, 3);
    while ((lines.length > 2 || lines.some(l => x.measureText(l).width > W - 144)) && fs > 96) { fs -= 12; x.font = `400 ${fs}px "Bebas Neue",sans-serif`; lines = wrap(x, o.title.toUpperCase(), W - 144, 3) }
    x.letterSpacing = "0px"; const top = Math.min(1130, Math.round(1285 - fs * .92 * lines.length));
    if (o.mosaic) { const ims = o.imgs.slice(0, 6), gx = 18, cw = (W - 108 - gx * 2) / 3, ch = cw * 1.5; ims.forEach((im, i) => { const col = i % 3, row = Math.floor(i / 3), px = 54 + col * (cw + gx), py = 90 + row * (ch + gx); x.save(); x.beginPath(); x.roundRect(px, py, cw, ch, 22); x.clip(); cover(x, im, px, py, cw, ch); x.restore() }) }
    else if (o.imgs[0]) cover(x, o.imgs[0], 0, 0, W, top + 60);
    let g = x.createLinearGradient(0, top - 520, 0, top + 80); g.addColorStop(0, "#05050600"); g.addColorStop(1, "#050506"); x.fillStyle = g; x.fillRect(0, top - 520, W, 600);
    g = x.createRadialGradient(W / 2, top + 250, 40, W / 2, top + 250, 760); g.addColorStop(0, mid + "55"); g.addColorStop(1, "#0000"); x.fillStyle = g; x.fillRect(0, top - 200, W, 1000);
    x.fillStyle = "#050506"; x.fillRect(0, 0, W, 0); // keep top clean
    x.textBaseline = "alphabetic"; x.textAlign = "left";
    x.font = '500 26px "DM Sans",sans-serif'; x.fillStyle = "#b9b4aa"; x.letterSpacing = "9px"; x.fillText(o.kicker.toUpperCase(), 72, top + 70); x.letterSpacing = "0px";
    x.font = `400 ${fs}px "Bebas Neue",sans-serif`; x.letterSpacing = "4px"; x.fillStyle = "#f6f1e8"; lines.forEach((l, i) => x.fillText(l, 68, top + 70 + fs * .92 * (i + 1) + 6)); x.letterSpacing = "0px";
    const ty = top + 70 + fs * .92 * lines.length + 6;
    x.font = 'italic 500 50px "Cormorant Garamond",Georgia,serif'; x.fillStyle = acc; x.fillText(o.sub, 72, ty + 66);
    const py = 1480, ph = 190, px = 72, pw = W - 144, n = o.pal.length, bw = pw / n;
    x.save(); x.beginPath(); x.roundRect(px, py, pw, ph, 28); x.clip(); o.pal.forEach((h, i) => { x.fillStyle = h; x.fillRect(px + i * bw, py, bw + 1, ph) }); x.restore();
    x.font = '500 24px "DM Sans",sans-serif'; x.fillStyle = "#c9c4ba"; x.textAlign = "center"; o.pal.forEach((h, i) => x.fillText(h, px + i * bw + bw / 2, py + ph + 44)); x.textAlign = "left";
    x.font = '400 46px "Bebas Neue",sans-serif'; x.fillStyle = "#f6f1e8"; x.letterSpacing = "14px"; x.fillText("PARDA", 72, 1832); x.letterSpacing = "0px";
    x.font = 'italic 500 32px "Cormorant Garamond",Georgia,serif'; x.fillStyle = "#9a958b"; x.textAlign = "right"; x.fillText("Explore films in their own colour.", W - 72, 1830);
    x.font = '500 20px "DM Sans",sans-serif'; x.fillText(location.host, W - 72, 1868); x.textAlign = "left";
    return new Promise(r => c.toBlob(b => r(b), "image/png"));
  }
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

  function show(blob, name, mid) {
    const url = URL.createObjectURL(blob), ov = document.createElement("div"); ov.className = "cdov"; ov.style.setProperty("--cg", mid || "#000");
    ov.innerHTML = `<div class="cdi"><img alt="Colour card" src="${url}"></div><nav><button type="button" class="p" data-a="share">Share</button><button type="button" data-a="save">Save</button><button type="button" data-a="x">Close</button></nav>`;
    const close = () => { ov.remove(); URL.revokeObjectURL(url) };
    ov.onclick = async e => { const b = e.target.closest("button"); if (!b) { if (e.target === ov) close(); return }
      const a = b.dataset.a; if (a === "x") return close();
      const file = new File([blob], name + ".png", { type: "image/png" });
      if (a === "share" && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: "Parda" }) } catch (er) {} return }
      const l = document.createElement("a"); l.href = url; l.download = name + ".png"; document.body.append(l); l.click(); l.remove() };
    document.body.append(ov);
  }
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  window.CVCard = {
    async film(o) { // {title,year,type,stills:[path],pal:[hex]}
      const imgs = (await Promise.all(o.stills.map(p => load(IMG + "w1280" + p)))).filter(Boolean);
      const b = await draw({ kicker: "The colour of", title: o.title, sub: [o.year, o.type === "tv" ? "Series" : "Film"].filter(Boolean).join("  ·  "), imgs, pal: o.pal });
      show(b, "parda-" + slug(o.title), o.pal[Math.floor(o.pal.length / 2)]);
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
      box.querySelector("button").onclick = async () => { const big = (await Promise.all(items.map(i => load(IMG + "w342" + i.poster)))).filter(Boolean); const b = await draw({ kicker: "My cinema colour", title: name, sub: "from " + ims.length + " titles I saved", imgs: big, pal: hs, mosaic: true }); show(b, "parda-my-cinema-colour", hs[Math.floor(hs.length / 2)]) };
    }
  };
})();
