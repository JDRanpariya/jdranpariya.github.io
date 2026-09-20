"use client";

import { ResearchHeader } from "@/components/research-header";
import type { DecisionCounts, LibraryAnnotationView, LibraryPageData } from "@/lib/library-data";
import type { Decision } from "@/lib/research-annotations";
import type { CollectionId } from "@/lib/research-catalog";
import { useEffect, useMemo, useRef, useState } from "react";

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

export function LibraryWorkspace({
  collection,
  collectionTotals,
  initialData,
  ownerEmail,
}: {
  collection: CollectionId;
  collectionTotals: Record<CollectionId, number>;
  initialData: LibraryPageData;
  ownerEmail: string;
}) {
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

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    []
  );

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
  }: {
    q?: string;
    decision?: Decision | "all";
    page?: number;
  } = {}) {
    const requestId = ++requestNumber.current;
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ collection, q, decision, page: String(page) });
      const response = await fetch(`/api/library/annotations?${params}`, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const result = (await response.json()) as LibraryPageData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load the library.");
      if (requestId !== requestNumber.current) return;

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
    } catch (error) {
      if (requestId === requestNumber.current) {
        setLoadError(error instanceof Error ? error.message : "Unable to load the library.");
      }
    } finally {
      if (requestId === requestNumber.current) setLoading(false);
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
        body: JSON.stringify({ collection, recordId: id, ...draft }),
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
      <ResearchHeader owner />

      <main id="main" className="page-frame py-7 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="ui-label">Private workspace</p>
            <h1 className="mt-1 text-[2rem] font-bold leading-tight tracking-[-0.015em] md:text-[2.5rem]">
              Research library
            </h1>
          </div>
          <div className="font-sans text-sm text-ink-muted">
            <span className="hidden sm:inline">{ownerEmail} · </span>
            <a href="/signout-with-chatgpt?return_to=%2F" className="underline">
              Sign out
            </a>
          </div>
        </div>

        <nav
          aria-label="Research collections"
          className="mt-5 flex gap-6 border-b border-border font-sans text-[0.9375rem]"
        >
          <a
            href="/library/great-minds"
            aria-current={collection === "great-minds" ? "page" : undefined}
            className={`min-h-11 pb-3 pt-2 no-underline ${collection === "great-minds" ? "border-b-2 border-accent font-semibold text-ink" : "text-ink-muted"}`}
          >
            Great minds <span className="font-normal">{collectionTotals["great-minds"]}</span>
          </a>
          <a
            href="/library/neuroai"
            aria-current={collection === "neuroai" ? "page" : undefined}
            className={`min-h-11 pb-3 pt-2 no-underline ${collection === "neuroai" ? "border-b-2 border-accent font-semibold text-ink" : "text-ink-muted"}`}
          >
            NeuroAI <span className="font-normal">{collectionTotals.neuroai}</span>
          </a>
        </nav>

        <section
          className={`${mobileDetail ? "hidden md:block" : "block"} mt-6`}
          aria-label="Library filters"
        >
          <label className="block max-w-2xl">
            <span className="ui-label">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => search(event.target.value)}
              placeholder={
                collection === "great-minds"
                  ? "Name, field, institution, or contribution"
                  : "Group, lead, topic, institution, or summary"
              }
              className="ui-control mt-2"
            />
          </label>

          <div
            className="mt-4 flex flex-wrap gap-2 font-sans text-sm"
            aria-label="Filter by decision"
          >
            <FilterButton
              active={decisionFilter === "all"}
              onClick={() => {
                setDecisionFilter("all");
                void loadPage({ decision: "all", page: 1 });
              }}
              label={`All ${pageData.sourceTotal}`}
            />
            {decisions.map((decision) => (
              <FilterButton
                key={decision.value}
                active={decisionFilter === decision.value}
                onClick={() => {
                  setDecisionFilter(decision.value);
                  void loadPage({ decision: decision.value, page: 1 });
                }}
                label={`${decision.label} ${pageData.counts[decision.value]}`}
              />
            ))}
          </div>
          {loadError ? (
            <p className="mt-3 font-sans text-sm text-danger" role="alert">
              {loadError}
            </p>
          ) : null}
        </section>

        <div className="mt-7 grid gap-10 md:grid-cols-[minmax(17rem,4fr)_minmax(24rem,6fr)] lg:grid-cols-[minmax(20rem,4fr)_minmax(32rem,7fr)]">
          <section
            aria-label="Catalog records"
            className={`${mobileDetail ? "hidden md:block" : "block"} min-w-0`}
          >
            <div className="mb-3 flex items-center justify-between font-sans text-sm text-ink-muted">
              <p>{loading ? "Loading…" : `${pageData.total.toLocaleString()} records`}</p>
              {dirty.size > 0 ? <p>{dirty.size} unsaved</p> : null}
            </div>

            <div className="divide-y divide-border border-y border-border md:max-h-[66vh] md:overflow-y-auto">
              {pageData.records.map((record) => {
                const draft = drafts[record.id] ?? emptyDraft();
                const active = selected?.id === record.id;
                return (
                  <button
                    type="button"
                    key={record.id}
                    onClick={() => selectRecord(record.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex min-h-[4.75rem] w-full gap-3 border-l-2 px-3 py-3 text-left transition-colors ${active ? "border-accent bg-accent-soft" : "border-transparent bg-bg hover:bg-surface"}`}
                  >
                    <span
                      className={`mt-[0.45rem] h-2.5 w-2.5 shrink-0 rounded-full ${statusColor[draft.decision]}`}
                    />
                    <span className="min-w-0">
                      <span className="block font-heading text-[1.0625rem] font-bold leading-6">
                        {record.name}
                      </span>
                      <span className="mt-1 block line-clamp-2 font-sans text-[0.8125rem] leading-5 text-ink-muted">
                        {[record.institution, record.country].filter(Boolean).join(" · ") ||
                          record.primary}
                      </span>
                    </span>
                    {draft.isPublished ? (
                      <span className="ml-auto shrink-0 font-sans text-[0.6875rem] uppercase tracking-wide text-ink-muted">
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
                  className="min-h-11 px-2 underline disabled:text-ink-muted disabled:no-underline"
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
                  className="min-h-11 px-2 underline disabled:text-ink-muted disabled:no-underline"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>

          <section
            aria-label="Selected record"
            className={`${mobileDetail ? "block" : "hidden md:block"} min-w-0 md:border-l md:border-border md:pl-8`}
          >
            {selected && selectedDraft ? (
              <div>
                <button
                  type="button"
                  onClick={() => setMobileDetail(false)}
                  className="ui-button-secondary mb-6 md:hidden"
                >
                  ← Back to results
                </button>

                <article>
                  <header className="border-b border-border pb-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="ui-label">{selected.entityType.replaceAll("_", " ")}</p>
                        <h2 className="mt-1 text-[1.75rem] font-bold leading-tight tracking-[-0.01em] md:text-[2.1rem]">
                          {selected.name}
                        </h2>
                      </div>
                      <a href={selected.url} className="ui-button-secondary">
                        Visit site →
                      </a>
                    </div>
                    {selected.lead ? (
                      <p className="mt-4">
                        <strong>Lead:</strong> {selected.lead}
                      </p>
                    ) : null}
                    {selected.institution ? (
                      <p className="mt-1 text-ink-secondary">{selected.institution}</p>
                    ) : null}
                    <p className="mt-1 font-sans text-sm text-ink-muted">
                      {[selected.city, selected.country].filter(Boolean).join(", ")}
                    </p>
                    {selected.summary ? (
                      <p className="mt-5 leading-[1.8] text-ink-secondary">{selected.summary}</p>
                    ) : null}
                    {selected.question ? (
                      <div className="mt-5 border-l-2 border-accent pl-4">
                        <p className="ui-label">Life question</p>
                        <p className="mt-2 leading-[1.8] text-ink-secondary">{selected.question}</p>
                      </div>
                    ) : null}
                    {selected.topics.length ? (
                      <ul className="mt-5 flex list-none flex-wrap gap-2 p-0 font-sans text-xs text-ink-muted">
                        {selected.topics.map((topic) => (
                          <li
                            key={topic}
                            className="rounded-md border border-border bg-surface px-2 py-1"
                          >
                            {topic}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {selected.evidenceUrls.length ? (
                      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-sans text-sm">
                        {selected.evidenceUrls.map((url, index) => (
                          <a key={url} href={url} className="underline">
                            Evidence {index + 1} →
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </header>

                  <fieldset className="mt-6" disabled={currentSaveState?.kind === "saving"}>
                    <legend className="ui-label">Decision — saved immediately</legend>
                    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                      {decisions.map((decision) => (
                        <label
                          key={decision.value}
                          className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-sans text-sm transition-colors ${selectedDraft.decision === decision.value ? "border-ink bg-ink text-bg" : "border-border bg-bg text-ink hover:border-accent"}`}
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
                            className={`h-2.5 w-2.5 rounded-full ${statusColor[decision.value]}`}
                            aria-hidden="true"
                          />
                          {decision.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-7 border-t border-border pt-6">
                    <label className="block">
                      <span className="ui-label">Private notes</span>
                      <textarea
                        value={selectedDraft.privateNotes}
                        onChange={(event) =>
                          updateLocal(selected.id, { privateNotes: event.target.value })
                        }
                        rows={6}
                        placeholder="Questions, objections, connections, or next steps."
                        className="ui-control mt-2 min-h-36 resize-y font-sans"
                      />
                      <span className="mt-1 block font-sans text-xs text-ink-muted">
                        Never shown publicly.
                      </span>
                    </label>

                    <label className="mt-5 block">
                      <span className="ui-label">Tags</span>
                      <input
                        value={selectedDraft.tags}
                        onChange={(event) => updateLocal(selected.id, { tags: event.target.value })}
                        placeholder="memory, embodiment, revisit"
                        className="ui-control mt-2"
                      />
                      <span className="mt-1 block font-sans text-xs text-ink-muted">
                        Separate tags with commas.
                      </span>
                    </label>

                    <label className="mt-5 block">
                      <span className="ui-label">Public note</span>
                      <textarea
                        value={selectedDraft.publicNotes}
                        disabled={selectedDraft.decision !== "keep"}
                        onChange={(event) =>
                          updateLocal(selected.id, { publicNotes: event.target.value })
                        }
                        rows={3}
                        placeholder="Optional note shown with this entry."
                        className="ui-control mt-2 min-h-24 resize-y font-sans disabled:bg-surface disabled:text-ink-muted"
                      />
                    </label>

                    <div className="mt-5 flex items-start gap-3 rounded-md border border-border bg-surface p-4">
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

                    <div className="mt-5 flex flex-wrap items-center gap-4">
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
                    <details className="mt-7 border-t border-border pt-5">
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
              <p className="border-y border-border py-10 text-ink-muted">No record selected.</p>
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
      className={`min-h-11 rounded-md border px-3 py-2 ${active ? "border-ink bg-ink text-bg" : "border-border bg-bg text-ink hover:border-accent"}`}
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
