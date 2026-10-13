import { getLanguage, numberFormatter, t } from "/assets/js/i18n.js?v=20261012";

const API_BASE = "https://api.conjecture56.org";
const QUOTA_ENDPOINT = `${API_BASE}/api/governance/virtual-keys/quota`;
const MODELS_ENDPOINT = `${API_BASE}/v1/models`;
// Used when a key advertises no named models anywhere (no /v1/models inventory,
// no named model_configs, no per-model usage). Matches the gateway's base model.
const FALLBACK_MODELS = ["qwen3.6"];

const form = document.querySelector("#quota-form");
const keyInput = document.querySelector("#api-key");
const toggleButton = document.querySelector("#toggle-key");
const clearButton = document.querySelector("#clear-key");
const statusRegion = document.querySelector("#quota-status");
const resultsRegion = document.querySelector("#quota-results");
const setupSection = document.querySelector("#setup-section");

let activeRequest;

const formatNumber = numberFormatter({ maximumFractionDigits: 1 });
const formatMoney = numberFormatter({
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
  setupSection.hidden = true;
}

function resetSensitiveState() {
  activeRequest?.abort();
  activeRequest = undefined;
  keyInput.value = "";
  keyInput.type = "password";
  toggleButton.textContent = t("keys.show");
  toggleButton.setAttribute("aria-label", t("keys.showAria"));
  toggleButton.setAttribute("aria-pressed", "false");
  resultsRegion.replaceChildren();
  resultsRegion.hidden = true;
  resetConfigOutput();
  setStatus();
}

function durationLabel(value) {
  if (!value) return t("quota.currentCycle");
  const units = { s: "second", m: "minute", h: "hour", d: "day", w: "week", M: "month" };
  const match = String(value).match(/^(\d+)([smhdwM])$/);
  if (!match) return String(value);
  const count = Number(match[1]);
  const unit = units[match[2]];
  return `${formatNumber.format(count)} ${t(`quota.${unit}${count === 1 ? "" : "Plural"}`)}`;
}

function cleanProvider(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^(nan|null|undefined|\*)$/i.test(trimmed)) return null;
  return trimmed;
}

function metricCard(label, current, maximum, resetDuration, formatter = formatNumber) {
  const card = element("article", "metric-card");
  card.append(element("p", "metric-label", label));

  const value = element("p", "metric-value");
  value.append(document.createTextNode(formatter.format(current ?? 0)));
  value.append(element("span", "metric-maximum", maximum == null ? t("quota.noFixedLimit") : ` / ${formatter.format(maximum)}`));
  card.append(value);

  if (maximum != null && maximum > 0) {
    const progress = element("progress", "quota-progress");
    progress.max = maximum;
    progress.value = Math.min(current ?? 0, maximum);
    progress.setAttribute("aria-label", `${label}: ${t("quota.of", { current: formatNumber.format(progress.value), maximum: formatNumber.format(maximum) })}`);
    card.append(progress);
  }

  card.append(element("p", "metric-reset", t("quota.resets", { duration: durationLabel(resetDuration) })));
  return card;
}

function budgetCard(budget, label = t("quota.budgetUsage")) {
  const limit = Number(budget.max_limit ?? 0) + Number(budget.override_amount ?? 0);
  return metricCard(label, Number(budget.current_usage ?? 0), limit || null, budget.reset_duration, formatMoney);
}

function renderRateLimit(rateLimit, container) {
  if (!rateLimit) {
    container.append(element("p", "empty-note", t("quota.noRateLimit")));
    return;
  }

  container.append(
    metricCard(t("quota.requests"), rateLimit.request_current_usage, rateLimit.request_max_limit, rateLimit.request_reset_duration),
    metricCard(t("quota.tokens"), rateLimit.token_current_usage, rateLimit.token_max_limit, rateLimit.token_reset_duration),
  );
}

