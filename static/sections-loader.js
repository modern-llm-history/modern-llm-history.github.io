/* ==========================================================================
   sections-loader.js — Load section fragments into history-section shells
   ========================================================================== */
(function () {
  "use strict";

  var sections = Array.prototype.slice.call(document.querySelectorAll(".history-section[data-subhtml]"));

  function loadSection(section) {
    var url = section.getAttribute("data-subhtml");
    if (!url) return Promise.resolve();

    section.setAttribute("aria-busy", "true");

    return fetch(url, { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load section fragment: " + url + " (" + response.status + ")");
        }
        return response.text();
      })
      .then(function (html) {
        section.innerHTML = html;
        section.removeAttribute("aria-busy");
      })
      .catch(function (error) {
        console.error(error);
        section.innerHTML = "<p>セクションを読み込めませんでした。</p>";
        section.removeAttribute("aria-busy");
      });
  }

  window.__sectionsReady = Promise.all(sections.map(loadSection));
})();
