/* ==========================================================================
   toc.js — Left TOC timeline with SVG dot highlighting
   ========================================================================== */
(function () {
  "use strict";

  function ready(fn) {
    if (window.__sectionsReady && typeof window.__sectionsReady.then === "function") {
      window.__sectionsReady.then(fn);
      return;
    }

    fn();
  }

  ready(function () {

  var NS = "http://www.w3.org/2000/svg";
  var tocSvg = document.getElementById("toc-svg");
  if (!tocSvg) return;

  var sections = document.querySelectorAll(".history-section[data-toc-label]");
  if (!sections.length) return;

  var SECTION_COUNT = sections.length;

  // --- Layout ---
  var SVG_W = 140;
  var SVG_H = SECTION_COUNT * 60 + 40; // proportional height
  var LINE_X = 24;
  var DOT_R = 5;
  var LABEL_X = 40;
  var Y_START = 30;
  var Y_END = SVG_H - 30;
  var Y_SPAN = Y_END - Y_START;

  tocSvg.setAttribute("viewBox", "0 0 " + SVG_W + " " + SVG_H);
  tocSvg.setAttribute("width", SVG_W);
  tocSvg.setAttribute("height", SVG_H);

  function dotY(index) {
    if (SECTION_COUNT <= 1) return Y_START;
    return Y_START + (index / (SECTION_COUNT - 1)) * Y_SPAN;
  }

  // --- Draw elements ---

  // Background track line
  var trackLine = document.createElementNS(NS, "line");
  trackLine.setAttribute("x1", LINE_X);
  trackLine.setAttribute("y1", Y_START);
  trackLine.setAttribute("x2", LINE_X);
  trackLine.setAttribute("y2", Y_END);
  trackLine.setAttribute("stroke", "rgba(0,0,0,0.12)");
  trackLine.setAttribute("stroke-width", "2");
  tocSvg.appendChild(trackLine);

  // Progress line (filled segment)
  var progressLine = document.createElementNS(NS, "line");
  progressLine.setAttribute("x1", LINE_X);
  progressLine.setAttribute("y1", Y_START);
  progressLine.setAttribute("x2", LINE_X);
  progressLine.setAttribute("y2", Y_START);
  progressLine.setAttribute("stroke", "#111");
  progressLine.setAttribute("stroke-width", "2");
  progressLine.setAttribute("stroke-linecap", "round");
  tocSvg.appendChild(progressLine);

  // Dot groups
  var dotGroups = [];
  sections.forEach(function (sec, i) {
    var y = dotY(i);
    var label = sec.getAttribute("data-toc-label") || "";
    var sectionId = sec.id;

    var group = document.createElementNS(NS, "g");
    group.setAttribute("class", "toc-dot-group");
    group.setAttribute("data-index", i);
    group.setAttribute("role", "link");
    group.setAttribute("tabindex", "0");
    group.setAttribute("aria-label", label);

    // Dot
    var circle = document.createElementNS(NS, "circle");
    circle.setAttribute("cx", LINE_X);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", DOT_R);
    circle.setAttribute("fill", "#fff");
    circle.setAttribute("stroke", "#111");
    circle.setAttribute("stroke-width", "1.5");
    circle.setAttribute("class", "toc-dot");
    group.appendChild(circle);

    // Label text
    var text = document.createElementNS(NS, "text");
    text.setAttribute("x", LABEL_X);
    text.setAttribute("y", y + 4);
    text.setAttribute("class", "toc-label");
    text.textContent = label;
    group.appendChild(text);

    // Click handler
    group.addEventListener("click", function () {
      var target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    // Keyboard enter/space
    group.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var target = document.getElementById(sectionId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });

    tocSvg.appendChild(group);
    dotGroups.push({ group: group, circle: circle, index: i, y: y });
  });

  // --- Active section tracking ---
  var activeIndex = 0;

  function setActive(index) {
    if (index === activeIndex && dotGroups[index].group.classList.contains("active")) return;
    activeIndex = index;

    dotGroups.forEach(function (dg, i) {
      var isActive = (i === index);
      dg.group.classList.toggle("active", isActive);
      dg.circle.setAttribute("fill", isActive ? "#111" : "#fff");
      dg.circle.setAttribute("r", isActive ? DOT_R + 1 : DOT_R);
    });

    // Update progress line
    var targetY = dotY(index);
    progressLine.setAttribute("y2", targetY);
  }

  setActive(0);

  // --- IntersectionObserver ---
  var observer = new IntersectionObserver(function (entries) {
    var bestEntry = null;
    var bestRatio = -1;

    entries.forEach(function (entry) {
      if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
        bestEntry = entry;
        bestRatio = entry.intersectionRatio;
      }
    });

    if (bestEntry) {
      // Find which section this is
      var idx = Array.prototype.indexOf.call(sections, bestEntry.target);
      if (idx >= 0) setActive(idx);
    }
  }, {
    rootMargin: "-30% 0px -30% 0px",
    threshold: [0, 0.1, 0.25, 0.5]
  });

  sections.forEach(function (sec) { observer.observe(sec); });

  });
})();
