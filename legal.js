// Parda — Terms of Use, Privacy Policy, Cookie & storage notice.
// Plain-language templates written for this app's real behaviour. Not legal advice: have a lawyer review before commercial use.
const e = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function legalHTML(tab, S) {
  S = S || {};
  const owner = e(S.owner || "the Parda developer");
  const mail = S.email ? `<a href="mailto:${e(S.email)}">${e(S.email)}</a>` : "the contact details published on this site";
  const head = (t) => `<h1>${t}</h1><p class="m">Effective ${e(S.effective || "")} · Version ${e(S.version || "1.0")} · Operated by ${owner}</p>`;
  const law = e(S.jurisdiction || "India");

  if (tab === "terms") return head("Terms of Use") + `
<h2>1. Agreement</h2>
<p>By using Parda (the “Service”) or creating an account, you agree to these Terms and to our <a href="#" data-legal="privacy">Privacy Policy</a>. If you do not agree, please do not use the Service.</p>
<h2>2. What Parda is</h2>
<p>Parda is a film and series discovery guide. We show information, posters, cast and trailers so you can decide what to watch, and let you keep a personal watch list. <b>We do not host, stream, sell or distribute any film or series.</b> Trailers are played from YouTube. “Where to watch” links point to third-party services that we do not own or control.</p>
<h2>3. Accounts (optional)</h2>
<ul><li>You can use Parda without an account. An account is only needed to back up and sync your list across devices.</li>
<li>You must be <b>18 or older</b> to create an account.</li>
<li>Give accurate details and keep your password safe. You are responsible for activity on your account.</li>
<li>You can delete your account at any time from the Account menu.</li></ul>
<h2>4. Your list and your data</h2>
<p>Your watch list, statuses and favourites belong to you. You allow us to store and process them only to run the Service for you (for example to sync between your devices). We do not sell your data.</p>
<h2>5. Acceptable use</h2>
<p>Do not: scrape or bulk-download the Service; overload or attack it or its API; try to access other people’s accounts or data; reverse-engineer it to extract data; use it for anything unlawful; or impersonate others.</p>
<h2>6. Third-party content and ownership</h2>
<p>Titles, posters, artwork, trailers, names and descriptions belong to their respective owners. Film and series data and images are provided by TMDB. <i>This product uses the TMDB API but is not endorsed or certified by TMDB.</i> Streaming availability is provided by JustWatch. The Parda name, design and code belong to ${owner}. If you believe content on the Service infringes your rights, contact us at ${mail} and we will review it promptly.</p>
<h2>7. Accuracy</h2>
<p>Ratings, release dates, runtimes, box-office figures and availability come from third parties and can be wrong or change without notice.</p>
<h2>8. Availability and changes</h2>
<p>The Service is provided free of charge and may change, pause or stop at any time. We do not promise uninterrupted or error-free operation.</p>
<h2>9. Disclaimer</h2>
<p>To the fullest extent permitted by law, the Service is provided “as is” and “as available”, without warranties of any kind.</p>
<h2>10. Limitation of liability</h2>
<p>To the fullest extent permitted by law, ${owner} is not liable for indirect, incidental or consequential loss arising from your use of the Service. Because the Service is free, any liability is limited to the amount you paid us, which is zero. Nothing here limits rights you have under law that cannot be excluded.</p>
<h2>11. Suspension and termination</h2>
<p>We may suspend or remove accounts that break these Terms or harm the Service. You may stop using the Service and delete your account at any time.</p>
<h2>12. Changes to these Terms</h2>
<p>We may update these Terms. The version and date above show the latest one. If a change is material we will tell you in the app. Continuing to use the Service after a change means you accept it.</p>
<h2>13. Governing law</h2>
<p>These Terms are governed by the laws of ${law}, and the courts of ${law} have jurisdiction, subject to any mandatory consumer rights you have where you live.</p>
<h2>14. Contact</h2>
<p>Questions or complaints: ${mail}.</p>`;

  if (tab === "cookies") return head("Cookies &amp; Local Storage") + `
<p>Parda does <b>not</b> use advertising cookies, trackers or analytics. We only use browser storage that the app needs to work, so no cookie-consent banner is shown. If that ever changes, we will ask you first.</p>
<h2>What is stored on your device</h2>
<ul>
<li><b>cv_list</b> — your watch list (statuses, favourites, alerts). Removed when you sign out of an account, or when you clear site data.</li>
<li><b>cv_taste</b> — on-device personalisation (languages and genres you open or search). Never uploaded. Reset it anytime from My list.</li>
<li><b>cv_reg</b> — the streaming region you picked for “Where to watch”.</li>
<li><b>c:…</b> — a 30-minute cache of film data so pages load faster.</li>
<li><b>cv_u</b> — remembers that you are signed in (your name and photo) so the app can restore your session quickly.</li>
<li><b>cv_nag</b> — remembers that you dismissed the optional sign-in suggestion, so we do not keep asking.</li>
<li><b>cv_i, cv_np</b> (session only) — intro animation and prompt already shown this visit.</li>
<li><b>Firebase Authentication</b> — keeps your sign-in session in the browser’s IndexedDB until you sign out.</li>
</ul>
<h2>Third parties</h2>
<p>When you tap “Play trailer”, a YouTube player (privacy-enhanced mode) loads and Google/YouTube may set its own cookies. Nothing from YouTube loads before you tap play.</p>
<h2>Your control</h2>
<p>Clear site data in your browser settings at any time, or sign out from the Account menu to remove your list from the device.</p>`;

  return head("Privacy Policy") + `
<h2>1. About this policy</h2>
<p>This explains what data Parda handles, why, and your choices. We follow India’s <b>Digital Personal Data Protection Act, 2023</b> and, for visitors in the EU/UK, apply GDPR-style rights. ${owner} is the data fiduciary / controller.</p>
<h2>2. What we collect</h2>
<p><b>If you browse without an account (guest):</b> we do not create a profile of you. Your list, personalisation and region choice are stored only on your device. Our hosting provider logs standard technical data (IP address, browser, pages requested) to deliver and secure the site.</p>
<p><b>If you create an account:</b></p>
<ul>
<li><b>Firebase Authentication</b> holds your email, display name, profile photo link (if you use Google), sign-in method and a unique user ID. Passwords are handled by Firebase; we never see them.</li>
<li><b>Add-ons you choose</b> — if you add a Stremio-compatible add-on, its web address is saved to your account. When you open a film, your browser asks that add-on (not Parda) for matching links, sending the film’s IMDb ID. Parda includes no add-ons and does not host or index any sources.</li>
<li><b>Our database</b> holds your list entries (title ID, type, title, poster path, language, genre IDs, status, favourite and alert flags, last-updated time) and the version and time you accepted these Terms and this Policy.</li>
</ul>
<p><b>We do not collect:</b> payment details, GPS location, contacts, advertising IDs, or analytics. We show no third-party ads and we do not sell personal data.</p>
<h2>3. Personalisation</h2>
<p>Recommendations such as “Picked for you” are computed <b>on your device</b> from titles you open or search. This profile is never uploaded. You can reset it from My list.</p>
<h2>4. Why we use data</h2>
<p>To provide the Service you asked for (sign-in, saving and syncing your list), to keep it secure, and to meet legal duties. Account creation is based on your consent, which you can withdraw by deleting your account.</p>
<h2>5. Who processes data</h2>
<ul>
<li><b>Google Firebase</b> (Authentication and Firestore database) — stores account and list data.</li>
<li><b>Vercel</b> — hosts the site and a server function that fetches film data.</li>
<li><b>TMDB</b> — supplies film data and images. Requests normally pass through our own server, so TMDB does not see your IP address; if that route fails, your browser may contact TMDB directly.</li>
<li><b>YouTube (Google)</b> — only after you tap “Play trailer”.</li>
<li><b>JustWatch</b> — streaming availability, via TMDB; its links open on their site.</li>
</ul>
<p>We share data with authorities only where the law requires it.</p>
<h2>6. Transfers outside India</h2>
<p>These providers operate globally, so your data may be processed outside India under their own security and legal safeguards.</p>
<h2>7. How long we keep it</h2>
<p>Account data is kept until you delete your account. Deleting it from the Account menu removes your list and account; copies in routine backups and provider logs expire on their normal schedules.</p>
<h2>8. Security</h2>
<p>Connections use HTTPS and database rules allow only you to read or change your own list. No online service is perfectly secure, so please use a strong, unique password.</p>
<h2>9. Your rights</h2>
<p>You may access, correct, export and erase your data, withdraw consent, nominate someone to exercise rights on your behalf, and complain about how your data is handled. Export and Delete are in the Account menu. For anything else write to ${mail}; we aim to reply within 30 days. You may also approach the Data Protection Board of India or your local regulator.</p>
<h2>10. Children</h2>
<p>Accounts are for people <b>18 and over</b>. Parda is not directed at children and we do not knowingly keep accounts of minors; if we learn of one we will delete it.</p>
<h2>11. Changes</h2>
<p>If we change this Policy we will update the version and date above and tell you in the app when the change is material.</p>
<h2>12. Contact / grievance</h2>
<p>${owner} — ${mail}</p>`;
}
