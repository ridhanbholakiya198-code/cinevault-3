// Parda — Terms of Use, Privacy Policy, Cookie & storage notice. Single source for the in-app sheet AND the standalone pages
// (terms.html / privacy.html / cookies.html). Written for this app's real behaviour. Not legal advice: have a lawyer review before commercial use.
const e = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function legalHTML(tab, S) {
  S = S || {};
  const owner = e(S.owner || "the Parda developer");
  const mail = S.email ? `<a href="mailto:${e(S.email)}">${e(S.email)}</a>` : "the contact address shown in the app";
  const law = e(S.jurisdiction || "India");
  const head = t => `<h1>${t}</h1><p class="m">Effective ${e(S.effective || "")} · Version ${e(S.version || "1.0")} · Operated by ${owner}</p>`;
  const L = k => `<a href="/${k}.html" data-legal="${k}">${k === "terms" ? "Terms of Use" : k === "privacy" ? "Privacy Policy" : "Cookies &amp; Storage notice"}</a>`;

  if (tab === "terms") return head("Terms of Use") + `
<p class="sum"><b>In short:</b> Parda is a guide to films and series. We don’t host or sell any film. You can bring your own add-ons, and you are responsible for what you add and watch. Be 18+ for an account, be fair, and don’t misuse the service.</p>
<h2>1. Agreement</h2>
<p>By accessing or using Parda (the “Service”), including by browsing as a guest, you agree to these Terms and to our ${L("privacy")} and ${L("cookies")}. When you create an account you confirm this again by ticking the consent box. If you do not agree, do not use the Service.</p>
<h2>2. What Parda is</h2>
<p>Parda helps you discover films, series and anime, keep a personal watch list, and find where to watch them. <b>Parda does not host, upload, store, stream, sell or distribute any film, series or video file.</b> Trailers play from YouTube. “Where to watch” links lead to third-party services we do not own or control.</p>
<h2>3. Eligibility and accounts</h2>
<ul><li>You can use Parda without an account. An account is only for backing up and syncing your list.</li>
<li>You must be <b>18 or older</b> to create an account. If you are younger, use Parda only with a parent or guardian, and without an account.</li>
<li>Give accurate details and keep your password safe. You are responsible for activity on your account.</li>
<li>You can delete your account at any time from the Account menu.</li></ul>
<h2>4. Add-ons and third-party sources (bring your own)</h2>
<ul><li>Parda ships <b>no add-ons</b> and does not recommend, operate, review or endorse any. You may add Stremio-compatible add-on links of your own choice. Without an account they are saved on your device only.</li>
<li>An add-on is run by someone else. It decides what links it returns. Parda does not check, host or control those links or the content behind them.</li>
<li><b>You are solely responsible</b> for the add-ons you add, the links you open, play or download, and for making sure you have the legal right to access that content where you live. Do not use Parda to access content you are not allowed to access.</li>
<li>Add-on links can contain private settings or access keys. Only paste links you are comfortable sending, and do not share your own.</li>
<li>We may block an add-on, limit or switch off the add-on feature for anyone, at any time and without notice, for example after a rights-holder complaint or a security concern.</li></ul>
<h2>5. Playing, opening and downloading links</h2>
<p>Parda can play a direct link in your browser, hand it to an app on your device (such as VLC), copy it, or download it. Some links may be torrent (magnet) links; where you choose to play one in the browser it is handled by a third-party player (Webtor), and if you open one in your torrent app, that app and its network see your connection. Peer-to-peer sharing can expose your IP address to others. All of this is your choice and your risk, and the third parties’ own terms apply.</p>
<h2>6. Acceptable use</h2>
<p>Do not: scrape or bulk-download the Service; overload, probe or attack it or its API; use the add-on relay for anything other than loading add-on information; try to access other people’s accounts or data; reverse-engineer it to extract data; use it for anything unlawful; or impersonate anyone.</p>
<h2>7. Your list and your data</h2>
<p>Your watch list, statuses and favourites belong to you. You allow us to store and process them only to run the Service for you. We do not sell your data. See the ${L("privacy")}.</p>
<h2>8. Content and ownership</h2>
<p>Titles, posters, artwork, trailers, names and descriptions belong to their owners. Film and series data and images come from TMDB. <i>This product uses the TMDB API but is not endorsed or certified by TMDB.</i> Streaming availability comes from JustWatch. The Parda name, design and code belong to ${owner}; you get a personal, non-exclusive, revocable licence to use the Service.</p>
<h2>9. Copyright complaints</h2>
<p>We respect the rights of creators. If you believe something reachable through Parda infringes your rights, write to ${mail} with: your name and contact details; what work is affected; the exact address (URL) where it appears; a statement that you are the owner or authorised to act; and a statement that the information is accurate. We will review it promptly and may remove the item, block the related add-on, or disable features. Because Parda does not host content, the original host or add-on operator must also be contacted to remove the file itself. Repeat or serious misuse may lead to suspension.</p>
<h2>10. Accuracy</h2>
<p>Ratings, release dates, runtimes, box-office figures and availability come from third parties and can be wrong or change without notice.</p>
<h2>11. Availability and changes</h2>
<p>The Service is free and may change, pause or stop at any time. We do not promise uninterrupted or error-free operation.</p>
<h2>12. Disclaimer</h2>
<p>To the fullest extent permitted by law, the Service and anything reached through it is provided “as is” and “as available”, without warranties of any kind, including fitness for a purpose, accuracy, availability, safety of third-party links, or non-infringement of third-party content.</p>
<h2>13. Limitation of liability</h2>
<p>To the fullest extent permitted by law, ${owner} is not liable for indirect, incidental, special or consequential loss, or for any loss arising from third-party add-ons, links, content, players or services. Because the Service is free, total liability is limited to the amount you paid us, which is zero. Nothing here limits rights you have under law that cannot be excluded.</p>
<h2>14. Indemnity</h2>
<p>You agree to compensate and hold harmless ${owner} from claims, losses and costs arising from your misuse of the Service, your breach of these Terms, or content you chose to access or share through add-ons.</p>
<h2>15. Suspension and termination</h2>
<p>We may suspend or remove accounts or features that break these Terms, harm the Service or other people, or expose us to legal risk. You may stop using the Service and delete your account at any time.</p>
<h2>16. Changes to these Terms</h2>
<p>We may update these Terms. The version and date above show the latest one. If a change is material we will tell you in the app. Continuing to use the Service after a change means you accept it.</p>
<h2>17. Governing law and disputes</h2>
<p>These Terms are governed by the laws of ${law}. Please contact us first so we can try to resolve a problem informally. Otherwise the courts of ${law} have jurisdiction, subject to any mandatory consumer rights you have where you live.</p>
<h2>18. General</h2>
<p>If a part of these Terms is unenforceable, the rest stays in force. Not enforcing a right is not a waiver of it. These Terms and the Privacy Policy are the whole agreement between you and us about the Service. We are not responsible for delays or failures caused by events beyond our control. You may not transfer your rights under these Terms; we may.</p>
<h2>19. Contact</h2>
<p>Questions, complaints or legal notices: ${mail}.</p>`;

  if (tab === "cookies") return head("Cookies &amp; Local Storage") + `
<p class="sum"><b>In short:</b> no advertising cookies, no trackers, no analytics. We only keep what the app needs to work on your device.</p>
<p>Parda does <b>not</b> use advertising or analytics cookies. We use browser storage the app needs, so no cookie banner is shown. If that changes, we will ask you first.</p>
<h2>What is stored on your device</h2>
<ul>
<li><b>cv_list</b> — your watch list (statuses, favourites, alerts). Removed when you sign out or clear site data.</li>
<li><b>cv_taste</b> — on-device personalisation (languages and genres you open or search). Never uploaded. Reset it from My list.</li>
<li><b>cv_reg</b> — the streaming region you picked for “Where to watch”.</li>
<li><b>c:…, hid:…, hbd:…</b> — short-lived caches of film data and images so pages load faster.</li>
<li><b>cv_addons_guest</b> — add-on links you added <i>without an account</i>, kept on this device only. <b>cv_addons_off</b> — which add-ons you switched off.</li>
<li><b>cv_pl_fit, cv_wt_shape</b> — your player picture preferences.</li>
<li><b>cv_key</b> — only if you entered your own TMDB key in the app.</li>
<li><b>cv_u</b> — remembers that you are signed in (name and photo) so your session restores quickly. <b>cv_nag</b> — you dismissed the optional sign-in suggestion.</li>
<li><b>cv_i, cv_np</b> (session only) — intro animation and prompt already shown this visit.</li>
<li><b>Firebase Authentication</b> — keeps your sign-in session in the browser’s IndexedDB until you sign out.</li>
</ul>
<h2>Third parties that may set their own storage</h2>
<p>When you tap “Play trailer”, a YouTube player (privacy-enhanced mode) loads and Google/YouTube may set cookies; nothing from YouTube loads before you tap play. If you play a torrent-type stream in the browser, the Webtor player and its script host (jsDelivr) load at that moment and may set their own storage.</p>
<h2>Your control</h2>
<p>Clear site data in your browser at any time, or sign out from the Account menu to remove your list from the device. Clearing site data also removes add-ons saved without an account. See also the ${L("privacy")}.</p>`;

  return head("Privacy Policy") + `
<p class="sum"><b>In short:</b> no ads, no analytics, no selling data. Guests are not profiled. If you make an account we store your email, your list and your add-on links. Add-on requests go to the add-on you chose, and may be relayed through our server.</p>
<h2>1. About this policy</h2>
<p>This explains what data Parda handles, why, and your choices. We follow India’s <b>Digital Personal Data Protection Act, 2023</b> and, for visitors in the EU/UK, apply GDPR-style rights. ${owner} is the data fiduciary / controller. This policy is also available at <a href="/privacy.html">/privacy.html</a>.</p>
<h2>2. What we collect</h2>
<p><b>Browsing as a guest:</b> we do not create a profile of you. Your list, personalisation, region and any add-ons you add are stored only on your device. Our hosting provider logs standard technical data (IP address, browser, pages requested) to deliver and secure the site.</p>
<p><b>With an account:</b></p>
<ul>
<li><b>Firebase Authentication</b> holds your email, display name, profile photo link (if you use Google), sign-in method and a unique user ID. Passwords are handled by Firebase; we never see them.</li>
<li><b>Our database</b> holds your list entries (title ID, type, title, poster path, language, genre IDs, status, favourite and alert flags, last-updated time), the add-on links you saved, and the version and time you accepted these Terms and this Policy.</li>
</ul>
<p><b>We do not collect:</b> payment details, GPS location, contacts, advertising IDs, or analytics. We show no third-party ads and we do not sell personal data.</p>
<h2>3. Add-ons and the relay</h2>
<ul>
<li>Parda includes no add-ons. If you add one, its address is saved (on your device, or in your account if signed in). When you open a film, your browser asks that add-on, not Parda, for links, sending the film’s IMDb ID. The add-on’s operator can see your IP address and that request, under its own policy.</li>
<li>If an add-on does not allow direct browser access, Parda retries the request through our server function (<code>/api/proxy</code>). It only passes add-on information (manifest, catalogue and link lists) through; it does not store it, and we do not keep our own log of it.</li>
<li><b>Important:</b> add-on addresses can contain private settings or access keys. When relayed, the address passes through our hosting provider (Vercel), which may keep standard request logs for a limited time. Do not add links you are not comfortable sending.</li>
<li>Video itself is never relayed through Parda; it loads from the source directly.</li>
</ul>
<h2>4. Playback and third-party players</h2>
<p>Trailers play from YouTube. Direct links play in your browser straight from their host, which sees your IP address. If you play a torrent-type link in the browser, its magnet/info-hash and your IP are sent to Webtor (and its script is loaded from jsDelivr). If you open a link in another app (VLC, a torrent app), that app handles it under its own policy.</p>
<h2>5. Personalisation</h2>
<p>Recommendations such as “Picked for you” are computed <b>on your device</b> from titles you open or search. This profile is never uploaded. Reset it from My list.</p>
<h2>6. Why we use data, and our basis</h2>
<p>To provide the Service you asked for (sign-in, saving and syncing your list, loading add-on links), to keep it secure and prevent abuse, and to meet legal duties. Account data is processed on your consent, which you can withdraw by deleting your account.</p>
<h2>7. Who processes data</h2>
<ul>
<li><b>Google Firebase</b> (Authentication, Firestore) — account and list data.</li>
<li><b>Vercel</b> — hosts the site and server functions (film data, images, add-on relay).</li>
<li><b>TMDB</b> — film data and images. Requests normally pass through our server, so TMDB does not see your IP; if that route fails your browser may contact TMDB directly.</li>
<li><b>YouTube (Google)</b> — only after you tap “Play trailer”.</li>
<li><b>JustWatch</b> — streaming availability, via TMDB; its links open on their site.</li>
<li><b>Google Fonts</b> — fonts load from Google, which receives your IP address and browser details.</li>
<li><b>Wikidata (Wikimedia)</b> — for some franchise and person details your browser may query Wikidata.</li>
<li><b>Webtor and jsDelivr</b> — only when you play a torrent-type link in the browser.</li>
<li><b>Add-on operators</b> — whoever runs an add-on you choose.</li>
</ul>
<p>We share data with authorities only where the law requires it.</p>
<h2>8. Transfers outside India</h2>
<p>These providers operate globally, so your data may be processed outside India under their own security and legal safeguards.</p>
<h2>9. How long we keep it</h2>
<p>Account data is kept until you delete your account. Deleting it from the Account menu removes your list, saved add-ons and account; copies in routine backups and provider logs expire on their normal schedules. Guest data stays on your device until you clear it.</p>
<h2>10. Security</h2>
<p>Connections use HTTPS and database rules allow only you to read or change your own data. No online service is perfectly secure, so use a strong, unique password. If a breach affects your data we will notify you and the authorities as the law requires.</p>
<h2>11. Your rights</h2>
<p>You may access, correct, export and erase your data, withdraw consent, nominate someone to act for you, and complain about how your data is handled. Export and Delete are in the Account menu. For anything else write to ${mail}; we aim to reply within 30 days. You may also approach the Data Protection Board of India or your local regulator.</p>
<h2>12. Children</h2>
<p>Accounts are for people <b>18 and over</b>. Parda is not directed at children and we do not knowingly keep accounts of minors; if we learn of one we will delete it.</p>
<h2>13. Changes</h2>
<p>If we change this Policy we will update the version and date above and tell you in the app when the change is material.</p>
<h2>14. Contact and grievance officer</h2>
<p>${owner} — ${mail}. Complaints about data handling can be sent to the same address.</p>`;
}
