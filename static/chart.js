/* ==========================================================================
   chart.js — AI 2027 style sticky visual for LLM history
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        el.setAttribute(key, attrs[key]);
      });
    }
    return el;
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function linePath(points) {
    if (!points.length) return "";
    if (points.length === 1) return "M " + points[0].x + " " + points[0].y;

    var d = "M " + points[0].x + " " + points[0].y;

    for (var i = 0; i < points.length - 1; i += 1) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;

      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;

      d += " C " + cp1x + " " + cp1y + ", " + cp2x + " " + cp2y + ", " + p2.x + " " + p2.y;
    }

    return d;
  }

  function polarToCartesian(cx, cy, r, angleDegrees) {
    var angleRadians = (angleDegrees - 90) * Math.PI / 180;
    return {
      x: cx + (r * Math.cos(angleRadians)),
      y: cy + (r * Math.sin(angleRadians))
    };
  }

  function donutArcPath(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
    var startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
    var endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
    var startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
    var endInner = polarToCartesian(cx, cy, innerRadius, endAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", startOuter.x, startOuter.y,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      "L", startInner.x, startInner.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 1, endInner.x, endInner.y,
      "Z"
    ].join(" ");
  }

  var sticky = document.getElementById("sticky-briefing");
  var panelAnim = document.getElementById("panel-anim");
  var svg = document.getElementById("history-chart");
  var capabilityGrid = document.getElementById("capability-grid");
  var focusRing = document.getElementById("focus-ring");
  var focusLabel = document.getElementById("focus-label");
  var copyCount = document.getElementById("copy-count");
  var copyCaption = document.getElementById("copy-caption");
  var copyGrid = document.getElementById("copy-grid");
  var statsInline = document.getElementById("stats-inline");
  var techStripGroups = document.getElementById("tech-strip-groups");
  var monthCurrent = document.getElementById("date-month-current");
  var monthNext = document.getElementById("date-month-next");
  var yearSlot = document.getElementById("date-year-slot");
  var dateAnnouncer = document.getElementById("date-announcer");

  if (!sticky || !panelAnim || !svg || !capabilityGrid || !focusRing || !focusLabel || !copyCount ||
      !copyCaption || !copyGrid || !statsInline || !techStripGroups || !monthCurrent ||
      !monthNext || !yearSlot || !dateAnnouncer) {
    return;
  }

  var SCENES = {
    "scene-1": {
      month: "Jan",
      year: "2018",
      chart: {
        startLabel: "2018",
        endLabel: "2019",
        caption: "Pretraining shift",
        series: [
          { label: "Compute", color: "#2b6a4a", width: 2.5, values: [18, 20, 24, 28, 34, 41] },
          { label: "Capability", color: "#55574f", width: 2.2, values: [14, 16, 19, 23, 29, 34] },
          { label: "Reach", color: "#8e836e", width: 2.2, values: [4, 5, 6, 8, 10, 12] }
        ]
      },
      capabilities: [
        { label: "Pretrain", level: "active" },
        { label: "Scaling", level: "mid" },
        { label: "API", level: "off" },
        { label: "Chat", level: "off" },
        { label: "Reason", level: "off" },
        { label: "Agents", level: "off" }
      ],
      ring: { center: "Research", values: [0.72, 0.18, 0.10] },
      copies: { count: "2", caption: "paradigms make pretraining unavoidable", fill: 6 },
      stats: [
        { label: "Compute", value: "10^19" },
        { label: "UI", value: "papers" },
        { label: "Loop", value: "finetune" },
        { label: "Labs", value: "2" },
        { label: "Open", value: "low" },
        { label: "Reach", value: "research" }
      ],
      tech: [7, 2, 1]
    },
    "scene-2": {
      month: "Feb",
      year: "2019",
      chart: {
        startLabel: "2019",
        endLabel: "2020",
        caption: "Scaling laws",
        series: [
          { label: "Compute", color: "#2b6a4a", width: 2.5, values: [25, 29, 38, 50, 63, 74] },
          { label: "Capability", color: "#55574f", width: 2.2, values: [22, 25, 33, 42, 55, 68] },
          { label: "Reach", color: "#8e836e", width: 2.2, values: [8, 10, 12, 16, 20, 24] }
        ]
      },
      capabilities: [
        { label: "Pretrain", level: "active" },
        { label: "Scaling", level: "active" },
        { label: "API", level: "mid" },
        { label: "Chat", level: "off" },
        { label: "Reason", level: "off" },
        { label: "Agents", level: "off" }
      ],
      ring: { center: "Scale", values: [0.66, 0.18, 0.16] },
      copies: { count: "3", caption: "frontier runs test power-law growth", fill: 10 },
      stats: [
        { label: "Compute", value: "10^23" },
        { label: "UI", value: "demos" },
        { label: "Loop", value: "scale up" },
        { label: "Labs", value: "3" },
        { label: "Open", value: "low" },
        { label: "Reach", value: "labs→apps" }
      ],
      tech: [6, 4, 2]
    },
    "scene-3": {
      month: "Jun",
      year: "2020",
      chart: {
        startLabel: "2020",
        endLabel: "2022",
        caption: "API layer",
        series: [
          { label: "Compute", color: "#2b6a4a", width: 2.5, values: [36, 41, 48, 56, 60, 66] },
          { label: "Capability", color: "#55574f", width: 2.2, values: [34, 39, 45, 53, 59, 65] },
          { label: "Reach", color: "#8e836e", width: 2.2, values: [18, 24, 32, 41, 48, 55] }
        ]
      },
      capabilities: [
        { label: "Pretrain", level: "active" },
        { label: "Scaling", level: "active" },
        { label: "API", level: "active" },
        { label: "Chat", level: "mid" },
        { label: "Reason", level: "off" },
        { label: "Agents", level: "off" }
      ],
      ring: { center: "API", values: [0.45, 0.35, 0.20] },
      copies: { count: "12", caption: "teams ship frontier models through APIs", fill: 18 },
      stats: [
        { label: "Compute", value: "10^24" },
        { label: "UI", value: "completions" },
        { label: "Loop", value: "serve" },
        { label: "Labs", value: "5" },
        { label: "Open", value: "low" },
        { label: "Reach", value: "enterprise" }
      ],
      tech: [7, 5, 3]
    },
    "scene-4": {
      month: "Nov",
      year: "2022",
      chart: {
        startLabel: "2022",
        endLabel: "2024",
        caption: "Chat interface",
        series: [
          { label: "Compute", color: "#2b6a4a", width: 2.5, values: [48, 52, 58, 66, 74, 78] },
          { label: "Capability", color: "#55574f", width: 2.2, values: [44, 49, 58, 70, 81, 88] },
          { label: "Reach", color: "#8e836e", width: 2.2, values: [34, 42, 58, 74, 89, 96] }
        ]
      },
      capabilities: [
        { label: "Pretrain", level: "mid" },
        { label: "Scaling", level: "active" },
        { label: "API", level: "active" },
        { label: "Chat", level: "active" },
        { label: "Reason", level: "mid" },
        { label: "Agents", level: "off" }
      ],
      ring: { center: "Chat", values: [0.26, 0.48, 0.26] },
      copies: { count: "100M+", caption: "people meet chat-native LLMs", fill: 30 },
      stats: [
        { label: "Compute", value: "10^25" },
        { label: "UI", value: "chat" },
        { label: "Loop", value: "deploy" },
        { label: "Labs", value: "7" },
        { label: "Open", value: "rising" },
        { label: "Reach", value: "mass" }
      ],
      tech: [8, 6, 4]
    },
    "scene-5": {
      month: "Sep",
      year: "2024",
      chart: {
        startLabel: "2024",
        endLabel: "2025",
        caption: "Reasoning wave",
        series: [
          { label: "Compute", color: "#2b6a4a", width: 2.5, values: [68, 72, 79, 84, 88, 93] },
          { label: "Capability", color: "#55574f", width: 2.2, values: [72, 75, 81, 87, 92, 96] },
          { label: "Reach", color: "#8e836e", width: 2.2, values: [64, 68, 72, 79, 84, 88] }
        ]
      },
      capabilities: [
        { label: "Pretrain", level: "mid" },
        { label: "Scaling", level: "active" },
        { label: "API", level: "active" },
        { label: "Chat", level: "active" },
        { label: "Reason", level: "active" },
        { label: "Agents", level: "mid" }
      ],
      ring: { center: "Reason", values: [0.22, 0.24, 0.54] },
      copies: { count: "6", caption: "reasoner families define the frontier", fill: 38 },
      stats: [
        { label: "Compute", value: "10^25+" },
        { label: "UI", value: "reason" },
        { label: "Loop", value: "infer" },
        { label: "Labs", value: "8" },
        { label: "Open", value: "mixed" },
        { label: "Reach", value: "pro work" }
      ],
      tech: [8, 7, 6]
    },
    "scene-6": {
      month: "Mar",
      year: "2026",
      chart: {
        startLabel: "2025",
        endLabel: "2026",
        caption: "Agent loop",
        series: [
          { label: "Compute", color: "#2b6a4a", width: 2.5, values: [78, 84, 88, 92, 95, 98] },
          { label: "Capability", color: "#55574f", width: 2.2, values: [82, 86, 90, 94, 97, 99] },
          { label: "Reach", color: "#8e836e", width: 2.2, values: [72, 78, 83, 88, 93, 97] }
        ]
      },
      capabilities: [
        { label: "Pretrain", level: "mid" },
        { label: "Scaling", level: "active" },
        { label: "API", level: "active" },
        { label: "Chat", level: "mid" },
        { label: "Reason", level: "active" },
        { label: "Agents", level: "active" }
      ],
      ring: { center: "Agents", values: [0.18, 0.22, 0.60] },
      copies: { count: "24/7", caption: "autonomous workflows keep the loop running", fill: 48 },
      stats: [
        { label: "Compute", value: "clusters" },
        { label: "UI", value: "agents" },
        { label: "Loop", value: "AI-on-AI" },
        { label: "Labs", value: "9+" },
        { label: "Open", value: "contested" },
        { label: "Reach", value: "core work" }
      ],
      tech: [9, 8, 8]
    }
  };

  var sections = Array.prototype.slice.call(document.querySelectorAll(".history-section[data-scene]")).map(function (section) {
    return {
      id: section.getAttribute("data-scene"),
      element: section
    };
  }).filter(function (item) {
    return item.id && SCENES[item.id];
  });

  if (!sections.length) return;

  var digitColumns = [];
  var activeSceneId = sections[0].id;
  var switchTimer = null;
  var ticking = false;
  var currentMonth = monthCurrent.textContent || "";

  function buildYearSlot(initialYear) {
    clearNode(yearSlot);
    digitColumns = [];

    String(initialYear).split("").forEach(function () {
      var column = document.createElement("span");
      column.className = "digit-column";

      var stack = document.createElement("span");
      stack.className = "digit-stack";

      for (var digit = 0; digit <= 9; digit += 1) {
        var digitEl = document.createElement("span");
        digitEl.textContent = String(digit);
        stack.appendChild(digitEl);
      }

      column.appendChild(stack);
      yearSlot.appendChild(column);
      digitColumns.push(stack);
    });
  }

  function setYear(year, animate) {
    var yearString = String(year);
    if (digitColumns.length !== yearString.length) {
      buildYearSlot(yearString);
      animate = false;
    }

    yearSlot.setAttribute("aria-label", yearString);

    yearString.split("").forEach(function (digit, index) {
      var stack = digitColumns[index];
      if (!stack) return;
      stack.style.transition = animate ? "" : "none";
      stack.style.transform = "translateY(" + (-1 * parseInt(digit, 10)) + "rem)";

      if (!animate) {
        stack.getBoundingClientRect();
        stack.style.transition = "";
      }
    });
  }

  function setMonth(month, animate) {
    if (!animate || month === currentMonth) {
      monthCurrent.textContent = month;
      monthNext.textContent = "";
      sticky.classList.remove("is-animating");
      currentMonth = month;
      return;
    }

    monthNext.textContent = month;
    sticky.classList.add("is-animating");

    window.setTimeout(function () {
      monthCurrent.textContent = month;
      monthNext.textContent = "";
      sticky.classList.remove("is-animating");
      currentMonth = month;
    }, 340);
  }

  function renderCapabilities(items) {
    clearNode(capabilityGrid);

    items.forEach(function (item) {
      var chip = document.createElement("div");
      chip.className = "capability-chip";
      if (item.level === "active") chip.classList.add("is-active");
      if (item.level === "mid") chip.classList.add("is-mid");

      var flag = document.createElement("span");
      flag.className = "capability-chip-flag";

      var label = document.createElement("span");
      label.className = "capability-chip-label";
      label.textContent = item.label;

      chip.appendChild(flag);
      chip.appendChild(label);
      capabilityGrid.appendChild(chip);
    });
  }

  function renderFocusRing(ringData) {
    clearNode(focusRing);
    focusLabel.textContent = "Center of Gravity";

    var values = ringData.values;
    var colors = ["#111111", "#2b6a4a", "rgba(17,17,17,0.24)"];
    var startAngle = 0;
    var cx = 60;
    var cy = 60;
    var outer = 49;
    var inner = 29;

    focusRing.appendChild(svgEl("circle", {
      cx: cx,
      cy: cy,
      r: outer,
      fill: "none",
      stroke: "rgba(17,17,17,0.08)",
      "stroke-width": String(outer - inner)
    }));

    values.forEach(function (value, index) {
      var sweep = value * 360;
      var path = svgEl("path", {
        d: donutArcPath(cx, cy, outer, inner, startAngle, startAngle + sweep),
        fill: colors[index]
      });
      focusRing.appendChild(path);
      startAngle += sweep + 2;
    });

    var centerText = svgEl("text", {
      x: cx,
      y: cy + 4,
      "text-anchor": "middle",
      "font-family": "'IBM Plex Mono', monospace",
      "font-size": "11",
      fill: "#111"
    });
    centerText.textContent = ringData.center;
    focusRing.appendChild(centerText);
  }

  function renderCopyGrid(fillCount) {
    clearNode(copyGrid);

    for (var i = 0; i < 72; i += 1) {
      var cell = document.createElement("span");
      cell.className = "copy-grid-cell";
      if (i < fillCount) cell.classList.add("is-on");
      copyGrid.appendChild(cell);
    }
  }

  function renderStats(stats) {
    clearNode(statsInline);

    stats.forEach(function (item) {
      var el = document.createElement("div");
      el.className = "stat-inline-item";

      var label = document.createElement("span");
      label.className = "stat-inline-label";
      label.textContent = item.label;

      var value = document.createElement("span");
      value.className = "stat-inline-value";
      value.textContent = item.value;

      el.appendChild(label);
      el.appendChild(value);
      statsInline.appendChild(el);
    });
  }

  function renderTech(groups) {
    clearNode(techStripGroups);
    var names = ["current", "emerging", "next"];

    groups.forEach(function (count, groupIndex) {
      var group = document.createElement("div");
      group.className = "tech-group";

      for (var i = 0; i < 10; i += 1) {
        var dot = document.createElement("span");
        dot.className = "tech-dot";
        if (i < count) {
          dot.classList.add("is-on");
          dot.classList.add("is-" + names[groupIndex]);
        }
        group.appendChild(dot);
      }

      techStripGroups.appendChild(group);
    });
  }

  function renderChart(chartData) {
    clearNode(svg);

    var W = 430;
    var H = 152;
    var PAD = { top: 12, right: 68, bottom: 22, left: 0 };
    var BASE = H - PAD.bottom;
    var usableWidth = W - PAD.right - PAD.left;
    var usableHeight = BASE - PAD.top;

    var defs = svgEl("defs");
    var clipPath = svgEl("clipPath", { id: "chart-reveal-clip" });
    var clipRect = svgEl("rect", {
      x: "0",
      y: "0",
      width: "0",
      height: String(H)
    });
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    [0.25, 0.5, 0.75].forEach(function (ratio) {
      var y = PAD.top + usableHeight * ratio;
      svg.appendChild(svgEl("line", {
        x1: PAD.left,
        y1: y,
        x2: W - PAD.right,
        y2: y,
        stroke: "rgba(17,17,17,0.08)",
        "stroke-width": "1"
      }));
    });

    for (var i = 1; i <= 4; i += 1) {
      var x = PAD.left + usableWidth * (i / 5);
      svg.appendChild(svgEl("line", {
        x1: x,
        y1: PAD.top + 4,
        x2: x,
        y2: BASE,
        stroke: "rgba(17,17,17,0.05)",
        "stroke-width": "1"
      }));
    }

    var contentGroup = svgEl("g", { "clip-path": "url(#chart-reveal-clip)" });
    svg.appendChild(contentGroup);

    chartData.series.forEach(function (series, seriesIndex) {
      var points = series.values.map(function (value, index) {
        return {
          x: PAD.left + usableWidth * (index / (series.values.length - 1)),
          y: BASE - usableHeight * (value / 100)
        };
      });

      var path = svgEl("path", {
        d: linePath(points),
        fill: "none",
        stroke: series.color,
        "stroke-width": String(series.width),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "stroke-opacity": seriesIndex === 0 ? "0.9" : "0.82"
      });
      contentGroup.appendChild(path);

      var last = points[points.length - 1];
      contentGroup.appendChild(svgEl("circle", {
        cx: String(last.x),
        cy: String(last.y),
        r: "3.5",
        fill: "#f7f1e5",
        stroke: series.color,
        "stroke-width": "1.8"
      }));

      var label = svgEl("text", {
        x: String(W - PAD.right + 10),
        y: String(last.y + (seriesIndex - 1) * 11 + 3),
        fill: series.color,
        "font-family": "'IBM Plex Mono', monospace",
        "font-size": "10"
      });
      label.textContent = series.label;
      svg.appendChild(label);
    });

    var heroPoints = chartData.series[0].values;
    var heroX = PAD.left + usableWidth * 0.52;
    var heroY = BASE - usableHeight * (heroPoints[Math.floor(heroPoints.length * 0.6)] / 100) - 12;
    var caption = svgEl("text", {
      x: String(clamp(heroX, 28, W - PAD.right - 50)),
      y: String(heroY),
      fill: "#111",
      "font-family": "'IBM Plex Mono', monospace",
      "font-size": "10",
      "font-weight": "600"
    });
    caption.textContent = chartData.caption;
    contentGroup.appendChild(caption);

    var startLabel = svgEl("text", {
      x: String(PAD.left),
      y: String(H - 4),
      fill: "#746e63",
      "font-family": "'IBM Plex Mono', monospace",
      "font-size": "10"
    });
    startLabel.textContent = chartData.startLabel;
    svg.appendChild(startLabel);

    var endLabel = svgEl("text", {
      x: String(W - PAD.right),
      y: String(H - 4),
      fill: "#746e63",
      "font-family": "'IBM Plex Mono', monospace",
      "font-size": "10",
      "text-anchor": "end"
    });
    endLabel.textContent = chartData.endLabel;
    svg.appendChild(endLabel);

    requestAnimationFrame(function () {
      clipRect.style.transition = "width 640ms cubic-bezier(0.2, 0.9, 0.2, 1)";
      clipRect.setAttribute("width", String(W - PAD.right + 8));
    });
  }

  function renderScene(sceneId, animate) {
    var scene = SCENES[sceneId];
    if (!scene) return;

    setMonth(scene.month, animate);
    setYear(scene.year, animate);
    dateAnnouncer.textContent = scene.month + " " + scene.year;

    renderChart(scene.chart);
    renderCapabilities(scene.capabilities);
    renderFocusRing(scene.ring);
    copyCount.textContent = scene.copies.count;
    copyCaption.textContent = scene.copies.caption;
    renderCopyGrid(scene.copies.fill);
    renderStats(scene.stats);
    renderTech(scene.tech);
  }

  function switchScene(sceneId) {
    if (sceneId === activeSceneId || !SCENES[sceneId]) return;
    activeSceneId = sceneId;

    if (switchTimer) {
      window.clearTimeout(switchTimer);
    }

    sticky.classList.add("is-switching");
    switchTimer = window.setTimeout(function () {
      renderScene(sceneId, true);
      sticky.classList.remove("is-switching");
      switchTimer = null;
    }, 120);
  }

  function updateActiveScene() {
    ticking = false;

    var targetY = window.innerHeight * 0.38;
    var best = sections[0];
    var bestDistance = Infinity;

    sections.forEach(function (section) {
      var rect = section.element.getBoundingClientRect();
      var center = rect.top + rect.height / 2;
      var distance = Math.abs(center - targetY);

      if (distance < bestDistance) {
        best = section;
        bestDistance = distance;
      }
    });

    if (best && best.id !== activeSceneId) {
      switchScene(best.id);
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateActiveScene);
  }

  buildYearSlot(SCENES[activeSceneId].year);
  renderScene(activeSceneId, false);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    renderScene(activeSceneId, false);
    onScroll();
  });
  updateActiveScene();
})();
