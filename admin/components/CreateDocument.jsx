import React, { useState } from "react";
import {
  sourceDirectories,
  creationPath,
  sourceUrl,
  documentSection,
  newDocument,
} from "../../scripts/admin-authoring.mjs";

export function CreateDocument({ target, files, routes, onCancel, onCreate }) {
  const [directory, setDirectory] = useState(target.directory),
    [title, setTitle] = useState(target.selection?.text || ""),
    [name, setName] = useState(""),
    [edited, setEdited] = useState(false),
    [template, setTemplate] = useState("auto"),
    [author, setAuthor] = useState(""),
    [error, setError] = useState("");
  const kind = target.kind,
    folder = kind === "folder";
  const slug = (value) =>
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  const fileName = edited ? name : slug(title);
  let path = "",
    pathError = "";
  try {
    path = creationPath(directory, fileName, kind);
  } catch (e) {
    pathError = e.message;
  }
  const book =
    !folder && template !== "blank" && documentSection(`${directory}/entry.md`) === "books";
  function create(event) {
    event.preventDefault();
    setError("");
    const url = sourceUrl(path);
    if (
      files.some(
        (file) =>
          file.path === path || (file.frontmatter?.permalink || sourceUrl(file.path)) === url
      ) ||
      routes.includes(url) ||
      (folder && sourceDirectories(files).includes(path.replace(/\/index\.md$/, "")))
    ) {
      setError("A file, folder or page already uses that name or URL. Choose another name.");
      return;
    }
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    onCreate(path, newDocument({ path, title, kind, template, author, date }), target.selection);
  }
  return (
    <form className="admin-create" id="admin-create" onSubmit={create}>
      <h2>{folder ? "New folder" : "New file"}</h2>
      <label>
        <span>Inside folder</span>
        <select
          id="admin-new-directory"
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
        >
          {sourceDirectories(files).map((dir) => (
            <option key={dir} value={dir}>
              {dir.startsWith("src")
                ? `Personal site / ${dir.slice(4)}`
                : `Research site / ${dir.slice(22)}`}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Title</span>
        <input
          id="admin-new-title"
          autoFocus
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        <span>{folder ? "Folder name" : "File name"}</span>
        <input
          id="admin-new-path"
          spellCheck={false}
          value={fileName}
          onChange={(e) => {
            setEdited(true);
            setName(e.target.value);
          }}
          aria-describedby="admin-new-target"
        />
      </label>
      <p className="admin-create-target" id="admin-new-target">
        {path ? `${path} → ${sourceUrl(path)}` : pathError}
      </p>
      {!folder && (
        <label>
          <span>Template</span>
          <select
            id="admin-new-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            <option value="auto">Match this folder</option>
            <option value="blank">Standalone page</option>
          </select>
        </label>
      )}
      {book && (
        <label>
          <span>Book author</span>
          <input
            id="admin-new-author"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </label>
      )}
      <p className="admin-create-help">
        {folder
          ? "Creates index.md with automatic links to its children."
          : "The folder supplies the page type; the file name sets the URL."}{" "}
        Saved locally until you publish.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="admin-create-actions">
        <button className="admin-text-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="admin-solid-button"
          id="admin-new-create"
          disabled={!path || !title.trim()}
        >
          {folder ? "Create folder" : "Create draft"}
        </button>
      </div>
    </form>
  );
}
