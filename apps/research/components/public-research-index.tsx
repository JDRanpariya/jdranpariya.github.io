"use client";

import type { CatalogRecord, CollectionId } from "@/lib/research-catalog";
import { useMemo, useState } from "react";

export type PublishedRecord = CatalogRecord & {
  publicNotes: string;
  tags: string[];
  updatedAt: string;
};

export function PublicResearchIndex({ records }: { records: PublishedRecord[] }) {
  const [collection, setCollection] = useState<CollectionId | "all">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: records.length,
      "great-minds": records.filter((record) => record.collection === "great-minds").length,
      neuroai: records.filter((record) => record.collection === "neuroai").length,
    }),
    [records]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return records.filter((record) => {
      if (collection !== "all" && record.collection !== collection) return false;
      if (!needle) return true;
      return [
        record.name,
        record.lead,
        record.institution,
        record.country,
        record.primary,
        record.publicNotes,
        ...record.tags,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle);
    });
  }, [collection, query, records]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Index collections" className="flex flex-wrap gap-2 font-sans text-sm">
          {(
            [
              ["all", "All"],
              ["great-minds", "People"],
              ["neuroai", "NeuroAI"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setCollection(value)}
              className={`min-h-11 rounded-md border px-3 py-2 ${collection === value ? "border-ink bg-ink font-semibold text-bg" : "border-border bg-bg text-ink hover:border-accent"}`}
            >
              {label} {counts[value]}
            </button>
          ))}
        </nav>
        <label className="block w-full sm:max-w-sm">
          <span className="sr-only">Search the research index</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the index…"
            className="ui-control"
          />
        </label>
      </div>

      <div className="divide-y divide-border">
        {filtered.map((record) => (
          <article
            key={`${record.collection}:${record.id}`}
            className="grid gap-4 py-7 md:grid-cols-[minmax(13rem,1.2fr)_minmax(18rem,2fr)_auto] md:gap-8"
          >
            <div>
              <h2 className="font-bold leading-6">
                <a href={record.url} className="underline">
                  {record.name} →
                </a>
              </h2>
              {record.lead ? (
                <p className="mt-2 font-sans text-sm text-ink-muted">{record.lead}</p>
              ) : null}
              <p className="mt-1 font-sans text-sm text-ink-muted">
                {[record.institution, record.country].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div>
              {record.publicNotes ? (
                <p className="leading-[1.8] text-ink-secondary">{record.publicNotes}</p>
              ) : (
                <p className="leading-[1.8] text-ink-secondary">{record.summary}</p>
              )}
              {record.tags.length ? (
                <p className="mt-3 font-sans text-sm text-ink-muted">{record.tags.join(" · ")}</p>
              ) : null}
            </div>
            <p className="font-sans text-xs uppercase tracking-wide text-ink-muted md:text-right">
              {record.collection === "great-minds" ? "Person" : "NeuroAI"}
            </p>
          </article>
        ))}
        {filtered.length === 0 ? (
          <p className="py-12 text-ink-muted">
            {records.length === 0 ? "No entries published yet." : "No matching entries."}
          </p>
        ) : null}
      </div>
    </>
  );
}
