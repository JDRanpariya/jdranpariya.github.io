import React, { useMemo, useRef } from "react";
import { buildFileTree } from "../../scripts/admin-renderer.mjs";

export function FileTree({ files, query, current, layout, setLayout, onOpen, onCreate }) {
  const tree = useMemo(() => buildFileTree(files, query), [files, query]);
  const dragging = useRef(null);
  const count = (node) =>
    node.files.length + [...node.directories.values()].reduce((n, child) => n + count(child), 0);
  const rank = (key) => (layout.order.includes(key) ? layout.order.indexOf(key) : 1000);
  function move(source, target, siblings) {
    if (source === target || !siblings.includes(source) || !siblings.includes(target)) return;
    const order = siblings.filter((key) => key !== source);
    order.splice(siblings.indexOf(target), 0, source);
    setLayout((previous) => ({
      ...previous,
      order: [...previous.order.filter((key) => !siblings.includes(key)), ...order],
    }));
  }
  function nodeView(node, depth = 0) {
    const dirs = [...node.directories.values()].sort(
      (a, b) => rank(a.key) - rank(b.key) || a.name.localeCompare(b.name)
    );
    const siblings = dirs.map((folder) => folder.key);
    return (
      <>
        {dirs.map((folder) => (
          <div key={folder.key} className="admin-folder-group">
            <details
              className="admin-folder"
              data-folder={folder.key}
              data-root={depth === 0 || undefined}
              open={Boolean(query) || layout.folders[folder.key] !== false}
            >
              <summary
                draggable
                title="Drag to reorder; Alt + Arrow Up/Down also works"
                onClick={(event) => {
                  event.preventDefault();
                  setLayout((prev) => ({
                    ...prev,
                    folders: { ...prev.folders, [folder.key]: prev.folders[folder.key] === false },
                  }));
                }}
                onDragStart={(event) => {
                  event.stopPropagation();
                  dragging.current = folder.key;
                  event.dataTransfer.setData("text/plain", folder.key);
                }}
                onDragOver={(event) => {
                  if (siblings.includes(dragging.current)) {
                    event.preventDefault();
                    event.currentTarget.dataset.drop = "true";
                  }
                }}
                onDragLeave={(event) => delete event.currentTarget.dataset.drop}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  delete event.currentTarget.dataset.drop;
                  move(dragging.current, folder.key, siblings);
                  dragging.current = null;
                }}
                onKeyDown={(event) => {
                  if (event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
                    event.preventDefault();
                    const target =
                      siblings[siblings.indexOf(folder.key) + (event.key === "ArrowDown" ? 1 : -1)];
                    if (target) move(folder.key, target, siblings);
                  }
                }}
              >
                <span className="admin-folder-name">{folder.name}</span>
                <span className="admin-folder-count">{count(folder)}</span>
              </summary>
              {nodeView(folder, depth + 1)}
            </details>
            {!folder.path.startsWith("src/now") && (
              <div className="admin-folder-actions">
                {["file", "folder"].map((kind) => (
                  <button
                    key={kind}
                    className="admin-folder-action"
                    type="button"
                    aria-label={`New ${kind} in ${folder.path}`}
                    title={`New ${kind} here`}
                    onClick={() => onCreate(folder.path, kind)}
                  >
                    {kind === "file" ? "⊕" : "▣"}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {node.files.map((file) => (
          <button
            key={file.path}
            type="button"
            className="admin-file-button"
            data-file-path={file.path}
            aria-current={current === file.path ? "page" : undefined}
            data-draft={file.localOnly || undefined}
            title={file.path}
            onClick={() => onOpen(file.path)}
          >
            {file.path.split("/").at(-1)}
          </button>
        ))}
      </>
    );
  }
  return (
    <nav className="admin-file-list" id="admin-file-list" aria-label="Markdown files">
      {tree.files.length || tree.directories.size ? (
        nodeView(tree)
      ) : (
        <p className="admin-file-empty">No matching files.</p>
      )}
    </nav>
  );
}
