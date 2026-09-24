import type { PublishedRecord } from "../components/public-research-index";
import type { LibraryPageData } from "../lib/library-data";
import type { ResearchHome } from "../lib/research-home";
import "./research.css";
import { createRoot, hydrateRoot } from "react-dom/client";

const page = document.body.dataset.page;

function readJson<T>(id: string): T {
  const element = document.getElementById(id);
  if (!element?.textContent) throw new Error(`Missing ${id} bootstrap data.`);
  return JSON.parse(element.textContent) as T;
}

if (page === "research") {
  const root = document.getElementById("research-root");
  if (root) {
    const documentData = readJson<ResearchHome>("research-home-data");
    const params = new URL(location.href).searchParams;
    const path = params
      .getAll("notes")
      .filter((slug) => documentData.notes.some((note) => note.slug === slug));
    const requestedFocus = Number.parseInt(params.get("noteFocus") ?? String(path.length), 10);
    const focus = Number.isFinite(requestedFocus)
      ? Math.max(0, Math.min(requestedFocus, path.length))
      : path.length;
    void import("../components/research-notes").then(({ ResearchNotes }) => {
      const view = (
        <ResearchNotes initialDocument={documentData} initialFocus={focus} initialPath={path} />
      );
      if (path.length) createRoot(root).render(view);
      else hydrateRoot(root, view);
    });
  }
}

if (page === "index") {
  const root = document.getElementById("index-root");
  if (root) {
    const records = readJson<PublishedRecord[]>("index-data");
    void import("../components/public-research-index").then(({ PublicResearchIndex }) => {
      hydrateRoot(root, <PublicResearchIndex records={records} />);
    });
  }
}

if (page === "library") {
  const root = document.getElementById("library-root");
  if (root) {
    const payload = readJson<{ data: LibraryPageData; email: string }>("library-data");
    const collection = location.pathname.split("/")[2];
    if (collection === "great-minds" || collection === "neuroai") {
      void import("../components/library-workspace").then(({ LibraryWorkspace }) => {
        createRoot(root).render(
          <LibraryWorkspace
            collection={collection}
            initialData={payload.data}
            ownerEmail={payload.email}
          />
        );
      });
    }
  }
}

if (page === "login") {
  const form = document.getElementById("login-form") as HTMLFormElement | null;
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const error = document.getElementById("login-error");
    const passphrase = String(new FormData(form).get("passphrase") ?? "");
    if (button) {
      button.disabled = true;
      button.textContent = "Signing in…";
    }
    if (error) error.hidden = true;
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          passphrase,
          returnTo: new URL(location.href).searchParams.get("returnTo") ?? "/library/great-minds",
        }),
      });
      const result = (await response.json()) as { error?: string; returnTo?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to sign in.");
      location.assign(result.returnTo ?? "/library/great-minds");
    } catch (caught) {
      if (error) {
        error.textContent = caught instanceof Error ? caught.message : "Unable to sign in.";
        error.hidden = false;
      }
      if (button) {
        button.disabled = false;
        button.textContent = "Continue";
      }
    }
  });
}
