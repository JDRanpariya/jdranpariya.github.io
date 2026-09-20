"use client";

import { researchThemes, type ResearchTheme } from "@/data/research-themes";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PreviewState = {
  theme: ResearchTheme;
  left: number;
  top: number;
};

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
  const activePane = useRef<HTMLElement>(null);
  const shouldFocusActivePane = useRef(false);

  const activeTheme = path.length ? themeBySlug.get(path[path.length - 1]) : undefined;

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
    if (!shouldFocusActivePane.current || !path.length) return;
    activePane.current?.focus({ preventScroll: true });
    shouldFocusActivePane.current = false;
  }, [path]);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, []);

  const trail = useMemo(
    () => [
      { title: "Research", path: [] as string[] },
      ...path.slice(0, -1).map((slug, index) => ({
        title: themeBySlug.get(slug)?.title ?? slug,
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
    shouldFocusActivePane.current = true;

    const openIndex = path.indexOf(slug);
    if (openIndex >= 0) {
      setTrail(path.slice(0, openIndex + 1));
      return;
    }

    setTrail([...path.slice(0, sourceIndex + 1), slug]);
  }

  function showPreview(anchor: HTMLAnchorElement, slug: string, fromKeyboard = false) {
    const theme = themeBySlug.get(slug);
    if (!theme) return;
    if (!fromKeyboard && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const rect = anchor.getBoundingClientRect();
    const width = Math.min(500, window.innerWidth - 32);
    const estimatedHeight = 250;
    const fitsRight = rect.right + 16 + width <= window.innerWidth - 16;
    const left = fitsRight ? rect.right + 16 : Math.max(16, rect.left - width - 16);
    const top = Math.min(Math.max(16, rect.top - 24), window.innerHeight - estimatedHeight - 16);
    setPreview({ theme, left, top });
  }

  function themeLink(theme: ResearchTheme, sourceIndex: number) {
    const nextPath = [...path.slice(0, sourceIndex + 1), theme.slug];
    return (
      <Link
        href={hrefForPath(nextPath)}
        className="research-note-link"
        onClick={(event) => openTheme(event, theme.slug, sourceIndex)}
        onMouseEnter={(event) => showPreview(event.currentTarget, theme.slug)}
        onMouseLeave={() => setPreview(null)}
        onFocus={(event) => showPreview(event.currentTarget, theme.slug, true)}
        onBlur={() => setPreview(null)}
      >
        {theme.title}
      </Link>
    );
  }

  const rootNote = (
    <article className="research-index research-root-note">
      <header className="research-intro">
        <h1>information, compression and learning dynamics</h1>
        <p>
          Anything you can formalize can be simulated, and substrate only matters for cost: energy,
          time, parallelism, and noise tolerance.{" "}
          <em>
            A mechanism carries over if the constraint that made it worthwhile still holds on the
            new substrate.
          </em>
        </p>
        <p>
          I want to understand how intelligent systems learn to perceive, act, remember, and adapt
          in the physical world, and which principles from biological intelligence can help us build
          better ones.
        </p>
      </header>

      <ul className="theme-list">
        {researchThemes.map((theme) => (
          <li key={theme.slug}>
            <strong>{themeLink(theme, -1)}:</strong> {theme.questions}
          </li>
        ))}
      </ul>
    </article>
  );

  return (
    <>
      {!activeTheme ? (
        rootNote
      ) : (
        <section className="research-note-stack" aria-label="Open research notes">
          <nav className="research-note-rails" aria-label="Research note trail">
            {trail.map((item) => (
              <Link
                key={item.path.join("/") || "research"}
                href={hrefForPath(item.path)}
                className="research-note-rail"
                onClick={(event) => {
                  if (!isPlainPrimaryClick(event)) return;
                  event.preventDefault();
                  shouldFocusActivePane.current = true;
                  setTrail(item.path);
                }}
                aria-label={`Open ${item.title}`}
              >
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          <article ref={activePane} className="research-note-pane" tabIndex={-1}>
            <Link
              href={hrefForPath(path.slice(0, -1))}
              className="research-note-mobile-back"
              onClick={(event) => {
                if (!isPlainPrimaryClick(event)) return;
                event.preventDefault();
                shouldFocusActivePane.current = true;
                setTrail(path.slice(0, -1));
              }}
            >
              ← Research
            </Link>
            <header className="research-note-header">
              <p className="ui-label">Research note</p>
              <h1>{activeTheme.title}</h1>
            </header>
            <p className="research-note-question">{activeTheme.questions}</p>

            {activeTheme.links?.length ? (
              <ul className="research-note-links">
                {activeTheme.links
                  .map((slug) => themeBySlug.get(slug))
                  .filter((theme): theme is ResearchTheme => Boolean(theme))
                  .map((theme) => (
                    <li key={theme.slug}>{themeLink(theme, path.length - 1)}</li>
                  ))}
              </ul>
            ) : null}
          </article>
        </section>
      )}

      {preview ? (
        <aside
          className="research-note-preview"
          style={{ left: preview.left, top: preview.top }}
          aria-hidden="true"
        >
          <p className="ui-label">Research note</p>
          <h2>{preview.theme.title}</h2>
          <p>{preview.theme.questions}</p>
        </aside>
      ) : null}
    </>
  );
}
