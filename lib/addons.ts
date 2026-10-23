import {
  collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe,
} from 'firebase/firestore';
// Adjust this import to wherever you export your initialised Firebase `auth` and `db`.
import { auth, db } from '@/lib/firebase';

export type AddonDoc = { id: string; name?: string; manifestUrl: string; baseUrl: string };
export type ManifestResource = string | { name: string; types?: string[]; idPrefixes?: string[] };
export type Manifest = {
  id: string; name: string; description?: string; version?: string;
  resources: ManifestResource[]; types?: string[]; idPrefixes?: string[];
};

/** Accepts https://host/.../manifest.json or stremio://host/.../manifest.json (what "Install" links use). */
export function normalizeManifestUrl(input: string): string {
  const raw = input.trim().replace(/^stremio:\/\//i, 'https://');
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('That is not a valid URL.'); }
  if (url.protocol !== 'https:') throw new Error('Only https:// add-on URLs are supported.');
  if (!url.pathname.endsWith('/manifest.json')) throw new Error('The URL must end with /manifest.json');
  if (url.search || url.hash) throw new Error('Remove everything after manifest.json (the ? or # part).');
  const out = url.toString();
  if (out.length > 500) throw new Error('That URL is too long.');
  return out;
}

export const baseUrlOf = (manifestUrl: string) => manifestUrl.replace(/\/manifest\.json$/, '');

export function resourceNames(m: Manifest): string[] {
  return Array.from(new Set((m.resources || []).map((r) => (typeof r === 'string' ? r : r.name))));
}

async function fetchJson(url: string, ms = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`The add-on answered with HTTP ${res.status}.`);
    return await res.json();
  } finally { clearTimeout(t); }
}

export async function fetchManifest(manifestUrl: string): Promise<Manifest> {
  let m: any;
  try { m = await fetchJson(manifestUrl); }
  catch (e: any) { throw new Error(e?.name === 'AbortError' ? 'The add-on took too long to answer.' : (e?.message || 'Could not reach the add-on.')); }
  if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || !Array.isArray(m.resources)) {
    throw new Error('That URL did not return a valid add-on manifest.');
  }
  return m as Manifest;
}

// Deterministic doc id, so adding the same URL twice does not create a duplicate.
async function addonId(manifestUrl: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(manifestUrl));
  return Array.from(new Uint8Array(buf)).slice(0, 10).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Saves to users/{uid}/addons/{id}. Only the fields your Firestore rules allow are written. */
export async function saveAddon(input: string): Promise<Manifest> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in first to save add-ons.');
  const manifestUrl = normalizeManifestUrl(input);
  const manifest = await fetchManifest(manifestUrl);
  const id = await addonId(manifestUrl);
  await setDoc(doc(db, 'users', uid, 'addons', id), {
    name: manifest.name.slice(0, 200),
    manifestUrl,
    baseUrl: baseUrlOf(manifestUrl),
    createdAt: serverTimestamp(),
  });
  return manifest;
}

export async function removeAddon(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in first.');
  await deleteDoc(doc(db, 'users', uid, 'addons', id));
}

export function listenAddons(uid: string, cb: (a: AddonDoc[]) => void, onErr?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', uid, 'addons'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AddonDoc, 'id'>) }))),
    (e) => onErr?.(e),
  );
}
