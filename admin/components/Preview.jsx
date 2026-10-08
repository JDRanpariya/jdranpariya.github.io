import React, { useEffect, useMemo, useRef, useState } from "react";
import { renderDocument } from "../../scripts/admin-renderer.mjs";
import { renderPage, sanitizePreview, templateEnvironment } from "../lib/preview.js";

export function Preview({ current, files, manifest, imageMap, onOpen, publicUrl, notify }) {
  const frame = useRef(null),
    viewport = useRef(null),
    [ready, setReady] = useState(false),
    [mode, setMode] = useState("responsive"),
    [width, setWidth] = useState(600),
    [notice, setNotice] = useState(""),
    [failed, setFailed] = useState(false);
  const env = useMemo(() => templateEnvironment(window.AdminTemplates), []);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  const canvasWidth = mode === "desktop" ? 1280 : mode === "mobile" ? 390 : Math.round(width),
    scale = Math.min(1, width / canvasWidth);
  useEffect(() => {
    if (!ready || !current) return;
    const doc = frame.current.contentDocument,
      root = doc?.getElementById("preview-page");
    if (!root) return;
    const scroll = doc.documentElement.scrollTop;
    try {
      const result = renderDocument(current.content, current.path, files);
      const enriched = files.map((file) => ({ ...file, url: publicUrl(file.path) }));
      root.className = result.research ? "admin-preview-page admin-research-page" : "";
      root.innerHTML = sanitizePreview(
        renderPage(env, result, current.path, enriched, manifest),
        imageMap
      );
      doc.documentElement.scrollTop = scroll;
      setNotice(
        result.warnings.join(" ") ||
          (current.dirty
            ? "Unpublished browser draft."
            : "Repository version. Deployment may still be in progress.")
      );
      setFailed(false);
    } catch (error) {
      setNotice(`Preview error: ${error.message}. The last valid preview is kept.`);
      setFailed(true);
    }
  }, [ready, current?.content, current?.path, current?.dirty, manifest, imageMap, files, env]);
  useEffect(() => {
    if (!ready) return;
    const doc = frame.current.contentDocument;
    const preventSubmit = (event) => event.preventDefault();
    const click = (event) => {
      const target = event.target.closest("a");
      if (!target) return;
      event.preventDefault();
      const href = target.getAttribute("href") || "";
      if (href.startsWith("#")) {
        doc.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView();
        return;
      }
      const origin = current?.path.startsWith("apps/research")
        ? "https://research.jdranpariya.com"
        : "https://jdranpariya.com";
      const url = new URL(href, origin).href;
      const file = files.find(
        (file) => new URL(publicUrl(file.path), "https://jdranpariya.com").href === url
      );
      if (file) onOpen(file.path);
      else
        notify(
          "Preview links cannot navigate away from your draft. Use Open published page to follow them."
        );
    };
    doc.addEventListener("click", click);
    doc.addEventListener("submit", preventSubmit);
    return () => {
      doc.removeEventListener("click", click);
      doc.removeEventListener("submit", preventSubmit);
    };
  }, [ready, current?.path, files, onOpen, publicUrl, notify]);
  function loaded() {
    setReady(Boolean(frame.current.contentDocument?.getElementById("preview-page")));
  }
  return (
    <section className="admin-preview" data-mobile-panel="preview">
      <header className="admin-preview-heading">
        <p className="admin-eyebrow">
          {current?.path.startsWith("apps/research") ? "Research" : "Personal site"} · site preview
        </p>
        {current && (
          <a id="admin-public-link" href={publicUrl(current.path)} target="_blank" rel="noopener">
            Open published page ↗
          </a>
        )}
        <label className="admin-preview-size">
          View
          <select
            aria-label="Preview viewport"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="responsive">Panel width</option>
            <option value="desktop">Desktop · 1280px</option>
            <option value="mobile">Mobile · 390px</option>
          </select>
        </label>
      </header>
      <p
        id="admin-preview-notice"
        className="admin-preview-notice"
        role={failed ? "alert" : "status"}
      >
        {notice}
      </p>
      <div className="admin-preview-viewport" ref={viewport}>
        <iframe
          ref={frame}
          id="admin-preview-content"
          title="Live site preview"
          sandbox="allow-same-origin"
          src={window.AdminPreview.url}
          onLoad={loaded}
          className="admin-preview-frame"
          style={{
            width: canvasWidth,
            height: `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </section>
  );
}
