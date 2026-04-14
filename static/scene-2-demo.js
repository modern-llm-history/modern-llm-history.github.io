(function () {
  "use strict";

  var TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1";
  var SARASHINA_CHAT_TEMPLATE_URL =
    "https://huggingface.co/keisuke-miyako/sarashina2.2-0.5b-instruct-v0.1-onnx-int4/raw/main/chat_template.jinja";

  var FALLBACK_SARASHINA_TEMPLATE = [
    "{%- for message in messages %}",
    "{%- if message['role'] == 'user' %}",
    "{{- '<|user|>' + message['content'] + eos_token -}}",
    "{%- elif message['role'] == 'system' %}",
    "{{- '<|system|>' + message['content'] + eos_token -}}",
    "{%- elif message['role'] == 'assistant' %}",
    "{{- '<|assistant|>' + message['content'] + eos_token -}}",
    "{%- endif %}",
    "{%- endfor %}",
    "{%- if add_generation_prompt %}",
    "{{- '<|assistant|>' -}}",
    "{%- endif %}",
  ].join("");

  function hasWebGpuSupport() {
    return typeof navigator !== "undefined" && !!navigator.gpu;
  }

  function webGpuHint() {
    return "このモデルは WebGPU 対応の Chrome / Edge 系ブラウザが必要です。";
  }

  var webGpuAvailability = {
    checked: false,
    available: false,
    promise: null,
  };

  function checkWebGpuAvailability() {
    if (webGpuAvailability.checked) {
      return Promise.resolve(webGpuAvailability.available);
    }
    if (webGpuAvailability.promise) {
      return webGpuAvailability.promise;
    }
    if (!hasWebGpuSupport()) {
      webGpuAvailability.checked = true;
      webGpuAvailability.available = false;
      return Promise.resolve(false);
    }

    webGpuAvailability.promise = navigator.gpu.requestAdapter()
      .then(function (adapter) {
        webGpuAvailability.checked = true;
        webGpuAvailability.available = !!adapter;
        return webGpuAvailability.available;
      })
      .catch(function () {
        webGpuAvailability.checked = true;
        webGpuAvailability.available = false;
        return false;
      })
      .finally(function () {
        webGpuAvailability.promise = null;
      });

    return webGpuAvailability.promise;
  }

  var MODEL_SPECS = {
    base: {
      label: "非 instruct モデル",
      repo: "saldra/rinna-japanese-gpt2-xsmall-onnx",
      getLoadVariants: function () {
        return [
          {
            note: "WASM / fp32",
            options: {
              device: "wasm",
              dtype: "fp32",
              subfolder: "onnx",
              model_file_name: "decoder_model_merged",
            },
          },
          {
            note: "WASM / q8",
            options: {
              device: "wasm",
              dtype: "q8",
              subfolder: "onnx",
              model_file_name: "decoder_model_merged",
            },
          },
        ];
      },
      generation: {
        max_new_tokens: 96,
        do_sample: false,
        repetition_penalty: 1.05,
        no_repeat_ngram_size: 3,
      },
      preparePrompt: function (loaded, prompt) {
        return prompt;
      },
    },
    instruct: {
      label: "instruct モデル",
      repo: "keisuke-miyako/sarashina2.2-0.5b-instruct-v0.1-onnx-int4",
      requiresWebGpu: true,
      getLoadVariants: function () {
        if (!hasWebGpuSupport()) {
          return [];
        }

        return [{
          note: "WebGPU / fp32",
          options: {
            device: "webgpu",
            dtype: "fp32",
            subfolder: "",
            model_file_name: "model",
            session_options: {
              externalData: [{ path: "model.onnx.data", data: "model.onnx.data" }],
            },
            config: {
              model_type: "llama",
              architectures: ["LlamaForCausalLM"],
              hidden_size: 1280,
              num_hidden_layers: 24,
              num_attention_heads: 16,
              num_key_value_heads: 8,
              head_dim: 80,
              vocab_size: 102400,
              max_position_embeddings: 8192,
              bos_token_id: 1,
              eos_token_id: 2,
              pad_token_id: 2,
              use_cache: true,
            },
          },
        }];
      },
      generation: {
        max_new_tokens: 80,
        do_sample: false,
        repetition_penalty: 1.03,
        no_repeat_ngram_size: 4,
      },
      preparePrompt: function (loaded, prompt) {
        var template = loaded.chatTemplate || FALLBACK_SARASHINA_TEMPLATE;
        return loaded.tokenizer.apply_chat_template(
          [{ role: "user", content: prompt }],
          {
            tokenize: false,
            add_generation_prompt: true,
            chat_template: template,
          }
        );
      },
      extraLoad: function () {
        return fetchText(SARASHINA_CHAT_TEMPLATE_URL, FALLBACK_SARASHINA_TEMPLATE);
      },
    },
  };

  var transformersPromise = null;

  function ready(fn) {
    if (window.__sectionsReady && typeof window.__sectionsReady.then === "function") {
      window.__sectionsReady.then(fn);
      return;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
      return;
    }
    fn();
  }

  function formatBytes(bytes) {
    if (!bytes || !isFinite(bytes) || bytes <= 0) {
      return null;
    }
    var units = ["B", "KB", "MB", "GB"];
    var value = bytes;
    var unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1) + " " + units[unitIndex];
  }

  function fetchText(url, fallback) {
    return fetch(url, { credentials: "omit" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.text();
      })
      .catch(function () {
        return fallback;
      });
  }

  function loadTransformers() {
    if (!transformersPromise) {
      transformersPromise = import(TRANSFORMERS_URL);
    }
    return transformersPromise;
  }

  function setStatus(modelUi, text, isError) {
    modelUi.status.textContent = text;
    modelUi.status.style.color = isError ? "#9f2d21" : "";
  }

  function setOutput(modelUi, text) {
    modelUi.output.textContent = text;
  }

  function setProgress(modelUi, percent, hidden) {
    if (hidden) {
      modelUi.progress.hidden = true;
      modelUi.progressBar.style.width = "0%";
      return;
    }
    modelUi.progress.hidden = false;
    modelUi.progressBar.style.width = Math.max(0, Math.min(100, percent || 0)) + "%";
  }

  function formatLoadFailure(spec, errors) {
    var details = errors.join(" / ");
    if (spec.requiresWebGpu) {
      return details ? webGpuHint() + " " + details : webGpuHint();
    }
    return details;
  }

  function createProgressHandler(spec, modelUi) {
    return function (info) {
      if (!info || !info.status) {
        return;
      }

      if (info.status === "progress_total") {
        var loadedText = formatBytes(info.loaded);
        var totalText = formatBytes(info.total);
        var summary = spec.label + " を読み込み中";
        if (loadedText && totalText) {
          summary += " (" + loadedText + " / " + totalText + ")";
        }
        setStatus(modelUi, summary);
        setProgress(modelUi, info.progress, false);
        return;
      }

      if (info.status === "progress") {
        var detail = info.file ? " " + info.file : "";
        setStatus(modelUi, "ファイルを取得中:" + detail);
        if (typeof info.progress === "number") {
          setProgress(modelUi, info.progress, false);
        }
        return;
      }

      if (info.status === "initiate" || info.status === "download") {
        setStatus(modelUi, "ダウンロード開始: " + info.file);
        setProgress(modelUi, 0, false);
        return;
      }

      if (info.status === "done") {
        setStatus(modelUi, "取得完了: " + info.file);
        return;
      }

      if (info.status === "ready") {
        setStatus(modelUi, spec.label + " の準備ができました。");
        setProgress(modelUi, 100, false);
      }
    };
  }

  function trimPromptEcho(tokenizer, promptText, generatedIds) {
    var decoded = tokenizer.batch_decode(generatedIds, { skip_special_tokens: true })[0] || "";
    var promptIds = tokenizer(promptText, { add_special_tokens: false }).input_ids;
    var promptDecoded = tokenizer.batch_decode(promptIds, { skip_special_tokens: true })[0] || "";

    if (promptDecoded && decoded.indexOf(promptDecoded) === 0) {
      return decoded.slice(promptDecoded.length).trim();
    }

    return decoded.trim();
  }

  function initDemo(root) {
    if (root.dataset.demoReady === "true") {
      return;
    }
    root.dataset.demoReady = "true";

    var consent = root.querySelector("[data-demo-consent]");
    var promptInput = root.querySelector("[data-demo-prompt]");
    var runBothButton = root.querySelector("[data-run-both]");
    var modelUis = {};
    var modelState = {};
    var runningCount = 0;

    Object.keys(MODEL_SPECS).forEach(function (modelId) {
      var section = root.querySelector('[data-demo-model="' + modelId + '"]');
      modelUis[modelId] = {
        section: section,
        button: section.querySelector('[data-run-model="' + modelId + '"]'),
        status: section.querySelector("[data-model-status]"),
        progress: section.querySelector("[data-model-progress]"),
        progressBar: section.querySelector("[data-model-progress-bar]"),
        output: section.querySelector("[data-model-output]"),
      };
      modelState[modelId] = {
        loaded: null,
        loadPromise: null,
        runPromise: null,
      };
    });

    function syncDisabledState() {
      Object.keys(modelUis).forEach(function (modelId) {
        var spec = MODEL_SPECS[modelId];
        var disabled = !consent.checked || runningCount > 0;

        if (spec.requiresWebGpu && !webGpuAvailability.checked) {
          disabled = true;
          if (consent.checked) {
            setStatus(modelUis[modelId], "WebGPU の有無を確認しています...");
          }
        } else if (spec.requiresWebGpu && !webGpuAvailability.available) {
          disabled = true;
          if (consent.checked) {
            setStatus(modelUis[modelId], webGpuHint(), true);
          }
        }

        modelUis[modelId].button.disabled = disabled;
      });
      runBothButton.disabled =
        !consent.checked ||
        runningCount > 0 ||
        !webGpuAvailability.checked ||
        Object.keys(MODEL_SPECS).some(function (modelId) {
          return MODEL_SPECS[modelId].requiresWebGpu && !webGpuAvailability.available;
        });
    }

    function setRunning(active) {
      runningCount += active ? 1 : -1;
      if (runningCount < 0) {
        runningCount = 0;
      }
      syncDisabledState();
    }

    async function ensureLoaded(modelId) {
      var state = modelState[modelId];
      var spec = MODEL_SPECS[modelId];
      var ui = modelUis[modelId];

      if (state.loaded) {
        return state.loaded;
      }
      if (state.loadPromise) {
        return state.loadPromise;
      }

      state.loadPromise = (async function () {
        setStatus(ui, "Transformers.js を読み込み中...");
        setProgress(ui, 0, false);

        var transformers = await loadTransformers();
        var AutoTokenizer = transformers.AutoTokenizer;
        var AutoModelForCausalLM = transformers.AutoModelForCausalLM;

        if (spec.requiresWebGpu && !(await checkWebGpuAvailability())) {
          throw new Error(webGpuHint());
        }

        var tokenizer = await AutoTokenizer.from_pretrained(spec.repo);
        var chatTemplate = spec.extraLoad ? await spec.extraLoad() : null;
        var loadErrors = [];
        var model = null;
        var variants = spec.getLoadVariants ? spec.getLoadVariants() : [{ note: "", options: spec.loadOptions }];

        if (!variants.length) {
          throw new Error(formatLoadFailure(spec, loadErrors));
        }

        for (var i = 0; i < variants.length; i += 1) {
          var variant = variants[i];
          try {
            setStatus(ui, "モデルを初期化しています... (" + variant.note + ")");
            model = await AutoModelForCausalLM.from_pretrained(spec.repo, Object.assign({}, variant.options, {
              progress_callback: createProgressHandler(spec, ui),
            }));
            break;
          } catch (error) {
            loadErrors.push(variant.note + ": " + (error && error.message ? error.message : String(error)));
          }
        }

        if (!model) {
          throw new Error(formatLoadFailure(spec, loadErrors));
        }

        state.loaded = {
          tokenizer: tokenizer,
          model: model,
          chatTemplate: chatTemplate,
        };

        setStatus(ui, spec.label + " の準備ができました。");
        setProgress(ui, 100, false);
        return state.loaded;
      })().catch(function (error) {
        setStatus(ui, "読み込みに失敗しました: " + (error && error.message ? error.message : String(error)), true);
        setProgress(ui, 0, true);
        state.loadPromise = null;
        throw error;
      });

      return state.loadPromise;
    }

    async function runModel(modelId) {
      var prompt = promptInput.value.trim();
      var ui = modelUis[modelId];
      var spec = MODEL_SPECS[modelId];

      if (!prompt) {
        setStatus(ui, "まず質問文を入れてください。", true);
        setOutput(ui, "質問が空です。");
        return;
      }

      if (modelState[modelId].runPromise) {
        return modelState[modelId].runPromise;
      }

      modelState[modelId].runPromise = (async function () {
        setRunning(true);
        setOutput(ui, "生成中...");
        try {
          var loaded = await ensureLoaded(modelId);
          var promptText = spec.preparePrompt(loaded, prompt);
          var inputs = loaded.tokenizer(promptText, {
            add_special_tokens: false,
            truncation: true,
          });

          setStatus(ui, spec.label + " で生成しています...");
          var generatedIds = await loaded.model.generate(Object.assign({}, inputs, spec.generation));
          var text = trimPromptEcho(loaded.tokenizer, promptText, generatedIds);

          if (!text) {
            text = "出力が空でした。もう一度試すか、質問を少し具体的にしてみてください。";
          }

          setOutput(ui, text);
          setStatus(ui, spec.label + " の生成が終わりました。");
        } catch (error) {
          setOutput(ui, "生成に失敗しました。");
          setStatus(ui, "生成に失敗しました: " + (error && error.message ? error.message : String(error)), true);
        } finally {
          modelState[modelId].runPromise = null;
          setRunning(false);
        }
      })();

      return modelState[modelId].runPromise;
    }

    Object.keys(modelUis).forEach(function (modelId) {
      modelUis[modelId].button.addEventListener("click", function () {
        runModel(modelId);
      });
    });

    runBothButton.addEventListener("click", async function () {
      for (var i = 0; i < Object.keys(MODEL_SPECS).length; i += 1) {
        await runModel(Object.keys(MODEL_SPECS)[i]);
      }
    });

    consent.addEventListener("change", syncDisabledState);
    syncDisabledState();
    checkWebGpuAvailability().then(syncDisabledState);
  }

  ready(function () {
    var demos = document.querySelectorAll("[data-js-llm-demo]");
    demos.forEach(initDemo);
  });
})();
