# CineVault Login & Cloud Sync — Firebase Setup Guide

Firebase project and Firestore database have been migrated to your logged-in Google account in AI Studio.

**Firebase Console**: [https://console.firebase.google.com](https://console.firebase.google.com)  
**Project ID**: `invertible-gearbox-3mn89`  
**Database ID**: `ai-studio-28f0227c-7907-4687-8d78-ffc822b0c4d6`

---

## 1. Authentication Configuration

Go to **Authentication** in the Firebase Console for project `invertible-gearbox-3mn89`:

1. **Sign-in method**:
   - Enable **Google** (turn on and provide project support email).
   - Enable **Email/Password** (Email/Password toggle: Enabled, Email link: optional).

2. **Authorized Domains**:
   - Go to **Authentication** → **Settings** → **Authorized domains**.
   - Click **Add domain** and enter:
     - `cinevault-3.vercel.app`
     - *(Your local and Vercel domains must be listed here, otherwise Firebase login fails with `auth/unauthorized-domain`)*.

---

## 2. Firestore Database & Security Rules

- **Database**: `ai-studio-28f0227c-7907-4687-8d78-ffc822b0c4d6` (Enterprise / Standard instance).
- **Rules Status**: The security rules in `firebase/firestore.rules` have already been compiled and deployed directly to your database.
- **Reference Copy**: The active rules are stored in `firebase/firestore.rules` and `firestore.rules`.

### Active Rule Definitions
- Supports all watchlist statuses: `''`, `'Watching'`, `'Completed'`, `'On-Hold'`, `'Dropped'`, `'Plan to Watch'`.
- Schema fields: `id`, `type`, `title`, `poster`, `lang`, `genres`, `status`, `fav`, `sub`, `u`.
- User data isolation: Strict `request.auth.uid == uid` ownership verification on `/users/{uid}` and `/users/{uid}/list/{key}`.

---

## 3. Client Configuration (`cv-config.js`)

`cv-config.js` has already been updated with your new credentials:
```javascript
window.CV_FIREBASE = {
  apiKey: "AIzaSyCq4kAsCfJm-kMJsDncyolFfas_Mv-ml0E",
  authDomain: "invertible-gearbox-3mn89.firebaseapp.com",
  projectId: "invertible-gearbox-3mn89",
  appId: "1:288721337113:web:0541b2878397367c022388",
  storageBucket: "invertible-gearbox-3mn89.firebasestorage.app",
  messagingSenderId: "288721337113",
  firestoreDatabaseId: "ai-studio-28f0227c-7907-4687-8d78-ffc822b0c4d6"
};
```

---

## 4. Legal / Contact Info

In `cv-config.js`, update `window.CV_SITE.email` with your contact email before sharing publicly (used in Terms & Privacy sheets).
