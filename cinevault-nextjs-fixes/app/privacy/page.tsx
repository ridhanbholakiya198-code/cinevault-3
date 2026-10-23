import React from 'react';

export const metadata = {
  title: 'Privacy Policy - CineVault',
};

const LEGAL_EMAIL = process.env.NEXT_PUBLIC_LEGAL_EMAIL || '';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-zinc-100">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 leading-relaxed">
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-1 text-sm text-zinc-400">This policy explains what CineVault collects and why. It is effective from 23 October 2026.</p>

        <div className="my-6 rounded-lg border-l-4 border-amber-400 bg-amber-500/10 p-4 text-sm text-zinc-200">
          CineVault doesn’t keep a history of what you watch. Browsing without an account collects no personal account data.
        </div>

        <section className="space-y-3 text-sm text-zinc-300">
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">1. What we collect</h2>
          <p>Account: your email address and sign-in details are handled by Firebase Authentication. We never see your password.</p>
          <p>Add-ons: the add-on URLs you save are stored in your account in Cloud Firestore, and only you can read them. Some add-on URLs contain personal settings, so treat them as private.</p>
          <p>Our hosting provider may keep standard server logs, such as IP address and requested page, for security and reliability.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">2. Third parties</h2>
          <p>Your browser talks to services outside CineVault: the add-ons you add, video players such as YouTube or Webtor, and Firebase. They receive your IP address and the request they are asked to handle, such as a title ID, and they follow their own privacy policies.</p>
          <p>Check what an add-on does before you add it.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">3. How we use data</h2>
          <p>We use your data to sign you in and to load the add-ons you saved. We don’t sell it.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">4. Your choices</h2>
          <p>You can remove any saved add-on from the add-on list at any time. To access, export or delete your account and its data, contact us and we will handle the request.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">5. Changes</h2>
          <p>We may update this policy. The version shown on this page is the current one.</p>
          <p className="pt-2">
            Contact for privacy requests: 
            {LEGAL_EMAIL ? <a className="text-amber-400 underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> : 'set NEXT_PUBLIC_LEGAL_EMAIL'}
          </p>
        </section>
      </div>
    </main>
  );
}
