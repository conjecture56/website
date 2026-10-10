const API_BASE = "https://api.conjecture56.org";
const QUOTA_ENDPOINT = `${API_BASE}/api/governance/virtual-keys/quota`;
const MODELS_ENDPOINT = `${API_BASE}/v1/models`;
const CONFIG_PLACEHOLDER = "Inspect your key above to generate the configuration.";
const VERIFY_PLACEHOLDER = "A verification command will appear with your configuration.";

const form = document.querySelector("#quota-form");
const keyInput = document.querySelector("#api-key");
const toggleButton = document.querySelector("#toggle-key");
const clearButton = document.querySelector("#clear-key");
const statusRegion = document.querySelector("#quota-status");
const resultsRegion = document.querySelector("#quota-results");
const configCode = document.querySelector("#config-example");
const verifyCode = document.querySelector("#verify-command");
const copyConfigButton = document.querySelector("#copy-config");
const copyVerifyButton = document.querySelector("#copy-verify");
const credentialWarning = document.querySelector("#credential-warning");

let activeRequest;
let generatedConfig;

const formatNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const formatMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message = "", tone = "") {
  statusRegion.className = tone ? `quota-status status-${tone}` : "quota-status";
  statusRegion.textContent = message;
}

function resetConfigOutput() {
  generatedConfig = undefined;
  configCode.textContent = CONFIG_PLACEHOLDER;
  verifyCode.textContent = VERIFY_PLACEHOLDER;
  copyConfigButton.disabled = true;
  copyVerifyButton.disabled = true;
  copyConfigButton.textContent = "Copy ready-to-use config";
  credentialWarning.hidden = true;
}

function resetSensitiveState() {
  activeRequest?.abort();
  activeRequest = undefined;
  keyInput.value = "";
  keyInput.type = "password";
  toggleButton.textContent = "Show";
  toggleButton.setAttribute("aria-label", "Show API key");
  toggleButton.setAttribute("aria-pressed", "false");
  resultsRegion.replaceChildren();
  resultsRegion.hidden = true;
  resetConfigOutput();
  setStatus();
}

