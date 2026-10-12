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

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderCard(item) {
  const card = element("article", "collaboration-card");
  card.append(
    element("p", "collaboration-organization", item.organization),
    element("h3", "collaboration-title", item.title),
    element("p", "collaboration-summary", item.summary),
  );

  const domains = element("ul", "collaboration-tags");
  domains.setAttribute("aria-label", "Domains");
  for (const domain of item.domains) {
    const tag = element("li", "", domain.replaceAll("-", " "));
    domains.append(tag);
  }
  card.append(domains);
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

    renderBoard(items);
    statusRegion.textContent = `${items.length} collaborations loaded.`;
  } catch {
    statusRegion.classList.add("board-status-error");
    statusRegion.textContent = "The collaboration data could not be loaded. Try again later.";
  } finally {
    board.removeAttribute("aria-busy");
  }
}

loadCollaborations();
