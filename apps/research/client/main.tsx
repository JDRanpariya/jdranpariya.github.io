import type { LibraryPageData } from "../lib/library-data";
import { isCollectionId } from "../lib/research-collections";
import "./research.css";

const page = document.body.dataset.page;

function readJson<T>(id: string): T {
  const element = document.getElementById(id);
  if (!element?.textContent) throw new Error(`Missing ${id} bootstrap data.`);
  return JSON.parse(element.textContent) as T;
}

if (page === "library") {
  const root = document.getElementById("library-root");
  if (root) {
    type LibraryPayload = { data: LibraryPageData; email: string };
    let payload: LibraryPayload | null = null;
    try {
      payload = readJson<LibraryPayload | null>("library-data");
    } catch {
      // A static preview or incomplete response may lack the Worker payload.
    }
    const collection = location.pathname.split("/")[2];
    if (payload?.data && collection && isCollectionId(collection)) {
      const { data, email } = payload;
      void Promise.all([
        import("react-dom/client"),
        import("../components/library-workspace"),
      ]).then(([{ createRoot }, { LibraryWorkspace }]) => {
        createRoot(root).render(
          <LibraryWorkspace collection={collection} initialData={data} ownerEmail={email} />
        );
      });
    } else {
      const message = document.createElement("main");
      message.className = "page-frame py-16";
      const heading = document.createElement("h1");
      heading.className = "text-2xl font-bold";
      heading.textContent = "Library unavailable";
      const link = document.createElement("a");
      link.href = "/index";
      link.className = "mt-6 inline-block underline";
      link.textContent = "Return to research index";
      message.appendChild(heading);
      message.appendChild(link);
      root.replaceChildren(message);
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
