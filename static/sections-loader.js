/* ==========================================================================
   sections-loader.js — Load section fragments into history-section shells
   ========================================================================== */
(function () {
  "use strict";

  var sections = Array.prototype.slice.call(document.querySelectorAll(".history-section[data-subhtml]"));
  var sceneOneModalInitialized = false;

  function initSceneOnePromptModal() {
    var modal;
    var promptTarget;
    var responseTarget;
    var closeButton;
    var lastActiveTrigger = null;

    if (sceneOneModalInitialized) return;

    modal = document.getElementById("scene1-chat-modal");
    if (!modal) return;

    promptTarget = modal.querySelector("[data-scene1-prompt-text]");
    responseTarget = modal.querySelector("[data-scene1-response-body]");
    closeButton = modal.querySelector(".scene1-chat-modal__close");

    if (!promptTarget || !responseTarget || !closeButton) return;

    function closeModal() {
      if (modal.hidden) return;
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("scene1-chat-open");
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === "function") {
        lastActiveTrigger.focus();
      }
    }

    function openModal(kind, trigger) {
      var template = document.getElementById("scene1-response-" + kind);

      if (!template) return;

      lastActiveTrigger = trigger || null;
      promptTarget.textContent = trigger ? trigger.textContent : "";
      responseTarget.innerHTML = template.innerHTML;
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("scene1-chat-open");
      closeButton.focus();
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-scene1-prompt]");

      if (trigger) {
        openModal(trigger.getAttribute("data-scene1-prompt"), trigger);
        return;
      }

      if (!modal.hidden && event.target.closest("[data-scene1-modal-close]")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    sceneOneModalInitialized = true;
  }

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

  window.__sectionsReady = Promise.all(sections.map(loadSection)).then(function () {
    initSceneOnePromptModal();
  });
})();
