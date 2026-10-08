"use client";

import {
  parseResearchHome,
  renderResearchHome,
  type ResearchHome,
  type ResearchNote,
} from "@/lib/research-home";
import { PhotoGallery } from "./photo-gallery";
import {
  type CSSProperties,
  type ReactNode,
  type WheelEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const PUBLISHED_MARKDOWN =
  "https://raw.githubusercontent.com/JDRanpariya/jdranpariya.github.io/refs/heads/main/apps/research/content/research-home.md";

function normalizePath(path: string[], notes: ReadonlyMap<string, ResearchNote>) {
  const seen = new Set<string>();
  return path.filter((slug) => {
    if (!notes.has(slug) || seen.has(slug)) return false;
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

function resolveNote(reference: string, notes: ReadonlyMap<string, ResearchNote>) {
  const trimmed = reference.trim();
  return (
    notes.get(trimmed) ??
    [...notes.values()].find(
      (note) => note.title.toLowerCase() === trimmed.toLowerCase() || note.url === trimmed
    )
  );
}

function noteReferenceFromDestination(destination?: string) {
  if (!destination) return undefined;
  if (destination.startsWith("note:")) return destination.slice(5);
  if (destination.startsWith("/notes/")) return destination.split("#", 1)[0];
  if (destination.startsWith("https://research.jdranpariya.com/notes/"))
    return new URL(destination).pathname;
  if (destination.startsWith("/?")) {
    const query = destination.slice(2).split("#", 1)[0];
    return new URLSearchParams(query).getAll("notes").at(-1);
  }
  return undefined;
}

export function renderInline(
  text: string,
  notes: ReadonlyMap<string, ResearchNote>,
  openNote?: (slug: string) => void
): ReactNode[] {
  return text
    .split(/(::: gallery\s*\n[\s\S]*?\n:::|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\)|_[^_]+_)/g)
    .map((part, index) => {
      if (part.startsWith("::: gallery")) return <PhotoGallery key={index} source={part} />;
      const wikiLink = part.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (wikiLink || link) {
        const destination = link?.[2];
        const noteReference = wikiLink?.[1] ?? noteReferenceFromDestination(destination);
        const note = noteReference ? resolveNote(noteReference, notes) : undefined;
        const label = wikiLink ? (wikiLink[2] ?? note?.title ?? wikiLink[1]) : link![1];
        if (noteReference && !note) return label;
        const isExternal = !note && destination ? /^https?:\/\//u.test(destination) : false;
        return (
          <a
            className={isExternal ? "research-outbound-link" : undefined}
            href={note ? note.url || hrefForPath([note.slug]) : destination}
            key={index}
            rel={isExternal ? "noreferrer" : undefined}
            target={isExternal ? "_blank" : undefined}
            onClick={
              note && openNote
                ? (event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    openNote(note.slug);
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
  rootSlug,
}: {
  initialDocument: ResearchHome;
  initialFocus: number;
  initialPath: string[];
  rootSlug?: string;
}) {
  const [researchDocument, setResearchDocument] = useState(initialDocument);
  const noteBySlug = useMemo(
    () => new Map(researchDocument.notes.map((note) => [note.slug, note])),
    [researchDocument.notes]
  );
  const homeHtml = useMemo(() => renderResearchHome(researchDocument), [researchDocument]);
  const [path, setPath] = useState(() =>
    normalizePath(initialPath, noteBySlug).filter((slug) => slug !== rootSlug)
  );
  const [focusIndex, setFocusIndex] = useState(() => initialFocus);
  const [obscured, setObscured] = useState<ReadonlySet<number>>(() => new Set());
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const horizontalGesture = useRef(false);
  const returnGesture = useRef(false);
  const scrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRootPosition = useRef<{ index: number; offset: number } | null>(null);

  const rememberRootPosition = useCallback(() => {
    const scroll = window.document.querySelector<HTMLElement>(
      '[data-pane-index="0"] .research-note-scroll'
    );
    if (!scroll) return;
    const top = Math.max(0, scroll.getBoundingClientRect().top);
    const blocks = [...scroll.querySelectorAll<HTMLElement>("h1,h2,h3,p,li,blockquote")];
    const index = blocks.findIndex((block) => block.getBoundingClientRect().bottom > top);
    if (index >= 0)
      pendingRootPosition.current = {
        index,
        offset: blocks[index].getBoundingClientRect().top - top,
      };
  }, []);

  useLayoutEffect(() => {
    const position = pendingRootPosition.current;
    if (!position) return;
    pendingRootPosition.current = null;
    const scroll = window.document.querySelector<HTMLElement>(
      '[data-pane-index="0"] .research-note-scroll'
    );
    const block = scroll?.querySelectorAll<HTMLElement>("h1,h2,h3,p,li,blockquote")[position.index];
    if (!scroll || !block) return;
    if (path.length) {
      window.scrollTo({ top: 0, behavior: "instant" });
      scroll.scrollTo({
        top:
          scroll.scrollTop +
          block.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top -
          position.offset,
        behavior: "instant",
      });
    } else {
      window.scrollBy({
        top: block.getBoundingClientRect().top - position.offset,
        behavior: "instant",
      });
    }
  }, [path.length]);

  const panels = useMemo(
    () => [
      {
        slug: rootSlug || "research",
        title: rootSlug ? noteBySlug.get(rootSlug)?.title || "Research" : "Research",
        note: rootSlug ? noteBySlug.get(rootSlug) : undefined,
      },
      ...path.map((slug) => ({
        slug,
        title: noteBySlug.get(slug)?.title ?? slug,
        note: noteBySlug.get(slug),
      })),
    ],
    [path, noteBySlug, rootSlug]
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
      if (!nextPath.length && path.length) rememberRootPosition();
      setPath(nextPath);
      setFocusIndex(bounded);
      writeLocation(nextPath, bounded, mode);
      requestAnimationFrame(() => scrollToPane(bounded));
    },
    [path, scrollToPane, writeLocation, rememberRootPosition]
  );

  const openTheme = useCallback(
    (slug: string, sourcePanelIndex: number) => {
      if (!noteBySlug.has(slug)) return;
      if (slug === rootSlug) {
        focusPane(0);
        return;
      }
      const existing = path.indexOf(slug);
      if (existing >= 0) {
        focusPane(existing + 1);
        return;
      }
      const nextPath = [...path.slice(0, sourcePanelIndex), slug];
      if (!path.length) rememberRootPosition();
      setPath(nextPath);
      setFocusIndex(nextPath.length);
      writeLocation(nextPath, nextPath.length, "push");
    },
    [focusPane, path, noteBySlug, writeLocation, rootSlug, rememberRootPosition]
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
      const nextPath = normalizePath(params.getAll("notes"), noteBySlug);
      if ((!nextPath.length && path.length) || (nextPath.length && !path.length))
        rememberRootPosition();
      const requestedFocus = Number.parseInt(
        params.get("noteFocus") ?? String(nextPath.length),
        10
      );
      setPath(nextPath);
      setFocusIndex(Math.max(0, Math.min(requestedFocus, nextPath.length)));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [noteBySlug, path.length, rememberRootPosition]);

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

  const applyPublishedMarkdown = useCallback((markdown: string) => {
    try {
      const next = parseResearchHome(markdown);
      // A homepage text refresh must not discard the deployed note manifest or
      // reset any open pane's scroll position.
      setResearchDocument((current) => ({ ...next, notes: current.notes }));
    } catch {
      // Keep the bundled document visible if the published Markdown is malformed.
    }
  }, []);

  useEffect(() => {
    if (rootSlug) return;
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return;
    const controller = new AbortController();
    const source = new URL(PUBLISHED_MARKDOWN);
    source.searchParams.set("published", Date.now().toString());

    void fetch(source, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Research source returned ${response.status}.`);
        return response.text();
      })
      .then(applyPublishedMarkdown)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Keep the bundled document visible if GitHub is temporarily unavailable.
      });

    return () => controller.abort();
  }, [applyPublishedMarkdown, rootSlug]);

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
              {panel.note ? (
                <div className="research-note-content">
                  <h1>{panel.note.title}</h1>
                  {panel.note.html !== undefined ? (
                    <div
                      className="research-note-body"
                      dangerouslySetInnerHTML={{ __html: panel.note.html }}
                      onClick={(event) => {
                        if (
                          event.button !== 0 ||
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey
                        )
                          return;
                        const anchor = (event.target as Element).closest("a");
                        if (
                          !anchor ||
                          !event.currentTarget.contains(anchor) ||
                          anchor.target === "_blank"
                        )
                          return;
                        const reference = noteReferenceFromDestination(
                          anchor.getAttribute("href") || undefined
                        );
                        const note = reference ? resolveNote(reference, noteBySlug) : undefined;
                        if (!note) return;
                        event.preventDefault();
                        openTheme(note.slug, panelIndex);
                      }}
                    />
                  ) : (
                    panel.note.body
                      .split(/\n\s*\n/u)
                      .filter(Boolean)
                      .map((paragraph, index) => (
                        <p key={`${panel.slug}-${index}`}>
                          {renderInline(paragraph, noteBySlug, (slug) =>
                            openTheme(slug, panelIndex)
                          )}
                        </p>
                      ))
                  )}
                </div>
              ) : (
                <div className="research-note-content research-root-note">
                  <div
                    className="research-note-body research-home-body"
                    dangerouslySetInnerHTML={{ __html: homeHtml }}
                    onClick={(event) => {
                      if (
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      const anchor = (event.target as Element).closest("a");
                      if (
                        !anchor ||
                        !event.currentTarget.contains(anchor) ||
                        anchor.target === "_blank"
                      )
                        return;
                      const reference = noteReferenceFromDestination(
                        anchor.getAttribute("href") || undefined
                      );
                      const note = reference ? resolveNote(reference, noteBySlug) : undefined;
                      if (!note) return;
                      event.preventDefault();
                      openTheme(note.slug, panelIndex);
                    }}
                  />
                  {researchDocument.notes.length ? (
                    <nav className="research-notes-directory" aria-label="Research notes">
                      {renderInline("[Browse research notes](/notes/)", noteBySlug, (slug) =>
                        openTheme(slug, 0)
                      )}
                    </nav>
                  ) : null}
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
