'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; // adjust to your Firebase export

type Link = { key: string; label: string; href: string; addon: string };

const safeHttp = (u: unknown): string | null => {
  if (typeof u !== 'string') return null;
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString() : null; } catch { return null; }
};

/**
 * Put this inside your "Where to Watch" section.
 * It asks each of the user's saved add-ons about this title and shows the answers that are plain
 * links to another site (externalUrl) or a YouTube video (ytId). Anything else an add-on returns is ignored.
 */
export default function AddonLinks({ imdbId, type = 'movie', season, episode }: {
  imdbId: string; type?: 'movie' | 'series'; season?: number; episode?: number;
}) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const off = onAuthStateChanged(auth, async (u) => {
      if (!u) { if (alive) setLinks([]); return; }
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users', u.uid, 'addons'));
        const id = type === 'series' && season && episode ? `${imdbId}:${season}:${episode}` : imdbId;
        const results = await Promise.all(snap.docs.map(async (d) => {
          const { name, baseUrl } = d.data() as { name?: string; baseUrl: string };
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 8000);
          try {
            const res = await fetch(`${baseUrl}/stream/${type}/${encodeURIComponent(id)}.json`, { signal: ctrl.signal });
            if (!res.ok) return [] as Link[];
            const json = await res.json();
            const out: Link[] = [];
            (Array.isArray(json?.streams) ? json.streams : []).forEach((s: any, i: number) => {
              const label = String(s?.title || s?.name || name || 'Open').split('\n')[0].slice(0, 80);
              const ext = safeHttp(s?.externalUrl);
              if (ext) out.push({ key: `${d.id}-${i}`, label, href: ext, addon: name || 'Add-on' });
              else if (typeof s?.ytId === 'string' && /^[\w-]{11}$/.test(s.ytId)) out.push({ key: `${d.id}-${i}`, label, href: `https://www.youtube.com/watch?v=${s.ytId}`, addon: name || 'Add-on' });
            });
            return out;
          } catch { return [] as Link[]; } finally { clearTimeout(t); }
        }));
        if (alive) setLinks(results.flat());
      } finally { if (alive) setLoading(false); }
    });
    return () => { alive = false; off(); };
  }, [imdbId, type, season, episode]);

  if (!loading && links.length === 0) return null;
  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">From your add-ons</h4>
      {loading && <p className="mt-2 text-sm text-zinc-500">Checking your add-ons…</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {links.map((l) => (
          <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer"
             className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:border-amber-400">
            <span className="block max-w-[16rem] truncate">{l.label}</span>
            <span className="block text-xs text-zinc-500">{l.addon}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
