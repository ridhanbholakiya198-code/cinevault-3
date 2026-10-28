/* Parda sound: original Web Audio synthesis, nothing downloaded. Off by default. Menu -> "Sound": Off / Effects / Effects + ambience.
   Design rules taken from measured cinema references: dark spectrum, slow 0.3 Hz "breathing", long reverb, few events, big gaps of silence.
   Phone speakers cannot play below ~150 Hz, so low notes are built from their harmonics (100-600 Hz). Add ?soundlab=1 to the URL to tune by ear. */
(() => {
  const KEY = "cv_snd", CFG = "cv_snd_cfg", RATIO = [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5, 2];
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(CFG) || "{}") } catch (e) {}
  const P = Object.assign({ vol: .55, tone: 4200, rev: .9, root: 55, score: .5 }, saved);
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));

  function engine(ctx, dest) {
    const bus = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), verb = ctx.createConvolver(), lp = ctx.createBiquadFilter(), comp = ctx.createDynamicsCompressor(), master = ctx.createGain();
    const n = Math.floor(ctx.sampleRate * 3.8), ir = ctx.createBuffer(2, n, ctx.sampleRate);
    const cm = new Float32Array(n); { let y = 0; for (let i = 0; i < n; i++) { y += ((Math.random() * 2 - 1) - y) * .16; cm[i] = y } }
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let y = 0; for (let i = 0; i < n; i++) { y += ((Math.random() * 2 - 1) - y) * .16; d[i] = (cm[i] * .75 + y * .45) * Math.pow(1 - i / n, 3.3) } } // mostly-correlated tails: cinema low end stays near-mono
    verb.buffer = ir; lp.type = "lowpass"; lp.Q.value = .5; comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = .02; comp.release.value = .4; dry.gain.value = .85;
    bus.connect(dry); bus.connect(verb); verb.connect(wet); dry.connect(lp); wet.connect(lp); lp.connect(comp); comp.connect(master); master.connect(dest);
    const apply = () => { master.gain.value = P.vol; lp.frequency.value = P.tone; wet.gain.value = P.rev * .8 }; apply();
    const nb = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const env = (g, t, peak, a, d) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, .0002), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d) };
    function voice(t, f, o) { o = Object.assign({ type: "sine", g: .2, a: .05, d: 1, f2: 0, ft: 1, det: 0 }, o); const os = ctx.createOscillator(), g = ctx.createGain(); os.type = o.type; os.frequency.setValueAtTime(f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + o.a + o.d); os.detune.value = o.det;
      let out = os; if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.Q.value = .6; fl.frequency.setValueAtTime(o.lp[0], t); fl.frequency.exponentialRampToValueAtTime(o.lp[1], t + o.a + o.d * .6); os.connect(fl); out = fl }
      out.connect(g); g.connect(o.out || bus); env(g, t, o.g, o.a, o.d); os.start(t); os.stop(t + o.a + o.d + .2) }
    function air(t, o) { o = Object.assign({ f0: 300, f1: 900, q: .9, g: .1, a: .25, d: .4, type: "bandpass" }, o); const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; f.type = o.type; f.Q.value = o.q; f.frequency.setValueAtTime(o.f0, t); f.frequency.exponentialRampToValueAtTime(o.f1, t + o.a + o.d); s.connect(f); f.connect(g); g.connect(o.out || bus); env(g, t, o.g, o.a, o.d); s.start(t, Math.random() * 1.5); s.stop(t + o.a + o.d + .1) }
    const BPM = 62, BEAT = 60 / BPM, BAR = BEAT * 4, mf = m => 440 * Math.pow(2, (m - 69) / 12), jit = () => (Math.random() - .5) * .02;
    const CH = { Dm: { b: 38, n: [57, 62, 65, 69, 74], mel: [[0, 69, 2], [2, 74, 1], [3, 72, 1], [4, 69, 2.5]] }, Bb: { b: 46, n: [58, 62, 65, 70, 74], mel: [[0, 70, 2], [2, 69, 1], [3, 65, 1], [4, 70, 3]] }, F: { b: 41, n: [57, 60, 65, 69, 72], mel: [[0, 72, 2], [2, 69, 1], [3, 65, 1], [4, 67, 2.5]] }, C: { b: 48, n: [55, 60, 64, 67, 72], mel: [[0, 76, 2], [2, 72, 1], [3, 67, 1], [4, 64, 2.5]] }, Gm: { b: 43, n: [58, 62, 67, 70, 74], mel: [[0, 70, 2], [2, 74, 1], [3, 72, 1], [4, 67, 2.5]] }, A: { b: 45, n: [57, 61, 64, 69, 73], mel: [[0, 73, 2], [2, 69, 1], [3, 64, 1], [4, 73, 3]] } };
    const PASS = [["Dm", "Bb", "F", "C"], ["Dm", "Bb", "Gm", "A"]], INT = [.18, .2, .22, .24, .34, .38, .42, .5, .62, .66, .72, .78, .9, 1, .55, .25];
    const pan = (v, out) => { if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(out); return p } return out };
    function pad(out, t, f, dur, g, lp, pv) { const gg = ctx.createGain(), fl = ctx.createBiquadFilter(), a = Math.min(1.8, dur * .45), r = 2.4; fl.type = "lowpass"; fl.Q.value = .5; fl.frequency.setValueAtTime(lp * .55, t); fl.frequency.exponentialRampToValueAtTime(lp, t + a + .5);
      [-9, 0, 9].forEach(d => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = d + (Math.random() - .5) * 4; o.connect(fl); o.start(t); o.stop(t + dur + r + .1) });
      fl.connect(gg); gg.connect(pan(pv, out)); gg.gain.setValueAtTime(.0001, t); gg.gain.exponentialRampToValueAtTime(g / 1.7, t + a); gg.gain.setValueAtTime(g / 1.7, t + dur); gg.gain.exponentialRampToValueAtTime(.0001, t + dur + r) }
    function brass(out, t, f, dur, g, top) { const gg = ctx.createGain(), fl = ctx.createBiquadFilter(), pk = ctx.createBiquadFilter(), a = 2, r = 2.6; fl.type = "lowpass"; fl.Q.value = .8; fl.frequency.setValueAtTime(260, t); fl.frequency.exponentialRampToValueAtTime(top, t + a + .6); pk.type = "peaking"; pk.frequency.value = 620; pk.gain.value = 6; pk.Q.value = 1;
      [-7, 0, 7].forEach(d => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = d; o.connect(fl); o.start(t); o.stop(t + dur + r + .1) }); fl.connect(pk); pk.connect(gg); gg.connect(out);
      gg.gain.setValueAtTime(.0001, t); gg.gain.exponentialRampToValueAtTime(g / 1.7, t + a); gg.gain.setValueAtTime(g / 1.7, t + dur); gg.gain.exponentialRampToValueAtTime(.0001, t + dur + r) }
    function pluck(out, t, m, g, pv) { const f = mf(m), gg = ctx.createGain(), fl = ctx.createBiquadFilter(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(); fl.type = "lowpass"; fl.frequency.value = 3000; o1.type = "sine"; o1.frequency.value = f; o2.type = "triangle"; o2.frequency.value = f * 2; g2.gain.value = .35; o1.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(gg); gg.connect(pan(pv, out)); env(gg, t, g, .005, 1.2); o1.start(t); o2.start(t); o1.stop(t + 1.4); o2.stop(t + 1.4) }
    function taiko(out, t, g) { voice(t, 150, { g, a: .004, d: .55, f2: 62, out }); air(t, { f0: 200, f1: 160, q: .8, g: g * .5, a: .004, d: .3, out }) }
    function bar_(bar, t, out) {
      const cyc = Math.floor(bar / 16), b = bar % 16, I = INT[b], pi = Math.floor(b / 8), ci = Math.floor((b % 8) / 2), name = PASS[(pi + cyc) % 2][ci], c = CH[name], first = b % 2 === 0, bt = k => t + k * BEAT + jit();
      voice(t, mf(38) * 2, { g: .1 + .1 * I, a: 1.4, d: BAR - .8, out, lp: [200, 700] }); voice(t, mf(38) * 3, { g: .05 + .05 * I, a: 1.4, d: BAR - .8, out, lp: [200, 700] });   // D pedal (harmonics, phone-safe)
      if (first) { const dur = BAR * 2 - .3; [c.b, ...c.n].forEach((m, i) => pad(out, t, mf(m + (i === 0 ? 12 : 0)), dur, (i === 0 ? .17 : .12) * (.5 + .5 * I), i === 0 ? 700 : 1500 + 700 * I, [0, -.5, -.2, .1, .35, .55][i] || 0)) }
      if (b >= 4 && b <= 13) { const arp = [c.n[1], c.n[2], c.n[3], c.n[4], c.n[3], c.n[2]]; for (let i = 0; i < 8; i++) { const k = (bar * 8 + i) % 6; pluck(out, bt(i * .5), arp[k] + 12, (i % 3 === 0 ? .1 : .045) * (.4 + .6 * I), ((i * 37) % 100) / 100 - .5) } }
      if (b >= 8 && b <= 13 && first) { brass(out, t, mf(c.b + 12), BAR * 2 - 1.4, .2 * I, 1500 + 1100 * I); brass(out, t, mf(c.b + 19), BAR * 2 - 1.4, .13 * I, 1300 + 900 * I) }
      if (b >= 8 && b <= 13) { const q = first ? 0 : BAR; c.mel.forEach(([off, m, d]) => { if (off * BEAT + (first ? 0 : 0) < BAR * 2 && (first ? off < 4 : off >= 4)) { const tt = t + (off - (first ? 0 : 4)) * BEAT + jit(); pluck(out, tt, m + (b > 11 ? 12 : 0), .2, .2); pluck(out, tt, m - 12, .07, -.2) } }) }
      if (b === 14) { pluck(out, t + .2, 74, .22, .1); pluck(out, t + .2, 62, .1, -.2) } if (b === 15) pluck(out, t + BEAT * 2, 69, .12, 0);
      if (b >= 4 && b <= 11) taiko(out, t, .1 + .08 * I); if (b === 8 || b === 12 || b === 13) { taiko(out, t, .3); taiko(out, t + BEAT * 2, .22) } if (b === 13) { taiko(out, t + BEAT * 3, .16); taiko(out, t + BEAT * 3.5, .2) }
      if (b === 7) air(t + BEAT, { f0: 300, f1: 3200, q: .6, g: .05, a: BEAT * 2.9, d: .15, out }); if (b === 11) air(t + BEAT * 2, { f0: 400, f1: 3600, q: .6, g: .06, a: BEAT * 1.9, d: .15, out });
    }
    return {
      apply,
      awaken(t = ctx.currentTime) { const r = P.root; [[1, .12], [2, .46], [3, .32], [4, .2], [6, .07]].forEach(([k, g]) => { voice(t, r * k, { g, a: 1.8, d: 3.4, lp: [260, 2400] }); if (k > 1 && k < 5) voice(t, r * k, { g: g * .6, a: 2, d: 3.4, det: 7, lp: [260, 2000] }) }); air(t, { f0: 500, f1: 1500, q: .5, g: .035, a: 2.2, d: 1.4 }) },
      open(hue, t = ctx.currentTime) { const f = P.root * 2 * RATIO[Math.floor(((hue % 360 + 360) % 360) / 360 * RATIO.length)]; [[1, .34], [2, .3], [3, .18], [4, .08]].forEach(([k, g]) => voice(t, f * k, { g, a: .14, d: 1.9, lp: [500, 2600] })); air(t, { type: "lowpass", f0: 300, f1: 700, q: .3, g: .05, a: .1, d: .5 }) },
      add(t = ctx.currentTime) { [196, 294].forEach((f, i) => { voice(t + i * .09, f, { g: .22, a: .012, d: 1.7, type: "triangle", lp: [1800, 700] }); voice(t + i * .09, f * 2, { g: .07, a: .012, d: 1.2 }) }) },
      remove(t = ctx.currentTime) { voice(t, 294, { g: .16, a: .01, d: .55, f2: 196, type: "triangle", lp: [1500, 500] }) },
      swipe(t = ctx.currentTime) { air(t, { f0: 250, f1: 900, q: .9, g: .1, a: .25, d: .35 }) },
      shutter(t = ctx.currentTime) { air(t, { f0: 2600, f1: 2200, q: 1.2, g: .2, a: .004, d: .03 }); air(t + .085, { f0: 2400, f1: 2000, q: 1.2, g: .13, a: .004, d: .035 }); voice(t, 110, { g: .26, a: .004, d: .2, f2: 55 }) },
      score(t0 = ctx.currentTime, bars = 16, live = false) { const sg = ctx.createGain(); sg.connect(bus); sg.gain.setValueAtTime(.0001, t0); sg.gain.exponentialRampToValueAtTime(P.score, t0 + 4);
        let bar = 0, t = t0 + .1, off = false, timer = 0; const run = () => { while (!off && bar < bars && t < ctx.currentTime + 8) { bar_(bar, t, sg); t += BAR; bar++ } }; if (live) { run(); timer = setInterval(run, 400) } else { for (; bar < bars; bar++, t += BAR) bar_(bar, t, sg) }
        return { stop(at = ctx.currentTime, fade = 2.8) { off = true; clearInterval(timer); sg.gain.cancelScheduledValues(at); sg.gain.setValueAtTime(Math.max(sg.gain.value, .0002), at); sg.gain.exponentialRampToValueAtTime(.0001, at + fade); setTimeout(() => { try { sg.disconnect() } catch (e) {} }, (fade + 7) * 1000) }, gain: sg } }
    };
  }

  let ctx = null, eng = null, mode = localStorage.getItem(KEY) || "off", ambo = null; const MODES = ["off", "fx", "amb"], NAMES = { off: "Off", fx: "Effects", amb: "Effects + ambience" };
  const ensure = () => { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); eng = engine(ctx, ctx.destination) } if (ctx.state === "suspended") ctx.resume(); return ctx };
  const live = force => (force || mode !== "off") && ensure();
  const startAmb = () => { if (!ambo && live()) ambo = eng.score(ctx.currentTime, 1e9, true) }, stopAmb = () => { if (ambo) { ambo.stop(); ambo = null } };
  const hueOf = () => { const v = (getComputedStyle(document.documentElement).getPropertyValue("--accent") || "").trim(); let r, g, b, m; if ((m = v.match(/^#([0-9a-f]{6})$/i))) { r = parseInt(m[1].slice(0, 2), 16); g = parseInt(m[1].slice(2, 4), 16); b = parseInt(m[1].slice(4), 16) } else if ((m = v.match(/(\d+)\D+(\d+)\D+(\d+)/))) { r = +m[1]; g = +m[2]; b = +m[3] } else return 30; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 30; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360 };
  const api = {
    label: () => NAMES[mode],
    cycle() { mode = MODES[(MODES.indexOf(mode) + 1) % 3]; localStorage.setItem(KEY, mode); if (mode === "off") { stopAmb(); return } if (!live()) return; if (mode === "fx") { stopAmb(); eng.awaken() } else { eng.awaken(); startAmb() } },
    open(f) { if (live(f)) eng.open(hueOf()) }, add(f) { if (live(f)) eng.add() }, remove(f) { if (live(f)) eng.remove() }, swipe(f) { if (live(f)) eng.swipe() }, shutter(f) { if (live(f)) eng.shutter() }, awaken(f) { if (live(f)) eng.awaken() },
    ambience(on) { if (on) { if (live(true)) startAmb() } else stopAmb() }, P, _engine: engine, _apply: () => eng && eng.apply()
  };
  window.CVSound = api;
  document.addEventListener("pointerdown", () => { if (mode !== "off" && ensure() && mode === "amb") startAmb() }, { once: true, capture: true });
  document.addEventListener("visibilitychange", () => { if (!ctx) return; document.hidden ? ctx.suspend() : (mode !== "off" && ctx.resume()) });
  document.addEventListener("click", e => { const b = e.target.closest("#bkm"); if (!b || mode === "off") return; const before = b.textContent; setTimeout(() => { const now = b.textContent; (/remove|in list|added|saved|✓/i.test(now) && now !== before) || b.classList.contains("on") ? api.add() : api.remove() }, 80) }, true);

  if (/[?&]soundlab/.test(location.search)) document.addEventListener("DOMContentLoaded", () => {
    const d = document.createElement("div"); d.style.cssText = "position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:2147483002;background:#000e;border:1px solid #ffffff30;border-radius:16px;padding:12px;font:12px/1.3 'DM Sans',sans-serif;color:#f2ede4;max-width:460px;margin:auto";
    const row = (k, lab, mn, mx, st) => `<label style="display:flex;align-items:center;gap:8px;margin:4px 0"><span style="width:72px">${lab}</span><input data-k="${k}" type="range" min="${mn}" max="${mx}" step="${st}" value="${P[k]}" style="flex:1"><b data-v="${k}" style="width:44px;text-align:right">${P[k]}</b></label>`;
    d.innerHTML = `<b style="letter-spacing:.2em">SOUND LAB</b>${row("vol", "Volume", 0, 1, .01)}${row("tone", "Tone Hz", 600, 9000, 100)}${row("rev", "Reverb", 0, 1.5, .01)}${row("root", "Root Hz", 40, 110, 1)}${row("score", "Score", 0, 1, .01)}<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${["awaken", "open", "add", "remove", "swipe", "shutter"].map(n => `<button data-p="${n}" style="all:unset;padding:8px 12px;border:1px solid #ffffff40;border-radius:99px;cursor:pointer">${n}</button>`).join("")}<button data-p="amb" style="all:unset;padding:8px 12px;border:1px solid #ffffff40;border-radius:99px;cursor:pointer">soundtrack on/off</button><button data-p="copy" style="all:unset;padding:8px 12px;border-radius:99px;background:#e8905a;color:#000;cursor:pointer">copy settings</button></div>`;
    d.oninput = e => { const k = e.target.dataset.k; if (!k) return; P[k] = +e.target.value; d.querySelector(`[data-v="${k}"]`).textContent = P[k]; localStorage.setItem(CFG, JSON.stringify(P)); ensure(); api._apply() };
    d.onclick = e => { const n = (e.target.closest("[data-p]") || {}).dataset; if (!n) return; n.p === "copy" ? navigator.clipboard.writeText(JSON.stringify(P)) : n.p === "amb" ? api.ambience(!ambo) : api[n.p](true) };
    document.body.append(d);
  });
})();