function durationLabel(value) {
  if (!value) return "current cycle";
  const units = { s: "second", m: "minute", h: "hour", d: "day", w: "week", M: "month" };
  const match = String(value).match(/^(\d+)([smhdwM])$/);
  if (!match) return String(value);
  const count = Number(match[1]);
  const unit = units[match[2]];
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

function metricCard(label, current, maximum, resetDuration, formatter = formatNumber) {
  const card = element("article", "metric-card");
  card.append(element("p", "metric-label", label));

  const value = element("p", "metric-value");
  value.append(document.createTextNode(formatter.format(current ?? 0)));
  value.append(element("span", "metric-maximum", maximum == null ? " No fixed limit" : ` / ${formatter.format(maximum)}`));
  card.append(value);

  if (maximum != null && maximum > 0) {
    const progress = element("progress", "quota-progress");
    progress.max = maximum;
    progress.value = Math.min(current ?? 0, maximum);
    progress.setAttribute("aria-label", `${label}: ${formatNumber.format(progress.value)} of ${formatNumber.format(maximum)}`);
    card.append(progress);
  }

  card.append(element("p", "metric-reset", `Resets every ${durationLabel(resetDuration)}`));
  return card;
}

function budgetCard(budget, label = "Budget usage") {
  const limit = Number(budget.max_limit ?? 0) + Number(budget.override_amount ?? 0);
  return metricCard(label, Number(budget.current_usage ?? 0), limit || null, budget.reset_duration, formatMoney);
}

function renderRateLimit(rateLimit, container) {
  if (!rateLimit) {
    container.append(element("p", "empty-note", "No request or token rate limit is attached to this key."));
    return;
  }

  container.append(
    metricCard("Requests", rateLimit.request_current_usage, rateLimit.request_max_limit, rateLimit.request_reset_duration),
    metricCard("Tokens", rateLimit.token_current_usage, rateLimit.token_max_limit, rateLimit.token_reset_duration),
  );
}

function mergeModels(inventory, quota) {
  const configs = new Map((quota.model_configs ?? []).map((model) => [model.model_name, model]));
  const models = [];
  const seen = new Set();

  for (const item of inventory ?? []) {
    const id = item?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    models.push({ id, provider: item.owned_by ?? configs.get(id)?.provider });
  }

  for (const [name, config] of configs) {
    if (seen.has(name)) continue;
    seen.add(name);
    models.push({ id: name, provider: config.provider, configOnly: true });
  }

  return models;
}

function renderModel(model) {
  const card = element("article", "model-card");
  const heading = element("div", "model-heading");
  heading.append(element("h4", "", model.id));
  const badge = element("span", "model-provider", model.configOnly ? "key config" : "available");
  heading.append(badge);
  card.append(heading);

  const facts = element("dl", "model-facts");
  const addFact = (term, value) => {
    facts.append(element("dt", "", term), element("dd", "", value));
  };

  if (model.provider) addFact("Provider", model.provider);

  const config = model.config;
  if (config) {
    const rate = config.rate_limit;
    if (rate?.request_max_limit != null) {
      addFact("Requests", `${formatNumber.format(rate.request_current_usage ?? 0)} / ${formatNumber.format(rate.request_max_limit)} per ${durationLabel(rate.request_reset_duration)}`);
    }
    if (rate?.token_max_limit != null) {
      addFact("Tokens", `${formatNumber.format(rate.token_current_usage ?? 0)} / ${formatNumber.format(rate.token_max_limit)} per ${durationLabel(rate.token_reset_duration)}`);
    }

    const budget = (Array.isArray(config.budgets) ? config.budgets : [])[0];
    if (budget) {
      addFact("Spend", `${formatMoney.format(budget.current_usage ?? 0)} / ${formatMoney.format((budget.max_limit ?? 0) + (budget.override_amount ?? 0))} per ${durationLabel(budget.reset_duration)}`);
    }
  }

  if (!facts.children.length) addFact("Limits", "Uses the key-level allowance");
  card.append(facts);
  return card;
}

function renderQuota(data, models) {
  const fragment = document.createDocumentFragment();
  const summary = element("section", "result-summary");
  const identity = element("div", "result-identity");
  identity.append(element("p", "eyebrow", "Authenticated key"));
  identity.append(element("h3", "", data.virtual_key_name || "Conjecture 56 key"));
  summary.append(identity);
  summary.append(element("span", data.is_active ? "key-state state-active" : "key-state state-inactive", data.is_active ? "Active" : "Inactive"));
  fragment.append(summary);

  if (!data.is_active) {
    fragment.append(element("p", "result-warning", "This key is recognized but currently disabled. Contact its issuer before making API requests."));
  }

  const limitsSection = element("section", "result-section");
  limitsSection.append(element("h3", "result-title", "Current allowance"));
  const metrics = element("div", "metrics-grid");
  renderRateLimit(data.rate_limit, metrics);
  const budgets = Array.isArray(data.budgets) ? data.budgets : [];
  budgets.forEach((budget, index) => metrics.append(budgetCard(budget, budgets.length > 1 ? `Budget ${index + 1}` : "Budget usage")));
  limitsSection.append(metrics);
  fragment.append(limitsSection);

  if (models.length) {
    const modelsSection = element("section", "result-section");
    modelsSection.append(element("h3", "result-title", `Models (${models.length})`));
    const modelGrid = element("div", "model-grid");
    models.forEach((model) => modelGrid.append(renderModel(model)));
    modelsSection.append(modelGrid);
    fragment.append(modelsSection);
  } else {
    const emptySection = element("section", "result-section");
    emptySection.append(element("p", "result-warning", "No models are currently available to this key. Contact its issuer to enable model access."));
    fragment.append(emptySection);
  }

  resultsRegion.replaceChildren(fragment);
  resultsRegion.hidden = false;
}

function prettifyModelName(id) {
  const base = String(id).split("/").pop();
  return base
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildConfig(key, models) {
  const entries = {};
  for (const model of models) {
    entries[model.id] = { name: prettifyModelName(model.id) };
  }

  return JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      providers: {
        conjecture56: {
          name: "Conjecture 56",
          package: "@opencode/ai/providers/openai-compatible",
          settings: {
            baseURL: `${API_BASE}/v1`,
            apiKey: key,
          },
          models: entries,
        },
      },
    },
    null,
    2,
  );
}

