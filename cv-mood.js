/* "Mood" tab in the detail sheet: Stills · Colour · Sound. Data: TMDB images/credits (already loaded) + Apple's public iTunes Search API (no key). */
(() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = document.createElement("style");
  css.textContent = `.mood h3{font:400 22px "Bebas Neue",sans-serif;letter-spacing:.16em;margin:26px 0 12px;color:var(--fg)}.mood h3:first-child{margin-top:8px}
.mstills{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:0 20px 4px;scrollbar-width:none}.mstills::-webkit-scrollbar{display:none}
.mstills button{flex:0 0 min(78%,420px);aspect-ratio:16/9;border:0;border-radius:16px;overflow:hidden;scroll-snap-align:center;padding:0;background:#111 center/cover;cursor:zoom-in}
.mpal{display:flex;height:84px;border-radius:16px;overflow:hidden;box-shadow:0 18px 50px -22px var(--mg,#000)}.mpal button{flex:1;border:0;padding:0;position:relative;cursor:pointer;transition:flex .6s cubic-bezier(.2,.8,.2,1)}.mpal button:hover,.mpal button:focus-visible{flex:2.4}
.mhex{display:flex;margin-top:8px}.mhex span{flex:1;text-align:center;font:500 11px/1 "DM Sans",sans-serif;letter-spacing:.06em;color:#a8a39a}
.mpal button b{position:absolute;inset:auto 0 8px;text-align:center;font:500 11px "DM Sans";opacity:0;transition:opacity .3s;mix-blend-mode:difference;color:#fff}.mpal button.ok b{opacity:1}
.msnd{display:grid;gap:10px}.msong{display:flex;gap:14px;align-items:center;padding:12px;border:1px solid #ffffff1c;border-radius:16px;background:linear-gradient(160deg,#ffffff0d,#ffffff03)}
.msong img{width:58px;height:58px;border-radius:10px;object-fit:cover;background:#1a1a1a;flex:none}.msong div{min-width:0;flex:1}.msong small{display:block;font:500 10px/1 "DM Sans";letter-spacing:.3em;color:var(--accent,#e8905a);margin-bottom:6px}
.msong strong{display:block;font:500 15px/1.25 "DM Sans";white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.msong span{display:block;font-size:13px;color:#a8a39a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.msong nav{display:flex;gap:6px;flex:none}.msong a{font:500 12px "DM Sans";text-decoration:none;color:var(--fg);border:1px solid #ffffff2e;border-radius:99px;padding:8px 12px}.msong a:hover{background:#ffffff14}
.mcred{font-size:11px;color:#77736b;margin-top:10px}@media(max-width:420px){.msong nav{flex-direction:column}}
.mlb{position:fixed;inset:0;z-index:2147483000;background:#000e;display:grid;place-items:center;padding:16px;cursor:zoom-out;animation:cvtIn .3s}.mlb img{max-width:100%;max-height:100%;border-radius:12px}`;
  document.head.appendChild(css);

  const hex = (r, g, b) => "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  function palette(imgs) {
    const c = document.createElement("canvas"), W = 64, H = 36; c.width = W; c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true }), bins = new Map();
    for (const img of imgs) { x.clearRect(0, 0, W, H); x.drawImage(img, 0, 0, W, H); const px = x.getImageData(0, 0, W, H).data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2], l = (r * 299 + g * 587 + b * 114) / 1000;
      if (l < 20 || l > 242) continue;
      const k = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5), mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
      const e = bins.get(k) || { n: 0, r: 0, g: 0, b: 0, s: 0 }; e.n++; e.r += r; e.g += g; e.b += b; e.s += sat; bins.set(k, e);
    } }
    const all = [...bins.values()].map(e => ({ r: Math.round(e.r / e.n), g: Math.round(e.g / e.n), b: Math.round(e.b / e.n), w: e.n * (e.s / e.n < 0.14 ? 0.25 : 0.4 + 2.2 * e.s / e.n) })).sort((a, b) => b.w - a.w), out = [];
    for (const c1 of all) { if (out.every(o => Math.hypot(o.r - c1.r, o.g - c1.g, o.b - c1.b) > 48)) out.push(c1); if (out.length === 6) break }
    return out.sort((a, b) => (a.r * 299 + a.g * 587 + a.b * 114) - (b.r * 299 + b.g * 587 + b.b * 114));
  }
  window.CVPal = { palette, hex };
  const jam = new Map();
  async function songs(d, t, composer) {
    const title = d.title || d.name || ""; if (!title) return [];
    const key = t + d.id; if (jam.has(key)) return jam.get(key);
    let out = [];
    try {
      const r = await fetch("https://itunes.apple.com/search?media=music&entity=song&limit=30&term=" + encodeURIComponent(title + " soundtrack"));
      const j = await r.json(), words = title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2);
      const ok = (j.results || []).filter(s => { const a = (s.collectionName || "").toLowerCase(); return words.length && words.every(w => a.includes(w)) && /soundtrack|score|music|theme|series|original/.test(a) });
      const theme = ok.find(s => /theme|main title|title|suite|overture|opening/i.test(s.trackName)), other = ok.find(s => s !== theme && (!theme || s.artistName !== theme.artistName || s.trackName !== theme.trackName));
      const mk = (s, label) => ({ label, name: s.trackName.replace(/\s*\(.*?(from|feat).*?\)/i, ""), artist: s.artistName, art: (s.artworkUrl100 || "").replace("100x100", "200x200") });
      if (theme) out.push(mk(theme, "THEME")); if (other) out.push(mk(other, theme ? "FEATURED" : "SOUNDTRACK"));
    } catch (e) {}
    if (!out.length && composer) out = [{ label: "THEME", name: title + " main theme", artist: composer, art: "" }];
    jam.set(key, out); return out;
  }
  const yt = s => "https://www.youtube.com/results?search_query=" + encodeURIComponent(s.name + " " + s.artist), sp = s => "https://open.spotify.com/search/" + encodeURIComponent(s.name + " " + s.artist);

  window.CVMood = async function (d, t) {
    const root = document.getElementById("mood"); if (!root) return;
    const bds = ((d.images || {}).backdrops || []).filter(b => !b.iso_639_1).sort((a, b) => b.vote_average - a.vote_average).slice(0, 5);
    const crew = (d.credits && d.credits.crew) || [], comp = (crew.find(c => /Original Music Composer|Composer/i.test(c.job)) || {}).name || "";
    let html = "";
    if (bds.length) html += `<h3>Stills</h3><div class="mstills">${bds.map((b, i) => `<button type="button" data-i="${i}" aria-label="Still ${i + 1}" style="background-image:url(${IMG}w780${b.file_path})"></button>`).join("")}</div>`;
    if (bds.length) html += `<h3>Colour</h3><div id="mpal" style="min-height:84px"></div>`;
    html += `<div id="msnd"></div>`;
    root.className = "mood"; root.innerHTML = html;
    root.querySelector(".mstills") && root.querySelector(".mstills").addEventListener("click", e => {
      const b = e.target.closest("button[data-i]"); if (!b) return; const lb = document.createElement("div"); lb.className = "mlb"; lb.innerHTML = `<img alt="" src="${IMG}w1280${bds[+b.dataset.i].file_path}">`; lb.onclick = () => lb.remove(); document.body.append(lb);
    });
    if (bds.length) {
      const kill = () => { const box = document.getElementById("mpal"); if (box) { box.previousElementSibling.remove(); box.remove() } };
      const load = b => new Promise(res => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => res(null); im.src = IMG + "w300" + b.file_path });
      Promise.all(bds.map(load)).then(list => { try {
        const imgs = list.filter(Boolean), cols = imgs.length ? palette(imgs) : [], box = document.getElementById("mpal"); if (!box) return; if (!cols.length) return kill();
        const hs = cols.map(c => hex(c.r, c.g, c.b)); root.style.setProperty("--mg", hs[Math.floor(hs.length / 2)]);
        box.style.minHeight = ""; box.innerHTML = `<div class="mpal">${hs.map(h => `<button type="button" aria-label="Copy ${h}" data-h="${h}" style="background:${h}"><b>Copied</b></button>`).join("")}</div><div class="mhex">${hs.map(h => `<span>${h}</span>`).join("")}</div>`;
        box.insertAdjacentHTML("beforeend", `<button type="button" class="mcardbtn">Create colour card</button>`); box.querySelector(".mcardbtn").onclick = () => CVCard.film({ title: d.title || d.name || "", year: (d.release_date || d.first_air_date || "").slice(0, 4), type: t, stills: bds.slice(0, 1).map(b => b.file_path), pal: hs });
        box.onclick = e => { const b = e.target.closest("[data-h]"); if (!b) return; const done = () => { b.classList.add("ok"); setTimeout(() => b.classList.remove("ok"), 1100) }; try { navigator.clipboard.writeText(b.dataset.h).then(done, done) } catch (x) { done() } };
      } catch (e) { kill() } });
    }
    const ss = await songs(d, t, comp), sn = document.getElementById("msnd");
    if (sn && ss.length) sn.innerHTML = `<h3>Sound</h3><div class="msnd">${ss.map(s => `<div class="msong">${s.art ? `<img alt="" loading="lazy" src="${esc(s.art)}">` : `<img alt="" style="visibility:hidden">`}<div><small>${s.label}</small><strong>${esc(s.name)}</strong><span>${esc(s.artist)}</span></div><nav><a target="_blank" rel="noopener noreferrer" href="${yt(s)}">YouTube</a><a target="_blank" rel="noopener noreferrer" href="${sp(s)}">Spotify</a></nav></div>`).join("")}</div><p class="mcred">Track info via iTunes${comp ? " · Music by " + esc(comp) : ""}</p>`;
    if (!bds.length && !ss.length) { const tb = document.querySelector('[data-cvt="mood"]'); if (tb && window.cvtDrop) cvtDrop("mood") }
  };
})();
