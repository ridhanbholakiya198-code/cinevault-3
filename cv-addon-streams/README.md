# CVAddonStreams

Vanilla JS list of streams from a user-provided Stremio-protocol addon.

- Fetches `{addon}/stream/{movie|series}/{imdbId}[:season:episode].json`
- Renders results as buttons; direct HTTPS (mp4/HLS), YouTube and external links work
- Torrent / info-hash and magnet entries are active and forwarded to `CVPlayLink` on click
- No default addon, no proxy, no backend. The addon must allow browser access (CORS).

Files: `addon-streams.js` (component), `demo.html` (example), this README.
