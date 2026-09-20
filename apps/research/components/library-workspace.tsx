"use client";

import type { DecisionCounts, LibraryAnnotationView, LibraryPageData } from "@/lib/library-data";
import type { Decision } from "@/lib/research-annotations";
import type { CollectionId } from "@/lib/research-catalog";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

type Draft = {
  decision: Decision;
  privateNotes: string;
  publicNotes: string;
  tags: string;
  isPublished: boolean;
  updatedAt: string;
};

type SaveState = { kind: "idle" | "saving" | "saved" | "error"; text: string };

const decisions: Array<{ value: Decision; label: string }> = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "keep", label: "Keep" },
  { value: "maybe", label: "Maybe" },
  { value: "remove", label: "Remove" },
];

const statusColor: Record<Decision, string> = {
  unreviewed: "bg-ink-muted",
  keep: "bg-success",
  maybe: "bg-warning",
  remove: "bg-danger",
};

function emptyDraft(): Draft {
  return {
    decision: "unreviewed",
    privateNotes: "",
    publicNotes: "",
    tags: "",
    isPublished: false,
    updatedAt: "",
  };
}

function normalizeDecision(value: string): Decision {
  return decisions.some((decision) => decision.value === value)
    ? (value as Decision)
    : "unreviewed";
}

function draftsFromAnnotations(annotations: LibraryAnnotationView[]) {
  return Object.fromEntries(
    annotations.map((annotation) => [
      annotation.recordId,
      {
        decision: normalizeDecision(annotation.decision),
        privateNotes: annotation.privateNotes,
        publicNotes: annotation.publicNotes,
        tags: annotation.tags,
        isPublished: annotation.isPublished,
        updatedAt: annotation.updatedAt,
      } satisfies Draft,
    ])
  ) as Record<string, Draft>;
}

function cacheKey(
  collection: CollectionId,
  query: string,
  decision: Decision | "all",
  page: number
) {
  return `${collection}\u0000${query}\u0000${decision}\u0000${page}`;
}

