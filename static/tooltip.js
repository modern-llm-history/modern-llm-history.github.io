/* ==========================================================================
   tooltip.js — CK3-style lockable tooltip for chart data points
   ========================================================================== */
(function () {
  "use strict";

  var tooltip = document.getElementById("chart-tooltip");
  if (!tooltip) return;

  var LOCK_DELAY = 1500; // ms before auto-lock
  var hoverTimer = null;
  var isLocked = false;
  var activePoint = null;

  // --- Helpers ---
  function formatCompute(v) {
    if (window.__chartHelpers && window.__chartHelpers.formatComputeScientific) {
      return window.__chartHelpers.formatComputeScientific(v) + " FLOP";
    }
    return v.toExponential(1) + " FLOP";
  }

  function formatDate(t) {
    if (window.__chartHelpers && window.__chartHelpers.splitYearMonth) {
      var ym = window.__chartHelpers.splitYearMonth(t);
      var months = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
      return ym.year + "年" + months[ym.month - 1];
    }
    return String(Math.round(t));
  }

  function showTooltip(data, x, y) {
    tooltip.innerHTML =
      '<span class="tooltip-pin">📌</span>' +
      '<div class="tooltip-name">' + escapeHtml(data.label) + '</div>' +
      '<div class="tooltip-date">' + formatDate(data.t) + '</div>' +
      '<div class="tooltip-compute">' + formatCompute(data.compute) + '</div>';
    tooltip.hidden = false;
    positionTooltip(x, y);
  }

  function positionTooltip(x, y) {
    var rect = tooltip.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var left = x + 12;
    var top = y - 8;

    if (left + rect.width > vw - 8) left = x - rect.width - 12;
    if (top + rect.height > vh - 8) top = vh - rect.height - 8;
    if (top < 8) top = 8;

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip() {
    tooltip.hidden = true;
    tooltip.classList.remove("locked");
    isLocked = false;
    activePoint = null;
    clearLockTimer();
  }

  function lockTooltip() {
    isLocked = true;
    tooltip.classList.add("locked");
  }

  function clearLockTimer() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Event delegation on the SVG ---
  var svg = document.getElementById("history-chart");
  if (!svg) return;

  // Mouse enter on hit targets
  svg.addEventListener("mouseenter", function (e) {
    var target = e.target;
    if (!target.classList.contains("chart-point-hit")) return;
    if (isLocked) return;

    var data = target._pointData;
    if (!data) return;

    activePoint = target;
    showTooltip(data, e.clientX, e.clientY);

    clearLockTimer();
    hoverTimer = setTimeout(function () {
      if (activePoint === target) lockTooltip();
    }, LOCK_DELAY);
  }, true);

  // Mouse move — update position if not locked
  svg.addEventListener("mousemove", function (e) {
    if (isLocked) return;
    var target = e.target;
    if (!target.classList.contains("chart-point-hit")) return;
    if (!tooltip.hidden) {
      positionTooltip(e.clientX, e.clientY);
    }
  }, true);

  // Mouse leave
  svg.addEventListener("mouseleave", function (e) {
    var target = e.target;
    if (!target.classList.contains("chart-point-hit")) return;
    if (isLocked) return;

    clearLockTimer();
    hideTooltip();
  }, true);

  // Also handle when mouse moves from one hit circle to SVG background
  svg.addEventListener("mouseout", function (e) {
    var target = e.target;
    if (!target.classList.contains("chart-point-hit")) return;
    if (isLocked) return;

    // Check if the related target is another hit circle
    var related = e.relatedTarget;
    if (related && related.classList && related.classList.contains("chart-point-hit")) return;

    clearLockTimer();
    hideTooltip();
  }, true);

  // Click outside to dismiss locked tooltip
  document.addEventListener("click", function (e) {
    if (!isLocked) return;
    if (tooltip.contains(e.target)) return;
    hideTooltip();
  });

  // Touch: tap to show and immediately lock
  svg.addEventListener("touchstart", function (e) {
    var target = e.target;
    if (!target.classList.contains("chart-point-hit")) return;

    e.preventDefault();
    var data = target._pointData;
    if (!data) return;

    var touch = e.touches[0];
    if (isLocked && activePoint === target) {
      hideTooltip();
      return;
    }

    activePoint = target;
    showTooltip(data, touch.clientX, touch.clientY);
    lockTooltip();
  }, { passive: false });

  // Touch outside to dismiss
  document.addEventListener("touchstart", function (e) {
    if (!isLocked) return;
    if (tooltip.contains(e.target)) return;
    if (e.target.classList && e.target.classList.contains("chart-point-hit")) return;
    hideTooltip();
  });

  // Keyboard support: focus on hit circles
  svg.addEventListener("focus", function (e) {
    var target = e.target;
    if (!target.classList.contains("chart-point-hit")) return;

    var data = target._pointData;
    if (!data) return;

    var rect = target.getBoundingClientRect();
    activePoint = target;
    showTooltip(data, rect.right, rect.top);
    lockTooltip();
  }, true);

  svg.addEventListener("blur", function (e) {
    var target = e.target;
    if (!target.classList.contains("chart-point-hit")) return;
    hideTooltip();
  }, true);

})();
