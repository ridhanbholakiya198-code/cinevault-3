// Renders Terms / Privacy / Cookies as a real page, using the same text as the in-app sheet (legal.js) and the owner/email from cv-config.js.
import { legalHTML } from "./legal.js";
const tab = /privacy/.test(location.pathname) ? "privacy" : /cookies/.test(location.pathname) ? "cookies" : "terms";
const art = document.getElementById("lg");
art.innerHTML = legalHTML(tab, window.CV_SITE || {});
const hs = [...art.querySelectorAll("h2")];
hs.forEach((h, i) => h.id = "s" + (i + 1));
const sum = art.querySelector(".sum"), toc = document.createElement("nav");
toc.className = "toc"; toc.setAttribute("aria-label", "Contents");
toc.innerHTML = "<b>Contents</b><ol>" + hs.map(h => `<li><a href="#${h.id}">${h.textContent.replace(/^\d+\.\s*/, "")}</a></li>`).join("") + "</ol>";
(sum || art.querySelector(".m")).after(toc);
document.querySelectorAll(".lg-tabs a").forEach(a => a.classList.toggle("on", a.dataset.t === tab));
document.getElementById("yr").textContent = new Date().getFullYear();