export function LibraryWorkspace({
  collection,
  initialData,
  ownerEmail,
}: {
  collection: CollectionId;
  initialData: LibraryPageData;
  ownerEmail: string;
}) {
  const [activeCollection, setActiveCollection] = useState(collection);
  const [pageData, setPageData] = useState(initialData);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    draftsFromAnnotations(initialData.annotations)
  );
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<Decision | "all">("all");
  const [selectedId, setSelectedId] = useState(initialData.records[0]?.id ?? "");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestNumber = useRef(0);
  const pageCache = useRef(
    new Map<string, LibraryPageData>([[cacheKey(collection, "", "all", 1), initialData]])
  );

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    []
  );

  useEffect(() => {
    const otherCollection: CollectionId = collection === "great-minds" ? "neuroai" : "great-minds";
    const key = cacheKey(otherCollection, "", "all", 1);
    if (pageCache.current.has(key)) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      collection: otherCollection,
      q: "",
      decision: "all",
      page: "1",
    });
    void fetch(`/api/library/annotations?${params}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const result = (await response.json()) as LibraryPageData;
        pageCache.current.set(key, result);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [collection]);

  const selected = useMemo(
    () =>
      pageData.records.find((record) => record.id === selectedId) ?? pageData.records[0] ?? null,
    [pageData.records, selectedId]
  );
  const selectedDraft = selected ? (drafts[selected.id] ?? emptyDraft()) : null;
  const currentSaveState = selected ? saveStates[selected.id] : undefined;

  async function loadPage({
    q = query,
    decision = decisionFilter,
    page = 1,
    nextCollection = activeCollection,
  }: {
    q?: string;
    decision?: Decision | "all";
    page?: number;
    nextCollection?: CollectionId;
  } = {}) {
    const requestId = ++requestNumber.current;
    setLoadError("");
    const key = cacheKey(nextCollection, q, decision, page);

    function applyResult(result: LibraryPageData) {
      setActiveCollection(nextCollection);
      setPageData(result);
      setDrafts((current) => {
        const next = { ...current };
        const incoming = draftsFromAnnotations(result.annotations);
        for (const record of result.records) {
          if (!dirty.has(record.id)) next[record.id] = incoming[record.id] ?? emptyDraft();
        }
        return next;
      });
      setSelectedId((current) =>
        result.records.some((record) => record.id === current)
          ? current
          : (result.records[0]?.id ?? "")
      );
      setMobileDetail(false);
    }

    const cached = pageCache.current.get(key);
    if (cached) {
      applyResult(cached);
      setLoading(false);
      return true;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        collection: nextCollection,
        q,
        decision,
        page: String(page),
      });
      const response = await fetch(`/api/library/annotations?${params}`, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const result = (await response.json()) as LibraryPageData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load the library.");
      if (requestId !== requestNumber.current) return false;

      pageCache.current.set(key, result);
      applyResult(result);
      return true;
    } catch (error) {
      if (requestId === requestNumber.current) {
        setLoadError(error instanceof Error ? error.message : "Unable to load the library.");
      }
      return false;
    } finally {
      if (requestId === requestNumber.current) setLoading(false);
    }
  }

  async function switchCollection(
    event: MouseEvent<HTMLAnchorElement>,
    nextCollection: CollectionId
  ) {
    event.preventDefault();
    if (nextCollection === activeCollection) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setQuery("");
    setDecisionFilter("all");
    if (await loadPage({ q: "", decision: "all", page: 1, nextCollection })) {
      window.history.replaceState(null, "", `/library/${nextCollection}`);
    }
  }

  function updateLocal(id: string, update: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? emptyDraft()), ...update } }));
    setDirty((current) => new Set(current).add(id));
    setSaveStates((current) => ({ ...current, [id]: { kind: "idle", text: "Unsaved changes" } }));
  }

  async function persist(id: string, draft: Draft): Promise<Draft | null> {
    setSaveStates((current) => ({ ...current, [id]: { kind: "saving", text: "Saving…" } }));
    try {
      const response = await fetch("/api/library/annotations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collection: activeCollection, recordId: id, ...draft }),
      });
      const result = (await response.json()) as {
        annotation?: LibraryAnnotationView;
        error?: string;
      };
      if (!response.ok || !result.annotation) throw new Error(result.error ?? "Unable to save.");

      const saved: Draft = {
        decision: normalizeDecision(result.annotation.decision),
        privateNotes: result.annotation.privateNotes,
        publicNotes: result.annotation.publicNotes,
        tags: result.annotation.tags,
        isPublished: result.annotation.isPublished,
        updatedAt: result.annotation.updatedAt,
      };
      setDrafts((current) => ({ ...current, [id]: saved }));
      setDirty((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setSaveStates((current) => ({ ...current, [id]: { kind: "saved", text: "Saved" } }));
      for (const key of pageCache.current.keys()) {
        if (key.startsWith(`${activeCollection}\u0000`)) pageCache.current.delete(key);
      }
      return saved;
    } catch (error) {
      setSaveStates((current) => ({
        ...current,
        [id]: {
          kind: "error",
          text: error instanceof Error ? error.message : "Unable to save.",
        },
      }));
      return null;
    }
  }

  async function chooseDecision(id: string, decision: Decision) {
    const before = drafts[id] ?? emptyDraft();
    const next = {
      ...before,
      decision,
      isPublished: decision === "keep" ? before.isPublished : false,
    };
    setDrafts((current) => ({ ...current, [id]: next }));
    const saved = await persist(id, next);
    if (!saved) {
      setDrafts((current) => ({ ...current, [id]: before }));
      return;
    }
    if (before.decision !== saved.decision) {
      setPageData((current) => ({
        ...current,
        counts: adjustCounts(current.counts, before.decision, saved.decision),
      }));
    }
  }

  async function togglePublished(id: string, isPublished: boolean) {
    const before = drafts[id] ?? emptyDraft();
    const next = { ...before, isPublished: before.decision === "keep" && isPublished };
    setDrafts((current) => ({ ...current, [id]: next }));
    if (!(await persist(id, next))) {
      setDrafts((current) => ({ ...current, [id]: before }));
    }
  }

  function selectRecord(id: string) {
    setSelectedId(id);
    setMobileDetail(true);
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function search(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void loadPage({ q: value, page: 1 }), 250);
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="page-frame py-6 md:py-9">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-[1.75rem] font-bold leading-none">Library</h1>
          <span className="flex items-center gap-4 font-sans text-xs text-ink-muted">
            <a href="/">Research</a>
            <a href="/index">Index</a>
            <a href="/signout-with-chatgpt?return_to=%2F" title={`Signed in as ${ownerEmail}`}>
              Sign out
            </a>
          </span>
        </div>

        <nav aria-label="Research collections" className="mt-6 flex gap-5 font-sans text-sm">
          <a
            href="/library/great-minds"
            onClick={(event) => void switchCollection(event, "great-minds")}
            aria-current={activeCollection === "great-minds" ? "page" : undefined}
            className={`min-h-10 py-2 no-underline ${activeCollection === "great-minds" ? "font-semibold text-ink" : "text-ink-muted"}`}
          >
            Great minds
          </a>
          <a
            href="/library/neuroai"
            onClick={(event) => void switchCollection(event, "neuroai")}
            aria-current={activeCollection === "neuroai" ? "page" : undefined}
            className={`min-h-10 py-2 no-underline ${activeCollection === "neuroai" ? "font-semibold text-ink" : "text-ink-muted"}`}
          >
            NeuroAI
          </a>
        </nav>

        <section
          className={`${mobileDetail ? "hidden md:grid" : "grid"} mt-4 gap-3 md:grid-cols-[minmax(15rem,1fr)_auto] md:items-end`}
          aria-label="Library filters"
        >
          <label className="block max-w-md">
            <span className="sr-only">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => search(event.target.value)}
              placeholder={
                activeCollection === "great-minds" ? "Search people" : "Search NeuroAI groups"
              }
              className="library-search w-full appearance-none bg-transparent px-0 py-2 font-sans text-base text-ink placeholder:text-ink-muted md:text-sm"
            />
          </label>

          <div
            className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs"
            aria-label="Filter by decision"
          >
            <FilterButton
              active={decisionFilter === "all"}
              onClick={() => {
                setDecisionFilter("all");
                void loadPage({ decision: "all", page: 1 });
              }}
              label="All"
            />
            {decisions.map((decision) => (
              <FilterButton
                key={decision.value}
                active={decisionFilter === decision.value}
                onClick={() => {
                  setDecisionFilter(decision.value);
                  void loadPage({ decision: decision.value, page: 1 });
                }}
                label={decision.label}
              />
            ))}
          </div>
          {loadError ? (
            <p className="mt-3 font-sans text-sm text-danger" role="alert">
              {loadError}
            </p>
          ) : null}
        </section>

        <div className="mt-5 grid md:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[22rem_minmax(0,1fr)]">
          <section
            aria-label="Catalog records"
            className={`${mobileDetail ? "hidden md:block" : "block"} min-w-0`}
          >
            <div className="mb-2 flex items-center justify-between font-sans text-xs text-ink-muted">
              <p>{loading ? "Loading…" : `${pageData.total.toLocaleString()} records`}</p>
              {dirty.size > 0 ? <p>{dirty.size} unsaved</p> : null}
            </div>

            <div className="md:max-h-[69vh] md:overflow-y-auto">
              {pageData.records.map((record) => {
                const draft = drafts[record.id] ?? emptyDraft();
                const active = selected?.id === record.id;
                return (
                  <button
                    type="button"
                    key={record.id}
                    onClick={() => selectRecord(record.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex min-h-16 w-full gap-2.5 px-3 py-2.5 text-left transition-colors ${active ? "bg-surface text-ink" : "text-ink hover:text-accent"}`}
                  >
                    <span
                      className={`mt-[0.45rem] h-2 w-2 shrink-0 rounded-full ${statusColor[draft.decision]}`}
                    />
                    <span className="min-w-0">
                      <span className="block font-heading text-[0.9375rem] font-semibold leading-5">
                        {record.name}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 font-sans text-xs leading-4 text-ink-muted">
                        {[record.institution, record.country].filter(Boolean).join(" · ") ||
                          record.primary}
                      </span>
                    </span>
                    {draft.isPublished ? (
                      <span className="ml-auto shrink-0 font-sans text-[0.625rem] text-ink-muted">
                        Public
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {!loading && pageData.records.length === 0 ? (
                <p className="py-10 text-ink-muted">No matching records.</p>
              ) : null}
            </div>

            {pageData.pageCount > 1 ? (
              <div className="mt-4 flex items-center justify-between font-sans text-sm">
                <button
                  type="button"
                  disabled={loading || pageData.page === 1}
                  onClick={() => void loadPage({ page: pageData.page - 1 })}
                  className="min-h-10 px-1 underline disabled:text-ink-muted disabled:no-underline"
                >
                  Previous
                </button>
                <span className="text-ink-muted">
                  {pageData.page} / {pageData.pageCount}
                </span>
                <button
                  type="button"
                  disabled={loading || pageData.page === pageData.pageCount}
                  onClick={() => void loadPage({ page: pageData.page + 1 })}
                  className="min-h-10 px-1 underline disabled:text-ink-muted disabled:no-underline"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>

          <section
            aria-label="Selected record"
            className={`${mobileDetail ? "block" : "hidden md:block"} min-w-0 md:pl-8 lg:pl-10`}
          >
            {selected && selectedDraft ? (
              <div>
                <button
                  type="button"
                  onClick={() => setMobileDetail(false)}
                  className="mb-4 min-h-10 font-sans text-sm underline md:hidden"
                >
                  ← Back to results
                </button>

                <article>
                  <header className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="ui-label">{selected.entityType.replaceAll("_", " ")}</p>
                        <h2 className="mt-1 text-[1.5rem] font-bold leading-tight md:text-[1.75rem]">
                          {selected.name}
                        </h2>
                      </div>
                      <a href={selected.url} className="shrink-0 font-sans text-sm underline">
                        Visit site →
                      </a>
                    </div>
                    {selected.lead ? (
                      <p className="mt-3 text-[0.9375rem] leading-6">
                        <strong>Lead:</strong> {selected.lead}
                      </p>
                    ) : null}
                    {selected.institution ? (
                      <p className="mt-1 text-[0.9375rem] leading-6 text-ink-secondary">
                        {selected.institution}
                      </p>
                    ) : null}
                    <p className="mt-1 font-sans text-sm text-ink-muted">
                      {[selected.city, selected.country].filter(Boolean).join(", ")}
                    </p>
                    {selected.summary ? (
                      <p className="mt-4 text-[0.9375rem] leading-7 text-ink-secondary">
                        {selected.summary}
                      </p>
                    ) : null}
                    {selected.question ? (
                      <div className="mt-4">
                        <p className="ui-label">Life question</p>
                        <p className="mt-1 text-[0.9375rem] leading-7 text-ink-secondary">
                          {selected.question}
                        </p>
                      </div>
                    ) : null}
                    {selected.topics.length ? (
                      <p className="mt-4 font-sans text-xs leading-5 text-ink-muted">
                        {selected.topics.join(" · ")}
                      </p>
                    ) : null}
                    {selected.evidenceUrls.length ? (
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-sans text-xs">
                        {selected.evidenceUrls.map((url, index) => (
                          <a key={url} href={url} className="underline">
                            Evidence {index + 1} →
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </header>

                  <fieldset className="mt-5" disabled={currentSaveState?.kind === "saving"}>
                    <legend className="ui-label">Decision — saved immediately</legend>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                      {decisions.map((decision) => (
                        <label
                          key={decision.value}
                          className={`flex min-h-10 cursor-pointer items-center gap-2 px-0.5 py-2 font-sans text-sm transition-colors ${selectedDraft.decision === decision.value ? "font-semibold text-ink" : "text-ink-muted hover:text-ink"}`}
                        >
                          <input
                            type="radio"
                            name={`decision-${selected.id}`}
                            value={decision.value}
                            checked={selectedDraft.decision === decision.value}
                            onChange={() => void chooseDecision(selected.id, decision.value)}
                            className="sr-only"
                          />
                          <span
                            className={`h-2 w-2 rounded-full ${statusColor[decision.value]}`}
                            aria-hidden="true"
                          />
                          {decision.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-5 pt-1">
                    <label className="block">
                      <span className="ui-label">Private notes</span>
                      <textarea
                        value={selectedDraft.privateNotes}
                        onChange={(event) =>
                          updateLocal(selected.id, { privateNotes: event.target.value })
                        }
                        rows={5}
                        placeholder="Questions, objections, connections, or next steps."
                        className="ui-control mt-1.5 min-h-28 resize-y font-sans"
                      />
                      <span className="mt-1 block font-sans text-xs text-ink-muted">
                        Never shown publicly.
                      </span>
                    </label>

                    <label className="mt-4 block">
                      <span className="ui-label">Tags</span>
                      <input
                        value={selectedDraft.tags}
                        onChange={(event) => updateLocal(selected.id, { tags: event.target.value })}
                        placeholder="memory, embodiment, revisit"
                        className="ui-control mt-1.5"
                      />
                      <span className="mt-1 block font-sans text-xs text-ink-muted">
                        Separate tags with commas.
                      </span>
                    </label>

                    <label className="mt-4 block">
                      <span className="ui-label">Public note</span>
                      <textarea
                        value={selectedDraft.publicNotes}
                        onChange={(event) =>
                          updateLocal(selected.id, { publicNotes: event.target.value })
                        }
                        rows={3}
                        placeholder="Optional note shown with this entry."
                        className="ui-control mt-1.5 min-h-20 resize-y font-sans"
                      />
                    </label>

                    <div className="mt-4 flex items-start gap-3 py-2">
                      <input
                        id={`publish-${selected.id}`}
                        type="checkbox"
                        checked={selectedDraft.isPublished}
                        disabled={
                          selectedDraft.decision !== "keep" || currentSaveState?.kind === "saving"
                        }
                        onChange={(event) =>
                          void togglePublished(selected.id, event.target.checked)
                        }
                        className="mt-1 h-5 w-5 accent-[var(--accent)]"
                      />
                      <label
                        htmlFor={`publish-${selected.id}`}
                        className="font-sans text-sm leading-6"
                      >
                        <span className="font-semibold">Publish in the research index</span>
                        <span className="block text-ink-muted">
                          Available for records marked Keep.
                        </span>
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void persist(selected.id, selectedDraft)}
                        disabled={currentSaveState?.kind === "saving"}
                        className="ui-button"
                      >
                        Save notes
                      </button>
                      <p
                        className={`font-sans text-sm ${currentSaveState?.kind === "error" ? "text-danger" : "text-ink-muted"}`}
                        aria-live="polite"
                      >
                        {currentSaveState?.text ??
                          (dirty.has(selected.id) ? "Unsaved changes" : "")}
                      </p>
                    </div>
                  </div>

                  {selected.activity ? (
                    <details className="mt-5 pt-2">
                      <summary className="cursor-pointer font-sans text-sm text-ink-muted">
                        Activity evidence
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-ink-secondary">
                        {selected.activity}
                      </p>
                    </details>
                  ) : null}
                </article>
              </div>
            ) : (
              <p className="py-10 text-ink-muted">No record selected.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 py-1 ${active ? "font-semibold text-ink" : "text-ink-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );
}

function adjustCounts(counts: DecisionCounts, from: Decision, to: Decision): DecisionCounts {
  return {
    ...counts,
    [from]: Math.max(0, counts[from] - 1),
    [to]: counts[to] + 1,
  };
}
