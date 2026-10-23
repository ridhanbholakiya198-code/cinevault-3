'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // adjust to your Firebase export
import { listenAddons, removeAddon, resourceNames, saveAddon, type AddonDoc, type Manifest } from '@/lib/addons';

export default function AddonManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [uid, setUid] = useState<string | null>(null);
  const [addons, setAddons] = useState<AddonDoc[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Manifest | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null)), []);
  useEffect(() => {
    if (!open || !uid) { setAddons([]); return; }
    return listenAddons(uid, setAddons, (e) => setError(e.message));
  }, [open, uid]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setAdded(null); setBusy(true);
    try { setAdded(await saveAddon(url)); setUrl(''); }
    catch (err: any) { setError(err?.message || 'Could not add that add-on.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Extensions and add-ons">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Extensions / Add-ons</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md px-2 py-1 text-zinc-400 hover:text-zinc-100">✕</button>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          CineVault comes with no add-ons. Paste the manifest URL of an add-on you chose yourself. Only add services you trust and are allowed to use.
        </p>

        {!uid ? (
          <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">Sign in to save add-ons to your account.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              placeholder="https://example.com/manifest.json" aria-label="Add-on manifest URL"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
            />
            <button type="submit" disabled={busy || !url.trim()} className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50">
              {busy ? 'Checking…' : 'Add'}
            </button>
          </form>
        )}

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {added && <p className="mt-2 text-sm text-emerald-400">Added “{added.name}” · provides: {resourceNames(added).join(', ') || 'nothing'}</p>}

        <h3 className="mt-6 text-sm font-semibold text-zinc-300">Your add-ons</h3>
        {addons.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">None yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {addons.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.name || 'Add-on'}</div>
                  {/* The URL can contain private settings, so only the host is shown. */}
                  <div className="truncate text-xs text-zinc-500">{(() => { try { return new URL(a.manifestUrl).host; } catch { return ''; } })()}</div>
                </div>
                <button onClick={() => removeAddon(a.id).catch((e) => setError(e.message))} className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-red-400 hover:text-red-300">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
