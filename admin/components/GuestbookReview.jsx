import React, { useEffect, useState } from "react";

export function GuestbookReview({ api, onClose }) {
  const [entries, setEntries] = useState([]);
  const [next, setNext] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load(before) {
    setBusy(true);
    try {
      const result = await api(`/guestbook${before ? `?before=${before}` : ""}`);
      setEntries((previous) => (before ? [...previous, ...result.entries] : result.entries));
      setNext(result.next);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function update(entry, status) {
    setBusy(true);
    try {
      await api("/guestbook", { method: "PATCH", body: JSON.stringify({ id: entry.id, status }) });
      setEntries((previous) =>
        previous.map((item) => (item.id === entry.id ? { ...item, status } : item))
      );
      setMessage(
        status === "visible"
          ? "Note is visible on the guestbook."
          : "Note is hidden from the public guestbook. You can restore it here."
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-guestbook" aria-label="Guestbook review">
      <header className="admin-document-bar">
        <h1>Guestbook</h1>
        <button className="admin-text-button" onClick={onClose}>
          Back to editor
        </button>
      </header>
      <p>
        New notes appear immediately unless held for review. Email is visible only here. Hiding a
        note is reversible.
      </p>
      {message && <p role="status">{message}</p>}
      {!entries.length && (
        <p>
          {busy ? "Loading notes…" : "No new notes yet. Existing curated notes remain on the site."}
        </p>
      )}
      <ul className="admin-guestbook-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <header>
              <strong>{entry.name}</strong>
              <span>{entry.status}</span>
              <time dateTime={entry.date}>{new Date(entry.date).toLocaleDateString()}</time>
            </header>
            <p className="admin-guestbook-message">{entry.message}</p>
            {entry.url && (
              <p>
                <a href={entry.url} target="_blank" rel="noopener noreferrer">
                  {entry.url}
                </a>
              </p>
            )}
            {entry.email && (
              <p>
                Email: <a href={`mailto:${entry.email}`}>{entry.email}</a>
              </p>
            )}
            <div className="admin-document-actions">
              {entry.status !== "visible" && (
                <button
                  disabled={busy}
                  className="admin-text-button"
                  onClick={() => update(entry, "visible")}
                >
                  {entry.status === "held" ? "Approve note" : "Restore note"}
                </button>
              )}
              {entry.status !== "hidden" && (
                <button
                  disabled={busy}
                  className="admin-text-button"
                  onClick={() => update(entry, "hidden")}
                >
                  Hide note
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {next && (
        <button disabled={busy} className="admin-text-button" onClick={() => load(next)}>
          More notes
        </button>
      )}
    </section>
  );
}