function renderConfig(key, models) {
  generatedConfig = buildConfig(key, models);
  configCode.textContent = generatedConfig;
  copyConfigButton.disabled = false;
  credentialWarning.hidden = false;

  const firstModel = models[0]?.id;
  if (firstModel) {
    verifyCode.textContent = `opencode run --model conjecture56/${firstModel} \\\n  "Reply exactly: gateway-ok"`;
    copyVerifyButton.disabled = false;
  }
}

async function fetchJson(endpoint, key, signal) {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { "X-Api-Key": key },
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorMessage(response, body));
  return body;
}

function errorMessage(response, body) {
  if (response.status === 401) return "We couldn't recognize that key. Check it and try again.";
  if (response.status === 403) return "This key is disabled or has expired. Contact its issuer for access.";
  if (response.status === 429) return "This key has reached its current rate limit. Wait for the next reset and try again.";
  if (response.status >= 500) return "The quota service is temporarily unavailable. Try again in a few minutes.";

  const apiMessage = typeof body?.error === "string" ? body.error : body?.error?.message;
  return apiMessage || "The data could not be loaded. Please try again.";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = keyInput.value.trim();

  if (!key) {
    setStatus("Enter your virtual API key first.", "error");
    keyInput.focus();
    return;
  }

  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  resultsRegion.hidden = true;
  resultsRegion.replaceChildren();
  resetConfigOutput();
  setStatus("Checking your key, quota, and available models…", "loading");
  form.setAttribute("aria-busy", "true");

  try {
    const [quotaResult, modelsResult] = await Promise.allSettled([
      fetchJson(QUOTA_ENDPOINT, key, controller.signal),
      fetchJson(MODELS_ENDPOINT, key, controller.signal),
    ]);

    if (quotaResult.status === "rejected") throw quotaResult.reason;

    const quota = quotaResult.value;
    const models = modelsResult.status === "fulfilled"
      ? mergeModels(modelsResult.value?.data, quota)
      : mergeModels([], quota);

    renderQuota(quota, models);
    if (models.length) {
      renderConfig(key, models);
      setStatus("Quota loaded and configuration generated. Your key has not been stored.", "success");
    } else {
      setStatus("Quota loaded, but this key has no models available yet.", "success");
    }
  } catch (error) {
    if (error.name !== "AbortError") setStatus(error.message || "The data could not be loaded.", "error");
  } finally {
    form.removeAttribute("aria-busy");
    if (activeRequest === controller) activeRequest = undefined;
  }
});

toggleButton?.addEventListener("click", () => {
  const isVisible = keyInput.type === "text";
  keyInput.type = isVisible ? "password" : "text";
  toggleButton.textContent = isVisible ? "Show" : "Hide";
  toggleButton.setAttribute("aria-label", `${isVisible ? "Show" : "Hide"} API key`);
  toggleButton.setAttribute("aria-pressed", String(!isVisible));
  keyInput.focus();
});

clearButton?.addEventListener("click", () => {
  resetSensitiveState();
  keyInput.focus();
});

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", async () => {
    const source = document.getElementById(button.dataset.copy);
    if (!source) return;

    try {
      await navigator.clipboard.writeText(source.textContent);
      const previous = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = previous; }, 1800);
    } catch {
      setStatus("Copy was blocked by the browser. Select the text and copy it manually.", "error");
    }
  });
});

window.addEventListener("pagehide", resetSensitiveState);
