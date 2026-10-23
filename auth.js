// CineVault — optional login, cloud sync, account menu, legal sheets.
// Loads as an ES module AFTER app.js. The app works 100% without it (guest mode).
// Firebase SDK is loaded lazily (only for returning users, or when someone opens sign-in) to keep first load fast.
import { legalHTML } from "./legal.js";
import { initAddons } from "./addons.js";

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CFG = window.CV_FIREBASE || {}, SITE = window.CV_SITE || {};
const LS = "cv_list", HINT = "cv_u", NAG = "cv_nag", FBV = "10.14.1";
const say = t => { try { typeof toast === "function" ? toast(t) : alert(t) } catch { } };
const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d } catch { return d } };

// ---------- icons ----------
const I = (p, x = "") => `<svg viewBox="0 0 24 24" ${x}>${p}</svg>`;
const IC = {
  user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
  x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  eye: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeoff: I('<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  mark: I('<path d="M6 3h12v18l-6-4.5L6 21z"/>'),
  list: I('<path d="M3 18.5V6a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v2"/><path d="M5 20h13.6a2 2 0 0 0 1.9-1.4l1.5-5.6a1 1 0 0 0-1-1.2H8a2 2 0 0 0-1.9 1.4z"/>'),
  dl: I('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
  doc: I('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'),
  shield: I('<path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  plug: I('<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>'),
  out: I('<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  g: '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.9 10.9 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>'
};

// ---------- local list helpers ----------
const readList = () => jget(LS, {});
const writeList = v => { try { localStorage.setItem(LS, JSON.stringify(v)) } catch { } };
const noLists = () => { try { return localStorage.getItem("cv_nolists") === "1" } catch { return false } };
const extraLists = i => (!noLists() && Array.isArray(i.lists) && i.lists.length > 1) ? { lists: i.lists.slice(0, 5) } : {};
const clean = i => ({ id: i.id, type: i.type, title: String(i.title || "").slice(0, 300), poster: i.poster || "", lang: i.lang || "", genres: (i.genres || []).slice(0, 30), status: i.status || "", ...extraLists(i), fav: !!i.fav, sub: !!i.sub, u: Number(i.u) || 0 });
const isEmpty = i => !i.status && !i.fav && !i.sub;
const sig = i => JSON.stringify(clean(i));
const count = () => Object.values(readList()).filter(i => !isEmpty(i)).length;
const changed = () => { try { window.cvStoreChanged && window.cvStoreChanged() } catch { } paintBtn(); listNote(); };

// ---------- Firebase (lazy) ----------
let fbErr = null, fb = null, fbp = null, auth = null, db = null, user = null, unsub = null, known = {}, timer = null, pending = null, syncBad = false, warned = false;
function ensureFb() {
  if (fbp) return fbp;
  fbp = (async () => {
    if (!CFG.apiKey || !CFG.projectId) throw Object.assign(new Error("cv-config.js missing or empty"), { code: "config" });
    const B = `https://www.gstatic.com/firebasejs/${FBV}/`;
    const load = () => Promise.all([import(B + "firebase-app.js"), import(B + "firebase-auth.js"), import(B + "firebase-firestore.js")]);
    const [app, au, fs] = await load().catch(() => new Promise(r => setTimeout(r, 800)).then(load)); // one retry for flaky mobile networks
    const a = app.getApps && app.getApps().length ? app.getApp() : app.initializeApp(CFG);
    auth = au.getAuth(a);
    try {
      db = (CFG.firestoreDatabaseId && CFG.firestoreDatabaseId !== "(default)") ? fs.getFirestore(a, CFG.firestoreDatabaseId) : fs.getFirestore(a);
    } catch (err) {
      console.warn("[CineVault] Firestore init fallback to default:", err);
      db = fs.getFirestore(a);
    }
    fb = { au, fs };
    au.onAuthStateChanged(auth, onUser);
    return fb;
  })().catch(e => { fbp = null; fbErr = e; throw e });
  return fbp;
}

async function onUser(u) {
  user = u;
  if (unsub) { unsub(); unsub = null }
  known = {};
  if (!u) { localStorage.removeItem(HINT); paintBtn(); return }
  saveHint();
  paintBtn();
  try { await startSync(u) } catch (e) { syncFail(e) }
  paintBtn();
  const acc = stack.find(x => x.dataset.id === "account"); if (acc) acc.querySelector(".cva-box").innerHTML = accountHTML();
}
const saveHint = () => { if (user) try { localStorage.setItem(HINT, JSON.stringify({ n: user.displayName || "", p: user.photoURL || "" })) } catch { } };
const hint = () => jget(HINT, null);

function syncFail(e) {
  syncBad = true; known = {};
  console.warn("[CineVault sync]", e && (e.code || e.message || e));
  if (!warned) { warned = true; say(e && e.code === "permission-denied" ? "Cloud sync blocked — Firestore rules need updating" : "Couldn’t sync right now — saved on this device") }
}

async function startSync(u) {
  const { fs } = fb, col = fs.collection(db, "users", u.uid, "list");
  const snap0 = await fs.getDocs(col), remote = {};
  snap0.forEach(d => remote[d.id] = d.data());
  const local = readList(), merged = {}, ups = [], dels = [];
  for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[k], r = remote[k];
    if (l && (!r || (l.u || 0) > (r.u || 0))) {
      merged[k] = l;
      if (isEmpty(l)) { if (r) dels.push(k) } else ups.push(k);
    } else if (r) merged[k] = clean(r);
  }
  const ops = [...ups.map(k => ["s", k, clean(merged[k])]), ...dels.map(k => ["d", k])];
  await commit(col, ops);
  for (const k in merged) if (!isEmpty(merged[k])) known[k] = sig(merged[k]);
  writeList(merged);
  // account record (terms acceptance) — minimal on purpose
  const uref = fs.doc(db, "users", u.uid), now = new Date().toISOString();
  const ex = await fs.getDoc(uref);
  await fs.setDoc(uref, ex.exists() ? { userId: u.uid, updatedAt: now } : { userId: u.uid, termsV: SITE.version || "1.0", privacyV: SITE.version || "1.0", acceptedAt: now, createdAt: now, updatedAt: now }, { merge: true });
  syncBad = false;
  changed();
  // live updates from other devices
  unsub = fs.onSnapshot(col, s => {
    const L = readList(); let dirty = 0;
    s.docChanges().forEach(c => {
      const k = c.doc.id;
      if (c.type === "removed") { if (k in known) { delete known[k]; delete L[k]; dirty = 1 } }
      else {
        const r = clean(c.doc.data()), sg = JSON.stringify(r);
        if (known[k] !== sg && (!L[k] || r.u >= (L[k].u || 0))) { if (L[k] && L[k].lists && L[k].lists.length > 1 && !r.lists && (r.u || 0) === (L[k].u || 0)) { known[k] = sg } else { L[k] = r; known[k] = sg; dirty = 1 } }
      }
    });
    if (dirty) { writeList(L); changed() }
  }, e => syncFail(e));
}

async function commit(col, ops) {
  try { await commitRaw(col, ops) }
  catch (e) {
    // older Firestore rules don't know the "lists" field yet: keep syncing the main list, keep extra lists on this device
    if (e && e.code === "permission-denied" && ops.some(o => o[0] === "s" && o[2] && o[2].lists)) {
      try { localStorage.setItem("cv_nolists", "1") } catch { }
      await commitRaw(col, ops.map(o => o[0] === "s" && o[2] && o[2].lists ? ["s", o[1], (({ lists, ...r }) => r)(o[2])] : o));
    } else throw e
  }
}
async function commitRaw(col, ops) {
  const { fs } = fb;
  for (let i = 0; i < ops.length; i += 400) {
    const b = fs.writeBatch(db);
    ops.slice(i, i + 400).forEach(o => o[0] === "s" ? b.set(fs.doc(col, o[1]), o[2]) : b.delete(fs.doc(col, o[1])));
    await b.commit();
  }
}

function push(v) {
  if (!user || !fb) return;
  pending = v; clearTimeout(timer); timer = setTimeout(flush, 500);
}
async function flush() {
  const v = pending; pending = null; timer = null;
  if (!v || !user || !fb) return;
  const col = fb.fs.collection(db, "users", user.uid, "list"), ops = [], next = { ...known };
  for (const k in v) {
    const it = clean(v[k]);
    if (isEmpty(it)) { if (k in next) { ops.push(["d", k]); delete next[k] } }
    else { const sg = JSON.stringify(it); if (next[k] !== sg) { ops.push(["s", k, it]); next[k] = sg } }
  }
  for (const k in next) if (!(k in v)) { ops.push(["d", k]); delete next[k] }
  if (!ops.length) return;
  try { await commit(col, ops); known = next; syncBad = false } catch (e) { syncFail(e) }
}

// ---------- overlay stack (Android back button aware) ----------
const stack = []; let skip = 0;
function openOv(id, cls = "") {
  const el = document.createElement("div");
  el.className = "cva " + cls; el.dataset.id = id;
  el.innerHTML = '<div class="cva-box" role="dialog" aria-modal="true"></div>';
  el.addEventListener("click", e => { if (e.target === el) closeOv(el) });
  document.body.append(el); stack.push(el);
  history.pushState({ cva: 1 }, "");
  return el;
}
function drop(el) {
  const i = stack.indexOf(el); if (i < 0) return false;
  stack.splice(i, 1); el.remove();
  try { el._onclose && el._onclose() } catch { }
  return true;
}
function closeOv(el) {
  if (!drop(el)) return;
  if (history.state && history.state.cva) { skip++; history.back() }
}
function back() { // called from app.js popstate; true = handled here
  if (skip > 0) { skip--; return true }
  if (stack.length) { drop(stack[stack.length - 1]); return true }
  return false;
}
addEventListener("keydown", e => { if (e.key === "Escape" && stack.length) { e.stopImmediatePropagation(); closeOv(stack[stack.length - 1]) } }, true);

// ---------- avatar button + footer links ----------
function initial() { const n = (user && (user.displayName || user.email)) || (hint() || {}).n || "?"; return esc(n.trim().charAt(0).toUpperCase() || "?") }
function paintBtn() {
  const b = $("#acc"); if (!b) return;
  const h = hint(), on = !!user || !!h;
  b.classList.toggle("in", on);
  b.setAttribute("aria-label", on ? "Account" : "Sign in");
  const ph = (user && user.photoURL) || (h && h.p) || "";
  b.innerHTML = on ? (ph ? `<img alt="" referrerpolicy="no-referrer" src="${esc(ph)}">` : `<span>${initial()}</span>`) : IC.user;
  const im = b.querySelector("img"); if (im) im.onerror = () => { b.innerHTML = `<span>${initial()}</span>` };
}
function listNote() {
  document.querySelectorAll(".cva-note").forEach(n => n.remove());
  const sec = $("#list"); if (!sec || sec.hidden || user || hint() || jget(NAG, {}).never) return;
  const d = document.createElement("div"); d.className = "cva-note";
  d.innerHTML = `${IC.mark}<p>Your list is saved on this device only. <button data-a="auth">Sign in</button> to back it up and open it anywhere.</p>`;
  (sec.querySelector(".lhd") || sec.querySelector("h2")).after(d);
}

// ---------- messages / busy ----------
const FIRST = u => ((u && (u.displayName || u.email)) || "").split(/[ @]/)[0];
function errText(e) {
  const c = (e && e.code) || "";
  return ({
    "auth/invalid-credential": "Wrong email or password.", "auth/wrong-password": "Wrong email or password.", "auth/user-not-found": "Wrong email or password.",
    "auth/invalid-email": "That email address doesn’t look right.", "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/weak-password": "Choose a stronger password (8+ characters).", "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "No connection. Check your internet and try again.", "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and retry.",
    "auth/user-disabled": "This account has been disabled.", "auth/operation-not-allowed": "This sign-in method isn’t enabled yet (Firebase console).",
    "auth/unauthorized-domain": "This website isn’t authorised for sign-in yet (Firebase → Authentication → Settings → Authorized domains).",
    "auth/requires-recent-login": "Please sign in again, then retry."
  })[c] || (fb ? "Something went wrong. Please try again." : "Sign-in service couldn’t load. Check your connection and try again.") + " [" + String(c || (e && e.message) || (fbErr && (fbErr.code || fbErr.message)) || "unknown").slice(0, 70) + "]";
}
function msg(el, t, ok) { const m = el.querySelector(".cva-msg"); if (!m) return; m.className = "cva-msg " + (ok ? "good" : "bad"); m.textContent = t; m.hidden = !t }
function busy(el, on) { el.querySelectorAll("button,input").forEach(x => { if (!x.closest(".cva-top")) x.disabled = on }); el.classList.toggle("wait", on) }
const inApp = () => /FBAN|FBAV|Instagram|Snapchat|Line\/|; wv\)|Twitter|MicroMessenger/i.test(navigator.userAgent);

// ---------- auth sheet ----------
const LEGALLINE = (pre = "By continuing you confirm you are 18+ and agree to our") => `<p class="cva-legal">${pre} <button data-legal="terms">Terms</button> and <button data-legal="privacy">Privacy Policy</button>.</p>`;
const GBTN = `<button class="cva-btn cva-gb" data-a="google">${IC.g}<span>Continue with Google</span></button>`;
const TOP = `<div class="cva-top"><span class="cva-logo">CINEVAULT</span><button class="cva-x" data-a="close" aria-label="Close">${IC.x}</button></div>`;
const field = (label, name, type, ac, extra = "") => `<label class="cva-f"><span>${label}</span><input name="${name}" type="${type}" autocomplete="${ac}" ${extra}></label>`;
const pwField = (ac, label = "Password") => `<label class="cva-f"><span>${label}${ac === "current-password" ? '<button type="button" class="cva-lk" data-a="mode:forgot">Forgot?</button>' : ""}</span><div class="cva-pw"><input name="pw" type="password" autocomplete="${ac}" ${ac === "new-password" ? 'minlength="8" placeholder="At least 8 characters"' : ""} required><button type="button" class="cva-eye" data-a="eye" aria-label="Show password">${IC.eye}</button></div></label>`;

function authHTML(mode, reason) {
  if (mode === "prompt") return `${TOP}<div class="cva-ic">${IC.mark}</div><h3 class="cva-h">Keep your list safe</h3><p class="cva-s">Optional — takes a few seconds</p>
<p class="cva-p">Your list is saved on this phone. Sign in to back it up and open it on any device. Everything keeps working without an account.</p>
<div class="cva-msg" hidden></div>${GBTN}<button class="cva-btn cva-o" data-a="mode:signin">Continue with email</button>
<button class="cva-ghost" data-a="close">Not now</button><button class="cva-tiny" data-a="never">Don’t ask again</button>${LEGALLINE()}`;
  if (mode === "forgot") return `${TOP}<h3 class="cva-h">Reset password</h3><p class="cva-s">We’ll email you a reset link</p><div class="cva-msg" hidden></div>
<form class="cva-form" novalidate>${field("Email", "email", "email", "email", 'inputmode="email" required')}<button class="cva-btn" type="submit">Send reset link</button></form>
<button class="cva-ghost" data-a="mode:signin">Back to sign in</button>`;
  const up = mode === "signup";
  return `${TOP}<h3 class="cva-h">${up ? "Create account" : "Welcome back"}</h3><p class="cva-s">${esc(reason || (up ? "Free, optional, and yours to delete anytime" : "Sign in to your vault"))}</p>
<div class="cva-msg" hidden></div>${GBTN}<div class="cva-or"><i></i><span>or with email</span><i></i></div>
<form class="cva-form" novalidate>${up ? field("Name <small>(optional)</small>", "name", "text", "name", 'maxlength="60"') : ""}${field("Email", "email", "email", "email", 'inputmode="email" required')}${pwField(up ? "new-password" : "current-password")}
${up ? `<label class="cva-chk"><input type="checkbox" name="agree"><span>I am 18 or older and agree to the <button type="button" data-legal="terms">Terms</button> and <button type="button" data-legal="privacy">Privacy Policy</button>.</span></label>` : ""}
<button class="cva-btn" type="submit">${up ? "Create account" : "Sign in"}</button></form>
<p class="cva-sw">${up ? 'Already have an account? <button data-a="mode:signin">Sign in</button>' : 'New here? <button data-a="mode:signup">Create an account</button>'}</p>
<button class="cva-ghost" data-a="close">Not now — continue as guest</button>${up ? "" : LEGALLINE()}`;
}

function openAuth(mode = "signin", reason) {
  let el = stack.find(x => x.dataset.id === "auth");
  if (!el) {
    el = openOv("auth");
    el._prompt = mode === "prompt";
    el._onclose = () => { if (!user && el._prompt) bumpNag() };
    el.addEventListener("click", e => authClick(el, e));
    el.addEventListener("submit", e => { e.preventDefault(); submit(el, e.target) });
  }
  el.dataset.mode = mode;
  el.querySelector(".cva-box").innerHTML = authHTML(mode, reason);
  if (mode !== "prompt") setTimeout(() => { const f = el.querySelector("input"); f && !matchMedia("(pointer:coarse)").matches && f.focus() }, 60);
  ensureFb().catch(() => { });
}

function authClick(el, e) {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const a = b.dataset.a;
  if (a === "close") return closeOv(el);
  if (a === "never") { localStorage.setItem(NAG, JSON.stringify({ ...jget(NAG, {}), never: 1 })); el._prompt = false; return closeOv(el) }
  if (a === "google") return google(el);
  if (a === "eye") { const i = b.previousElementSibling, s = i.type === "password"; i.type = s ? "text" : "password"; b.innerHTML = s ? IC.eyeoff : IC.eye; return }
  if (a.startsWith("mode:")) { const keep = el._prompt; openAuth(a.slice(5)); el._prompt = keep }
}

function bumpNag() { const n = jget(NAG, {}); localStorage.setItem(NAG, JSON.stringify({ ...n, c: (n.c || 0) + 1, t: Date.now() })) }
function done(el, t) { closeOv(el); say(t) }

async function google(el) {
  if (inApp()) return msg(el, "Google sign-in doesn’t work inside this in-app browser. Open CineVault in Chrome, or use email.");
  msg(el, ""); busy(el, true);
  try {
    const { au } = await ensureFb(), p = new au.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    const r = await au.signInWithPopup(auth, p);
    el._prompt = false; done(el, "Welcome, " + (FIRST(r.user) || "cinephile"));
  } catch (e) {
    if (e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request")) { /* user cancelled */ } else msg(el, errText(e));
  } finally { busy(el, false) }
}

async function submit(el, form) {
  const mode = el.dataset.mode, f = new FormData(form), email = String(f.get("email") || "").trim(), pw = String(f.get("pw") || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return msg(el, "Enter a valid email address.");
  if (mode !== "forgot" && !pw) return msg(el, "Enter your password.");
  if (mode === "signup") {
    if (pw.length < 8) return msg(el, "Use at least 8 characters for your password.");
    if (!f.get("agree")) return msg(el, "Please confirm you’re 18+ and accept the Terms and Privacy Policy.");
  }
  msg(el, ""); busy(el, true);
  try {
    const { au } = await ensureFb();
    if (mode === "forgot") { await au.sendPasswordResetEmail(auth, email); msg(el, "If an account exists for that email, a reset link is on its way. Check spam too.", 1); return }
    if (mode === "signup") {
      const c = await au.createUserWithEmailAndPassword(auth, email, pw), nm = String(f.get("name") || "").trim().slice(0, 60);
      if (nm) { try { await au.updateProfile(c.user, { displayName: nm }); user = auth.currentUser; saveHint(); paintBtn() } catch { } }
      try { await au.sendEmailVerification(c.user) } catch { }
      el._prompt = false; done(el, "Account created — welcome" + (nm ? ", " + nm.split(" ")[0] : "") + "!");
    } else { await au.signInWithEmailAndPassword(auth, email, pw); el._prompt = false; done(el, "Signed in") }
  } catch (e) { msg(el, errText(e)) } finally { busy(el, false) }
}

// ---------- account sheet ----------
function accountHTML(confirmDel) {
  const h = hint() || {}, u = user || {}, name = u.displayName || h.n || "Cinephile", mail = u.email || "", ph = u.photoURL || h.p || "";
  const row = (a, ic, t, c = "") => `<button class="cva-row" data-a="${a}" style="--c:${c || "#9a958b"}"><i>${IC[ic]}</i><span>${t}</span></button>`;
  const pwUser = user && user.providerData.some(p => p.providerId === "password");
  const av = ph ? `<img alt="" referrerpolicy="no-referrer" src="${esc(ph)}">` : `<span>${initial()}</span>`;
  if (confirmDel) return `${TOP}<h3 class="cva-h">Delete account?</h3><p class="cva-s">This can’t be undone</p>
<p class="cva-p">Your account and your synced list will be permanently deleted. To confirm it’s you, ${pwUser ? "enter your password" : "you’ll be asked to sign in with Google again"}.</p><div class="cva-msg" hidden></div>
${pwUser ? `<label class="cva-f"><span>Password</span><input name="dpw" type="password" autocomplete="current-password"></label>` : ""}
<button class="cva-btn cva-danger" data-a="del-go">Delete my account</button><button class="cva-ghost" data-a="acct">Cancel</button>`;
  return `${TOP}<div class="cva-me"><div class="cva-av">${av}</div><h3 class="cva-h">${esc(name)}</h3>${mail ? `<p class="cva-mail">${esc(mail)}</p>` : ""}
<p class="cva-sync ${syncBad ? "bad" : ""}"><i></i>${!user ? (fbErr ? "Couldn’t reach sign-in service" : "Connecting…") : syncBad ? "Saved on this device · sync paused" : `Synced · ${count()} saved title${count() === 1 ? "" : "s"}`}</p></div>
<div class="cva-msg" hidden></div>
${row("list", "list", "My list", "#e0a030")}${row("export", "dl", "Export my data", "#5ad1ff")}${row("terms", "doc", "Terms of Use", "#b794f6")}${row("privacy", "shield", "Privacy Policy", "#6ee7a0")}${row("addons", "plug", "Extensions / Add-ons", "#7dd3fc")}
${row("out", "out", "Sign out", "#ffd166")}${row("del", "trash", "Delete account", "#ff7a7a")}`;
}

function openAccount() {
  let el = stack.find(x => x.dataset.id === "account");
  if (el) return;
  el = openOv("account");
  el.querySelector(".cva-box").innerHTML = accountHTML();
  el.addEventListener("click", e => acctClick(el, e));
  ensureFb().catch(() => { });
}
async function acctClick(el, e) {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const a = b.dataset.a, box = el.querySelector(".cva-box");
  if (a === "close") return closeOv(el);
  if (a === "list") { closeOv(el); setTimeout(() => typeof go === "function" && go("list"), 60); return }
  if (a === "terms" || a === "privacy") return openLegal(a);
  if (a === "addons") return AD.open();
  if (a === "export") return exportData();
  if (a === "acct") { box.innerHTML = accountHTML(); return }
  if (a === "del") { box.innerHTML = accountHTML(1); return }
  if (a === "out") return logout(el);
  if (a === "del-go") return delAccount(el);
}
function exportData() {
  const u = user || {}, data = { exportedAt: new Date().toISOString(), account: { uid: u.uid, email: u.email, name: u.displayName }, list: Object.values(readList()).filter(i => !isEmpty(i)).map(({ u: _u, ...r }) => r) };
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = "cinevault-data-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  say("Your data was downloaded");
}
async function logout(el) {
  busy(el, true);
  try {
    if (timer) { clearTimeout(timer); await flush() }
    const { au } = await ensureFb(), safe = !syncBad;
    await au.signOut(auth);
    if (safe) { try { localStorage.removeItem(LS) } catch { } changed() }
    try { localStorage.removeItem(HINT); } catch { }
    paintBtn();
    closeOv(el);
    say(safe ? "Signed out · list removed from this device" : "Signed out · couldn’t sync, list kept on this device");
  } catch (e) {
    try { localStorage.removeItem(HINT); } catch { }
    paintBtn();
    closeOv(el);
    say("Signed out");
  }
}
async function delAccount(el) {
  const pw = (el.querySelector("[name=dpw]") || {}).value || "";
  msg(el, ""); busy(el, true);
  try {
    const { au, fs } = await ensureFb(), u = auth.currentUser; if (!u) throw { code: "auth/requires-recent-login" };
    if (u.providerData.some(p => p.providerId === "password")) {
      if (!pw) { busy(el, false); return msg(el, "Enter your password to confirm.") }
      await au.reauthenticateWithCredential(u, au.EmailAuthProvider.credential(u.email, pw));
    } else { const p = new au.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); await au.reauthenticateWithPopup(u, p) }
    if (unsub) { unsub(); unsub = null } clearTimeout(timer); pending = null;
    const col = fs.collection(db, "users", u.uid, "list"), s = await fs.getDocs(col);
    await commit(col, s.docs.map(d => ["d", d.id]));
    try { const ac = fs.collection(db, "users", u.uid, "addons"), as = await fs.getDocs(ac); await commit(ac, as.docs.map(d => ["d", d.id])) } catch { } // saved add-ons go too
    await fs.deleteDoc(fs.doc(db, "users", u.uid));
    await au.deleteUser(u);
    try { localStorage.removeItem(LS); localStorage.removeItem(HINT) } catch { }
    changed(); closeOv(el); say("Account deleted");
  } catch (e) { busy(el, false); if (!(e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request"))) msg(el, errText(e)) }
}

// ---------- legal sheet ----------
function openLegal(tab = "privacy") {
  let el = stack.find(x => x.dataset.id === "legal");
  if (!el) {
    el = openOv("legal", "leg");
    el.addEventListener("click", e => {
      const t = e.target.closest("[data-t]"); if (t) return renderLegal(el, t.dataset.t);
      if (e.target.closest("[data-a=close]")) return closeOv(el);
      const l = e.target.closest("[data-legal]"); if (l) { e.preventDefault(); renderLegal(el, l.dataset.legal) }
    });
  }
  renderLegal(el, tab);
}
function renderLegal(el, tab) {
  const T = [["terms", "Terms"], ["privacy", "Privacy"], ["cookies", "Cookies"]];
  el.querySelector(".cva-box").innerHTML = `<div class="cva-lh"><div class="tabs">${T.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${n}</button>`).join("")}</div><button class="cva-x" data-a="close" aria-label="Close">${IC.x}</button></div><div class="cva-doc">${legalHTML(tab, SITE)}</div>`;
  el.querySelector(".cva-doc").scrollTop = 0;
}

// ---------- save nudge ----------
function afterSave() {
  if (user || hint()) return;
  const n = jget(NAG, {});
  if (n.never || (n.c || 0) >= 3 || (n.t && Date.now() - n.t < 3 * 864e5) || sessionStorage.getItem("cv_np")) return;
  try { sessionStorage.setItem("cv_np", "1") } catch { }
  setTimeout(() => { if (!user && !stack.length) openAuth("prompt") }, 1100);
}

// ---------- wiring ----------
document.addEventListener("click", e => {
  const l = e.target.closest("[data-legal]");
  if (l && !l.closest(".cva")) { e.preventDefault(); return openLegal(l.dataset.legal) }
  if (l && l.closest(".cva") && !l.closest(".cva.leg")) { e.preventDefault(); return openLegal(l.dataset.legal) }
  const a = e.target.closest(".cva-note [data-a=auth]"); if (a) openAuth("signin");
});
$("#acc") && ($("#acc").onclick = () => (user || hint()) ? openAccount() : openAuth("signin"));

const AD = initAddons({ esc, say, openOv, closeOv, TOP, hasHint: () => !!hint(), ready: ensureFb, state: () => ({ user, auth, db, fs: fb && fb.fs }) });
window.CVA = { streams: AD.streams, push, afterSave, back, listNote, open: () => ((user || hint()) ? openAccount() : openAuth("signin")) };
paintBtn(); listNote();

// Returning users: restore session quietly after first paint
if (hint()) {
  const go = () => ensureFb().catch(() => { });
  const run = () => ("requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 4000 }) : setTimeout(go, 2500));
  document.readyState === "complete" ? run() : addEventListener("load", run, { once: true });
}
