import React from 'react';

export const metadata = {
  title: 'Terms of Use - CineVault',
};

const LEGAL_EMAIL = process.env.NEXT_PUBLIC_LEGAL_EMAIL || '';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-zinc-100">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 leading-relaxed">
        <h1 className="text-3xl font-bold text-white">Terms of Use</h1>
        <p className="mt-1 text-sm text-zinc-400">These terms apply when you use CineVault. They are effective from 23 October 2026.</p>

        <div className="my-6 rounded-lg border-l-4 border-amber-400 bg-amber-500/10 p-4 text-sm text-zinc-200">
          CineVault doesn’t host or store any video files. Add-ons are run by other people, and you are responsible for the ones you add and what you watch with them.
        </div>

        <section className="space-y-3 text-sm text-zinc-300">
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">1. What CineVault is</h2>
          <p>CineVault is a web app for finding films and series and playing what you are allowed to watch. It shows information about titles and lets you connect add-ons made by third parties.</p>
          <p>CineVault doesn’t host, store or upload video files.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">2. Add-ons</h2>
          <p>An add-on is a service run by someone else. You choose which ones to add to your account, and a new account has none. CineVault doesn’t provide, recommend or control any add-on.</p>
          <p>When you open a title, CineVault asks the add-ons you added for results and shows what they return. We don’t check that content in advance.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">3. Your responsibility</h2>
          <p>You are responsible for the add-ons you add and for what you watch with them. Only play content you have the right to watch, or that is legally free to use where you live.</p>
          <p>Don’t use CineVault to infringe anyone’s copyright or to break the law.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">4. Accounts</h2>
          <p>Give accurate details when you sign up and keep your login safe. We can suspend or close an account that breaks these terms, or that is reported more than once for infringement.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">5. Copyright notices</h2>
          <p>If you believe something reachable through CineVault infringes your rights, write to us with the work concerned, where you saw it, your contact details, and a statement that you are the owner or are authorised to act for the owner.</p>
          <p>We can remove an add-on from an account or suspend an account. We can’t delete files that sit on other people’s servers.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">6. No warranty</h2>
          <p>CineVault is provided as is. To the extent the law allows, we aren’t responsible for third-party add-ons, streams or services, or for any loss that comes from using them.</p>
          <h2 className="mt-6 border-b border-zinc-800 pb-1 text-lg font-semibold text-amber-400">7. Changes</h2>
          <p>We may update these terms. The version shown on this page is the one that applies when you use CineVault.</p>
          <p className="pt-2">
            Contact for notices and questions: 
            {LEGAL_EMAIL ? <a className="text-amber-400 underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> : 'set NEXT_PUBLIC_LEGAL_EMAIL'}
          </p>
        </section>
      </div>
    </main>
  );
}
