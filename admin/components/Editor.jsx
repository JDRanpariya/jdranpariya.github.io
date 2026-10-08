import React from "react";
import { MediaPanel } from "./MediaPanel.jsx";

export function Editor({
  current,
  textarea,
  busy,
  readOnly,
  selection,
  captureSelection,
  onChange,
  onPublish,
  onReview,
  onUseRepository,
  onRestoreDraft,
  onLink,
  onNewLinked,
  showMedia,
  setShowMedia,
  mediaProps,
  editingGallery,
}) {
  return (
    <section className="admin-editor" data-mobile-panel="edit">
      <header className="admin-document-bar">
        <div className="admin-document-name">
          <p id="admin-file-path">{current?.path || "Choose a file"}</p>
          <span id="admin-draft-state">
            {current?.dirty
              ? current.draftSaved === false
                ? "Draft is not saved. Keep a copy before leaving."
                : "Draft saved in this browser"
              : current
                ? "Repository version"
                : ""}
          </span>
        </div>
        <div className="admin-document-actions">
          {current?.dirty && current.sha && !current.conflict && (
            <button className="admin-text-button" disabled={busy} onClick={onUseRepository}>
              Use repository version
            </button>
          )}
          <button
            className="admin-text-button"
            id="admin-add-photos"
            disabled={!current || busy}
            onClick={() => setShowMedia(!showMedia)}
          >
            {editingGallery ? "Edit photos" : "Add photos"}
          </button>
          <button
            className="admin-text-button"
            id="admin-create-linked"
            disabled={!selection?.text || busy}
            onClick={onNewLinked}
          >
            New note from selection
          </button>
          <button
            className="admin-text-button"
            id="admin-link-existing"
            disabled={!selection?.text || busy}
            onClick={onLink}
          >
            Link existing
          </button>
          <button
            className="admin-solid-button"
            id="admin-publish"
            disabled={readOnly || !current?.dirty || current?.conflict || busy}
            onClick={onPublish}
          >
            {busy ? "Working…" : readOnly ? "Preview only" : "Publish"}
          </button>
        </div>
      </header>
      {current?.conflict && (
        <div className="admin-mode-notice">
          <p>The repository version changed. Review it before replacing it with your draft.</p>
          <details>
            <summary>Current repository source</summary>
            <pre id="admin-conflict-source">{current.remoteContent}</pre>
          </details>
          <button className="admin-text-button" disabled={busy} onClick={onUseRepository}>
            Use repository version
          </button>
          <button className="admin-text-button" disabled={busy} onClick={onReview}>
            I've reviewed it. Keep my draft.
          </button>
        </div>
      )}
      {current?.recoveryDraft && (
        <details className="admin-draft-recovery" key={current.path}>
          <summary>Previous browser draft</summary>
          <p>Saved only in this browser. Restoring it does not publish it.</p>
          <button
            className="admin-text-button"
            disabled={busy || current.content === current.recoveryDraft.content}
            onClick={onRestoreDraft}
          >
            Restore previous draft
          </button>
          <details>
            <summary>View saved source</summary>
            <pre>{current.recoveryDraft.content}</pre>
          </details>
        </details>
      )}
      {showMedia && (
        <MediaPanel
          key={`${current.path}:${editingGallery?.start ?? "new"}`}
          {...mediaProps}
          publishing={busy}
          onCancel={() => setShowMedia(false)}
        />
      )}
      <textarea
        ref={textarea}
        id="admin-source"
        aria-label="Markdown source"
        autoComplete="off"
        autoCapitalize="sentences"
        spellCheck
        disabled={!current}
        readOnly={busy}
        value={current?.content || ""}
        placeholder="Choose a Markdown file to begin."
        onChange={(event) => onChange(event.target.value)}
        onSelect={captureSelection}
        onKeyUp={captureSelection}
        onMouseUp={captureSelection}
        onBlur={captureSelection}
      />
    </section>
  );
}
