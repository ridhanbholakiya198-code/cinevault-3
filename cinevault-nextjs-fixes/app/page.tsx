'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = value.trim();
    if (!/^tt\d{5,10}$/.test(id)) {
      setError('Enter an IMDb ID like tt0133093.');
      return;
    }
    setError(null);
    router.push(`/movies/${id}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-zinc-100">
      <h1 className="text-2xl font-bold tracking-tight">CineVault</h1>
      <p className="mt-1 text-sm text-zinc-400">Open a title by its IMDb ID.</p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="tt0133093"
          aria-label="IMDb ID"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Open
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </main>
  );
}
