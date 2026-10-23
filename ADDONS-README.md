# CineVault add-ons patch

Unzip over your repo (same paths). Changed/new files:
- addons.js            (new)
- auth.js              (Add-ons row in account sheet, wiring, delete-account cleanup)
- app.js               (#wa container + streams call on the details page)
- legal.js             (one privacy bullet about user-chosen add-ons)
- firebase/firestore.rules  (adds users/{uid}/addons rules)

IMPORTANT: pushing to GitHub does NOT update Firestore rules.
Open Firebase console -> Firestore -> Rules, paste firebase/firestore.rules, Publish.
Without this, saving an add-on shows a "rules" error.

Then: git add . && git commit -m "add-ons" && git push  (Vercel deploys).
