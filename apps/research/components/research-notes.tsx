"use client";

import { researchThemes, type ResearchTheme } from "@/data/research-themes";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PreviewState = { theme: ResearchTheme; left: number; top: number };

const themeBySlug = new Map(researchThemes.map((theme) => [theme.slug, theme]));

function normalizePath(path: string[]) {
  const seen = new Set<string>();
  return path.filter((slug) => {
    if (!themeBySlug.has(slug) || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function readPathFromLocation() {
  return normalizePath(new URL(window.location.href).searchParams.getAll("notes"));
}

function hrefForPath(path: string[]) {
  const params = new URLSearchParams();
  path.forEach((slug) => params.append("notes", slug));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function isPlainPrimaryClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function ResearchNotes({ initialPath }: { initialPath: string[] }) {
  const [path, setPath] = useState(() => normalizePath(initialPath));
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const stackRef = useRef<HTMLElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTrail = useCallback((nextPath: string[], mode: "push" | "replace" = "push") => {
    const normalized = normalizePath(nextPath);
    setPath(normalized);
    setPreview(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("notes");
    normalized.forEach((slug) => url.searchParams.append("notes", slug));
    window.history[mode === "push" ? "pushState" : "replaceState"](
      { notes: normalized },
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPath(readPathFromLocation());
      setPreview(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack || window.matchMedia("(max-width: 800px)").matches) return;
    const frame = requestAnimationFrame(() => {
      stack.scrollTo({ left: Math.max(0, (path.length - 1) * 585), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [path]);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, []);

  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    []
  );

  const panels = useMemo(
    () => [
      { slug: "research", title: "Research", theme: undefined, path: [] as string[] },
      ...path.map((slug, index) => ({
        slug,
        title: themeBySlug.get(slug)?.title ?? slug,
        theme: themeBySlug.get(slug),
        path: path.slice(0, index + 1),
      })),
    ],
    [path]
  );

  function openTheme(
    event: React.MouseEvent<HTMLAnchorElement>,
    slug: string,
    sourceIndex: number
  ) {
    if (!isPlainPrimaryClick(event)) return;
    event.preventDefault();
    const openIndex = path.indexOf(slug);
    if (openIndex >= 0) {
      setTrail(path.slice(0, openIndex + 1));
      return;
    }
    setTrail([...path.slice(0, sourceIndex + 1), slug]);
  }

  function schedulePreview(anchor: HTMLAnchorElement, slug: string, immediate = false) {
    if (!window.matchMedia("(min-width: 801px) and (hover: hover) and (pointer: fine)").matches)
      return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(
      () => {
        const theme = themeBySlug.get(slug);
        if (!theme || !document.contains(anchor)) return;
        const rect = anchor.getBoundingClientRect();
        const width = Math.min(500, window.innerWidth - 32);
        const height = Math.min(400, window.innerHeight - 32);
        const fitsRight = rect.right + 14 + width <= window.innerWidth - 16;
        const left = fitsRight ? rect.right + 14 : Math.max(16, rect.left - width - 14);
        const top = Math.min(Math.max(16, rect.top - 28), window.innerHeight - height - 16);
        setPreview({ theme, left, top });
      },
      immediate ? 0 : 260
    );
  }

  function hidePreview() {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    setPreview(null);
  }

  function themeLink(theme: ResearchTheme, sourceIndex: number) {
    const nextPath = [...path.slice(0, sourceIndex + 1), theme.slug];
    const isOpenNext = path[sourceIndex + 1] === theme.slug;
    return (
      <Link
        href={hrefForPath(nextPath)}
        className={`research-note-link${isOpenNext ? " is-open" : ""}`}
        onClick={(event) => openTheme(event, theme.slug, sourceIndex)}
        onMouseEnter={(event) => schedulePreview(event.currentTarget, theme.slug)}
        onMouseLeave={hidePreview}
        onFocus={(event) => schedulePreview(event.currentTarget, theme.slug, true)}
        onBlur={hidePreview}
      >
        {theme.title}
      </Link>
    );
  }

  return (
    <>
      <section
        ref={stackRef}
        className={`research-note-stack${panels.length > 2 ? " has-overflowing-trail" : ""}`}
        aria-label="Open research notes"
      >
        {panels.map((panel, panelIndex) => (
          <article key={panel.slug} className="research-note-pane" aria-label={panel.title}>
            <Link
              href={hrefForPath(panel.path)}
              className="research-note-obscured-label"
              onClick={(event) => {
                if (!isPlainPrimaryClick(event)) return;
                event.preventDefault();
                setTrail(panel.path);
              }}
              tabIndex={panelIndex < panels.length - 2 ? 0 : -1}
            >
              {panel.title}
            </Link>

            {panel.theme ? (
              <div className="research-note-content">
                <h1>{panel.theme.title}</h1>
                <p>{panel.theme.questions}</p>
                {panel.theme.links?.length ? (
                  <ul className="research-note-links">
                    {panel.theme.links
                      .map((slug) => themeBySlug.get(slug))
                      .filter((theme): theme is ResearchTheme => Boolean(theme))
                      .map((theme) => (
                        <li key={theme.slug}>{themeLink(theme, panelIndex - 1)}</li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="research-note-content research-root-note">
                <header className="research-intro">
                  <h1>information, compression and learning dynamics</h1>
                  <p>
                    Anything you can formalize can be simulated, and substrate only matters for
                    cost: energy, time, parallelism, and noise tolerance.{" "}
                    <em>
                      A mechanism carries over if the constraint that made it worthwhile still holds
                      on the new substrate.
                    </em>
                  </p>
                  <p>
                    I want to understand how intelligent systems learn to perceive, act, remember,
                    and adapt in the physical world, and which principles from biological
                    intelligence can help us build better ones.
                  </p>
                </header>
                <ul className="theme-list">
                  {researchThemes.map((theme) => (
                    <li key={theme.slug}>
                      <strong>{theme.title}:</strong> {theme.questions}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </section>

      {preview ? (
        <aside
          className="research-note-preview"
          style={{ left: preview.left, top: preview.top }}
          aria-hidden="true"
        >
          <div className="research-note-preview-content">
            <h2>{preview.theme.title}</h2>
            <p>{preview.theme.questions}</p>
          </div>
        </aside>
      ) : null}
    </>
  );
}
