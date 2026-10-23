# CineVault — Next.js module

Separate Next.js app (do not drop over the vanilla CineVault site). Routes: `/`, `/movies/[imdbId]`, `/tos`, `/privacy`.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Firebase values and `NEXT_PUBLIC_LEGAL_EMAIL`
3. `npm run dev`

## Firestore rules
`firestore.rules` is the original CineVault rules (`users/{uid}`, `users/{uid}/list/*`) merged with `users/{uid}/addons/*`.
Deploy this file as a whole; do not replace it with a file that only has the addons block.

## Static legal pages
`public/tos.html` and `public/privacy.html` contain the placeholder `YOUR-LEGAL-EMAIL`. Replace it before publishing.

## Removed
`workers/cors-proxy.js` (see DELETE.txt).
