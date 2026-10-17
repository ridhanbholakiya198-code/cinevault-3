# CineVault login — Firebase setup (project invertible-gearbox-3mn89)

Console: https://console.firebase.google.com

1. Authentication → Sign-in method → enable **Google** and **Email/Password**.
2. Authentication → Settings → Authorized domains → add `cinevault-3.vercel.app`.
3. Firestore → database `ai-studio-28f0227c-7907-4687-8d78-ffc822b0c4d6` → Rules → paste `firebase/firestore.rules` → Publish.
4. `cv-config.js` → set contact email (shown in Terms/Privacy).

Troubleshooting: the sign-in message ends with a code in [brackets]; send that code to debug.
