/* Deutsch Room · runs first in <head> on / and /tu/ (kept out of the HTML so the page's CSP can forbid inline scripts).
   - Refuses to show inside a frame of another site (so nobody can trick a click on "reset" or "disconnect").
   - Sets light/dark and, on /tu/, the page language before anything is drawn. */
(function () {
  if (window.top !== window.self) document.documentElement.style.display = "none";
  var get = function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  if (/\/tu\/?/.test(location.pathname) && (get("de.tu.set") || {}).lang === "en") document.documentElement.lang = "en";
  var t = get("de.theme");
  if (t !== "light" && t !== "dark") t = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = t;
})();
