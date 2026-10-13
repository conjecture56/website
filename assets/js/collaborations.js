import { getLanguage, t } from "/assets/js/i18n.js?v=20261012";

const DATA_URL = "/assets/data/collaborations.json";
const TRANSLATIONS_URL = "/assets/data/collaborations.es.json";

const STATUSES = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "Todo" },
  { id: "in-progress", label: "In progress" },
  { id: "in-review", label: "In review" },
  { id: "done", label: "Done" },
];

const CONJECTURE_56_ROLES = new Set(["lead", "contributor", "curator"]);

const board = document.querySelector("#collaborations-board");
const statusRegion = document.querySelector("#board-status");
const searchForm = document.querySelector("#collaboration-search");
const searchInput = document.querySelector("#collaboration-query");
const clearSearchButton = document.querySelector("#clear-collaboration-search");
const emptyMessage = document.querySelector("#board-empty");
const dialog = document.querySelector("#collaboration-dialog");
const detailsRegion = document.querySelector("#collaboration-details");

let collaborations = [];
let invalidItemCount = 0;
let translationFallbackCount = 0;
let lastTrigger;
let closeFollowsHistory = false;
let currentItemWasPushed = false;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusLabel(value) {
  return t(`status.${value}`);
}

function roleLabel(value) {
  return CONJECTURE_56_ROLES.has(value) ? t(`role.${value}`) : value;
}

function renderCard(item) {
  const card = element("article", "collaboration-card");
  const title = element("h4", "collaboration-title");
  const trigger = element("button", "collaboration-trigger", item.title);
  trigger.type = "button";
  trigger.dataset.itemId = item.id;
  trigger.setAttribute("aria-label", t("board.viewDetails", { title: item.title, organization: item.organization }));
  title.append(trigger);

  const domains = element("ul", "collaboration-tags");
  domains.setAttribute("aria-label", t("board.domains"));
  for (const domain of item.domains) {
    const tag = element("li", "", domain.replaceAll("-", " "));
    domains.append(tag);
  }
  card.append(
    element("p", "collaboration-organization", item.organization),
    title,
    element("p", "collaboration-role", `Conjecture 56 · ${roleLabel(item.conjecture56Role)}`),
    element("p", "collaboration-summary", item.summary),
    domains,
  );
  return card;
}

function renderBoard(items = []) {
  const fragment = document.createDocumentFragment();

  for (const status of STATUSES) {
    const matches = items.filter((item) => item.status === status.id);
    const column = element("section", "board-column");
    column.setAttribute("aria-labelledby", `column-${status.id}`);

    const frame = element("div", "board-column-frame");
    frame.setAttribute("aria-hidden", "true");
    column.append(frame);

    const heading = element("div", "board-column-heading");
    heading.append(
      element("h3", "", status.label),
      element("span", "board-count", String(matches.length)),
    );
    heading.querySelector("h3").id = `column-${status.id}`;
    column.append(heading);

    const cards = element("div", "board-cards");
    if (matches.length) {
      for (const item of matches) cards.append(renderCard(item));
    } else {
      cards.append(element("p", "board-column-empty", t("board.emptyStage")));
    }
    column.append(cards);
    fragment.append(column);
  }

  board.replaceChildren(fragment);
}

function searchableText(item) {
  return [
    item.title,
    item.organization,
    item.summary,
    item.collaborationType,
    item.conjecture56Role,
    item.attribution ?? "",
    ...item.domains,
    ...item.skills,
  ].join(" ").toLocaleLowerCase();
}

function applySearch() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const filtered = query
    ? collaborations.filter((item) => searchableText(item).includes(query))
    : collaborations;

  renderBoard(filtered);
  clearSearchButton.hidden = !query;
  emptyMessage.hidden = filtered.length !== 0;
  emptyMessage.textContent = query ? t("board.noMatches") : t("board.noValid");

  const invalidNote = invalidItemCount
    ? t(invalidItemCount === 1 ? "board.invalidOne" : "board.invalidMany", { count: invalidItemCount })
    : "";
  const translationNote = translationFallbackCount
    ? t("board.translationFallback", {
      count: translationFallbackCount,
      noun: translationFallbackCount === 1 ? "traducción" : "traducciones",
      suffix: translationFallbackCount === 1 ? "" : "s",
    })
    : "";
  statusRegion.textContent = query
    ? `${t("board.matches", { filtered: filtered.length, total: collaborations.length, invalid: invalidNote })}${translationNote}`
    : `${t("board.loaded", { count: collaborations.length, invalid: invalidNote })}${translationNote}`;
}

