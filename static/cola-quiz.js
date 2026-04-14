(function () {
  "use strict";

  /* -----------------------------------------------------------------------
   *  CoLA ミニクイズ — 厳選10問 + 日本語解説
   *  データ出典: CoLA (Corpus of Linguistic Acceptability)
   *    Warstadt et al., 2019 — CC-0 ライセンス
   * --------------------------------------------------------------------- */

  var QUESTIONS = [
    {
      sentence: "Us love they.",
      label: 0,
      explanation:
        "主語に目的格の \"Us\"、目的語に主格の \"they\" を使っています。英語の代名詞には「格」があり、" +
        "主語には主格（We）、目的語には目的格（them）を使います。正しくは \"We love them.\" です。" +
        "日本語には代名詞の格変化がないため、間違えやすいポイントです。",
    },
    {
      sentence: "Mickey looked up it.",
      label: 0,
      explanation:
        "\"look up\"（調べる）のような句動詞（phrasal verb）では、目的語が代名詞のとき " +
        "動詞と副詞の間に置くルールがあります。正しくは \"Mickey looked it up.\" です。" +
        "名詞なら \"looked up the word\" も可ですが、代名詞は必ず間に入れます。",
    },
    {
      sentence: "The sailors rode the breeze clear of the rocks.",
      label: 1,
      explanation:
        "正しい英文です。\"ride ... clear of ~\" で「〜に乗って〜から離れる」という結果構文（resultative construction）です。" +
        "水夫たちが風に乗って岩から離れた、という情景が描かれています。",
    },
    {
      sentence: "many information was provided.",
      label: 0,
      explanation:
        "\"information\" は不可算名詞なので \"many\" は使えません。" +
        "不可算名詞には \"much\" を使います。正しくは \"Much information was provided.\" です。" +
        "日本語では「多くの情報」と違和感なく言えるので、混同しやすいポイントです。",
    },
    {
      sentence: "Sharon came the room.",
      label: 0,
      explanation:
        "\"come\" は自動詞なので直接目的語を取れません。" +
        "正しくは \"Sharon came into the room.\" のように前置詞が必要です。" +
        "日本語の「部屋に来た」から直訳すると前置詞を忘れがちです。",
    },
    {
      sentence: "If he were a rich man, he'd buy a diamond ring.",
      label: 1,
      explanation:
        "正しい仮定法過去の文です。「現実と違う仮定」を表すとき、条件節では人称に関係なく " +
        "\"were\" を使います（\"If I were ...\" \"If he were ...\"）。" +
        "帰結節は \"would + 動詞の原形\" です。",
    },
    {
      sentence: "Sally kissed himself.",
      label: 0,
      explanation:
        "再帰代名詞の性が一致していません。Sally は女性なので \"himself\"（男性）ではなく " +
        "\"herself\"（女性）を使う必要があります。正しくは \"Sally kissed herself.\" です。" +
        "日本語の「自分」には性別がないので見落としやすいポイントです。",
    },
    {
      sentence: "The farmer loaded the cart with apples.",
      label: 1,
      explanation:
        "正しい英文です。\"load A with B\"（A に B を積む）は正しい構文です。" +
        "\"The farmer loaded apples onto the cart.\" という言い方もできます。",
    },
    {
      sentence: "Did the child be in the school?",
      label: 0,
      explanation:
        "助動詞 \"do\" は一般動詞の疑問文に使うもので、be 動詞には使えません。" +
        "正しくは \"Was the child in the school?\" です。" +
        "日本語には助動詞の使い分けがないので、英語学習者がよく間違えるパターンです。",
    },
    {
      sentence: "Sue gave to Bill a book.",
      label: 0,
      explanation:
        "英語の与格構文（give）には二つの正しい形があります。" +
        "\"Sue gave Bill a book\"（二重目的語）か \"Sue gave a book to Bill\"（前置詞構文）。" +
        "この文はその二つが混ざっており、\"to Bill\" を動詞の直後に置いてしまっています。",
    },
  ];

  var MODEL_BASELINES = [
    { name: "OpenAI GPT", score: 45.4 },
    { name: "BERT-base", score: 52.1 },
    { name: "BERT-large", score: 60.5 },
  ];

  /* ---------- ユーティリティ ---------- */

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function getResultSummary(pct) {
    if (pct > MODEL_BASELINES[2].score) {
      return "このスコアは、当時の BERT-large（60.5%）より上です。";
    }

    if (pct > MODEL_BASELINES[1].score) {
      return (
        "OpenAI GPT（45.4%）と BERT-base（52.1%）は上回りましたが、" +
        "BERT-large（60.5%）には届きませんでした。"
      );
    }

    if (pct > MODEL_BASELINES[0].score) {
      return (
        "OpenAI GPT（45.4%）は上回りましたが、" +
        "BERT-base（52.1%）と BERT-large（60.5%）には届きませんでした。"
      );
    }

    return (
      "このスコアは、当時の OpenAI GPT（45.4%）、BERT-base（52.1%）、" +
      "BERT-large（60.5%）より下です。"
    );
  }

  function getResultHtml(pct, correctCount) {
    var emoji = pct >= 80 ? "🏆" : pct >= 50 ? "👏" : "📖";
    var solvedCount = typeof correctCount === "number" ? correctCount : state.correct;
    return (
      emoji +
      " <strong>" +
      state.questions.length +
      " 問中 " +
      solvedCount +
      " 問正解</strong>（正答率 " +
      pct +
      "%）" +
      "<br><span>" +
      getResultSummary(pct) +
      "</span>" +
      "<span>参考値: OpenAI GPT 45.4%、BERT-base 52.1%、BERT-large 60.5%。</span>"
    );
  }

  function getMaxModalHeight() {
    var overlayStyle = window.getComputedStyle(modal);
    return (
      window.innerHeight -
      parseFloat(overlayStyle.paddingTop || 0) -
      parseFloat(overlayStyle.paddingBottom || 0)
    );
  }

  function renderQuestionForMeasurement(container, question, answered) {
    var body = container.querySelector(".cola-modal-body");
    var result = container.querySelector(".cola-modal-result");
    var feedback = container.querySelector(".cola-feedback");
    var nextBtn = container.querySelector(".cola-btn-next");

    body.hidden = false;
    result.hidden = true;

    container.querySelector(".cola-progress").textContent =
      "第 " + QUESTIONS.length + " 問 / " + QUESTIONS.length + " 問";
    container.querySelector(".cola-sentence").textContent = question.sentence;
    container.querySelector(".cola-actions").hidden = false;

    if (answered) {
      feedback.hidden = false;
      feedback.className = "cola-feedback cola-feedback-wrong";
      feedback.innerHTML =
        "<strong>不正解…</strong>" +
        "<span>この文は" +
        (question.label === 1 ? "文法的に<strong>正しい</strong>" : "文法的に<strong>間違い</strong>") +
        "です。</span>" +
        "<p>" +
        escapeHtml(question.explanation) +
        "</p>";
      nextBtn.hidden = false;
      nextBtn.textContent = "結果を見る →";
    } else {
      feedback.hidden = true;
      feedback.textContent = "";
      feedback.className = "cola-feedback";
      nextBtn.hidden = true;
    }
  }

  function renderResultForMeasurement(container, pct) {
    container.querySelector(".cola-modal-body").hidden = true;
    var result = container.querySelector(".cola-modal-result");
    result.hidden = false;
    result.querySelector(".cola-result-text").innerHTML = getResultHtml(
      pct,
      Math.round((pct / 100) * state.questions.length)
    );
  }

  function stabilizeModalHeight() {
    if (!modal || modal.hidden) return;

    var card = modal.querySelector(".cola-modal");
    var probe = card.cloneNode(true);
    var sampleScores = [0, 50, 60, 70, 100];
    var maxHeight = 0;

    probe.style.position = "absolute";
    probe.style.left = "-9999px";
    probe.style.top = "0";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.height = "auto";
    probe.style.maxHeight = getMaxModalHeight() + "px";

    modal.appendChild(probe);

    for (var i = 0; i < QUESTIONS.length; i++) {
      renderQuestionForMeasurement(probe, QUESTIONS[i], false);
      maxHeight = Math.max(maxHeight, probe.offsetHeight);

      renderQuestionForMeasurement(probe, QUESTIONS[i], true);
      maxHeight = Math.max(maxHeight, probe.offsetHeight);
    }

    for (var j = 0; j < sampleScores.length; j++) {
      renderResultForMeasurement(probe, sampleScores[j]);
      maxHeight = Math.max(maxHeight, probe.offsetHeight);
    }

    modal.removeChild(probe);
    card.style.height = Math.min(maxHeight, getMaxModalHeight()) + "px";
  }

  /* ---------- モーダル生成 ---------- */

  var modal = null;
  var state = null;

  function createModal() {
    if (modal) return modal;

    var overlay = document.createElement("div");
    overlay.className = "cola-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "CoLA クイズ");

    overlay.innerHTML =
      '<div class="cola-modal">' +
      '  <button class="cola-modal-close" type="button" aria-label="閉じる">&times;</button>' +
      '  <div class="cola-modal-header">' +
      '    <h4>CoLA ミニクイズ</h4>' +
      '    <p class="cola-modal-sub">提示された英文が<strong>文法的に正しいかどうか</strong>を判定してください。</p>' +
      '  </div>' +
      '  <div class="cola-modal-body">' +
      '    <p class="cola-progress"></p>' +
      '    <blockquote class="cola-sentence"></blockquote>' +
      '    <div class="cola-actions">' +
      '      <button class="cola-btn cola-btn-ok" type="button">✅ 正しい</button>' +
      '      <button class="cola-btn cola-btn-ng" type="button">❌ 間違い</button>' +
      '    </div>' +
      '    <div class="cola-feedback" hidden></div>' +
      '    <button class="cola-btn cola-btn-next" type="button" hidden>次の問題へ →</button>' +
      '  </div>' +
      '  <div class="cola-modal-result" hidden>' +
      '    <p class="cola-result-text"></p>' +
      '    <button class="cola-btn cola-btn-retry" type="button">もう一度プレイ</button>' +
      '  </div>' +
      '  <p class="cola-license">データ出典: <a href="https://nyu-mll.github.io/CoLA/" target="_blank" rel="noopener">CoLA</a>' +
      '  (Warstadt et al., 2019) — <strong>CC-0</strong> (パブリックドメイン)</p>' +
      "</div>";

    overlay.querySelector(".cola-modal-close").addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelector(".cola-btn-ok").addEventListener("click", function () {
      answer(1);
    });
    overlay.querySelector(".cola-btn-ng").addEventListener("click", function () {
      answer(0);
    });
    overlay.querySelector(".cola-btn-next").addEventListener("click", nextQuestion);
    overlay.querySelector(".cola-btn-retry").addEventListener("click", startQuiz);

    document.body.appendChild(overlay);
    modal = overlay;
    return overlay;
  }

  /* ---------- クイズ制御 ---------- */

  function startQuiz() {
    state = {
      questions: shuffleArray(QUESTIONS.slice()),
      index: 0,
      correct: 0,
      answered: false,
    };

    var m = modal;
    m.querySelector(".cola-modal-body").hidden = false;
    m.querySelector(".cola-modal-result").hidden = true;
    showQuestion();
  }

  function showQuestion() {
    var m = modal;
    var q = state.questions[state.index];
    state.answered = false;

    m.querySelector(".cola-progress").textContent =
      "第 " + (state.index + 1) + " 問 / " + state.questions.length + " 問";
    m.querySelector(".cola-sentence").textContent = q.sentence;

    var actions = m.querySelector(".cola-actions");
    actions.hidden = false;
    var btns = actions.querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = false;
      btns[i].classList.remove("cola-btn-selected", "cola-btn-correct-answer", "cola-btn-wrong-answer");
    }

    m.querySelector(".cola-feedback").hidden = true;
    m.querySelector(".cola-feedback").textContent = "";
    m.querySelector(".cola-feedback").className = "cola-feedback";
    m.querySelector(".cola-btn-next").hidden = true;
  }

  function answer(userAnswer) {
    if (state.answered) return;
    state.answered = true;

    var q = state.questions[state.index];
    var isCorrect = userAnswer === q.label;
    if (isCorrect) state.correct++;

    var m = modal;
    var btnOk = m.querySelector(".cola-btn-ok");
    var btnNg = m.querySelector(".cola-btn-ng");

    btnOk.disabled = true;
    btnNg.disabled = true;

    /* highlight user's choice */
    if (userAnswer === 1) btnOk.classList.add("cola-btn-selected");
    else btnNg.classList.add("cola-btn-selected");

    /* highlight correct answer */
    if (q.label === 1) btnOk.classList.add("cola-btn-correct-answer");
    else btnNg.classList.add("cola-btn-correct-answer");

    /* highlight wrong if user was wrong */
    if (!isCorrect) {
      if (userAnswer === 1) btnOk.classList.add("cola-btn-wrong-answer");
      else btnNg.classList.add("cola-btn-wrong-answer");
    }

    var fb = m.querySelector(".cola-feedback");
    fb.hidden = false;
    fb.className = "cola-feedback " + (isCorrect ? "cola-feedback-correct" : "cola-feedback-wrong");
    fb.innerHTML =
      "<strong>" +
      (isCorrect ? "正解！ 🎉" : "不正解…") +
      "</strong>" +
      "<span>この文は" +
      (q.label === 1 ? "文法的に<strong>正しい</strong>" : "文法的に<strong>間違い</strong>") +
      "です。</span>" +
      "<p>" +
      escapeHtml(q.explanation) +
      "</p>";

    var isLast = state.index >= state.questions.length - 1;
    var nextBtn = m.querySelector(".cola-btn-next");
    if (!isLast) {
      nextBtn.hidden = false;
      nextBtn.textContent = "次の問題へ →";
    } else {
      nextBtn.hidden = false;
      nextBtn.textContent = "結果を見る →";
    }
  }

  function nextQuestion() {
    state.index++;
    if (state.index >= state.questions.length) {
      showResult();
    } else {
      showQuestion();
    }
  }

  function showResult() {
    var m = modal;
    m.querySelector(".cola-modal-body").hidden = true;
    var result = m.querySelector(".cola-modal-result");
    result.hidden = false;

    var pct = Math.round((state.correct / state.questions.length) * 100);
    result.querySelector(".cola-result-text").innerHTML = getResultHtml(pct);
  }

  /* ---------- 開閉 ---------- */

  function openModal() {
    createModal();
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    startQuiz();
    stabilizeModalHeight();
    modal.querySelector(".cola-modal-close").focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  /* Escape キーで閉じる */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  window.addEventListener("resize", stabilizeModalHeight);

  /* ---------- ボタン有効化 ---------- */

  function init() {
    var btn = document.querySelector("#cola-quiz-trigger");
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = "GLUE の一部である CoLA を実際にプレイしてみる";
    btn.addEventListener("click", openModal);
  }

  /* section が動的に読み込まれるので MutationObserver で待つ */
  if (document.querySelector("#cola-quiz-trigger")) {
    init();
  } else {
    var observer = new MutationObserver(function () {
      if (document.querySelector("#cola-quiz-trigger")) {
        observer.disconnect();
        init();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
