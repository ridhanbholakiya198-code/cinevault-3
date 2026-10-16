# CINEVAULT — Roadmap (kya ho gaya, kya baaki)

## Setup
1. https://www.themoviedb.org/settings/api se free API key lo -> `config.js` me paste karo.
2. `index.html` double-click, ya better: `npx serve .` / VS Code Live Server.

## PART 1 — DONE (is zip me)
- TMDB live data: worldwide trending hero (auto-rotate), 7 home rows, multi-search
- Detail: YouTube trailer (autoplay), rating, budget, box office, runtime, cast (character + real actor name)
- Per-film dynamic colour from poster (accent + modal glow)
- Hero camera effects: slow push-in, mouse parallax/tilt, scroll parallax; film grain overlay
- Watchlist: Watching / Completed / On-Hold / Dropped / Plan to Watch / Favourites / Subscribed (localStorage)
- Fonts: Bebas Neue (titles), Cormorant Garamond italic (taglines), DM Sans (body)

## PART 2 — Cinematic polish (next session)
- Page transitions (hero -> detail as full page `#/movie/ID`, shared-element zoom)
- Letterbox bars + title-card intro on load; custom cursor
- Backdrop gallery + posters + logos tab; similar/recommended row
- Skeleton loaders; poster-colour ambient glow on cards on hover
- Three.js / GSAP + Lenis smooth scroll (Active Theory feel); album-cover style 3D poster flip

## PART 3 — Features
- Where to watch (/watch/providers by region), age certificate, keywords/genres browse
- Filters: genre, year, country, language; Top 250 page; person page (actor filmography)
- Series: season/episode list with episode ratings; IMDb/RT ratings via OMDb API (second key)
- Share card, keyboard shortcuts, PWA install

## PART 4 — Firebase
- Replace `store.get/set` in app.js with Firestore: `users/{uid}/list/{type_id}`
- Firebase Auth (Google + email), sync on login, merge localStorage on first login

## PART 5 — Production
- Vite + React/Next migration (optional), code-split, image optimisation, Lighthouse > 90, deploy Vercel/Netlify
- Reference photos/screens jo tum doge: palette + layout tokens yahan add karna