function modelsFromUsage(quota) {
  const ids = new Set();
  const collect = (config) => {
    for (const budget of config?.budgets ?? []) {
      for (const usage of budget.per_model_usage ?? []) {
        if (usage?.model && usage.model !== "*") ids.add(usage.model);
      }
    }
  };

  for (const budget of quota?.budgets ?? []) collect({ budgets: [budget] });
  for (const config of quota?.model_configs ?? []) collect(config);
  return [...ids];
}

function mergeModels(inventory, quota) {
  const configs = new Map((quota?.model_configs ?? []).map((model) => [model.model_name, model]));
  const models = [];
  const seen = new Set();

  const addModel = (id, provider) => {
    if (!id || id === "*" || seen.has(id)) return;
    seen.add(id);
    models.push({
      id,
      provider: cleanProvider(provider) ?? cleanProvider(configs.get(id)?.provider),
      config: configs.get(id) ?? null,
    });
  };

  for (const item of inventory ?? []) addModel(item?.id, item?.owned_by);
  for (const id of modelsFromUsage(quota)) addModel(id);
  for (const [name, config] of configs) addModel(name, config.provider);

  return { models, wildcard: configs.get("*") ?? null };
}

function renderModel(model) {
  const card = element("article", "model-card");
  const heading = element("div", "model-heading");
  heading.append(element("h4", "", model.id));
  const badgeText = model.keyLevel ? t("quota.keyLevelLimits") : model.fallback ? t("quota.default") : model.config ? t("quota.keyConfig") : t("quota.available");
  heading.append(element("span", "model-provider", badgeText));
  card.append(heading);

  const facts = element("dl", "model-facts");
  const addFact = (term, value) => {
    facts.append(element("dt", "", term), element("dd", "", value));
  };

  if (model.provider) addFact(t("quota.provider"), model.provider);

  const config = model.config;
  if (config) {
    const rate = config.rate_limit;
    if (rate?.request_max_limit != null) {
      addFact(t("quota.requests"), `${formatNumber.format(rate.request_current_usage ?? 0)} / ${formatNumber.format(rate.request_max_limit)} ${t("quota.per", { duration: durationLabel(rate.request_reset_duration) })}`);
    }
    if (rate?.token_max_limit != null) {
      addFact(t("quota.tokens"), `${formatNumber.format(rate.token_current_usage ?? 0)} / ${formatNumber.format(rate.token_max_limit)} ${t("quota.per", { duration: durationLabel(rate.token_reset_duration) })}`);
    }

    const budget = (Array.isArray(config.budgets) ? config.budgets : [])[0];
    if (budget) {
      addFact(t("quota.spend"), `${formatMoney.format(budget.current_usage ?? 0)} / ${formatMoney.format((budget.max_limit ?? 0) + (budget.override_amount ?? 0))} ${t("quota.per", { duration: durationLabel(budget.reset_duration) })}`);
    }
  }

  if (!facts.children.length) addFact(t("quota.limits"), t("quota.usesKeyAllowance"));
  card.append(facts);
  return card;
}

