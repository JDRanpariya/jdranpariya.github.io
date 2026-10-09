import React, { useState } from "react";
import { useWorkspace } from "./hooks/useWorkspace.js";
import { defaultLayout, saveDraft } from "./lib/storage.js";
import { buildFileTree } from "../scripts/admin-renderer.mjs";
import { FileTree } from "./components/FileTree.jsx";
import { CreateDocument } from "./components/CreateDocument.jsx";
import { Divider } from "./components/Divider.jsx";
import { Editor } from "./components/Editor.jsx";
import { Preview } from "./components/Preview.jsx";
import { GuestbookReview } from "./components/GuestbookReview.jsx";

export function App() {
  const [reviewGuestbook, setReviewGuestbook] = useState(false);
  const {
    session,
    setSession,
    loading,
    status,
    files,
    routes,
    manifest,
    imageMap,
    photos,
    library,
    current,
    setCurrent,
    layout,
    setLayout,
    query,
    setQuery,
    creation,
    setCreation,
    selection,
    linkSelection,
    setLinkSelection,
    showMedia,
    setShowMedia,
    busy,
    mobile,
    setMobile,
    password,
    setPassword,
    textarea,
    workspace,
    urls,
    notify,
    api,
    publicUrl,
    open,
    openRef,
    captureSelection,
    change,
    created,
    createIn,
    rememberPhoto,
    insertPhotos,
    publish,
    useRepositoryVersion,
    restorePreviousDraft,
    editingGallery,
    toggle,
  } = useWorkspace();
  const visible = (p) => !layout.hidden.includes(p),
    columns = [];
  if (visible("files")) {
    columns.push(
      visible("edit") || visible("preview") ? `${layout.filesWidth}px` : "minmax(0,1fr)"
    );
    if (visible("edit") || visible("preview")) columns.push("6px");
  }
  if (visible("edit")) columns.push(`minmax(0,${visible("preview") ? layout.ratio : 1}fr)`);
  if (visible("edit") && visible("preview")) columns.push("6px");
  if (visible("preview")) columns.push(`minmax(0,${visible("edit") ? 1 - layout.ratio : 1}fr)`);
  const defaultDirectory = current?.path.slice(0, current.path.lastIndexOf("/")) || "src";
  return (
    <>
      <a className="admin-skip" href="#admin-main">
        Skip to main content
      </a>
      <header className="admin-topbar">
        <a className="admin-wordmark" href="/admin/">
          Jay's sites <span>/ admin</span>
        </a>
        {session?.authenticated && (
          <div className="admin-account">
            <nav className="admin-layout-controls" aria-label="Workspace layout">
              {["files", "edit", "preview"].map((panel) => (
                <button
                  key={panel}
                  className="admin-text-button"
                  aria-pressed={visible(panel)}
                  onClick={() => toggle(panel)}
                >
                  {panel === "edit" ? "Editor" : panel[0].toUpperCase() + panel.slice(1)}
                </button>
              ))}
              <button className="admin-text-button" onClick={() => setLayout({ ...defaultLayout })}>
                Reset layout
              </button>
            </nav>
            <span id="admin-identity">
              {session.readOnly ? "Local preview" : `@${session.login}`}
            </span>
            {session.features?.guestbook && (
              <button
                className="admin-text-button"
                onClick={() => setReviewGuestbook(!reviewGuestbook)}
                aria-pressed={reviewGuestbook}
              >
                Guestbook
              </button>
            )}
            {!session.readOnly && (
              <button
                className="admin-text-button"
                onClick={() =>
                  api("/logout", { method: "POST" })
                    .then(() => setSession({ authenticated: false }))
                    .catch((e) => notify(e.message))
                }
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </header>
      <main id="admin-main">
        {loading ? (
          <section className="admin-gate">
            <p>Opening editor…</p>
          </section>
        ) : !session?.authenticated ? (
          <section className="admin-gate">
            <h1>Sign in</h1>
            <form
              className="admin-login-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("/auth/login", { method: "POST", body: JSON.stringify({ password }) });
                  location.reload();
                } catch (error) {
                  notify(error.message);
                }
              }}
            >
              <label htmlFor="admin-password">Passphrase</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="admin-primary-link">Sign in</button>
            </form>
          </section>
        ) : reviewGuestbook ? (
          <GuestbookReview api={api} onClose={() => setReviewGuestbook(false)} />
        ) : (
          <section
            className="admin-workspace"
            id="admin-workspace"
            ref={workspace}
            data-active-panel={mobile}
            style={{ gridTemplateColumns: columns.join(" ") }}
          >
            {visible("files") && (
              <aside className="admin-files" data-mobile-panel="files">
                <div className="admin-panel-heading">
                  <div>
                    <p className="admin-eyebrow">Repository</p>
                    <h1>Files</h1>
                  </div>
                  <div className="admin-create-toolbar">
                    <button
                      className="admin-text-button"
                      onClick={() => createIn(defaultDirectory, "file")}
                    >
                      New file
                    </button>
                    <button
                      className="admin-text-button"
                      onClick={() => createIn(defaultDirectory, "folder")}
                    >
                      New folder
                    </button>
                  </div>
                </div>
                <label className="admin-search">
                  <span className="sr-only">Search files</span>
                  <input
                    type="search"
                    id="admin-file-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a file"
                  />
                </label>
                {creation && (
                  <CreateDocument
                    key={`${creation.directory}:${creation.kind}`}
                    target={creation}
                    files={files}
                    routes={routes}
                    onCancel={() => setCreation(null)}
                    onCreate={created}
                  />
                )}
                {linkSelection && (
                  <div className="admin-mode-notice">
                    Choose the destination note.
                    <button className="admin-text-button" onClick={() => setLinkSelection(null)}>
                      Cancel
                    </button>
                  </div>
                )}
                <FileTree
                  files={files}
                  query={query}
                  current={current?.path}
                  layout={layout}
                  setLayout={setLayout}
                  onOpen={open}
                  onCreate={createIn}
                />
                <div className="admin-tree-controls">
                  {[true, false].map((expand) => (
                    <button
                      className="admin-text-button"
                      key={String(expand)}
                      onClick={() => {
                        const folders = {};
                        const visit = (node) =>
                          [...node.directories.values()].forEach((folder) => {
                            folders[folder.key] = expand;
                            visit(folder);
                          });
                        visit(buildFileTree(files));
                        setLayout((prev) => ({ ...prev, folders }));
                      }}
                    >
                      {expand ? "Expand all" : "Collapse all"}
                    </button>
                  ))}
                </div>
              </aside>
            )}
            {visible("files") && (visible("edit") || visible("preview")) && (
              <Divider
                kind="files"
                value={layout.filesWidth}
                workspace={workspace}
                onChange={(filesWidth) => setLayout((prev) => ({ ...prev, filesWidth }))}
              />
            )}
            {visible("edit") && (
              <Editor
                current={current}
                textarea={textarea}
                busy={busy}
                readOnly={session.readOnly}
                selection={selection}
                captureSelection={captureSelection}
                onChange={change}
                onPublish={publish}
                onUseRepository={useRepositoryVersion}
                onRestoreDraft={restorePreviousDraft}
                onReview={() => {
                  try {
                    saveDraft(current.path, current.content, current.sha);
                    setCurrent({ ...current, draftSha: current.sha, conflict: false });
                  } catch {
                    notify("Browser storage is unavailable. Keep a copy before leaving.");
                  }
                }}
                onLink={() => {
                  setLinkSelection(selection);
                  setLayout((prev) => ({
                    ...prev,
                    hidden: prev.hidden.filter((p) => p !== "files"),
                  }));
                  setMobile("files");
                }}
                onNewLinked={() => createIn(defaultDirectory, "file", selection)}
                showMedia={showMedia}
                setShowMedia={setShowMedia}
                editingGallery={editingGallery}
                mediaProps={{
                  library: [
                    ...photos.map((photo) => ({ ...photo, url: urls.current.get(photo.path) })),
                    ...library.filter((file) => !photos.some((photo) => photo.path === file.path)),
                  ],
                  imageMap,
                  onStore: rememberPhoto,
                  onInsert: insertPhotos,
                  research: current?.path.startsWith("apps/research"),
                  initialPhotos: editingGallery?.items || [],
                }}
              />
            )}
            {visible("edit") && visible("preview") && (
              <Divider
                kind="preview"
                value={layout.ratio}
                workspace={workspace}
                onChange={(ratio) => setLayout((prev) => ({ ...prev, ratio }))}
              />
            )}
            {visible("preview") && (
              <Preview
                current={current}
                files={files}
                manifest={manifest}
                imageMap={imageMap}
                onOpen={(path) => openRef.current(path)}
                publicUrl={publicUrl}
                notify={notify}
              />
            )}
          </section>
        )}
      </main>
      {session?.authenticated && (
        <nav className="admin-mobile-tabs" aria-label="Workspace panels">
          {["files", "edit", "preview", ...(session.features?.guestbook ? ["guestbook"] : [])].map(
            (panel) => (
              <button
                key={panel}
                data-admin-tab={panel}
                aria-pressed={
                  panel === "guestbook" ? reviewGuestbook : !reviewGuestbook && mobile === panel
                }
                onClick={() => {
                  setReviewGuestbook(panel === "guestbook");
                  if (panel === "guestbook") return;
                  setMobile(panel);
                  setLayout((prev) => ({
                    ...prev,
                    hidden: prev.hidden.filter((p) => p !== panel),
                  }));
                }}
              >
                {panel === "edit" ? "Editor" : panel[0].toUpperCase() + panel.slice(1)}
              </button>
            )
          )}
        </nav>
      )}
      <div
        className={`admin-status${status ? " is-visible" : ""}`}
        id="admin-status"
        role="status"
        aria-live="polite"
      >
        {status}
      </div>
    </>
  );
}
