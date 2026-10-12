const DATA_URL = "/assets/data/collaborations.json";

const STATUSES = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "Todo" },
  { id: "in-progress", label: "In progress" },
  { id: "in-review", label: "In review" },
  { id: "done", label: "Done" },
];

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
let lastTrigger;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusLabel(value) {
  return STATUSES.find((status) => status.id === value)?.label ?? value;
}

function renderCard(item) {
  const card = element("article", "collaboration-card");
  const trigger = element("button", "collaboration-trigger");
  trigger.type = "button";
  trigger.dataset.itemId = item.id;
  trigger.setAttribute("aria-label", `View details for ${item.title} by ${item.organization}`);
  trigger.append(
    element("span", "collaboration-organization", item.organization),
    element("span", "collaboration-title", item.title),
    element("span", "collaboration-summary", item.summary),
  );

  const domains = element("ul", "collaboration-tags");
  domains.setAttribute("aria-label", "Domains");
  for (const domain of item.domains) {
    const tag = element("li", "", domain.replaceAll("-", " "));
    domains.append(tag);
  }
  trigger.append(domains);
  card.append(trigger);
  return card;
}

function renderBoard(items = []) {
  const fragment = document.createDocumentFragment();

  for (const status of STATUSES) {
    const matches = items.filter((item) => item.status === status.id);
    const column = element("section", "board-column");
    column.setAttribute("aria-labelledby", `column-${status.id}`);

    const heading = element("div", "board-column-heading");
    heading.append(
      element("h2", "", status.label),
      element("span", "board-count", String(matches.length)),
    );
    heading.querySelector("h2").id = `column-${status.id}`;
    column.append(heading);

    const cards = element("div", "board-cards");
    if (matches.length) {
      for (const item of matches) cards.append(renderCard(item));
    } else {
      cards.append(element("p", "board-column-empty", "No collaborations in this stage."));
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

  const invalidNote = invalidItemCount ? ` ${invalidItemCount} invalid item${invalidItemCount === 1 ? " was" : "s were"} omitted.` : "";
  statusRegion.textContent = query
    ? `${filtered.length} of ${collaborations.length} collaborations match.${invalidNote}`
    : `${collaborations.length} collaborations loaded.${invalidNote}`;
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
    paragraph.append(document.createTextNode(`${label} unavailable`));
  }
  return paragraph;
}

function updateItemUrl(itemId) {
  const url = new URL(window.location.href);
  if (itemId) url.searchParams.set("item", itemId);
  else url.searchParams.delete("item");
  window.history.replaceState({}, "", url);
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
    element("dt", "", "Status"),
    element("dd", "", statusLabel(item.status)),
    element("dt", "", "Collaboration type"),
    element("dd", "", item.collaborationType.replaceAll("-", " ")),
    element("dt", "", "Last verified"),
    element("dd", "", item.lastVerified),
  );

  const links = element("div", "dialog-links");
  links.append(
    externalLink("Open contribution entry point", item.entryPoint),
    externalLink("View primary source", item.sourceUrl),
  );

  detailsRegion.replaceChildren(
    heading,
    facts,
    detailSection("Available work", item.workAvailable),
    detailSection("Skills", item.skills),
    detailSection("Domains", item.domains.map((domain) => domain.replaceAll("-", " "))),
    detailSection("Before starting", item.caveats.length ? item.caveats : ["No additional caveats recorded."]),
    links,
  );
}

function openDetails(item, trigger) {
  lastTrigger = trigger;
  renderDetails(item);
  updateItemUrl(item.id);
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
}

function closeDetails() {
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  else {
    dialog.removeAttribute("open");
    updateItemUrl();
    lastTrigger?.focus();
    lastTrigger = undefined;
  }
}

function validCollaboration(item) {
  const strings = ["id", "title", "organization", "status", "collaborationType", "summary", "entryPoint", "sourceUrl", "lastVerified"];
  const arrays = ["domains", "workAvailable", "skills", "caveats"];
  return item && strings.every((key) => typeof item[key] === "string" && item[key])
    && arrays.every((key) => Array.isArray(item[key]) && item[key].every((value) => typeof value === "string"))
    && STATUSES.some((status) => status.id === item.status);
}

function openRequestedItem() {
  const itemId = new URL(window.location.href).searchParams.get("item");
  if (!itemId) return;
  const item = collaborations.find((candidate) => candidate.id === itemId);
  if (item) {
    const trigger = board.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`);
    openDetails(item, trigger);
  } else {
    statusRegion.textContent = `No collaboration has the ID “${itemId}”. ${collaborations.length} collaborations remain available.`;
  }
}

async function loadCollaborations() {
  renderBoard();

  try {
    const response = await fetch(DATA_URL, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const items = await response.json();
    if (!Array.isArray(items)) throw new TypeError("Expected an array of collaborations");

    collaborations = items.filter(validCollaboration);
    invalidItemCount = items.length - collaborations.length;
    applySearch();
    openRequestedItem();
  } catch {
    statusRegion.classList.add("board-status-error");
    statusRegion.textContent = "The collaboration data could not be loaded. Try again later.";
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
  updateItemUrl();
  lastTrigger?.focus();
  lastTrigger = undefined;
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
  if (item) openDetails(item, board.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`));
  else if (dialog.open) closeDetails();
});

loadCollaborations();