function renderQuota(data, merged, fallbackUsed) {
  const fragment = document.createDocumentFragment();
  const summary = element("section", "result-summary");
  const identity = element("div", "result-identity");
  identity.append(element("p", "eyebrow", t("quota.authenticatedKey")));
  identity.append(element("h3", "", data.virtual_key_name || t("quota.defaultKeyName")));
  summary.append(identity);
  summary.append(element("span", data.is_active ? "key-state state-active" : "key-state state-inactive", t(data.is_active ? "quota.active" : "quota.inactive")));
  fragment.append(summary);

  if (!data.is_active) {
    fragment.append(element("p", "result-warning", t("quota.disabledWarning")));
  }

  const limitsSection = element("section", "result-section");
  limitsSection.append(element("h3", "result-title", t("quota.currentAllowance")));
  const metrics = element("div", "metrics-grid");
  renderRateLimit(data.rate_limit, metrics);
  const budgets = Array.isArray(data.budgets) ? data.budgets : [];
  budgets.forEach((budget, index) => metrics.append(budgetCard(budget, budgets.length > 1 ? t("quota.budget", { number: index + 1 }) : t("quota.budgetUsage"))));
  limitsSection.append(metrics);
  fragment.append(limitsSection);

  if (merged.models.length || merged.wildcard) {
    const modelsSection = element("section", "result-section");
    const title = merged.wildcard && !merged.models.length
      ? t("quota.modelLimits")
      : t("quota.models", { count: merged.models.length });
    modelsSection.append(element("h3", "result-title", title));
    if (fallbackUsed) {
      modelsSection.append(element("p", "result-warning", t("quota.fallbackWarning")));
    }
    const modelGrid = element("div", "model-grid");
    merged.models.forEach((model) => modelGrid.append(renderModel(model)));
    if (merged.wildcard) {
      modelGrid.append(renderModel({ id: t("quota.allModels"), config: merged.wildcard, keyLevel: true }));
    }
    modelsSection.append(modelGrid);
    fragment.append(modelsSection);
  } else {
    const emptySection = element("section", "result-section");
    emptySection.append(element("p", "result-warning", t("quota.noModels")));
    fragment.append(emptySection);
  }

  resultsRegion.replaceChildren(fragment);
  resultsRegion.hidden = false;
}

function renderConfig() {
  setupSection.hidden = false;
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
  if (response.status === 401) return t("quota.invalidKey");
  if (response.status === 403) return t("quota.expiredKey");
  if (response.status === 429) return t("quota.rateLimit");
  if (response.status >= 500) return t("quota.serviceUnavailable");

  const apiMessage = typeof body?.error === "string" ? body.error : body?.error?.message;
  return getLanguage() === "en" && apiMessage ? apiMessage : t("quota.loadError");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = keyInput.value.trim();

  if (!key) {
    setStatus(t("quota.enterKey"), "error");
    keyInput.focus();
    return;
  }

  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  resultsRegion.hidden = true;
  resultsRegion.replaceChildren();
  resetConfigOutput();
  setStatus(t("quota.checking"), "loading");
  form.setAttribute("aria-busy", "true");

  try {
    const [quotaResult, modelsResult] = await Promise.allSettled([
      fetchJson(QUOTA_ENDPOINT, key, controller.signal),
      fetchJson(MODELS_ENDPOINT, key, controller.signal),
    ]);

    if (quotaResult.status === "rejected") throw quotaResult.reason;

    const quota = quotaResult.value;
    const inventory = modelsResult.status === "fulfilled" ? modelsResult.value?.data : null;
    const merged = mergeModels(inventory, quota);
    const fallbackUsed = merged.models.length === 0;
    if (fallbackUsed) {
      merged.models = FALLBACK_MODELS.map((id) => ({ id, provider: null, config: null, fallback: true }));
    }

    renderQuota(quota, merged, fallbackUsed);

    if (merged.models.length) {
      renderConfig();
      setStatus(
        fallbackUsed
          ? t("quota.loadedFallback")
          : t("quota.loaded"),
        "success",
      );
    } else {
      setStatus(t("quota.loadedNoModels"), "success");
    }
  } catch (error) {
    if (error.name !== "AbortError") setStatus(error.message || t("quota.loadError"), "error");
  } finally {
    form.removeAttribute("aria-busy");
    if (activeRequest === controller) activeRequest = undefined;
  }
});

toggleButton?.addEventListener("click", () => {
  const isVisible = keyInput.type === "text";
  keyInput.type = isVisible ? "password" : "text";
  toggleButton.textContent = t(isVisible ? "keys.show" : "quota.hide");
  toggleButton.setAttribute("aria-label", t(isVisible ? "keys.showAria" : "quota.hideAria"));
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
      button.textContent = t("quota.copied");
      window.setTimeout(() => { button.textContent = previous; }, 1800);
    } catch {
      setStatus(t("quota.copyBlocked"), "error");
    }
  });
});

window.addEventListener("pagehide", resetSensitiveState);