function detailSection(title, values) {
  const section = element("section", "dialog-section");
  section.append(element("h3", "", title));
  const list = element("ul", "dialog-list");
  for (const value of values) list.append(element("li", "", value));
  section.append(list);
  return section;
}

function externalLink(label, value) {
  const paragraph = element("p", "dialog-link");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new TypeError("Unsupported URL protocol");
    const link = element("a", "", label);
    link.href = url.href;
    link.rel = "external noreferrer";
    paragraph.append(link);
  } catch {
    paragraph.append(document.createTextNode(`${label} ${t("details.unavailable")}`));
  }
  return paragraph;
}

function itemUrl(itemId) {
  const url = new URL(window.location.href);
  if (itemId) url.searchParams.set("item", itemId);
  else url.searchParams.delete("item");
  return url;
}

function renderDetails(item) {
  const heading = element("div", "dialog-title-group");
  heading.append(
    element("p", "collaboration-organization", item.organization),
    element("h2", "", item.title),
    element("p", "dialog-summary", item.summary),
  );
  heading.querySelector("h2").id = "collaboration-dialog-title";

  const facts = element("dl", "dialog-facts");
  facts.append(
    element("dt", "", t("details.status")),
    element("dd", "", statusLabel(item.status)),
    element("dt", "", t("details.collaborationType")),
    element("dd", "", item.collaborationType.replaceAll("-", " ")),
    element("dt", "", t("details.role")),
    element("dd", "", roleLabel(item.conjecture56Role)),
    element("dt", "", t("details.lastVerified")),
    element("dd", "", item.lastVerified),
  );

  const links = element("div", "dialog-links");
  if (item.entryPoint) links.append(externalLink(t("details.participation"), item.entryPoint));
  if (item.sourceUrl) links.append(externalLink(t("details.source"), item.sourceUrl));

  const sections = [
    heading,
    facts,
    ...(item.attribution ? [detailSection(t("details.attribution"), [item.attribution])] : []),
    detailSection(t(item.status === "done" ? "details.deliveredWork" : "details.availableWork"), item.workAvailable),
    detailSection(t("details.skills"), item.skills),
    detailSection(t("details.domains"), item.domains.map((domain) => domain.replaceAll("-", " "))),
    detailSection(t("details.beforeStarting"), item.caveats.length ? item.caveats : [t("details.noCaveats")]),
  ];
  if (links.childElementCount) sections.push(links);
  detailsRegion.replaceChildren(...sections);
}

function openDetails(item, trigger, historyMode = "push") {
  lastTrigger = trigger;
  renderDetails(item);
  if (historyMode === "push") {
    window.history.pushState({ collaboration: item.id }, "", itemUrl(item.id));
    currentItemWasPushed = true;
  } else if (historyMode === "direct") {
    currentItemWasPushed = false;
  }
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else {
      dialog.setAttribute("open", "");
      dialog.querySelector(".dialog-close").focus();
    }
  }
}

function closeDetails() {
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  else {
    dialog.removeAttribute("open");
    if (closeFollowsHistory) closeFollowsHistory = false;
    else if (currentItemWasPushed) window.history.back();
    else window.history.replaceState({}, "", itemUrl());
    currentItemWasPushed = false;
    lastTrigger?.focus();
    lastTrigger = undefined;
  }
}

function validCollaboration(item) {
  const strings = ["id", "title", "organization", "status", "collaborationType", "conjecture56Role", "summary", "lastVerified"];
  const requiredArrays = ["domains", "workAvailable", "skills"];
  const validUrl = (value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  };
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    try {
      return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    } catch {
      return false;
    }
  };
  const validArray = (value, allowEmpty = false) => Array.isArray(value)
    && (allowEmpty || value.length > 0)
    && value.every((entry) => typeof entry === "string" && entry.trim())
    && new Set(value).size === value.length;

  return item && strings.every((key) => typeof item[key] === "string" && item[key].trim())
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)
    && STATUSES.some((status) => status.id === item.status)
    && CONJECTURE_56_ROLES.has(item.conjecture56Role)
    && requiredArrays.every((key) => validArray(item[key]))
    && validArray(item.caveats, true)
    && (item.attribution === undefined || (typeof item.attribution === "string" && item.attribution.trim()))
    && (item.entryPoint === undefined || validUrl(item.entryPoint))
    && (item.sourceUrl === undefined || validUrl(item.sourceUrl))
    && validDate(item.lastVerified);
}

