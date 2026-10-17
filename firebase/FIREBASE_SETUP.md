# CineVault login — one-time Firebase setup (5 min)

Console: https://console.firebase.google.com  → project `gen-lang-client-0730412571`

1. Authentication → Sign-in method → enable **Google** and **Email/Password**.
2. Authentication → Settings → **Authorized domains** → Add `cinevault-3.vercel.app` (without this, login gives "unauthorized-domain").
3. Firestore Database → select database `ai-studio-see-cddceeb2-b470-4b97-bd3a-47ccd5424b73` → **Rules** → paste `firebase/firestore.rules` → Publish.
   (Old AI Studio rules use different status names, so they MUST be replaced or sync will be blocked.)
4. Edit `cv-config.js` → set your contact email (shown in Terms/Privacy).
