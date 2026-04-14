/* ==========================================================================
   chart.js — Sticky compute chart for LLM history
   Growing single-graph animation: points are added progressively and
   existing points smoothly reposition as the axes zoom out.
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

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---- DOM refs ---- */
  var sticky = document.getElementById("sticky-briefing");
  var panelAnim = document.getElementById("panel-anim");
  var svg = document.getElementById("history-chart");
  var capabilityGrid = document.getElementById("capability-grid");
  var monthCurrent = document.getElementById("date-month-current");
  var monthNext = document.getElementById("date-month-next");
  var yearSlot = document.getElementById("date-year-slot");
  var dateAnnouncer = document.getElementById("date-announcer");

  if (!sticky || !panelAnim || !svg || !capabilityGrid || !monthCurrent ||
      !monthNext || !yearSlot || !dateAnnouncer) {
    return;
  }

  var CHART_POINTS = [
    { label: "2018", compute: 4.41e21 },
    { label: "2020", compute: 2.13e23 },
    { label: "2022", compute: 2.66e24 },
    { label: "2024", compute: 4.40e25 },
    { label: "2026", compute: 4.40e26 }
  ];

  var SCENES = {
    "scene-1": {
      month: "Jan",
      year: "2018",
      chart: {
        pointCount: 2,
        color: "#2b6a4a",
        width: 2.5
      },
      benchmarks: [
        { lane: "Pretrain", label: "GLUE", level: "active", detail: "NLPの総合テスト。2018年ごろの『何でもできる土台』を示した代表格。", replacement: "SuperGLUE" },
        { lane: "Scaling", label: "SQuAD v1.1", level: "mid", detail: "文章を読んで答える読解+Q&Aベンチ。", replacement: "MMLU" },
        { lane: "API", label: "N/A", level: "off", detail: "まだAPI時代の前。研究ベンチが中心だった。", replacement: "HumanEval" },
        { lane: "Chat", label: "N/A", level: "off", detail: "まだ『会話AIの人気順位表』のような物差しは定着していない。", replacement: "Meena SSA" },
        { lane: "Reason", label: "MultiNLI", level: "mid", detail: "二つの文の意味関係を当てる。初期の推論系ベンチ。", replacement: "GSM8K" },
        { lane: "Agents", label: "N/A", level: "off", detail: "エージェント評価はまだほぼ存在しない。", replacement: "WebArena" }
      ]
    },
    "scene-2": {
      month: "Jun",
      year: "2020",
      chart: {
        pointCount: 3,
        color: "#2b6a4a",
        width: 2.5
      },
      benchmarks: [
        { lane: "Pretrain", label: "LAMBADA", level: "active", detail: "長い文脈の次語予測。GPT-3時代の伸びを見せた定番。", replacement: "MMLU" },
        { lane: "Scaling", label: "SuperGLUE", level: "active", detail: "GLUEの次に来た、より難しい総合試験。", replacement: "MMLU-Pro" },
        { lane: "API", label: "HumanEval", level: "active", detail: "コード生成をテストするベンチ。CodexやCopilot時代の象徴。", replacement: "SWE-bench Verified" },
        { lane: "Chat", label: "Meena SSA", level: "mid", detail: "会話がどれだけ自然かを見る初期のチャット評価。", replacement: "Chatbot Arena" },
        { lane: "Reason", label: "GSM8K", level: "mid", detail: "小学校レベルの文章題。reasoningの代表ベンチになった。", replacement: "AIME 2024" },
        { lane: "Agents", label: "N/A", level: "off", detail: "複数ステップの自律行動を測る時代はまだ先。", replacement: "WebArena" }
      ]
    },
    "scene-3": {
      month: "Nov",
      year: "2022",
      chart: {
        pointCount: 4,
        color: "#2b6a4a",
        width: 2.5
      },
      benchmarks: [
        { lane: "Pretrain", label: "MMLU", level: "active", detail: "幅広い科目をまとめて測る総合試験。GPT-4以後の代表指標。", replacement: "MMLU-Pro" },
        { lane: "Scaling", label: "HellaSwag", level: "mid", detail: "常識的な続きを選ぶベンチ。旧世代ベンチの飽和も見えた。", replacement: "GPQA Diamond" },
        { lane: "API", label: "MT-Bench", level: "active", detail: "多ターン会話での受け答えを見る。Chat API時代の比較軸。", replacement: "Arena-Hard" },
        { lane: "Chat", label: "Chatbot Arena", level: "active", detail: "人間の投票で会話モデルを順位付けする有名ベンチ。", replacement: "Arena-Hard" },
        { lane: "Reason", label: "GSM8K", level: "active", detail: "算数文章題。『考えて答える』力の見取り図になった。", replacement: "AIME 2024" },
        { lane: "Agents", label: "WebArena", level: "mid", detail: "ウェブ操作を最後までやり切れるかを見る初期のエージェント評価。", replacement: "BrowseComp" }
      ]
    },
    "scene-4": {
      month: "Sep",
      year: "2024",
      chart: {
        pointCount: 5,
        color: "#2b6a4a",
        width: 2.5
      },
      benchmarks: [
        { lane: "Pretrain", label: "MMLU-Pro", level: "mid", detail: "MMLUが簡単になり始めたので作られた後継ベンチ。", replacement: "LiveBench" },
        { lane: "Scaling", label: "GPQA Diamond", level: "active", detail: "博士レベル理系の難問。知識より深い推論が問われる。", replacement: "HLE" },
        { lane: "API", label: "ToolBench", level: "active", detail: "外部ツールを正しく選んで使えるかを見る。", replacement: "Terminal-Bench" },
        { lane: "Chat", label: "Arena-Hard", level: "active", detail: "上位モデルの差を見分けやすい、より厳しい会話評価。", replacement: "Chatbot Arena" },
        { lane: "Reason", label: "AIME 2024", level: "active", detail: "数学オリンピック予選級の問題。reasoning modelの伸びが出やすい。", replacement: "FrontierMath" },
        { lane: "Agents", label: "SWE-bench Verified", level: "active", detail: "実在GitHub issueを直せるかを見る、定番のコーディング評価。", replacement: "Terminal-Bench" }
      ]
    },
    "scene-5": {
      month: "Jan",
      year: "2026",
      chart: {
        pointCount: 5,
        color: "#2b6a4a",
        width: 2.5
      },
      benchmarks: [
        { lane: "Pretrain", label: "LiveBench", level: "mid", detail: "問題を継続更新して、ベンチ汚染を避けようとする新世代の総合評価。", replacement: "ongoing" },
        { lane: "Scaling", label: "HLE", level: "active", detail: "Humanity's Last Exam。古い総合試験の天井を越えるための超難問。", replacement: "ongoing" },
        { lane: "API", label: "BrowseComp", level: "mid", detail: "ウェブを粘り強く調べて答えを見つけられるかを見る。", replacement: "ongoing" },
        { lane: "Chat", label: "Chatbot Arena", level: "mid", detail: "今も『会話としてどちらが良いか』を見る代表的な人気指標。", replacement: "ongoing" },
        { lane: "Reason", label: "FrontierMath", level: "active", detail: "未公開の難問数学。上位モデルでもまだかなり難しい。", replacement: "ongoing" },
        { lane: "Agents", label: "Terminal-Bench", level: "active", detail: "ターミナルで長い作業をやり切れるかを見る、エージェント時代の重要ベンチ。", replacement: "ongoing" }
      ]
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

  function renderBenchmarks(items) {
    clearNode(capabilityGrid);

    items.forEach(function (item) {
      var chip = document.createElement("div");
      chip.className = "capability-chip";
      if (item.level === "active") chip.classList.add("is-active");
      if (item.level === "mid") chip.classList.add("is-mid");

      chip.title = item.lane + ": " + item.label + "\n" + item.detail +
        (item.replacement && item.replacement !== "ongoing" ? "\nnext: " + item.replacement : "");
      chip.setAttribute("aria-label", item.lane + ": " + item.label);

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

  /* ====================================================================
     Persistent chart — smooth grow / zoom-out animation
     ==================================================================== */
  var W = 430;
  var H = 152;
  var PAD = { top: 12, right: 18, bottom: 22, left: 34 };
  var BASE = H - PAD.bottom;
  var usableW = W - PAD.right - PAD.left;
  var usableH = BASE - PAD.top;
  var ANIM_MS = 650;

  var crt = {
    ready: false,
    count: 0,
    positions: [],
    livePositions: [],
    liveCount: 0,
    dMin: 0,
    dMax: 0,
    animId: null,
    el: {}
  };

  function computeLayout(n) {
    var pts = CHART_POINTS.slice(0, n);
    var logs = pts.map(function (p) { return Math.log(p.compute) / Math.LN10; });
    var lo = Math.min.apply(null, logs);
    var hi = Math.max.apply(null, logs);
    var span = hi - lo;
    var yPad = span > 0 ? span * 0.16 : 0.7;
    var dMin = lo - yPad;
    var dMax = hi + yPad;
    var dRange = dMax - dMin || 1;
    var lIn = n === 1 ? 0.5 : 0.03;
    var rIn = n === 1 ? 0.5 : 0.97;

    return {
      positions: pts.map(function (p, i) {
        var xR = n === 1 ? 0.5 : lIn + (rIn - lIn) * (i / (n - 1));
        var logV = Math.log(p.compute) / Math.LN10;
        var yR = (logV - dMin) / dRange;
        return { x: PAD.left + usableW * xR, y: BASE - usableH * yR };
      }),
      dMin: dMin,
      dMax: dMax,
      dRange: dRange
    };
  }

  function buildTicks(dMin, dMax) {
    var ticks = [];
    var tMin = Math.ceil(dMin);
    var tMax = Math.floor(dMax);
    var step = Math.max(1, Math.ceil((tMax - tMin + 1) / 3));
    for (var e = tMin; e <= tMax; e += step) { ticks.push(e); }
    if (!ticks.length || ticks[ticks.length - 1] !== tMax) { ticks.push(tMax); }
    return ticks;
  }

  function initChartSvg() {
    clearNode(svg);

    svg.appendChild(svgEl("title", { id: "chart-title-svg" })).textContent =
      "Scroll-synced frontier training compute chart";
    svg.appendChild(svgEl("desc", { id: "chart-desc-svg" })).textContent =
      "Each point is the mean Training compute of the top two models available by that date, derived from the CC-BY EPOCH AI model index.";

    crt.el.gridGroup = svgEl("g");
    svg.appendChild(crt.el.gridGroup);

    crt.el.axisLabel = svgEl("text", {
      x: "4", y: String(PAD.top + 2),
      fill: "rgba(116,110,99,0.38)",
      "font-family": "'IBM Plex Mono', monospace",
      "font-size": "7",
      "letter-spacing": "0.08em"
    });
    crt.el.axisLabel.textContent = "FLOP";
    svg.appendChild(crt.el.axisLabel);

    for (var i = 1; i <= 4; i += 1) {
      var x = PAD.left + usableW * (i / 5);
      svg.appendChild(svgEl("line", {
        x1: x, y1: PAD.top + 4, x2: x, y2: BASE,
        stroke: "rgba(17,17,17,0.05)", "stroke-width": "1"
      }));
    }

    crt.el.content = svgEl("g");
    svg.appendChild(crt.el.content);

    crt.el.path = svgEl("path", {
      fill: "none",
      stroke: "#2b6a4a",
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-opacity": "0.9",
      d: ""
    });
    crt.el.content.appendChild(crt.el.path);

    crt.el.dots = [];
    for (var j = 0; j < CHART_POINTS.length; j += 1) {
      var dot = svgEl("circle", {
        cx: "0", cy: "0", r: "2.4",
        fill: "#2b6a4a", stroke: "#2b6a4a",
        "stroke-width": "1.2", "fill-opacity": "0.78",
        opacity: "0"
      });
      crt.el.content.appendChild(dot);
      crt.el.dots.push(dot);
    }

    crt.el.startLabel = svgEl("text", {
      x: String(PAD.left), y: String(H - 4),
      fill: "#746e63",
      "font-family": "'IBM Plex Mono', monospace",
      "font-size": "10"
    });
    svg.appendChild(crt.el.startLabel);

    crt.el.endLabel = svgEl("text", {
      x: String(W - PAD.right), y: String(H - 4),
      fill: "#746e63",
      "font-family": "'IBM Plex Mono', monospace",
      "font-size": "10",
      "text-anchor": "end"
    });
    svg.appendChild(crt.el.endLabel);

    crt.ready = true;
  }

  function drawGrid(dMin, dMax, dRange) {
    clearNode(crt.el.gridGroup);
    var ticks = buildTicks(dMin, dMax);
    ticks.forEach(function (exp) {
      var y = BASE - usableH * ((exp - dMin) / dRange);
      crt.el.gridGroup.appendChild(svgEl("line", {
        x1: PAD.left, y1: y, x2: W - PAD.right, y2: y,
        stroke: "rgba(17,17,17,0.06)", "stroke-width": "1"
      }));
      var lbl = svgEl("text", {
        x: String(PAD.left - 6), y: String(y + 3),
        fill: "rgba(116,110,99,0.48)",
        "font-family": "'IBM Plex Mono', monospace",
        "font-size": "8", "text-anchor": "end"
      });
      lbl.textContent = "1e" + exp;
      crt.el.gridGroup.appendChild(lbl);
    });
  }

  function paintDots(positions, targetN, color, opacities) {
    for (var i = 0; i < crt.el.dots.length; i += 1) {
      var dot = crt.el.dots[i];
      var op = opacities ? opacities[i] : (i < targetN ? 1 : 0);
      if (i < positions.length && op > 0.001) {
        var isLast = (i === targetN - 1);
        dot.setAttribute("cx", positions[i].x);
        dot.setAttribute("cy", positions[i].y);
        dot.setAttribute("r", isLast ? "3.5" : "2.4");
        dot.setAttribute("fill", isLast ? "#f7f1e5" : color);
        dot.setAttribute("stroke", color);
        dot.setAttribute("stroke-width", isLast ? "1.8" : "1.2");
        dot.setAttribute("fill-opacity", isLast ? "1" : "0.78");
        dot.setAttribute("opacity", String(op));
      } else {
        dot.setAttribute("opacity", "0");
      }
    }
  }

  function renderChart(chartData) {
    if (!crt.ready) initChartSvg();

    var targetN = chartData.pointCount;
    var color = chartData.color;
    var target = computeLayout(targetN);

    /* — First render: instant, no animation — */
    if (crt.count === 0) {
      crt.positions = target.positions;
      crt.livePositions = target.positions;
      crt.liveCount = targetN;
      crt.dMin = target.dMin;
      crt.dMax = target.dMax;
      crt.count = targetN;
      drawGrid(target.dMin, target.dMax, target.dRange);
      if (target.positions.length > 1) {
        crt.el.path.setAttribute("d", linePath(target.positions));
      }
      paintDots(target.positions, targetN, color, null);
      crt.el.startLabel.textContent = CHART_POINTS[0].label;
      crt.el.endLabel.textContent = CHART_POINTS[targetN - 1].label;
      return;
    }

    /* — Same point count: nothing to animate — */
    if (targetN === crt.count) return;

    /* — Cancel any running animation — */
    if (crt.animId) { cancelAnimationFrame(crt.animId); crt.animId = null; }

    /* — Build from-positions (use live mid-animation positions if any) — */
    var fromPos = crt.livePositions.slice();
    var fromN = crt.liveCount;
    var maxN = Math.max(fromN, targetN);

    while (fromPos.length < maxN) {
      var last = fromPos[fromPos.length - 1];
      fromPos.push({ x: last.x, y: last.y });
    }

    var targetPad = target.positions.slice();
    while (targetPad.length < maxN) {
      var tLast = targetPad[targetPad.length - 1];
      targetPad.push({ x: tLast.x, y: tLast.y });
    }

    /* Update labels & grid immediately */
    crt.el.startLabel.textContent = CHART_POINTS[0].label;
    crt.el.endLabel.textContent = CHART_POINTS[targetN - 1].label;
    drawGrid(target.dMin, target.dMax, target.dRange);

    var startTime = null;

    function frame(ts) {
      if (!startTime) startTime = ts;
      var raw = Math.min((ts - startTime) / ANIM_MS, 1);
      var t = easeOutCubic(raw);

      var interp = [];
      var ops = [];

      for (var i = 0; i < maxN; i += 1) {
        interp.push({
          x: lerp(fromPos[i].x, targetPad[i].x, t),
          y: lerp(fromPos[i].y, targetPad[i].y, t)
        });

        if (i < Math.min(fromN, targetN)) {
          ops.push(1);
        } else if (i >= fromN && i < targetN) {
          ops.push(Math.min(1, t * 2));
        } else if (i >= targetN && i < fromN) {
          ops.push(Math.max(0, 1 - t * 2));
        } else {
          ops.push(0);
        }
      }

      /* Path through all points that have any visibility */
      var pathPts = [];
      for (var k = 0; k < maxN; k += 1) {
        if (ops[k] > 0.001) pathPts.push(interp[k]);
      }
      if (pathPts.length > 1) {
        crt.el.path.setAttribute("d", linePath(pathPts));
        crt.el.path.style.opacity = "1";
      } else {
        crt.el.path.style.opacity = "0";
      }

      paintDots(interp, targetN, color, ops);

      /* Keep live state for mid-animation interrupts */
      crt.livePositions = interp;
      crt.liveCount = targetN;

      if (raw < 1) {
        crt.animId = requestAnimationFrame(frame);
      } else {
        crt.positions = target.positions;
        crt.livePositions = target.positions;
        crt.liveCount = targetN;
        crt.dMin = target.dMin;
        crt.dMax = target.dMax;
        crt.count = targetN;
        crt.animId = null;
      }
    }

    crt.animId = requestAnimationFrame(frame);
  }

  /* ---- Scene rendering (chart animates; benchmarks swap instantly) ---- */

  function renderScene(sceneId, animate) {
    var scene = SCENES[sceneId];
    if (!scene) return;

    setMonth(scene.month, animate);
    setYear(scene.year, animate);
    dateAnnouncer.textContent = scene.month + " " + scene.year;
    renderChart(scene.chart);
    renderBenchmarks(scene.benchmarks);
  }

  function switchScene(sceneId) {
    if (sceneId === activeSceneId || !SCENES[sceneId]) return;
    activeSceneId = sceneId;

    if (switchTimer) {
      window.clearTimeout(switchTimer);
      switchTimer = null;
    }

    renderScene(sceneId, true);
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
    /* SVG viewBox handles scaling; only re-sync active scene */
    crt.count = 0;
    crt.ready = false;
    renderScene(activeSceneId, false);
    onScroll();
  });
  updateActiveScene();
  });
})();
