/* CineVault — Stremio-protocol stream list (HTTPS/HLS, YouTube, Torrent/Magnet via CVPlayLink)
 * Takes a user-provided addon URL, fetches /stream/{type}/{imdbId}.json,
 * lists the results as buttons, plays direct/YouTube streams in a built-in player,
 * and forwards torrent/magnet streams to CVPlayLink.
 *
 * Usage:
 *   <div id="cv-addons"></div>
 *   <div id="cv-playlink"></div>
 *   <script src="addon-streams.js"></script>
 *   CVAddonStreams.mount('#cv-addons', { imdbId: 'tt0000000', type: 'movie' });
 */
(function (global) {
  'use strict';

  var HLS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
  var TIMEOUT_MS = 10000;
  var STORE_KEY = 'cv_addon_url';

  /* ---------- pure helpers (unit-tested) ---------- */

  function isHttps(v) {
    try { return new URL(v).protocol === 'https:'; } catch (e) { return false; }
  }

  function normalizeAddonUrl(raw) {
    var v = String(raw || '').trim();
    if (!v) return { error: 'Paste an addon URL.' };
    var u;
    try { u = new URL(v); } catch (e) { return { error: 'That isn’t a valid URL.' }; }
    if (u.protocol !== 'https:') return { error: 'Addon URLs must start with https://' };
    var path = u.pathname.replace(/\/manifest\.json$/i, '').replace(/\/+$/, '');
    return { base: u.origin + path };
  }

  function buildStreamUrl(base, type, imdbId, season, episode) {
    var t = type === 'series' ? 'series' : 'movie';
    var id = String(imdbId || '').trim();
    if (!/^tt\d{5,10}$/.test(id)) return { error: 'Invalid IMDb ID.' };
    if (t === 'series') {
      var s = parseInt(season, 10), e = parseInt(episode, 10);
      if (!(s >= 0 && e >= 1)) return { error: 'Series needs a season and episode.' };
      id += ':' + s + ':' + e;
    }
    return { url: base + '/stream/' + t + '/' + id + '.json' };
  }

  function classifyStream(s) {
    if (!s || typeof s !== 'object') return { kind: 'unsupported' };
    if (typeof s.magnet === 'string' && s.magnet.trim()) {
      return {
        kind: 'torrent',
        link: s.magnet.trim(),
        infoHash: s.infoHash ? String(s.infoHash).trim() : undefined
      };
    }
    if (typeof s.url === 'string') {
      var trimmedUrl = s.url.trim();
      if (/^magnet:/i.test(trimmedUrl)) {
        return {
          kind: 'torrent',
          link: trimmedUrl,
          infoHash: s.infoHash ? String(s.infoHash).trim() : undefined
        };
      }
      return isHttps(trimmedUrl) ? { kind: 'direct', url: trimmedUrl } : { kind: 'unsupported' };
    }
    if (typeof s.infoHash === 'string' && s.infoHash.trim()) {
      var hash = s.infoHash.trim();
      return { kind: 'torrent', link: hash, infoHash: hash };
    }
    if (typeof s.ytId === 'string' && /^[\w-]{11}$/.test(s.ytId)) return { kind: 'youtube', id: s.ytId };
    if (typeof s.externalUrl === 'string' && isHttps(s.externalUrl)) return { kind: 'external', url: s.externalUrl };
    return { kind: 'unsupported' };
  }

  function labelFor(s, i) {
    var parts = [];
    if (s && s.name) parts.push(String(s.name));
    if (s && (s.title || s.description)) parts.push(String(s.title || s.description));
    var t = parts.join(' — ').replace(/\s+/g, ' ').trim();
    return (t || 'Stream ' + (i + 1)).slice(0, 160);
  }

  /* ---------- network ---------- */

  function fetchStreams(url) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    return fetch(url, { signal: ctrl.signal })
      .then(function (r) {
        if (!r.ok) { var e = new Error('http'); e.status = r.status; throw e; }
        return r.json();
      })
      .then(function (j) {
        if (!j || !Array.isArray(j.streams)) throw new Error('shape');
        return j.streams;
      })
      .finally(function () { clearTimeout(timer); });
  }

  function explainError(err) {
    if (err && err.name === 'AbortError') return 'The addon took too long to respond.';
    if (err && err.message === 'http') return 'The addon returned an error (HTTP ' + err.status + ').';
    if (err && err.message === 'shape') return 'That URL didn’t return a Stremio-style stream list.';
    if (err instanceof TypeError) return 'The browser couldn’t reach the addon. It may be offline or may not allow browser access (CORS).';
    return 'Couldn’t load streams.';
  }

  var hlsPromise = null;
  function loadHls() {
    if (global.Hls) return Promise.resolve(global.Hls);
    if (hlsPromise) return hlsPromise;
    hlsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = HLS_SRC; s.async = true;
      s.onload = function () { resolve(global.Hls); };
      s.onerror = function () { hlsPromise = null; s.remove(); reject(new Error('hls')); };
      document.head.appendChild(s);
    });
    return hlsPromise;
  }

  /* ---------- UI ---------- */

  var CSS = [
    '.cvas{max-width:960px;margin:0 auto;padding:16px;color:var(--text,#eee);font-family:inherit}',
    '.cvas-form{display:flex;gap:8px}',
    '.cvas-input{flex:1;min-width:0;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;font:inherit}',
    '.cvas-btn{padding:12px 18px;border-radius:10px;border:0;background:var(--accent,#e5b05c);color:#111;font:inherit;font-weight:600;cursor:pointer}',
    '.cvas-input:focus-visible,.cvas-btn:focus-visible,.cvas-item:focus-visible{outline:2px solid var(--accent,#e5b05c);outline-offset:2px}',
    '.cvas-note{margin:10px 2px 0;font-size:.82rem;line-height:1.5;color:rgba(255,255,255,.6)}',
    '.cvas-status{margin:12px 2px 0;min-height:1.4em;font-size:.92rem}',
    '.cvas-status[data-kind="error"]{color:#ff8a80}',
    '.cvas-list{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}',
    '.cvas-item{display:block;width:100%;text-align:left;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:inherit;font:inherit;cursor:pointer;white-space:pre-line}',
    '.cvas-item[aria-current="true"]{border-color:var(--accent,#e5b05c)}',
    '.cvas-item:disabled{opacity:.5;cursor:not-allowed}',
    '.cvas-sub{display:block;margin-top:4px;font-size:.78rem;color:rgba(255,255,255,.55)}',
    '.cvas-stage{margin-top:12px;border-radius:12px;overflow:hidden;background:#000}',
    '.cvas-stage[hidden]{display:none}',
    '.cvas-stage video,.cvas-stage iframe{display:block;width:100%;aspect-ratio:16/9;border:0;background:#000}',
    '@media (max-width:520px){.cvas-form{flex-direction:column}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('cvas-styles')) return;
    var st = document.createElement('style');
    st.id = 'cvas-styles';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function mount(target, opts) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return null;
    opts = opts || {};
    injectStyles();

    root.classList.add('cvas');
    root.innerHTML =
      '<form class="cvas-form" novalidate>' +
        '<input class="cvas-input" type="url" inputmode="url" autocomplete="off" spellcheck="false" ' +
          'aria-label="Addon URL" placeholder="Addon URL (https://…/manifest.json)">' +
        '<button class="cvas-btn" type="submit">Load streams</button>' +
      '</form>' +
      '<p class="cvas-note">You provide the addon. CineVault doesn’t include, host or index any sources. Direct HTTPS/HLS, YouTube, and torrent/magnet streams are supported.</p>' +
      '<div class="cvas-status" role="status" aria-live="polite"></div>' +
      '<ul class="cvas-list"></ul>' +
      '<div class="cvas-stage" hidden></div>';

    var form = root.querySelector('form');
    var input = root.querySelector('.cvas-input');
    var statusEl = root.querySelector('.cvas-status');
    var list = root.querySelector('.cvas-list');
    var stage = root.querySelector('.cvas-stage');
    var current = { imdbId: opts.imdbId, type: opts.type || 'movie', season: opts.season, episode: opts.episode };
    var hls = null;
    var reqId = 0;

    try { input.value = opts.addonUrl || localStorage.getItem(STORE_KEY) || ''; } catch (e) { input.value = opts.addonUrl || ''; }

    function status(kind, text) { statusEl.dataset.kind = kind || ''; statusEl.textContent = text || ''; }

    function stopPlayer() {
      if (hls) { hls.destroy(); hls = null; }
      stage.textContent = '';
      stage.hidden = true;
    }

    function playError() {
      status('error', 'This stream couldn’t be played. The source may block browsers, or the format (for example MKV) may be unsupported.');
    }

    function playDirect(url) {
      stopPlayer();
      status('', '');
      var v = document.createElement('video');
      v.controls = true; v.playsInline = true; v.preload = 'metadata';
      v.addEventListener('error', playError);
      stage.appendChild(v);
      stage.hidden = false;

      if (/\.m3u8(\?|#|$)/i.test(url) && !v.canPlayType('application/vnd.apple.mpegurl')) {
        loadHls().then(function (Hls) {
          if (!Hls || !Hls.isSupported()) return playError();
          hls = new Hls();
          hls.on(Hls.Events.ERROR, function (_e, d) { if (d && d.fatal) playError(); });
          hls.loadSource(url);
          hls.attachMedia(v);
          v.play().catch(function () {});
        }).catch(playError);
      } else {
        v.src = url;
        v.play().catch(function () {});
      }
    }

    function playYoutube(id) {
      stopPlayer();
      status('', '');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id;
      f.allow = 'fullscreen; picture-in-picture; encrypted-media';
      f.allowFullscreen = true;
      f.title = 'YouTube player';
      stage.appendChild(f);
      stage.hidden = false;
    }

    function playTorrent(value, stream) {
      stopPlayer();
      status('', '');
      if (typeof opts.onPlayLink === 'function') {
        opts.onPlayLink(value, stream);
        return;
      }
      var playLinkTarget = opts.playLinkTarget || '#cv-playlink';
      if (global.CVPlayLink && typeof global.CVPlayLink.mount === 'function') {
        global.CVPlayLink.mount(playLinkTarget, {
          link: value,
          autoLoad: true,
          autoPlay: true,
          stream: stream
        });
      } else if (global.CVPlayLink && typeof global.CVPlayLink.play === 'function') {
        global.CVPlayLink.play(value, stream);
      } else if (global.CVPlayLink && typeof global.CVPlayLink.load === 'function') {
        global.CVPlayLink.load({ link: value, stream: stream });
      } else {
        status('error', 'CVPlayLink component is not available.');
      }
    }

    function addItem(stream, i) {
      var c = classifyStream(stream);
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cvas-item';
      b.textContent = labelFor(stream, i);

      if (c.kind === 'direct' || c.kind === 'youtube' || c.kind === 'external' || c.kind === 'torrent') {
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(list.querySelectorAll('.cvas-item'), function (x) { x.removeAttribute('aria-current'); });
          b.setAttribute('aria-current', 'true');
          if (c.kind === 'direct') playDirect(c.url);
          else if (c.kind === 'youtube') playYoutube(c.id);
          else if (c.kind === 'torrent') playTorrent(c.link, stream);
          else window.open(c.url, '_blank', 'noopener,noreferrer');
        });
      } else {
        b.disabled = true;
        var sub = document.createElement('span');
        sub.className = 'cvas-sub';
        sub.textContent = 'Unsupported stream type';
        b.appendChild(sub);
      }
      li.appendChild(b);
      list.appendChild(li);
    }

    function load(next) {
      if (next) current = Object.assign({}, current, next);
      list.textContent = '';
      stopPlayer();

      var addon = normalizeAddonUrl(input.value);
      if (addon.error) return status('error', addon.error);
      var built = buildStreamUrl(addon.base, current.type, current.imdbId, current.season, current.episode);
      if (built.error) return status('error', built.error);

      try { localStorage.setItem(STORE_KEY, input.value.trim()); } catch (e) { /* storage unavailable */ }

      var my = ++reqId;
      status('', 'Loading streams…');
      fetchStreams(built.url).then(function (streams) {
        if (my !== reqId) return;
        if (!streams.length) return status('', 'This addon has no streams for this title.');
        status('', streams.length + (streams.length === 1 ? ' stream found.' : ' streams found.'));
        streams.forEach(addItem);
      }).catch(function (err) {
        if (my !== reqId) return;
        status('error', explainError(err));
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); load(); });
    if (opts.autoLoad && input.value) load();

    return { load: load, stop: stopPlayer };
  }

  var api = {
    mount: mount,
    normalizeAddonUrl: normalizeAddonUrl,
    buildStreamUrl: buildStreamUrl,
    classifyStream: classifyStream,
    labelFor: labelFor
  };
  global.CVAddonStreams = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);