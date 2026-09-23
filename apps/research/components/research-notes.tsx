"use client";

import { parseResearchHome, type ResearchHome, type ResearchTheme } from "@/lib/research-home";
import {
  type CSSProperties,
  type ReactNode,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const PUBLISHED_MARKDOWN =
  "https://raw.githubusercontent.com/JDRanpariya/jdranpariya.github.io/refs/heads/main/apps/research/content/research-home.md";

function normalizePath(path: string[], themes: ReadonlyMap<string, ResearchTheme>) {
  const seen = new Set<string>();
  return path.filter((slug) => {
    if (!themes.has(slug) || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function hrefForPath(path: string[], focusIndex = path.length) {
  const params = new URLSearchParams();
  path.forEach((slug) => params.append("notes", slug));
  if (path.length && focusIndex !== path.length) params.set("noteFocus", String(focusIndex));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function renderInline(text: string, openNote?: (slug: string) => void): ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^)]+\)|_[^_]+_)/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, destination] = link;
      const noteSlug = destination.startsWith("note:") ? destination.slice(5) : undefined;
      const isExternal = /^https?:\/\//u.test(destination);
      return (
        <a
          className={isExternal ? "research-outbound-link" : undefined}
          href={noteSlug ? `/?notes=${encodeURIComponent(noteSlug)}` : destination}
          key={index}
          rel={isExternal ? "noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
          onClick={
            noteSlug && openNote
              ? (event) => {
                  event.preventDefault();
                  openNote(noteSlug);
                }
              : undefined
          }
        >
          {label}
        </a>
      );
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function paneScrollLeft(index: number, paneWidth: number, paneEdge: number, maximum: number) {
  return Math.min(Math.max(0, maximum), Math.max(0, index) * Math.max(0, paneWidth - paneEdge));
}

export function ResearchNotes({
  initialDocument,
  initialFocus,
  initialPath,
}: {
  initialDocument: ResearchHome;
  initialFocus: number;
  initialPath: string[];
}) {
  const [researchDocument, setResearchDocument] = useState(initialDocument);
  const themeBySlug = useMemo(
    () => new Map(researchDocument.themes.map((theme) => [theme.slug, theme])),
    [researchDocument.themes]
  );
  const [path, setPath] = useState(() => normalizePath(initialPath, themeBySlug));
  const [focusIndex, setFocusIndex] = useState(() => initialFocus);
  const [obscured, setObscured] = useState<ReadonlySet<number>>(() => new Set());
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const horizontalGesture = useRef(false);
  const returnGesture = useRef(false);
  const scrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panels = useMemo(
    () => [
      { slug: "research", title: "Research", theme: undefined },
      ...path.map((slug) => ({
        slug,
        title: themeBySlug.get(slug)?.title ?? slug,
        theme: themeBySlug.get(slug),
      })),
    ],
    [path, themeBySlug]
  );

  const writeLocation = useCallback(
    (nextPath: string[], nextFocus: number, mode: "push" | "replace") => {
      const url = new URL(window.location.href);
      url.searchParams.delete("notes");
      url.searchParams.delete("noteFocus");
      nextPath.forEach((slug) => url.searchParams.append("notes", slug));
      if (nextPath.length && nextFocus !== nextPath.length) {
        url.searchParams.set("noteFocus", String(nextFocus));
      }
      window.history[mode === "push" ? "pushState" : "replaceState"](
        { notes: nextPath, noteFocus: nextFocus },
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    },
    []
  );

  const measureObscured = useCallback(() => {
    const stack = window.document.querySelector<HTMLElement>(".research-note-stack");
    if (!stack) return;
    const panes = [...stack.querySelectorAll<HTMLElement>(".research-note-pane")];
    const edge = Number.parseFloat(getComputedStyle(stack).getPropertyValue("--pane-edge")) || 40;
    const next = new Set<number>();
    for (let index = 0; index < panes.length - 1; index += 1) {
      const pane = panes[index];
      const following = panes[index + 1];
      if (pane && following) {
        const paneLeft = pane.getBoundingClientRect().left;
        const followingLeft = following.getBoundingClientRect().left;
        if (followingLeft - paneLeft <= edge + 1) next.add(index);
      }
    }
    setObscured((current) => {
      if (current.size === next.size && [...current].every((index) => next.has(index)))
        return current;
      return next;
    });
  }, []);

  const scrollToPane = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const stack = window.document.querySelector<HTMLElement>(".research-note-stack");
    if (!stack) return;
    const pane = stack.querySelector<HTMLElement>(`[data-pane-index="${index}"]`);
    if (!pane) return;
    const edge = Number.parseFloat(getComputedStyle(stack).getPropertyValue("--pane-edge")) || 40;
    stack.scrollTo({
      left: paneScrollLeft(index, pane.offsetWidth, edge, stack.scrollWidth - stack.clientWidth),
      behavior,
    });
  }, []);

  const focusPane = useCallback(
    (index: number, mode: "push" | "replace" = "push") => {
      const bounded = Math.max(0, Math.min(index, panels.length - 1));
      setFocusIndex(bounded);
      writeLocation(path, bounded, mode);
      requestAnimationFrame(() => scrollToPane(bounded));
    },
    [panels.length, path, scrollToPane, writeLocation]
  );

  const closeAfterPane = useCallback(
    (index: number, mode: "push" | "replace" = "push") => {
      const bounded = Math.max(0, Math.min(index, path.length));
      const nextPath = path.slice(0, bounded);
      setPath(nextPath);
      setFocusIndex(bounded);
      writeLocation(nextPath, bounded, mode);
      requestAnimationFrame(() => scrollToPane(bounded));
    },
    [path, scrollToPane, writeLocation]
  );

  const openTheme = useCallback(
    (slug: string, sourcePanelIndex: number) => {
      if (!themeBySlug.has(slug)) return;
      const existing = path.indexOf(slug);
      if (existing >= 0) {
        focusPane(existing + 1);
        return;
      }
      const nextPath = [...path.slice(0, sourcePanelIndex), slug];
      setPath(nextPath);
      setFocusIndex(nextPath.length);
      writeLocation(nextPath, nextPath.length, "push");
    },
    [focusPane, path, themeBySlug, writeLocation]
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      measureObscured();
      scrollToPane(focusIndex, "auto");
    });
    window.addEventListener("resize", measureObscured);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureObscured);
    };
  }, [focusIndex, measureObscured, panels.length, scrollToPane]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URL(window.location.href).searchParams;
      const nextPath = normalizePath(params.getAll("notes"), themeBySlug);
      const requestedFocus = Number.parseInt(
        params.get("noteFocus") ?? String(nextPath.length),
        10
      );
      setPath(nextPath);
      setFocusIndex(Math.max(0, Math.min(requestedFocus, nextPath.length)));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [themeBySlug]);

  useEffect(
    () => () => {
      if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
    },
    []
  );

  const settleHorizontalGesture = useCallback(
    (stack: HTMLElement) => {
      if (!horizontalGesture.current) return;
      horizontalGesture.current = false;
      const shouldReturn = returnGesture.current;
      returnGesture.current = false;

      if (shouldReturn && stack.scrollLeft <= 2 && path.length) {
        closeAfterPane(0, "push");
        return;
      }

      const pane = stack.querySelector<HTMLElement>(".research-note-pane");
      if (!pane) return;
      const edge = Number.parseFloat(getComputedStyle(stack).getPropertyValue("--pane-edge")) || 40;
      const stride = Math.max(1, pane.offsetWidth - edge);
      const nextFocus = Math.max(0, Math.min(path.length, Math.round(stack.scrollLeft / stride)));
      if (nextFocus !== focusIndex) {
        setFocusIndex(nextFocus);
        writeLocation(path, nextFocus, "replace");
      }
    },
    [closeAfterPane, focusIndex, path, writeLocation]
  );

  const scheduleHorizontalSettle = useCallback(
    (stack: HTMLElement, delay = 140) => {
      if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
      scrollSettleTimer.current = setTimeout(() => {
        scrollSettleTimer.current = null;
        settleHorizontalGesture(stack);
      }, delay);
    },
    [settleHorizontalGesture]
  );

  const handleStackScroll = useCallback(
    (stack: HTMLElement) => {
      measureObscured();
      if (!horizontalGesture.current) return;
      scheduleHorizontalSettle(stack);
    },
    [measureObscured, scheduleHorizontalSettle]
  );

  function panHorizontally(event: WheelEvent<HTMLElement>) {
    const horizontalDelta = Math.abs(event.deltaX) > 1;
    const shiftedVertical = event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX);
    if (!horizontalDelta && !shiftedVertical) return;
    horizontalGesture.current = true;
    if ((horizontalDelta && event.deltaX < 0) || (shiftedVertical && event.deltaY < 0)) {
      returnGesture.current = true;
    }
    if (shiftedVertical) {
      event.preventDefault();
      event.currentTarget.scrollLeft += event.deltaY;
    }
    scheduleHorizontalSettle(event.currentTarget);
  }

  const previewMarkdown = useCallback((markdown: string) => {
    try {
      const next = parseResearchHome(markdown);
      setResearchDocument(next);
      setPath((current) =>
        normalizePath(current, new Map(next.themes.map((theme) => [theme.slug, theme])))
      );
    } catch {
      // The editor reports parse errors and leaves the last valid preview visible.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const source = new URL(PUBLISHED_MARKDOWN);
    source.searchParams.set("published", Date.now().toString());

    void fetch(source, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Research source returned ${response.status}.`);
        return response.text();
      })
      .then(previewMarkdown)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Keep the bundled document visible if GitHub is temporarily unavailable.
      });

    return () => controller.abort();
  }, [previewMarkdown]);

  return (
    <>
      {panels.length > 1 ? (
        <nav className="research-note-path" aria-label="Open research notes">
          {panels.map((panel, index) => (
            <button
              aria-current={index === focusIndex ? "page" : undefined}
              key={panel.slug}
              onClick={() => closeAfterPane(index)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {panel.title}
            </button>
          ))}
        </nav>
      ) : null}

      <section
        className={`research-note-stack${panels.length === 1 ? " is-solo" : ""}${panels.length > 1 ? " has-path" : ""}`}
        aria-label="Open research notes"
        onPointerDown={(event) => {
          pointerStartX.current = event.clientX;
          pointerStartY.current = event.clientY;
        }}
        onPointerMove={(event) => {
          if (pointerStartX.current !== null && pointerStartY.current !== null) {
            const horizontalDistance = event.clientX - pointerStartX.current;
            const verticalDistance = event.clientY - pointerStartY.current;
            if (horizontalDistance > 18 && horizontalDistance > Math.abs(verticalDistance) * 1.25) {
              returnGesture.current = true;
              horizontalGesture.current = true;
            }
          }
        }}
        onPointerUp={(event) => {
          pointerStartX.current = null;
          pointerStartY.current = null;
          if (horizontalGesture.current && !scrollSettleTimer.current) {
            scheduleHorizontalSettle(event.currentTarget, 80);
          }
        }}
        onPointerCancel={() => {
          pointerStartX.current = null;
          pointerStartY.current = null;
          if (scrollSettleTimer.current) {
            clearTimeout(scrollSettleTimer.current);
            scrollSettleTimer.current = null;
          }
          horizontalGesture.current = false;
          returnGesture.current = false;
        }}
        onScroll={(event) => handleStackScroll(event.currentTarget)}
        onWheel={panHorizontally}
      >
        {panels.map((panel, panelIndex) => (
          <article
            aria-current={panelIndex === focusIndex ? "page" : undefined}
            className={`research-note-pane${panelIndex === focusIndex ? " is-active" : ""}${obscured.has(panelIndex) ? " is-obscured" : ""}`}
            data-pane-index={panelIndex}
            key={panel.slug}
            style={{ "--pane-index": panelIndex } as CSSProperties}
          >
            <button
              aria-hidden={!obscured.has(panelIndex)}
              aria-label={`Focus pane ${String(panelIndex + 1).padStart(2, "0")}: ${panel.title}`}
              className="research-note-spine"
              onClick={() => closeAfterPane(panelIndex)}
              tabIndex={obscured.has(panelIndex) ? 0 : -1}
              type="button"
            >
              <span>{String(panelIndex + 1).padStart(2, "0")}</span>
              <strong>{panel.title}</strong>
            </button>

            <div className="research-note-scroll">
              {panel.theme ? (
                <div className="research-note-content">
                  <h1>{panel.theme.title}</h1>
                  <p>
                    {renderInline(panel.theme.questions, (slug) => openTheme(slug, panelIndex))}
                  </p>
                </div>
              ) : (
                <div className="research-note-content research-root-note">
                  <header className="research-intro">
                    <h1>{researchDocument.title}</h1>
                    {researchDocument.introduction.map((paragraph) => (
                      <p key={paragraph}>{renderInline(paragraph, (slug) => openTheme(slug, 0))}</p>
                    ))}
                    {researchDocument.quote ? (
                      <blockquote className="research-quote">
                        <p>{researchDocument.quote.text}</p>
                        <cite>{researchDocument.quote.attribution}</cite>
                      </blockquote>
                    ) : null}
                  </header>
                  <ul className="theme-list">
                    {researchDocument.themes.map((theme) => (
                      <li key={theme.slug}>
                        <a
                          className="research-theme-link"
                          href={hrefForPath([theme.slug])}
                          onClick={(event) => {
                            event.preventDefault();
                            openTheme(theme.slug, 0);
                          }}
                        >
                          {theme.title}
                        </a>
                        : {renderInline(theme.questions, (slug) => openTheme(slug, 0))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
