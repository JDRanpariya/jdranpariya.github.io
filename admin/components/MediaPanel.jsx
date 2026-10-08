import React, { useState } from "react";
import { preparePhoto, MAX_PHOTOS } from "../lib/media.js";
import { galleryMarkdown } from "../../scripts/photo-gallery.mjs";

export function MediaPanel({
  library,
  imageMap,
  onStore,
  onInsert,
  onCancel,
  research,
  initialPhotos = [],
  publishing = false,
}) {
  const [photos, setPhotos] = useState(
      initialPhotos.map((photo) => ({
        ...photo,
        src: photo.src.replace(/^https:\/\/jdranpariya\.com/, ""),
        name: photo.src.split("/").at(-1),
        url: imageMap[photo.src.replace(/^https:\/\/jdranpariya\.com/, "")] || photo.src,
      }))
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function add(photo) {
    setPhotos((prev) =>
      prev.some((p) => p.src === `/${photo.path}`)
        ? prev
        : [
            ...prev,
            {
              src: `/${photo.path}`,
              name: photo.name || photo.path.split("/").at(-1),
              url: photo.url || imageMap[`/${photo.path}`] || `/${photo.path}`,
              alt: "",
              caption: "",
            },
          ]
    );
  }
  async function upload(files) {
    setError("");
    if (photos.length + files.length > MAX_PHOTOS) {
      setError(`Choose up to ${MAX_PHOTOS} photos per block. You can add more blocks.`);
      return;
    }
    setBusy(true);
    try {
      for (const file of files) {
        const photo = await preparePhoto(file);
        const saved = await onStore(photo);
        add(saved);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function update(index, field, value) {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }
  function move(index, by) {
    setPhotos((prev) => {
      const next = [...prev];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }
  function insert() {
    try {
      if (!photos.length && initialPhotos.length) {
        onInsert("");
        return;
      }
      onInsert(
        galleryMarkdown(
          photos.map((p) => ({ ...p, src: research ? `https://jdranpariya.com${p.src}` : p.src }))
        )
      );
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section
      className="admin-media"
      aria-labelledby="admin-media-title"
      inert={publishing ? true : undefined}
    >
      <div className="admin-media-heading">
        <h2 id="admin-media-title">{initialPhotos.length ? "Edit photos" : "Add photos"}</h2>
        <button className="admin-text-button" onClick={onCancel}>
          Close
        </button>
      </div>
      <p>
        Insert at the cursor. One photo is a single figure; several form a gallery. Nothing uploads
        until you publish.
      </p>
      <label className="admin-photo-picker">
        Choose photos
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={busy}
          onChange={(e) => {
            upload([...e.target.files]);
            e.target.value = "";
          }}
        />
      </label>
      <p className="admin-create-help">
        Photos keep their proportions. Large files are resized; location and camera metadata are
        removed.
      </p>
      <details>
        <summary>Reuse a photo</summary>
        <div className="admin-media-library">
          {library.map((photo) => (
            <button
              type="button"
              key={photo.path}
              disabled={photos.length >= MAX_PHOTOS}
              onClick={() => add(photo)}
            >
              <img
                src={photo.url || imageMap[`/${photo.path}`] || `/${photo.path}`}
                alt=""
                loading="lazy"
              />
              <span>{photo.name || photo.path.split("/").at(-1)}</span>
            </button>
          ))}
          {!library.length && <p>No photos yet.</p>}
        </div>
      </details>
      <ol className="admin-photo-list">
        {photos.map((photo, index) => (
          <li key={photo.src}>
            <img src={photo.url} alt="" />
            <div>
              <p className="admin-photo-name">
                {index + 1}. {photo.name}
              </p>
              <label>
                Description (alt text)
                <input
                  aria-label={`Description for photo ${index + 1}`}
                  value={photo.alt}
                  onChange={(e) => update(index, "alt", e.target.value)}
                />
              </label>
              <label>
                Caption (optional)
                <input
                  aria-label={`Caption for photo ${index + 1}`}
                  value={photo.caption}
                  onChange={(e) => update(index, "caption", e.target.value)}
                />
              </label>
              <div className="admin-create-actions">
                <button
                  className="admin-text-button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  Move up
                </button>
                <button
                  className="admin-text-button"
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Move down
                </button>
                <button
                  className="admin-text-button"
                  onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove from block
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {error && <p role="alert">{error}</p>}
      <div className="admin-create-actions">
        <button className="admin-text-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="admin-solid-button"
          disabled={
            busy || (!photos.length && !initialPhotos.length) || photos.some((p) => !p.alt.trim())
          }
          onClick={insert}
        >
          {busy
            ? "Preparing photos…"
            : !photos.length && initialPhotos.length
              ? "Remove photo block"
              : initialPhotos.length
                ? "Update photo block"
                : "Insert photo block"}
        </button>
      </div>
    </section>
  );
}
