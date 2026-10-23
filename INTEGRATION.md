# Add-ons UI: how to wire it in

1. Copy `lib/addons.ts`, `components/AddonManager.tsx`, `components/AddonLinks.tsx` into your Next.js app.
   In all three, fix the `@/lib/firebase` import so it points to where you export `auth` and `db`.

2. Profile modal (right under the Privacy Policy link):

```tsx
import { useState } from 'react';
import AddonManager from '@/components/AddonManager';

// inside your profile modal component
const [addonsOpen, setAddonsOpen] = useState(false);

<Link href="/privacy" className="...">Privacy Policy</Link>
<button type="button" onClick={() => setAddonsOpen(true)} className="...same classes as the other menu rows...">
  Extensions / Add-ons
</button>
<AddonManager open={addonsOpen} onClose={() => setAddonsOpen(false)} />
```

3. Movie page, inside the "Where to Watch" section:

```tsx
import AddonLinks from '@/components/AddonLinks';
<AddonLinks imdbId={imdbId} type="movie" />
// series episode: <AddonLinks imdbId={imdbId} type="series" season={1} episode={2} />
```

Notes
- The saved fields are exactly name / manifestUrl / baseUrl / createdAt, which matches `okAddon()` in your firestore.rules.
- Add-ons are called straight from the browser (no proxy), so an add-on must send CORS headers; most do.
- Manifest URLs with `?query` are rejected on purpose: your rules require the URL to end in `/manifest.json`.
- I could not run `next build` here (no network), so run it once and adjust the Firebase import path.