function openRequestedItem() {
  const itemId = new URL(window.location.href).searchParams.get("item");
  if (!itemId) return;
  const item = collaborations.find((candidate) => candidate.id === itemId);
  if (item) {
    const trigger = board.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`);
    openDetails(item, trigger, "direct");
  } else {
    statusRegion.textContent = t("board.unknownId", { id: itemId, count: collaborations.length });
  }
}

function validTranslation(item, translation) {
  if (!translation || typeof translation !== "object" || Array.isArray(translation)) return false;
  const strings = ["title", "collaborationType", "summary"];
  const arrays = ["domains", "workAvailable", "skills", "caveats"];
  const validArray = (value, allowEmpty = false) => Array.isArray(value)
    && (allowEmpty || value.length > 0)
    && value.every((entry) => typeof entry === "string" && entry.trim());

  return strings.every((key) => typeof translation[key] === "string" && translation[key].trim())
    && arrays.every((key) => validArray(translation[key], key === "caveats"))
    && (item.attribution === undefined || (typeof translation.attribution === "string" && translation.attribution.trim()));
}

async function loadCollaborations() {
  renderBoard();
  translationFallbackCount = 0;

  try {
    const response = await fetch(DATA_URL, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const items = await response.json();
    if (!Array.isArray(items)) throw new TypeError("Expected an array of collaborations");

    let translations = {};
    if (getLanguage() === "es") {
      try {
        const translationResponse = await fetch(TRANSLATIONS_URL, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!translationResponse.ok) throw new Error(`HTTP ${translationResponse.status}`);
        const parsedTranslations = await translationResponse.json();
        translations = parsedTranslations && typeof parsedTranslations === "object" && !Array.isArray(parsedTranslations)
          ? parsedTranslations
          : {};
      } catch {
        translations = {};
      }
    }

    const seenIds = new Set();
    collaborations = items.filter((item) => {
      if (!validCollaboration(item) || seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    }).map((item) => {
      const translation = translations[item.id];
      if (getLanguage() !== "es") return item;
      if (!validTranslation(item, translation)) {
        translationFallbackCount += 1;
        return item;
      }
      return { ...item, ...translation };
    });
    invalidItemCount = items.length - collaborations.length;
    applySearch();
    openRequestedItem();
  } catch {
    statusRegion.classList.add("board-status-error");
    statusRegion.textContent = t("board.loadError");
  } finally {
    board.removeAttribute("aria-busy");
  }
}

board.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-item-id]");
  if (!trigger) return;
  const item = collaborations.find((candidate) => candidate.id === trigger.dataset.itemId);
  if (item) openDetails(item, trigger);
});

searchForm.addEventListener("submit", (event) => event.preventDefault());
searchInput.addEventListener("input", applySearch);
clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  applySearch();
  searchInput.focus();
});

dialog.addEventListener("close", () => {
  if (closeFollowsHistory) {
    closeFollowsHistory = false;
  } else if (currentItemWasPushed) {
    window.history.back();
  } else {
    window.history.replaceState({}, "", itemUrl());
  }
  currentItemWasPushed = false;
  lastTrigger?.focus();
  lastTrigger = undefined;
});

dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  const outside = event.clientX < bounds.left
    || event.clientX > bounds.right
    || event.clientY < bounds.top
    || event.clientY > bounds.bottom;
  if (outside) closeDetails();
});

dialog.querySelector(".dialog-close").addEventListener("click", (event) => {
  if (typeof dialog.close !== "function") {
    event.preventDefault();
    closeDetails();
  }
});

window.addEventListener("popstate", () => {
  const itemId = new URL(window.location.href).searchParams.get("item");
  const item = collaborations.find((candidate) => candidate.id === itemId);
  if (item) {
    currentItemWasPushed = true;
    openDetails(item, board.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`), "history");
  } else if (dialog.open) {
    closeFollowsHistory = true;
    closeDetails();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog.open && typeof dialog.close !== "function") closeDetails();
});

loadCollaborations();
