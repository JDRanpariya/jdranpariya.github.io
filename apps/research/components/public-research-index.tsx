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
      {records.length > 0 ? (
        <div className="index-tools">
          <nav aria-label="Index collections" className="index-filters">
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
                aria-pressed={collection === value}
                onClick={() => setCollection(value)}
              >
                {label}
              </button>
            ))}
          </nav>
          <label className="index-search">
            <span className="sr-only">Search the research index</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
            />
          </label>
        </div>
      ) : null}

      <div className="index-results">
        {filtered.map((record) => (
          <article key={`${record.collection}:${record.id}`} className="index-record">
            <div>
              <h2>
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
            <div className="index-record-note">
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
          <p className="index-empty">
            {records.length === 0 ? "No entries published yet." : "No matching entries."}
          </p>
        ) : null}
      </div>
    </>
  );
}
