import "./research.css";

const root = document.getElementById("index-root");
const tools = root?.querySelector<HTMLElement>("[data-index-tools]");
if (tools) tools.hidden = false;
const rows = [...(root?.querySelectorAll<HTMLElement>("[data-index-record]") || [])];
const search = root?.querySelector<HTMLInputElement>("[data-index-search]");
const filters = [...(root?.querySelectorAll<HTMLButtonElement>("[data-index-filter]") || [])];
let collection = "all";

function update() {
  const needle = search?.value.trim().toLocaleLowerCase() || "";
  let count = 0;
  for (const row of rows) {
    row.hidden =
      (collection !== "all" && row.dataset.collection !== collection) ||
      !(row.dataset.search || "").includes(needle);
    if (!row.hidden) count++;
  }
  const empty = root?.querySelector<HTMLElement>("[data-index-empty]");
  if (empty) empty.hidden = count > 0;
  for (const button of filters)
    button.setAttribute("aria-pressed", String(button.dataset.indexFilter === collection));
}
search?.addEventListener("input", update);
for (const button of filters)
  button.addEventListener("click", () => {
    collection = button.dataset.indexFilter || "all";
    update();
  });
