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

## PART 1.5 — DONE (Android pass)
- Lazy parallel rows (22 rows) + 30 min cache, smaller images on phone, skeleton loaders -> fast load
- Browse tab: Films/Series, genre, sort (popular/top/newest/box office) + infinite scroll; "See all" on every row
- Detail: "More like this" recommendations (TMDB recommendations + similar), tap to chain through titles
- Trailer click-to-play (no heavy iframe on open) + "Open on YouTube" fallback
- Android: bottom nav, safe-area, hardware Back closes modal/view, full-screen bottom-sheet detail, poster-based hero

## PART 1.6 — DONE
- Poster stretch bug fixed (img height attr), solid header on scroll, removed rows (Tamil, Korean, Hidden gems, Romance, Comedy)
- Hero = random hit films currently in cinemas (+ taste-based regional picks); phone: floating poster + blurred backdrop + accent glow, swipe to change
- On-device personalisation: views, list adds, searches -> "Because you viewed", "Picked for you", Indian/Hollywood/Anime rows re-ordered. Reset button in My list

## PART 1.7 — DONE
- Full-poster phone hero restored; See all = that exact section (infinite); every strip loads more on swipe
- Detail: category chip, status, tabs (Overview/Cast/Episodes/More like this), per-episode ratings, UPCOMING + next-episode countdown
- Upcoming films merged into Trending (date badge); shorter row names; new icon nav (folder = My list)

## PART 1.8 — DONE
- Detail redesigned like StreamPlay: top bar (back, bell=subscribe, heart=favourite, share, similar panel), bookmark -> "Set watch status" sheet, cast always visible, single scroll page
- Adaptive: phone = bottom sheets + bottom nav; desktop = poster+info layout, centered status dialog, right-side Similar drawer, row arrows, hover glow
- My list: underline tabs with counts + empty state

## PART 2-lite — DONE
- Desktop hero like Blade Runner reference: accent colour-grade, huge title, 01/06 counter, dots, up/down arrows, "Next up" card
- Phone hero: story-style progress dots; intro title card (once per session); nav Home/Movies/Series/Browse/My list

## PART 1.9 — DONE
- Wide backdrop + title logo (TMDB images) on detail and home hero; sticky top bar turns into backdrop+logo after scroll
- "Where to watch": official platforms per region (JustWatch via TMDB): Subscription / Rent / Buy / Free, region selector

## PART 2.1 — DONE (fix pass)
- Home hero rebuilt from scratch with new class names (no old override conflicts); same layout logic for phone + desktop
- Detail: full-screen on phone, fixed side padding, blank "similar" button removed, new Add-to-list button + status sheet with icons and toast
- Pinch-zoom disabled so layout can't shift sideways

## PART 3 — Smooth FX (final, kept only what looks good)
- Circular reveal: detail opens from the tapped spot (exact radius, eased), content rises in
- Rows rise into view on scroll; detail backdrop parallax on its own GPU layer, eased every frame
- Performance governor: weak phones get light mode automatically (?lite=1 forces it)
- Installable app (manifest + service worker): images cached, app files always fresh
- Removed: WebGL hero shader, card tilt, custom cursor
